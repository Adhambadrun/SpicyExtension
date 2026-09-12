// Structural DOM tests only. JSDOM does not verify Chrome IPC, CSS layout or image decoding.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openInspector } from '../../extension/src/content/inspector';
import { DISPOSE_EVENT, INSPECTOR_ROOT_ID } from '../../extension/src/core/policy';
import { parseCapture } from '../../extension/src/core/snapshot';

vi.mock('../../extension/src/styles/inspector.css', () => ({ default: '' }));
vi.mock('../../extension/src/styles/terminal.css', () => ({ default: '' }));
vi.mock('../../extension/assets/icon-128.png', () => ({ default: '/unit-test-logo.png' }));

function shadow(): ShadowRoot {
  const root = document.getElementById(INSPECTOR_ROOT_ID)?.shadowRoot;
  if (!root) throw new Error('Inspector was not mounted');
  return root;
}
function node<T extends Element>(selector: string): T {
  const result = shadow().querySelector<T>(selector);
  if (!result) throw new Error(`Missing inspector control: ${selector}`);
  return result;
}
function click(text: string): void {
  const button = [...shadow().querySelectorAll('button')].find((item) => item.textContent === text);
  if (!button) throw new Error(`Missing button: ${text}`);
  button.click();
}
function capture(): HTMLTextAreaElement {
  const card = document.createElement('article');
  card.textContent = 'Synthetic structural UI fixture. Not flight inventory.';
  document.body.append(card);
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 20, 320, 100));
  Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => [card] });
  click('Select a result area');
  node<HTMLElement>('.selector').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 30, clientY: 30 }));
  const editor = node<HTMLTextAreaElement>('.editor');
  expect(parseCapture(editor.value).selection.text).toContain('Synthetic structural UI fixture');
  return editor;
}

beforeEach(() => {
  window.dispatchEvent(new Event(DISPOSE_EVENT));
  document.body.replaceChildren();
  vi.stubGlobal('CSSStyleSheet', class { replaceSync(): void { /* CSS rendering is a browser-test concern. */ } });
  openInspector();
});
afterEach(() => {
  window.dispatchEvent(new Event(DISPOSE_EVENT));
  Reflect.deleteProperty(document, 'elementsFromPoint');
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('SpicyTerminal inspector structure', () => {
  it('starts compact with separate input/output regions and no captured data', () => {
    expect(node<HTMLElement>('.input-pane').getAttribute('aria-label')).toBe('Capture input');
    expect(node<HTMLElement>('.output-pane').getAttribute('aria-label')).toBe('Capture output');
    expect(node<HTMLElement>('.wordmark').textContent).toBe('SpicyExtension');
    expect(node<HTMLElement>('.empty-output').hidden).toBe(false);
    expect(node<HTMLElement>('.review-output').hidden).toBe(true);
    expect(node<HTMLTextAreaElement>('.editor').value).toBe('');
    expect(node<HTMLElement>('.panel').classList.contains('expanded')).toBe(false);
  });

  it('expands and compacts the existing view without remounting or losing redactions', () => {
    const editor = capture();
    const edited = parseCapture(editor.value);
    edited.selection.text = 'Manually reviewed text';
    editor.value = JSON.stringify(edited);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    const value = editor.value;
    const toggle = node<HTMLButtonElement>('[aria-label="Expanded inspector layout"]');
    toggle.click();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(node<HTMLElement>('.panel').classList.contains('expanded')).toBe(true);
    expect(node<HTMLTextAreaElement>('.editor')).toBe(editor);
    expect(editor.value).toBe(value);
    toggle.click();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(node<HTMLElement>('.panel').classList.contains('expanded')).toBe(false);
    expect(editor.value).toBe(value);
  });

  it('keeps synthetic review consent blocked after changing layout', () => {
    capture();
    node<HTMLButtonElement>('[aria-label="Expanded inspector layout"]').click();
    const consent = node<HTMLInputElement>('.review-check input');
    consent.checked = true;
    consent.dispatchEvent(new Event('change', { bubbles: true }));
    expect(consent.checked).toBe(false);
    for (const button of shadow().querySelectorAll<HTMLButtonElement>('.review-output button')) expect(button.disabled).toBe(true);
  });

  it('cancels selection and clears both panes without discarding the chosen layout', () => {
    capture();
    click('Expand');
    click('Select another area');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(node<HTMLElement>('.review-output').hidden).toBe(false);
    click('Clear capture');
    expect(node<HTMLElement>('.review-output').hidden).toBe(true);
    expect(node<HTMLElement>('.empty-output').hidden).toBe(false);
    expect(node<HTMLTextAreaElement>('.editor').value).toBe('');
    expect(node<HTMLElement>('.panel').classList.contains('expanded')).toBe(true);
  });

  it('reuses a single instance and clears the view on close', () => {
    capture();
    const editor = node<HTMLTextAreaElement>('.editor');
    openInspector();
    expect(document.querySelectorAll(`#${INSPECTOR_ROOT_ID}`)).toHaveLength(1);
    expect(node<HTMLTextAreaElement>('.editor')).toBe(editor);
    node<HTMLButtonElement>('[aria-label="Close and clear capture"]').click();
    expect(document.getElementById(INSPECTOR_ROOT_ID)).toBeNull();
    openInspector();
    expect(node<HTMLTextAreaElement>('.editor').value).toBe('');
  });
});
