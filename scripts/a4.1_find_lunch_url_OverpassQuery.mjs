// scripts/a4.1_find_lunch_url_OverpassQuery.mjs
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const SEEDS_DIR = process.argv[2] ?? "seeds";
const TIMEOUT_MS = Number(process.argv[3] ?? 12000);

function listSeedFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".seed.json"))
    .map((f) => path.join(dir, f));
}

function isHttpUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveUrl(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractLunchLinks(html, baseUrl) {
  const links = [];

  // 1) Anchor text + href contains lounas/lunch
  const anchorRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1];
    const inner = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const hay = `${href} ${inner}`.toLowerCase();
    if (!/(^|[^a-z])(lounas|lunch)([^a-z]|$)/i.test(hay)) continue;

    const abs = resolveUrl(baseUrl, href);
    if (abs && isHttpUrl(abs)) links.push(abs);
  }

  // 2) href itself contains lounas/lunch
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    if (!/(lounas|lunch)/i.test(href)) continue;

    const abs = resolveUrl(baseUrl, href);
    if (abs && isHttpUrl(abs)) links.push(abs);
  }

  // 3) dedupe
  const unique = [...new Set(links)];
  if (unique.length > 0) return unique;

  // 4) fallback ONLY if page text contains lounas/lunch somewhere
  const pageText = html.replace(/<[^>]+>/g, " ");
  const pageHasLunchWord = /(^|[^a-z])(lounas|lunch)([^a-z]|$)/i.test(pageText);
  if (!pageHasLunchWord) return [];

  // 5) choose best candidate link (still requires lunch word on page)
  const candidates = [];
  // reset regex state by re-creating
  const hrefRe2 = /href\s*=\s*["']([^"']+)["']/gi;
  while ((m = hrefRe2.exec(html)) !== null) {
    const abs = resolveUrl(baseUrl, m[1]);
    if (abs && isHttpUrl(abs)) candidates.push(abs);
  }

  const uniqCandidates = [...new Set(candidates)];

  const pdf = uniqCandidates.find((u) => u.toLowerCase().includes(".pdf"));
  if (pdf) return [pdf];

  const weeky = uniqCandidates.find((u) => /(week|viikko|vk)/i.test(u));
  if (weeky) return [weeky];

  if (uniqCandidates[0]) return [uniqCandidates[0]];
  return [];
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SpontaA4.1/1.0 (+https://sponta.space)" },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function pickPrimaryPendingSource(seed) {
  const sources = Array.isArray(seed.sources) ? seed.sources : [];
  // Convention: website source uses __primary; pick first pending website_html
  return sources.find(
    (s) =>
      s?.source_type === "website_html" &&
      s?.verification?.status === "pending" &&
      typeof s?.canonical_url === "string" &&
      s.canonical_url.length > 0
  );
}

async function processSeedFile(filePath) {
  const seed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const src = pickPrimaryPendingSource(seed);
  if (!src) return { file: path.basename(filePath), skipped: true };

  const canonical = src.canonical_url;
  if (!isHttpUrl(canonical)) return { file: path.basename(filePath), skipped: true, reason: "bad_url" };

  let foundUrl = "";
  let fetchStatus = null;

  try {
    const r = await fetchWithTimeout(canonical, TIMEOUT_MS);
    fetchStatus = r.status;

    if (r.ok && typeof r.text === "string") {
      const links = extractLunchLinks(r.text, canonical);
      foundUrl = links[0] ?? "";
    }
  } catch (e) {
    seed.lunch = seed.lunch ?? {};
    seed.lunch.checked_at = nowIso();
    seed.lunch.has_menu = false;
    seed.lunch.menu_url = "";
    seed.lunch.last_error = String(e?.message ?? e);

    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file: path.basename(filePath), ok: false, error: "fetch_failed" };
  }

  seed.lunch = seed.lunch ?? {};
  seed.lunch.checked_at = nowIso();

  if (foundUrl) {
    seed.lunch.has_menu = true;
    seed.lunch.menu_url = foundUrl;

    // approve source
    src.verification.status = "approved";
    src.verification.verified_at = nowIso();
    src.verification.verified_by = "A4.1";

    // convenience
    src.menu_url = foundUrl;

    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file: path.basename(filePath), ok: true, status: fetchStatus, menu_url: foundUrl };
  }

  // Not found → keep pending
  seed.lunch.has_menu = false;
  seed.lunch.menu_url = "";
  seed.lunch.last_http_status = fetchStatus;

  fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
  return { file: path.basename(filePath), ok: true, status: fetchStatus, menu_url: "" };
}

function computeTotals(files) {
  let total = files.length;
  let hasWebsiteSource = 0;
  let approved = 0;
  let pending = 0;
  let hasMenu = 0;

  for (const f of files) {
    const seed = JSON.parse(fs.readFileSync(f, "utf8"));
    const sources = Array.isArray(seed.sources) ? seed.sources : [];
    const websiteSources = sources.filter((s) => s?.source_type === "website_html");

    if (websiteSources.length > 0) hasWebsiteSource++;

    if (websiteSources.some((s) => s?.verification?.status === "approved")) approved++;
    if (websiteSources.some((s) => s?.verification?.status === "pending")) pending++;
    if (seed?.lunch?.has_menu === true) hasMenu++;
  }

  return { total, hasWebsiteSource, approved, pending, hasMenu };
}

async function main() {
  if (!fs.existsSync(SEEDS_DIR)) throw new Error(`Missing seeds dir: ${SEEDS_DIR}`);

  const files = listSeedFiles(SEEDS_DIR);

  // This-run stats
  const results = [];
  let approvedThisRun = 0;
  let pendingNoLunchThisRun = 0;
  let skippedThisRun = 0;
  let failedThisRun = 0;

  for (const f of files) {
    const r = await processSeedFile(f);
    results.push(r);

    if (r.skipped) skippedThisRun++;
    else if (r.ok === false) failedThisRun++;
    else if (r.menu_url) approvedThisRun++;
    else pendingNoLunchThisRun++;
  }

  const totals = computeTotals(files);

  const outThisRun = {
    ok: true,
    seeds_dir: SEEDS_DIR,
    total_files: files.length,
    this_run: {
      skipped: skippedThisRun,
      failed: failedThisRun,
      approved: approvedThisRun,
      pending_no_lunch: pendingNoLunchThisRun,
    },
    totals,
    results,
  };

  fs.mkdirSync("data", { recursive: true });

  const outPathThisRun = "data/a4.1_results_this_run.json";
  fs.writeFileSync(outPathThisRun, JSON.stringify(outThisRun, null, 2), "utf8");

  const outPathTotals = "data/a4.1_results_totals.json";
  fs.writeFileSync(outPathTotals, JSON.stringify({ ok: true, totals }, null, 2), "utf8");

  console.log(
    JSON.stringify({
      ok: true,
      this_run: outThisRun.this_run,
      totals,
      outPathThisRun,
      outPathTotals,
    })
  );
}

main().catch((e) => {
  console.error("A4.1 ERROR:", e?.message ?? e);
  process.exit(1);
});
