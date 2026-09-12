# BCFlights extension — source audit

Date: 2026-09-12 (Africa/Cairo). Status: **audit complete for the supplied files; browser-session source direction clarified; authenticated flight-result contract still unavailable.** This is not a completed extension or a successful flight-search integration.

## 1. Inputs and scope

The starting checkout contains exactly two tracked files:

| File | Findings |
| --- | --- |
| `BCF Floating Flight Search Widget.txt` | 2,614 lines, 137,785 bytes. Read in full, including styles, bootstrap/lifecycle, external-search builders, and all four embedded HTML/JavaScript tools. Metadata says version 1.0; the widget/changelog say v12.2. |
| `agentsearch-mcp-master.zip` | 12 files, 68,580 uncompressed bytes. All source, configuration, documentation, and smoke-test files inspected; the complete dependency lock parsed. Archive comment identifies source commit `c585fcf336bd0aa7f90e05081a13620c3402e9d4`. |

At the initial audit, no extension manifest, application, build configuration, BO DOM fixtures, flight-result fixtures, or screenshots were supplied. Three visual references were subsequently attached; see [VISUAL_REFERENCES.md](VISUAL_REFERENCES.md). The user then explicitly selected the local-only source inspector now documented in [INSPECTOR.md](INSPECTOR.md); that is an inspection aid, not the completed flight assistant.

Original-input SHA-256 hashes:

```text
73f26ed4329ae777113a1311a026dc0ffe0409b70f143fd895a0e9a3998cc1d2  BCF Floating Flight Search Widget.txt
3c3c0353cfa3cf7b6723a394c457a0b5ab0836d01b066452ee1007177be8b061  agentsearch-mcp-master.zip
```

All 12 extracted files were compared byte-for-byte with their archive entries. Originals are unchanged. Extraction/dependencies are audit scratch, not new production infrastructure.

## 2. Blocking finding: two different AgentSearch applications

The archive identifies itself as `IsaiahDupree/agentsearch-mcp` in `server.json`. It wraps public **web data**, not aviation inventory. This is established by the complete implementation, not just its README or filenames.

Inside the archive, `lib/tools.js` registers exactly:

| MCP tool | Actual upstream request | Input schema |
| --- | --- | --- |
| `web_search` (lines 100–119) | `GET /v1/search` | Required `q`; optional `provider: brave / serper`, integer `limit: 1–20`, `country`. |
| `instant_answer` (lines 121–136) | `GET /v1/answer` | Required `q`. |
| `fetch_url` (lines 138–156) | `GET /v1/fetch` | Required `url`; optional `format: text / markdown`, integer `maxChars: 500–500000`, `links: boolean`. |

Its code contains **no flight-search function, flight request/response schema, flight normalizer, inventory provider, fare model, or aviation test fixture**. One-way/round-trip/multi-city search, mixed cabin, award/cash inventory, passengers, flight stops, flexible travel dates, airline/program filtering, prices, and seat availability are not supported flight capabilities of these tools. A free-text query mentioning those concepts does not make them inventory-search capabilities.

By contrast, the userscript's `buildBasisUrl` (lines 608–616) opens:

```text
https://agentsearch.vercel.app/flights?s=<base64-encoded JSON>
```

That is not `agentsearch-mcp.vercel.app` or its upstream `agentsearch-api.vercel.app`. An unauthenticated visit to `/flights` during this audit redirected to `/auth/signin?next=%2Fflights`, displaying Basis branding and email sign-in. No login was attempted and no customer information was transmitted. This confirms a separate user-facing application, **not** a supported API contract or permission to reuse its authenticated endpoints.

### Consequence

The requested pipeline cannot be implemented honestly with the supplied MCP archive:

```text
BO lead → normalized flight request → [missing real flight-search implementation]
       → validated flight results → flight option viewer
```

