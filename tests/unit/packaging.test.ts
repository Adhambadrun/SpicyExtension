// @vitest-environment node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8')) as Record<string, unknown>;

describe('packaged capture panel boundaries', () => {
  it('is MV3 with one exact host and no privileged APIs/external messaging', () => {
    expect(manifest['manifest_version']).toBe(3);
    expect(manifest['host_permissions']).toEqual(['https://agentsearch.vercel.app/*']);
    expect(manifest['permissions']).toBeUndefined();
    expect(manifest['externally_connectable']).toBeUndefined();
    expect(manifest['web_accessible_resources']).toBeUndefined();
    expect((manifest['description'] as string).length).toBeLessThanOrEqual(132);
    expect(manifest['content_security_policy']).toEqual({ extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'; connect-src 'none'" });
  });
  it('keeps private examples, screenshots and source archives out of the runtime', () => {
    const sources = fs.readdirSync('extension/src', { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => fs.readFileSync(`${entry.parentPath}/${entry.name}`, 'utf8')).join('\n');
    expect(sources).not.toMatch(/\bfetch\s*\(|new\s+XMLHttpRequest|new\s+WebSocket|sendBeacon\s*\(|document\.cookie|chrome\.cookies|(?:local|session)Storage\s*[.[]|chrome\.storage/);
    expect(sources).not.toMatch(/\.innerHTML\s*=|\beval\s*\(|new\s+Function\s*\(/);
    expect(sources).not.toMatch(/tests\/|fixtures\/|BCF Floating Flight Search Widget\.txt/);
  });
  it('leaves both user-supplied originals byte-for-byte unchanged', () => {
    for (const [filename, expected] of [
      ['BCF Floating Flight Search Widget.txt', '73f26ed4329ae777113a1311a026dc0ffe0409b70f143fd895a0e9a3998cc1d2'],
      ['agentsearch-mcp-master.zip', '3c3c0353cfa3cf7b6723a394c457a0b5ab0836d01b066452ee1007177be8b061'],
    ]) {
      if (!filename) throw new Error('Missing file');
      expect(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex')).toBe(expected);
    }
  });
});
