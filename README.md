# SpicyExtension — BCFlights

Replacement for the supplied BCF userscript, with a future real-flight option viewer.

## Current deliverable: local Basis inspector (0.0.2)

**The full flight assistant is not complete.** The source audit found that the supplied MCP archive is a public web-search connector, not a flight engine. The user chose to use the existing signed-in Basis session and then explicitly requested a local Chrome inspector to obtain the missing result structure.

The inspector is now implemented in TypeScript / Manifest V3. It lets the agent **select one result area, review/redact it, and download or copy a JSON snapshot locally**. It does not search, price, normalize inventory or book flights, and it does not claim the future flight assistant's acceptance criteria are met.

**Design pass / final header pending:** The inspector now follows the requested SpicyTerminal style. The exact SpicyExtension header graphic is visible inline but is not available as a repository file; root `header.png` is still needed to replace the interim text wordmark. The user approved proceeding with the current inspector while this limitation remains documented.

**Browser-unverified inspection build:** TypeScript, lint, 102 unit/structural tests and packaging pass. The 12 browser tests are discovered but have not run. Automatic CI is deferred with user approval because the connection cannot publish workflow files. The complete workflow is preserved as an [inactive template](docs/ci/README.md); no CI pass is claimed. See [the verification record](docs/VERIFICATION.md).

### Install and capture

1. Download/extract `bcf-basis-inspector-0.0.2.zip`, or build it below.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json` (or `dist/basis-inspector`).
3. In the same Chrome profile, sign in to [Basis](https://agentsearch.vercel.app/flights) normally. **Reload the Basis tab after extension installation/reload.** Run a real search you are authorized to make.
4. Click the extension icon → **Open inspector** → **Select a result area**. Click inside a flight card; use **Larger / Smaller** or ↑ / ↓ to adjust. Escape cancels. Drag the inspector header if it obscures the card.
5. Review and redact the plain JSON. Confirm the review, then **Download JSON**. Expand itinerary details in Basis and capture them separately if useful.
6. Share the reviewed files here yourself. Do not send cookies, request headers, passwords, API keys, account data, or an unsanitized HAR.

See [full instructions, privacy and limitations](docs/INSPECTOR.md). Complete help is also packaged in the extension; no external documentation or font is required.

### Build and verify

Node **22.22.3** (see `.nvmrc`) and npm:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check                 # strict TypeScript, ESLint, unit tests, MV3 build
npx playwright install chromium
npm run test:e2e              # built, unpacked extension against a local synthetic DOM fixture
npm run package               # artifacts/bcf-basis-inspector-0.0.2.zip
```

### Chrome Web Store upload

Upload the versioned `artifacts/bcf-basis-inspector-0.0.2.zip` produced by `npm run package` to the Chrome Web Store Developer Dashboard. The archive contains `manifest.json` at its root and no source, test, dependency, or private files. Chrome Web Store accepts the ZIP package; a `.crx` is for direct/local installation and is not the Web Store publishing format. Build artifacts remain intentionally untracked and should be regenerated for each release.

On Linux, Playwright may need `npx playwright install --with-deps chromium`. A locally installed compatible Chromium can be selected with `CHROMIUM_PATH=/path/to/chromium npm run test:e2e`. The package is deterministic for the same source/dependency/runtime versions. Generated browser profiles, test reports and ZIP files stay out of Git.

### Repository logo

Version 0.0.2 derives the Chrome icons from the repository's unchanged **[`logo.png`](logo.png)**. The inspector, popup and help use the newer **SpicyTerminal** brand language: near-black panes, thin borders, monospace text, red/white identity and green output. **Expand** puts INPUT and OUTPUT side by side on wide screens; Compact stacks them without losing edits.

The current header uses the local icon and interim typography, **not the supplied header image**. The exact `header.png` artwork will be embedded locally once accessible. No remote logo/font request or extra permission is added. See [branding and regeneration instructions](docs/BRANDING.md).

### Architecture and privacy

- `extension/src/background/`: validates popup sender and routes one named operation to the active, exact Basis tab.
- `extension/src/content/`: dormant Chrome-message listener, singleton Shadow DOM inspector, bounded selection overlay, review/export UI and cleanup.
- `extension/src/core/`: strict origin/route policy, capture model/validation, selected-subtree sanitizer and best-effort text redaction.
- `extension/pages/`: packaged popup and privacy/help page.
- `extension/src/styles/terminal.css`: shared SpicyTerminal tokens and brand styling for every surface.
- `scripts/`: bundling, icon derivation from the repository's `logo.png`, deterministic packaging and build-boundary checks.
- `tests/`: unit/security checks and built-extension browser tests. Fixtures are synthetic **sanitizer/UI tests**, not invented Basis response fixtures, and are not shipped.

Only `https://agentsearch.vercel.app/*` is granted. No cookies, storage, downloads, clipboard, scripting, broad tabs or other-site permissions are requested. No backend, network client, analytics, remote code or automatic upload is present. Chrome/the source website handles login; the extension never copies authentication. Exported data is a diagnostic DOM snapshot, not an API contract or normalized flight result.

**Redaction is not complete anonymization.** Visible names/references/unusual secrets can remain; the agent must review before exporting and sharing. Closing/navigating clears in-memory captures, but does not erase the clipboard or already downloaded files.

## Audit and remaining work

- [Complete original source audit and migration map](docs/AUDIT.md)
- [Provisional full-assistant architecture and acceptance plan](docs/ARCHITECTURE.md)
- [Signed-in browser integration plan](docs/BROWSER_SESSION.md)
- [Received visual-reference interpretation](docs/VISUAL_REFERENCES.md)
- [Verification record](docs/VERIFICATION.md)

Both original inputs remain byte-for-byte unchanged. The existing userscript can continue to be used; this inspector does not replace or inject into BO.

**Next:** inspect the reviewed real Basis result/card-detail snapshots, establish the actual signed-in search lifecycle, then implement the adapter, flight models/viewer, BO parser/tool migration and real-session tests. The full-product PR must remain unmerged until those release gates are satisfied. An inspector-only build or passing fixture tests is not live-flight E2E verification.