Do not relabel SERP results as flight options, scrape prices out of snippets, invent a `/searchFlights` route, infer a backend contract from a frontend deep link, or add an unapproved provider. The actual flight application's supported contract or authenticated result structure must be inspected before the adapter and flight-result normalization can be finalized. The user's subsequent browser-session clarification is recorded in section 7.

## 3. Complete MCP archive audit

Paths in this section are relative to `agentsearch-mcp-master/` inside the ZIP.

| File | Actual responsibility and findings |
| --- | --- |
| `README.md` | Describes a free/discovery MCP wrapper around metered public web data; explicitly no flight-search business logic. Documents deployment URLs, tools, environment variables, and smoke commands. |
| `package.json` | Plain Node ESM; no TypeScript, bundler, lint configuration, extension build, or unit-test runner. Scripts: `dev`, `smoke`. Dependencies: MCP SDK and Zod. |
| `package-lock.json` | Lockfile v3, 93 dependency entries. Locks MCP SDK 1.30.0 and Zod 4.4.3. No entries marked with an install script. Some transitive requirements need Node >=20; audit used Node 22.22.3. This is not a vulnerability/security certification. |
| `server.json` | MCP registry metadata for `io.github.IsaiahDupree/agentsearch-mcp`; remote streamable-HTTP endpoint. |
| `vercel.json` | Rewrites `/mcp` to `api/mcp.js` and `/health` to `api/health.js`; function duration limits 30s/10s. |
| `.gitignore` | Excludes dependencies, Vercel output, logs, and environment files. |
| `api/mcp.js` | Stateless MCP server created per request. POST only; GET/DELETE and other methods return 405. No caller authentication. Tool calls pass through the soft limiter. Connects SDK server to `StreamableHTTPServerTransport`; closes on response close. |
| `api/health.js` | Reports service/upstream identity; does not prove upstream requests succeed. |
| `lib/tools.js` | Zod input schemas; query-string serialization; outbound fetch; JSON-or-raw-text parsing; MCP text-result wrappers. No output schema validation or flight normalization. |
| `lib/ratelimit.js` | Default 30 `tools/call` requests/IP/hour, in-memory per instance. Trusts the first forwarded-for address. Handshake/tool discovery are not metered. Not a production authentication or distributed quota boundary. |
| `local-server.js` | Minimal Node HTTP shim for Vercel helpers and JSON body parsing. Not a production flight gateway; no body-size limit. |
| `test/smoke.mjs` | Health, initialize, tools/list, then an upstream `instant_answer` call. An expected missing-proxy-secret 403 is allowed as a warning; other tool failures fail the test. No flight tests. |

### Actual transport and data flow

```text
MCP client
  → POST /mcp (JSON-RPC; Accept: application/json, text/event-stream)
  → stateless MCP SDK transport
  → registerTools handler
  → GET ${AGENTSEARCH_MCP_API_BASE_URL}/v1/{search|answer|fetch}
  → JSON serialized into MCP content[0].text
```

Default upstream: `https://agentsearch-api.vercel.app`. `AGENTSEARCH_MCP_PROXY_SECRET` is read server-side and sent as `X-RapidAPI-Proxy-Secret`. It must never be copied into an extension. `AGENTSEARCH_MCP_RATE_LIMIT` configures the soft limit.

The connector does not implement the upstream providers or their output validation. Output descriptions mention SERP position/title/url/snippet/source/domain; instant-answer heading/type/source/related topics; fetched URL/title/format/length/content/links; and metadata. Those are descriptive web-data structures, **not flight models**.

Tool errors use `isError: true` with a human-readable text content item. Rate limiting also returns that envelope under HTTP 200. Internal transport errors can return HTTP 500 / JSON-RPC `-32603`; method rejection returns HTTP 405 / `-32000`. A client cannot treat HTTP 200 as proof of tool success. Although the README calls errors typed, `asError` does not expose a structured application error code/status to callers.

The 25-second fetch timer is cleared when response headers arrive, before `res.text()` completes; it is not a full response-body deadline. The documented SSRF protection for `fetch_url` is upstream, not implemented or independently verified in this archive. Do not repurpose this unauthenticated public-data service for BO customer data.

