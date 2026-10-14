# Restamp Mock Data Audit (Phase 1 — Read-Only)

- Date: 2026-10-13 (UTC).
- Scope: read-only audit. No application files modified, no commits, pushes, deploys,
  migrations, DB writes, OTP/auth changes, or schema changes. Existing Add Property reset
  behavior and optional-email validation preserved untouched.
- Label key: **CONFIRMED** = directly inspected (quoted below); **SUSPECTED** = inferred
  from code structure, needs runtime verification; **NOT VERIFIED** = could not be checked
  (e.g. requires live backend data).
- No secrets, tokens, database URLs, or credentials are included in this report.

## 1. Executive summary

Restamp's frontend is largely a **mock-driven UI with real APIs wired only on the core
buy/sell path**. CONFIRMED working end-to-end against the backend: buyer listing feed,
detail, similar, contact-reveal, saved, enquiries; owner listings CRUD, photo
upload/delete, drafts; OTP/Google auth and role switching. Everything else rendered in
production UI is fabricated locally: the entire agent/broker module (11 screens, zero
backend calls), all leads/enquiries-inbox/messages/views/visits/earnings data, dashboard
metrics with hardcoded fallbacks (`14`, `1,248`, `06`), a 44-item mock property catalog
that **silently replaces API results on any error** (`setError(null)`), 223 Unsplash URLs,
demo OTP codes active via `.env`, and static plans/pricing/valuations. No backend
models, endpoints, or response fields exist for leads, visits, views, notifications,
ratings, agents, plans, payments, invoices, or admin — so those UIs cannot be made real
without backend work plus product decisions. The dev seed script (`scripts/seed_dev_data.py`)
is properly guarded (localhost-only, allow-listed DBs, idempotent) and must be preserved,
as must automated-test fixtures.

## 2. Inventory of mock/hardcoded data

### 2.1 Buyer home, feeds, search, details (production UI)

- **CONFIRMED** `frontend/src/data/properties.js` (1577 lines): `RECOMMENDED_PROPERTIES`
  (~14), `VERIFIED_PROPERTIES` (~16), `RECENTLY_ADDED` (~14) with hardcoded ids
  (`rec-*`/`ver-*`/`recadd-*`), prices (`₹1.45Cr`, `rawPrice` ints), ratings (4.75–4.98),
  Chennai addresses, `agent{name, phone +91 98765 43210 / +91 98401 22334 / +91 98840 55667,
  avatar, agency}`, Unsplash `w=1000` images; `CHENNAI_LOCALITIES` (8) with fabricated
  counts (`OMR 1,420+ Props`); `NEWLY_LAUNCHED_PROJECTS` (4, fully static, no endpoint);
  `DEMAND_DATA` (fabricated search % + bar widths). Assembled as `ALL_PROPERTIES` (~44).
- **CONFIRMED** `frontend/src/api/useListings.js:143-155` (`fetchPage` catch): on any
  `GET /buyer/listings` error renders `filterMockProperties(...)` and calls
  `setError(null)` — error UI never appears; production silently shows samples.
- **CONFIRMED** `frontend/src/screens/buyer/HomeScreen.js:330-347,351-376`:
  `liveListings?.length ? liveListings : VERIFIED_PROPERTIES`, over-filtering falls back
  to mock, preview count falls back to `ALL_PROPERTIES.length`; `L442` fake
  "no unread notifications" alert + always-red dot; `L895-936` fabricated demand bars;
  `L810-872` static new-launch cards (incl. tap-to-reveal `+91…` phones).
- **CONFIRMED** `frontend/src/screens/buyer/ExploreScreen.js` — **zero backend calls**:
  `LOCALITY_DATA` (L44-149) with fake counts/prices/growth/yields/metro/images;
  `L189-190` no-match → `ALL_PROPERTIES.slice(0,6)`; fallbacks `+919876543210`,
  `₹7,200/sqft`, `Verified Agent / Chennai Prime Realty / +91 98401 22334`.
- **CONFIRMED** `frontend/src/screens/buyer/SearchScreen.js`: demo filter constants
  (L50-83; `Pool`/`Townhouse` have no backend param — client-side only); `L324-344`
  hardcoded per-type tags; detail sheet fallbacks `10 photos`, rating `4.9`, beds `3`,
  baths `2`, agent avatar/agency/phones (`+919876543210`, `+91 98401 22334`).
- **CONFIRMED** `frontend/src/api/listings.js:9-35` (`fetchListingDetail` catch →
  `ALL_PROPERTIES.find(...)`) and `src/api/mappers.js:6-65`
  (`PROPERTY_TYPE_FALLBACK_IMAGES`, `getCleanImageUrl` pool substitution,
  `rating → 4.9` documented mock-only): intentional image/rating defaults, but
  production-visible whenever backend fields are absent.
- **CONFIRMED** `frontend/src/components/PropertyGalleryModal.js:32-56,169-204`
  (`CURATED_ROOM_SAMPLES`, `isSample:true` padding) and
  `src/components/common/SafeImage.js:4-5` (stock fallback): production-visible stock
  photos on missing/error images — intentional defaults, keep with real-data priority.

### 2.2 Saved, enquiries, messages, account (production UI)

- **CONFIRMED** `frontend/src/context/WishlistContext.js:27`:
  `useState(ALL_PROPERTIES.slice(0, 2))` — logged-out wishlist starts with 2 mock
  listings; remote sync only for authed BUYER with numeric `backendId` (intentional).
- **CONFIRMED** `frontend/src/screens/buyer/SavedScreen.js:44-97`:
  `INITIAL_VIEWED_PROPERTIES` (4, fake "Viewed Xm ago") and `INITIAL_CALL_HISTORY`
  (3, `Ramesh Kumar / Kavitha Sundar / Suresh Menon` + phones + durations) always
  rendered; `L135-143` hardcoded profile (`Jessica Taylor`, `jessica.taylor@example.com`,
  `+91 98765 43210`, `Verified Buyer`).
- **CONFIRMED** `frontend/src/screens/buyer/EnquiriesScreen.js:74-160`:
  `INITIAL_ENQUIRIES` (4 fake agents/prices/times/`unread:true`) shown via
  `serverEnquiries ?? INITIAL_ENQUIRIES` whenever logged-out, non-buyer, or pending.
- **CONFIRMED** `frontend/src/screens/buyer/MessageScreen.js:26-95,104,152-185` —
  **zero backend**: 4 fabricated chats with message bubbles, 1.2s random auto-replies,
  fake calling alerts.
