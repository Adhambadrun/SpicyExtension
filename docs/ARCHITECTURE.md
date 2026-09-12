# BCFlights flight assistant — provisional architecture

Date: 2026-09-12 (Africa/Cairo). **Full-assistant design notes; the flight assistant is not implemented yet. A local-only source inspector is now implemented as the explicitly approved next step; see [INSPECTOR.md](INSPECTOR.md).** Read [AUDIT.md](AUDIT.md) first. The supplied AgentSearch MCP is a public web-data connector, not a flight engine. The user subsequently clarified that the extension should use the agent's existing signed-in Chrome session. See [BROWSER_SESSION.md](BROWSER_SESSION.md) for that integration path. The design deliberately specifies no imaginary network endpoints or provider flight schemas.

## 1. Product and integration boundary

```text
BO /leads/{leadId}
  → scoped lead + Matrix parsers
  → immutable LeadContext, provenance, completeness diagnostics
  → editable SearchDraft
  → validated internal SearchRequest
  → FlightSearchService
  → audited adapter for the actual authorized flight provider
  → validated, normalized SearchResult
  → option cards, filters/sorting, itinerary details, local selection/copy
```

An existing external-search deep link is a navigation action, not a flight inventory API. Keep Kayak, Google Flights, ELR/YVR, Matrix, PointsYeah, and Basis available without pretending they supply in-extension results.

The viewer must not show invented results while the provider is unavailable. Unsupported capabilities must be explicit. Web-search snippets will never be normalized into bookable flight options.

## 2. Proposed application structure

Use Manifest V3, strict TypeScript, React for the interactive viewer/toolkit, and a reproducible bundled build. There is no existing application architecture to integrate with in this checkout.

```text
extension/
  manifest.json
  src/
    background/       sender-validated messaging, request lifecycle, approved adapter I/O
    content/          singleton mount, BO context observer, navigation invalidation
    models/           normalized domain types and runtime validation
    parsers/          BO cards/details, Matrix payloads, source diagnostics
    search/           provider-neutral service, capabilities, normalization, selection
    services/         storage, clipboard, approved external navigation
    components/       launcher, summary/editor, filters, cards, details, tool navigation
    tools/            Fast Search, Sabre/GK/PNR/VIP modules, template content
    utils/            date-only arithmetic, airport/cabin mappings, safe encoding
    styles/           scoped design tokens, compact BO-like dark theme
  pages/              packaged toolkit and settings entry points
  assets/             packaged icons and licensed/local resources
  tests/
    fixtures/         sanitized source-shaped examples only
    unit/
    integration/
    e2e/
docs/
```

Keep parsers and command/link builders pure and independent of Chrome/React. Use one shared viewer implementation for floating and larger modes rather than parallel apps. A Chrome side panel is optional, not a prerequisite for the first release.

Following the user's clarification, the preferred adapter is `BasisBrowserSessionAdapter`: use an extension-managed, visible first-party Basis tab and its normal site login. Add a separate `content/basis/` integration entry point, with only the permissions needed for that confirmed origin. The flight application remains responsible for the real search. Return only validated flight-result data to the BO viewer after the actual source structure is known. Never hijack unrelated user tabs or read/export session cookies.

Only consider a server-side bridge later **if an audited supported integration requires it and the user approves that change**. Reuse any subsequently supplied compatible search functions and validators, but never bundle server-only code, credentials, or environment secrets into the extension.

## 3. Lead and request model principles

These are internal design concepts, not a provider API contract:

- `LeadContext`: lead ID, optional locally displayed passenger name, original detected itinerary, passenger summary, source provenance, observation generation, and field-level diagnostics. No DOM elements in the shared/serializable domain model.
- `SearchLeg`: ordered requested journey with stable ID, label (`Depart`, `Return`, `Leg N`), departure date, origin/destination or explicit unresolved alternatives, and optional cabin override.
- `PassengerSummary`: independently observed adults, children, infants; lap/seated classification and age inputs only when known or explicitly confirmed. Unknown is not zero or one.
- `SearchDraft`: agent edits/overrides layered over immutable lead context. BO is never mutated. Reset to detected data is explicit.
- `SearchRequest`: a complete validated draft plus trip type, cabin choices, supported flexibility, applicable filters, and ranking choice. Passenger name, notes, lead ID, PNR and DOB are excluded from flight search unless an audited provider demonstrably requires a field and the workflow authorizes it.
- `SurfaceGap`: discontinuity between requested legs. Not a flight, stop, seat, or purchasable fare.
- `SearchCapabilities`: factual adapter metadata derived from code/docs for trip types, per-leg cabin, cash/award, passenger types, filters, flexibility, cancellation, and ranking. Do not assume every provider supports the internal model.

