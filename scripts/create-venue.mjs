import "dotenv/config";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GCP_PROJECT_ID,
});
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID);

await db.collection("venues").doc("arkade").set({
  venue_id: "arkade",
  name: "Arkade",
  city: "Helsinki",
  segment: "lunch",
  created_at: FieldValue.serverTimestamp(),
});

console.log("venue created");