## 4. Actual userscript flow and migration map

Line references below refer to the original text file, not extracted/reformatted code.

```text
/leads/{id}
  + matching visible BO card
  + first usable Matrix search payload (when loosely matched)
  → mutable FX.currentLead
  → leadSegments / searchLegs
  → provider deep links or copied JR. command

Separate manual workflow:
  pasted Sabre text / manually entered passenger details
  → embedded VIP / GK / PNR / disclaimer tools
```

There is no in-widget flight inventory request or priced-result viewer to reuse. The new search/results flow is a genuine new integration, while the parsers, link builders, and toolkit are migration work.

| Area | Source | Preserve / extract |
| --- | --- | --- |
| Widget styling, controls | 20–244; 662–740 | Floating/minimized states, drag, compact controls. Replace document-global styling/HTML strings with an isolated component UI. |
| Cabin/date helpers | 245–278 | Canonical Y/W/B/F, BO aliases P/S→W and C/J→B, ITA cabin names, UTC date-only helpers, display formatting. Season labels are a simple month heuristic, not sourced fare intelligence. |
| Lead cards | 279–342 | Lead ID, name candidate, airports, dates, trip labels, adults/children/infants; deduplicated list of visible cards. |
| Matrix extraction | 343–409 | Discover `a[href*="matrix.itasoftware.com/search"]`, decode `search`, parse slices and options, enrich the active lead. |
| Itinerary abstraction | 410–437 | Single-slice round trip expands to `Depart` and `Return`; multi-slice requests expose `Leg 1`, `Leg 2`, etc. |
| Kayak | 439–458 | Route-path builder, multi-city, cabin, adults, flexibility suffixes, children/lap-infant encoding. Unknown child ages must not silently become age 8 in the replacement. |
| Google Flights / ELR | 460–509 | Protobuf/varint deep-link construction; cabin 1/2/3/4; passenger type 1/2/4; trip type 1/2/3. ELR explicitly appends initial-origin→YVR one day after the final search leg and switches to multi-city. Keep this as an explicit agent action, not a detected itinerary mutation. |
| Matrix / mixed cabin | 511–586 | Base64 payload; one-way/round-trip/multi-city slices; `pax` string fields; global cabin, per-slice `ext`, return `extRet`; current mixed presets B/W, W/B, F/B, B/F. |
| PointsYeah | 588–605 | Per-leg link, cabin label, adults/children, symmetric date range, existing bank/program lists. Existing link omits infants; do not claim otherwise. |
| Basis | 607–616 | Per-leg `tripType: oneway`, `stops` airport arrays, `{value, range: 1}` date, aggregate `pax`, cabin and program list, flags. Frontend URL schema only; does not establish a flight API. |
| Fast Search | 619–659 | B→C, W→S, Y→Y, F→F; `JR.` prefix, `/S-O{cabin}`, unpadded day + uppercase month, return leg, and `/S-ARUNK{nextOrigin}` for intermediate discontinuities. |
| Lead selection/notes | 801–902 | Name/ID selection from visible cards, local per-lead notes, metadata/partial-state warning. Selected-card mode currently changes only the widget, not BO navigation. |
| Lifecycle/interactions | 742–800; 838–978 | Refresh, delayed hydration discovery, minimize/reopen, clipboard feedback, external actions. Replace reset/rebuild/polling behavior rather than porting it verbatim. |
| Disclaimers/scripts | 985–1153 | Three categories and six copyable business templates: discounts (UA/DL/AA and other airlines), LFS award and tax language, revenue extra-leg and return language. Keep templates separate from provider fare rules. |
| PNR helper | 1155–1584 | Searchable eight-step SOP; up to nine passengers; ADT/CNN/INF/INS; passenger references; name commands; 3DOCS; infant remarks; copy actions. |
| VIP itinerary maker | 1586–2484 | Full manual Sabre parser and enrichment, BCF/LFS branding, light/dark presentation, one-ticket/separate-ticket modes (up to six tickets), manual journey splits, editable fields, screenshot export, editable disclaimer email and rich clipboard. |
| GK converter | 2486–2613 | Passive segment parser; carrier/number/class/date/airports; selectable GK/HK/BK/YK, seat count, optional padded times; copy commands. |

