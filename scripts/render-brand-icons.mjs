import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");

function mark(size, pad = 0) {
  const inner = size - pad * 2;
  const scale = inner / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0A6B74"/>
    <g transform="translate(${pad} ${pad}) scale(${scale})">
      <circle cx="32" cy="33" r="18" fill="none" stroke="#E7F4F5" stroke-width="2.5"/>
      <path d="M32 16.5c7.2 8.4 11 13.2 11 18.6a11 11 0 1 1-22 0c0-5.4 3.8-10.2 11-18.6z" fill="#E7F4F5"/>
      <circle cx="32" cy="36.2" r="3.4" fill="#C4892A"/>
    </g>
  </svg>`;
}

async function png(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(file);
}

const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1290" height="2796" viewBox="0 0 1290 2796">
  <rect width="1290" height="2796" fill="#F3F7F7"/>
  <g transform="translate(521 1238)">
    ${mark(248, 0).replace(/^<svg[^>]*>/, "").replace("</svg>", "")}
  </g>
  <text x="645" y="1580" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#1C2A2E">Meter<tspan fill="#085860">Vault</tspan></text>
</svg>`;

await mkdir(path.join(root, "public", "icons"), { recursive: true });
await mkdir(path.join(root, "public", "brand"), { recursive: true });

await png(mark(512, 0), path.join(root, "public", "brand", "mark.png"));
await png(mark(32, 0), path.join(root, "public", "icons", "favicon-32.png"));
await png(mark(180, 0), path.join(root, "public", "icons", "apple-touch-icon.png"));
await png(mark(192, 28), path.join(root, "public", "icons", "icon-192.png"));
await png(mark(512, 76), path.join(root, "public", "icons", "icon-512.png"));
await png(mark(192, 0), path.join(root, "public", "icons", "icon-192-any.png"));
await png(mark(512, 0), path.join(root, "public", "icons", "icon-512-any.png"));
await png(mark(512, 0), path.join(root, "src", "app", "icon.png"));
await png(mark(180, 0), path.join(root, "src", "app", "apple-icon.png"));
await png(splash, path.join(root, "public", "splash.png"));
