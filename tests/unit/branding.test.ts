// @vitest-environment node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { deriveIcon, regionStats, verifyIconSource, SIGNATURE_REGION, SAMPLE_REGION } from '../../scripts/icons.mjs';
import { auditHeader, derivePackaged, MASTER_HEIGHT, MASTER_WIDTH } from '../../scripts/header.mjs';

const sizes = [16, 32, 48, 128];
const source = fs.readFileSync('logo.png');
const hash = (data: Buffer): string => crypto.createHash('sha256').update(data).digest('hex');
const ENCODE = { compressionLevel: 9 as const, adaptiveFiltering: true, palette: false };

describe('repository logo branding', () => {
  it('preserves the supplied logo.png byte-for-byte', () => {
    expect(hash(source)).toBe('2056971c95da6f04ddf546c8409100604302c3deb5e47a7b29418ed220d44dc9');
  });

  // Small icons may only differ from the master by the corner signature: measured, not assumed.
  it.each([16, 32, 48])('derives the %ipx icon with the signature resolved into plain tile', async (size) => {
    const icon = fs.readFileSync(`extension/assets/icon-${size}.png`);
    expect(icon.equals(await deriveIcon(source, size))).toBe(true);
    expect(await sharp(icon).metadata()).toMatchObject({ format: 'png', width: size, height: size });

    const naive = await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .png(ENCODE).toBuffer();
    const [before, after, tile] = await Promise.all([
      regionStats(naive, SIGNATURE_REGION),
      regionStats(icon, SIGNATURE_REGION),
      regionStats(icon, SAMPLE_REGION),
    ]);
    // The naive downscale leaves a bright smudge; the derived icon must sit within 2x of the plain
    // tile beside it, and the mask must never touch the red mark.
    expect(before.meanLuminance).toBeGreaterThan(tile.meanLuminance * 8);
    expect(after.meanLuminance).toBeLessThanOrEqual(before.meanLuminance * 0.25);
    expect(after.meanLuminance).toBeLessThanOrEqual(tile.meanLuminance + 0.0004);
    expect(after.redPixels).toBe(0);
  });

  it('keeps the 128px icon as the untouched master artwork', async () => {
    const expected = await sharp(source)
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .png(ENCODE).toBuffer();
    const icon = fs.readFileSync('extension/assets/icon-128.png');
    expect(icon.equals(expected)).toBe(true);
    // Signature ink is still there at master size, so the simplification cannot leak upwards.
    expect((await regionStats(icon, SIGNATURE_REGION)).greyFraction).toBeGreaterThan(0.1);
  });

  it('refuses to mask an artwork whose corner signature is no longer where the box expects it', async () => {
    // A substituted master must fail the guard rather than be silently mis-painted.
    const blank = await sharp({ create: { width: 1254, height: 1254, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
    await expect(verifyIconSource(blank)).rejects.toThrow(/Corner signature not found/);
    const mark = await sharp('logo.png').composite([{
      input: await sharp({ create: { width: 264, height: 136, channels: 4, background: { r: 255, g: 20, b: 40, alpha: 1 } } }).png().toBuffer(),
      left: 838, top: 966,
    }]).png().toBuffer();
    await expect(verifyIconSource(mark)).rejects.toThrow(/overlaps the red brand mark/);
    await expect(verifyIconSource(source)).resolves.toBeDefined();
  });

  it('ships header.png as the brand lockup, with the packaged copy derived from it', async () => {
    const master = fs.readFileSync('header.png');
    const art = await auditHeader(master);
    expect([art.width, art.height]).toEqual([MASTER_WIDTH, MASTER_HEIGHT]);
    expect(await sharp(master).metadata()).toMatchObject({ format: 'png', hasAlpha: true });
    // Two-tone brand lockup: both halves present, and no colour outside the theme tokens.
    expect(art.offBrandPixels).toBe(0);
    expect(art.redShare).toBeGreaterThan(0.25);
    expect(art.lightShare).toBeGreaterThan(0.25);
    expect(art.coverage).toBeGreaterThan(0.05);
    expect(art.coverage).toBeLessThan(0.7);
    expect(fs.readFileSync('extension/assets/header.png').equals(await derivePackaged(master))).toBe(true);
  });

  it('catches a header that leaves the brand palette or loses a half of the lockup', async () => {
    const offBrand = await sharp({ create: { width: MASTER_WIDTH, height: MASTER_HEIGHT, channels: 4, background: { r: 40, g: 120, b: 240, alpha: 1 } } }).png().toBuffer();
    expect((await auditHeader(offBrand)).offBrandPixels).toBeGreaterThan(0);
    expect((await auditHeader(await sharp({ create: { width: MASTER_WIDTH, height: MASTER_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer())).coverage).toBe(0);
  });

  it('checks generated assets without changing the artwork or PNGs', () => {
    const paths = ['logo.png', ...sizes.map((size) => `extension/assets/icon-${size}.png`)];
    const before = paths.map((filename) => hash(fs.readFileSync(filename)));
    expect(execFileSync(process.execPath, ['scripts/icons.mjs', '--check'], { encoding: 'utf8' })).toContain('All four icons match');
    expect(paths.map((filename) => hash(fs.readFileSync(filename)))).toEqual(before);
  });

  it('uses the derived logo for every declared toolbar and extension icon', () => {
    const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8')) as {
      icons: Record<string, string>;
      action: { default_icon: Record<string, string> };
    };
    const icons = Object.fromEntries(sizes.map((size) => [String(size), `assets/icon-${size}.png`]));
    expect(manifest.icons).toEqual(icons);
    expect(manifest.action.default_icon).toEqual(icons);
  });

  it('uses the same high-resolution logo on popup and help pages with consistent versions', () => {
    const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8')) as { version: string };
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
    expect(manifest.version).toBe(pkg.version);
    for (const page of ['popup', 'help']) {
      const html = fs.readFileSync(`extension/pages/${page}.html`, 'utf8');
      expect(html).toMatch(/<img\b[^>]*class="brand-logo"[^>]*src="assets\/icon-128\.png"[^>]*alt="SpicyExtension logo"[^>]*>/);
      expect(html).toContain(`<span class="version">${pkg.version}</span>`);
    }
  });

  it('embeds that exact logo in the content bundle rather than requesting an exposed or remote image', async () => {
    const output = await build({
      entryPoints: ['extension/src/content/index.ts'], bundle: true, write: false,
      format: 'iife', target: 'chrome120', loader: { '.css': 'text', '.png': 'dataurl' },
    });
    const script = output.outputFiles[0]?.text;
    expect(script).toContain(`data:image/png;base64,${fs.readFileSync('extension/assets/icon-128.png').toString('base64')}`);
    const controller = fs.readFileSync('extension/src/content/capture-panel.ts', 'utf8');
    expect(controller).toContain("import brandLogo from '../../assets/icon-128.png'");
    expect(controller).toContain('logo.src = brandLogo;');
    expect(controller).toContain('drag.append(logo, titles);');
    expect(controller).not.toContain('✈');
  });
});
