#!/usr/bin/env node
/**
 * A3.2 — Menu extractor (MVP, simplified + stable)
 * Reads:  extraction_runs/{runId}.raw_html_gcs (gs://...)
 * Writes: extraction_results/{runId}.a3_menu (merge)
 * Writes: summary fields to extraction_runs/{runId} (merge)
 *
 * Run:
 *   node scripts/a3.2-menu.mjs run_XXXXXXXXXXXX
 */

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import * as cheerio from "cheerio";

// ---- Config ----
const PROJECT_ID = "sponta-c2f79";
const DB_ID = "sponta-venues";

// ---- Regex ----
const DAY_RX = /^(ma|ti|ke|to|pe|la|su)\s*(\d{1,2})\.(\d{1,2})\.?$/i;
const TIME_RX = /\b(klo|kello)\s*(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/i;
const EURO_RX = /(\d{1,3}(?:[.,]\d{1,2})?)\s*€+/;
const ALLERGENS_RX = /\(([^)]+)\)\s*$/;

function norm(s) {
  return (s || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseGsUri(gsUri) {
  const m = /^gs:\/\/([^/]+)\/(.+)$/.exec(gsUri);
  if (!m) throw new Error(`Invalid GCS URI: ${gsUri}`);
  return { bucket: m[1], name: m[2] };
}

async function downloadGcsText(storage, gsUri) {
  const { bucket, name } = parseGsUri(gsUri);
  const [buf] = await storage.bucket(bucket).file(name).download();
  return buf.toString("utf8");
}

function parseAllergens(line) {
  const m = ALLERGENS_RX.exec(line);
  if (!m) return { name: line.trim(), tags: [] };

  const tags = m[1]
    .split(/[,/]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const name = line.replace(ALLERGENS_RX, "").trim();
  return { name, tags };
}

function extractBlocks(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const main =
    $("main").first().length
      ? $("main").first()
      : $("#content").first().length
        ? $("#content").first()
        : $("body");

  const blocks = [];
  main.find("h1,h2,h3,h4,strong,p,li").each((_, el) => {const text = norm($(el).text());
    if (!text) return;
    blocks.push(text);
  });

  // dedup adjacent
  const out = [];
  for (const t of blocks) {
    if (out.length && out[out.length - 1] === t) continue;
    out.push(t);
  }
  return out;
}

function guessIsoDate(dd, mm, startedAt) {
  if (!startedAt) return null;
  const base = new Date(startedAt);
  if (Number.isNaN(base.getTime())) return null;

  let year = base.getFullYear();
  const runMonth = base.getMonth() + 1;

  if (mm - runMonth > 6) year -= 1;
  if (runMonth - mm > 6) year += 1;

  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${pad(mm)}-${pad(dd)}`;
}

function uniq(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function splitConcats(line) {
  // Splits ")X" where X is uppercase (handles missing newline cases)
  // No lookbehind: replace ")(Uppercase)" boundary with ")\n"
  const s = String(line || "");
  const withSep = s.replace(/\)(?=[A-ZÅÄÖ])/g, ")\n");
  return withSep
    .split("\n")
    .map((x) => norm(x))
    .filter(Boolean);
}

function computeConfidence({ hasTime, hasPrices, dayCount, dishCount }) {
  let c = 0.2;
  if (dishCount >= 4) c += 0.25;
  if (dayCount >= 1) c += 0.25;
  if (hasTime) c += 0.15;
  if (hasPrices) c += 0.10;
  if (dishCount >= 12) c += 0.05;
  return Math.max(0, Math.min(1, c));
}

async function onFatal(e) {
  console.error("A3.2 FAILED:", e);

  const runId = process.argv[2] || null;

  try {
    if (runId) {
      const db = getFirestore(undefined, DB_ID);
      await db.collection("extraction_runs").doc(runId).set(
        {
          menu_extracted_at: FieldValue.serverTimestamp(),
          menu_status: "failed",
          menu_error: String(e),
        },
        { merge: true }
      );
    }
  } catch {
    // swallow
  }

  process.exit(1);
}

async function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error("Usage: node scripts/a3.2-menu.mjs <runId>");
    process.exit(1);
  }

  // Init admin once
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }

  const db = getFirestore(undefined, DB_ID);
  console.log("DB:", db.databaseId);

  const storage = new Storage();

  // Load run doc
  const runRef = db.collection("extraction_runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) throw new Error(`RUN_NOT_FOUND: ${runId}`);

  const runDoc = runSnap.data();
  const rawHtmlGcs = runDoc?.raw_html_gcs;
  if (!rawHtmlGcs) throw new Error(`MISSING_RAW_HTML_GCS: extraction_runs/${runId}`);

  const startedAt =
    runDoc?.started_at?.toDate?.()
      ? runDoc.started_at.toDate()
      : runDoc?.started_at || null;

  const venueId = runDoc?.venue_id || null;
  const sourceId = runDoc?.source_id || null;
  const sourceUrl = runDoc?.source_url || null;

  // Download + parse
  const html = await downloadGcsText(storage, rawHtmlGcs);
  const blocks = extractBlocks(html);

  let lunchTime = null;
  let dateGuess = null;
  let currentDay = null;
  const daysSeen = [];

  const prices = [];
  const generalNotes = [];
  const dishes = [];
  const issues = [];

  for (const t of blocks) {
    // time
    if (!lunchTime) {
      const tm = TIME_RX.exec(t);
      if (tm) lunchTime = `${tm[2].replace(".", ":")}–${tm[3].replace(".", ":")}`;
    }

    // day header
    const dm = DAY_RX.exec(t);
    if (dm) {
      const dd = parseInt(dm[2], 10);
      const mm = parseInt(dm[3], 10);
      const iso = guessIsoDate(dd, mm, startedAt);
      currentDay = { label: t, iso };
      daysSeen.push(currentDay);
      if (!dateGuess && iso) dateGuess = iso;
      continue;
    }

    // prices
    if (EURO_RX.test(t) && !/suomi|saksa|brasilia/i.test(t)) {
      const m = EURO_RX.exec(t);
      const value = m ? Number(m[1].replace(",", ".")) : null;
      const name = norm(t.replace(EURO_RX, "").replace(/€+/g, "")).trim() || "price";
      prices.push({ name, value_eur: value, raw: t });
      continue;
    }

    // general notes
    if (/noutopöyd|buffet|salaatti|leipä|kahvi|tee/i.test(t) && t.length > 20) {
      if (!ALLERGENS_RX.test(t) && !DAY_RX.test(t)) {
        generalNotes.push(t);
        continue;
      }
    }

    // dish-like
    const looksLikeDish =
      ALLERGENS_RX.test(t) ||
      /keitto|kana|nauta|porsas|tofu|pasta|lasagne|curry|riisi|wok|kala|hernekeitto|pannukakku/i.test(t);

    if (!looksLikeDish) continue;

    for (const part of splitConcats(t)) {
      if (/^nauta:|^porsas:|^kana:/i.test(part)) continue;

      const { name, tags } = parseAllergens(part);
      if (!name) continue;

      dishes.push({
        day_label: currentDay?.label || null,
        date: currentDay?.iso || null,
        name,
        allergen_tags: tags,
        description: null,
        image_url: null,
        raw: part,
      });
    }
  }

  const dishes2 = uniq(dishes, (d) => `${d.date}|${d.name}|${d.allergen_tags.join(",")}`);
  const prices2 = uniq(prices, (p) => `${p.name}|${p.value_eur}`);
  const notes2 = uniq(generalNotes, (x) => x);

  const hasTime = !!lunchTime;
  const hasPrices = prices2.length > 0;

  if (!daysSeen.length) issues.push({ code: "NO_DAY_HEADERS", detail: "No weekday headers like 'Ma 19.1.' found." });
  if (!dishes2.length) issues.push({ code: "NO_DISHES", detail: "No dishes detected." });
  if (!hasTime) issues.push({ code: "NO_LUNCH_TIME", detail: "No lunch time found." });
  if (!hasPrices) issues.push({ code: "NO_PRICES", detail: "No prices found." });

  const confidence = computeConfidence({
    hasTime,
    hasPrices,
    dayCount: daysSeen.length,
    dishCount: dishes2.length,
  });

  const a3Menu = {
    venue_id: venueId,
    source_id: sourceId,
    source_url: sourceUrl,
    run_id: runId,
    date_guess: dateGuess || null,
    lunch_time: lunchTime || null,
    prices: prices2,
    dishes: dishes2,
    general_notes: notes2,
    confidence,
    issues,
  };

  // Write extraction_results
  await db.collection("extraction_results").doc(runId).set(
    {
      a3_2_extracted_at: FieldValue.serverTimestamp(),
      a3_2_version: "a3_2_menu_v0_simplified",
      a3_menu: a3Menu,
    },
    { merge: true }
  );

  // Write run summary
  await runRef.set(
    {
      menu_extracted_at: FieldValue.serverTimestamp(),
      menu_status: dishes2.length > 0 ? "ok" : "empty",
      menu_confidence: confidence,
      menu_issue_count: issues.length,
      menu_dish_count: dishes2.length,
      menu_day_count: daysSeen.length,
    },
    { merge: true }
  );

  console.log("A3.2 OK:", { runId, dishes: dishes2.length, days: daysSeen.length, confidence });
}

main().catch(onFatal);
