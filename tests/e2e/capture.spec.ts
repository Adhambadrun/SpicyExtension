import { test, expect, chromium } from '@playwright/test';
import type { BrowserContext, Page, Worker } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BEGIN_CAPTURE } from '../../extension/src/core/messages';
import { parseCapture } from '../../extension/src/core/snapshot';

const sourceUrl = 'https://agentsearch.vercel.app/flights?s=QUERY_SECRET#private';
const root = '#spicyextension-capture-root';
let context: BrowserContext;
let worker: Worker;
let page: Page;
let errors: string[];
let requests: string[];
let extensionId: string;

test.beforeAll(async () => {
  const extension = path.resolve('dist/spicyextension');
  const executablePath = process.env['CHROMIUM_PATH'];
  context = await chromium.launchPersistentContext('', {
    ...(executablePath ? { executablePath } : { channel: 'chromium' }),
    headless: true,
    viewport: { width: 1280, height: 920 },
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      // Branded Chrome 137+ ignores --load-extension unless this feature is disabled. Chromium and
      // Chrome for Testing builds do not need it; a headless_shell build cannot load extensions at
      // all, because it has no extensions subsystem. Use Chromium or Chrome for Testing here.
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
    ],
  });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker').catch(() => {
    throw new Error('The unpacked MV3 service worker never started. Run this suite against Chromium '
      + 'or Chrome for Testing (CHROMIUM_PATH=/path/to/chrome). A headless_shell build cannot load extensions.');
  });
  extensionId = worker.url().split('/')[2] ?? '';
  if (!extensionId) throw new Error('The unpacked MV3 worker did not load.');
  const fixture = await fs.readFile('tests/fixtures/result-page.html', 'utf8');
  await context.route('https://agentsearch.vercel.app/**', (route) => route.fulfill({ contentType: 'text/html', body: fixture }));
  // The fixture is local test data. Unexpected network requests must never reach the real service.
  await context.route('https://example.invalid/**', (route) => route.abort());
});

test.beforeEach(async () => {
  page = await context.newPage(); errors = []; requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(sourceUrl);
  await page.bringToFront();
});

test.afterEach(async () => {
  expect(errors, 'Unexpected browser/console errors').toEqual([]);
  await page.close();
});

test.afterAll(async () => { await context?.close(); });

async function activate(): Promise<unknown> {
  await page.bringToFront();
  // Real extension-to-content Chrome IPC. No test hooks or host-permission changes in the build.
  return worker.evaluate(async (type) => {
    const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (typeof tab?.id !== 'number') throw new Error('No active test tab');
    return chrome.tabs.sendMessage(tab.id, { type, version: 1 });
  }, BEGIN_CAPTURE);
}

async function captureCard(): Promise<void> {
  expect(await activate()).toEqual({ ok: true });
  await page.getByRole('button', { name: 'Select a result area', exact: true }).click();
  const box = await page.locator('#result-card').boundingBox();
  if (!box) throw new Error('Test card has no layout');
  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.click(box.x + 8, box.y + 8);
  await expect(page.getByRole('heading', { name: 'Review before sharing', exact: true })).toBeVisible();
}

async function expectBrandLogo(src: string | RegExp): Promise<void> {
  const logo = page.getByRole('img', { name: 'SpicyExtension logo', exact: true });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', src);
  await expect.poll(() => logo.evaluate((node: HTMLImageElement) => ({
    complete: node.complete, width: node.naturalWidth, height: node.naturalHeight,
  }))).toEqual({ complete: true, width: 128, height: 128 });
}

function editor() { return page.getByRole('textbox', { name: 'Review and redact capture JSON' }); }
function consent() { return page.getByRole('checkbox', { name: /I reviewed this capture/ }); }

test('installs as MV3 and remains dormant until internal Chrome IPC', async () => {
  await expect(page.locator(root)).toHaveCount(0);
  await page.evaluate(() => window.postMessage({ type: 'SPICY_CAPTURE_BEGIN', version: 1 }, '*'));
  await expect(page.locator(root)).toHaveCount(0);
  const permissions = await worker.evaluate(() => chrome.permissions.getAll());
  expect(permissions.permissions ?? []).toEqual([]);
  expect(permissions.origins).toEqual(['https://agentsearch.vercel.app/*']);
  expect(await activate()).toEqual({ ok: true });
  await expect(page.getByRole('dialog', { name: 'SpicyExtension local capture panel' })).toBeVisible();
  await expectBrandLogo(/^data:image\/png;base64,/);
  await expect(page.getByRole('textbox', { name: 'Review and redact capture JSON' })).toBeHidden();
});