### Matrix behavior that must be understood before refactoring

- A slice uses `origin`, `dest`, and `dates.departureDate`; a single slice can carry `dates.returnDate`. The current reader takes only the first airport from arrays.
- Top-level `options.cabin` can override the BO card cabin. The reader does not currently recover mixed-cabin `ext`/`extRet` or passenger counts from Matrix `pax`.
- Mixed searches set global cabin to `COACH` and use `+cabin 2` (B), `+cabin premium-coach` (W), `+cabin 1` (F), or `+cabin 3` (Y). For multi-city, all but the final slice receive the outbound selection and the final slice receives the return selection.
- `itaDateModifier` clamps flexibility to ±2 even when the widget says ±3/5/7. Preserve the provider boundary, but make the effective range explicit rather than silently clamping.
- Google links do not receive flexibility. Basis always sets `range: 1`. PointsYeah gets the selected symmetric date range; Kayak encodes the requested suffix. Deep-link syntax alone does not prove a provider still supports every value.

### Open-jaw and Fast Search invariants

The userscript's `isOpenJaw` returns true for two or more segments when either adjacent endpoints do not connect or the final destination differs from the first origin. This broader legacy flag must remain understood, while intermediate surface gaps should be represented separately.

Examples verified against the original helper functions using synthetic requests:

```text
Business LAX→MNL 05 Dec, return 28 Dec:
JR.LAX/S-OCMNL5DEC/S-OCLAX28DEC

Business JFK→LHR 05 Dec; CDG→JFK 28 Dec:
JR.JFK/S-OCLHR5DEC/S-ARUNKCDG/S-OCJFK28DEC
```

Do not change the literal `ARUNK` spelling used by Fast Search. A final destination different from the initial origin does not, by itself, cause the existing command builder to append an extra surface segment.

### Embedded-tool details and parity obligations

**VIP:** `normalize`, `SEG_RE`, and `VI_RE` parse `*I`, `*IA`, and `VI*`; deduplication uses carrier/flight/date/route; VI metadata enriches equipment, elapsed time, terminals, cabin, and day shifts. Journeys split on an explicit split, airport discontinuity, or a gap over 48 hours. Export temporarily converts controls to display elements and renders at 2× using html2canvas. Email generation includes one screenshot per ticket, selected baggage text, separate-booking language, and a mixed-cabin sentence (majority cabin; higher cabin breaks ties). Preserve editable output and plain/rich-text clipboard plus PNG fallback.

**PNR:** adult name command; child `*P-C07`; lap infant `-I/...*DOB...`; seated infant `*P-INS`; 3DOCS strips honorific suffixes; 3INFT is generated for lap infants or an infant gender marker. The SOP includes AA/BA DOCS guidance, contact remarks, signing/saving, pricing/storage commands, and submission checks. This tool creates text, not live reservations.

**GK:** output is `0{carrier}{number}{class}{date}{origin}{destination}{status}{seats}`, optionally followed by `/{departureTime} {arrivalTime}` with four-digit A/P times. The current regex requires times in the source even when omitted in the output, defaults an absent booking class to Y, and ignores unrecognized lines. The replacement must report unsupported/partial input instead of hiding it.

## 5. Correctness, lifecycle, and security risks to fix

These are findings, not implemented fixes:

