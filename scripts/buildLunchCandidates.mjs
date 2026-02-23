// scripts/buildLunchCandidates.mjs
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SEEDS_DIR = path.resolve(process.cwd(), "seeds");
const OUT_DIR = path.resolve(process.cwd(), "out");
const OUT_JSON = path.join(OUT_DIR, "lunch_candidates_ranked.json");
const OUT_CSV = path.join(OUT_DIR, "lunch_candidates_ranked.csv");

const TARGET_CITY = "Helsinki";

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJSONSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function listSeedFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".seed.json"))
    .map((f) => path.join(dir, f));
}

function normStr(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t.length ? t : null;
}

function parseHost(u) {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return null;
  }
}

function isHttpUrl(u) {
  if (!u) return false;
  return /^https?:\/\//i.test(String(u).trim());
}

function inferSourceType(u) {
  if (!u || !isHttpUrl(u)) return "unknown";
  const ul = u.toLowerCase();
  const host = parseHost(u) ?? "";

  if (ul.endsWith(".pdf") || ul.includes(".pdf?")) return "pdf";
  if (host.includes("lounaat.info") || ul.includes("lounaat.info")) return "lounaat_info";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook";
  if (host.includes("wolt.com") || host.includes("foodora.")) return "wolt";
  return "website";
}

function isGenericLinkHost(host) {
  const bad = [
    "linktr.ee",
    "t.co",
    "goo.gl",
    "maps.app.goo.gl",
    "google.com",
    "g.page",
    "bit.ly",
    "tinyurl.com",
  ];
  return bad.some((b) => host.includes(b));
}

function pathHasMenuSignal(u) {
  if (!u) return false;
  const ul = u.toLowerCase();
  return ul.includes("lounas") || ul.includes("lunch") || ul.includes("menu") || ul.includes("ruokalista");
}

function looksGenericVenueName(name) {
  const n = name.trim().toLowerCase();
  const generic = new Set(["cafe", "bar", "restaurant", "ravintola", "kahvila"]);
  if (generic.has(n)) return true;
  const tokens = n.split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && generic.has(tokens[0])) return true;
  return false;
}

function nameInHostOrTitle(name, u, title) {
  const n = (name ?? "").toLowerCase().replace(/[^a-z0-9åäö]+/gi, " ").trim();
  if (!n) return false;
  const key = n.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
  if (!key) return false;

  const host = (u ? parseHost(u) : null) ?? "";
  const t = (title ?? "").toLowerCase();
  return host.includes(key.replace(/\s+/g, "")) || t.includes(key);
}

// rubriikki
function scoreCandidate({ sourceType, url, venueName, city, lastSeen, pageTitle }) {
  const breakdown = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  // A
  switch (sourceType) {
    case "website": breakdown.A = 40; break;
    case "pdf": breakdown.A = 35; break;
    case "lounaat_info": breakdown.A = 25; break;
    case "instagram": breakdown.A = 15; break;
    case "facebook": breakdown.A = 10; break;
    case "wolt": breakdown.A = 5; break;
    default: breakdown.A = 0;
  }

  // B
  let B = 0;
  if (isHttpUrl(url)) B += 10;
  const host = url ? parseHost(url) : null;
  if (host && !isGenericLinkHost(host)) B += 5;
  if (pathHasMenuSignal(url)) B += 5;
  breakdown.B = B;

  // C
  let C = 0;
  if (venueName) C += 10;
  if (venueName && !looksGenericVenueName(venueName)) C += 5;
  if (nameInHostOrTitle(venueName, url, pageTitle)) C += 5;
  breakdown.C = C;

  // D
  let D = 0;
  const c = (city ?? "").trim();
  if (!c) D = 5;
  else if (c.toLowerCase() === TARGET_CITY.toLowerCase()) D = 10;
  else D = -10;
  breakdown.D = D;

  // E
  let E = 0;
  if (lastSeen) {
    const last = new Date(lastSeen).getTime();
    if (!Number.isNaN(last)) {
      const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
      if (days <= 14) E = 10;
      else if (days <= 60) E = 5;
    }
  }
  breakdown.E = E;

  let total = breakdown.A + breakdown.B + breakdown.C + breakdown.D + breakdown.E;
  if (total < 0) total = 0;
  if (total > 100) total = 100;

  return { total, breakdown };
}

function defaultManualTila(score) {
  if (score >= 70) return "lounaslista ok";
  if (score >= 50) return "tarvitsee lisä tutkintaa";
  return "ei toimi";
}

