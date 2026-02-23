// scripts/a5_build_A_lunch_MVP.mjs
import fs from "fs";

const INPUT = "out/kallioMVP_restaurants_ranked_v1.json"; 
const OUTPUT = "out/kallioMVP_A-lunch_ranked_v1.json";

/**
 * Classify lunch source type based on URL
 */
function classifyLunchSource(url) {
  if (!url || typeof url !== "string") return "UNKNOWN";

  const u = url.toLowerCase();

  if (u.endsWith(".json") || u.includes("api") || u.includes("rss")) {
    return "MACHINE";
  }

  if (u.endsWith(".pdf")) {
    return "PDF";
  }

  if (u.includes("instagram") || u.includes("facebook")) {
    return "IMAGE";
  }

  if (
    u.includes("menu") ||
    u.includes("lounas") ||
    u.includes("lunch")
  ) {
    return "SPA";
  }

  return "UNKNOWN";
}

/**
 * Load data
 */
const raw = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

/**
 * Build A-group dataset
 */
const aGroup = raw
  .filter(v => v.saadaanko_lunch_info === true)
  .map(v => {
    const sourceType = classifyLunchSource(v.lunch_website);

    return {
      ...v,
      lunch_source_type: sourceType,
      machine_readable: sourceType === "MACHINE"
    };
  });

/**
 * Rank:
 * 1) MACHINE
 * 2) PDF
 * 3) SPA
 * 4) IMAGE
 * 5) UNKNOWN
 */
const rankOrder = {
  MACHINE: 1,
  PDF: 2,
  SPA: 3,
  IMAGE: 4,
  UNKNOWN: 5
};

aGroup.sort((a, b) => {
  return (
    (rankOrder[a.lunch_source_type] ?? 99) -
    (rankOrder[b.lunch_source_type] ?? 99)
  );
});

/**
 * Write output
 */
fs.writeFileSync(
  OUTPUT,
  JSON.stringify(aGroup, null, 2)
);

console.log(`✅ A-group MVP dataset created: ${OUTPUT}`);
console.log(`Total venues: ${aGroup.length}`);
console.log(
  `Machine-readable: ${aGroup.filter(v => v.machine_readable).length}`
);
