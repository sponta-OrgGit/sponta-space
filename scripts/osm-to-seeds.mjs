// scripts/osm-to-seeds.mjs
import fs from "node:fs";
import path from "node:path";

const RAW_PATH = process.argv[2] ?? "data/kallio_venues_raw.json";
const OUT_DIR = process.argv[3] ?? "seeds";
const OUT_INDEX = process.argv[4] ?? "data/kallio_venues_index.json";

function slugify(str) {
  return (str ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function pickCenter(el) {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lng: el.lon };
  if (el.center && typeof el.center.lat === "number" && typeof el.center.lon === "number") {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return { lat: null, lng: null };
}

function buildAddress(tags = {}) {
  const street = tags["addr:street"];
  const housenumber = tags["addr:housenumber"];
  const city = tags["addr:city"];
  const postcode = tags["addr:postcode"];

  const line1 = [street, housenumber].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");
  const full = [line1, line2].filter(Boolean).join(", ");

  return {
    address: full || null,
    postal_code: postcode || null,
    city: city || null,
  };
}

function isProbablyNotLunch(tags = {}) {
  const access = tags.access;
  if (access && ["private", "no"].includes(access)) return true;

  // Keep minimal; lunch-qualification happens later via A1 menu_url discovery.
  // This only filters obvious non-public entries.
  return false;
}

function parseSemicolonList(v) {
  if (!v) return [];
  return String(v)
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function truthyTag(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (["yes", "true", "1"].includes(s)) return true;
  if (["no", "false", "0"].includes(s)) return false;
  return null;
}

function marketingPriority(tags = {}) {
  // NOT lunch-candidate. Just prioritization for outreach / marketing funnel.
  let score = 0;
  const reasons = [];

  const name = (tags.name || "").toLowerCase();
  const cuisine = (tags.cuisine || "").toLowerCase();
  const opening = tags.opening_hours || "";

  if (opening && /(mo|mon).*(fr|fri)/i.test(opening)) {
    score += 40;
    reasons.push("weekday_opening_hours");
  }
  if (cuisine && /(buffet|lounas|lunch|finnish|asian|thai)/i.test(cuisine)) {
    score += 30;
    reasons.push("cuisine_hint");
  }
  if (tags.website) {
    score += 20;
    reasons.push("has_website");
  }
  if (/(bar|pub|cocktail)/i.test(name) || /(bar|pub|cocktail)/i.test(cuisine)) {
    score -= 30;
    reasons.push("bar_pub_signal");
  }
  if (truthyTag(tags.takeaway) === true || truthyTag(tags.delivery) === true) {
    score += 10;
    reasons.push("takeaway_or_delivery");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

function main() {
  if (!fs.existsSync(RAW_PATH)) throw new Error(`Missing file: ${RAW_PATH}`);
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
  const elements = raw.elements ?? [];
  if (!Array.isArray(elements) || elements.length === 0) throw new Error("No elements found in raw JSON.");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_INDEX), { recursive: true });

  const seenIds = new Map(); // slug -> count
  const index = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name;
    if (!name) continue;

    if (isProbablyNotLunch(tags)) continue;

    const amenity = tags.amenity ?? "";
    if (!["restaurant", "cafe", "fast_food"].includes(amenity)) continue;

    const { lat, lng } = pickCenter(el);
    const addr = buildAddress(tags);

    let baseSlug = slugify(name);
    if (!baseSlug) continue;

    const count = (seenIds.get(baseSlug) ?? 0) + 1;
    seenIds.set(baseSlug, count);
    const venue_id = count === 1 ? baseSlug : `${baseSlug}-${count}`;

    const cuisineArr = parseSemicolonList(tags.cuisine);
    const mp = marketingPriority(tags);

    const seed = {
      venue_id,
      name,
      city: addr.city || "Helsinki",
      address: addr.address,
      postal_code: addr.postal_code,
      country: "FI",
      segment: "Lunch",
      status: "active",
      lat,
      lng,

      // OSM enrichment (optional per venue)
      website: tags.website ?? "",
      phone: tags.phone ?? "",
      email: tags.email ?? "",
      opening_hours: tags.opening_hours ?? "",
      cuisine: cuisineArr,
      diet: {
        vegan: tags["diet:vegan"] ?? "",
        vegetarian: tags["diet:vegetarian"] ?? "",
      },
      services: {
        takeaway: tags.takeaway ?? "",
        delivery: tags.delivery ?? "",
      },
      osm: {
        type: el.type,
        id: el.id,
        check_date: tags.check_date ?? "",
      },

      // Marketing funnel prioritization (NOT lunch decision)
      marketing_priority: {
        score: mp.score,
        reasons: mp.reasons,
      },

      // Lunch is a 0/1 decision done later by A1 (menu link discovery)
      lunch: {
        has_menu: false,
        menu_url: "",
        checked_at: "",
      },

      // Source policy: no social. Website source is created if website exists,
      // but primary_source_id is NOT set automatically (to avoid convention conflicts).
      primary_source_id: "",
      sources: [],

      // Fallback: fill if found from lounaat.info later
      lounaat_info_url: "",
    };

    // Convention confirmed by you:
    // website-source id uses __primary (source_type=website_html), but remains pending until verified.
    if (seed.website) {
      seed.sources.push({
        source_id: `${venue_id}__primary`,
        canonical_url: seed.website,
        source_type: "website_html",
        reliability_rank: 1,
        requires_js: "auto",
        menu_selector_hint: "main",
        backup_urls: [],
        verification: {
          status: "pending", // pending | approved | rejected
          verified_at: null,
          verified_by: "",
        },
      });
    }

    const seedPath = path.join(OUT_DIR, `${venue_id}.seed.json`);
    fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2), "utf8");

    index.push({
      venue_id,
      name,
      amenity,
      lat,
      lng,
      address: seed.address,
      postal_code: seed.postal_code,

      website: seed.website,
      email: seed.email,
      phone: seed.phone,
      opening_hours: seed.opening_hours,
      cuisine: seed.cuisine,
      diet_vegan: seed.diet.vegan,
      diet_vegetarian: seed.diet.vegetarian,

      marketing_priority_score: seed.marketing_priority.score,
      marketing_priority_reasons: seed.marketing_priority.reasons,

      osm_type: el.type,
      osm_id: el.id,
    });
  }

  fs.writeFileSync(OUT_INDEX, JSON.stringify({ count: index.length, venues: index }, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, seeds: index.length, out_dir: OUT_DIR, index: OUT_INDEX }));
}

main();
