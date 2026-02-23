// scripts/a4.2_find_lounaat_info_url.mjs
import fs from "node:fs";
import path from "node:path";

const SEEDS_DIR = process.argv[2] ?? "seeds";
const TIMEOUT_MS = Number(process.argv[3] ?? 12000);
const OUT_PATH = process.argv[4] ?? "data/a4.2_lounaat_results.json";

function listSeedFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".seed.json"))
    .map((f) => path.join(dir, f));
}

function nowIso() {
  return new Date().toISOString();
}

function stripTags(s) {
  return (s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function norm(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s) {
  return norm(s)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3); // ignore short noise
}

// simple similarity: token overlap / query tokens
function scoreMatch(queryName, candidateName) {
  const q = new Set(tokens(queryName));
  const c = new Set(tokens(candidateName));
  if (q.size === 0 || c.size === 0) return 0;

  let hit = 0;
  for (const t of q) if (c.has(t)) hit++;

  // bonus if candidate contains full query (rough)
  const cand = norm(candidateName);
  const qnorm = norm(queryName);
  const containsBonus = cand.includes(qnorm) ? 2 : 0;

  return hit / q.size + containsBonus;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SpontaA4.2/1.0 (+https://sponta.space)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fi,en;q=0.8",
      },
      redirect: "follow",
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, finalUrl: res.url, text };
  } finally {
    clearTimeout(t);
  }
}

function extractLounaatCandidates(html) {
  // Collect <a href="/something">Title</a>
  const out = [];
  const aRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(html)) !== null) {
    const href = m[1] ?? "";
    const inner = stripTags(m[2] ?? "");
    if (!href.startsWith("/")) continue;

    // exclude obvious non-venue pages
    if (
      href.startsWith("/haku") ||
      href.startsWith("/tietoja") ||
      href.startsWith("/tietosuoja") ||
      href.startsWith("/kayttoehdot") ||
      href.startsWith("/palaute") ||
      href.startsWith("/ehdota")
    ) continue;

    // ignore empty / too short anchors
    if (inner.length < 3) continue;

    out.push({ href, title: inner });
  }

  // de-dupe by href
  const seen = new Set();
  const uniq = [];
  for (const c of out) {
    if (seen.has(c.href)) continue;
    seen.add(c.href);
    uniq.push(c);
  }
  return uniq;
}

async function processSeedFile(filePath) {
  const file = path.basename(filePath);
  const seed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // skip if already solved
  if (seed?.lunch?.menu_url) return { file, skipped: true, reason: "already_has_menu" };
  if (seed?.lounaat_info_url) return { file, skipped: true, reason: "already_has_lounaat_info_url" };

  const name = seed?.name ?? "";
  const city = seed?.city ?? "Helsinki";
  const q = `${name} ${city}`.trim();
  if (!q) return { file, ok: true, found: false };

  const searchUrl = `https://www.lounaat.info/haku?etsi=${encodeURIComponent(q)}`;

  let r;
  try {
    r = await fetchWithTimeout(searchUrl, TIMEOUT_MS);
  } catch (e) {
    seed.lunch = seed.lunch ?? {};
    seed.lunch.checked_at = nowIso();
    seed.lunch.has_menu = false;
    seed.lunch.menu_url = "";
    seed.lunch.fallback = "lounaat_info";
    seed.lunch.last_error = String(e?.message ?? e);
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file, ok: false, error: "fetch_failed" };
  }

  if (!r.ok || !r.text) {
    seed.lunch = seed.lunch ?? {};
    seed.lunch.checked_at = nowIso();
    seed.lunch.has_menu = false;
    seed.lunch.menu_url = "";
    seed.lunch.fallback = "lounaat_info";
    seed.lunch.last_http_status = r.status;
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file, ok: true, found: false, status: r.status };
  }

  const candidates = extractLounaatCandidates(r.text);

  // pick best match by name only (city included in query already)
  let best = null;
  let bestScore = 0;

  for (const c of candidates) {
    const s = scoreMatch(name, c.title);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  // threshold: require some overlap
  if (!best || bestScore < 0.34) {
    seed.lunch = seed.lunch ?? {};
    seed.lunch.checked_at = nowIso();
    seed.lunch.has_menu = false;
    seed.lunch.menu_url = "";
    seed.lunch.fallback = "lounaat_info";
    seed.lunch.last_http_status = r.status;
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file, ok: true, found: false, status: r.status };
  }

  const lounaatUrl = `https://www.lounaat.info${best.href}`;

  // write seed
  seed.lounaat_info_url = lounaatUrl;

  seed.lunch = seed.lunch ?? {};
  seed.lunch.checked_at = nowIso();
  seed.lunch.has_menu = true;
  seed.lunch.menu_url = lounaatUrl;
  seed.lunch.fallback = "lounaat_info";

  fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");

  return { file, ok: true, found: true, score: Number(bestScore.toFixed(3)), hit: best.title, lounaat_url: lounaatUrl };
}

async function main() {
  if (!fs.existsSync(SEEDS_DIR)) throw new Error(`Missing seeds dir: ${SEEDS_DIR}`);

  const files = listSeedFiles(SEEDS_DIR);
  const results = [];
  let newApproved = 0;
  let skipped = 0;
  let failed = 0;

  for (const f of files) {
    const r = await processSeedFile(f);
    results.push(r);
    if (r.skipped) skipped++;
    else if (r.ok === false) failed++;
    else if (r.found) newApproved++;
  }

  const out = {
    ok: true,
    seeds_dir: SEEDS_DIR,
    this_run: { newApproved, skipped, failed },
    results,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, this_run: out.this_run, outPath: OUT_PATH }));
}

main().catch((e) => {
  console.error("A4.2 ERROR:", e?.message ?? e);
  process.exit(1);
});