Normalize a one-slice Matrix round trip into two search legs, and recognize a truly reversed two-slice round trip. Retain explicit multi-city intent and legacy open-jaw semantics without confusing requested journeys with their connecting flight segments. Preserve airport alternatives until resolved, rather than taking the first silently.

Incomplete or conflicting fields remain visible and block only actions that require them. Never build malformed URLs or submit a fabricated default request.

## 4. Result model and data integrity

Finalize provider-to-model mappings only after inspecting actual successful/empty/error responses.

- `FlightOption` groups **journeys**, each corresponding to a requested search leg. A journey contains operating flight segments and connections. A round-trip return flight is not an outbound stop.
- Each segment may include marketing/operating carrier, flight number, airport endpoints, local departure/arrival timestamps and their offset/timezone metadata, aircraft, cabin, booking class, terminals, and sourced elapsed time. Missing values remain absent.
- A fare retains source ID, cash/award type, amount and currency or points/program, any taxes, price basis (per passenger vs total party), fare family, baggage, conditions, and validity information **where supplied**.
- Availability and remaining seats are distinct from passenger count. Keep unknown, zero and available states distinct. Do not manufacture scarcity copy.
- Keep provider identity and retrieval timestamp; selection is not booking, ticketing, price guarantee, or automatic revalidation.
- Calendar arrival-day indicators come from actual local dates. Do not subtract browser-local clock values across timezones to infer elapsed duration. Use validated offsets or sourced durations; otherwise omit the computed value.
- Reject malformed essential results; if some valid results remain, display a nontechnical partial-data warning rather than silently inventing missing fields. Do not expose raw payloads or stack traces to agents.

### Mixed-cabin and independently searched legs

Prefer the provider's native joined pricing when supported. Otherwise search supported legs independently and label them as **separate search results**, potentially separate tickets. Never concatenate independent offers into a guaranteed mixed-cabin fare, sum incompatible currencies/points, or imply through-baggage or protected connections.

Preserve all four Matrix mixed presets; for multi-city, expose per-leg overrides so the actual cabin allocation is clear. Unsupported flexibility is rejected or offered as an explicit alternative with its effective range; never silently clamp the viewer's stated search range.

## 5. Service worker, security, and request lifecycle

The UI depends on `FlightSearchService`, not on MCP or provider wire formats. That interface is an internal abstraction, not an invented HTTP API.

- Validate every message at runtime; verify extension sender identity and the expected tab/page origin. Accept named operations, never an arbitrary fetch URL from page data.
- BO UI/parser scripts run only on `https://bo.bcflights.com/*`; a separate explicitly authorized integration script runs on `https://agentsearch.vercel.app/*` for the signed-in source workflow. Limit any further host permissions to an audited need. Avoid broad wildcard hosts, cookie-reading permission, external messaging, analytics, and remote code.
- Network messages contain only required search fields. Provider secrets stay server-side. If authentication is needed, use the provider's approved architecture rather than asking agents to paste BO credentials or session cookies.
- Assign request IDs and context generations. Abort superseded work; discard responses for a prior lead/search generation even if transport cancellation is unsupported.
- Debounce edits; search only on an explicit action unless an approved auto-search preference is later specified. Deduplicate identical in-flight requests and bound concurrency.
- Use a bounded, short-lived in-memory cache keyed by canonical search content, capability/version and authorized account context where relevant. Respect provider expiry; never cache names or notes with results. A worker restart must recover cleanly, not imply stale offers remain current.
- Apply a full-operation timeout including response body reading. Map timeout, cancellation, HTTP failure, provider tool error, incomplete data, unsupported input, and empty results separately. Offer an appropriate retry action.
- Debug logs are opt-in and redacted. No raw BO cards, payloads, customer details, or authentication headers in production logs.

The supplied MCP's `isError`/JSON-RPC handling is useful audit knowledge, not proof that the real flight provider uses the same protocol. If the correct implementation uses MCP, account for both JSON and SSE responses and validate the actual tool envelopes.

