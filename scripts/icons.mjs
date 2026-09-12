// Derive every shipped brand icon from the repository's unmodified logo.png.
// Preserve the full artwork/aspect ratio; do not crop, redraw or recolour it.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const assets = path.join(root, 'extension/assets');
const sizes = [16, 32, 48, 128];

export async function generateIcons({ check = false } = {}) {
  const source = await readFile(path.join(root, 'logo.png'));
  if ((await sharp(source).metadata()).format !== 'png') throw new Error('The repository logo.png must be a PNG image.');
  if (!check) await mkdir(assets, { recursive: true });
  for (const size of sizes) {
    const icon = await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toBuffer();
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
  console.log(check ? 'All four icons match the repository logo.png.' : 'Generated 16/32/48/128px icons from the repository logo.png.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Usage: node scripts/icons.mjs [--check]');
  await generateIcons({ check: args.includes('--check') });
}
