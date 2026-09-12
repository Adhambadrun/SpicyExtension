// Generate the Chrome Web Store listing images from the repository's unmodified logo.png.
// The full artwork is preserved and never cropped, redrawn or recoloured. No AI artwork is used:
// typography is rendered from the same SpicyTerminal tokens the extension itself uses.
//
//   node scripts/store-assets.mjs          # write store/*.png + store/store-assets.json
//   node scripts/store-assets.mjs --check  # verify the committed files and their recorded bytes
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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

/** Images Chrome Web Store accepts today: 128px store icon and the 1280x800 banner. */
const SPECS = Object.freeze([
  { file: 'icon-128.png', width: 128, height: 128, kind: 'store-icon' },
  { file: 'marquee-1280x800.png', width: 1280, height: 800, kind: 'banner' },
]);

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
// ratio before rendering. Generation fails instead of letting text run off the banner.
const RIGHT_X = 548;
const RIGHT_WIDTH = 1280 - RIGHT_X - 60;

function fits(text, size, factor, width) {
  if (text.length * size * factor > width) throw new Error(`Store banner copy does not fit: "${text}" (${text.length} chars at ${size}px).`) ;
  return text;
}

function line({ x, y, text, size, color, mono = true, factor = 0.62, spacing = 0, width = RIGHT_WIDTH }) {
  const family = mono ? 'monospace' : "'Arial Black', 'Trebuchet MS', sans-serif";
  return `<text x="${x}" y="${y}" fill="${color}" font-family="${family}" font-size="${size}"${spacing ? ` letter-spacing="${spacing}"` : ''}>${escape(fits(text, size, factor, width))}</text>`;
}

function brand(c) {
  // One <text> with two <tspan>s keeps the two halves of the wordmark adjacent on any font.
  const [spicy, extension] = ['Spicy', 'Extension'];
  return `<text x="${RIGHT_X}" y="150" font-family="'Arial Black', 'Trebuchet MS', sans-serif" font-size="52" font-weight="900">${
    `<tspan fill="${c.red}">${escape(fits(spicy, 52, 0.9, 250))}</tspan><tspan fill="${c.text}">${escape(fits(extension, 52, 0.9, 430))}</tspan>`}</text>`;
}

function banner(c, version) {
  const lines = [
    brand(c),
    line({ x: RIGHT_X, y: 206, text: 'LOCAL CAPTURE · REVIEWED JSON EXPORT', size: 22, color: c.muted, spacing: 3, factor: 0.68 }),
    line({ x: RIGHT_X, y: 282, text: 'One result. Only what you choose.', size: 30, color: c.text }),
    line({ x: RIGHT_X, y: 336, text: 'Select one visible card from the page you are', size: 21, color: c.muted }),
    line({ x: RIGHT_X, y: 366, text: 'signed into, review and redact it, then export', size: 21, color: c.muted }),
    line({ x: RIGHT_X, y: 396, text: 'the JSON yourself.', size: 21, color: c.muted }),
    line({ x: RIGHT_X, y: 462, text: '+ no cookies, passwords or storage', size: 21, color: c.output }),
    line({ x: RIGHT_X, y: 492, text: '+ no background capture, no uploads', size: 21, color: c.output }),
    line({ x: RIGHT_X, y: 522, text: '+ review and confirm before exporting', size: 21, color: c.output }),
    line({ x: RIGHT_X, y: 600, text: 'Manifest V3 · read-only · one exact host permission', size: 19, color: c.muted }),
    line({ x: RIGHT_X, y: 630, text: `Not a flight-search engine. Version ${version}.`, size: 19, color: c.muted }),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="${c.bg}"/>
  <rect x="0" y="0" width="1280" height="8" fill="${c.red}"/>
  <rect x="48" y="56" width="1184" height="688" rx="6" fill="${c.surface}" stroke="${c.border}"/>
  <rect x="48" y="56" width="452" height="688" rx="6" fill="${c.raised}" stroke="${c.border}"/>
  ${line({ x: 96, y: 132, text: 'INPUT · ONE RESULT', size: 20, color: c.muted, spacing: 5, factor: 0.68, width: 356 })}
  ${lines.join('\n  ')}
</svg>`;
}

function iconCard(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="${c.bg}"/>
  <rect x="1" y="1" width="126" height="126" fill="none" stroke="${c.border}"/>
</svg>`;
}

async function generate({ check = false } = {}) {
  const logo = await readFile(LOGO);
  if ((await sharp(logo).metadata()).format !== 'png') throw new Error('The repository logo.png must be a PNG image.');
  const version = JSON.parse(await readFile(MANIFEST, 'utf8')).version;
  const c = await tokens();

  const icon = await sharp(Buffer.from(iconCard(c)))
    .composite([{ input: await sharp(logo).resize(112, 112, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).png().toBuffer(), gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();

  const marquee = await sharp(Buffer.from(banner(c, version)))
    .composite([{ input: await sharp(logo).resize(340, 340, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).png().toBuffer(), left: 104, top: 230 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();

  const produced = new Map([['icon-128.png', icon], ['marquee-1280x800.png', marquee]]);
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
    }
    console.log(`Store listing images match logo.png: ${SPECS.map((spec) => `${spec.file} ${spec.width}x${spec.height}`).join(', ')}.`);
    return;
  }

  await mkdir(storeDir, { recursive: true });
  for (const [file, data] of produced) await writeFile(path.join(storeDir, file), data);
  const files = Object.fromEntries(SPECS.map((spec) => {
    const data = produced.get(spec.file);
    if (!data) throw new Error(`Missing generated store asset ${spec.file}.`);
    return [spec.file, { kind: spec.kind, width: spec.width, height: spec.height, bytes: data.byteLength, sha256: sha256(data) }];
  }));
  await writeFile(path.join(storeDir, 'store-assets.json'), `${JSON.stringify({
    generatedFrom: { 'logo.png': sha256(logo), theme: 'extension/src/styles/terminal.css', version },
    note: 'Derived from the unmodified repository logo with the SpicyTerminal tokens. The wordmark is rendered typographically because the supplied header.png is still unavailable; regenerate with npm run store:gen on the pinned toolchain after changing logo.png or the extension version.',
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