- **CONFIRMED** `frontend/src/screens/buyer/AccountScreen.js:79-122,136-237` — **zero
  backend**: `Alex Morgan`, `alex.morgan@restamp.app`, fabricated `12 Site Visits` /
  `4 Enquiries`, fake visit alerts, `Visa •••• 4242`; logout is an alert only (does not
  call `AuthContext.logout()`).
- **CONFIRMED** `frontend/src/screens/buyer/ProfileScreen.js:95-103` (defaults
  `Alex Smith / +91 98765 43210 / alex.smith@restamp.in`, overwritten by `authUser`
  when authed — intentional with brief pre-auth flash) and `MenuScreen.js`
  (`CHENNAI_PRICE_TRENDS`, `MARKET_INSIGHTS`, plan prices `₹0–₹19,999`, estimator rates
  `getLocalityData()` — static marketing content, intentional, not user-specific).

### 2.3 Owner dashboard, properties, leads (production UI)

- **CONFIRMED** `frontend/src/context/OwnerContext.js:5-327` (`INITIAL_PROPERTIES`,
  8 `own-prop-*` with fabricated views/enquiries/visits, e.g. `1248/35/8`, Unsplash
  images, demo addresses/docs) and `:329-516` (`INITIAL_LEADS`, 8 with demo PII —
  `Harrison Ledley +91 98840 12345`, `harrison.ledley@gmail.com`, etc.); `:520-534`
  hardcoded `Owner Pro Plan ₹2,999` quota driving subscription gating. Profile
  `:540-549` intentionally blank phone/email (correct — do not revert).
- **CONFIRMED** `frontend/src/screens/owner/OwnerDashboardScreen.js:62,74-76,229,246,267`:
  100%-mock fallback when fetch fails, fabricated metric sums, and hardcoded
  fallbacks `14`, `1,248`, `06` when totals are zero; demo phone/name/avatar fallbacks.
- **CONFIRMED** `frontend/src/screens/owner/OwnerLeadsScreen.js` and
  `OwnerLeadDetailScreen.js` — **no backend imports/calls**: all counts, ratings
  (`|| 5`), prices (`₹25,000 / month`), localities (`Anna Nagar, Chennai`), phones,
  and a synthetic fallback property rendered from mock leads.
- **CONFIRMED** `frontend/src/screens/owner/OwnerPropertyLeadsScreen.js:103-175`:
  when a property has zero leads the UI **invents 3 fake leads**
  (`gen-lead-<id>-1..3`, same Harrison/Deepak/Priya PII) instead of an empty state.
- **CONFIRMED** `frontend/src/screens/owner/OwnerProfileScreen.js:147,274,286,330`:
  hardcoded `Aadhaar VERIFIED`, `₹2,999` transaction, `Invoice #RST-2026-8819`,
  `support@restamp.in / 1800-RESTAMP` alerts; badges derive from mock arrays.

### 2.4 Add/Edit defaults, photos, preview (mixed — mostly intentional)

- **CONFIRMED** intentional new-form defaults in
  `frontend/src/screens/owner/OwnerAddPropertyScreen.js` (Rent/Residential/Apartment,
  `2 BHK`, Chennai, measurements, `25000/100000/3000`, `Semi-Furnished`, `Freehold`,
  etc.; `DEFAULT_SAMPLE_PHOTOS = []` :208, blank phone/email/pincode): legitimate UX,
  not mock data. `FORM_DEFAULTS` correctly uses `""/[]`, so the reset path is clean.
- **CONFIRMED** stale-sample first-mount defaults (production-UI): `Anna Nagar`,
  `5th Avenue, Shanthi Colony`, `Green Acres Residency`, `Flat 402, Block B`,
  `Opposite Tower Park`, long Anna Nagar description, `otherRooms/feature/amenity`
  presets, `Market average for Anna Nagar: ₹22,000 – ₹28,000` hint (:1989). Only on
  first mount; reset/draft paths already use blanks. Product decision needed (Sec. 6).
- **CONFIRMED** `frontend/src/api/owner.js` clean: payload builders forward real form
  values, throw on bad pincode (never fake defaults), blank email → null;
  `toOwnerProperty()` sets `views/enquiries/visits: 0` with an explicit
  no-backend-counter comment (intentional zero, not fabrication).

### 2.5 Agent/broker workflows — implemented UI, zero backend (CONFIRMED)

- All 11 screens under `frontend/src/screens/agent/` are fully built UI with **zero**
  backend calls (`grep apiGet|apiPost|fetch(` in that dir returns nothing; sole import
  is local `useAgent`). `AgentContext.js` is entirely hardcoded demo (5 leads, 4 visits,
  4 earnings transactions, `Vikram Prabhu / +91 98400 99888 / RERA TN/AGENT/2024/00842`,
  `Agent Pro ₹6,999`, `HDFC ••••4892`, coupons `RESTAMP/AGENT500/PROMO`, simulated
  1200ms payment + fake invoice alerts). Backend has postcode-grant tables
  (`broker_postcode_access_current/history`) and `GET /broker/scope` (real), but no
  agent-facing listing/lead/visit/earning endpoints. Product decision required.

### 2.6 Auth, profile, notifications, admin

- **CONFIRMED** `frontend/src/screens/auth/LoginScreen.js:49-60` (10 hardcoded OTPs)
  with `.env` `EXPO_PUBLIC_OTP_DEMO_MODE=1` enabling visible on-screen OTP codes
  (`:479-502`), request-failure bypass (`:140-157`), and resend fallbacks (`:518-539`);
  plus a Skip-login guest entry (`:285-294,361-367`). Real verify/login/role/Google-link
  calls exist alongside. **Do not change OTP/auth behavior in this audit.**
- **CONFIRMED** no notification feed exists anywhere (only toggles/bells/placebo
  alerts); no `GET /notifications` endpoint. No admin dashboard exists in `src/`
  (`is_admin` is stored from `GET /auth/me` but never branches any UI).
- Backend auth/user/role endpoints (`/otp/*`, `/google*`, `/me`, `/users*`) are real;
  `/buyer/welcome`, `/owner/vault`, `/owner/check-ownership/*`, `/admin/ping`,
  `/admin/grants` are authorization proofs/stubs, not features. Billing models
  (`plans/payments/subscriptions/entitlements`) exist with **no router endpoints**.

