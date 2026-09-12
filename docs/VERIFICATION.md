# Verification record

2026-09-12 (Africa/Cairo) · publish build 1.0.0 · renamed to a single product name · final header artwork pending

## What changed in this build

The extension was rebranded to exactly one name, **SpicyExtension**. The retired working title, its
vendor prefix and the old tool word were removed from the manifest, the packaged popup/help pages,
the panel UI, the exported JSON `format` and download filenames, the DOM root id, the internal message
constants, the build output directory, the ZIP name, the scripts, the tests and every document.
Renamed files: `extension/src/content/capture-panel.ts`, `extension/src/styles/capture-panel.css`,
`extension/src/background/capture.ts`, `tests/unit/capture-ui.test.ts`, `tests/e2e/capture.spec.ts`,
`docs/CAPTURE.md`, `docs/ci/capture.yml.example`. The version moved 0.0.2 → 1.0.0 because this is the
build intended for upload.

## Completed locally

| Check | Actual result |
| --- | --- |
| Runtime / dependencies | Node 22.22.3 / npm 10.9.8; clean `npm ci --ignore-scripts --no-audit --no-fund` with the exact lockfile. |
| `npm run icons:check` | Pass — 16/32/48/128px PNGs match the unchanged repository `logo.png`. |
| `npm run store:check` | Pass — `store/icon-128.png` and `store/marquee-1280x800.png` match their recorded bytes, exact PNG sizes, and the current `logo.png` hash and manifest version. |
| `npm run typecheck` | Pass — strict TypeScript compilation. |
| `npm run lint` | Pass — zero ESLint errors. |
| `npm test` | Pass — **174 tests across 11 files**, including the new naming, package and store-asset suites. |
| `npm run naming` coverage | The naming suite scans 60 tracked text files by content and by file name; the two supplied originals are exempt only as received filenames. |
| `npm run build` | Pass — MV3 bundle in `dist/spicyextension` with the shared local SpicyTerminal stylesheet; permission/network/unsafe-execution build guards intact. |
| `npm run package` | Pass — 12 runtime files, **50,088-byte** `artifacts/spicyextension-1.0.0.zip`. |
| `npm run release:check` | Pass — the committed `release/spicyextension-1.0.0.zip` is byte-identical to a fresh build, `manifest.json` is at the archive root, no source/test/fixture/map/lockfile is inside, and the embedded manifest equals the repository manifest. |
| Determinism | Packaging twice produced the identical SHA-256 below. |
| ZIP structure | `scripts/bytes.mjs` inflates every entry and verifies its CRC-32 and size; a corrupt or substituted entry fails the check. |
| `npx playwright test --list` | Pass — **12 browser tests discovered**, not executed. |
| Original inputs | `BCF Floating Flight Search Widget.txt`, `agentsearch-mcp-master.zip` and `logo.png` SHA-256 checks unchanged (byte-for-byte, names included). |

Committed publish ZIP SHA-256:

```text
3f7e9ee38eaf9e65fa78f32195d91200545c0f97d051b2bde4e0c078ed6f958f  release/spicyextension-1.0.0.zip
```

Also recorded in `release/checksums.txt`; `npm run release:gen` is the only command that may rewrite it,
and `tests/unit/publish.test.ts` re-verifies it in `npm test`.

## What the tests do and do not prove

The original tests cover exact host/route checks, named messaging, active-tab error handling, bounded
subtree capture, sanitization, best-effort redaction and edited JSON/size validation. The branding and
theme tests cover logo provenance, shared theme loading and token contrast. The structural JSDOM tests
cover separate INPUT/OUTPUT regions, expansion without lost redactions, consent gating and singleton
cleanup. The new naming test proves the rebrand cannot silently regress, the publish test proves the
committed ZIP and store images are current, and the release script proves the archive contains exactly
the built runtime.

JSDOM structural tests stub browser-only stylesheet/image loading and geometry. They are **not**
evidence of real Chrome layout, decoded UI images, clipboard access, trusted selection-click
interception or extension IPC. Build checks reject unexpected permissions, remote execution/network
primitives and unsafe HTML assignment.

## Browser verification — blocked, not passed

No Chromium executable is available in this environment, so the 12 Playwright tests were only
discovered. Earlier Playwright CDN, official Chrome-for-Testing and Debian mirror download attempts
failed; repeated download attempts are not presented as test success. The suite drives real
extension-to-content Chrome IPC against an intercepted, clearly synthetic DOM fixture and covers
terminal colors, logo decoding, expanded columns, narrow-screen stacking and preservation of reviewed
edits. It never uses login credentials or contacts real inventory. **A capture release is not
browser-verified until these run green against the unpacked build, and the Web Store checklist in
[CHROME_WEB_STORE.md](CHROME_WEB_STORE.md) therefore requires manual Chrome testing.**

## Publication scope and deferred CI

The SpicyTerminal styling is implemented. The separate header graphic was supplied inline but is not
accessible as a workspace file or in the current remote tree, so root `header.png` is still requested;
the popup, help page, panel and the derived store banner all use interim typographic branding. No
AI-generated artwork was substituted — `npm run store:gen` only composes the unmodified `logo.png` with
the shared SpicyTerminal tokens.

Publishing GitHub workflow files is still blocked: the connection lacks the `workflows` permission, so
`.github/workflows/capture.yml` cannot be created. The user previously chose **Defer CI and proceed**;
the complete workflow is preserved as [`docs/ci/capture.yml.example`](ci/README.md) outside GitHub's
active workflow directory and does not run. No existing remote workflow, required check or branch
protection was removed or bypassed, and no CI pass is claimed. This is publication of an intermediate
capture tool with a rebrand and a committed upload package, not final brand or full-product acceptance.

## Full-product checks not satisfied

- Actual signed-in result/schema capture and the real search lifecycle on the connected site.
- Flight adapter and normalized inventory model.
- Back-office lead parsing, toolkit migration, flight viewer and full assistant installation.
- Real-session end-to-end tests and the original full-product acceptance criteria.

The supplied web-MCP smoke test's upstream `fetch failed` result is documented in [AUDIT.md](AUDIT.md).
It is not a capture test or a successful flight search. A rebrand, a passing packaging check, a
capture-only PR or passing synthetic-fixture tests are not completion of the full flight assistant.
