import fs from "node:fs";
import path from "node:path";

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
      headers: { "User-Agent": "SpontaA4.2.1/1.0 (+https://sponta.space)" }
    });
    return { ok: res.ok, status: res.status, text: await res.text(), finalUrl: res.url };
  } finally {
    clearTimeout(t);
  }
}

function extractFirstLounaatVenueLink(html) {
  // Accept both full and relative
  const m =
    html.match(/href="(https?:\/\/www\.lounaat\.info\/ravintola\/[^"]+)"/i) ||
    html.match(/href="(\/ravintola\/[^"]+)"/i);

  if (!m) return null;
  const href = m[1];
  return href.startsWith("http") ? href : `https://www.lounaat.info${href}`;
}

function safeSlug(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function tryLounaatSearch(name, city = "helsinki") {
  // 1) Try lounaat.info internal search variants (we brute-force a few)
  const q = encodeURIComponent(name);

  const candidates = [
    `https://www.lounaat.info/haku?search=${q}`,
    `https://www.lounaat.info/haku?query=${q}`,
    `https://www.lounaat.info/haku?s=${q}`,
    `https://www.lounaat.info/search?search=${q}`,
    `https://www.lounaat.info/search?query=${q}`,
    `https://www.lounaat.info/?s=${q}`,
  ];

  for (const u of candidates) {
    const r = await fetchHtml(u);
    if (!r.ok) continue;
    const link = extractFirstLounaatVenueLink(r.text);
    if (link) return { ok: true, method: "lounaat_internal_search", url: link };
  }

  // 2) DuckDuckGo HTML site: fallback (no API key)
  const ddg = `https://duckduckgo.com/html/?q=${encodeURIComponent(`site:lounaat.info ${name} ${city}`)}`;
  const r2 = await fetchHtml(ddg);
  if (r2.ok) {
    const link = extractFirstLounaatVenueLink(r2.text);
    if (link) return { ok: true, method: "ddg_site_search", url: link };
  }

  // 3) Last resort: try a “guessy” path (cheap)
  const guess = `https://www.lounaat.info/ravintola/${safeSlug(name)}`;
  const r3 = await fetchHtml(guess);
  if (r3.ok) return { ok: true, method: "guess_slug", url: guess };

  return { ok: false };
}

function upsertAggregatorSource(seed, venueUrl) {
  seed.sources = Array.isArray(seed.sources) ? seed.sources : [];

  const source_id = `${seed.venue_id}__lounaat_info`;
  const existing = seed.sources.find(s => s?.source_id === source_id);

  const payload = {
    source_id,
    source_type: "aggregator",
    source_name: "lounaat.info",
    canonical_url: venueUrl,
    verification: {
      status: "approved",
      verified_at: nowIso(),
      verified_by: "A4.2.1",
    }
  };

  if (existing) Object.assign(existing, payload);
  else seed.sources.push(payload);
}

async function processSeed(filePath) {
  const seed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (seed?.lunch?.has_menu === true) return { file: path.basename(filePath), skipped: true };

  const name = seed.name;
  const city = (seed.city ?? "Helsinki").toLowerCase();

  const found = await tryLounaatSearch(name, city);
  if (!found.ok) return { file: path.basename(filePath), ok: true, found: false };

  seed.lunch = seed.lunch ?? {};
  seed.lunch.has_menu = true;
  seed.lunch.menu_url = found.url;
  seed.lunch.checked_at = nowIso();
  seed.lunch.found_by = found.method;

  upsertAggregatorSource(seed, found.url);

  fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
  return { file: path.basename(filePath), ok: true, found: true, method: found.method, menu_url: found.url };
}

async function main() {
  const files = listSeedFiles(SEEDS_DIR);

  let newApproved = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  for (const f of files) {
    try {
      const r = await processSeed(f);
      results.push(r);
      if (r.skipped) skipped++;
      else if (r.found) newApproved++;
    } catch {
      failed++;
    }
  }

  fs.mkdirSync("data", { recursive: true });
  const outPath = "data/a4.2.1_results.json";
  fs.writeFileSync(outPath, JSON.stringify({ ok: true, this_run: { newApproved, skipped, failed }, results }, null, 2), "utf8");

  console.log(JSON.stringify({ ok: true, this_run: { newApproved, skipped, failed }, outPath }));
}

main().catch(e => {
  console.error("A4.2.1 ERROR:", e?.message ?? e);
  process.exit(1);
});
