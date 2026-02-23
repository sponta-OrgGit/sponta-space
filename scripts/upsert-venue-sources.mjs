#!/usr/bin/env node
/**
 * Upsert venues + venue_sources from a JSON seed file (v1).
 *
 * Usage:
 *   node scripts/upsert-venue-sources.mjs config/venue_data_*.seed.json
 *
 * Seed formats supported:
 *  A) "venue_data" style (recommended):
 *     {
 *       "venue_id": "lie-mi-kallio",
 *       "name": "Lie Mi (Kallio)",
 *       "city": "Helsinki",
 *       "address": "Siltasaarenkatu 13",
 *       "postal_code": "00530",
 *       "country": "FI",
 *       "segment": "Lunch",
 *       "status": "active",
 *       "primary_source_id": "lie-mi-kallio__primary",
 *       "sources": [ { ... } ]
 *     }
 *
 *  B) "sources only" style:
 *     { "sources": [ { ... } ] }
 *
 * Requires:
 *   - ADC credentials available (gcloud auth application-default login)
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ---- Config ----
const PROJECT_ID = "sponta-c2f79";
const DB_ID = "sponta-venues";

const ALLOWED_SOURCE_TYPES = new Set([
  "website_html",
  "website_js",
  "pdf",
  "image",
  "social",
  "aggregator",
]);

const ALLOWED_CYCLES = new Set(["daily", "weekly", "rotating", "unknown"]);
const ALLOWED_LANG = new Set(["fi", "en", "sv", "unknown"]);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function readJson(fp) {
  const abs = path.resolve(fp);
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw);
}

function normStr(x) {
  if (x == null) return null;
  const s = String(x).trim();
  return s.length ? s : null;
}

function normalizeBoolOrAuto(x) {
  if (x === true || x === false) return x;
  if (x === "auto") return "auto";
  if (x == null) return "auto";
  die(`Invalid requires_js: ${x} (must be true|false|"auto")`);
}

function normalizeBackupUrls(x) {
  if (x == null) return [];
  if (!Array.isArray(x)) die(`backup_urls must be array, got: ${typeof x}`);

  // accept ["url", ...] OR [{url:"..."}, ...]
  const out = [];
  for (const item of x) {
    if (!item) continue;
    if (typeof item === "string") {
      const u = item.trim();
      if (u) out.push(u);
      continue;
    }
    if (typeof item === "object" && typeof item.url === "string") {
      const u = item.url.trim();
      if (u) out.push(u);
      continue;
    }
    die(`Invalid backup_urls entry: ${JSON.stringify(item)}`);
  }
  return out;
}

function validateSource(raw) {
  const s = { ...raw };

  const req = ["venue_id", "source_id", "canonical_url", "source_type"];
  for (const k of req) {
    if (!s[k] || typeof s[k] !== "string") {
      die(`Missing/invalid ${k} in source: ${JSON.stringify(s)}`);
    }
  }

  if (!ALLOWED_SOURCE_TYPES.has(s.source_type)) {
    die(`Invalid source_type "${s.source_type}" for ${s.source_id}`);
  }

  if (s.reliability_rank != null) {
    const r = Number(s.reliability_rank);
    if (!Number.isFinite(r) || r < 1 || r > 10) {
      die(`Invalid reliability_rank for ${s.source_id} (1..10)`);
    }
    s.reliability_rank = r;
  }

  if (s.expected_cycle != null && !ALLOWED_CYCLES.has(String(s.expected_cycle))) {
    die(`Invalid expected_cycle "${s.expected_cycle}" for ${s.source_id}`);
  }

  if (s.primary_language != null && !ALLOWED_LANG.has(String(s.primary_language))) {
    die(`Invalid primary_language "${s.primary_language}" for ${s.source_id}`);
  }

  s.requires_js = normalizeBoolOrAuto(s.requires_js);
  s.menu_selector_hint = normStr(s.menu_selector_hint);
  s.notes = normStr(s.notes);
  s.primary_language = (normStr(s.primary_language) ?? "unknown");
  s.expected_cycle = (normStr(s.expected_cycle) ?? "unknown");
  s.backup_urls = normalizeBackupUrls(s.backup_urls);

  // normalize canonical_url
  s.canonical_url = String(s.canonical_url).trim();

  return s;
}

function pickVenueId(data, sources) {
  return normStr(data?.venue_id) ?? normStr(sources?.[0]?.venue_id);
}

function pickPrimarySourceId(data, sources, venueId) {
  const explicit = normStr(data?.primary_source_id);
  if (explicit) return explicit;

  const rank1 = sources.find((x) => Number(x?.reliability_rank ?? 999) === 1)?.source_id;
  if (rank1) return rank1;

  const first = sources?.[0]?.source_id;
  if (first) return first;

  // last resort (fallback convention)
  return venueId ? `${venueId}__primary` : null;
}

async function main() {
  const seedPath = process.argv[2];
  if (!seedPath) die("Usage: node scripts/upsert-venue-sources.mjs <path/to/seed.json>");

  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }

  const db = getFirestore(undefined, DB_ID);
  console.log("DB:", db.databaseId);

  const data = readJson(seedPath);

  // sources can be in root (venue_data style) OR directly in data.sources
  const rawSources = data?.sources;
  if (!Array.isArray(rawSources) || rawSources.length === 0) {
    die('Seed must have { "sources": [ ... ] } with at least one entry.');
  }

  // validate + normalize sources
  const sources = rawSources.map(validateSource);

  // venue_id must exist (either root or inferred)
  const venueId = pickVenueId(data, sources);
  if (!venueId) die("Missing venue_id (either root venue_id or sources[0].venue_id)");

  // ensure all sources belong to same venue (defensive)
  for (const s of sources) {
    if (s.venue_id !== venueId) {
      die(`sources venue_id mismatch: ${s.venue_id} != ${venueId} in ${s.source_id}`);
    }
  }

  const now = FieldValue.serverTimestamp();

  // ---- Upsert venues/{venueId} ONCE ----
  const venueRef = db.collection("venues").doc(venueId);
  const venueSnap = await venueRef.get();

  const venueDoc = {
    venue_id: venueId,

    // Use seed values if present, but never write empty strings
    name: normStr(data?.name),
    city: normStr(data?.city),
    address: normStr(data?.address),
    postal_code: normStr(data?.postal_code),

    // defaults
    country: normStr(data?.country) ?? "FI",
    segment: normStr(data?.segment) ?? "Lunch",
    status: normStr(data?.status) ?? "active",

    primary_source_id: pickPrimarySourceId(data, sources, venueId),

    updated_at: now,
  };

  // avoid overwriting existing fields with nulls:
  Object.keys(venueDoc).forEach((k) => {
    if (venueDoc[k] === null) delete venueDoc[k];
  });

  // created_at only on first creation
  if (!venueSnap.exists) venueDoc.created_at = now;

  await venueRef.set(venueDoc, { merge: true });

  // ---- Upsert venue_sources (preserve discovered_at if exists) ----
  const writer = db.bulkWriter();
  let written = 0;

  for (const s of sources) {
    const srcRef = db.collection("venue_sources").doc(s.source_id);
    const srcSnap = await srcRef.get();

    const srcDoc = {
      source_id: s.source_id, // not required but nice for debugging
      venue_id: venueId,

      canonical_url: s.canonical_url,
      source_type: s.source_type,
      reliability_rank: s.reliability_rank ?? 1,
      requires_js: s.requires_js,
      menu_selector_hint: s.menu_selector_hint ?? null,
      primary_language: s.primary_language ?? "unknown",
      expected_cycle: s.expected_cycle ?? "unknown",
      notes: s.notes ?? null,

      // v1 wants string[] ✅
      backup_urls: s.backup_urls ?? [],

      updated_at: now,
      // discovered_at only if new OR explicitly provided
      ...(srcSnap.exists
        ? (s.discovered_at ? { discovered_at: s.discovered_at } : {})
        : { discovered_at: s.discovered_at ?? now }),
    };

    writer.set(srcRef, srcDoc, { merge: true });
    written += 1;
  }

  await writer.close();

  console.log(`OK: upserted venues/${venueId} + ${written} venue_sources`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
