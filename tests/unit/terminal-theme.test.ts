// @vitest-environment node
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const theme = fs.readFileSync('extension/src/styles/terminal.css', 'utf8');
function token(name: string): string {
  const color = theme.match(new RegExp(`--spicy-${name}:\\s*(#[a-f0-9]{6});`))?.[1];
  if (!color) throw new Error(`Missing theme token: ${name}`);
  return color;
}
function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return (rgb[0] ?? 0) * 0.2126 + (rgb[1] ?? 0) * 0.7152 + (rgb[2] ?? 0) * 0.0722;
}

describe('shared SpicyTerminal styling', () => {
  it.each(['text', 'muted', 'output', 'warning', 'error', 'red'])('%s text has at least 4.5:1 contrast against the terminal surface', (role) => {
    const foreground = luminance(token(role));
    const background = luminance(token('surface'));
    expect((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it('shares one locally packaged theme across the content view, popup and help', () => {
    const controller = fs.readFileSync('extension/src/content/inspector.ts', 'utf8');
    expect(controller).toContain("import terminalCss from '../styles/terminal.css'");
    expect(controller).toContain('sheet.replaceSync(`${terminalCss}\\n${css}`)');
    for (const page of ['popup', 'help']) {
      const html = fs.readFileSync(`extension/pages/${page}.html`, 'utf8');
      expect(html).toContain('<link rel="stylesheet" href="terminal.css">');
      expect(html).toContain('wordmark-spicy');
      expect(html).toContain('wordmark-extension');
    }
    expect(fs.readFileSync('scripts/build.mjs', 'utf8')).toContain("await cp('extension/src/styles/terminal.css', `${out}/terminal.css`)");
    expect(theme).not.toMatch(/@import|https?:\/\/|@font-face/);
  });
});