### 2.7 Fixtures that must be preserved (not mock debt)

- **CONFIRMED** `backend/scripts/seed_dev_data.py`: dev-only (refuses non-localhost URLs
  and non-allow-listed DBs), idempotent marker identities, `--clean` scoped deletes —
  legitimate local validation data. Preserve.
- **CONFIRMED** automated-test fixtures (`*_test.py`, `*.test.mjs` sample URLs/phones)
  are isolated test data, not production UI. Preserve; do not remove.
- 223 Unsplash URLs in `src/` are production-visible today (Sec. 2.1–2.5); only
  `mappers.js`/`SafeImage.js` fallbacks qualify as intentional defaults.

## 3. Frontend-to-backend API mapping

| UI need | Backend endpoint (CONFIRMED in `app/routers/`) | Returns needed fields? | Frontend client |
|---|---|---|---|
| Buyer feed/search/filter/sort | `GET /buyer/listings` (`buyer.py:23`) | Yes (cards; no rating/agent — correctly absent) | `api/listing.js`+`useListings.js` — but swallows errors into mock |
| Listing detail + gallery | `GET /buyer/listings/{id}` (`buyer.py:68`) | Yes | `fetchListingDetail` — falls back to mock |
| Similar | `GET /buyer/listings/{id}/similar` (`buyer.py:78`) | Yes | `fetchSimilar` |
| Contact reveal | `POST /buyer/listings/{id}/contact` (`buyer.py:90`) → `ContactRevealOut{phone}` | Yes (phone only; UI mock emails/agencies have no source) | `api/contact.js` |
| Saved | `GET/POST/DELETE /buyer/saved*` (`buyer.py:141,157,168`) | Yes | `api/saved.js` + wishlist (mock-initialized) |
| Buyer enquiries | `POST/GET /buyer/enquiries*` (`buyer.py:101,120,132`) → `EnquiryOut{id,listing,message,status,listing{title,price}}`, **no agent fields** | Partial (UI shows agents/times/unread — no source) | `api/enquiries.js` |
| Owner listings CRUD + photos | `POST/GET /owner/listings`, `GET/PATCH /owner/listings/{id}`, photo `POST/DELETE` (`owner.py:27,99,111,124,209,264`) | Yes | `api/owner.js` — clean |
| Drafts | `POST/GET/PUT/DELETE /owner/drafts*` (`owner.py:303,322,332,345,368`) | Yes | `api/owner.js` — clean |
| Auth/roles/me | `/otp/*`, `/google*`, `/me`, `/users*` (`auth.py`, `users.py`) | Yes | `api/auth.js`, contexts — clean |
| Owner leads/inbox/visits/views | **MISSING** — no such endpoint | n/a | none (all local) |
| Notifications | **MISSING** | n/a | none |
| Ratings/agents/earnings/invoices | **MISSING** | n/a | none |
| Plans/payments/subscriptions | **MISSING endpoints** (models only) | n/a | static price cards |
| Locality counts/prices/trends/estimator | **MISSING** | n/a | static constants |
| Admin | stubs only (`/admin/ping`, `/admin/grants`) | n/a | none |

## 4. Missing endpoints or fields

1. Owner leads/inbox: no `GET /owner/leads|enquiries|visits`, no lead/visit/view models.
   (Buyer enquiries exist but carry no agent/time/unread fields and are buyer-scoped.)
2. Counters: no views/enquiries/visits tracking or aggregates (UI sums local constants).
3. Notifications: no model, endpoint, or unread state.
4. Ratings/agents: no agent directory, ratings, or agency fields anywhere in API.
5. Billing: models without endpoints; plan/coupon/invoice/UPI flows are client fiction.
6. Discovery metadata: no locality counts, price trends, demand %, RERA/project feeds.
7. Admin: no dashboard APIs (only ping/grants).
8. Drafts/enquiries edge: `EnquiryOut` lacks correspondent identity and timestamps the UI
   wants; `ContactRevealOut` lacks email/agency by design (privacy — product call).

## 5. Items safe to replace immediately (no backend work)

1. `useListings.js:143-155`: stop swallowing errors — surface `setError(e)` empty/error
   state instead of mock fallback (explicitly required: never silently fall back).
2. `HomeScreen.js:330-347,376`: render empty/error states when live list is empty or
   failed; remove mock-slider substitution (keep static editorial modules flagged).
3. `ExploreScreen.js:189-190`, `PropertyDetailModal.js:243-246`, `listings.js:31-35`:
   empty/error states instead of mock substitution.
4. `OwnerPropertyLeadsScreen.js:103-175`: zero leads → empty state, delete generator.
5. `OwnerDashboardScreen.js:229,246,267`: show `0`/derived zeros instead of `14`,
   `1,248`, `06`.
6. `WishlistContext.js:27`: initialize `[]` (keep local-wins sync logic).
7. `SavedScreen` viewed/call history, `MessageScreen` inbox, `AccountScreen` stats:
   remove fabricated rows → empty states (message thread UI itself can stay as shell
   only if product keeps messaging — see Sec. 6).
8. `OwnerContext.js` `INITIAL_PROPERTIES`/`INITIAL_LEADS`/subscription: initialize
   empty (`[]`, free-tier/null plan) once 1–5 land; keep `addProperty` zero-stats logic.

## 6. Items that require backend work or a product decision

- A. Owner leads/visits/views: needs lead + visit + counter models/endpoints and a
  decision on what a "lead" is (buyer enquiry projection vs separate object). Blocks all
  owner lead screens, dashboard metrics, badges, and the fake-lead generator removal.
- B. Messaging inbox: needs thread/message APIs or a decision to remove the tab.
- C. Notifications: needs model + endpoint + unread state, or remove bells/dots.
- D. Ratings/agents/earnings/invoices: needs agent directory + payout systems, or
  de-scope agent monetization UI (currently 11 screens of local fiction).
- E. Plans/payments: needs billing endpoints wired to a provider, or freeze
  plan/upgrade UI to display-only with no fake checkout.
- F. Discovery metadata (counts, trends, estimator, demand %, RERA launches): needs
  aggregation endpoints or an explicit "editorial/static" label decision.
- G. Add-form first-mount demo defaults (Anna Nagar address, description, amenity
  presets): product call — blank them to `FORM_DEFAULTS` parity or keep as demo
  starter content (reset path already uses blanks).
