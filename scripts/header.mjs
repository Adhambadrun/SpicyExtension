// Generate the brand header wordmark, header.png, and the packaged copy the UI embeds.
//
// Why this file exists: docs/BRANDING.md has long recorded that the supplied SpicyExtension header
// artwork was only ever visible inline and its binary never reached the repository, so every surface
// fell back to interim HTML typography. This generates a real header image instead, composed from the
// same tokens and the same typographic construction the store promo tiles use, so header.png, the
// popup, the help page and the store art cannot drift into separate brand renderings.
//
// What it is NOT: it is not the supplied graphic and it does not replace it. The wordmark is set from
// `brand()` in scripts/store-assets.mjs — the same italic 900-weight two-tone lockup the promo tiles
// already use. Because that text is laid out with the machine's system font, regenerating on another
// host reproduces the geometry but not the bytes; the committed header.png is the shipped artwork, and
// `--check` verifies the packaged derivative against it rather than re-rendering. When the real
// header.png arrives, drop it in and run npm run header:gen to re-derive the packaged copy.
//
//   node scripts/header.mjs          # write header.png + extension/assets/header.png
//   node scripts/header.mjs --check  # verify the committed pair and their relationship
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { brand, tokens } from './store-assets.mjs';

const root = path.resolve(import.meta.dirname, '..');
const MASTER = path.join(root, 'header.png');
const PACKAGED = path.join(root, 'extension/assets/header.png');

/** Artboard for the master. 8:1 so the popup, help and panel headers all crop the same box. */
export const MASTER_WIDTH = 1200;
export const MASTER_HEIGHT = 150;
/** The packaged copy is a fixed scale of the committed master, never a re-render: 480x60 for a
 * 208x26 CSS box, so it stays crisp at 2x while keeping the shipped ZIP and the embedded panel data
 * URL small. Ratio stays exactly 8:1 to avoid any distortion. */
export const PACKAGED_SCALE = 0.4;

export async function renderMaster() {
  const c = await tokens();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" viewBox="0 0 ${MASTER_WIDTH} ${MASTER_HEIGHT}">
  ${brand({ x: MASTER_WIDTH / 2, y: 108, size: 96, c, width: MASTER_WIDTH - 40, anchor: 'middle' })}
</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

export async function derivePackaged(master) {
  return sharp(master)
    .resize(Math.round(MASTER_WIDTH * PACKAGED_SCALE), Math.round(MASTER_HEIGHT * PACKAGED_SCALE), { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
}

/**
 * Ink coverage and colour discipline. The header is the brand, so it may only ever be the red and the
 * off-white of the theme (plus their anti-aliased blend into a transparent canvas); a stray hue means
 * the tokens were bypassed. Blank or overfull means the type did not lay out.
 */
export async function auditHeader(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let inked = 0, offBrand = 0, reds = 0, lights = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3] ?? 0;
    if (alpha < 8) continue;
    inked += 1;
    const r = data[i] ?? 0, g = data[i + 1] ?? 0, b = data[i + 2] ?? 0;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (r - Math.max(g, b) > 30) reds += 1;
    else if (max - min < 30 && max > 90) lights += 1;
    else offBrand += 1;
  }
  const pixels = info.width * info.height;
  return {
    coverage: inked / pixels,
    redShare: inked ? reds / inked : 0,
    lightShare: inked ? lights / inked : 0,
    offBrandPixels: offBrand,
    width: info.width,
    height: info.height,
  };
}

async function generate({ check = false } = {}) {
  if (check) {
    let master;
    try { master = await readFile(MASTER); }
    catch { throw new Error('Missing header.png. Run npm run header:gen to render the brand header wordmark.'); }
    const meta = await sharp(master).metadata();
    if (meta.format !== 'png' || meta.width !== MASTER_WIDTH || meta.height !== MASTER_HEIGHT || !meta.hasAlpha) {
      throw new Error(`header.png must be a ${MASTER_WIDTH}x${MASTER_HEIGHT} PNG with a transparent background, got ${meta.width}x${meta.height} ${meta.format}${meta.hasAlpha ? '' : ' without alpha'}.`);
    }
    const art = await auditHeader(master);
    if (art.coverage < 0.05 || art.coverage > 0.7) throw new Error(`header.png ink coverage is ${(art.coverage * 100).toFixed(1)}% of the canvas; the wordmark should cover 5-70%. Re-run npm run header:gen and check the copy fits.`);
    if (art.offBrandPixels > 0) throw new Error(`header.png has ${art.offBrandPixels} pixels in colours outside the brand red and off-white. The header must be composed from the terminal.css tokens only.`);
    if (art.redShare < 0.25 || art.lightShare < 0.25) throw new Error(`header.png is not a two-tone lockup (red ${(art.redShare * 100).toFixed(0)}%, light ${(art.lightShare * 100).toFixed(0)}%). Both halves of the wordmark must be present.`);
    const packaged = await readFile(PACKAGED).catch(() => { throw new Error('Missing extension/assets/header.png. Run npm run header:gen to derive it from header.png.'); });
    if (!packaged.equals(await derivePackaged(master))) throw new Error('extension/assets/header.png is not the current half-scale of header.png. Run npm run header:gen.');
    for (const page of ['extension/pages/popup.html', 'extension/pages/help.html']) {
      const html = await readFile(path.join(root, page), 'utf8');
      if (!html.includes('assets/header.png')) throw new Error(`${page} must embed assets/header.png instead of the interim typographic wordmark.`);
    }
    const controller = await readFile(path.join(root, 'extension/src/content/capture-panel.ts'), 'utf8');
    if (!controller.includes("import brandHeader from '../../assets/header.png'")) throw new Error('The capture panel header must use the packaged header.png, embedded as a build-time data URL.');
    console.log(`header.png is current: ${(art.coverage * 100).toFixed(1)}% ink, red ${Math.round(art.redShare * 100)}% / light ${Math.round(art.lightShare * 100)}%, derivative matches.`);
    return;
  }

  const master = await renderMaster();
  await writeFile(MASTER, master);
  await writeFile(PACKAGED, await derivePackaged(master));
  const art = await auditHeader(master);
  console.log(`Rendered header.png at ${MASTER_WIDTH}x${MASTER_HEIGHT} (${(art.coverage * 100).toFixed(1)}% ink) and derived extension/assets/header.png.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Usage: node scripts/header.mjs [--check]');
  await generate({ check: args.includes('--check') });
}