## 6. BO lifecycle and context detection

Mount one UI root in a Shadow DOM for style isolation. Do not continually rebuild the extension on SPA navigation.

1. Detect URL transitions using browser navigation events. If required for reliable BO history changes, use narrowly filtered `chrome.webNavigation.onHistoryStateUpdated` plus content-side traversal events; justify the extra permission. Do not expect an isolated-world `history.pushState` patch to intercept page-world calls.
2. On route/lead identity change, immediately invalidate the previous context, results and active requests before hydration completes.
3. Observe relevant added/removed cards and Matrix-link changes with a scoped, debounced `MutationObserver`. Ignore extension-owned content; avoid parsing the whole document on every mutation.
4. During initial hydration use bounded rediscovery with a deadline, not endless expensive polling. Coalesce observations by normalized context fingerprint, including itinerary content, not just lead ID/source.
5. Match the exact active lead and scope Matrix payloads to it. Compare independent sources conservatively; show conflicts instead of attaching another lead's payload.
6. Keep manual selection of another visible card explicit. Do not apply the active lead's Matrix payload to that selection. A partial multi-city card prompts the agent to open that lead for full context.
7. Preserve overrides when an observation is unchanged; reconcile changed source fields visibly. Clear active-lead affordances when leaving lead routes.
8. Dispose observers/listeners/timers on teardown or invalidated extension context. Handle extension reload and repeated injection without orphan widgets/listeners.

## 7. Viewer and interaction design

The initial BO/widget/flight-shopping references establish workflow, toolkit parity and information density. The later **SpicyTerminal** screenshot supersedes the navy/plum palette: near-black chrome, charcoal panes, thin dividers, monospace text, restrained red actions and green output. Use the supplied **SpicyExtension** header artwork for the identity, with `logo.png` as the Chrome-icon source. See [VISUAL_REFERENCES.md](VISUAL_REFERENCES.md) and [BRANDING.md](BRANDING.md). Keep compact floating behavior and offer an explicit larger layout; do not bring back rainbow gradients, oversized pills or glass effects. The inspector now shares these terminal styles across its surfaces, but the exact header file is still pending and the future flight viewer is not implemented or browser-verified.

- Small aviation launcher; draggable header/bubble with pointer capture, movement threshold, viewport clamping and persisted non-sensitive position/minimize/size preferences.
- Compact default viewer with an explicit larger mode, not a full-screen takeover.
- Header: active lead, refresh, tools, resize, minimize.
- Summary: requested legs/dates/ranges, passengers and cabin; completeness/conflict indicator; editable draft.
- Results: airline/flight identity, clear local departure/arrival and date offset, route, duration, stops/connections, actual cabin and fare. Optional information appears only when sourced; carrier-code fallback if no licensed logo is available.
- Compact sorting/filter bar; deeper filters in a collapsible area. Show only useful supported fields and distinguish local filtering from a new backend search.
- Details: complete journey/segment timeline, layovers/surface gaps, operating carrier, terminals, equipment, cabin and fare conditions when available.
- Actions: local select, copy itinerary, validated source link and relevant existing search tools. State clearly that selection does not book.
- Semantic buttons, visible focus, labeled controls, keyboard-operable selection/lead picker, Escape handling, dialog focus containment/restoration, live status for copy/search errors, reduced-motion support.

### Honest filtering and sorting

Default to provider ranking for Best when available. Otherwise use a documented, deterministic ranking only from comparable known fields; do not create a fictitious relevance score. Cheapest compares matching currencies and price bases; cash and points are not comparable numeric totals. Unknown values sort consistently last rather than becoming zero.

Stops are computed per journey, not `allSegments.length - 1`. Airline, cabin, time range, max duration, price and optional alliance/aircraft/type filters use actual data. Time-of-day filters use airport-local times. Test missing fields, multi-journey options and stable tie-breaking.

## 8. Toolkit migration and local storage

Extract pure modules and data rather than retaining large HTML strings or inline handlers:

