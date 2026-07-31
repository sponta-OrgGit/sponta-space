// Generates public/og-image.png (1200x630) for link previews.
// Uses locally installed system fonts (Poppins) as a stand-in to
// rasterize — the live site itself uses the real brand fonts
// (Bricolage Grotesque / Hanken Grotesk) via next/font. This is only
// the static preview image, so exact font fidelity isn't essential.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, "..", "public", "logo-transparent.png");
const outPath = path.join(__dirname, "..", "public", "og-image.png");

const logoBase64 = readFileSync(logoPath).toString("base64");

const W = 1200;
const H = 630;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="30%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#FF7A1A" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#FF7A1A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#060606" />
  <rect width="${W}" height="${H}" fill="url(#glow)" />
  <rect y="${H - 8}" width="${W}" height="8" fill="#FF7A1A" />
  <rect y="${H - 8}" width="${Math.round(W * 0.35)}" height="8" fill="#35DAD4" />

  <image x="80" y="64" width="240" height="120" href="data:image/png;base64,${logoBase64}" />

  <text x="82" y="240" font-family="Poppins" font-weight="700" font-size="18" letter-spacing="2.5" fill="#8A8A8A">SPONTA YRITYKSILLE</text>

  <text x="80" y="322" font-family="Poppins" font-weight="700" font-size="62" fill="#F5F5F5">Tuomme kaupungin</text>
  <text x="80" y="396" font-family="Poppins" font-weight="700" font-size="62" fill="#F5F5F5">jokaisen ulottuville.</text>

  <text x="80" y="462" font-family="Poppins" font-weight="400" font-size="28" fill="#A0A0A0">Ilmainen liittyä. Ei piilokuluja.</text>
</svg>
`;

await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log("wrote", outPath);
