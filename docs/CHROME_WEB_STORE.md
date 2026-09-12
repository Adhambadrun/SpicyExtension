# Chrome Web Store submission — SpicyExtension 1.0.0

Everything below is paste-ready content for the **Store listing** tab of the Chrome Web Store
Developer Dashboard (`https://chrome.google.com/webstore/devconsole`). Copy each block into the
matching Dashboard field. The upload package is committed:
**`release/spicyextension-1.0.0.zip`**, SHA-256 recorded in `release/checksums.txt`.
Regenerate it with `npm run release:gen` whenever the version or source changes;
`npm run release:check` proves it matches a clean build.

**Official domain:** `spicyextension.vercel.app`, served from the `site/` folder in this repository
and deployed from GitHub through Vercel. The Homepage, Support and Privacy policy URLs below all
resolve to real pages — a missing privacy policy is the single most common reason a submission is
blocked.

---

## 1. Package upload

| Dashboard field | Value |
| --- | --- |
| Package file | `release/spicyextension-1.0.0.zip` (contains `manifest.json` at the archive root) |

A `.crx` is only for direct/local installation and is **not** the Web Store upload format. Do not
upload the `dist/spicyextension` folder or a ZIP built straight from `extension/`. Run
`npm run release:check` before submitting.

---

## 2. Product details

### Title (from the package, ≤ 75 characters)

```text
SpicyExtension
```

### Summary (from the package, ≤ 132 characters)

The Dashboard takes this from `manifest.json`, so it is already filled in for you. The shipped
value is **119 characters**:

```text
Review one selected result area and export it locally as JSON. No automatic uploads, no storage, no background capture.
```

> This field is not editable in the Dashboard. To change it, edit `description` in
> `extension/manifest.json` and re-run `npm run release:gen` so the committed ZIP and its checksum
> are rebuilt; a test enforces the 132-character limit.

### Description (≤ 16,000 characters — the text below is ~3,760)

```text
SpicyExtension captures exactly one result area that you select on a page you are already signed in to, shows it to you as plain JSON, and lets you review and edit it before anything is exported. It runs on one site only, it never uploads anything, and it keeps nothing after you close it.

WHY YOU MIGHT WANT IT

When you need the real structure of a single on-screen result — to document a layout, file a precise bug report, or design against fields that actually exist — a screenshot is not machine-readable and a full page dump is far too much. This tool sits in between: you point at one card, you see exactly what was collected, you delete anything that should not be shared, and then you decide whether to save it.

HOW IT WORKS

1. Sign in on the connected site yourself, in your normal Chrome profile, and open a results page.
2. Click the toolbar icon and choose "Open capture panel".
3. Choose "Select a result area", then point at one visible card. A selection layer outlines the area and shows its size. Use Larger and Smaller, or the arrow keys, to widen or narrow the selection. Escape cancels.
4. Read the JSON in the OUTPUT pane. Edit it freely — it is plain text, and it is never rendered or executed.
5. Tick the review confirmation. Only then do "Download JSON" and "Copy JSON" become enabled.

WHAT IS COLLECTED

Only the subtree you selected: its visible text, and a short allowlist of class, role, label, datetime and test-ID attributes that describe the structure.

Left out: scripts, styles, frames and embedded media, hidden and aria-hidden subtrees, form controls and their values, link destinations, resource URLs, element IDs, event handlers, and arbitrary data attributes. Recognizable email addresses, URLs, bearer tokens and common credential patterns in the visible text are replaced automatically. The page URL's query string and fragment are never exported — the record keeps only the origin and the route.

WHAT IT DOES NOT DO

- No network client, backend, analytics or telemetry, and no automatic upload of any kind. The packaged pages additionally set connect-src 'none', so they cannot make requests at all.
- No cookies, no local or session storage, no passwords and no form values are ever read. Signing in stays entirely between you, Chrome and the website.
- No storage of captures. They live in the panel's memory only. Closing the panel, clearing the capture, reloading, or navigating away discards them.
- No background capture. The content script sits dormant until you press the button; it does not read the page on load.
- It is not a screenshot tool, and it is not a flight search, pricing, booking or inventory tool.

PERMISSIONS

One host permission: https://agentsearch.vercel.app/*, the only site this extension runs on. There is no tabs permission, no storage permission, no scripting permission, no downloads permission and no access to any other site.

PLEASE READ: REDACTION IS BEST EFFORT

Automatic cleanup is not complete anonymization. Names, booking references, phone numbers or unusual identifiers that appear in visible text can survive it. That is exactly why the export button stays disabled until you confirm you have reviewed the JSON. Once you download or copy a file, it is yours to look after — the extension cannot reach it afterwards.

OPEN SOURCE

The full source, the exact package that was uploaded here, and its published checksum are public at https://github.com/Adhambadrun/SpicyExtension so you can verify that the shipped build matches the code.

SCOPE OF THIS VERSION

Version 1.0.0 is the local capture step of a larger project. The wider assistant is not implemented, and the extension's own help page says so plainly rather than implying features that do not exist yet.
```

