// Generate the Chrome Web Store listing images from the repository's unmodified logo.png.
// The full artwork is preserved and never cropped, redrawn or recoloured. No AI artwork is used:
// typography is rendered from the same SpicyTerminal tokens the extension itself uses.
//
// Sizes are the ones the Dashboard actually accepts (see developer.chrome.com/docs/webstore/images):
//   * store icon        128x128   (required)
//   * small promo tile  440x280   (required)
//   * marquee promo     1400x560  (optional; needed to be eligible for marquee featuring)
// Screenshots are NOT drawn here — they are photographs of the built UI, see scripts/screenshots.mjs.
//
//   node scripts/store-assets.mjs          # write store/*.png + store/store-assets.json
//   node scripts/store-assets.mjs --check  # verify the committed files and their recorded bytes
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const storeDir = path.join(root, 'store');
const LOGO = path.join(root, 'logo.png');
const THEME = path.join(root, 'extension/src/styles/terminal.css');
const MANIFEST = path.join(root, 'extension/manifest.json');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

/** Exactly the image slots Chrome Web Store offers, at the sizes it requires. */
const SPECS = Object.freeze([
  { file: 'icon-128.png', width: 128, height: 128, kind: 'store-icon' },
  { file: 'promo-440x280.png', width: 440, height: 280, kind: 'small-promo-tile' },
  { file: 'marquee-1400x560.png', width: 1400, height: 560, kind: 'marquee-promo-tile' },
]);

/** Retired sizes that must not linger in store/ and get uploaded into the wrong slot. */
const RETIRED = Object.freeze(['marquee-1280x800.png']);

async function tokens() {
  const css = await readFile(THEME, 'utf8');
  const read = (name) => {
    const value = css.match(new RegExp(`--spicy-${name}:\\s*(#[a-f0-9]{6});`))?.[1];
    if (!value) throw new Error(`Missing SpicyTerminal token: --spicy-${name}`);
    return value;
  };
  return { bg: read('bg'), surface: read('surface'), raised: read('raised'), border: read('border'), text: read('text'), muted: read('muted'), output: read('output'), red: read('red') };
}

const escape = (value) => value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);

// Font metrics differ per machine, so copy is width-checked with a conservative advance
// ratio before rendering. Generation fails instead of letting text run off the canvas.
function fits(text, size, factor, width) {
  if (text.length * size * factor > width) throw new Error(`Store art copy does not fit: "${text}" (${text.length} chars at ${size}px in ${width}px).`);
  return text;
}

function line({ x, y, text, size, color, mono = true, factor = 0.62, spacing = 0, width, weight = 400, anchor = 'start' }) {
  const family = mono ? 'monospace' : "'Arial Black', 'Trebuchet MS', sans-serif";
  return `<text x="${x}" y="${y}" fill="${color}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ''}>${escape(fits(text, size, factor, width))}</text>`;
}

/** One <text> with two <tspan>s keeps the two halves of the wordmark adjacent on any font. */
function brand({ x, y, size, c, width, anchor = 'start' }) {
  fits('SpicyExtension', size, 0.62, width);
  return `<text x="${x}" y="${y}" font-family="'Arial Black', 'Trebuchet MS', sans-serif" font-size="${size}" font-weight="900" font-style="italic" text-anchor="${anchor}" letter-spacing="${-size / 23}">` +
    `<tspan fill="${c.red}">Spicy</tspan><tspan fill="${c.text}">Extension</tspan></text>`;
}

/**
 * Small promo tile (440x280). Chrome's guidance: communicate the brand, avoid text, fill the
 * region, and stay legible at half size. So this is logo + wordmark + one short line only.
 */
function smallTile(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c.surface}"/><stop offset="1" stop-color="${c.bg}"/>
  </linearGradient></defs>
  <rect width="440" height="280" fill="url(#bg)"/>
  <rect x="0" y="0" width="440" height="6" fill="${c.red}"/>
  ${brand({ x: 220, y: 216, size: 40, c, width: 400, anchor: 'middle' })}
  ${line({ x: 220, y: 243, text: 'LOCAL CAPTURE', size: 13, color: c.muted, spacing: 4, factor: 0.78, width: 300, anchor: 'middle' })}
  ${line({ x: 220, y: 268, text: 'One result. Only what you choose.', size: 14, color: c.output, factor: 0.63, width: 400, anchor: 'middle' })}
</svg>`;
}

/** Marquee promo tile (1400x560). Same rules: brand-forward, minimal copy, full bleed. */
function marquee(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c.surface}"/><stop offset="0.55" stop-color="${c.bg}"/><stop offset="1" stop-color="#0d0406"/>
  </linearGradient></defs>
  <rect width="1400" height="560" fill="url(#bg)"/>
  <rect x="0" y="0" width="1400" height="8" fill="${c.red}"/>
  <rect x="0" y="552" width="1400" height="8" fill="${c.red}"/>
  ${brand({ x: 560, y: 246, size: 86, c, width: 800 })}
  ${line({ x: 564, y: 300, text: 'LOCAL CAPTURE · REVIEWED JSON EXPORT', size: 26, color: c.muted, spacing: 5, factor: 0.72, width: 800 })}
  ${line({ x: 564, y: 372, text: 'One result. Only what you choose.', size: 38, color: c.text, factor: 0.62, width: 810 })}
  ${line({ x: 564, y: 424, text: 'No uploads · no storage · no background capture', size: 24, color: c.output, factor: 0.62, width: 800 })}
</svg>`;
}

