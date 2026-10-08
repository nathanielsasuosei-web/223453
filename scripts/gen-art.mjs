/** Generates SVG cover artwork for the demo beats. */
import fs from "node:fs";
import path from "node:path";

const PALETTES = [
  { a: "#7c3aed", b: "#22d3ee", c: "#0b0b18", accent: "#f472b6" },
  { a: "#f59e0b", b: "#ef4444", c: "#12060a", accent: "#fde68a" },
  { a: "#10b981", b: "#3b82f6", c: "#04121a", accent: "#a7f3d0" },
  { a: "#ec4899", b: "#8b5cf6", c: "#14061a", accent: "#fbcfe8" },
  { a: "#0ea5e9", b: "#6366f1", c: "#050a1a", accent: "#bae6fd" },
  { a: "#f43f5e", b: "#f59e0b", c: "#1a0a05", accent: "#fecdd3" },
];

export function artworkSvg({ title, genre, bpm, musicalKey, index = 0 }) {
  const p = PALETTES[index % PALETTES.length];
  const id = index + 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.a}"/>
      <stop offset="0.55" stop-color="${p.c}"/>
      <stop offset="1" stop-color="${p.b}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.2" r="0.8">
      <stop offset="0" stop-color="${p.accent}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.78"/>
    </linearGradient>
  </defs>

  <rect width="1000" height="1000" fill="url(#bg)"/>
  <rect width="1000" height="1000" fill="url(#glow)"/>

  <g fill="none" stroke="${p.accent}" stroke-opacity="0.35" stroke-width="2">
    ${Array.from({ length: 7 }, (_, i) => `<circle cx="${170 + i * 95}" cy="${250 + (i % 3) * 130}" r="${120 + i * 26}"/>`).join("")}
  </g>

  <g opacity="0.9">
    ${Array.from({ length: 26 }, (_, i) => {
      const h = 40 + ((i * 137) % 300);
      return `<rect x="${60 + i * 34}" y="${880 - h}" width="14" height="${h}" rx="7" fill="${i % 3 === 0 ? p.accent : "#ffffff"}" fill-opacity="${i % 2 ? 0.25 : 0.55}"/>`;
    }).join("")}
  </g>

  <rect width="1000" height="1000" fill="url(#fade)"/>

  <g font-family="Segoe UI, Helvetica, Arial, sans-serif">
    <text x="60" y="120" font-size="26" font-weight="700" letter-spacing="10" fill="#ffffff" fill-opacity="0.85">BEATFORGE</text>
    <text x="60" y="160" font-size="18" font-weight="600" letter-spacing="4" fill="#ffffff" fill-opacity="0.55">VOL. ${id} - ${genre.toUpperCase()}</text>
    <text x="60" y="760" font-size="${title.length > 16 ? 74 : 92}" font-weight="800" fill="#ffffff">${escapeXml(title)}</text>
    <text x="60" y="820" font-size="30" font-weight="600" fill="#ffffff" fill-opacity="0.75">${bpm} BPM - ${escapeXml(musicalKey)}</text>
  </g>
</svg>`;
}

export function writeArtwork(dir, fileName, options) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, fileName);
  fs.writeFileSync(file, artworkSvg(options));
  return file;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
