# Basis integration using the agent's signed-in Chrome session

Date: 2026-09-12 (Africa/Cairo). **Design/verification requirements, not an implemented adapter.**

## Confirmed direction

The user clarified that the extension should use the agent's existing logged-in Chrome session. That is a different integration from the unrelated public web-search MCP archive.

An extension installed in the same Chrome profile can navigate a first-party Basis tab through the existing userscript's known search link. The browser and site handle their normal login. The extension does not need to extract cookies, store passwords, or copy an API key. A logged-in session does not itself reveal a stable flight-response schema, authorize bypassing site access controls, or make the user's local Chrome accessible from this coding workspace.

## Proposed adapter flow

```text
BO content UI
  → validated SearchRequest + request ID
  → extension service worker
  → dedicated first-party Basis search tab
       https://agentsearch.vercel.app/flights?s=<existing deep-link format>
  → Basis runs its actual search under its own authenticated session
  → Basis integration content script reads the verified result structure
  → validated FlightSearchResponse + matching request ID
  → BO flight option viewer
```

### Responsibilities

1. Open a new extension-managed source tab, or reuse only a tab the extension created for this workflow. Do not navigate away from an agent's unrelated active source tab.
2. Use the existing known per-leg Basis link builder after input validation. Verify in the real application whether the deep link automatically executes search or requires an explicit Search action. Do not claim that navigating the URL proves execution.
3. If sign-in is required, show “Sign in to Basis in the search tab, then retry.” Login stays entirely in the source application. Do not scrape or auto-fill authentication controls.
4. Read only flight-result data needed for the requested viewer. Prefer a supported documented integration or structured result representation if available. Otherwise use verified DOM parsing from actual result cards/details, with diagnostics when markup changes. Do not hook all browser requests or collect account/profile data.
5. If accessing page-produced structured responses is necessary, first inspect and narrowly identify the real response format and mechanism. Never guess endpoint names, replay undocumented credential-bearing requests, or forward arbitrary page/network payloads.
6. Correlate the results to the requested route, dates, cabin, passengers and source-tab/request generation. The old page's visible results must not satisfy a new request while navigation/loading is pending.
7. Normalize only verified fields; unknown fares, cabins, taxes, availability, seat counts and terms remain absent. Preserve source timestamps and distinguish total-party/per-traveler amounts.
8. Handle permission denial, login expiry, source tab close/navigation, no results, source errors, timeout, changed result structure and extension reload. Source navigation or close must cancel/invalidate pending work rather than leak stale results to another BO lead.
9. For unsupported joined/mixed-cabin searches, show independent per-leg results as separate searches. A set of source tabs is not a guaranteed combined ticket.
10. Keep the approved source tab visible/accessible for verification and Open source actions. Do not book, select paid services, or submit reservations automatically.

## Information still missing

We have the userscript's **search URL payload**, but not authenticated Basis result HTML/JSON or the real signed-in search lifecycle. Public page retrieval leads to sign-in; direct source-HTML retrieval in the sandbox failed during TLS setup. No private flight-response fields have been observed.

Therefore a production result parser, completeness checks, joined-fare semantics, availability mapping, or session E2E claim would currently be speculation. The source contract needs to be established before implementation.

## Safe sample collection

The three screenshots have now been received. The user selected a local Chrome inspector to obtain the missing authenticated result structure; it is implemented and documented in [INSPECTOR.md](INSPECTOR.md). Use that tool's selected-area capture and explicit review/export rather than sending credentials. The following manual options remain alternatives:

### Option A — flight response body

In your normal signed-in Basis tab:

1. Open Chrome DevTools → Network, then perform a flight search you are authorized to run.
2. Find the request whose **Response** contains the actual flight options shown on screen.
3. Share the JSON response body after removing any account information, customer names, email addresses, booking references, or secret values. Keep the flight field names, nesting, routes, dates, fare/points/currency structure, cabin and availability fields intact where possible.
4. A second empty-result/error body is helpful if readily available, but do not deliberately create repeated paid searches just to collect one.

Do **not** send request headers, “Copy as cURL,” cookies, bearer tokens, session storage, passwords, API keys, or an unsanitized HAR. Authentication details are unnecessary for schema inspection.

### Option B — flight-result DOM

If identifying a response is difficult, inspect a rendered flight-result card in DevTools → Elements, use Copy → Copy outerHTML for that card, and do the same for its expanded itinerary details. Redact customer/account identifiers. Include a screenshot of the corresponding result so parsing can be checked against what the agent sees.

A screenshot alone is a visual reference, not a machine-readable result contract. No credentials should be included in either option. After the implementation is based on actual structures, the final session flow must still be tested in Chrome with an authorized source/BO session.
