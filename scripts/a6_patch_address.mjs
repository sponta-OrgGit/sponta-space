import fs from "node:fs";

const [,, inPath, patchPath, outPath] = process.argv;
if (!inPath || !patchPath || !outPath) {
  console.error("Usage: node scripts/a6_patch_address.mjs <in.json> <patch.json> <out.json>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
const patchArr = JSON.parse(fs.readFileSync(patchPath, "utf8"));
const patch = new Map(patchArr.map(p => [String(p.osm_id), p.address]));

let updated = 0;
for (const v of data) {
  const key = String(v.osm_id);
  if (patch.has(key)) {
    v.address = patch.get(key);
    updated++;
  }
}

fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`[A6] patched address: ${updated}/${patchArr.length} -> ${outPath}`);