- H. Demo OTP/skip-login: security-gated by env; any change is product/auth decision —
  explicitly out of scope here.
- I. Contact emails/agencies shown in UI: no backend source by design; decide to drop
  those fields vs add (privacy-sensitive) sources.

## 7. Prioritized implementation plan (small, verifiable phases)

- P0 — Stop fabrication on failure (frontend only): Sec. 5 items 1–4 (error/empty states,
  kill fake-lead generator). Verifiable: airplane-mode walkthrough shows errors/empties,
  never samples.
- P1 — Zero-out owner metrics (frontend only): Sec. 5 items 5, 8 (zeros + empty arrays).
  Verifiable: fresh owner account shows 0s and empty lists.
- P2 — Buyer history/inbox honesty (frontend only): Sec. 5 items 6–7 (empty wishlist,
  history, inbox states). Verifiable per tab while logged out.
- P3 — Backend leads MVP: lead/visit/counter read endpoints + wire dashboard + leads
  screens (removes generator + fake metrics for real). Gated by decision A.
- P4 — Enquiries/notifications: extend `EnquiryOut` (correspondent + timestamps) or add
  inbox/notification endpoints per decisions B/C/H.
- P5 — Billing/plans + agent scope per decisions D/E (largest; last).
- P6 — Discovery metadata per decision F; Add-default parity per decision G.

## 8. Tests needed for each phase

- P0: unit tests for `filterMockProperties` removal/error propagation (extend
  `scripts/*.test.mjs` harness or add Jest-style pure tests); offline-mode test asserting
  error state renders and no `ALL_PROPERTIES` render. Backend suites unaffected.
- P1: OwnerContext init tests (empty arrays, zero stats); dashboard zero-state tests.
- P2: logged-out wishlist/history/inbox empty-state tests.
- P3+: backend endpoint tests (`tests/test_owner_leads.py`-style: create enquiry as buyer
  → visible to owner; counters increment) + frontend mapping tests.
- Every phase: `node --test scripts/photo-retry-state.test.mjs
  scripts/property-edit-mode.test.mjs`, `npm run build:web`, `git diff --check`;
  backend `pytest` on `restamp_test` only when backend changes.

## 9. Risks and dependencies

- Removing mock fallbacks before backend gaps close **will surface empty screens** —
  sequence P0→P3 deliberately; do not re-add silent fallbacks afterward.
- Owner lead/screen redesign may be needed once real lead shapes land (current cards
  assume agent/rating/budget fields with no source).
- Billing/agent changes touch money and PII — require provider selection, privacy
  review, and explicit approval; never invent transactions.
- Demo OTP + skip-login are env-gated production bypasses — flag to product; untouched.
- `.env` has no `EXPO_PUBLIC_API_URL`, so local builds hit production Render by default —
  live verification needs an approved test backend/data plan first.
- Test fixtures and `seed_dev_data.py` (guarded, idempotent) must stay; tests use
  dashed-tag pincodes that never collide with seed ranges.

## 10. P0 implementation (2026-10-13, frontend only, uncommitted)

### Files changed
- `src/api/useListings.js` — deleted `filterMockProperties` + `ALL_PROPERTIES` import;
  catch now surfaces `setError(e)` (first page clears to empty, appends preserve loaded
  items); hook API unchanged.
- `src/screens/buyer/HomeScreen.js` — feed from `liveListings ?? []` (no mock bases);
  removed empty-filter and preview-count fallbacks; client deal/BHK/status filters made
  live-shape aware (`transactionType` first, null-safe, unknowns kept); single error
  banner with Retry, loading placeholder, per-slider empty states; `Sample` badges on
  Explore-by-Location, New Launches, and Demand sections (content untouched, P6).
- `src/api/listings.js` — `fetchListingDetail` rejects on failure/missing (no
  `ALL_PROPERTIES` lookup); neutral type-based gallery placeholders kept.
- `src/components/PropertyDetailModal.js` — failed similar fetch for backend-backed
  listings renders empty (section hides); loading and mock-sourced flows unchanged.
- `src/api/owner.js` — new pure `selectPropertyLeads(leads, property)` (genuine matches
  only, possibly `[]`).
- `src/screens/owner/OwnerPropertyLeadsScreen.js` — uses `selectPropertyLeads`; deleted
  3-fake-lead generator; existing empty state now reachable with honest 0 counts.
- `scripts/property-feed-honesty.test.mjs` — new (Sec. 10 test results).

### Mock fallbacks removed
UseListings silent substitution (+ `setError(null)` masking); Home triple-slider mock
bases, empty-filter substitution, fabricated preview count; detail-record mock lookup;
similar-on-error mock carousel for real listings; owner fake-lead generator.

### Remaining static editorial data (badged Sample, P6)
`CHENNAI_LOCALITIES` counts, `NEWLY_LAUNCHED_PROJECTS` cards/phones, `DEMAND_DATA`
bars. Out of P0 scope (unchanged): ExploreScreen, Saved history/calls, Wishlist init,
Agent module, Messages, Account stats, OwnerContext metrics/leads, dashboard fallbacks.

### Test coverage and results
- New `scripts/property-feed-honesty.test.mjs` (same plain-node tmp-copy convention):
  D1 failure rejects, D2 missing rejects, D3 real result preserved (no `agent`
  fabrication), D4 empty stays empty, D5 non-backend id skips fetch, L1–L5 genuine-only
  lead selection — **all pass**.
- Existing `photo-retry-state` + `property-edit-mode` suites: **pass** (no regressions).
- Hook/component honesty (`useListings` catch, HomeScreen states, modal similar branch)
  verified by inspection + `npm run build:web` (no browser tests run — harness cannot
  mount React; stated here, not claimed).

### Known limitations and follow-up
- Editorial `Sample` sections still show illustrative figures until P6 endpoints/product
  labels land; lead cards still assume agent/rating fields pending P3 shapes.
- `handleCall` fallback phone and property-strip fallbacks in OwnerPropertyLeadsScreen
  retained (unreachable without a lead record; noted, not P0).
- No backend, OTP/auth, schema, or deployment changes made.

### P0 review clarifications (2026-10-13, read-only review, no app changes)
- HomeScreen client deal/BHK/status filters were additionally made live-shape aware
  (`transactionType`-first, null-safe, unknowns kept): the removed mock fallback had
  been masking that mock-schema (`badgeType`) filtering dropped live records. Without
  this, P0 would blank the feed even with live data.
