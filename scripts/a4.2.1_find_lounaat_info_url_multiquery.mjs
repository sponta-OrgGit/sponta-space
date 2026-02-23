// scripts/a4.2.1_find_lounaat_info_url_multiquery.mjs
import fs from "node:fs";
import path from "node:path";

const SEEDS_DIR = process.argv[2] ?? "seeds";
const TIMEOUT_MS = Number(process.argv[3] ?? 12000);
const OUT_PATH = process.argv[4] ?? "data/a4.2.1_lounaat_results.json";

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
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s) {
  return norm(s)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function tokens(s) {
  return norm(s)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function scoreTokenOverlap(query, candidate) {
  const q = new Set(tokens(query));
  const c = new Set(tokens(candidate));
  if (q.size === 0 || c.size === 0) return 0;
  let hit = 0;
  for (const t of q) if (c.has(t)) hit++;
  return hit / q.size;
}

function scoreHrefSlug(name, href) {
  const s = slugify(name);
  const h = norm(href).replace(/\s+/g, "");
  if (!s) return 0;
  // strong: full slug appears in href
  if (h.includes(s)) return 2.0;
  // medium: at least one meaningful token in href
  const ts = tokens(name);
  let hit = 0;
  for (const t of ts) {
    if (t.length >= 4 && h.includes(t)) hit++;
  }
  return hit > 0 ? 0.5 + Math.min(1.0, hit * 0.25) : 0;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SpontaA4.2.1/1.0 (+https://sponta.space)",
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

function extractCandidates(html) {
  const out = [];
  const aRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(html)) !== null) {
    const href = m[1] ?? "";
    const title = stripTags(m[2] ?? "");
    if (!href.startsWith("/")) continue;

    // pois geneeriset
    if (
      href.startsWith("/haku") ||
      href.startsWith("/tietoja") ||
      href.startsWith("/tietosuoja") ||
      href.startsWith("/kayttoehdot") ||
      href.startsWith("/palaute") ||
      href.startsWith("/ehdota")
    ) continue;

    if (title.length < 3) continue;
    out.push({ href, title });
  }

  // dedupe href
  const seen = new Set();
  const uniq = [];
  for (const c of out) {
    if (seen.has(c.href)) continue;
    seen.add(c.href);
    uniq.push(c);
  }
  return uniq;
}

function buildQueries(name, city) {
  const base = `${name}`.trim();
  const c = (city || "Helsinki").trim();
  const q1 = `${base} ${c}`.trim();
  const q2 = base;
  const q3 = `ravintola ${base} ${c}`.trim();
  // dedupe
  return [...new Set([q1, q2, q3].filter(Boolean))];
}

function pickBest(name, city, candidates) {
  let best = null;
  let bestScore = -1;

  const cityNorm = norm(city || "Helsinki");

  for (const c of candidates) {
    const title = c.title ?? "";
    const href = c.href ?? "";

    const s1 = scoreTokenOverlap(`${name} ${city}`, title); // overlap title
    const s2 = scoreHrefSlug(name, href);                   // href contains slug/tokens
    const cityBonus = norm(title).includes(cityNorm) ? 0.15 : 0;

    const score = s1 + s2 + cityBonus;

    if (score > bestScore) {
      bestScore = score;
      best = { ...c, score: Number(score.toFixed(3)), parts: { s1: Number(s1.toFixed(3)), s2: Number(s2.toFixed(3)), cityBonus: Number(cityBonus.toFixed(3)) } };
    }
  }

  return best;
}

async function processSeedFile(filePath) {
  const file = path.basename(filePath);
  const seed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (seed?.lunch?.menu_url) return { file, skipped: true, reason: "already_has_menu" };
  if (seed?.lounaat_info_url) return { file, skipped: true, reason: "already_has_lounaat_info_url" };

  const name = seed?.name ?? "";
  const city = seed?.city ?? "Helsinki";
  if (!name) return { file, ok: true, found: false };

  const queries = buildQueries(name, city);

  // kerää kandidaatit useasta hausta
  const merged = [];
  const seenHref = new Set();
  const statuses = [];

  for (const q of queries) {
    const url = `https://www.lounaat.info/haku?etsi=${encodeURIComponent(q)}`;
    let r;
    try {
      r = await fetchWithTimeout(url, TIMEOUT_MS);
    } catch (e) {
      return { file, ok: false, error: "fetch_failed", message: String(e?.message ?? e) };
    }

    statuses.push(r.status);

    if (r.ok && r.text) {
      const cs = extractCandidates(r.text);
      for (const c of cs) {
        if (seenHref.has(c.href)) continue;
        seenHref.add(c.href);
        merged.push(c);
      }
    }
  }

  const best = pickBest(name, city, merged);

  // hyväksymiskynnys:
  // - joko href-slug match antaa selkeän signaalin (s2 >= 1.0)
  // - tai token overlap on ok (s1 >= 0.5)
  // - muuten jätetään pending ja raportoidaan topCandidates
  if (!best) {
    seed.lunch = seed.lunch ?? {};
    seed.lunch.checked_at = nowIso();
    seed.lunch.has_menu = false;
    seed.lunch.menu_url = "";
    seed.lunch.fallback = "lounaat_info";
    seed.lunch.last_http_status = statuses[0] ?? null;
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file, ok: true, found: false, statuses, candidates: 0 };
  }

  const confident = (best.parts?.s2 ?? 0) >= 1.0 || (best.parts?.s1 ?? 0) >= 0.5;

  const topCandidates = merged
    .map((c) => {
      const scored = pickBest(name, city, [c]);
      return { title: c.title, href: c.href, score: scored?.score ?? 0, parts: scored?.parts ?? {} };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!confident) {
    seed.lunch = seed.lunch ?? {};
    seed.lunch.checked_at = nowIso();
    seed.lunch.has_menu = false;
    seed.lunch.menu_url = "";
    seed.lunch.fallback = "lounaat_info";
    seed.lunch.last_http_status = statuses[0] ?? null;
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");
    return { file, ok: true, found: false, statuses, best, topCandidates };
  }

  const lounaatUrl = `https://www.lounaat.info${best.href}`;

  seed.lounaat_info_url = lounaatUrl;

  seed.lunch = seed.lunch ?? {};
  seed.lunch.checked_at = nowIso();
  seed.lunch.has_menu = true;
  seed.lunch.menu_url = lounaatUrl;
  seed.lunch.fallback = "lounaat_info";

  fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf8");

  return { file, ok: true, found: true, statuses, best, lounaat_url: lounaatUrl };
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
  console.error("A4.2.1 ERROR:", e?.message ?? e);
  process.exit(1);
});
