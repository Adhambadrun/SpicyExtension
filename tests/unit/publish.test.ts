// @vitest-environment node
// The committed publish inputs are what a human uploads to Chrome. These tests fail if release/ or
// store/ drifts from the source, so a published package can never be someone's stale local build.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { zipData, zipEntries } from '../../scripts/bytes.mjs';
import { auditStoreIconGeometry, ICON_GLOW_CEILING as GLOW_CEILING } from '../../scripts/store-assets.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const read = (relative: string): Buffer => fs.readFileSync(path.join(root, relative));
const sha256 = (data: Buffer): string => crypto.createHash('sha256').update(data).digest('hex');
const channelOf = (value: number): number => (value / 255 <= 0.03928 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4);

const manifest = JSON.parse(read('extension/manifest.json').toString('utf8')) as {
  name: string; version: string; description: string; manifest_version: number;
};
// scripts/build.mjs flattens extension/pages to the archive root, which is what the manifest references.
const RUNTIME = ['assets/header.png', 'assets/icon-16.png', 'assets/icon-32.png', 'assets/icon-48.png', 'assets/icon-128.png',
  'background.js', 'content.js', 'help.html', 'manifest.json', 'pages.css', 'popup.html',
  'popup.js', 'terminal.css'].sort((a, b) => a.localeCompare(b, 'en'));

const filename = `spicyextension-${manifest.version}.zip`;
const zip = read(`release/${filename}`);
const entries = zipEntries(zip);

describe('committed Chrome Web Store package', () => {
  it('is the versioned ZIP named after the extension', () => {
    expect(path.basename(`release/${filename}`)).toBe('spicyextension-1.0.0.zip');
    expect(fs.existsSync(path.join(root, 'release', 'checksums.txt'))).toBe(true);
  });

  it('contains exactly the MV3 runtime files and nothing else', () => {
    expect(entries.map((entry: { name: string }) => entry.name).sort((a: string, b: string) => a.localeCompare(b, 'en'))).toEqual(RUNTIME);
    expect(entries.some((entry: { name: string }) => entry.name === 'manifest.json')).toBe(true);
    expect(entries.filter((entry: { name: string }) => /(?:\.ts|\.map|test|fixture|node_modules|\.env)/.test(entry.name))).toEqual([]);
  });

  it('matches release/checksums.txt', () => {
    const [recorded, named] = fs.readFileSync(path.join(root, 'release', 'checksums.txt'), 'utf8').trim().split(/\s+/);
    expect(named).toBe(filename);
    expect(recorded).toBe(sha256(zip));
  });

  it('ships the repository manifest unchanged, with a legal Chrome Web Store name and summary', () => {
    const entry = entries.find((item: { name: string }) => item.name === 'manifest.json');
    if (!entry) throw new Error('The package must contain manifest.json at its root.');
    expect(Buffer.from(zipData(zip, entry)).equals(read('extension/manifest.json'))).toBe(true);
    const packaged = JSON.parse(Buffer.from(zipData(zip, entry)).toString('utf8')) as typeof manifest;
    expect(packaged.name).toBe('SpicyExtension');
    expect(packaged.manifest_version).toBe(3);
    expect(packaged.description.length).toBeGreaterThan(32);
    expect(packaged.description.length).toBeLessThanOrEqual(132);
  });

  it('does not duplicate a second upload package in release/', () => {
    const zips = fs.readdirSync(path.join(root, 'release')).filter((name) => name.endsWith('.zip'));
    expect(zips).toEqual([filename]);
  });
});