- `PropertyDetailModal` "Listed By" generic labels, `4.9` rating fallback, and the
  call-alert fallback number still render for successful responses with absent optional
  fields. These are pre-existing presentation defaults, not missing-response fabrication
  (missing responses now reject before render); remediating them needs contact-reveal
  wiring + product copy decisions — recorded as P1/P3 follow-up, not a P0 regression.
- No P0 regression found: failed/empty/missing feed, detail, and similar paths cannot
  reach mock records (verified in `useListings.js`, `HomeScreen.js`, `listings.js`,
  `PropertyDetailModal.js`); zero-lead properties reach the existing empty state
  (verified in `OwnerPropertyLeadsScreen.js`). Validation re-run at review time:
  3/3 node suites pass, `npm run build:web` succeeds, `git diff --check` clean.

## 11. P1 implementation (2026-10-13, frontend only, uncommitted)

### Files changed
- `src/context/OwnerContext.js` — deleted `INITIAL_PROPERTIES` (8 fabricated listings)
  and `INITIAL_LEADS` (8 fabricated leads with demo PII); both initialize `[]`.
  Subscription neutralized to a device-side quota only
  (`{ active: true, status: "Active", listingLimit: 5, usedListings: 0 }`) — no plan
  name, price, validity, dates, or usage history. Quota mechanics, `addProperty`
  zero-stats, plan-checkout functions, and demo profile name/avatar untouched (P5 /
  product-copy scope).
- `src/api/owner.js` — new pure `sumOwnerMetrics(properties)` (missing counters count
  as zero; non-arrays yield zeros).
- `src/screens/owner/OwnerDashboardScreen.js` — metrics via `sumOwnerMetrics`
  (fresh accounts show `0`, `0`, `00`); plan card fallbacks neutralized to
  `"Standard"` / `"—"` (placeholder copy pending product decision, Sec. 6E).
- `src/screens/owner/OwnerLeadsScreen.js` — mock-id fallback `"own-prop-1"` → `null`
  (existing null-safe selection and empty state cover the rest).
- `src/screens/owner/OwnerProfileScreen.js` — plan badge fallback `"Owner Pro"` →
  `"Standard"` (counts already derive honestly as 0).
- `scripts/property-feed-honesty.test.mjs` — new `O1–O5`: zeros for empty/absent
  input, real derivation, `OwnerContext` source guards (empty initials, no mock-record
  or fabricated-quota fixture).

### Behavior
Fresh owner accounts show 0 views/enquiries/visits, empty property/lead lists with
existing empty states, and no purchased-plan claims; publishing still gated by the
unchanged local quota (`active` + `usedListings < listingLimit`), so the Add flow keeps
working with no backend. Mid-edit/draft resume, reset behavior, email validation, and
P0 feed/detail/lead honesty untouched.

### Test coverage and results
- New `O1–O5` all pass; existing suites green (3/3 files pass, 0 fail).
- `OwnerContext` module itself imports React and cannot run in the plain-node harness;
  its initial state is guarded by source-text assertions (`O4–O5`) plus inspection and
  `npm run build:web` (Metro parse). Stated here, not overstated.
- Backend suites unaffected (no backend changes).

### Known limitations and follow-up
- `activateSubscription` plan-name fallbacks and plan-checkout screens remain (P5).
- Profile name/avatar/`memberSince`, `handleCall` fallback phone, lead-card
  agent/rating assumptions remain for P3 shapes / product copy decisions.
- Tab counts, badges, and subscription copy will need another pass once real lead and
  billing endpoints land; placeholder labels `"Standard"` / `"—"` are not product copy.

## 12. P2 implementation (2026-10-13, frontend only, uncommitted)

### Files changed
- `src/context/WishlistContext.js` — wishlist initializes `[]` (deleted
  `ALL_PROPERTIES.slice(0, 2)` seed and its import); deleted unused
  `restoreDefaultWishlist()` (zero callers in `src/`; it could replace real
  saves with the full sample catalog). Real `/buyer/saved` sync, BUYER-role
  gates, numeric `backendId` checks, save/unsave + rollback, and
  `refreshWishlist` semantics untouched. Failures keep genuine state, never
  mock records.
- `src/screens/buyer/SavedScreen.js` — deleted `INITIAL_VIEWED_PROPERTIES`
  (4) and `INITIAL_CALL_HISTORY` (3 with demo PII); both `useState([])`.
  Existing wishlist/viewed/call empty states and Clear-viewed behavior kept;
  tab counts now honest zeros. Contact handlers (`handleWhatsApp`,
  `handleCall`, bottom-sheet copy/Call/WhatsApp) only dial genuine numbers
  via `cleanPhoneOrNull`; missing numbers show `Phone Number Unavailable` /
  `Not available` instead of `+919876543210` / `+91 98401 22334` samples.
  Sheet identity fallbacks neutralized to `Property contact` / `Contact
  details` (was `Verified Agent` / `Chennai Prime Realty`).
- `src/screens/buyer/EnquiriesScreen.js` — deleted `INITIAL_ENQUIRIES` (4
  fake agents/conversations) and `serverEnquiries ?? INITIAL_ENQUIRIES`;
  `enquiries = serverEnquiries ?? []`. New `listError` state with
  `loadEnquiries`: loading spinner (first load), `Couldn't load enquiries` +
  Retry on failure (never samples), `No enquiries` empty state otherwise;
  previously loaded real rows are preserved across a failed refresh.
  `handleOpenProperty` no longer does `ALL_PROPERTIES` lookup or synthetic
  property/agent construction — shows `Property Details Unavailable`
  (per-enquiry detail fetch is P4 scope). Contact handlers honest via
  `cleanPhoneOrNull` (real rows carry no phone); greeting avoids
  `Hello undefined`; card/sheet show `propertyTitle`/`Enquiry` generics and
  `Not available` phones. `toRow`, `createEnquiry`, `fetchMyEnquiries`, and
  navigation untouched.
- `src/screens/buyer/MessageScreen.js` (unregistered dead code, no nav
  change) — deleted `INITIAL_CHATS` (4 fabricated threads); `useState([])`;
  deleted 1200ms random auto-reply block; `Starting a new enquiry…` /
  `Calling ${name}…` alerts replaced with `Messaging/Calling is not available
  yet.`; empty state now `No messages yet`. Thread UI shell kept only pending
  the Sec. 6B product decision.
