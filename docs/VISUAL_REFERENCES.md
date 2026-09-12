# Visual references received

2026-09-12 (Africa/Cairo)

The user supplied three initial references, followed by a SpicyTerminal style screenshot and a SpicyExtension header graphic. No customer-bearing screenshots or their itinerary data are copied into the repository or used as production flight data.

## Initial image 1 — BO workspace

Retain compact operational density, readable grouped information, thin dividers and a floating view that does not cover the whole workspace by default. The original slate/navy color suggestion is **superseded by the later SpicyTerminal brand direction**. This screenshot does not establish DOM selectors.

## Initial image 2 — existing userscript widget

Use for feature inventory and interaction continuity: lead selector, route/cabin/trip summary, cabin/flexibility overrides, notes, external searches, mixed-cabin presets, per-leg award/cash links and all five tools. Those capabilities remain required for the eventual assistant; the current capture panel does not implement them.

## Initial image 3 — flight shopping reference

Use for future result-comparison density: stacked options, airline identity, leg-by-leg flight data, aligned fare area, compact supported filters and details/actions. Prices, dates, carriers and scarcity statements in an image are layout examples, not sourced inventory.

## Later reference — SpicyTerminal screenshot

The user explicitly chose this as the brand style before PR/merge. Use near-black chrome, dark inset rectangular panes, hairline dividers, monospace type, compact uppercase INPUT/OUTPUT labels, off-white input text, green terminal output and red/white branding. Do not retain the previous purple/navy card-and-pill aesthetic. The screenshot's converter example is not a request to invent a flight response or a new parsing contract.

The capture panel, popup and help page now share that visual language. In the capture panel, Expand shows the input controls and JSON output side by side on wide screens; compact/narrow layouts stack them. Expanded/compact switching does not replace or discard the reviewed capture.

## Later artwork — SpicyExtension header

The user supplied a red/white **SpicyExtension** header wordmark, so the product header should use that artwork rather than say SpicyTerminal. The graphic is visible inline, but its binary is not present in the accessible workspace or remote tree. Root `header.png` is therefore **generated** from the brand tokens by `scripts/header.mjs` and embedded on every surface, replacing the interim typographic label; it is documented as generated art and is not claimed to be the attached image. Supplying the real file and running `npm run header:gen` retires the substitution; the original artwork remains the intended master.

## Repository icon

The supplied root `logo.png` is preserved unchanged and is the source of all four Chrome icon sizes and both committed Chrome Web Store images (`store/icon-128.png`, `store/promo-440x280.png`, `store/marquee-1400x560.png`). See [BRANDING.md](BRANDING.md) for hashes, local asset handling, regeneration and current header status.