describe('derived store listing images', () => {
  const record = JSON.parse(read('store/store-assets.json').toString('utf8')) as {
    generatedFrom: Record<string, string>;
    files: Record<string, { kind: string; width: number; height: number; bytes: number; sha256: string }>;
  };

  it('are recorded for the current logo and extension version', () => {
    expect(record.generatedFrom['logo.png']).toBe(sha256(read('logo.png')));
    expect(record.generatedFrom.version).toBe(manifest.version);
    expect(Object.keys(record.files).sort()).toEqual(['icon-128.png', 'marquee-1400x560.png', 'promo-440x280.png']);
  });

  // These are the sizes the Dashboard actually accepts. A 1280x800 "marquee" is not one of them.
  it.each([['icon-128.png', 128, 128], ['promo-440x280.png', 440, 280], ['marquee-1400x560.png', 1400, 560]] as const)(
    '%s is the exact PNG size Chrome Web Store accepts', async (file, width, height) => {
      const data = read(`store/${file}`);
      expect(sha256(data)).toBe(record.files[file]?.sha256);
      expect(data.byteLength).toBe(record.files[file]?.bytes);
      expect(await sharp(data).metadata()).toMatchObject({ format: 'png', width, height });
    });

  it.each(['promo-440x280.png', 'marquee-1400x560.png'] as const)(
    '%s has no alpha channel, which the promo tile slots reject', async (file) => {
      expect((await sharp(read(`store/${file}`)).metadata()).hasAlpha).toBe(false);
    });

  // Chrome's image guidelines for the store icon: https://developer.chrome.com/docs/webstore/images#icons
  // 96x96 of artwork for a square icon, 16px of transparent padding per side, no edge drawn on the
  // 128x128 canvas, and an image that reads on both light and dark backgrounds.
  it('lays the icon out as Chrome specifies: 96x96 artwork inside transparent padding', async () => {
    const geometry = await auditStoreIconGeometry(read('store/icon-128.png'));
    expect(geometry.opaqueBox).toEqual({ x: 16, y: 16, width: 96, height: 96 });
    // "Don't put an edge around the 128x128 image; the UI might add edges."
    expect(geometry.ringMaxAlpha).toBe(0);
    // "If your icon is mostly dark, consider adding a subtle white outer glow": the brand tile is
    // near-black, so it needs the glow to keep a silhouette on a dark store theme — and the glow has
    // to stay subtle so it never reads as a cast drop shadow or an added edge.
    expect(geometry.paddingMaxAlpha).toBeGreaterThan(0);
    expect(geometry.paddingMaxAlpha).toBeLessThanOrEqual(GLOW_CEILING);
  });

  it('reads on a dark background as well as it does on a light one', async () => {
    const icon = read('store/icon-128.png');
    const luminance = async (background: string): Promise<number> => {
      const { data, info } = await sharp(icon).flatten({ background }).raw().toBuffer({ resolveWithObject: true });
      const at = (x: number, y: number): number => {
        const i = (y * info.width + x) * info.channels;
        const byte = (o: number): number => data[i + o] ?? 0;
        return 0.2126 * channelOf(byte(0)) + 0.7152 * channelOf(byte(1)) + 0.0722 * channelOf(byte(2));
      };
      // Padding four pixels outside the tile: the only place the silhouette can be seen from.
      return at(12, 64);
    };
    const dark = await luminance('#202124');
    const background = 0.2126 * channelOf(0x20) + 0.7152 * channelOf(0x21) + 0.0722 * channelOf(0x24);
    // The glow must lift the halo off a dark theme, yet stay invisible on a light one.
    expect(dark).toBeGreaterThan(background * 1.08);
    const onWhite = await luminance('#ffffff');
    expect(onWhite).toBeGreaterThanOrEqual(0.999);
  });

  it('measures the violations store:check rejects, rather than assuming good artwork', async () => {
    const canvas = (size: number, input: Buffer): Promise<Buffer> => sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite([{ input, gravity: 'center' }]).png().toBuffer();

    // Artwork scaled to fill the canvas: no transparent padding, and the tile draws its own edge.
    const fullBleed = await canvas(128, await sharp(read('logo.png')).resize(128, 128).png().toBuffer());
    const fullBleedGeometry = await auditStoreIconGeometry(fullBleed);
    expect(fullBleedGeometry.opaqueBox).toEqual({ x: 0, y: 0, width: 128, height: 128 });
    expect(fullBleedGeometry.ringMaxAlpha).toBe(255);

    // The pre-glow icon: correct 96x96 padding, but a near-black tile with no silhouette on dark.
    const noGlow = await canvas(128, await sharp(read('logo.png')).resize(96, 96).png().toBuffer());
    expect((await auditStoreIconGeometry(noGlow)).paddingMaxAlpha).toBe(0);

    // An opaque white frame hugging the tile: padding is present but an edge was drawn on it.
    const loud = await canvas(128, await sharp({
      create: { width: 120, height: 120, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    }).png().toBuffer());
    expect((await auditStoreIconGeometry(loud)).ringMaxAlpha).toBe(0);
    expect((await auditStoreIconGeometry(loud)).paddingMaxAlpha).toBeGreaterThan(GLOW_CEILING);
  });

  it('does not keep a retired, wrong-sized tile that could be uploaded by mistake', () => {
    expect(fs.existsSync(path.join(root, 'store', 'marquee-1280x800.png'))).toBe(false);
  });

  it('are committed to the repository instead of being left in a local build directory', () => {
    for (const file of Object.keys(record.files)) expect(fs.existsSync(path.join(root, 'store', file))).toBe(true);
    expect(fs.existsSync(path.join(root, 'artifacts', 'never-committed.marker'))).toBe(false);
    expect(fs.readFileSync(path.join(root, '.gitignore'), 'utf8')).toMatch(/^artifacts\/$/m);
  });
});


describe('store screenshots taken from the built extension', () => {
  const record = JSON.parse(read('store/screenshots/screenshots.json').toString('utf8')) as {
    generatedFrom: { version: string; bundle: string; pages: string[]; fixture: string };
    files: Record<string, { source: string; width: number; height: number; bytes: number; sha256: string }>;
  };
  const files = Object.keys(record.files).sort((a, b) => a.localeCompare(b, 'en'));

  it('provides between one and five screenshots for the current version', () => {
    expect(record.generatedFrom.version).toBe(manifest.version);
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files.length).toBeLessThanOrEqual(5); // the Dashboard accepts at most 5
  });

  it('records that they came from the built bundle and the synthetic fixture, not from artwork', () => {
    expect(record.generatedFrom.bundle).toBe('dist/spicyextension/content.js');
    expect(record.generatedFrom.fixture).toBe('tests/fixtures/result-page.html');
    expect(record.generatedFrom.pages).toContain('dist/spicyextension/popup.html');
  });

  it.each(files)('%s is a committed 1280x800 PNG with no alpha and matching bytes', async (file) => {
    const data = read(`store/screenshots/${file}`);
    expect(sha256(data)).toBe(record.files[file]?.sha256);
    expect(data.byteLength).toBe(record.files[file]?.bytes);
    const meta = await sharp(data).metadata();
    expect(meta).toMatchObject({ format: 'png', width: 1280, height: 800 });
    expect(meta.hasAlpha).toBe(false);
  });
});
