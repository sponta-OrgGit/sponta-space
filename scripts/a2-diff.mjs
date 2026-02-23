import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import crypto from "crypto";
import { Storage } from "@google-cloud/storage";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const projectId = process.env.GCP_PROJECT_ID;
const databaseId = process.env.FIRESTORE_DATABASE_ID;
if (!projectId) throw new Error("Missing GCP_PROJECT_ID");
if (!databaseId) throw new Error("Missing FIRESTORE_DATABASE_ID");

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(undefined, databaseId);

const storage = new Storage({ projectId });

function parseGcsUri(gcsUri) {
  // gs://bucket/path/to/file
  const m = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) throw new Error(`Invalid GCS uri: ${gcsUri}`);
  return { bucket: m[1], path: m[2] };
}

async function readGcsText(gcsUri) {
  const { bucket, path } = parseGcsUri(gcsUri);
  const [buf] = await storage.bucket(bucket).file(path).download();
  return buf.toString("utf8");
}

function normalizeHtml(html) {
  if (!html) return "";
  let s = html;
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// usage: node scripts/a2-diff.mjs <run_id>
const [, , runId] = process.argv;
if (!runId) {
  console.error("Usage: node scripts/a2-diff.mjs <run_id>");
  process.exit(1);
}

const runRef = db.collection("extraction_runs").doc(runId);
const runSnap = await runRef.get();
if (!runSnap.exists) throw new Error(`Missing extraction_runs/${runId}`);

const run = runSnap.data();
if (run.status !== "ok") throw new Error(`Run status not ok: ${run.status}`);
if (!run.venue_id) throw new Error("Missing venue_id");
if (!run.raw_html_gcs) throw new Error("Missing raw_html_gcs");

const venueId = run.venue_id;

// Find previous OK run (excluding current)
const q = await db
  .collection("extraction_runs")
  .where("venue_id", "==", venueId)
  .where("status", "==", "ok")
  .orderBy("finished_at", "desc")
  .limit(5)
  .get();

let previous = null;
for (const doc of q.docs) {
  if (doc.id !== runId) {
    previous = { id: doc.id, ...doc.data() };
    break;
  }
}

const currentHtml = await readGcsText(run.raw_html_gcs);
const currentNorm = normalizeHtml(currentHtml);
const currentHash = sha256(currentNorm);

let changeDetected = true;
let changeReason = "first_run";
let previousRunId = null;
let previousHash = null;

if (previous && previous.raw_html_gcs) {
  previousRunId = previous.id;
  const prevHtml = await readGcsText(previous.raw_html_gcs);
  const prevNorm = normalizeHtml(prevHtml);
  previousHash = sha256(prevNorm);

  if (previousHash === currentHash) {
    changeDetected = false;
    changeReason = "no_change";
  } else {
    changeDetected = true;
    changeReason = "content_changed";
  }
}

// kirjoita tulos takaisin tähän runiin 

await runRef.set(
    {
      content_hash: currentHash,
      previous_run_id: previousRunId || null,
      previous_content_hash: previousHash || null,
      change_detected: changeDetected,
      change_reason: changeReason,
      diffed_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
);

console.log("A2 OK", {
  runId,
  venueId,
  changeDetected,
  changeReason,
  previousRunId,
});