/**
 * The 128px store icon is the untouched logo on a fully transparent 128x128 canvas.
 * Chrome's image guidelines ask for ~96x96 of artwork with the remaining pixels as transparent
 * padding, no added edge, and an image that reads on both light and dark store backgrounds.
 */
const ICON_CANVAS = 128;
const ICON_ARTWORK = 96;
function iconCanvas() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_CANVAS}" height="${ICON_CANVAS}" viewBox="0 0 ${ICON_CANVAS} ${ICON_CANVAS}"></svg>`;
}

async function logoLayer(logo, size) {
  return sharp(logo)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png().toBuffer();
}

const encode = (image) => image.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
/**
 * Promo tiles must be JPEG or 24-bit PNG: flatten away the alpha channel Chrome rejects.
 * sharp applies flatten before composite, so the composed image is re-opened and flattened.
 */
const encodeOpaque = async (image, background) => encode(sharp(await image.png().toBuffer()).flatten({ background }));

async function generate({ check = false } = {}) {
  const logo = await readFile(LOGO);
  if ((await sharp(logo).metadata()).format !== 'png') throw new Error('The repository logo.png must be a PNG image.');
  const version = JSON.parse(await readFile(MANIFEST, 'utf8')).version;
  const c = await tokens();

  const icon = await encode(sharp(Buffer.from(iconCanvas()))
    .composite([{ input: await logoLayer(logo, ICON_ARTWORK), gravity: 'center' }]));

  const small = await encodeOpaque(sharp(Buffer.from(smallTile(c)))
    .composite([{ input: await logoLayer(logo, 150), left: 145, top: 18 }]), c.bg);

  const wide = await encodeOpaque(sharp(Buffer.from(marquee(c)))
    .composite([{ input: await logoLayer(logo, 352), left: 128, top: 104 }]), c.bg);

  const produced = new Map([
    ['icon-128.png', icon],
    ['promo-440x280.png', small],
    ['marquee-1400x560.png', wide],
  ]);

  if (check) {
    let record;
    try { record = JSON.parse(await readFile(path.join(storeDir, 'store-assets.json'), 'utf8')); }
    catch { throw new Error('Missing store/store-assets.json. Run npm run store:gen to derive the listing images from logo.png.'); }
    if (record.generatedFrom?.['logo.png'] !== sha256(logo)) throw new Error('Stale store artwork: logo.png changed after the listing images were generated. Run npm run store:gen.');
    if (record.generatedFrom.version !== version) throw new Error(`Stale store artwork: generated for ${record.generatedFrom.version}, manifest is ${version}. Run npm run store:gen.`);
    for (const spec of SPECS) {
      let committed;
      try { committed = await readFile(path.join(storeDir, spec.file)); }
      catch { throw new Error(`Missing store/${spec.file}. Run npm run store:gen to derive it from logo.png.`); }
      const listed = record.files[spec.file];
      if (!listed || listed.sha256 !== sha256(committed)) throw new Error(`store/${spec.file} does not match store/store-assets.json. Regenerate and review it before publishing.`);
      const meta = await sharp(committed).metadata();
      if (meta.format !== 'png' || meta.width !== spec.width || meta.height !== spec.height) {
        throw new Error(`store/${spec.file} must be a ${spec.width}x${spec.height} PNG for Chrome Web Store, got ${meta.width}x${meta.height} ${meta.format}.`);
      }
      // Promo tiles are uploaded as JPEG or 24-bit PNG; an alpha channel gets the image rejected.
      if (spec.kind !== 'store-icon' && meta.hasAlpha) throw new Error(`store/${spec.file} must be a 24-bit PNG without an alpha channel.`);
      // The store icon is the opposite: it needs transparent padding around ~96x96 of artwork.
      if (spec.kind === 'store-icon' && !meta.hasAlpha) throw new Error('store/icon-128.png must keep its transparent padding.');
    }
    console.log(`Store listing images match logo.png: ${SPECS.map((spec) => `${spec.file} ${spec.width}x${spec.height}`).join(', ')}.`);
    return;
  }

  await mkdir(storeDir, { recursive: true });
  for (const [file, data] of produced) await writeFile(path.join(storeDir, file), data);
  // A wrong-sized leftover in store/ is an upload hazard; remove retired names on regeneration.
  for (const stale of RETIRED) await rm(path.join(storeDir, stale), { force: true });

  const files = Object.fromEntries(SPECS.map((spec) => {
    const data = produced.get(spec.file);
    if (!data) throw new Error(`Missing generated store asset ${spec.file}.`);
    return [spec.file, { kind: spec.kind, width: spec.width, height: spec.height, bytes: data.byteLength, sha256: sha256(data) }];
  }));
  await writeFile(path.join(storeDir, 'store-assets.json'), `${JSON.stringify({
    generatedFrom: { 'logo.png': sha256(logo), theme: 'extension/src/styles/terminal.css', version },
    note: 'Derived from the unmodified repository logo with the SpicyTerminal tokens. The wordmark is rendered typographically because the supplied header.png is still unavailable; regenerate with npm run store:gen on the pinned toolchain after changing logo.png or the extension version. Screenshots are not drawn here: see scripts/screenshots.mjs, which photographs the built extension UI.',
    files,
  }, null, 2)}\n`);
  console.log(`Generated ${SPECS.length} store listing images from the repository logo.png.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Usage: node scripts/store-assets.mjs [--check]');
  await generate({ check: args.includes('--check') });
}

export { generate, SPECS };
