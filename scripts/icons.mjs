// Derive every shipped brand icon from the repository's unmodified logo.png.
// The 128px master is a plain contain-resize: the complete artwork, aspect ratio and colour.
// 16, 32 and 48 are the sizes Chrome actually paints — toolbar, puzzle menu, extension manager — and
// a full master squeezed into 16px turns the corner signature into a grey smudge sitting on top of
// the mark. Those three therefore get exactly one geometric simplification: the signature is filled
// with the tile colour immediately beside it, then the artwork is supersampled and unsharpened so
// the mark keeps hard edges. Nothing is cropped, recoloured or redrawn; the red mark is never
// touched, and the guard below refuses to run if that ever stops being true.
//
//   node scripts/icons.mjs          # write extension/assets/icon-{16,32,48,128}.png
//   node scripts/icons.mjs --check  # verify the committed files reproduce from logo.png
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const assets = path.join(root, 'extension/assets');
export const sizes = [16, 32, 48, 128];

/** Sizes small enough that the corner signature reads as noise rather than ink. */
export const SIMPLIFIED_SIZES = [16, 32, 48];

/**
 * Regions as fractions of the master, measured from logo.png (1254x1254) so the mask is
 * resolution-free: the tight box of low-saturation bright ink in the lower-right corner, and the
 * clean strip of the same tile just below it, clear of the red mark.
 */
export const SIGNATURE_REGION = Object.freeze({ left: 0.6683, top: 0.7703, width: 0.2097, height: 0.1069 });
export const SAMPLE_REGION = Object.freeze({ left: 0.65, top: 0.905, width: 0.248, height: 0.02 });
const SUPERSAMPLE = 4;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const ENCODE = { compressionLevel: 9, adaptiveFiltering: true, palette: false };

export function regionRect(region, size, pad = 0) {
  const left = Math.max(0, Math.round(region.left * size) - pad);
  const top = Math.max(0, Math.round(region.top * size) - pad);
  const right = Math.min(size, Math.round((region.left + region.width) * size) + pad);
  const bottom = Math.min(size, Math.round((region.top + region.height) * size) + pad);
  return { left, top, width: right - left, height: bottom - top };
}

const lum = (channel) => (channel /= 255, channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const relLuminance = ([r, g, b]) => 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);

/** Grey ink fraction, red-mark ink count and luminance of a region, used to guard the mask. */
export async function regionStats(source, region) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rect = regionRect(region, info.width);
  let pixels = 0, grey = 0, red = 0, sum = 0;
  const rgb = [0, 0, 0];
  for (let y = rect.top; y < rect.top + rect.height; y += 1) {
    for (let x = rect.left; x < rect.left + rect.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      const pixel = [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
      const max = Math.max(...pixel), min = Math.min(...pixel);
      if (max > 70 && (max === 0 ? 0 : (max - min) / max) < 0.4) grey += 1;
      if (pixel[0] > 120 && pixel[0] - Math.max(pixel[1], pixel[2]) > 60) red += 1;
      sum += relLuminance(pixel);
      rgb[0] += pixel[0]; rgb[1] += pixel[1]; rgb[2] += pixel[2];
      pixels += 1;
    }
  }
  return {
    greyFraction: pixels ? grey / pixels : 0,
    redPixels: red,
    meanLuminance: pixels ? sum / pixels : 0,
    meanRgb: rgb.map((value) => Math.round(value / (pixels || 1))),
  };
}

/**
 * The mask only ever covers the corner signature. These limits encode what was measured on the
 * committed master: bright low-saturation ink inside the box, no brand mark in it, and a fill patch
 * that is plain tile. A substituted logo.png trips them instead of being silently mis-masked.
 */
export async function verifyIconSource(source) {
  const signature = await regionStats(source, SIGNATURE_REGION);
  const sample = await regionStats(source, SAMPLE_REGION);
  if (signature.redPixels > 0) throw new Error(`The small-icon mask overlaps the red brand mark (${signature.redPixels} red pixels). Refusing to paint over it — re-measure SIGNATURE_REGION in scripts/icons.mjs.`);
  if (signature.greyFraction < 0.03) throw new Error(`Corner signature not found where the small-icon mask expects it (grey ink ${(signature.greyFraction * 100).toFixed(1)}% < 3%). Re-measure SIGNATURE_REGION in scripts/icons.mjs before deriving icons.`);
  if (sample.meanLuminance > 0.02) throw new Error(`The tile patch used to fill the signature is not plain tile (mean luminance ${sample.meanLuminance.toFixed(4)}). Re-measure SAMPLE_REGION in scripts/icons.mjs.`);
  return { signature, sample };
}

/**
 * Paint out the signature's ink, at the working resolution. Only pixels bright enough to be the
 * strokes are replaced — with the mean colour of the plain tile beside them — so the tile's own
 * gradient stays intact and no filled rectangle is left behind.
 */
async function eraseSignature(work, workSize) {
  const box = regionRect(SIGNATURE_REGION, workSize, Math.max(2, Math.round(workSize * 0.012)));
  const { meanRgb: background } = await regionStats(work, SAMPLE_REGION);
  const cutoff = Math.max(18, Math.round(Math.max(...background) * 3));
  const raw = await sharp(work).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  for (let y = box.top; y < box.top + box.height; y += 1) {
    for (let x = box.left; x < box.left + box.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      if (Math.max(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0) > cutoff) {
        data[i] = background[0] ?? 0;
        data[i + 1] = background[1] ?? 0;
        data[i + 2] = background[2] ?? 0;
      }
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

/** One committed icon, from the master. Exported so the tests can pin the same derivation. */
export async function deriveIcon(source, size) {
  const plain = sharp(source).resize(size, size, { fit: 'contain', background: TRANSPARENT, kernel: 'lanczos3' });
  if (!SIMPLIFIED_SIZES.includes(size)) return plain.png(ENCODE).toBuffer();
  const workSize = size * SUPERSAMPLE;
  const work = await sharp(source)
    .resize(workSize, workSize, { fit: 'contain', background: TRANSPARENT, kernel: 'lanczos3' })
    .png().toBuffer();
  const patched = await eraseSignature(work, workSize);
  return sharp(patched)
    .resize(size, size, { fit: 'contain', background: TRANSPARENT, kernel: 'lanczos3' })
    .sharpen({ sigma: size <= 16 ? 0.7 : 0.45 })
    .png(ENCODE).toBuffer();
}

export async function generateIcons({ check = false } = {}) {
  const source = await readFile(path.join(root, 'logo.png'));
  if ((await sharp(source).metadata()).format !== 'png') throw new Error('The repository logo.png must be a PNG image.');
  await verifyIconSource(source);
  if (!check) await mkdir(assets, { recursive: true });
  for (const size of sizes) {
    const icon = await deriveIcon(source, size);
    const filename = path.join(assets, `icon-${size}.png`);
    if (check) {
      let committed;
      try { committed = await readFile(filename); }
      catch { throw new Error(`Missing icon-${size}.png. Run npm run icons to derive it from logo.png.`); }
      if (!committed.equals(icon)) throw new Error(`Stale icon-${size}.png. Run npm run icons to derive it from logo.png.`);
    } else {
      await writeFile(filename, icon);
    }
  }
  const note = `16/32/48 drop the corner signature; 128 keeps the complete artwork.`;
  console.log(`${check ? 'All four icons match the repository logo.png' : 'Generated 16/32/48/128px icons from the repository logo.png'} — ${note}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Usage: node scripts/icons.mjs [--check]');
  await generateIcons({ check: args.includes('--check') });
}