- `src/screens/buyer/AccountScreen.js` (unregistered dead code, no nav
  change) — stats `12 Site Visits` / `4 Enquiries` → `–` (no data source;
  Saved stays honest `wishlist.length`); removed `2 Upcoming` badge;
  `Scheduled Site Visits` sample itinerary → `You have no scheduled site
  visits.`; `Property Documents` loaded-claim → `No property documents
  available.`; `Visa •••• 4242` → `–` + `No payment methods added.`
  Profile header identity left for product-copy scope (as in P1).
- `scripts/buyer-history-honesty.test.mjs` — new (see test results).

### Behavior
Logged-out buyers see empty wishlist (count 0), empty Viewed and Call tabs
(counts 0) with existing empty states, and an empty Enquiries list; failed
enquiry fetches show an error + Retry instead of samples. Authenticated
BUYER rows (saved, enquiries) still map real API data with contact fields
left undefined (no invented agents/phones/times/unread). No new
persistence, tracking, or backend requests added; no calls placed.

### Test coverage and results
- New `scripts/buyer-history-honesty.test.mjs` (same plain-node tmp-copy
  convention; `global.fetch` stubbed; React guarded by source-text
  assertions + `npm run build:web`): W1–W4 (empty init, restore removal,
  sync preserved, saved mapping), V1–V2, C1–C3, E1–E8 (incl. functional
  `fetchMyEnquiries`/`createEnquiry` contracts), M1–M3 (dead-screen honesty,
  no nav change), P1–P3 (P0/P1/API-URL guards) — **all pass**.
- Full suite: `node --test scripts/photo-retry-state.test.mjs
  scripts/property-edit-mode.test.mjs scripts/property-feed-honesty.test.mjs
  scripts/api-url.test.mjs scripts/buyer-history-honesty.test.mjs` —
  **5/5 files pass, 0 fail**.
- `npm run build:web` (expo export) succeeds; `git diff --check` clean.
- Hook/component honesty verified by inspection + source guards + Metro
  parse; no device/runtime tests run (stated, not claimed).

### Known limitations and follow-up
- `SavedScreen` profile (`Jessica Taylor`), `ProfileScreen` defaults
  (`Alex Smith / +91 98765 43210`), `AccountScreen`/`MessageScreen` headers,
  `PropertyDetailModal` `Listed By`/`4.9`/call-alert defaults, and card
  `₹6,800/sqft` / `Ready to move` presentation defaults remain for
  contact-reveal wiring + product copy (P1/P3 follow-up, same class as the P0
  review note).
- `SearchScreen` / `ExploreScreen` contact fallbacks and `ExploreScreen`
  mock-list substitution untouched (out of P2 scope; P6 discovery).
- Viewed/call/message history will stay persistently empty until view/call/
  thread backends or explicit remove decisions land (Sec. 6A/B); enquiry
  contact/time/unread/category fields likewise await `EnquiryOut` extension
  or inbox endpoints (Sec. 6B/C/I, P4).
- No backend, OTP/auth, schema, deployment, seed, or fixture changes made.

## 13. P3 implementation (2026-10-13, frontend + backend, uncommitted)

Owner Leads MVP: contact reveal now guarantees one ACTIVE lead per
buyer+listing (audits preserved per reveal); new read-only
`GET /owner/leads` serves the owner's own enquiry rows; the Leads,
per-property Leads, Dashboard Recent Enquiries, and Lead Detail screens
render genuine data with honest unavailable states. No schema or migration
changes were needed (enquiries, active_enquiries, and
contact_reveal_audits already persist everything). No detail endpoint was
added — the Lead Detail screen receives its row via navigation params.

### Backend files changed
- `Restamp-backend/app/routers/buyer.py` — `POST /buyer/listings/{id}/contact`
  calls `enquiry_svc.create_enquiry(db, buyer_id, listing_id, None)` after a
  successful reveal (idempotent reuse on repeats; per-reveal audit kept).
- `Restamp-backend/app/services/enquiries.py` — new `list_owner_leads`
  (owner_user_id scoping, physical-property ownership check on the property
  filter with 404 on foreign ids, NEW/CONTACTED/CLOSED filter, newest-first
  pagination; buyer identity is the user id only, never phone/name/avatar).
- `Restamp-backend/app/routers/owner.py` — new `GET /owner/leads`
  (`property_listing_id`/`status`/`page`/`page_size`, `OwnerLeadsResponse`).
- `Restamp-backend/app/schemas.py` — new `OwnerLeadOut` (no phone field by
  construction) + `OwnerLeadsResponse`.
- `Restamp-backend/tests/test_owner_leads.py` — new (6 tests, see results).

### Frontend files changed
- `src/api/owner.js` — new `fetchOwnerLeads` + `toOwnerLead` (genuine fields
  only; `Buyer #id` derived label; phone/avatar/rating/budget/visits stay
  undefined).
- `src/screens/owner/OwnerLeadsScreen.js`, `OwnerPropertyLeadsScreen.js` —
  fetch by selected property on mount/focus with loading/error/Retry and
  existing empty states; Switch Property UI, tabs, and `selectPropertyLeads`
  second-layer matching kept; call/message actions show unavailable instead
  of sample numbers; stars render only for genuine ratings; local status
  flips mirror device-locally until transition endpoints exist.
- `src/screens/owner/OwnerDashboardScreen.js` — Recent Enquiries reads the
  same `GET /owner/leads` (pageSize 4, no extra endpoint); avatar/chip/call
  fallbacks made honest.
- `src/screens/owner/OwnerLeadDetailScreen.js` — synthetic fallback
  property deleted (null + guarded modal + unavailable alert); phone, specs,
  locality, price, and avatar fallbacks made honest; static Verified badge
  removed.
- `scripts/owner-leads-honesty.test.mjs` — new (L1–L6, wiring, fallback, and
  P0–P2 guards; all pass).
- Buyer Leads (`EnquiriesScreen.js`) untouched.

### Test coverage and results
- Backend `tests/test_owner_leads.py`: 6/6 pass (reveal creates + reuses one
  lead with 1 then 2 audits; buyer 401/403 on owner endpoints; cross-owner
  isolation with foreign-filter 404; per-property isolation; failed reveals
  leak nothing and create nothing; status filter + phone-free shape).
