import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import * as cheerio from "cheerio";

const projectId = process.env.GCP_PROJECT_ID;
const databaseId = process.env.FIRESTORE_DATABASE_ID;
const bucketName = process.env.GCS_BUCKET;

if (!projectId) throw new Error("Missing GCP_PROJECT_ID");
if (!databaseId) throw new Error("Missing FIRESTORE_DATABASE_ID");
if (!bucketName) throw new Error("Missing GCS_BUCKET");

const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app, databaseId);

const storage = new Storage({ projectId });
const bucket = storage.bucket(bucketName);

// usage: node scripts/a3-parse.mjs <runId>
const [, , runId] = process.argv;
if (!runId) {
  console.error("Usage: node scripts/a3-parse.mjs <runId>");
  process.exit(1);
}

const runRef = db.collection("extraction_runs").doc(runId);
const runSnap = await runRef.get();
if (!runSnap.exists) throw new Error(`Missing extraction_runs/${runId}`);

const run = runSnap.data();
const gcsUri = run.raw_html_gcs;
if (!gcsUri) throw new Error(`extraction_runs/${runId} missing raw_html_gcs`);

if (!gcsUri.startsWith("gs://")) throw new Error("raw_html_gcs must be gs://...");

// gs://bucket/path/to/file
const without = gcsUri.replace("gs://", "");
const firstSlash = without.indexOf("/");
const gcsBucket = without.slice(0, firstSlash);
const gcsPath = without.slice(firstSlash + 1);

if (gcsBucket !== bucketName) {
  throw new Error(`raw_html_gcs bucket mismatch: expected ${bucketName}, got ${gcsBucket}`);
}

const [buf] = await bucket.file(gcsPath).download();
const html = buf.toString("utf-8");

// --- PARSE (v0: heuristiikka) ---
const $ = cheerio.load(html);

// Poimi näkyvä teksti (riittää ensimmäiseen versioon)
const pageText = $("body").text().replace(/\s+/g, " ").trim().toLowerCase();

// Etsi “menu-rivejä” listamaisesti: li / p / h2-h4
const candidates = [];
$("li, p, h2, h3, h4").each((_, el) => {
  const t = $(el).text().replace(/\s+/g, " ").trim();
  if (!t) return;
  // suodatus: liian lyhyet tai navigaatio-roska pois
  if (t.length < 10) return;
  candidates.push(t);
});

// Poimi ruoka-annos -tyyliset rivit (hinta tai allergiat tai selkeä annosnimi)
const items = candidates
  .filter((t) => /€|\beur\b|gluten|lakt|vega|veg|vgn|gfo|lounas|menu|keitto|pasta|kana|nauta|sala/i.test(t))
  .slice(0, 80) // ettei räjähdä
  .map((t) => ({
    raw: t,
  }));

const issues = [];
// Jos sivu ei vaikuta lounaslistalta, loggaa “warn”
if (!/lounas|lunch|week|viikko|menu/i.test(pageText)) {
  issues.push({
    issue_type: "NO_LUNCH_SIGNALS",
    severity: "warn",
    details: { reason: "Page text does not contain lunch/menu signals" },
  });
}
if (items.length === 0) {
  issues.push({
    issue_type: "NO_ITEMS_EXTRACTED",
    severity: "warn",
    details: { reason: "No menu-like items extracted from HTML" },
  });
}

// --- WRITE RESULT ---
await db.collection("extraction_results").doc(runId).set(
  {
    run_id: runId,
    venue_id: run.venue_id,
    source_id: run.source_id,
    parsed_at: FieldValue.serverTimestamp(),
    parser_version: "a3_v0_cheerio_heuristic",
    items,
    issues,
  },
  { merge: true }
);

// Päivitä runiin status + yhteenveto
await runRef.set(
  {
    parsed_at: FieldValue.serverTimestamp(),
    parse_status: items.length > 0 ? "ok" : "empty",
    parse_issue_count: issues.length,
    parse_item_count: items.length,
  },
  { merge: true }
);

console.log("A3 OK", {
  runId,
  venueId: run.venue_id,
  items: items.length,
  issues: issues.length,
});
