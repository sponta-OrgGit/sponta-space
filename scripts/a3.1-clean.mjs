import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const projectId = process.env.GCP_PROJECT_ID;
const databaseId = process.env.FIRESTORE_DATABASE_ID;

if (!projectId) throw new Error("Missing GCP_PROJECT_ID");
if (!databaseId) throw new Error("Missing FIRESTORE_DATABASE_ID");

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
});
const db = getFirestore(app, databaseId);

// usage: node scripts/a3-clean.mjs <run_id>
const [, , runId] = process.argv;
if (!runId) {
  console.error("Usage: node scripts/a3-clean.mjs <run_id>");
  process.exit(1);
}

const ref = db.collection("extraction_results").doc(runId);
const snap = await ref.get();
if (!snap.exists) throw new Error(`Missing extraction_results/${runId}`);

const data = snap.data() || {};
const items = Array.isArray(data.items) ? data.items : [];

// ---------- helpers ----------
const norm = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();

const isAllCaps = (s) => {
  const t = norm(s);
  if (!t) return false;
  const letters = t.replace(/[^A-Za-zÅÄÖåäö]/g, "");
  if (letters.length < 6) return false;
  return letters === letters.toUpperCase();
};

const looksLikeTitle = (s) => {
  const t = norm(s);
  if (!t) return false;
  if (t.length > 80) return false;
  if (t.endsWith(".")) return false;
  if (t.toLowerCase().includes("included in the lunch")) return false;
  if (t.toLowerCase().includes("we serve lunch")) return false;
  if (t.toLowerCase().includes("see today")) return false;
  if (t.toLowerCase().includes("facebook")) return false;
  if (t.toLowerCase().includes("make a reservation")) return false;
  if (t.includes("://")) return false;

  if (isAllCaps(t)) return true;

  const words = t.split(" ").filter(Boolean);
  if (words.length >= 1 && words.length <= 10) return true;

  return false;
};

const looksLikeOption = (s) => {
  const t = norm(s);
  if (!t) return false;
  if (t.length > 60) return false;
  return t.includes("/") && !t.includes("http");
};

const looksLikeNote = (s) => {
  const t = norm(s).toLowerCase();
  if (!t) return false;
  return (
    t.includes("we serve lunch") ||
    t.includes("included in the lunch") ||
    t.includes("see today") ||
    t.includes("facebook") ||
    t.includes("make a reservation") ||
    t.includes("oiva raportti")
  );
};

// ---------- 1) dedup ----------
const seen = new Set();
const itemsDedup = [];

for (const it of items) {
  const raw = norm(it?.raw);
  if (!raw) continue;
  const key = raw.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  itemsDedup.push(raw);
}

// ---------- 2) notes vs candidates ----------
const pageNotes = [];
const candidates = [];
for (const x of itemsDedup) {
  if (looksLikeNote(x)) pageNotes.push(x);
  else candidates.push(x);
}

// ---------- 3) grouping ----------
const itemsClean = [];
let cur = null;

const flush = () => {
  if (cur && cur.title) itemsClean.push(cur);
  cur = null;
};

for (const line of candidates) {
  if (looksLikeTitle(line)) {
    flush();
    cur = { title: line };
    continue;
  }

  if (!cur) {
    pageNotes.push(line);
    continue;
  }

  if (looksLikeOption(line)) {
    cur.options = cur.options || [];
    cur.options.push(line);
    continue;
  }

  if (!cur.description) cur.description = line;
  else cur.description += " " + line;
}
flush();

// ---------- 4) write back ----------
await ref.set(
  {
    a3_cleaned_at: FieldValue.serverTimestamp(),
    a3_items_dedup: itemsDedup.map((raw) => ({ raw })),
    a3_page_notes: pageNotes.map((raw) => ({ raw })),
    a3_items_clean: itemsClean,
    a3_stats: {
      input_count: items.length,
      dedup_count: itemsDedup.length,
      notes_count: pageNotes.length,
      items_clean_count: itemsClean.length,
    },
  },
  { merge: true }
);

console.log("A3.1 OK", {
  runId,
  dedup: itemsDedup.length,
  notes: pageNotes.length,
  itemsClean: itemsClean.length,
});