1. **Unknown data becomes invented defaults.** Card parsing defaults to one adult/business; ITA-only detection also defaults counts/cabin. PNR inputs contain example passenger/DOB defaults, child age is fixed, and VIP starts with an assumed checked-bag allowance and confirmed status. New required fields must be confirmed or visibly missing. Manually chosen values must be distinguished from sourced facts.
2. **Fragile selectors and matching.** One utility-class card selector; a narrow nested passenger selector; ID matching by substring; name heuristic; 4–8 digit ID assumption. Add scoped structural/label/attribute fallbacks, exact identity matching, validation, and field provenance. Need redacted BO DOM examples to verify real markup.
3. **Cross-lead/stale payload risk.** The first usable Matrix link is document-global. Its trust check accepts an origin match OR a departure-date match; it need not belong to the active lead. Invalidate on navigation and bind payloads to the correct context; conflicts should be visible.
4. **Silent loss of partial itinerary data.** Invalid slices are filtered out before `partial` becomes false; alternate airports are discarded; base64/JSON failures are swallowed. Keep diagnostics, validate all slices, support URL-safe/UTF-8 encoding, and retain or explicitly resolve airport alternatives.
5. **Trip classification conflates shape and meaning.** Any multiple-slice payload becomes multi-city, including a simple reversed two-slice round trip. The lead's overall destination is overwritten with the final endpoint. Keep search-leg semantics separate from a summary route, trip type, and surface gaps.
6. **Cabin override mutates the detected model.** The handler assigns `FX.currentLead.cabin`. Keep immutable detected context and a separate editable search draft instead.
7. **SPA rehydration and stale actions.** Polls pathname every 800ms and fully rebuilds on lead paths; schedules 700/1800/3500/6000ms rediscovery. Same-source changes are missed. Failed discovery can leave the last lead usable. Leaving lead pages does not clear it. Rebuilds accumulate document listeners; delayed work has no navigation-generation guard.
8. **Unbounded/fragile UI behavior.** Mouse-only dragging, no viewport clamp, no persisted position/minimize state, unrevoked tool Blob URLs, and incomplete clipboard-failure handling. Use pointer capture, focusable controls, cleanup, and extension-hosted pages.
9. **Sensitive data and injection.** Lead data and entered tool values are interpolated into `innerHTML`; PNR row attributes are not safely escaped. BO-origin localStorage holds notes. New code must use safe DOM/component rendering, extension-local explicit note storage, no customer logging, and no analytics. Legacy note migration should be an explicit local action.
10. **MV3 incompatibility.** Embedded pages rely on inline handlers/scripts, remote Google Fonts, and remote html2canvas. Bundle permitted dependencies locally; use extension pages and packaged scripts, not an unsafe CSP or remote execution.
11. **VIP claims exceed implementation.** The hint says operating carrier is detected, but parsing explicitly ignores `OPERATED BY` lines and `fixOperator` is unused. Flight cabin inference from booking letters is not universally authoritative. The fixed connection threshold is not an airport/carrier minimum-connection-time database.
12. **Date/zone inference.** VIP uses the agent computer's local timezone, guesses the initial year from now, and advances the year whenever a subsequent departure precedes the prior arrival. Explicit December→January arrival dates can be wrong. Do not use these guesses to populate authoritative live results/durations.
13. **Business copy is not fare data.** Preserve supplied templates as editable business content, but do not display their refund/baggage/connection claims as provider-returned rules. Owner review of templates and defaults is required before production use.
14. **Production service controls are absent.** The supplied MCP's unauthenticated, soft per-IP discovery tier is not an approved sensitive-data gateway. Backend identity, auth, provider permissions, limits, and deployment are unresolved for the actual flight source.

## 6. Verification performed

