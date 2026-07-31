// Generates public/og-image.png (1200x630) for link previews.
// Uses locally installed system fonts (Poppins, DejaVu Sans Mono) to
// rasterize — the live site itself uses the real brand fonts via
// next/font, this is only the static preview image.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, "..", "public", "logo.png");
const outPath = path.join(__dirname, "..", "public", "og-image.png");

const logoBase64 = readFileSync(logoPath).toString("base64");

const W = 1200;
const H = 630;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#14161c" />
  <rect y="${H - 8}" width="${W}" height="8" fill="#ffb238" />
  <rect y="${H - 8}" width="${Math.round(W * 0.35)}" height="8" fill="#2fbfa6" />

  <image x="80" y="64" width="280" height="140" href="data:image/png;base64,${logoBase64}" />

  <text x="82" y="248" font-family="DejaVu Sans Mono" font-size="20" letter-spacing="3" fill="#ffb238">[ SPONTA YRITYKSILLE ]</text>

  <text x="80" y="330" font-family="Poppins" font-weight="700" font-size="64" fill="#f4f1e9">Tuomme kaupungin</text>
  <text x="80" y="404" font-family="Poppins" font-weight="700" font-size="64" fill="#f4f1e9">jokaisen ulottuville.</text>

  <text x="80" y="470" font-family="Poppins" font-weight="400" font-size="30" fill="#8b90a0">Näy oikeaan hetkeen Kalliossa.</text>
</svg>
`;

await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log("wrote", outPath);
