// scripts/analyzeKallioRaw.mjs
import fs from "fs";
import path from "path";

const IN_FILE = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : null;

if (!IN_FILE) {
  console.error("❌ Anna polku raw-jsoniin argumenttina, esim:");
  console.error("node scripts/a4.3_analyze_kallio_raw.mjs data/kallio_venues_raw.json");
  process.exit(1);
}

if (!fs.existsSync(IN_FILE)) {
  console.error("❌ Input file not found:", IN_FILE);
  process.exit(1);
}

const OUT_DIR = path.resolve(process.cwd(), "out");

const OUT_SCHEMA = path.join(OUT_DIR, "kallio_seed_schema_report.json");
const OUT_RANKED_JSON = path.join(OUT_DIR, "kallio_venues_ranked.json");
const OUT_RANKED_CSV = path.join(OUT_DIR, "kallio_venues_ranked.csv");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function isPlainObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function typeOfValue(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function summarizeValue(v, maxLen = 140) {
  if (v === null || v === undefined) return null;
  const t = typeOfValue(v);
  if (t === "string") return v.length > maxLen ? v.slice(0, maxLen) + "…" : v;
  if (t === "number" || t === "boolean") return v;
  if (t === "array") return `[array len=${v.length}]`;
  if (t === "object") return `[object keys=${Object.keys(v).length}]`;
  return String(v);
}

function addExample(bucket, example, maxExamples = 3) {
  if (example === undefined) return;
  if (!bucket.examples) bucket.examples = [];
  if (bucket.examples.length >= maxExamples) return;

  const sig = JSON.stringify(example);
  if (!bucket._seen) bucket._seen = new Set();
  if (bucket._seen.has(sig)) return;
  bucket._seen.add(sig);
  bucket.examples.push(example);
}

function extractElements(root) {
  if (!isPlainObject(root)) throw new Error("Top-level JSON ei ole object.");
  if (!Array.isArray(root.elements)) throw new Error("En löydä root.elements[] listaa.");
  return root.elements;
}

function flattenElement(el) {
  // element fields
  const flat = {};
  for (const [k, v] of Object.entries(el)) {
    if (k === "tags") continue;
    flat[k] = v;
  }

  // tags fields
  if (isPlainObject(el.tags)) {
    for (const [k, v] of Object.entries(el.tags)) {
      flat[`tags.${k}`] = v;
    }
  }

  // handy aliases
  const tags = el.tags ?? {};
  flat.name =
    tags.name ?? tags["name:en"] ?? tags["name:fi"] ?? null;

  flat.city =
    tags["addr:city"] ?? null;

  flat.website =
    tags.website ?? tags["contact:website"] ?? null;

  flat.website_menu =
    tags["website:menu"] ?? tags["contact:menu"] ?? tags.menu ?? null;

  flat.note =
    tags.note ?? tags.description ?? tags["description:fi"] ?? null;

  flat.instagram =
    tags["contact:instagram"] ?? tags.instagram ?? null;

  return flat;
}

function hasLunchSignal(flat) {
  // Prefer actual lunch field if exists in tags.*
  const lunchValue =
    flat["tags.lunch"] ??
    flat["tags.lounas"] ??
    flat["tags.lunch:menu"] ??
    null;

  const hasLunchField = lunchValue !== null && lunchValue !== undefined;

  const noteText = typeof flat.note === "string" ? flat.note : null;
  const noteMentions = noteText ? /(^|\W)(lounas|lunch)(\W|$)/i.test(noteText) : false;

  return { hasLunchField, noteMentions, noteText, lunchValue };
}

function hasWebsiteSignal(flat) {
  // prio2: website or website:menu present
  const w = flat.website;
  const wm = flat.website_menu;

  const hasW = typeof w === "string" && w.trim().length > 0;
  const hasWM = typeof wm === "string" && wm.trim().length > 0;

  // also count explicit tags if present
  const hasTagWebsite = typeof flat["tags.website"] === "string" && flat["tags.website"].trim().length > 0;
  const hasTagWebsiteMenu = typeof flat["tags.website:menu"] === "string" && flat["tags.website:menu"].trim().length > 0;

  return {
    hasWebsite: hasW || hasTagWebsite,
    hasWebsiteMenu: hasWM || hasTagWebsiteMenu,
    website: hasW ? w : (hasTagWebsite ? flat["tags.website"] : null),
    website_menu: hasWM ? wm : (hasTagWebsiteMenu ? flat["tags.website:menu"] : null),
  };
}

function toCSV(rows) {
  const headers = [
    "rank",
    "osm_type",
    "osm_id",
    "name",
    "city",
    "prio1_lunch_field",
    "prio1_note_mentions",
    "prio2_has_website",
    "prio2_has_website_menu",
    "field_count_total",
    "website",
    "website_menu",
    "lunch_value",
    "note",
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

  const root = readJSON(IN_FILE);
  const elements = extractElements(root);

  // 1) schema inventory: element-level + tags-level as separate namespaces
  const schema = {
    file: path.basename(IN_FILE),
    generator: root.generator ?? null,
    osm_timestamp: root?.osm3s?.timestamp_osm_base ?? null,
    element_count: elements.length,
    fields: {}, // flat field key -> {count, types, examples}
  };

  for (const el of elements) {
    const flat = flattenElement(el);
    for (const [k, v] of Object.entries(flat)) {
      if (!schema.fields[k]) schema.fields[k] = { count: 0, types: {}, examples: [] };
      const f = schema.fields[k];
      f.count += 1;
      const t = typeOfValue(v);
      f.types[t] = (f.types[t] ?? 0) + 1;
      addExample(f, summarizeValue(v));
    }
  }

  for (const f of Object.values(schema.fields)) delete f._seen;

  fs.writeFileSync(OUT_SCHEMA, JSON.stringify(schema, null, 2), "utf8");

  // 2) ranking
  const ranked = elements
    .map((el) => {
      const flat = flattenElement(el);

      const osm_type = el.type ?? null;
      const osm_id = el.id ?? null;

      const name = flat.name ?? null;
      const city = flat.city ?? null;

      const { hasLunchField, noteMentions, noteText, lunchValue } = hasLunchSignal(flat);
      const w = hasWebsiteSignal(flat);

      const prio1 = hasLunchField || noteMentions ? 1 : 0;
      const prio2 = (w.hasWebsite || w.hasWebsiteMenu) ? 1 : 0;

      const fieldCountTotal = Object.keys(flat).length; // element fields + tags.* + aliases

      return {
        osm_type,
        osm_id,
        name,
        city,

        prio1_lunch_field: hasLunchField,
        prio1_note_mentions: noteMentions,

        prio2_has_website: w.hasWebsite,
        prio2_has_website_menu: w.hasWebsiteMenu,

        field_count_total: fieldCountTotal,

        website: w.website,
        website_menu: w.website_menu,

        lunch_value: summarizeValue(lunchValue, 220),
        note: noteText ? (noteText.length > 260 ? noteText.slice(0, 260) + "…" : noteText) : null,

        // keep raw for debugging if needed
        raw: el,
      };
    })
    .sort((a, b) => {
      // Sort keys:
      // 1) prio1 (lunch field or note mention)
      const a1 = (a.prio1_lunch_field || a.prio1_note_mentions) ? 1 : 0;
      const b1 = (b.prio1_lunch_field || b.prio1_note_mentions) ? 1 : 0;
      if (b1 !== a1) return b1 - a1;

      // 2) prio2 (has website or website:menu)
      const a2 = (a.prio2_has_website || a.prio2_has_website_menu) ? 1 : 0;
      const b2 = (b.prio2_has_website || b.prio2_has_website_menu) ? 1 : 0;
      if (b2 !== a2) return b2 - a2;

      // 3) more fields
      return b.field_count_total - a.field_count_total;
    })
    .map((r, idx) => ({ rank: idx + 1, ...r }));

  fs.writeFileSync(OUT_RANKED_JSON, JSON.stringify(ranked, null, 2), "utf8");
  fs.writeFileSync(OUT_RANKED_CSV, toCSV(ranked), "utf8");

  console.log("✅ Done");
  console.log(`Schema → ${path.relative(process.cwd(), OUT_SCHEMA)}`);
  console.log(`Ranked → ${path.relative(process.cwd(), OUT_RANKED_JSON)}`);
  console.log(`CSV    → ${path.relative(process.cwd(), OUT_RANKED_CSV)}`);
}

main();
