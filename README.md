# SpicyExtension

**Everything in this repository ships under one name: SpicyExtension.** The old working title was removed from the manifest, the packaged pages, the export format, the build output, the scripts, the tests and the docs. The only product/brand strings a reviewer or user sees are `SpicyExtension` and the `SpicyTerminal` visual language.

## Current deliverable: local capture panel (1.0.0)

**The full flight assistant is not complete.** The source audit found that the supplied MCP archive is a public web-search connector, not a flight engine. The user chose to use the existing signed-in session of the connected site and then explicitly requested a local Chrome capture tool to obtain the missing result structure.

The capture panel is implemented in TypeScript / Manifest V3. It lets the agent **select one result area, review/redact it, and download or copy a JSON snapshot locally**. It does not search, price, normalize inventory or book flights, and it does not claim the future flight assistant's acceptance criteria are met.

**Design pass / generated header:** The panel follows the requested SpicyTerminal style. The exact header graphic was supplied inline but its binary never reached the repository, so root `header.png` is now **generated** from the same tokens and typographic construction the store tiles use, and it replaces the interim HTML wordmark on the popup, help page and capture panel. It is not the supplied artwork: drop the real file in and run `npm run header:gen` to re-derive the packaged copy. The store banner wordmark remains typographic for the same reason.

**Browser-unverified build:** TypeScript, lint, unit/structural tests and packaging pass. The browser tests are discovered but have not run, because no Chromium binary is obtainable in this environment. Automatic CI is deferred with user approval because the connection cannot publish workflow files; the complete workflow is preserved as an [inactive template](docs/ci/README.md). No CI pass is claimed. See [the verification record](docs/VERIFICATION.md).

### Publish-ready package

The file you upload to the Chrome Web Store is committed, so publishing does not depend on someone's local build:

