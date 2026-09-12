# Chrome Web Store submission — SpicyExtension 1.0.0

Everything below is the paste-ready content for the Chrome Web Store Developer Dashboard
(`https://chrome.google.com/webstore/devconsole`). The upload file is committed:
**`release/spicyextension-1.0.0.zip`**, SHA-256 recorded in `release/checksums.txt`.
Regenerate and re-commit it with `npm run release:gen` whenever the version or source changes;
`npm run release:check` proves it matches a clean build.

## Upload

| Dashboard field | Value |
| --- | --- |
| Package file to upload | `release/spicyextension-1.0.0.zip` (contains `manifest.json` at the archive root) |
| Item name (≤ 75) | `SpicyExtension` |
| Summary (≤ 132) | `Review one selected result area and export it locally as JSON. No automatic uploads, no storage, no background capture.` |
| Description (≤ 16,000) | see *Full description* below |
| Category | Productivity |
| Language | English (United States) |
| Privacy policy URL | **Required — not in this repository.** Publish a policy you host, then paste its URL. |
| Support email | your developer email |
| Visibility | Public (or Unlisted while the flight assistant is unfinished) |
| Sell this item | No |

A `.crx` is only for direct/local installation and is **not** the Web Store upload format. Do not
upload `dist/spicyextension` (a folder) or a ZIP built from `extension/` — the package must come
from the build, and `npm run release:check` must pass before submitting.

## Full description

```text
SpicyExtension captures exactly one result area that you select on a page you are already signed
into, shows it to you as plain JSON, and lets you review and edit it before you export.

WHAT IT DOES
- You click the toolbar icon, choose "Open capture panel", then select one visible card or details
  area on the page.
- The panel serializes only that selected subtree: visible text plus a small allowlist of class,
  role, label, datetime and test-ID attributes.
- Scripts, styles, frames, form controls, hidden subtrees, link destinations, resource URLs, IDs
  and arbitrary data attributes are omitted. Recognizable email addresses, URLs and common
  credential patterns are replaced on a best-effort basis.
- You read the JSON, edit anything that should not be shared, tick the review confirmation, and only
  then Download JSON or Copy JSON become enabled.

WHAT IT DOES NOT DO
- No network client, backend, analytics, telemetry or automatic upload of any kind. Packaged
  extension pages additionally set connect-src 'none'.
- No cookies, local/session storage, passwords or form field values are ever read. Login stays with
  Chrome and the website.
- No storage: captures live only in the panel's memory, and closing the panel, clearing the capture
  or navigating away discards them.
- It is not a flight-search, pricing, booking or inventory tool, and it is not a screenshot tool.

PRIVACY NOTE
Redaction is best effort, not complete anonymization. Names, booking references, phone numbers or
unusual tokens in visible text can remain. You are expected to read the JSON before you export or
share it. Downloaded files and clipboard contents stay under your control; the extension cannot
erase them afterwards.

STATUS
Version 1.0.0 is the local capture step of a larger project. The full flight assistant is not
implemented, and the packaged help page states this plainly.
```

## Permission justification (Dashboard asks for a reason)

```text
One host permission: https://agentsearch.vercel.app/*, which is the only site this extension runs on.
The content script installs a dormant message listener on the /flights and /search routes so the
toolbar button can open the capture panel in the tab you are already signed into. It never reads the
page on load; capture happens only after you explicitly press the button and then point at one
element. The extension has no fetch/XHR/WebSocket/sendBeacon code, no cookies or storage permission,
and no host permission for any other origin, so nothing can leave the browser except a file or
clipboard write that you trigger yourself.
```

The manifest requests only `host_permissions`. There is no `permissions` array, no
`web_accessible_resources`, no `externally_connectable`, and the build fails
(`npm run build`) if any of them reappear.

## Data usage declarations

- **Do not sell or transfer user data to third parties** — accurate: no data leaves the browser.
- **Use or transfer user data to provide/improve the product** — not needed; nothing is collected.
- **No personally identifiable information** is claimed; the exported file is generated locally for
  the user, and the help page warns that visible personal text can survive redaction.
- **No remote code**: everything is bundled at build time (esbuild), the CSP is
  `script-src 'self'; object-src 'none'; base-uri 'none'; connect-src 'none'`, and the build rejects
  `eval`, `new Function` and network primitives in the shipped bundles.
- Single purpose: "select one result area, review it, export it locally." Nothing else.

## Store images

| Asset | File | Size | Status |
| --- | --- | --- | --- |
| Store icon | `store/icon-128.png` | 128×128 PNG | committed, derived from `logo.png` |
| Banner / marquee | `store/marquee-1280x800.png` | 1280×800 PNG | committed, derived from `logo.png` + `terminal.css` tokens |
| Small promo tile | `store/marquee-1280x800.png` cropped in the Dashboard | 440×280 | derive in Dashboard, or re-run `npm run store:gen` after adding a spec |
| Screenshots (1–5, 1280×800 or 640×400) | **not fabricated here** | — | take them in real Chrome from the built extension |

`npm run store:gen` re-derives the two committed images from the unmodified repository logo and the
shared SpicyTerminal tokens; `npm run store:check` (part of `npm run check`) fails when they are
missing, stale for the current `logo.png`/version, or not the exact PNG size. **No AI-generated
artwork is used and none should be substituted.** The real screenshots must be taken after loading
the unpacked build — the popup, the capture panel in both Compact and Expand layouts, and the
packaged help page — because inventing a screenshot would misrepresent the product. The supplied
`header.png` wordmark is still unavailable as a file, so the banner uses typographic branding
exactly like the extension UI does.

## Before you press Publish

1. `npm ci --ignore-scripts --no-audit --no-fund && npm run check` — icons, store art, strict
   TypeScript, ESLint, unit tests and the MV3 build.
2. `npm run release:check` — the committed ZIP equals a fresh build and contains only runtime files.
3. Load `dist/spicyextension` unpacked in Chrome and re-test the capture/review/export flow, the
   popup on a non-matching tab, and the packaged help page. The Playwright browser suite exists but
   has **not** been run in this environment (no Chromium binary available), which is recorded in
   [VERIFICATION.md](VERIFICATION.md); manual Chrome testing is therefore required, not optional.
4. Host a privacy policy and paste its URL; the Dashboard rejects a listing without one.
5. Set the listing visibility. If this item was already published under the previous working title,
   updating it changes the public name — expect the old title to disappear from search results.
6. Version numbers must increase for every new upload; bump `extension/manifest.json` and
   `package.json` together (a test enforces that they match) and re-run `npm run release:gen`.

## Accurate-scope rules for this listing

The listing must not imply that SpicyExtension searches flights, prices inventory, books, or reads an
API. It is a read-only, user-initiated DOM capture tool for one origin, and a step toward the flight
assistant that is still unimplemented. The name change to **SpicyExtension** is a rebrand only: it
does not remove the single host permission, does not hide which site the extension operates on, and
must not be used to obscure what the extension does — the summary, description and permission
justification above exist so the listing stays accurate.
