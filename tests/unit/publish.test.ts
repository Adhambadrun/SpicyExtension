// @vitest-environment node
// The committed publish inputs are what a human uploads to Chrome. These tests fail if release/ or
// store/ drifts from the source, so a published package can never be someone's stale local build.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { zipData, zipEntries } from '../../scripts/bytes.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const read = (relative: string): Buffer => fs.readFileSync(path.join(root, relative));
const sha256 = (data: Buffer): string => crypto.createHash('sha256').update(data).digest('hex');

const manifest = JSON.parse(read('extension/manifest.json').toString('utf8')) as {
  name: string; version: string; description: string; manifest_version: number;
};
// scripts/build.mjs flattens extension/pages to the archive root, which is what the manifest references.
const RUNTIME = ['assets/icon-16.png', 'assets/icon-32.png', 'assets/icon-48.png', 'assets/icon-128.png',
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
    expect(Object.keys(record.files).sort()).toEqual(['icon-128.png', 'marquee-1280x800.png']);
  });

  it.each([['icon-128.png', 128, 128], ['marquee-1280x800.png', 1280, 800]] as const)(
    '%s is the exact PNG size Chrome Web Store accepts', async (file, width, height) => {
      const data = read(`store/${file}`);
      expect(sha256(data)).toBe(record.files[file]?.sha256);
      expect(data.byteLength).toBe(record.files[file]?.bytes);
      expect(await sharp(data).metadata()).toMatchObject({ format: 'png', width, height });
    });

  it('are committed to the repository instead of being left in a local build directory', () => {
    for (const file of Object.keys(record.files)) expect(fs.existsSync(path.join(root, 'store', file))).toBe(true);
    expect(fs.existsSync(path.join(root, 'artifacts', 'never-committed.marker'))).toBe(false);
    expect(fs.readFileSync(path.join(root, '.gitignore'), 'utf8')).toMatch(/^artifacts\/$/m);
  });
});