- Existing backend: `test_buyer_6b4` 3/3 pass; `test_owner_listings`
  unaffected (ran in the combined 35-pass run). `test_buyer_6b5` shows 3
  count-assertion failures caused by 2 pre-existing committed rows in the
  shared `restamp_dev` database (enquiries 175/201, message None, zero
  audits — not via the reveal path, predating this change); left untouched
  per the no-DB-write rule.
- Frontend: 6/6 suites pass (`photo-retry-state`, `property-edit-mode`,
  `property-feed-honesty`, `api-url`, `buyer-history-honesty`,
  `owner-leads-honesty`).
- `npm run build:web` succeeds; `git diff --check` clean.

### Known limitations and follow-up
- Lead status transitions, visit scheduling, notes, and close outcomes are
  device-local only (no backend transition endpoints; Visit/Negotiating tabs
  honestly empty). Pause/close/archive/delete listing semantics still need a
  backend contract + product decision.
- `enquiries` has no `created_at`; ordering is newest-first by id.
- Buyer display names are withheld (phone-registered accounts default
  display_name to the phone number); owners see `Buyer #id` labels.
- Views/visits counters, KYC, plans/payments/invoices, notifications, and
  the Search/Explore/Detail contact fallbacks remain deferred.

## 14. P4 implementation (2026-10-13, frontend + backend, uncommitted)

Owner lead status changes now persist through `PATCH /owner/leads/{lead_id}`
and stale lead fetches can no longer overwrite newer rows. No schema or
migration changes (the existing `status`/`closing_reason` columns cover
everything). Visit scheduling/notes persistence and Visit/Negotiating/LOST
statuses remain on hold.

### Transition rules (approved business decisions)
- Close only the lead — the listing is never modified (the close modal's
  "also mark listing Closed" toggle was removed; all close handlers pass
  `closeRelatedProperty=false`).
- Re-enquiry allowed: closing deletes the lead's `active_enquiries` row
  (existing buyer-tested semantics), so the buyer gets a fresh 201 row.
- `Not Converted` persists as `CLOSED` + `closing_reason="Not Converted"`;
  no `LOST` backend status exists (detail screen maps legacy `lost` to
  `closed`).
- Allowed: `NEW→CONTACTED`, `NEW→CLOSED`, `CONTACTED→CLOSED`,
  `CONTACTED→NEW` (reopen), same-status idempotent no-op. `CLOSED` is
  terminal; anything else is 422.

### Backend files changed
- `Restamp-backend/app/schemas.py` — new `OwnerLeadUpdate`
  (`status: NEW|CONTACTED|CLOSED`, `closing_reason ≤500`).
- `Restamp-backend/app/services/enquiries.py` — new `transition_owner_lead`
  (owner scoping with 404 on foreign leads, transition validation,
  active-row removal only on `CLOSED`, listing untouched).
- `Restamp-backend/app/routers/owner.py` — new `PATCH /owner/leads/{lead_id}`
  (savepoint + rollback conventions, phone-free `OwnerLeadOut` response).
- `Restamp-backend/tests/test_owner_leads.py` — 5 new transition tests.

### Frontend files changed
- `src/api/owner.js` — new `updateOwnerLeadStatus` (vocab normalization).
- `src/screens/owner/OwnerLeadsScreen.js`,
  `OwnerPropertyLeadsScreen.js`, `OwnerLeadDetailScreen.js` — contacted and
  close actions persist server-confirmed (optimistic flip, server row wins,
  honest error + refetch rollback on failure); visit scheduling stays
  device-local and is labeled on hold.
- `src/screens/owner/OwnerCloseLeadModal.js` — property-close toggle and
  listing-updated success claim removed.
- `OwnerLeadsScreen.js`, `OwnerPropertyLeadsScreen.js`,
  `OwnerDashboardScreen.js` — request-ID guards + unmount invalidation on
  lead fetches (existing `useListings` convention).
- `scripts/owner-leads-honesty.test.mjs` — new P4 section (update contract,
  server-confirmed pattern, stale-guard, close-only-lead, modal, dashboard).

### Test coverage and results
- Backend `tests/test_owner_leads.py`: 11/11 pass. Combined run with
  `test_buyer_6b4`, `test_buyer_6b5`, `test_owner_listings`, `test_phase4`:
  57 pass; only the 3 pre-existing `test_buyer_6b5` count assertions fail
  (2 leftover committed rows in shared `restamp_dev`, predating P3/P4;
  untouched per the no-DB-write rule).
- Frontend: 6/6 suites pass. `npm run build:web` succeeds.
  `git diff --check` clean in both repositories.

### Known limitations and follow-up
- Visit scheduling, visit dates/notes, persistent lead notes, and
  Visit/Negotiating/LOST behavior remain on hold (no storage exists).
- Local-only visit flips still revert on refetch; labeled in code comments.
- No `created_at` on enquiries; buyer names withheld (`Buyer #id`).

## 15. Buyer Flow implementation (2026-10-13, frontend + backend, uncommitted)

### P1 — Home category navigation fix (cause + fix)
- Cause (verified in code): the category pill `onPress` in
  `src/screens/buyer/HomeScreen.js` called `setSelectedType` and then
  `navigation.navigate("Search", …)`, and `selectedType` drove nothing on
  Home — so every tap left Home for Search.
- Fix: taps now only `setSelectedType` (plus an `All` pill, default `all`);
  `filterProperties` filters the three Home sliders by category
  (house→house/home, plot, villa, apartment, commercial; missing types kept
  so real results are never erased). No Search navigation, no tab change, no
  scroll jumps; bottom Search tab flow untouched. Layout/styles/header/nav
  unchanged.

### P2 — Accurate backend search (confirmed issues fixed)
- Removed the misleading `Rating: High to Low` sort (backend has no rating
  field; it silently sorted by relevance). `sortMap` keeps the defensive
  fallback for legacy state only.
- `Load more` gating fixed: `filteredProperties.length < total` (client-
  filtered page count vs server total) → `apiProperties.length < total`.
- New exact-match `construction_status` filter on `GET /buyer/listings`
  (existing column, closed canonical vocab, 422 otherwise), wired through
  `buildListingParams` label→canonical mapping and `SearchScreen`; the
  client-side pass stays as a second layer.
- Verified already-correct (no change): deal/type/BHK/budget/q/sort/pagination
  mapping, filter-change page reset, deterministic backend ordering,
  honest loading/empty/error/retry states.
- Documented as unsupported (no invention): Pool/Townhouse pseudo-category
  (dead, unreachable code), project-name search beyond title/description/
  locality text, rating sort.

