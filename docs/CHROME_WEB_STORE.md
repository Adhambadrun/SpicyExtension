# Publishing SpicyExtension 1.0.0 to the Chrome Web Store

A complete walkthrough of the Developer Dashboard, written against the exact
**"Unable to publish"** list the Dashboard produced for item ID
`imjcaadfkmaoldbncloafhocajajliol`. Every field below is paste-ready.

**Work through the tabs in this order** — Settings first, because the contact-email
verification takes the longest and blocks everything else:

1. [Account settings](#1-account-settings) — contact email + verification *(2 blockers)*
2. [Store listing](#2-store-listing-tab) — description, category, language, graphics *(4 blockers)*
3. [Privacy practices](#3-privacy-practices-tab) — single purpose, justifications, certification *(4 blockers)*
4. [Distribution](#4-distribution-tab)
5. [Save draft and submit](#5-save-draft-and-submit)

> **Save Draft after every tab.** The Dashboard does not autosave, and moving between
> tabs with unsaved changes silently loses them.

---

## Blocker checklist

| # | Dashboard error | Where | Fixed by |
| --- | --- | --- | --- |
| 1 | You must provide a contact email | Settings | [§1](#1-account-settings) |
| 2 | You must verify the publisher's contact email | Settings | [§1](#1-account-settings) |
| 3 | The detailed description is too short or is missing | Store listing | [§2.1](#21-description) |
| 4 | Please select a Category | Store listing | [§2.2](#22-category) |
| 5 | Language is not selected | Store listing | [§2.3](#23-language) |
| 6 | Icon image is missing | Store listing | [§2.4](#24-store-icon) |
| 7 | At least one screenshot or video is required | Store listing | [§2.5](#25-screenshots) |
| 8 | The single purpose description is required | Privacy practices | [§3.1](#31-single-purpose) |
| 9 | A justification for host permission use is required | Privacy practices | [§3.2](#32-host-permission-justification) |
| 10 | A justification for remote code use is required | Privacy practices | [§3.3](#33-remote-code) |
| 11 | You must certify that your data usage complies | Privacy practices | [§3.5](#35-certification) |

---

## 1. Account settings

*Fixes blockers 1 and 2. Do this first — verification is an email round-trip.*

1. Open the **☰ menu** (top left) → **Account** (or go straight to
   `https://chrome.google.com/webstore/devconsole/settings`).
2. Under **Contact email**, enter an address you can read right now.
   `adhambadraan@gmail.com` is the publisher account, so that is the obvious choice.
3. Press **Save**.
4. Click **Verify** next to the address. Google sends a confirmation mail — open it and
   follow the link. The Settings page should then show the address as *Verified*.
5. Return to the item. Both email blockers clear.

> This address is **not** shown publicly on the listing; it is how Google contacts you
> about reviews, policy notices and takedowns. Use one you actually monitor, or you will
> miss a removal warning.

---

## 2. Store listing tab

### 2.1 Description

*Fixes blocker 3 (minimum 25 characters).*

Paste the following into the **Description** box. It is ~3,760 of the 16,000 characters
allowed, opens with a plain statement of what the item does, and makes no claim the
extension cannot back up.

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

**Title** and **Summary** are greyed out because they come from `manifest.json` — nothing to
do. For the record, the shipped summary is 119 of the 132 characters allowed:

```text
Review one selected result area and export it locally as JSON. No automatic uploads, no storage, no background capture.
```

To change either one you must edit `extension/manifest.json`, re-run `npm run release:gen`,
and upload the rebuilt ZIP.

### 2.2 Category

*Fixes blocker 4.*

```text
Developer Tools
```

In the dropdown this sits under the **Productivity** group. Chrome's guidance describes
Developer Tools as extensions that help web developers with tasks such as debugging and
analysing pages, which is what a selected-DOM-to-JSON capture tool does. If you would
rather frame it as a general utility, **Workflow & Planning** is the defensible
alternative — but do not pick something unrelated, as a mismatched category is a review
risk.

### 2.3 Language

*Fixes blocker 5.*

```text
English (United States)
```

### 2.4 Store icon

*Fixes blocker 6. The screenshot shows "Error: The image size is incorrect" — that is the
Dashboard rejecting whatever file was dropped in, not a missing one.*

Upload exactly this file:

```text
store/icon-128.png
```

It is a 128×128 PNG with 96×96 of artwork centred inside transparent padding, which is
what [Chrome's image guidelines](https://developer.chrome.com/docs/webstore/images#icons)
ask for: no border drawn on the image, and readable on both light and dark backgrounds.

If you still get a size error, you almost certainly picked a different file. Confirm
before uploading:

```bash
node -e "const b=require('fs').readFileSync('store/icon-128.png');console.log(b.readUInt32BE(16)+'x'+b.readUInt32BE(20))"
# → 128x128
```

Do **not** upload `logo.png` (1254×1254) or any of the `extension/assets/icon-*.png`
files — those are the in-product icons, and only the 128 is a store icon.

### 2.5 Screenshots

*Fixes blocker 7. At least one is required; five is the maximum and what we have.*

Upload all five **in this order** — the first is the one most users actually see:

| Order | File | Shows |
| --- | --- | --- |
| 1 | `store/screenshots/1-expanded-input-output.png` | Expanded INPUT/OUTPUT layout, reviewed, exports unlocked |
| 2 | `store/screenshots/2-select-one-result-area.png` | The selection overlay outlining one whole card |
| 3 | `store/screenshots/3-review-before-sharing.png` | Review step with export still disabled |
| 4 | `store/screenshots/4-toolbar-popup.png` | The toolbar popup and its privacy summary |
| 5 | `store/screenshots/5-instructions-privacy.png` | The packaged instructions / privacy page |

All five are exactly 1280×800, 24-bit PNG, no alpha, full bleed. They are photographs of
the real built extension — `npm run shots:gen` runs the compiled `content.js` through its
shipped capture path over a synthetic fixture — so they show the genuine interface and
genuine sanitized JSON. No real account, search or inventory appears in them.

### 2.6 Promotional tiles

Not blockers, but the small tile is required before the item can be *featured*, and a
listing with tiles looks far better in search results.

| Slot | File | Size |
| --- | --- | --- |
| Small promo tile | `store/promo-440x280.png` | 440×280 |
| Marquee promo tile | `store/marquee-1400x560.png` | 1400×560 |

Both are 24-bit PNG with no alpha channel, which the Dashboard requires.

> Ignore any older `marquee-1280x800.png` you may remember — that was never a valid Web
> Store size. It has been removed from the repository.

### 2.7 Additional fields

| Field | Value |
| --- | --- |
| Official URL | `spicyextension.vercel.app` — only selectable after Search Console verification; leaving it "None" does not block publishing |
| Homepage URL | `https://spicyextension.vercel.app/` |
| Support URL | `https://spicyextension.vercel.app/support.html` |
| Mature content | **No** |
| Item support | **On** |

Both URLs must be live before you submit — see [§6](#6-deploy-the-website-first).

---

## 3. Privacy practices tab

*Fixes blockers 8, 9, 10 and 11. This tab is the most common cause of rejection, so the
wording below is deliberately specific and verifiable against the source.*

### 3.1 Single purpose

*Fixes blocker 8.*

```text
SpicyExtension lets the user select one result area on a single supported website, review it as JSON, and export that JSON locally. It does nothing else.
```

### 3.2 Host permission justification

*Fixes blocker 9. Field label: "Host permission" / `https://agentsearch.vercel.app/*`.*

```text
The extension requests exactly one host permission, https://agentsearch.vercel.app/*, which is the only site it runs on. A content script installs a dormant message listener on that site's results routes so the toolbar button can open the capture panel in the tab the user is already signed in to. It never reads the page on load: a capture happens only after the user presses the button and then points at one specific element. There is no fetch, XMLHttpRequest, WebSocket, EventSource or sendBeacon anywhere in the shipped code, no cookies or storage permission, and no host permission for any other origin, so nothing can leave the browser except a file or clipboard write the user triggers themselves.
```

The manifest requests **only** `host_permissions` — no `permissions` array, no
`web_accessible_resources`, no `externally_connectable`. If the Dashboard asks you to
justify any other permission, the wrong package was uploaded; stop and re-check it.

### 3.3 Remote code

*Fixes blocker 10.*

Select:

```text
No, I am not using remote code
```

If a justification box appears anyway, paste:

```text
The extension executes no remote code. All JavaScript is bundled at build time with esbuild and shipped inside the package. The content security policy for extension pages is script-src 'self'; object-src 'none'; base-uri 'none'; connect-src 'none', and the build fails if eval, new Function, or any network primitive appears in the shipped bundles. No script, stylesheet, font or image is fetched from a remote server at runtime.
```

### 3.4 Data usage

Tick **none** of the data-collection categories. The extension collects nothing: no
personally identifiable information, no health, financial, authentication, personal
communications, location, web history or user activity, and no website content is
transmitted anywhere.

If asked to elaborate:

```text
The extension collects nothing. The JSON it produces is generated locally, shown to the user, held only in the panel's memory, and written to disk or the clipboard solely by an explicit user action. There is no server, no analytics, no telemetry and no network client of any kind; the packaged pages set connect-src 'none'. The help page and the listing both state plainly that automatic redaction is best effort and that the user must review a capture before exporting it.
```

> **Why "no data collected" is accurate here.** Google's definition of collection is
> transmitting data off the user's machine. A capture never leaves the browser unless the
> user saves it themselves, so there is nothing to declare. Do not tick a category "to be
> safe" — an inaccurate declaration is itself a policy violation.

### 3.5 Certification

*Fixes blocker 11.* Tick all three, which are accurate for this extension:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### 3.6 Privacy policy URL

```text
https://spicyextension.vercel.app/privacy.html
```

Must resolve before you submit, or the Dashboard rejects the listing.

---

## 4. Distribution tab

| Field | Suggested value |
| --- | --- |
| Visibility | **Unlisted** for the first submission, **Public** once you are happy |
| Distribution | All regions |
| Pricing | Free — do not enable "Sell this item" |

Unlisted still gets a full review and a shareable link, but keeps the item out of search
while the wider project is unfinished. Switching to Public later needs no re-upload.

---

## 5. Save draft and submit

1. Press **Save draft**.
2. Press **Why can't I submit?** — the list should now be empty.
3. Press **Submit for review**.
4. If asked, state that the extension is not designed for children.

First reviews commonly take a few days; items with host permissions sometimes take longer.

### Before you press submit

1. `npm ci --ignore-scripts --no-audit --no-fund && npm run check` — icons, store art,
   screenshots, strict TypeScript, ESLint, 194 tests and the MV3 build.
2. `npm run release:check` — the committed ZIP equals a fresh build, runtime files only.
3. **Load `dist/spicyextension` unpacked in real Chrome** and re-test the capture, review
   and export flow, the popup on a non-matching tab, and the packaged help page. This is
   required, not optional — the automated browser suite has not been run in this
   environment, as recorded in [VERIFICATION.md](VERIFICATION.md).
4. Confirm the privacy and support URLs are live.

---

## 6. Deploy the website first

The Homepage, Support and **Privacy policy** URLs must resolve before submitting.

### Fixing the failed Vercel build

The deploy log shows two problems:

```text
Cloning github.com/Adhambadrun/SpicyExtension (Branch: main, Commit: 48af959)
...
> node scripts/build.mjs                 ← built the EXTENSION, not the site
Error: No Output Directory named "public" found after the Build completed.
```

1. **It built `main` at commit `48af959`**, which is before this work existed, so there was
   no `vercel.json` and no `site/` folder to publish.
2. **It ran `npm run build`**, which is the extension's esbuild bundler. That writes
   `dist/spicyextension`, so Vercel looked for a `public/` directory and found nothing.

Both are fixed by the `vercel.json` in this branch, which pins the output directory to
`site/` and replaces the build and install commands with no-ops:

```json
{
  "framework": null,
  "installCommand": "echo 'Static site: no dependencies to install.'",
  "buildCommand": "echo 'Static site: nothing to build; publishing site/ as-is.'",
  "outputDirectory": "site"
}
```

**So: merge this branch into `main` before redeploying.** Then in Vercel:

1. **Settings → Git** — confirm the Production Branch is `main`.
2. **Settings → Build & Deployment** — leave Framework Preset as *Other* and leave the
   command overrides **off**; `vercel.json` now supplies them. If the project has manual
   overrides saved in the UI, clear them, because UI overrides win over `vercel.json`.
3. **Deployments → Redeploy**, with "Use existing Build Cache" unticked.
4. A successful log reads *"Static site: nothing to build"* and uploads from `site`.

Then check all three URLs return 200:

```bash
curl -sSI https://spicyextension.vercel.app/ | head -1
curl -sSI https://spicyextension.vercel.app/privacy.html | head -1
curl -sSI https://spicyextension.vercel.app/support.html | head -1
```

Full details, including how to refresh the screenshots on the site, are in
[WEBSITE.md](WEBSITE.md).

---

## 7. After approval

- The public URL is `https://chromewebstore.google.com/detail/imjcaadfkmaoldbncloafhocajajliol`.
  Add it to the repository README and to the site's install section.
- To publish an update, bump the version in **both** `extension/manifest.json` and
  `package.json` (a test enforces that they match), run `npm run release:gen`, and upload
  the new ZIP. Version numbers must always increase.
- Watch the verified contact address for policy mail. A missed notice can mean removal.

---

## 8. Keeping the listing accurate

The listing must not imply that SpicyExtension searches flights, prices inventory, books,
or reads an API. It is a read-only, user-initiated DOM capture tool for one origin, and a
step toward a larger assistant that is not yet implemented. The **SpicyExtension** name is
a rebrand only: it does not remove the single host permission, does not hide which site
the extension operates on, and must not be used to obscure what the extension does. The
description, single purpose and permission justification above exist so the listing stays
accurate — keep them that way when you edit them.
