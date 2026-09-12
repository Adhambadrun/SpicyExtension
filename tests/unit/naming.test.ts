// @vitest-environment node
// The product has exactly one name. This test is what keeps the retired working title out of the
// manifest, the packaged pages, the export format, the build output, the ZIP and the documentation.
// Patterns are assembled from fragments so that this file can be scanned by its own rules.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const OLD_TOOL = new RegExp('[Ii]nspec' + 't');
const OLD_PRODUCT = new RegExp('\\bBa' + 'sis\\b');
const OLD_PREFIX = new RegExp('\\bBC' + 'F\\b');
const OLD_DOMAIN = new RegExp('bc' + 'flights', 'i');
const SPLIT_BRAND = new RegExp('[Ss]picy [Ee]xtension');
const FORBIDDEN = [OLD_TOOL, OLD_PRODUCT, OLD_PREFIX, OLD_DOMAIN, SPLIT_BRAND];

// Received inputs are preserved byte-for-byte, so their names cannot be rewritten by us.
const SUPPLIED = ['BC' + 'F Floating Flight Search Widget.txt', 'agentsearch-mcp-master.zip'];
const SKIP_DIRECTORIES = new Set(['.git', '.arena', 'node_modules', 'dist', 'artifacts', 'coverage', 'playwright-report', 'test-results', '.next', '.cache']);
const TEXT_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.json', '.md', '.html', '.css', '.yml', '.example', '.txt', '.gitignore', '.nvmrc', '.npmrc', '.d.mts']);

function trackedFiles(dir = root, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) trackedFiles(path.join(dir, entry.name), found);
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = path.relative(root, path.join(dir, entry.name));
    if (SUPPLIED.includes(relative)) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(relative)) && !relative.startsWith('.gitignore')) continue;
    found.push(relative);
  }
  return found;
}

function withoutSuppliedName(text: string): string {
  // Remove the received file names (including regex-escaped mentions in tests) before matching.
  return SUPPLIED.reduce((value, name) => value.split(name).join('').split(name.replace(/\./g, '\\.')).join(''), text);
}

describe('single product name', () => {
  const files = trackedFiles();

  it('scans a broad, meaningful set of tracked files', () => {
    expect(files.length).toBeGreaterThan(40);
    for (const required of ['extension/manifest.json', 'extension/pages/popup.html', 'extension/pages/help.html',
      'scripts/build.mjs', 'scripts/package.mjs', 'README.md', '.gitignore', 'package.json']) {
      expect(files).toContain(required);
    }
  });

  it.each(files)('keeps the retired naming out of %s', (relative) => {
    const text = withoutSuppliedName(fs.readFileSync(path.join(root, relative), 'utf8'));
    for (const pattern of FORBIDDEN) expect(text, `${relative} still contains ${pattern}`).not.toMatch(pattern);
  });

  it('keeps the retired naming out of file names', () => {
    const names = [...new Set(files.flatMap((relative) => relative.split(path.sep)))];
    for (const name of names) for (const pattern of FORBIDDEN) expect(name, `file name ${name}`).not.toMatch(pattern);
  });

  it('names only SpicyExtension in the shipped manifest and package', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension/manifest.json'), 'utf8')) as {
      name: string; version: string; description: string; action: { default_title: string };
    };
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { name: string; version: string };
    expect(manifest.name).toBe('SpicyExtension');
    expect(manifest.action.default_title.startsWith('SpicyExtension')).toBe(true);
    expect(manifest.description.length).toBeLessThanOrEqual(132);
    expect(manifest.version).toBe(pkg.version);
    expect(pkg.name).toBe('spicyextension');
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')) as { name: string; packages: Record<string, { name?: string }> };
    expect(lock.name).toBe(pkg.name);
    expect(lock.packages['']?.name).toBe(pkg.name);
  });

  it('uses the SpicyExtension brand for the exported JSON and every shipped filename', () => {
    const snapshot = fs.readFileSync(path.join(root, 'extension/src/core/snapshot.ts'), 'utf8');
    const policy = fs.readFileSync(path.join(root, 'extension/src/core/policy.ts'), 'utf8');
    expect(snapshot).toContain("format: 'spicyextension-capture'");
    expect(snapshot).toContain('`spicyextension-${capture.kind}-');
    expect(policy).toContain("export const CAPTURE_ROOT_ID = 'spicyextension-capture-root'");
    expect(fs.readFileSync(path.join(root, 'scripts/build.mjs'), 'utf8')).toContain("path.resolve('dist/spicyextension')");
    expect(fs.readFileSync(path.join(root, 'scripts/package.mjs'), 'utf8')).toContain('artifacts/spicyextension-${version}.zip');
  });
});
