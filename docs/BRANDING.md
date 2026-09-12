# SpicyExtension branding

## Source artwork

The root [`logo.png`](../logo.png), supplied on `main` in commit `3627888`, is the source of truth for the Chrome icons. The complete artwork, including its signature, is preserved. The source PNG is not modified, cropped or redrawn.

```text
2056971c95da6f04ddf546c8409100604302c3deb5e47a7b29418ed220d44dc9  logo.png
```

The user also supplied a **SpicyExtension** red-and-white header wordmark inline. Its exact binary is not accessible in the workspace or current GitHub tree. The requested next step is to add it as root `header.png`, then embed the actual image. **The current typographic wordmark is interim, not a recreation of or substitute for the supplied graphic.** No AI-generated replacement has been made. The user subsequently approved proceeding with the current inspector, with the interim header and browser-test limitations documented. The exact artwork remains follow-up work, not completed branding.

## SpicyTerminal visual language

The later SpicyTerminal screenshot takes precedence over the earlier navy/plum styling suggestion:

- Near-black chrome (`#06090b`) and charcoal panes (`#0b1013`).
- Thin borders, small corner radii, compact controls and system monospace typography.
- Red brand/action accents; off-white input/instruction text; green (`#79e7a0`) JSON output.
- Clearly separated **INPUT** and **OUTPUT** regions. The inspector starts compact; **Expand** creates a two-column layout on wide screens, while **Compact** or a narrow viewport stacks it. Layout changes preserve captured data and edits.
- Amber privacy warnings and red errors remain distinct from successful output. Keyboard focus is visible; no remote font, animated glow or blinking effect is added.

`extension/src/styles/terminal.css` owns the shared tokens and brand styles. It is embedded in the inspector's isolated Shadow DOM alongside `inspector.css`, and packaged as `terminal.css` for the popup/help pages. Colors and typography are not maintained as unrelated palettes across surfaces.

## Current icon use and generation

- Chrome toolbar/action and extension management: derived 16, 32, 48 and 128px PNGs in `extension/assets/`.
- Popup, packaged help and floating inspector header: high-resolution local derivative plus interim text branding while the exact header file is pending.
- The content bundle embeds its PNG as a build-time data URL. No remote logo request, extra host permission or `web_accessible_resources` entry is added. The original 1.1 MB PNG and the image-processing dependency are not shipped in the runtime.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run icons         # derive all four icons from logo.png
npm run icons:check   # read-only check; fails for missing/stale derivatives
npm run check         # includes branding, contrast and structural UI regressions
npm run package       # rebuilds icons and packages the inspection build
```

`sharp` is a pinned **development-only** dependency. Lanczos3 resizing with `fit: contain` preserves the full artwork and aspect ratio. Encoded PNGs are deterministic with the pinned toolchain. Builds cannot silently fall back to the old geometric airplane.

Tests cover source/derivative bytes, dimensions, generator behavior, manifest mappings, page references, version consistency and exact content-bundle embedding. Theme tests check configured text contrasts and shared local loading. Structural JSDOM tests cover INPUT/OUTPUT composition, expansion without lost edits, consent gating and cleanup; they do not verify browser layout or Chrome IPC. Browser assertions exist for decoded images, colors, responsive columns and preserved review state, but have not run. See [VERIFICATION.md](VERIFICATION.md).

Version 0.0.2 is still a local Basis inspection build, not the completed flight assistant or a final approved brand release.
