# SpicyExtension branding

## Source artwork

The root [`logo.png`](../logo.png), supplied on `main` in commit `3627888`, is the source of truth for the Chrome icons. The complete artwork, including its signature, is preserved. The source PNG is not modified, cropped or redrawn.

```text
2056971c95da6f04ddf546c8409100604302c3deb5e47a7b29418ed220d44dc9  logo.png
```

The user also supplied a **SpicyExtension** red-and-white header wordmark inline. Its exact binary is not accessible in the workspace or current GitHub tree. The requested next step is to add it as root `header.png`, then embed the actual image. **The current typographic wordmark is interim, not a recreation of or substitute for the supplied graphic.** No AI-generated replacement has been made. The user subsequently approved proceeding with the current capture panel, with the interim header and browser-test limitations documented. The exact artwork remains follow-up work, not completed branding.

## SpicyTerminal visual language

The later SpicyTerminal screenshot takes precedence over the earlier navy/plum styling suggestion:

- Near-black chrome (`#06090b`) and charcoal panes (`#0b1013`).
- Thin borders, small corner radii, compact controls and system monospace typography.
- Red brand/action accents; off-white input/instruction text; green (`#79e7a0`) JSON output.
- Clearly separated **INPUT** and **OUTPUT** regions. The capture panel starts compact; **Expand** creates a two-column layout on wide screens, while **Compact** or a narrow viewport stacks it. Layout changes preserve captured data and edits.
- Amber privacy warnings and red errors remain distinct from successful output. Keyboard focus is visible; no remote font, animated glow or blinking effect is added.

`extension/src/styles/terminal.css` owns the shared tokens and brand styles. It is embedded in the capture panel's isolated Shadow DOM alongside `capture-panel.css`, and packaged as `terminal.css` for the popup/help pages. Colors and typography are not maintained as unrelated palettes across surfaces.

## Current icon use and generation

- Chrome toolbar/action and extension management: derived 16, 32, 48 and 128px PNGs in `extension/assets/`.
- Popup, packaged help and floating panel header: high-resolution local derivative plus interim text branding while the exact header file is pending.
- The content bundle embeds its PNG as a build-time data URL. No remote logo request, extra host permission or `web_accessible_resources` entry is added. The original 1.1 MB PNG and the image-processing dependency are not shipped in the runtime.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run icons         # derive all four icons from logo.png
npm run icons:check   # read-only check; fails for missing/stale derivatives
npm run check         # includes branding, contrast and structural UI regressions
npm run package       # rebuilds icons and packages the capture build
```

`sharp` is a pinned **development-only** dependency. Lanczos3 resizing with `fit: contain` preserves the full artwork and aspect ratio. Encoded PNGs are deterministic with the pinned toolchain. Builds cannot silently fall back to the old geometric airplane.

Tests cover source/derivative bytes, dimensions, generator behavior, manifest mappings, page references, version consistency and exact content-bundle embedding. Theme tests check configured text contrasts and shared local loading. Structural JSDOM tests cover INPUT/OUTPUT composition, expansion without lost edits, consent gating and cleanup; they do not verify browser layout or Chrome IPC. Browser assertions exist for decoded images, colors, responsive columns and preserved review state, but have not run. See [VERIFICATION.md](VERIFICATION.md).

## Chrome Web Store listing art

The published item name is exactly **SpicyExtension**: `extension/manifest.json` `name`, the toolbar
`action.default_title` prefix, the popup/help wordmark, the ZIP filename, the build output directory
and the exported JSON `format` all use it. `tests/unit/naming.test.ts` fails if the retired working
title, its vendor prefix or the old tool word reappears anywhere in tracked text, including file names.

```bash
npm run store:gen     # derive the 128px icon and both promo tiles from logo.png
npm run store:check   # committed bytes/dimensions/provenance must match logo.png + manifest version
npm run shots:gen     # photograph the built extension UI into store/screenshots/*.png
npm run shots:check   # committed screenshots must be current 1280x800 PNGs
```

The promo art is generated at the sizes the Dashboard actually accepts — `store/icon-128.png`
(128x128), `store/promo-440x280.png` (the required small tile) and `store/marquee-1400x560.png`
(the optional marquee). An earlier `marquee-1280x800.png` was not a real Web Store size; it is
removed on regeneration so it cannot be uploaded into the wrong slot. Promo tiles are written
without an alpha channel, because the Dashboard rejects one.

Screenshots are **not** drawn. `scripts/screenshots.mjs` loads the real compiled
`dist/spicyextension/content.js`, drives it through the shipped `BEGIN_CAPTURE` listener over the
committed synthetic fixture, also photographs the real packaged popup and help pages, and writes
exact 1280x800 opaque PNGs. No real account, search or inventory is involved, and nothing is
hand-drawn or AI-generated.

The banner is composed with sharp from `logo.png` plus the same `terminal.css` tokens, so the store
artwork and the product UI cannot drift into separate palettes. Copy is width-checked before
rendering: generation fails instead of letting text run off the canvas, because the system monospace
font differs between machines. `store/store-assets.json` records the exact `logo.png` hash and
version each image was derived for; a stale pair therefore breaks `npm run check`. No AI-generated
or hand-redrawn substitute is used, and the interim typographic wordmark remains interim until the
real `header.png` is available. See [CHROME_WEB_STORE.md](CHROME_WEB_STORE.md).

## Committed publish inputs

`release/spicyextension-1.0.0.zip`, `release/checksums.txt` and the two `store/*.png` images are
tracked in Git on purpose: they are the upload inputs, so publishing does not depend on a developer's
local build directory. `dist/` and `artifacts/` remain ignored, and `tests/unit/publish.test.ts`
re-verifies the committed archive's entries, checksum, embedded manifest and runtime-file boundary.

Version 1.0.0 is still a local capture build, not the completed flight assistant or a final approved brand release.
