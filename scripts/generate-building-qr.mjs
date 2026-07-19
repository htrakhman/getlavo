/**
 * Generates print-ready QR code PNGs for every building in
 * data/gomes-buildings.json, pointing at the /b/{slug} landing page.
 *
 * Usage:
 *   node scripts/generate-building-qr.mjs
 *
 * Output: public/qr/{slug}.png — 2048×2048px, error-correction level H
 * (survives lobby-poster print sizes and moderate wear/branding overlays).
 */

import QRCode from 'qrcode';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://www.getlavo.io';

const { buildings } = JSON.parse(readFileSync(path.join(root, 'data', 'gomes-buildings.json'), 'utf8'));

const outDir = path.join(root, 'public', 'qr');
mkdirSync(outDir, { recursive: true });

for (const b of buildings) {
  const url = `${BASE_URL}/b/${b.slug}`;
  const file = path.join(outDir, `${b.slug}.png`);
  await QRCode.toFile(file, url, {
    width: 2048,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  });
  console.log(`✓ ${b.slug}.png → ${url}`);
}

console.log(`\n${buildings.length} QR codes written to public/qr/`);
