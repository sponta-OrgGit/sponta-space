import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";

const projectId = process.env.GCP_PROJECT_ID;
const databaseId = process.env.FIRESTORE_DATABASE_ID;
const bucketName = process.env.GCS_BUCKET;

if (!projectId) throw new Error("Missing GCP_PROJECT_ID");
if (!databaseId) throw new Error("Missing FIRESTORE_DATABASE_ID");
if (!bucketName) throw new Error("Missing GCS_BUCKET");

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
});
const db = getFirestore(app, databaseId);

const storage = new Storage({ projectId });
const bucket = storage.bucket(bucketName);

// usage: node scripts/a1-fetch.mjs <venue_id> [source_id]
const [, , venueId, sourceIdArg] = process.argv;
if (!venueId) {
  console.error("Usage: node scripts/a1-fetch.mjs <venue_id> [source_id]");
  process.exit(1);
}

const sourceId = sourceIdArg || `${venueId}__primary`;

const sourceSnap = await db.collection("venue_sources").doc(sourceId).get();
if (!sourceSnap.exists) {
  throw new Error(`Missing venue_sources/${sourceId}`);
}

const { canonical_url: url } = sourceSnap.data();
if (!url) throw new Error(`venue_sources/${sourceId} missing canonical_url`);

const runId = `run_${Date.now()}`;

const runRef = db.collection("extraction_runs").doc(runId);
await runRef.set({
  run_id: runId,
  venue_id: venueId,
  source_id: sourceId,
  source_url: url,
  started_at: FieldValue.serverTimestamp(),
  status: "started",
  render_used: false,
  trigger: "manual_cli",
  trigger_id: process.env.USER || null,
});

let res;
try {
  res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (SpontaBot/0.1)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
} catch (e) {
  await runRef.update({
    status: "failed",
    error: String(e),
    finished_at: FieldValue.serverTimestamp(),
  });
  throw e;
}

const html = await res.text();
const httpStatus = res.status;

const issues = [];

// Heuristiikka 1: tyhjä / liian lyhyt HTML
if (!html || html.length < 500) {
  issues.push({
    issue_type: "UNRECOGNIZABLE_FORMAT",
    severity: "blocker",
    details: { reason: "HTML too short" },
  });
}

// Heuristiikka 2: selkeä JS-app (React/Vue tms.)
if (
  html.includes("id=\"__next\"") ||
  html.includes("data-reactroot") ||
  html.includes("window.__NUXT__")
) {
  issues.push({
    issue_type: "HEAVY_JS_REQUIRED",
    severity: "warn",
    details: { reason: "Client-rendered app detected" },
  });
}

// Heuristiikka 3: paywall / bot block
if (
  html.toLowerCase().includes("enable javascript") ||
  html.toLowerCase().includes("access denied") ||
  html.toLowerCase().includes("are you a robot")
) {
  issues.push({
    issue_type: "PAYWALL_OR_ANTI_BOT",
    severity: "blocker",
    details: { reason: "Bot protection detected" },
  });
}


const objectPath = `runs/${venueId}/${runId}/raw.html`;
await bucket.file(objectPath).save(html, {
  contentType: "text/html; charset=utf-8",
});

await runRef.update({
status: httpStatus >= 200 && httpStatus < 400 ? "ok" : "error",
  http_status: httpStatus,
  raw_html_gcs: `gs://${bucketName}/${objectPath}`,
  finished_at: FieldValue.serverTimestamp(),
});

for (const issue of issues) {
    await db.collection("issues").add({
      run_id: runId,
      venue_id: venueId,
      agent: "A1",
      issue_type: issue.issue_type,
      severity: issue.severity,
      details: issue.details,
      created_at: FieldValue.serverTimestamp(),
      is_open: true,
    });
  }
  

console.log("OK", { runId, httpStatus, gcs: `gs://${bucketName}/${objectPath}` });
