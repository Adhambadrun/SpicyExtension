# Local Basis inspector — install, use and privacy

Version 0.0.2 · 2026-09-12 (Africa/Cairo)

## Scope

This is the local inspection step explicitly selected by the user after the repository audit. It is **not** the completed BCFlights flight assistant and does not implement or pretend to implement a Basis flight API. The three supplied screenshots establish visual references, but not the machine-readable structure of signed-in search results.

The tool operates in the agent's own Chrome/Basis session. It captures one agent-selected DOM subtree as reviewed HTML/text inside JSON. That data will let the flight adapter be designed against observed fields instead of guesses.

## Installation

1. Download `bcf-basis-inspector-0.0.2.zip` and extract it.
2. Open `chrome://extensions` → Developer mode → Load unpacked.
3. Select the extracted folder containing `manifest.json`. If building locally, use `dist/basis-inspector`.
4. Use the **same Chrome profile** in which you normally sign in to Basis. The extension does not transfer a login between profiles/devices.
5. **Reload the Basis tab after installing or reloading the extension.** Chrome does not automatically inject the new content script into already-open pages.
6. Pin “BCF Basis Inspector — Local Only” from Chrome's Extensions menu if desired.

Version 0.0.2 uses the repository's red **Spicy Extension** logo and SpicyTerminal-style black panes, monospace text and green output. The exact new header artwork is pending as root `header.png`; current text branding is interim. If upgrading from the old airplane-icon build, reload the unpacked extension and then the Basis tab. See [BRANDING.md](BRANDING.md) for source provenance and current status.

Chrome shows a permission for the specific Basis site. The extension has no BO, email, other-site, cookie, storage, downloads, broad-tabs or scripting permission. There is no separate server to deploy and no key/password to configure.

## Getting a useful capture

1. On Basis `/flights` or `/search`, run a search you are authorized to make. Do not repeatedly run metered searches just to collect examples.
2. Open the extension popup → Open inspector → Select a result area.
3. Move the pointer over **one flight card** and check the outlined region. Click or press Enter to capture it. Use ↑ / Larger to include the surrounding card, and ↓ / Smaller to step back. Escape cancels.
4. The selection overlay intercepts the click rather than clicking a source “Select/Book” control. Outside selection mode, Basis remains normally usable.
5. In the review, inspect the capture's `selection.html` and `selection.text`. The entire file is editable as **plain JSON**; HTML is never rendered/executed by the inspector.
6. Remove names, booking references, account IDs, telephone/email information or any other private data. Retain useful flight field names, structure, routes, times, dates, fare/currency/points, cabin and availability information where safe.
7. Check the explicit review confirmation. Download JSON, or use Copy JSON if Chrome permits clipboard access. Editing the data, resetting redactions or changing the capture type requires a new review.
8. For a details sample, first expand itinerary details in Basis, then select that area and choose “Expanded itinerary details.” Review/export that second capture separately.
9. Share only those reviewed JSON files here. Nothing is uploaded automatically.

Use **Expand** in the inspector header for side-by-side INPUT/OUTPUT on wide screens. **Compact** or a narrow viewport stacks the panes. Switching layouts preserves the capture, edits and review state.

Do **not** send cookies, request headers, “Copy as cURL,” session/local storage, passwords, keys, bearer tokens, account exports or raw/unsanitized HAR files. They are not required to inspect flight-result structure.

## What is and is not removed

Removed before review:

- Script/style/template content; frames, SVG/canvas and embedded media.
- Form controls and form subtrees; live `.value` properties are never read.
- Explicitly hidden/inert/aria-hidden or CSS-hidden subtrees.
- Resource/destination URLs, event handlers, IDs, arbitrary data attributes and other attributes outside a short allowlist.
- Recognizable email addresses, URLs and common token/credential patterns in visible text or allowed labels (best effort).

Preserved for structural analysis: ordinary HTML containers, flight text, CSS classes, roles, a few accessibility labels, datetime attributes and test-ID attributes. Query strings/fragments are not exported; source metadata contains only the exact origin and `/flights` or `/search`.

**This is not complete anonymization or a visual visibility audit.** Names, booking references, unusual secrets, phone numbers and personal text in allowed labels may remain. Offscreen content may still be included. Open shadow roots are explicitly omitted with a warning. You must review/redact before export and again before sharing. Do not treat the cleanup as proof that a file is safe.

The capture is bounded to 1,200 elements, 40,000 text characters, 160,000 HTML characters and 260,000 final UTF-8 JSON bytes (plus a depth/node budget). Oversized selections fail with an actionable error; data is never silently truncated.

## Local-only lifecycle

- A dormant content-script listener exists on Basis search routes. It does not inspect page content on load.
- The popup checks the active tab and sends a versioned, named operation through the extension worker. Foreign senders and unexpected payloads are rejected.
- Captures live in memory, not Chrome storage or a database. Closing/clearing or URL navigation discards them. A repeated open reuses the current instance without overwriting edits.
- Downloads and clipboard writes require an explicit trusted UI action and current review. Blob URLs/timers/listeners/selection overlays are cleaned up.
- Downloaded files and clipboard contents remain under the user's control; the tool does not erase them later.
- The extension has no fetch/XHR/WebSocket/analytics/upload code. Packaged extension pages additionally set `connect-src 'none'`. The Basis website itself can still make its normal requests.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Popup button disabled | Activate the signed-in Basis `/flights` or `/search` tab. Login/account routes and other hosts are excluded. |
| No acknowledgement / receiving end unavailable | Reload Basis after extension installation/reload, then retry. |
| Capture contains only one label | Use Larger area until the intended card is selected; check the HTML rather than assuming it is complete. |
| Area too large | Select one card or one details section, not the page/application container. |
| Hidden/no text | Expand details in Basis, or select the parent card rather than an image, form field or icon. |
| Inspector covers the desired region | Drag its header; keyboard users can focus the Move inspector button and use arrow keys. |
| Export disabled | Correct invalid JSON and review the current contents again. Edits invalidate prior consent. |
| Clipboard denied | Download JSON instead; confirm it appears in Chrome's downloads. |
| Navigation clears the capture | Expected. Export reviewed data before leaving the page; stale data is not carried into another search. |

## Verification boundary

See [VERIFICATION.md](VERIFICATION.md) for actual checks run. Browser tests use a local **synthetic sanitizer/UI fixture**, never live Basis credentials or fabricated production results. Even a passing inspector browser test does not validate Basis's signed-in flight lifecycle or the not-yet-implemented flight assistant.