```text

```text
release/spicyextension-1.0.0.zip               ← upload this
release/checksums.txt                          ← its recorded SHA-256
header.png                                     ← brand header wordmark (generated; docs/BRANDING.md)
extension/assets/icon-{16,32,48,128}.png       ← in-product icons; 16/32/48 drop the signature
store/icon-128.png                             ← 128x128 store icon: 96x96 logo + 16px padding
store/promo-440x280.png                        ← required small promo tile
store/marquee-1400x560.png                     ← optional marquee promo tile
store/screenshots/*.png                        ← five 1280x800 shots of the real built UI
site/                                          ← the spicyextension.vercel.app website
docs/CHROME_WEB_STORE.md                       ← every Dashboard field, ready to paste
```

The listing also needs a reachable privacy policy. `site/` is the deployed source for
**spicyextension.vercel.app**, including `/privacy.html` and `/support.html`, which are the URLs
given in the submission document.

`npm run release:check` rebuilds the extension and proves `release/` is byte-identical to the fresh build, that `manifest.json` sits at the ZIP root, and that no source, test, fixture, map or private file is inside. The archive is the Web Store format; a `.crx` is only for direct/local installation and is not what the Dashboard accepts.

### Install and capture

1. Extract `release/spicyextension-1.0.0.zip` (or build it below).
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json` (or `dist/spicyextension`).
3. In the same Chrome profile, sign in on [the connected site](https://agentsearch.vercel.app/flights) normally. **Reload that tab after extension installation/reload.** Run a real search you are authorized to make.
4. Click the extension icon → **Open capture panel** → **Select a result area**. Click inside a flight card; use **Larger / Smaller** or ↑ / ↓ to adjust. Escape cancels. Drag the panel header if it obscures the card.
5. Review and redact the plain JSON. Confirm the review, then **Download JSON**. Expand itinerary details on the site and capture them separately if useful.
6. Share the reviewed files yourself. Do not send cookies, request headers, passwords, API keys, account data, or an unsanitized HAR.

See [full instructions, privacy and limitations](docs/CAPTURE.md). Complete help is also packaged in the extension; no external documentation or font is required.

### Build and verify

Node **22.22.3** (see `.nvmrc`) and npm:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check                 # icons, store art, strict TypeScript, ESLint, unit tests, MV3 build
npx playwright install chromium
npm run test:e2e              # built, unpacked extension against a local synthetic DOM fixture
npm run package               # artifacts/spicyextension-1.0.0.zip
npm run release:check         # proves the committed release/ ZIP matches a fresh build
npm run release:gen           # only when the version or source changed: rewrite release/ + checksums
```

On Linux, Playwright may need `npx playwright install --with-deps chromium`. A locally installed compatible Chromium can be selected with `CHROMIUM_PATH=/path/to/chromium npm run test:e2e`. Packaging is deterministic for the same source/dependency/runtime versions. `dist/`, generated browser profiles and test reports stay out of Git; `release/` and `store/` are deliberately committed because they are the publish inputs.

### Naming rules that are enforced by tests

`tests/unit/naming.test.ts` fails the build if the retired working title, its vendor prefix or the old tool word reappear in any tracked text file, including in `extension/manifest.json` (`name`, `description`, `action.default_title`), the packaged pages, the exported JSON `format`, the download filename prefix, the DOM root id, the message constants, the build output directory and the ZIP name. Two things are intentionally exempt and must stay exactly as received: the user-supplied source files `BCF Floating Flight Search Widget.txt` and `agentsearch-mcp-master.zip`, whose bytes are hash-verified as unchanged, and the literal origin `https://agentsearch.vercel.app` that the single host permission requires.

### Repository logo and store art

Version 1.0.0 derives the Chrome icons from the repository's unchanged **[`logo.png`](logo.png)**. The panel, popup and help use the **SpicyTerminal** brand language: near-black panes, thin borders, monospace text, red/white identity and green output. **Expand** puts INPUT and OUTPUT side by side on wide screens; Compact stacks them without losing edits.

`npm run store:gen` derives the 128px store icon and both promo tiles (440×280 and 1400×560, the sizes the Dashboard actually accepts) from the same `logo.png` and the same `terminal.css` tokens — no cropping, no recolouring, no generated artwork. The store icon is laid out to Chrome's image guidelines: 96×96 of the untouched tile inside 16px of transparent padding, the outer 4px kept fully transparent so the UI can add its own edge, and the subtle white outer glow that guide recommends for a mostly-dark icon so it keeps a silhouette on a dark theme. `npm run shots:gen` photographs the **real built extension** — the compiled content bundle driven through its shipped capture path over the committed synthetic fixture, plus the packaged popup and help pages — into five exact 1280×800 screenshots; nothing is mocked up or AI-generated. `npm run store:check` and `npm run shots:check` (both part of `npm run check`) fail when any asset is missing, stale for the current `logo.png`/version, or not the exact PNG size Chrome Web Store wants. `npm run header:gen` renders the brand `header.png` and derives the packaged copy every surface embeds; `npm run header:check` verifies that pair. The supplied header artwork is still the intended master whenever it becomes available. See [branding and regeneration instructions](docs/BRANDING.md).

### Architecture and privacy

- `extension/src/background/`: validates popup sender and routes one named operation to the active, exact site tab.
- `extension/src/content/`: dormant Chrome-message listener, singleton Shadow DOM capture panel, bounded selection overlay, review/export UI and cleanup.
- `extension/src/core/`: strict origin/route policy, capture model/validation, selected-subtree sanitizer and best-effort text redaction.
- `extension/pages/`: packaged popup and privacy/help page.
- `extension/src/styles/terminal.css`: shared SpicyTerminal tokens and brand styling for every surface.
- `scripts/`: bundling, icon and store-art derivation from the repository's `logo.png`, deterministic packaging, and release-package verification.
- `tests/`: unit/security checks, naming enforcement and built-extension browser tests. Fixtures are synthetic **sanitizer/UI tests**, not invented response fixtures, and are not shipped.

Only `https://agentsearch.vercel.app/*` is granted. No cookies, storage, downloads, clipboard, scripting, broad tabs or other-site permissions are requested. No backend, network client, analytics, remote code or automatic upload is present. Chrome and the connected website handle login; the extension never copies authentication. Exported data is a diagnostic DOM snapshot, not an API contract or normalized flight result.

**Redaction is not complete anonymization.** Visible names/references/unusual secrets can remain; the agent must review before exporting and sharing. Closing/navigating clears in-memory captures, but does not erase the clipboard or already downloaded files.

## Audit and remaining work

- [Complete original source audit and migration map](docs/AUDIT.md)
- [Provisional full-assistant architecture and acceptance plan](docs/ARCHITECTURE.md)
- [Signed-in browser integration plan](docs/BROWSER_SESSION.md)
- [Received visual-reference interpretation](docs/VISUAL_REFERENCES.md)
- [Chrome Web Store submission fields](docs/CHROME_WEB_STORE.md)
- [Verification record](docs/VERIFICATION.md)

Both original inputs remain byte-for-byte unchanged. The existing userscript can continue to be used; the capture panel does not replace or inject into the back-office tooling.

**Next:** review the real result/card-detail snapshots, establish the actual signed-in search lifecycle, then implement the adapter, flight models/viewer, parser/tool migration and real-session tests. The full-product work must stay unmerged until those release gates are satisfied. A capture-only build or passing fixture tests is not live-flight E2E verification.
