import sharp from 'sharp';
import { readFile, stat } from 'node:fs/promises';

const W = 1200;
const H = 630;
const OUT = 'public/og-image.jpg';

const LOGO_PATH = 'public/logo.webp';

const logoBuf = await sharp(LOGO_PATH).resize({ height: 180, fit: 'inside' }).png().toBuffer();
const logoMeta = await sharp(logoBuf).metadata();

const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbf8f2"/>
      <stop offset="55%" stop-color="#f7f2e8"/>
      <stop offset="100%" stop-color="#efe7d4"/>
    </linearGradient>
    <radialGradient id="glow" cx="82%" cy="30%" r="45%">
      <stop offset="0%" stop-color="#c9a86a" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#c9a86a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="brand" cx="8%" cy="110%" r="55%">
      <stop offset="0%" stop-color="#7a0a0c" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#7a0a0c" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#brand)"/>

  <!-- decorative egg silhouette on right -->
  <ellipse cx="${W - 200}" cy="${H / 2 + 10}" rx="165" ry="210" fill="#ffffff" opacity="0.92"/>
  <ellipse cx="${W - 225}" cy="${H / 2 - 40}" rx="55" ry="75" fill="#ffffff" opacity="0.55"/>

  <!-- ring of text around egg -->
  <g transform="translate(${W - 200}, ${H / 2 + 10})" opacity="0.55">
    <defs>
      <path id="ogRing" d="M 0,0 m -245,0 a 245,245 0 1,1 490,0 a 245,245 0 1,1 -490,0"/>
    </defs>
    <text font-family="Inter, sans-serif" font-size="15" letter-spacing="8" fill="#b08a4a">
      <textPath href="#ogRing">PREMIUM · С 1966 ГОДА · КЫРГЫЗСТАН · AK-KUU · ПРЕМИУМ-ЯЙЦА ·</textPath>
    </text>
  </g>

  <!-- top eyebrow -->
  <g transform="translate(72, 96)">
    <rect x="0" y="10" width="38" height="2" fill="#7a0a0c"/>
    <text x="54" y="18" font-family="Inter, sans-serif" font-size="15" font-weight="500" fill="#7a0a0c" letter-spacing="4">С 1966 ГОДА · КЫРГЫЗСТАН</text>
  </g>

  <!-- main title -->
  <g transform="translate(72, 170)" font-family="Georgia, 'Times New Roman', serif" fill="#1c1a17">
    <text font-size="76" font-weight="500" letter-spacing="-1">Свежие яйца,</text>
    <text y="86" font-size="76" font-weight="500" letter-spacing="-1">которым доверяет</text>
    <text y="172" font-size="76" font-weight="500" letter-spacing="-1" fill="#7a0a0c">вся страна.</text>
  </g>

  <!-- subline -->
  <g transform="translate(72, 470)">
    <text font-family="Inter, sans-serif" font-size="22" fill="#6b625a">200 000+ яиц ежедневно  ·  ISO 22000 · HACCP</text>
  </g>

  <!-- bottom strip -->
  <g transform="translate(72, ${H - 72})">
    <text font-family="Inter, sans-serif" font-size="17" font-weight="600" fill="#1c1a17" letter-spacing="4">ОАО «АК-КУУ»</text>
    <text x="760" font-family="Inter, sans-serif" font-size="17" fill="#6b625a" letter-spacing="2">akkuu.kg</text>
  </g>

  <!-- thin gold rule at bottom -->
  <rect x="72" y="${H - 42}" width="${W - 144}" height="1" fill="#b08a4a" opacity="0.5"/>
</svg>`);

await sharp(svg)
  .composite([
    {
      input: logoBuf,
      top: 80,
      left: W - logoMeta.width - 90,
    },
  ])
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(OUT);

const s = await stat(OUT);
console.log(`${OUT}: ${W}×${H}, ${(s.size / 1024).toFixed(1)} KB`);