| Check | Result |
| --- | --- |
| Full userscript JavaScript syntax (`node --check` via stdin) | Pass. |
| Decode all four embedded HTML templates and compile each embedded inline script | Pass. Does not establish browser/runtime or business correctness. |
| Syntax checks for all MCP source modules and smoke test | Pass. |
| `npm ci --ignore-scripts --no-audit --no-fund` using supplied lock | Pass; 93 packages installed without changing archive source. |
| Original pure-helper probes | Pass for round-trip Fast Search, disconnected open-jaw + ARUNK, ITA flexibility clamping, mixed-cabin extensions, and Matrix 2-adult/1-child/1-infant encoding. Synthetic requests only, not flight results. |
| Original local MCP health / initialize | HTTP 200; server name `agentsearch`, version 1.0.0, negotiated protocol `2025-06-18`. |
| Original local MCP `tools/list` | HTTP 200; exactly `web_search`, `instant_answer`, `fetch_url`. |
| Original `npm run smoke` overall | **FAIL** (exit 1). `instant_answer` returned `isError: true`, `Error: AgentSearch API request failed (/v1/answer?q=python+programming+language): fetch failed`. No successful upstream result or expected-403 exception was observed. |
| BO authenticated workflow / Chrome installation / live flight inventory / UI parity | **Not run; not implemented/available.** Do not count protocol or helper checks as extension E2E acceptance. |

Audit runtime: Node 22.22.3, npm 10.9.8. The temporary MCP server was stopped after verification. No BO data or credentials were used in any network probe.

To reproduce the upstream archive check without adding extracted files to Git:

```bash
mkdir -p .arena/audit
unzip -q agentsearch-mcp-master.zip -d .arena/audit
cd .arena/audit/agentsearch-mcp-master
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
# In a second terminal, same directory:
npm run smoke
```

This reproduces an audit of the supplied web-data connector, not the requested flight backend. An upstream fetch failure must not be reported as a passing smoke test. Proxy secrets, if legitimately provisioned for that service, belong in server-side environment configuration, not chat or extension code.

## 7. User clarification: use the existing Chrome login

After the initial audit, the user clarified that live search should use the agent's existing logged-in Chrome session. Three screenshots were subsequently supplied, resolving the visual-reference input. The user then selected a local-only Chrome inspector to capture the still-missing real result structure.

Later branding instructions require the repository's `logo.png`, the SpicyTerminal screenshot's near-black/monospace/green-output style, and the supplied SpicyExtension header wordmark before PR/merge. The icon and shared terminal styling are implemented; the exact inline header binary is not accessible in the workspace/remote tree and root `header.png` has been requested. See [BRANDING.md](BRANDING.md) for the current boundary rather than treating interim typography as the supplied graphic.

A session-based Basis adapter can work inside an authorized first-party Basis tab, allowing Chrome/the application to handle its normal authentication. This does **not** require copying cookies, passwords, bearer tokens, or the unrelated MCP proxy secret into the extension. It also does not mean this workspace has access to the user's local browser session.

The confirmed userscript deep link is enough to plan navigation into that tab, but not to validate automatic search execution or parse its results. From this environment, public page retrieval still reaches sign-in. Direct HTTPS retrieval of the public page/client HTML with both Python and curl also failed at TLS connection setup; no authenticated flight markup, client bundles, or result schema were obtained. No authentication bypass was attempted. No claim is made that signed-in searches or result extraction already work.

The updated architecture uses BO → extension messaging → dedicated signed-in Basis search tab → known result extraction/normalization → BO viewer. The supplied web MCP stays out of this flight-data path. See [BROWSER_SESSION.md](BROWSER_SESSION.md) for the concrete boundary and safe sample-collection instructions.

## 8. Required next inputs

1. **A redacted actual Basis flight-search result structure:** preferably a successful response JSON body, or copied flight-result card/detail DOM HTML from an authorized signed-in search. An authorized integration repository/docs remains an alternative. Do not send passwords, cookies, tokens, request headers, or unsanitized HAR files. A session can be reused in Chrome without exporting credentials.
2. **Visual references — received.** The three screenshots guide BO styling, widget parity and flight-shopping density; they are not a source of production flight values.
3. **For actual BO parser/E2E validation:** representative redacted card/detail markup and Matrix payloads, then an authorized Chrome/BO test workflow. Screenshots alone cannot establish DOM selectors or SPA behavior.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the provisional design and acceptance plan. Source-specific result mappings, capability decisions, and fixture-backed normalization remain deliberately undefined until the authenticated source structure is available.
