// scripts/a1_find_lunch_url.mjs
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
  
    // 1) Anchor-teksti + href sisältää lounas/lunch
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
      if (abs) links.push(abs);
    }
  
    // 2) href itsessään sisältää lounas/lunch
    const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
    while ((m = hrefRe.exec(html)) !== null) {
      const href = m[1];
      if (!/(lounas|lunch)/i.test(href)) continue;
  
      const abs = resolveUrl(baseUrl, href);
      if (abs) links.push(abs);
    }
  
    // 3) deduplikointi
    const unique = [...new Set(links)];
  
    // Jos löytyi suoraan → valmis
    if (unique.length > 0) return unique;
  
    // 4) Fallback: sivulla mainitaan lounas, mutta linkit eivät
    const pageText = html.replace(/<[^>]+>/g, " ");
    const pageHasLunchWord = /(^|[^a-z])(lounas|lunch)([^a-z]|$)/i.test(pageText);
  
    if (!pageHasLunchWord) return [];
  
    // 5) Etsi paras mahdollinen linkki
    const candidates = [];
    while ((m = hrefRe.exec(html)) !== null) {
      const abs = resolveUrl(baseUrl, m[1]);
      if (abs) candidates.push(abs);
    }
  
    const uniqCandidates = [...new Set(candidates)];
  
    // prioriteetti: PDF → viikko → mikä tahansa
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
      headers: {
        "User-Agent": "SpontaA1/1.0 (+https://sponta.space)"
      }
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
  // Convention: website sources use __primary; pick first pending website_html
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
    // keep pending; just record error in seed
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
    src.verification.verified_by = "A1";

    // optional: store menu_url also under source for convenience
    src.menu_url = foundUrl;

    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file: path.basename(filePath), ok: true, status: fetchStatus, menu_url: foundUrl };
  }

  // Not found → keep pending per your decision
  seed.lunch.has_menu = false;
  seed.lunch.menu_url = "";
  seed.lunch.last_http_status = fetchStatus;

  fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
  return { file: path.basename(filePath), ok: true, status: fetchStatus, menu_url: "" };
}

async function main() {
  if (!fs.existsSync(SEEDS_DIR)) throw new Error(`Missing seeds dir: ${SEEDS_DIR}`);

  const files = listSeedFiles(SEEDS_DIR);
  const results = [];
  let approved = 0;
  let pendingNoLunch = 0;
  let skipped = 0;

  for (const f of files) {
    const r = await processSeedFile(f);
    results.push(r);
    if (r.skipped) skipped++;
    else if (r.menu_url) approved++;
    else pendingNoLunch++;
  }

  const out = {
    ok: true,
    seeds_dir: SEEDS_DIR,
    total_files: files.length,
    skipped,
    approved,
    pending_no_lunch: pendingNoLunch,
    results
  };

  const outPath = "data/a1_results.json";
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, approved, pending_no_lunch: pendingNoLunch, skipped, outPath }));
}

main().catch((e) => {
  console.error("A1 ERROR:", e?.message ?? e);
  process.exit(1);
});
