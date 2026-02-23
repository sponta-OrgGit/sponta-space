#!/usr/bin/env node
/**
 * A7 validation: checks kallioMVP_A-lunch_ranked_v2.json integrity
 *
 * Modes:
 *  - prep   (default): allows price_value_eur == null, reports as TODO
 *  - strict: blocks if price_value_eur == null or invalid
 *
 * Usage:
 *  node scripts/a7_validate_v2.mjs out/kallioMVP_A-lunch_ranked_v2.json
 *  node scripts/a7_validate_v2.mjs out/kallioMVP_A-lunch_ranked_v2.json strict
 */

import fs from "node:fs";

const [,, inPath, modeArg] = process.argv;
const mode = (modeArg || "prep").toLowerCase();
if (!["prep", "strict"].includes(mode)) {
  console.error("Usage: node scripts/a7_validate_v2.mjs <v2.json> [prep|strict]");
  process.exit(1);
}
if (!inPath) {
  console.error("Usage: node scripts/a7_validate_v2.mjs <v2.json> [prep|strict]");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
if (!Array.isArray(data)) {
  console.error("ERROR: Input is not an array");
  process.exit(1);
}

const issues = {
  // BLOCKERS (always)
  missing_name: [],
  missing_address: [],
  invalid_lunch_website: [], // lunch_website === false

  // WARNINGS / TODOs
  missing_price: [],         // only blocker in strict
  invalid_price: [],         // blocker in strict, warning in prep
  missing_dietary_tags: [],  // treat as blocker; change if you want
};

const isNonEmptyString = (x) => typeof x === "string" && x.trim().length > 0;

for (const v of data) {
  const id = `${v.name ?? "UNKNOWN"} (${v.osm_id ?? "no_osm_id"})`;

  // name (blocker)
  if (!isNonEmptyString(v.name)) issues.missing_name.push(id);

  // address (blocker)
  if (!isNonEmptyString(v.address)) issues.missing_address.push(id);

  // lunch_website (blocker if false; null ok; string ok)
  if (v.lunch_website === false) issues.invalid_lunch_website.push(id);

  // dietary tags (blocker)
  if (!Array.isArray(v.dietary_expected_tags) || v.dietary_expected_tags.length === 0) {
    issues.missing_dietary_tags.push(id);
  }

  // price
  if (v.price_value_eur == null) {
    issues.missing_price.push(id);
  } else {
    const n = v.price_value_eur;
    const ok = typeof n === "number" && !Number.isNaN(n) && n > 0;
    if (!ok) issues.invalid_price.push(`${id} -> ${String(n)}`);
  }
}

// --- REPORT ---
const blockers = {
  missing_name: issues.missing_name,
  missing_address: issues.missing_address,
  invalid_lunch_website: issues.invalid_lunch_website,
  missing_dietary_tags: issues.missing_dietary_tags,
  ...(mode === "strict" ? { missing_price: issues.missing_price, invalid_price: issues.invalid_price } : {}),
};

const warnings = {
  ...(mode === "prep" ? { missing_price: issues.missing_price, invalid_price: issues.invalid_price } : {}),
};

const blockerCount = Object.values(blockers).reduce((s, a) => s + a.length, 0);
const warningCount = Object.values(warnings).reduce((s, a) => s + a.length, 0);

console.log("\n=== A7 VALIDATION REPORT ===");
console.log(`Mode:          ${mode}`);
console.log(`Venues checked: ${data.length}`);
console.log(`Blockers:      ${blockerCount}`);
console.log(`Warnings/TODO: ${warningCount}\n`);

for (const [key, list] of Object.entries(blockers)) {
  if (list.length) {
    console.log(`⛔ ${key} (${list.length})`);
    list.forEach(x => console.log("  -", x));
    console.log("");
  }
}

for (const [key, list] of Object.entries(warnings)) {
  if (list.length) {
    console.log(`⚠️  ${key} (${list.length})`);
    // print only first 25 to avoid spam
    list.slice(0, 25).forEach(x => console.log("  -", x));
    if (list.length > 25) console.log(`  ... +${list.length - 25} more`);
    console.log("");
  }
}

if (blockerCount === 0) {
  console.log("✅ DATASET OK FOR THIS MODE");
  process.exit(0);
} else {
  console.log("⛔ DATASET NOT READY — FIX BLOCKERS ABOVE");
  process.exit(1);
}