function toCSV(rows) {
  const headers = [
    "candidate_id","seed_id","venue_name_seed","city_seed","address_seed",
    "source_url","source_type","reliability_score_0_100","manuaalinen_tila",
    "verification_status","verified_source_url","verified_notes",
    "menu_url_found","lunch_keyword_hits","last_seen",
  ];
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

function main() {
  ensureDir(OUT_DIR);

  // preserve manual edits
  const prev = readJSONSafe(OUT_JSON);
  const prevById = new Map();
  if (Array.isArray(prev)) for (const r of prev) prevById.set(r.candidate_id, r);

  const seedFiles = listSeedFiles(SEEDS_DIR);
  const out = [];

  for (const seedPath of seedFiles) {
    const seed = readJSONSafe(seedPath);
    if (!seed) continue;

    const seedFile = path.basename(seedPath);
    const seedId = seed.seed_id ?? seed.seedId ?? seed.id ?? seedFile.replace(/\.seed\.json$/i, "");

    const venueName =
      normStr(seed.venue_name_seed) ?? normStr(seed.venueName) ?? normStr(seed.name) ?? null;

    const city = normStr(seed.city_seed) ?? normStr(seed.city) ?? null;
    const address = normStr(seed.address_seed) ?? normStr(seed.address) ?? null;

    const primary =
      normStr(seed.source_url_primary) ?? normStr(seed.sourceUrlPrimary) ?? normStr(seed.source_url) ?? null;

    const backupsRaw = seed.source_url_backups ?? seed.sourceUrlBackups ?? seed.backups ?? [];
    const backups = Array.isArray(backupsRaw) ? backupsRaw.map(normStr).filter(Boolean) : [];

    const urls = [primary, ...backups].filter(Boolean);
    const uniqueUrls = [];
    for (const u of urls) if (!uniqueUrls.includes(u)) uniqueUrls.push(u);

    const lastSeen = normStr(seed.last_seen) ?? normStr(seed.lastSeen) ?? normStr(seed.crawl_timestamp) ?? null;

    const lunchHits =
      (typeof seed.lunch_keyword_hits === "number" ? seed.lunch_keyword_hits : null) ??
      (Array.isArray(seed.lunch_keyword_hit_urls) ? seed.lunch_keyword_hit_urls.length : null) ??
      0;

    const foundMenuUrls =
      Array.isArray(seed.menu_urls_found) ? seed.menu_urls_found :
      Array.isArray(seed.found_menu_urls) ? seed.found_menu_urls :
      [];

    const candidateUrls = uniqueUrls.length ? uniqueUrls : [null];

    for (const candidateUrl of candidateUrls) {
      const sourceType = inferSourceType(candidateUrl);
      const menuFound =
        (candidateUrl ? pathHasMenuSignal(candidateUrl) : false) ||
        (Array.isArray(foundMenuUrls) && foundMenuUrls.length > 0);

      const pageTitle = normStr(seed.page_title) ?? normStr(seed.source_title) ?? normStr(seed.title) ?? null;

      const { total, breakdown } = scoreCandidate({
        sourceType,
        url: candidateUrl,
        venueName,
        city,
        lastSeen,
        pageTitle,
      });

      const candidateId = sha1(`${seedId}::${candidateUrl ?? (venueName ?? "NO_NAME")}`);
      const prevRow = prevById.get(candidateId);

      out.push({
        candidate_id: candidateId,
        seed_id: String(seedId),
        venue_name_seed: venueName,
        city_seed: city,
        address_seed: address,

        source_url_primary: primary,
        source_url_backups: backups,

        source_url: candidateUrl,
        source_type: sourceType,

        menu_url_found: !!menuFound,
        lunch_keyword_hits: Number(lunchHits) || 0,
        last_seen: lastSeen,

        raw_fields_json: seed,

        reliability_score_0_100: total,
        score_breakdown_json: breakdown,

        verification_status: prevRow?.verification_status ?? "UNVERIFIED",
        verified_source_url: prevRow?.verified_source_url ?? null,
        verified_notes: prevRow?.verified_notes ?? null,

        manuaalinen_tila: prevRow?.manuaalinen_tila ?? defaultManualTila(total),
      });
    }
  }

  out.sort((a, b) => b.reliability_score_0_100 - a.reliability_score_0_100);

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");
  fs.writeFileSync(OUT_CSV, toCSV(out), "utf8");

  console.log(`✅ Built ${out.length} candidates from ${seedFiles.length} seeds`);
  console.log(`→ ${path.relative(process.cwd(), OUT_JSON)}`);
  console.log(`→ ${path.relative(process.cwd(), OUT_CSV)}`);
}

main();
