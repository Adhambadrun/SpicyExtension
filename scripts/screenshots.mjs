// Render Chrome Web Store screenshots from the REAL built extension UI.
//
// Why this exists: the Web Store requires screenshots that show the actual product, and inventing
// artwork would misrepresent it. This script draws no mockups. It photographs:
//   * the real compiled `dist/spicyextension/content.js` — the same bundle that ships in the upload
//     ZIP — mounted on the real synthetic capture fixture served from the extension's own origin,
//     and driven through the real `chrome.runtime.onMessage` BEGIN_CAPTURE code path;
//   * the real packaged `popup.html` and `help.html` from `dist/spicyextension`.
//
// The harness shims exactly two Chrome APIs, because these pages run outside an installed
// extension: `chrome.runtime.onMessage` (so the shipped content script can register and then be
// invoked with its own message) and `chrome.tabs.query` (so the popup reports the state it has when
// the active tab is a signed-in results page). The panel, area picker, sanitizer, redaction,
// review/consent gating and all styling are the shipped code paths, unmodified. Networking is
// blocked outright, and the captured data is the committed synthetic fixture — never real
// inventory, a real account or a real search.
//
//   node scripts/screenshots.mjs            # write store/screenshots/*.png + screenshots.json
//   node scripts/screenshots.mjs --check    # verify the committed PNGs, sizes and provenance
//
// Reproducibility note: two of these screenshots show a capture whose JSON contains a real
// `capturedAt` timestamp, so regenerating them produces different bytes. That is honest output, not
// flakiness. `--check` therefore verifies the committed bytes against the recorded hashes rather
// than re-rendering, and the hashes only change when you deliberately run the generator.
//
// CHROMIUM_PATH selects the browser binary.
import { chromium } from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'store/screenshots');
const DIST = path.join(root, 'dist/spicyextension');
const FIXTURE = path.join(root, 'tests/fixtures/result-page.html');
const MANIFEST = path.join(root, 'extension/manifest.json');
const SITE = 'https://agentsearch.vercel.app/flights';
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

/** Chrome Web Store screenshots must be exactly 1280x800, PNG, no alpha channel. */
const WIDTH = 1280;
const HEIGHT = 800;
const BACKDROP = '#06090b';

// Order matters: the first screenshot is the listing hero.
export const SHOTS = Object.freeze([
  { file: '1-expanded-input-output.png', source: 'capture panel · expanded two-column layout' },
  { file: '2-select-one-result-area.png', source: 'capture panel · selection overlay' },
  { file: '3-review-before-sharing.png', source: 'capture panel · review state, export still gated' },
  { file: '4-toolbar-popup.png', source: 'packaged popup.html' },
  { file: '5-instructions-privacy.png', source: 'packaged help.html' },
]);

function harnessInit(runtimeId, tabUrl) {
  // Minimal Chrome surface: register-and-invoke messaging plus the popup's active-tab lookup.
  return `(() => {
    const listeners = [];
    window.chrome = {
      runtime: {
        id: ${JSON.stringify(runtimeId)},
        onMessage: { addListener: (fn) => listeners.push(fn) },
        sendMessage: () => Promise.resolve({ ok: true }),
        getURL: (p) => p,
      },
      tabs: { query: () => Promise.resolve([{ id: 1, url: ${JSON.stringify(tabUrl)} }]) },
    };
    window.__spicyDispatch = (type) => new Promise((resolve) => {
      const message = { type, version: 1 };
      const sender = { id: ${JSON.stringify(runtimeId)} };
      for (const fn of listeners) fn(message, sender, resolve);
      setTimeout(() => resolve(undefined), 0);
    });
  })();`;
}

async function launch() {
  const executablePath = process.env['CHROMIUM_PATH'];
  return chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
  });
}

/** Flatten to an opaque 1280x800 PNG; the Web Store rejects alpha and off-size screenshots. */
async function finalize(buffer, { contain = false } = {}) {
  const image = sharp(buffer);
  const resized = contain
    ? image.resize(WIDTH, HEIGHT, { fit: 'contain', background: BACKDROP })
    : image.resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' });
  return resized.flatten({ background: BACKDROP }).png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
}