### P3 — Explore-by-Location proposal (page on hold, no endpoint change)
- Existing `GET /buyer/listings?locality=<name>` (case-insensitive
  substring on `Locality.name`) is sufficient: Explore selection should pass
  the chosen Chennai locality as `locality` (exact, prefix, and substring
  all work; substring recommended for short names like "OMR"); zero matches
  return honest `total: 0`. No new endpoint, no schema change, no page built,
  Sample labels untouched. New backend tests cover substring + zero-match.

### Test coverage and results
- New `scripts/buyer-flow.test.mjs` (13 checks: param mappings, omission
  rules, Home no-navigate + type filter + All default, no rating option,
  load-more gating, status wiring) — passes.
- New backend tests in `tests/test_buyer_6b1.py`
  (`test_construction_status_filter`, incl. 422, and
  `test_locality_substring_and_zero_match_for_explore`) — pass.
- Full frontend: 7/7 suites pass. `npm run build:web` succeeds.
  `git diff --check` clean in both repositories.
- Pre-existing shared-DB pollution still breaks absolute-count assertions
  in older `test_buyer_6b1`/`test_buyer_6b5` tests (unchanged scope, rows
  untouched per the no-DB-write rule); new tests scope with distinctive
  filters and are immune.

### Known limitations and follow-up
- Home category filter is client-side over the loaded deal-scoped feed
  (consistent with the existing Home architecture, which fetches once per
  deal tab).
- Search category pseudo-filter and status second layer remain client-side
  by design (documented in code).

## 16. Buyer Flow B2 implementation (2026-10-13, frontend + backend tests, uncommitted)

Contact reveal, enquiry, question, and site-visit actions no longer display
or dial fabricated numbers and never claim unpersisted success. Existing
backend endpoints reused as-is; no backend tracked files changed, no schema
or migration changes, no new endpoints.

### Verified enquiry-to-owner chain (traced, no gap found)
- Buyer `Send Enquiry` → `POST /buyer/enquiries` → `create_enquiry`
  derives `owner_user_id` from `physical_properties.user_id` (never a
  client-supplied ID) → row visible to exactly that owner via
  `GET /owner/leads` (`owner_user_id == caller`).
- Reveal (`POST /buyer/listings/{id}/contact`) creates/reuses the same
  single active enquiry per buyer+listing (idempotent 200 path), so reveal
  followed by Send Enquiry yields one owner-visible lead, and repeats only
  add audit rows. Buyer success shown only on resolved responses; failures
  reject with honest errors and no partial rows (new backend test).
- Owner isolation and buyer re-enquiry-after-close already covered by
  `test_owner_leads.py`; P3 audits and P4 transitions untouched.

### Frontend files changed
- `src/screens/buyer/SearchScreen.js` — reveal state machine
  (`idle/loading/revealed/failed/login`, request-ID guard); number shown,
  copied, or dialed only from the authorized response; logged-out buyers get
  a Login prompt via the existing Login route (which resets to MainTabs, so
  buyers re-tap after signing in); card/sheet agent fallbacks neutralized;
  call/WhatsApp unavailable without a revealed number.
- `src/components/PropertyDetailModal.js` — `onLoginRequired` prop (wired
  in all five buyer call sites); enquiry guarded against duplicate taps,
  server-confirmed success only, logged-out login prompt; question and site
  visit show honest not-supported messaging (no fake sent/booked states, no
  `Requested ✓`); Listed-By shows no mock identity/number.
- `src/screens/buyer/ExploreScreen.js` — sample contact numbers never
  dialed/messaged/copied (unavailable messaging, Search guidance); identity
  fallbacks neutralized. Explore page itself unchanged.

### Test coverage and results
- `scripts/buyer-flow.test.mjs` extended (C1–C4, E1–E3, A1–A4 incl. reveal
  failure rejection and 2000-char cap): 7/7 frontend suites pass.
- New `test_b2_reveal_then_enquiry_single_owner_visible_lead` in
  `tests/test_owner_leads.py`: passes (isolated rollback setup).
- `npm run build:web` succeeds. `git diff --check` clean in both repos.
- Broader shared-DB backend suites not re-run here (known pre-existing
  `test_buyer_6b5` pollution; rows untouched).

### Known limitations and deferred functionality
- No return-to-property after Login (Login resets to MainTabs by existing
  design; changing it needs auth-flow work).
- Explore contact stays unavailable (no backend records behind samples).
- Question sending, visit booking, chat, negotiation remain unimplemented
  with honest messaging; availability-note marketing copy untouched.

## 17. Stale Add Property tab fix (2026-10-13, frontend only, uncommitted)

One-line fix: `finishPublishSuccess` in
`src/screens/owner/OwnerAddPropertyScreen.js` now calls
`navigation.setParams(freshAddParams())` before navigating to
`OwnerPublishSuccess`, so a later bare Add-tab press cannot resurrect the
just-published edit/form. No blanket tab-press reset (would risk wiping
paused mid-edit progress). Guard added as Sec 13 in
`scripts/property-edit-mode.test.mjs`. Full details in
`report/add_property_stale_add_tab_fix.md`. All 7 frontend suites pass;
`npm run build:web` succeeds; `git diff --check` clean.

## 18. Property workflow regression guards (2026-10-13, tests only, uncommitted)

Sec 14 in `scripts/property-edit-mode.test.mjs`: G1 asserts the Add tab
carries no tab-press reset (paused mid-edits resume); G2 asserts existing
draft-save feedback (saving/saved-disabled states, failure alert) without
requiring new UI. No runtime, backend, or OTP changes. Full details in
`report/property_workflow_regression_tests.md`. All 7 frontend suites pass;
`npm run build:web` succeeds; `git diff --check` clean.

## 19. Live fixes — Owner identity + API timeout (2026-10-13, frontend only, uncommitted)

Owner Profile now derives identity from the authenticated user (mock person,
avatar, KYC, and membership claims removed; neutral fallbacks); API requests
carry a bounded 25s timeout mapping to a recoverable `"timeout"` error that
is never reported as an invalid OTP. New `scripts/live-identity-timeout.test.mjs`
passes; full details in `report/live_owner_identity_otp_fix.md`. All 8 frontend
suites pass; `npm run build:web` succeeds; `git diff --check` clean. No backend,
OTP-rule, schema, or deployment changes. Render cold-start remains an unproven
hypothesis.
