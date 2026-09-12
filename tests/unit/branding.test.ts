// @vitest-environment node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

const sizes = [16, 32, 48, 128];
const source = fs.readFileSync('logo.png');
const hash = (data: Buffer): string => crypto.createHash('sha256').update(data).digest('hex');

describe('repository logo branding', () => {
  it('preserves the supplied logo.png byte-for-byte', () => {
    expect(hash(source)).toBe('2056971c95da6f04ddf546c8409100604302c3deb5e47a7b29418ed220d44dc9');
  });

  it.each(sizes)('derives the %ipx icon from the complete repository logo, without cropping', async (size) => {
    const icon = fs.readFileSync(`extension/assets/icon-${size}.png`);
    const expected = await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toBuffer();
    expect(icon.equals(expected)).toBe(true);
    expect(await sharp(icon).metadata()).toMatchObject({ format: 'png', width: size, height: size });
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
      expect(html).toMatch(/<img\b[^>]*class="brand-logo"[^>]*src="assets\/icon-128\.png"[^>]*alt="Spicy Extension logo"[^>]*>/);
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
    const controller = fs.readFileSync('extension/src/content/inspector.ts', 'utf8');
    expect(controller).toContain("import brandLogo from '../../assets/icon-128.png'");
    expect(controller).toContain('logo.src = brandLogo;');
    expect(controller).toContain('drag.append(logo, titles);');
    expect(controller).not.toContain('✈');
  });
});