async function newFixturePage(context, bundle, fixtureHtml) {
  const page = await context.newPage();
  await page.addInitScript(harnessInit('spicyextension-screenshot-harness', SITE));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(SITE)) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixtureHtml });
    return route.abort(); // Screenshots must never touch the network.
  });
  await page.goto(SITE);
  await page.addScriptTag({ content: bundle }); // The shipped content bundle, byte-for-byte.
  const reply = await page.evaluate(() => window.__spicyDispatch('SPICY_CAPTURE_BEGIN'));
  if (!reply?.ok) throw new Error(`The shipped content script refused to open the panel: ${JSON.stringify(reply)}`);
  await page.locator('#spicyextension-capture-root').waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

/** Scroll the panel's own scroll container, so a tall compact panel is photographed usefully. */
async function scrollPanelTo(page, where) {
  await page.evaluate((position) => {
    const panel = document.getElementById('spicyextension-capture-root')?.shadowRoot?.querySelector('.panel');
    if (panel) panel.scrollTop = position === 'bottom' ? panel.scrollHeight : 0;
  }, where);
  await page.waitForTimeout(150);
}

/**
 * Press the shipped "Larger ↑" button until the outline matches the wanted element. This is the
 * real adjustment flow, not a synthetic selection: the picker still decides what is selectable.
 */