### Category

```text
Developer Tools
```

Chrome's own guidance describes Developer Tools as extensions that help web developers with tasks
such as debugging and analysing pages, which is what a selected-DOM-to-JSON capture tool does.
*Workflow & Planning* is the reasonable alternative if you would rather present it as a general
productivity utility.

### Language

```text
English (United States)
```

---

## 3. Graphic assets

All of these are committed, and `npm run check` fails if any is missing, stale or the wrong size.

| Dashboard slot | Required | File | Size |
| --- | --- | --- | --- |
| Store icon | Yes | `store/icon-128.png` | 128×128 PNG |
| Screenshot 1 | Yes (1–5) | `store/screenshots/1-expanded-input-output.png` | 1280×800 PNG |
| Screenshot 2 | | `store/screenshots/2-select-one-result-area.png` | 1280×800 PNG |
| Screenshot 3 | | `store/screenshots/3-review-before-sharing.png` | 1280×800 PNG |
| Screenshot 4 | | `store/screenshots/4-toolbar-popup.png` | 1280×800 PNG |
| Screenshot 5 | | `store/screenshots/5-instructions-privacy.png` | 1280×800 PNG |
| Small promo tile | Yes | `store/promo-440x280.png` | 440×280 PNG |
| Marquee promo tile | Optional | `store/marquee-1400x560.png` | 1400×560 PNG |
| Promo video | Optional | none | — |

**Upload the screenshots in numbered order** — the first one is what most users see.

The screenshots are photographs of the built extension, produced by `npm run shots:gen`
(`scripts/screenshots.mjs`). That script loads the real compiled `dist/spicyextension/content.js`
bundle and the real packaged `popup.html` / `help.html`, drives the shipped `BEGIN_CAPTURE` code path
over the committed synthetic fixture, and photographs the result at exactly 1280×800 with the alpha
channel flattened. **No real account, search or inventory appears in them, and no artwork is drawn or
AI-generated.** Networking is blocked during capture.

The icon and both promo tiles come from `npm run store:gen`, composed from the unmodified
`logo.png` plus the shared SpicyTerminal tokens, so the store art cannot drift from the product UI.
Promo tiles are written without an alpha channel, which the Dashboard rejects.

> Earlier revisions of this repository produced a `marquee-1280x800.png`. That is **not** a size the
> Dashboard accepts; the marquee slot is 1400×560 and the small tile is 440×280. The file has been
> replaced, and regeneration deletes the retired name so it cannot be uploaded by mistake.

---

## 4. Additional fields

| Dashboard field | Value |
| --- | --- |
| Official URL | `spicyextension.vercel.app` — select it after verifying the domain in Google Search Console |
| Homepage URL | `https://spicyextension.vercel.app/` |
| Support URL | `https://spicyextension.vercel.app/support.html` |
| Mature content | **No** |

