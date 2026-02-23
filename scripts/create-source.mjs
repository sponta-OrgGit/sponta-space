import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const projectId = process.env.GCP_PROJECT_ID;
const databaseId = process.env.FIRESTORE_DATABASE_ID;

if (!projectId) throw new Error("Missing GCP_PROJECT_ID");
if (!databaseId) throw new Error("Missing FIRESTORE_DATABASE_ID");

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(undefined, databaseId);

// usage: node scripts/create-source.mjs <venue_id> <canonical_url> <source_type> <requires_js>
const [, , venueId, canonicalUrl, sourceType, requiresJs] = process.argv;
if (!venueId || !canonicalUrl || !sourceType || !requiresJs) {
  console.error("Usage: node scripts/create-source.mjs <venue_id> <canonical_url> <source_type> <requires_js(true|false|auto)>");
  process.exit(1);
}

const sourceId = `${venueId}__primary`;

await db.collection("venue_sources").doc(sourceId).set({
  source_id: sourceId,
  venue_id: venueId,
  canonical_url: canonicalUrl,
  source_type: sourceType,          // website | pdf | instagram | wolt | ...
  requires_js: requiresJs,          // true | false | auto
  created_at: FieldValue.serverTimestamp(),
  updated_at: FieldValue.serverTimestamp(),
});

console.log("source created", sourceId);