async function growSelectionTo(page, selector) {
  const wanted = await page.locator(selector).boundingBox();
  if (!wanted) throw new Error(`Fixture element ${selector} has no layout.`);
  for (let i = 0; i < 8; i++) {
    const outline = await page.evaluate(() => {
      const node = document.getElementById('spicyextension-capture-root')?.shadowRoot?.querySelector('.selection-outline');
      if (!node || node.hidden) return null;
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    if (outline && Math.abs(outline.width - wanted.width) < 2 && Math.abs(outline.height - wanted.height) < 2) return;
    await page.getByRole('button', { name: 'Larger ↑', exact: true }).click();
    await page.waitForTimeout(120);
  }
  throw new Error(`The area picker never reached ${selector}; do not ship a misleading screenshot.`);
}

async function captureCard(page) {
  await page.getByRole('button', { name: 'Select a result area', exact: true }).click();
  const box = await page.locator('#result-card').boundingBox();
  if (!box) throw new Error('The fixture result card has no layout.');
  await page.mouse.move(box.x + 12, box.y + 12);
  await page.mouse.click(box.x + 12, box.y + 12);
  await page.getByRole('heading', { name: 'Review before sharing', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function generate({ check = false } = {}) {
  const version = JSON.parse(await readFile(MANIFEST, 'utf8')).version;

  if (check) {
    let record;
    try { record = JSON.parse(await readFile(path.join(outDir, 'screenshots.json'), 'utf8')); }
    catch { throw new Error('Missing store/screenshots/screenshots.json. Run npm run shots:gen.'); }
    if (record.generatedFrom?.version !== version) {
      throw new Error(`Stale screenshots: generated for ${record.generatedFrom?.version}, manifest is ${version}. Run npm run shots:gen.`);
    }
    for (const shot of SHOTS) {
      let data;
      try { data = await readFile(path.join(outDir, shot.file)); }
      catch { throw new Error(`Missing store/screenshots/${shot.file}. Run npm run shots:gen.`); }
      const listed = record.files[shot.file];
      if (!listed || listed.sha256 !== sha256(data)) throw new Error(`store/screenshots/${shot.file} does not match screenshots.json. Regenerate it.`);
      const meta = await sharp(data).metadata();
      if (meta.format !== 'png' || meta.width !== WIDTH || meta.height !== HEIGHT) {
        throw new Error(`store/screenshots/${shot.file} must be a ${WIDTH}x${HEIGHT} PNG, got ${meta.width}x${meta.height} ${meta.format}.`);
      }
      if (meta.hasAlpha) throw new Error(`store/screenshots/${shot.file} must be 24-bit PNG without an alpha channel.`);
    }
    console.log(`Store screenshots current: ${SHOTS.length} x ${WIDTH}x${HEIGHT} PNG derived from the built extension.`);
    return;
  }

  const bundle = await readFile(path.join(DIST, 'content.js'), 'utf8')
    .catch(() => { throw new Error('dist/spicyextension/content.js is missing. Run npm run build first.'); });
  const fixtureHtml = await readFile(FIXTURE, 'utf8');
  await mkdir(outDir, { recursive: true });

  const browser = await launch();
  const produced = new Map();
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

    // Review state: real capture, real sanitized JSON, export still gated by the consent check.
    {
      const page = await newFixturePage(context, bundle, fixtureHtml);
      await captureCard(page);
      // The compact panel scrolls internally; show the JSON, the consent gate and the disabled
      // export buttons together, which is the honest picture of the review step.
      await scrollPanelTo(page, 'bottom');
      produced.set(SHOTS[2].file, await finalize(await page.screenshot()));
      await page.close();
    }

    // Selection overlay: the real area picker outlining one whole result card.
    {
      const page = await newFixturePage(context, bundle, fixtureHtml);
      await page.getByRole('button', { name: 'Select a result area', exact: true }).click();
      const box = await page.locator('#result-card').boundingBox();
      if (!box) throw new Error('The fixture result card has no layout.');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200); // one rAF paint of the selection outline
      // Widen the hit area to the whole card with the shipped "Larger ↑" control, exactly as a
      // user does when the pointer lands on an inner cell.
      await growSelectionTo(page, '#result-card');
      produced.set(SHOTS[1].file, await finalize(await page.screenshot()));
      await page.close();
    }

    // Hero: expanded INPUT / OUTPUT layout, reviewed and with exports unlocked.
    {
      const page = await newFixturePage(context, bundle, fixtureHtml);
      await captureCard(page);
      await page.getByRole('button', { name: 'Expanded capture layout', exact: true }).click();
      await page.getByRole('checkbox', { name: /I reviewed this capture/ }).check();
      await page.waitForTimeout(200);
      produced.set(SHOTS[0].file, await finalize(await page.screenshot()));
      await page.close();
    }

    // The real packaged popup at its natural 390px width, centred on the brand backdrop.
    {
      const page = await context.newPage();
      await page.addInitScript(harnessInit('spicyextension-screenshot-harness', SITE));
      await page.route('**/*', (route) => (route.request().url().startsWith('file:') ? route.continue() : route.abort()));
      await page.goto(pathToFileURL(path.join(DIST, 'popup.html')).href);
      await page.getByRole('button', { name: 'Open capture panel' }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const body = await page.locator('body').boundingBox();
      const shot = await page.screenshot({ clip: { x: 0, y: 0, width: Math.ceil(body?.width ?? 390), height: Math.ceil(body?.height ?? 520) } });
      const scaled = await sharp(shot).resize({ height: 720, fit: 'inside', kernel: 'lanczos3' }).toBuffer();
      const canvas = await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: BACKDROP } })
        .composite([{ input: scaled, gravity: 'center' }]).png().toBuffer();
      produced.set(SHOTS[3].file, await finalize(canvas, { contain: true }));
      await page.close();
    }

    // The real packaged instructions / privacy page.
    {
      const page = await context.newPage();
      await page.addInitScript(harnessInit('spicyextension-screenshot-harness', SITE));
      await page.route('**/*', (route) => (route.request().url().startsWith('file:') ? route.continue() : route.abort()));
      await page.goto(pathToFileURL(path.join(DIST, 'help.html')).href);
      await page.getByRole('heading', { name: 'Local result capture', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      produced.set(SHOTS[4].file, await finalize(await page.screenshot()));
      await page.close();
    }
  } finally {
    await browser.close();
  }

  for (const [file, data] of produced) await writeFile(path.join(outDir, file), data);
  const files = Object.fromEntries(SHOTS.map((shot) => {
    const data = produced.get(shot.file);
    if (!data) throw new Error(`Missing generated screenshot ${shot.file}.`);
    return [shot.file, { source: shot.source, width: WIDTH, height: HEIGHT, bytes: data.byteLength, sha256: sha256(data) }];
  }));
  await writeFile(path.join(outDir, 'screenshots.json'), `${JSON.stringify({
    generatedFrom: {
      version,
      bundle: 'dist/spicyextension/content.js',
      pages: ['dist/spicyextension/popup.html', 'dist/spicyextension/help.html'],
      fixture: 'tests/fixtures/result-page.html',
    },
    note: 'Photographs of the built extension UI. The capture panel screenshots run the shipped content bundle through its real BEGIN_CAPTURE listener over the committed synthetic fixture; chrome.runtime.onMessage and chrome.tabs.query are shimmed only because these pages run outside an installed extension. No real account, search or inventory appears, and no artwork is drawn or AI-generated.',
    files,
  }, null, 2)}\n`);
  console.log(`Generated ${SHOTS.length} store screenshots (${WIDTH}x${HEIGHT}) from the built extension.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Usage: node scripts/screenshots.mjs [--check]');
  await generate({ check: args.includes('--check') });
}

export { generate };
