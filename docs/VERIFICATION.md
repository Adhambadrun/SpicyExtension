# Verification record

2026-09-12 (Africa/Cairo) · inspection build 0.0.2 · final header artwork pending

## Completed locally

| Check | Actual result |
| --- | --- |
| Runtime / dependencies | Node 22.22.3 / npm 10.9.8; clean `npm ci --ignore-scripts --no-audit --no-fund` passed with the exact lockfile. |
| `npm run icons:check` | Pass — 16/32/48/128px PNGs match the unchanged repository `logo.png`. |
| `npm run typecheck` | Pass — strict TypeScript compilation. |
| `npm run lint` | Pass — zero ESLint errors. |
| `npm test` | Pass — **102 tests across nine files**, including branding, theme contrast and structural UI tests. |
| `npm run build` | Pass — MV3 bundle with a shared, local SpicyTerminal stylesheet. |
| `npx playwright test --list` | Pass — **12 browser tests discovered**, not executed. |
| `npm run package` | Pass — 12 runtime files, **50,122-byte** ZIP. |
| ZIP verification | Python `ZipFile.testzip()` and exact-entry checks pass. Packaged icons/theme match the source derivatives. No tests, fixtures, environment files, raw source artwork or source maps are shipped. |
| Determinism | Packaging twice produced identical SHA-256. |
| Local style preview | Packaged help page, both local stylesheets and logo returned HTTP 200. Preview explicitly labels the pending header and is not a Chrome-runtime test. |
| Original inputs | Userscript, MCP ZIP and repository logo SHA-256 checks unchanged. |

Current inspection ZIP SHA-256:

```text
17f1fd5758d8c453f45ef889876a77b4ae97290bc8f8ac6c51f4d8f9d23dd866  bcf-basis-inspector-0.0.2.zip
```

The original tests cover exact host/route checks, named messaging, active-tab error handling, bounded subtree capture, sanitization, best-effort redaction and edited JSON/size validation. The new tests verify logo provenance, shared theme loading, text-token contrast, separate INPUT/OUTPUT regions, expansion without lost redactions, retained consent protection and singleton cleanup.

JSDOM structural tests stub browser-only stylesheet/image loading and geometry. They are **not** evidence of real Chrome layout, decoded UI images, clipboard access, trusted selection-click interception or extension IPC. Build checks reject unexpected permissions, remote execution/network primitives and unsafe HTML assignment.

## Publication scope and deferred CI

The SpicyTerminal styling has been implemented. The separate SpicyExtension header graphic was supplied inline but is not accessible as a workspace file or in the current remote tree. Root `header.png` has been requested so the exact artwork can be embedded. The present text wordmark is explicitly interim. On the renewed PR/merge request, the user approved proceeding with the current inspector with this limitation and the unrun browser tests documented. This is publication of an intermediate inspection tool, not final brand or full-product acceptance.

The unchanged branch push was retried on the renewed request and GitHub again rejected `.github/workflows/inspector.yml` for missing `workflows` permission. The user then explicitly chose **Defer CI and proceed**. The new, never-enabled workflow is now preserved at `docs/ci/inspector.yml.example`, outside GitHub's active workflow directory. Test code and local check commands remain intact. No existing remote workflow, required check or branch protection was removed or bypassed. **No automatic CI or browser-test pass is claimed.** See [the deferred CI instructions](ci/README.md).

## Browser verification — blocked, not passed

No Chromium executable is available locally. Earlier Playwright CDN, official Chrome-for-Testing and Debian mirror attempts failed. Repeated downloads have not been presented as test success.

The built-extension Playwright suite uses real Chrome IPC against an intercepted, clearly synthetic DOM fixture. It now also covers terminal colors, logo decoding, expanded columns, narrow-screen stacking and preservation of reviewed edits. It does not use login credentials or contact real inventory. These 12 tests still need actual browser execution and fixes for any failures before an inspector release is called browser-verified.

## Full-product checks not satisfied

- Actual signed-in Basis result/schema capture and search lifecycle.
- Flight adapter and normalized inventory model.
- BO lead parsing, toolkit migration, flight viewer and full assistant installation.
- Real-session BO/Basis E2E and the original full-product acceptance criteria.

The supplied web-MCP smoke test's upstream `fetch failed` result is documented in [AUDIT.md](AUDIT.md). It is not an inspector test or a successful flight search. Branding, an inspector-only PR or passing synthetic-fixture tests are not completion of the full flight assistant.