- Fast Search and ARUNK with exact golden outputs and explicit input validation.
- Kayak/Google/ELR/Matrix/PointsYeah/Basis builders, preserving known encodings but surfacing unsupported/unknown fields. Open external destinations only after an agent action, with safe schemes and opener isolation.
- Shared Sabre parsing primitives for VIP/GK where semantics actually match. Keep codeshare markers, explicit arrival dates, terminals, equipment and cabin enrichment; improve unsupported-line diagnostics and year handling. Do not apply booking-letter cabin guesses to live backend results as fact.
- PNR name/DOCS/INFT command generation and searchable SOP as local-only tools. Start new passenger inputs blank, validate required values and age/reference relationships, and keep generated commands reviewable before copy.
- VIP BCF/LFS branding, editable itinerary, ticket grouping/splitting, per-card cabin/baggage/notes, PNG and rich email copy. Bundle html2canvas locally. Separate unknown data from agent-confirmed baggage/status; clearly identify operator-entered output.
- Disclaimer templates stored as plain structured content; preserve categories/copy behavior, with business-owner review. Provider fare rules remain separate.
- Per-lead notes stored in extension-local storage only on agent input, with clear/delete controls. Do not synchronize PII. Offer explicit local migration of an existing current-lead `fx-notes-{id}` value; do not bulk harvest BO storage.

## 9. Verification plan and release gates

Use strict TypeScript + ESLint, unit tests for pure logic, DOM fixture integration tests, and Playwright tests against the built MV3 extension in Chromium. No synthetic fixture module or test-only backend should enter the production bundle.

| Acceptance area | Required coverage |
| --- | --- |
| Lead/trip parsing | One way, single-slice and reversed-two-slice round trip, connected multi-city, disconnected open jaw, final open endpoint, incomplete cards. |
| Passengers | Multiple adults, adult+child, adult+infant, real zero vs unknown counts, known lap/seated infant distinctions, no invented defaults. |
| Matrix | Present/missing/invalid payload, base64url/UTF-8, invalid slice among valid slices, airport arrays, mixed extensions, conflicting/stale lead linkage. |
| Commands/links | JR. output, exact ARUNK placement, no spurious final ARUNK, all cabins, provider passenger encodings, every mixed preset, per-leg links, explicit flexibility limits. |
| Dates | Formatting, leap days, month/year rollover, ±1/2/3/5/7 ranges, malformed dates, timezone/date-line indicators and unavailable duration metadata. |
| Real adapter | Sanitized actual source fixtures; supported search modes, empty results, incomplete responses, backend/tool errors, timeouts, authentication failure, cancellation, cache expiry and duplicate search suppression. **Blocked until real source supplied.** |
| Lifecycle | pushState/replaceState/traversal, delayed/repeated hydration, same-lead itinerary changes, manual lead selection, leaving leads, stale-response race, extension reload, singleton mount. |
| Viewer | Every sort/filter, currency/price-basis handling, absent fields, full itinerary details, local selection, source action safety, clipboard success/failure, keyboard/focus behavior. |
| Toolkit | GK optional times/status/seats, unsupported rows; PNR types/DOCS/INFT/references; VIP VI enrichment/codeshare/day shifts/grouping/splits/edits/export/email; all disclaimer templates; notes; drag/minimize persistence. |
| Packaging/security | Clean install/build from lockfile, manifest/CSP, no remote scripts, no hardcoded secrets, no unsafe data HTML, no test fixtures in production, least-privilege messaging and host permissions. |
| Live acceptance | Install unpacked build in Chrome; authorized BO leads of each shape; real searches via intended provider; compare displayed prices/cabins/availability against source; inspect console; verify SPA/reload/tools and screenshots. **Not replaceable with fixture-only tests.** |

Preserve the supplied sources as references. Build/package instructions will be added only for a real build; do not publish fictional install steps or claim unavailable E2E checks passed.

## 10. Work sequencing after the blocker is resolved

1. Audit the correct flight implementation and fill a concrete request/response/capability/authentication matrix.
2. Finalize this design, normalized runtime schemas and provider mappings using that evidence.
3. Implement and test BO/Matrix extraction and legacy pure helpers.
4. Implement adapter, transport, normalization and service lifecycle against the real source.
5. Build the viewer/editor/filters/details on that functioning data flow.
6. Migrate all toolkit workflows into packaged modules/pages.
7. Verify SPA/reload behavior, privacy/security and accessibility.
8. Run unit/integration/browser/live acceptance checks, produce reproducible package and document actual limitations.

Do not mark the product complete if real search, authenticated BO testing, or required toolkit parity remains unverified.
