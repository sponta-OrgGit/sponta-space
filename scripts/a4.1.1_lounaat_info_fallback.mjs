import fs from "node:fs";
import path from "node:path";
import { URL, URLSearchParams } from "node:url";

const SEEDS_DIR = process.argv[2] ?? "seeds";
const TIMEOUT_MS = Number(process.argv[3] ?? 12000);

function listSeedFiles(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith(".seed.json")).map(f => path.join(dir, f));
}

function nowIso() {
  return new Date().toISOString();
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SpontaA4.2/1.0 (+https://sponta.space)" }
    });
    return { ok: res.ok, status: res.status, text: await res.text(), finalUrl: res.url };
  } finally {
    clearTimeout(t);
  }
}

function extractFirstVenueLink(html) {
  // lounaat.info venue links usually contain /ravintola/
  const m = html.match(/href="([^"]*\/ravintola\/[^"]+)"/i);
  return m ? `https://www.lounaat.info${m[1]}` : null;
}

async function processSeed(filePath) {
  const seed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  
  if (seed?.lunch?.has_menu === true) {
    return { file: path.basename(filePath), skipped: true };
  }

  const query = `${seed.name} ${seed.address ?? ""}`.trim();
  const searchUrl = `https://www.lounaat.info/haku?${new URLSearchParams({ q: query })}`;

  let search;
  try {
    search = await fetchHtml(searchUrl);
  } catch {
    return { file: path.basename(filePath), error: "search_fetch_failed" };
  }

  if (!search.ok) {
    return { file: path.basename(filePath), status: search.status };
  }

  const venueLink = extractFirstVenueLink(search.text);
  if (!venueLink) {
    return { file: path.basename(filePath), ok: true, found: false };
  }

  // Success → store aggregator source
  seed.lunch = seed.lunch ?? {};
  seed.lunch.has_menu = true;
  seed.lunch.menu_url = venueLink;
  seed.lunch.checked_at = nowIso();

  seed.sources = seed.sources ?? [];
  seed.sources.push({
    source_id: `${seed.venue_id}__lounaat_info`,
    source_type: "aggregator",
    source_name: "lounaat.info",
    canonical_url: venueLink,
    verification: {
      status: "approved",
      verified_at: nowIso(),
      verified_by: "A4.2"
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
  return { file: path.basename(filePath), ok: true, found: true, menu_url: venueLink };
}

async function main() {
  const files = listSeedFiles(SEEDS_DIR);

  let newApproved = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  for (const f of files) {
    const r = await processSeed(f);
    results.push(r);
    if (r?.skipped) skipped++;
    else if (r?.found) newApproved++;
    else if (r?.error) failed++;
  }

  const out = {
    ok: true,
    this_run: { newApproved, skipped, failed },
    results
  };

  fs.mkdirSync("data", { recursive: true });
  const outPath = "data/a4.2_results.json";
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  console.log(JSON.stringify({ ok: true, this_run: out.this_run, outPath }));
}

main().catch(e => {
  console.error("A4.2 ERROR:", e?.message ?? e);
  process.exit(1);
});
