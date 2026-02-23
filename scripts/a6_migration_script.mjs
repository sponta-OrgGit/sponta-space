#!/usr/bin/env node
/**
 * A6 migration: kallioMVP_A-lunch_ranked_v1.json -> kallioMVP_A-lunch_ranked_v2.json
 * - Non-destructive: copies every row as-is (spread), adds MVP fields as flat top-level keys.
 * - Builds human-readable address from raw.tags addr:* fields (no lat/lon).
 * - Keeps lunch_website exactly as in v1.
 *
 * Usage:
 *  node scripts/a6_migration_script.mjs in.json out.json
 */

import fs from "node:fs";
import path from "node:path";

function fail(msg) {
  console.error(`\n[A6] ERROR: ${msg}\n`);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) fail(`Input file not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`Failed to parse JSON: ${filePath}\n${e?.message || e}`);
  }
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function buildAddress(row) {
  const tags = row?.raw?.tags || {};
  const street = tags["addr:street"] ?? null;
  const housenumber = tags["addr:housenumber"] ?? null;
  const postcode = tags["addr:postcode"] ?? null;
  const city = tags["addr:city"] ?? row?.city ?? null;

  // Street part
  let streetPart = null;
  if (street && housenumber) streetPart = `${street} ${housenumber}`;
  else if (street) streetPart = street;
  else if (housenumber) streetPart = housenumber;

  // City part
  let cityPart = null;
  if (postcode && city) cityPart = `${postcode} ${city}`;
  else if (city) cityPart = city;
  else if (postcode) cityPart = postcode;

  if (streetPart && cityPart) return `${streetPart}, ${cityPart}`;
  if (streetPart) return streetPart;
  if (cityPart) return cityPart;

  // no address info available in raw.tags
  return null;
}

function migrateRow(row) {
  // Non-destructive copy
  const v2 = { ...row };

  // MVP additions (flat, no nested objects)
  if (!Object.prototype.hasOwnProperty.call(v2, "address")) {
    v2.address = buildAddress(row);
  } else if (v2.address == null) {
    // if exists but null, still try to fill from raw.tags
    v2.address = buildAddress(row);
  }

  // Price + lunch period fields (null by default)
  if (!Object.prototype.hasOwnProperty.call(v2, "price_value_eur")) v2.price_value_eur = null;

  if (!Object.prototype.hasOwnProperty.call(v2, "lunch_period_start")) v2.lunch_period_start = null; // e.g. "11:00"
  if (!Object.prototype.hasOwnProperty.call(v2, "lunch_period_end")) v2.lunch_period_end = null;     // e.g. "14:00"

  // Dietary tag expectations (global hints; per-dish tags come later)
  if (!Object.prototype.hasOwnProperty.call(v2, "dietary_expected_tags")) {
    v2.dietary_expected_tags = ["G", "L", "V", "VE", "M"];
  }

  // Optional: mirror lunch_website to lunch_source_url (keep lunch_website untouched)
  if (!Object.prototype.hasOwnProperty.call(v2, "lunch_source_url")) {
    v2.lunch_source_url = v2.lunch_website ?? null;
  }

  // Quick sanity: if lunch_website exists in v1, it must remain
  // (Non-destructive spread already ensures this; this is just a guard)
  if (row?.lunch_website && v2.lunch_website !== row.lunch_website) {
    v2.lunch_website = row.lunch_website;
  }

  return v2;
}

function main() {
  const [, , inFile, outFile] = process.argv;
  if (!inFile || !outFile) {
    fail(`Usage: node scripts/a6_migration_script.mjs <in.json> <out.json>`);
  }

  const input = readJson(inFile);
  if (!Array.isArray(input)) fail(`Input JSON must be an array. Got: ${typeof input}`);

  const output = input.map(migrateRow);

  ensureDirForFile(outFile);
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", "utf8");

  // Small report
  const withLunchWebsite = output.filter(r => !!r.lunch_website).length;
  const withAddress = output.filter(r => !!r.address).length;

  console.log(`[A6] OK: migrated ${output.length} rows`);
  console.log(`[A6] lunch_website present: ${withLunchWebsite}/${output.length}`);
  console.log(`[A6] address built:        ${withAddress}/${output.length}`);
  console.log(`[A6] wrote: ${outFile}`);
}

main();