test('captures only the selected area, gates export, and downloads valid redacted JSON', async () => {
  const testInfo = test.info();
  const before = [...requests];
  await captureCard();
  const capture = parseCapture(await editor().inputValue());
  expect(capture.selection.text).toContain('USD 456.78');
  expect(capture.selection.html).toContain('data-testid="test-result"');
  expect(JSON.stringify(capture)).not.toMatch(/ATTRIBUTE_SECRET|QUERY_SECRET|URL_SECRET|HIDDEN_SECRET|FORM_SECRET|unrelated@example|synthetic.person@example/);
  await expect(page.getByRole('button', { name: 'Download JSON', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Copy JSON', exact: true })).toBeDisabled();
  await consent().check();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const download = await pending;
  const filename = testInfo.outputPath('reviewed-capture.json');
  await download.saveAs(filename);
  expect(download.suggestedFilename()).toMatch(/^spicyextension-result-card-[\dTZ-]+\.json$/);
  expect(parseCapture(await fs.readFile(filename, 'utf8'))).toEqual(capture);
  expect(requests).toEqual(before);
  await page.getByRole('dialog').screenshot({ path: testInfo.outputPath('capture-review.png') });
});

test('selection clicks do not activate the page action', async () => {
  await activate();
  await page.getByRole('button', { name: 'Select a result area' }).click();
  const box = await page.locator('#source-action').boundingBox();
  if (!box) throw new Error('Missing page action');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('heading', { name: 'Review before sharing' })).toBeVisible();
  expect(await page.locator('html').getAttribute('data-source-action')).toBeNull();
  expect(parseCapture(await editor().inputValue()).selection.text).toContain('Source action');
});

test('editing, resizing and kind changes require a new review; invalid JSON cannot export', async () => {
  await captureCard();
  await consent().check();
  await expect(page.getByRole('button', { name: 'Download JSON', exact: true })).toBeEnabled();
  await editor().fill('{ invalid');
  await expect(consent()).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Download JSON', exact: true })).toBeDisabled();
  await consent().check();
  await expect(page.getByRole('button', { name: 'Download JSON', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('not valid JSON');
  await page.getByRole('button', { name: 'Reset redactions', exact: true }).click();
  const reviewed = parseCapture(await editor().inputValue());
  reviewed.selection.text = '[redacted manually]';
  await editor().fill(JSON.stringify(reviewed, null, 2));
  await consent().check();
  await page.getByRole('combobox', { name: 'Capture type' }).selectOption('itinerary-details');
  await expect(consent()).not.toBeChecked();
  const updated = parseCapture(await editor().inputValue());
  expect(updated.kind).toBe('itinerary-details');
  expect(updated.selection.text).toBe('[redacted manually]');
});

test('synthetic consent and programmatic export cannot download a capture', async () => {
  await captureCard();
  await consent().evaluate((node: HTMLInputElement) => {
    node.checked = true;
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(consent()).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Download JSON', exact: true })).toBeDisabled();
  await consent().check();
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await page.getByRole('button', { name: 'Download JSON', exact: true }).evaluate((node: HTMLButtonElement) => node.click());
  await expect(page.getByRole('status')).not.toContainText('Download requested');
  expect(downloads).toBe(0);
});

test('repeated opens preserve one instance and current redactions; close clears the capture', async () => {
  await captureCard();
  const revised = parseCapture(await editor().inputValue()); revised.selection.text = 'REVIEWED EDIT';
  await editor().fill(JSON.stringify(revised));
  await activate(); await activate();
  await expect(page.locator(root)).toHaveCount(1);
  expect(parseCapture(await editor().inputValue()).selection.text).toBe('REVIEWED EDIT');
  await page.getByRole('button', { name: 'Close and clear capture' }).click();
  await expect(page.locator(root)).toHaveCount(0);
  await activate();
  await expect(page.getByRole('button', { name: 'Select a result area' })).toBeVisible();
  expect(await editor().inputValue()).toBe('');
});

test('Escape cancels selection and keyboard movement keeps the panel within the viewport', async () => {
  await activate();
  await page.getByRole('button', { name: 'Select a result area' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Select a result area' })).toBeVisible();
  const move = page.getByRole('button', { name: 'Move panel. Drag or use arrow keys.' });
  await move.focus();
  for (let i = 0; i < 70; i++) await page.keyboard.press('ArrowLeft');
  const box = await page.getByRole('dialog').boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(8);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(1280);
  await page.setViewportSize({ width: 720, height: 760 });
  const resized = await page.getByRole('dialog').boundingBox();
  expect((resized?.x ?? 0) + (resized?.width ?? 0)).toBeLessThanOrEqual(720);
});

test('SPA query/lead changes clear stale data and login routes reject a capture request', async () => {
  await captureCard();
  await page.evaluate(() => history.pushState({}, '', '/flights?s=next-search'));
  await expect(page.locator(root)).toHaveCount(0);
  await activate();
  expect(await editor().inputValue()).toBe('');
  await page.evaluate(() => history.replaceState({}, '', '/auth/signin'));
  await expect(page.locator(root)).toHaveCount(0);
  expect(await activate()).toMatchObject({ ok: false });
  await expect(page.locator(root)).toHaveCount(0);
});

test('popup and packaged privacy guide load under the MV3 CSP without remote requests', async () => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByRole('heading', { name: 'Local capture' })).toBeVisible();
  await expectBrandLogo('assets/icon-128.png');
  await expect(page.getByRole('button', { name: 'Open capture panel' })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Sign in to the connected site');
  const before = [...requests];
  await page.goto(`chrome-extension://${extensionId}/help.html`);
  await expect(page.getByRole('heading', { name: 'Local result capture', exact: true })).toBeVisible();
  await expectBrandLogo('assets/icon-128.png');
  expect(requests).toEqual(before);
});

test('page reload discards the capture and a new capture has only one root', async () => {
  await captureCard();
  await page.reload();
  await expect(page.locator(root)).toHaveCount(0);
  await activate();
  await expect(page.locator(root)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Select a result area' })).toBeVisible();
});

test('SpicyTerminal colors and typography are applied in the capture panel, popup and help', async () => {
  await captureCard();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(6, 9, 11)');
  await expect(editor()).toHaveCSS('color', 'rgb(121, 231, 160)');
  await expect(editor()).toHaveCSS('font-family', /monospace/);
  await expect(page.locator(`${root} .wordmark-spicy`)).toHaveCSS('color', 'rgb(255, 53, 75)');
  for (const file of ['popup.html', 'help.html']) {
    await page.goto(`chrome-extension://${extensionId}/${file}`);
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(6, 9, 11)');
    await expect(page.locator('html')).toHaveCSS('font-family', /monospace/);
    await expect(page.locator('.output-label').first()).toHaveCSS('color', 'rgb(121, 231, 160)');
  }
});

test('expanded input/output layout preserves reviewed edits and stacks on narrow screens', async () => {
  await captureCard();
  const revised = parseCapture(await editor().inputValue());
  revised.selection.text = 'Manually reviewed structural fixture';
  await editor().fill(JSON.stringify(revised, null, 2));
  await consent().check();
  const text = await editor().inputValue();
  const toggle = page.getByRole('button', { name: 'Expanded capture layout', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const input = await page.locator(`${root} .input-pane`).boundingBox();
  const output = await page.locator(`${root} .output-pane`).boundingBox();
  if (!input || !output) throw new Error('Missing input/output pane geometry');
  expect(output.x).toBeGreaterThan(input.x + input.width);
  expect(await editor().inputValue()).toBe(text);
  await expect(consent()).toBeChecked();
  await expect(page.getByRole('button', { name: 'Download JSON', exact: true })).toBeEnabled();
  await page.getByRole('dialog').screenshot({ path: test.info().outputPath('spicyterminal-expanded.png') });
  await page.setViewportSize({ width: 720, height: 760 });
  const narrowInput = await page.locator(`${root} .input-pane`).boundingBox();
  const narrowOutput = await page.locator(`${root} .output-pane`).boundingBox();
  if (!narrowInput || !narrowOutput) throw new Error('Missing narrow-layout geometry');
  expect(narrowOutput.x).toBeCloseTo(narrowInput.x, 0);
  expect(narrowOutput.y).toBeGreaterThan(narrowInput.y);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await editor().inputValue()).toBe(text);
});
