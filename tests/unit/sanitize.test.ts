import { beforeEach, describe, expect, it } from 'vitest';
import { captureElement, selectionProblem } from '../../extension/src/core/sanitize';
import { CAPTURE_ROOT_ID, LIMITS } from '../../extension/src/core/policy';
import { parseCapture, serializeCapture } from '../../extension/src/core/snapshot';

// Synthetic DOM for the sanitizer only. NOT a source response or flight adapter fixture.
const options = { url: 'https://agentsearch.vercel.app/flights?s=DO_NOT_EXPORT#private', kind: 'result-card' as const, now: new Date('2026-09-12T10:00:00.000Z') };
function fixture(html: string): Element {
  const source = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild;
  if (!source) throw new Error('Fixture requires a root.');
  return document.body.appendChild(document.importNode(source, true));
}
beforeEach(() => { document.body.replaceChildren(); });

describe('bounded selected-area capture', () => {
  it('retains useful HTML and visible flight text, not unrelated page areas', () => {
    fixture('<div>UNRELATED_ACCOUNT_DATA</div>');
    const root = fixture('<article class="option" data-testid="result"><header><strong>Carrier ZZ</strong></header><table><tbody><tr><td>ZZ 123</td><td>AAA → BBB</td><td>09:00 AM</td><td>Business</td><td>USD 456.78</td></tr></tbody></table></article>');
    const capture = captureElement(root, options);
    expect(capture.selection.html).toContain('data-testid="result"');
    expect(capture.selection.html).toContain('<table>');
    expect(capture.selection.text).toContain('USD 456.78');
    expect(serializeCapture(capture)).not.toMatch(/UNRELATED_ACCOUNT_DATA|DO_NOT_EXPORT|#private/);
    expect(capture.source).toEqual({ origin: 'https://agentsearch.vercel.app', path: '/flights' });
    expect(parseCapture(serializeCapture(capture))).toEqual(capture);
  });
  it('removes script/resource/link URLs and arbitrary attributes without reading their values', () => {
    const root = fixture('<article id="private-id" class="flight" style="color:red" data-token="DO_NOT_READ" data-testid="option"><span onclick="DO_NOT_RUN">AAA → BBB</span><a href="https://example.invalid/?token=URL_SECRET" ping="https://example.invalid">Details</a><img src="https://example.invalid/pixel" srcset="https://example.invalid/pixel 2x" alt="Carrier logo"><script>SECRET_SCRIPT</script><iframe src="https://example.invalid/frame">FRAME_SECRET</iframe><svg><text>SVG_SECRET</text></svg><style>.SECRET{}</style></article>');
    const getAttribute = root.getAttribute.bind(root);
    root.getAttribute = (name) => { if (name === 'data-token') throw new Error('Private attribute was read'); return getAttribute(name); };
    const result = captureElement(root, options);
    expect(result.selection.html).toContain('class="flight"');
    expect(result.selection.html).toContain('alt="Carrier logo"');
    expect(result.selection.html).not.toMatch(/private-id|style=|data-token|SECRET|DO_NOT|src=|href=|ping=|onclick=|<script|<iframe|<svg/);
    expect(result.stats.droppedAttributes).toBeGreaterThan(4);
  });
  it('never reads form control values, including live values not present in markup', () => {
    const root = fixture('<article><p>AAA → BBB</p><input value="PRIVATE"><textarea>PRIVATE_TEXT</textarea><select><option>PRIVATE_OPTION</option></select><form>PRIVATE_FORM<input type="password" value="PASSWORD"></form><div contenteditable="true">PRIVATE_EDIT</div></article>');
    const input = root.querySelector('input');
    if (!input) throw new Error('input missing');
    Object.defineProperty(input, 'value', { get() { throw new Error('Input value was read'); } });
    const capture = serializeCapture(captureElement(root, options));
    expect(capture).not.toMatch(/PRIVATE|PASSWORD|<input|<form|<textarea|<select/);
    expect(capture).toContain('AAA → BBB');
  });
  it.each(['hidden', 'aria-hidden="true"', 'inert', 'style="display:none"', 'style="visibility:hidden"', 'style="opacity:0"'])('omits hidden subtrees: %s', (attribute) => {
    const root = fixture(`<article><p>VISIBLE</p><div ${attribute}>HIDDEN_PRIVATE</div></article>`);
    const result = captureElement(root, options);
    expect(result.selection.text).toBe('VISIBLE');
    expect(result.stats.omittedElements).toBe(1);
  });
  it('rejects selecting descendants of a hidden container', () => {
    const outer = fixture('<div style="display:none"><article>Hidden private detail</article></div>');
    const target = outer.firstElementChild;
    if (!target) throw new Error('missing fixture child');
    expect(() => captureElement(target, options)).toThrow(/hidden/);
  });
  it('redacts recognized credentials, emails and URLs in text and safe labels', () => {
    const root = fixture('<article aria-label="person@example.invalid"><p>AAA → BBB</p><p>person@example.invalid https://example.invalid/private Bearer TOP_SECRET api_key=KEY_SECRET eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl</p></article>');
    const result = captureElement(root, options);
    expect(serializeCapture(result)).not.toMatch(/person@example|TOP_SECRET|KEY_SECRET|eyJhb|https:\/\/example/);
    expect(result.selection.text).toContain('[redacted email]');
    expect(result.stats.redactedTextNodes).toBeGreaterThan(0);
    expect(result.warnings.join(' ')).toContain('Names, booking references');
  });
  it('does not falsely promise that arbitrary names or booking references are anonymized', () => {
    const root = fixture('<article><p>Synthetic Person · Reference EXAMPLE</p><p>AAA → BBB</p></article>');
    const result = captureElement(root, options);
    expect(result.selection.text).toContain('Synthetic Person');
    expect(result.warnings.join(' ')).toContain('Review and remove');
  });
  it('escapes text and label markup instead of activating it', () => {
    const root = fixture('<article>Flight data</article>');
    root.append(document.createTextNode('<script>alert("x")</script> & example'));
    root.setAttribute('title', '" onmouseover="NOT_CODE');
    const result = captureElement(root, options).selection.html;
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&quot; onmouseover=&quot;');
  });
  it('does not capture shadow-root content or imply it was included', () => {
    const root = fixture('<article><p>Visible light-DOM flight text</p><custom-part></custom-part></article>');
    const custom = root.querySelector('custom-part');
    if (!custom) throw new Error('Missing custom element');
    custom.attachShadow({ mode: 'open' }).textContent = 'SHADOW_PRIVATE';
    const capture = captureElement(root, options);
    expect(capture.selection.html).not.toContain('SHADOW_PRIVATE');
    expect(capture.warnings.join(' ')).toContain('Shadow-root content is not captured');
    expect(capture.selection.html).toContain('data-spicy-original-tag="custom-part"');
  });
  it.each(['main', 'nav', 'form'])('refuses a broad or private %s root', (tag) => {
    const root = fixture(`<${tag}>Do not capture this whole area</${tag}>`);
    expect(() => captureElement(root, options)).toThrow();
  });
  it('refuses the body, disconnected nodes, wrong origin and panel itself', () => {
    expect(selectionProblem(document.body)).toContain('whole page');
    expect(selectionProblem(document.createElement('article'))).toContain('removed');
    const root = fixture('<article>AAA → BBB</article>');
    expect(() => captureElement(root, { ...options, url: 'https://evil.invalid/flights' })).toThrow('search-results');
    root.id = CAPTURE_ROOT_ID;
    expect(() => captureElement(root, options)).toThrow('outside the capture panel');
  });
  it('rejects oversized/deep selections rather than silently truncating', () => {
    const root = fixture('<article>AAA → BBB</article>');
    for (let i = 0; i < LIMITS.elements; i++) root.append(document.createElement('span'));
    expect(() => captureElement(root, options)).toThrow('too large');
    root.replaceChildren(document.createTextNode('x'.repeat(LIMITS.text + 1)));
    expect(() => captureElement(root, options)).toThrow('too much text');
    root.replaceChildren();
    let cursor = root;
    for (let i = 0; i < 65; i++) { const next = document.createElement('div'); cursor.append(next); cursor = next; }
    cursor.textContent = 'AAA → BBB';
    expect(() => captureElement(root, options)).toThrow('too complex');
  });
  it('rejects icons/empty areas with no visible readable text', () => {
    const root = fixture('<article><img alt="logo"></article>');
    expect(() => captureElement(root, options)).toThrow('No visible text');
  });
});
