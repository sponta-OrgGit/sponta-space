#!/usr/bin/env node
/**
 * A3.3 — Menu diff (STRICT)
 * - Never diffs against failed runs
 * - Never resurrects old data
 * - Baseline = previous SUCCESSFUL menu only
 */

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ---- Config ----
const PROJECT_ID = "sponta-c2f79";
const DB_ID = "sponta-venues";

// ---- Helpers ----
const norm = (s) =>
  (s || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();

const nameNorm = (s) =>
  norm(s)
    .toLowerCase()
    .replace(/\(([^)]+)\)\s*$/g, "")
    .replace(/[–—-]/g, "-")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const dishKey = (d) =>
  `${d?.date || d?.day_label || "unknown"}|${nameNorm(d?.name || d?.raw || "")}`;

const uniqBy = (arr, keyFn) => {
  const seen = new Set();
  return (arr || []).filter((x) => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const summarizeDish = (d) => ({
  date: d?.date || null,
  day_label: d?.day_label || null,
  name: d?.name || null,
  allergen_tags: Array.isArray(d?.allergen_tags) ? d.allergen_tags : [],
  raw: d?.raw || null,
});

function decideChangeType({ added, removed, modified, pricesChanged, baselineFound }) {
  if (!baselineFound) return { meaningful: true, type: "first_baseline" };
  if (!added && !removed && !modified && !pricesChanged)
    return { meaningful: false, type: "none" };

  const kinds = [];
  if (added) kinds.push("added");
  if (removed) kinds.push("removed");
  if (modified) kinds.push("modified");

  return {
    meaningful: true,
    type: kinds.length === 1 ? kinds[0] : "mixed",
  };
}

// ---- Main ----
async function main() {
  const runId = process.argv[2];
  if (!runId) throw new Error("Usage: node a3.3-diff.mjs <runId>");

  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }

  const db = getFirestore(undefined, DB_ID);

  const runRef = db.collection("extraction_runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) throw new Error("RUN_NOT_FOUND");

  const run = runSnap.data();

  // ---- HARD STOP: only successful runs are diffed ----
  if (run.status !== "ok" || run.menu_status !== "ok") {
    await runRef.set(
      {
        menu_diffed_at: FieldValue.serverTimestamp(),
        menu_changed: false,
        menu_change_type: "acquisition_failed",
      },
      { merge: true }
    );
    console.log("A3.3 SKIP — acquisition failed");
    return;
  }

  const resRef = db.collection("extraction_results").doc(runId);
  const resSnap = await resRef.get();
  if (!resSnap.exists || !resSnap.data()?.a3_menu)
    throw new Error("MISSING_A3_MENU");

  const curMenu = resSnap.data().a3_menu;
  const curDishes = uniqBy(curMenu.dishes || [], dishKey);

  // ---- Find baseline: ONLY successful previous run ----
  const q = await db
  .collection("extraction_runs")
  .where("venue_id", "==", run.venue_id)
  .where("source_id", "==", run.source_id)
  .limit(20)
  .get();

const runs = q.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .filter(r =>
    r.id !== runId &&
    r.status === "ok" &&
    r.menu_status === "ok" &&
    (r.menu_dish_count ?? 0) > 0 &&
    (r.menu_confidence ?? 0) >= 0.7
  )
  .sort((a, b) =>
    (b.menu_extracted_at?.toMillis?.() ?? 0) -
    (a.menu_extracted_at?.toMillis?.() ?? 0)
  );

const baselineRun = runs[0] ?? null;

let baselineMenu = null;
let baselineRunId = null;

if (baselineRun) {
  const rs = await db.collection("extraction_results").doc(baselineRun.id).get();
  if (rs.exists && rs.data()?.a3_menu) {
    baselineMenu = rs.data().a3_menu;
    baselineRunId = baselineRun.id;
  }
}


  const baseDishes = uniqBy(baselineMenu?.dishes || [], dishKey);

  const baseMap = new Map(baseDishes.map((d) => [dishKey(d), d]));
  const curMap = new Map(curDishes.map((d) => [dishKey(d), d]));

  const added = [];
  const removed = [];
  const modified = [];

  for (const [k, d] of curMap) {
    if (!baseMap.has(k) && baselineMenu) added.push(d);
  }

  for (const [k, d] of baseMap) {
    if (!curMap.has(k)) removed.push(d);
  }

  const decision = decideChangeType({
    added: added.length,
    removed: removed.length,
    modified: modified.length,
    pricesChanged: false,
    baselineFound: !!baselineMenu,
  });

  const diff = {
    venue_id: run.venue_id,
    source_id: run.source_id,
    run_id: runId,
    baseline_run_id: baselineRunId,
    meaningful_change: decision.meaningful,
    change_type: decision.type,
    counts: {
      added: added.length,
      removed: removed.length,
      modified: modified.length,
      prices_changed: 0,
    },
    added: added.map(summarizeDish),
    removed: removed.map(summarizeDish),
    modified: [],
    prices_changed: false,
    issues: baselineMenu ? [] : [{ code: "NO_BASELINE_FOUND" }],
  };

  await resRef.set(
    {
      a3_3_extracted_at: FieldValue.serverTimestamp(),
      a3_3_version: "a3_3_diff_strict",
      a3_diff: diff,
    },
    { merge: true }
  );

  await runRef.set(
    {
      menu_diffed_at: FieldValue.serverTimestamp(),
      menu_changed: diff.meaningful_change,
      menu_change_type: diff.change_type,
      menu_change_added: diff.counts.added,
      menu_change_removed: diff.counts.removed,
      menu_change_modified: diff.counts.modified,
      baseline_run_id: baselineRunId || null,
    },
    { merge: true }
  );  

  console.log("A3.3 OK:", diff.counts);
}

main().catch((e) => {
  console.error("A3.3 FAILED:", e);
  process.exit(1);
});