The **Official URL** dropdown only lists domains you have verified as an owner in
[Google Search Console](https://www.google.com/webmasters/tools). Verify `spicyextension.vercel.app`
there first (a DNS TXT record or the HTML-file method both work with Vercel); until then the field
stays "None", which does not block publishing. Setting it is what earns the verified-publisher mark
on the listing.

### Item support

Turn item support **on**, so users are pointed at the support page instead of leaving complaints in
reviews.

---

## 5. Privacy tab

| Dashboard field | Value |
| --- | --- |
| Privacy policy URL | `https://spicyextension.vercel.app/privacy.html` |
| Single purpose | see below |
| Permission justifications | see below |
| Data usage | see below |

### Single purpose (required)

```text
SpicyExtension lets the user select one result area on a single supported website, review it as JSON, and export that JSON locally. It does nothing else.
```

### Host permission justification

```text
The extension requests exactly one host permission, https://agentsearch.vercel.app/*, which is the only site it runs on. A content script installs a dormant message listener on that site's results routes so the toolbar button can open the capture panel in the tab the user is already signed in to. It never reads the page on load: a capture happens only after the user presses the button and then points at one specific element. There is no fetch, XMLHttpRequest, WebSocket, EventSource or sendBeacon anywhere in the shipped code, no cookies or storage permission, and no host permission for any other origin, so nothing can leave the browser except a file or clipboard write the user triggers themselves.
```

The manifest requests **only** `host_permissions`. There is no `permissions` array, no
`web_accessible_resources`, no `externally_connectable`, and `npm run build` fails if any of them
reappears. If the Dashboard asks about a permission not listed here, something is wrong with the
uploaded package — stop and re-check it.

### Data usage declarations

Tick **none** of the data-collection categories, then certify all three statements:

- **I do not sell or transfer user data to third parties**, apart from the approved use cases — accurate: no data ever leaves the browser.
- **I do not use or transfer user data for purposes unrelated to my item's single purpose** — accurate.
- **I do not use or transfer user data to determine creditworthiness or for lending purposes** — accurate.

Justification if asked:

```text
The extension collects nothing. The JSON it produces is generated locally, shown to the user, held only in the panel's memory, and written to disk or the clipboard solely by an explicit user action. There is no server, no analytics, no telemetry and no network client of any kind; the packaged pages set connect-src 'none'. The help page and the listing both state plainly that automatic redaction is best effort and that the user must review a capture before exporting it.
```

### Remote code

Answer **No, I am not using remote code**. Everything is bundled at build time with esbuild, the CSP
is `script-src 'self'; object-src 'none'; base-uri 'none'; connect-src 'none'`, and the build rejects
`eval`, `new Function` and network primitives in the shipped bundles.

---

## 6. Distribution

| Dashboard field | Suggested value |
| --- | --- |
| Visibility | **Unlisted** for the first submission, **Public** once you are happy with it |
| Distribution | All regions |
| Pricing | Free — do not enable "Sell this item" |

Unlisted still requires full review and gives you a shareable link, without the item appearing in
search while the wider project is unfinished. You can switch to Public later without re-uploading.

---

## 7. Before you press Publish

1. `npm ci --ignore-scripts --no-audit --no-fund && npm run check` — icons, store art, screenshots,
   strict TypeScript, ESLint, 187 unit/structural tests and the MV3 build.
2. `npm run release:check` — the committed ZIP equals a fresh build and contains only runtime files.
3. Load `dist/spicyextension` unpacked in real Chrome and re-test the capture / review / export flow,
   the popup on a non-matching tab, and the packaged help page. **This step is required, not
   optional** — see the browser-verification limits in [VERIFICATION.md](VERIFICATION.md).
4. Confirm `https://spicyextension.vercel.app/privacy.html` and `/support.html` are live. The
   Dashboard rejects a listing whose privacy policy URL does not resolve.
5. Set visibility, then submit. First reviews commonly take a few days.
6. For every future upload, bump `extension/manifest.json` **and** `package.json` together (a test
   enforces that they match) and re-run `npm run release:gen`.

---

## 8. Accurate-scope rules for this listing

The listing must not imply that SpicyExtension searches flights, prices inventory, books, or reads an
API. It is a read-only, user-initiated DOM capture tool for one origin, and a step toward a larger
assistant that is still unimplemented. The **SpicyExtension** name is a rebrand only: it does not
remove the single host permission, does not hide which site the extension operates on, and must not
be used to obscure what the extension does. The summary, description and permission justification
above exist so the listing stays accurate — keep them that way when you edit them.
