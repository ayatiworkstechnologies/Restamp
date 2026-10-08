# RESTAMP Backend Readiness Analysis

> **ANALYSIS ONLY — NO CODE, NO MIGRATIONS, NO FIXES IMPLEMENTED.**
> Sources: complete frontend repository at `/Users/isaacvineeth/Downloads/Restamp-latest` (commit `a7887c3`), task brief describing `RESTAMP_Backend_Documentation.docx`.
> **Critical caveat:** `RESTAMP_Backend_Documentation.docx` was **not found** in the repository or workspace (verified via `glob **/*` + filesystem search). Section 3 below is therefore reconstructed strictly from the requirements enumerated in the review brief — it is marked as **UNVERIFIED AGAINST SOURCE DOC** wherever the brief is the only source. Do not treat it as a quote of the doc.

---

## 1. Executive Summary

RESTAMP frontend is a **100% local-mock Expo app with zero backend integration**. There are no network calls, no auth, no persistence, no roles, no broker system, no admin system, and no real payment. Every business flow (search, wishlist, enquiry, add-property, verification, leads, plans, coupons, payments, contact reveal) is `useState` + `Alert`.

This means the backend is **not constrained by the frontend** — the frontend is a UI prototype that actively contradicts the stated backend goals in at least 12 material places. If Claude Code implements the backend by "matching the frontend," it will build the wrong system with security holes.

**Headline blockers before any backend work:**

1. No identity exists. Two hardcoded users (`Jessica Taylor` buyer, `Rajesh Kumar` owner) with no linkage, no OTP, no Google, no tokens, no storage libs. Phone+OTP + Google OAuth architecture is entirely unproven.
2. Property lifecycle in frontend (`draft|pending|active|rejected|closed|expired`, plus `Rented/Sold/Leased/Not Converted` as lead outcomes) **does not match** the required `DRAFT → PENDING → AUTOMATED VERIFICATION → VERIFIED → PUBLISHED → ACTIVE` + `SOLD/RENTED/LEASED`. Pause is incorrectly implemented as `closed`.
3. Owner contact privacy is **currently violated by design**: full `+91 …` numbers are bundled in mock data and opened via `tel:` / `wa.me`. No masking, no entitlement check. Backend must not replicate this.
4. Broker domain is undefined. Zero broker screens/logic exist; only marketing string `"0% brokerage"` + agent plan price cards in `MenuScreen.js`. The Option-A vs Option-B association decision is load-bearing for the entire data model.
5. Payment is a client-side simulation (`setTimeout 1200ms`, `Pay Now` always succeeds, hardcoded `TXN-2026-98124`, flat `₹300` coupon `RESTAMP|OWNER10|PROMO` with no server validation, hardcoded order summary). Pricing is inconsistent across three locations. Nothing here is a requirement.
6. Search mock only contains `listingType: Sale`, `badgeType: sale`, `isVerified: true` — Rent/Lease, unverified, pending, and closed states are untestable from mock data despite UI offering Buy/Rent/Lease filters.

**Recommendation: NOT READY for backend implementation.** Resolve the Unresolved Decisions in §21 (especially broker association, verification automation contract, entitlement model, and terminal-state semantics) first, then implement in the phased order in §22.

---

## 2. Repository Findings

### 2.1 Stack and config — fact

| File | Fact |
|---|---|
| `package.json` | `expo ~57.0.25`, `react-native 0.86.3`, `react 19.2.3`, `@react-navigation/native ^7.3.18`, `native-stack ^7.19.2`, `bottom-tabs ^7.18.18`, `lucide-react-native ^1.48.0`. **No** `axios`, `fetch` wrapper, `async-storage`, `secure-store`, `auth-session`, `firebase`, `supabase`, `clerk`, `razorpay`, `stripe`. |
| `app.json` / `eas.json` / `vercel.json` | No `extra`, no env vars, no API base URL. `vercel.json` is static web export only. |
| `App.js:12-23` | `SafeAreaProvider > WishlistProvider > OwnerProvider > AppNavigator + AnimatedSplashScreen`. No `AuthProvider`, no API client provider, no error boundary. |
| `src/index.js`, `index.js` | Duplicate root registration; `src/index.js` unused. Minor hygiene issue. |
| Storage | `grep SecureStore\|AsyncStorage` = zero hits. All state evaporates on reload. |
| Network | `grep fetch(\|axios\|XMLHttpRequest\|WebSocket` = zero hits. Only network-adjacent code is `Linking.openURL(tel:…)` / `Linking.openURL(https://wa.me/…)` and Unsplash `Image uri`. |
| Auth libs | Zero. `grep auth|login|OTP|Google` (auth sense) = zero. Single `Google Pay / UPI` label in `OwnerPaymentScreen.js:66` is a payment label, not OAuth. |
| Broker | `grep -ri broker` = only `"zero/0% brokerage"` marketing copy + `MenuScreen.js:212-263` agent plan cards (`Agent Starter ₹2,999/mo`, `Pro Broker ₹6,999/mo`, `Elite Agency ₹14,999/mo`, commercial broker tiers). No broker login, role, region, KYC, or API. |
| Admin | `grep -ri admin` = zero (excluding SVG `xmlns`). No admin screens, guards, or endpoints referenced. |
| Roles | No RBAC. Only UI strings (`roleBadgeOwner/Agent` in `MenuScreen.js:606-617`, chat `role:` in `MessageScreen.js:30-82`, `accessibilityRole`). |

### 2.2 Buyer side — fact

**Property model** (`src/data/properties.js:85-1410`, 48 items = 16 Recommended + 16 Verified + 16 Recently Added):

```
{id, title, type, listingType, badge, badgeType, price, pricePeriod,
 rawPrice, rating, location, address, beds, baths, sqft,
 isVerified, isRecommended, constructionStatus, image, description,
 agent: {name, phone, avatar, agency}}
```

- `listingType`: always `"Sale"` (48/48). `badgeType`: always `"sale"`. `pricePeriod`: always `""`. `isVerified`: always `true`. `gallery`: absent (code in `SearchScreen.js:588`, `PropertyDetailModal.js:149-157` always takes the 3-image Unsplash fallback).
- `type`: `Apartment|Villa|House|Commercial|Plot`. `beds/baths`: `0` for Plot/Commercial.
- `agent.phone`: 12 hardcoded `+91 …` numbers reused per locality (e.g. `+91 98765 43210 Ramesh Kumar`, `+91 98401 22334 Kavitha Sundar`). Full numbers ship with every listing object.
- `NEWLY_LAUNCHED_PROJECTS:1412-1461`: 4 projects with `phone` + `priceRange` + `rera` (e.g. `proj-1 … +91 98400 12345`).
- `CHENNAI_LOCALITIES`: 8 localities with fake `count` (`Anna Nagar 850+ Props` …).

**Navigation** (`src/navigation/AppNavigator.js:50-156`): 5 tabs Home/Search/Saved/Enquiries/Profile. `Search` tabPress forces `navigate(Search, {openFilterModal: Date.now()})`. Dead screens never navigated to: `ExploreScreen.js`, `MessageScreen.js`, `AccountScreen.js`. Active profile is `ProfileScreen.js`, not `AccountScreen.js`.

**Search/filter** (`HomeScreen.js:155-320`, `SearchScreen.js:44-246`, `SearchPropertyModal.js:18-260`):

- Entry filters: `dealType Buy|Rent|Lease` (default Buy), `locality`, `propertyType`, `bhk All|1|2|3|4+`, `budgetMin/Max` (separate BUY vs RENT tables), `constructionStatus`, `searchQuery`, `onlyVerified`, `sort relevance|price_asc|price_desc|rating|area_desc`, `category` (including dead `Pool|Townhouse` special-cases in `SearchScreen.js:157-169`).
- Logic flaw (frontend-only, must not copy): `filterProperties` falls back to the unfiltered list when the filtered list is empty (`HomeScreen.js:274-276` `length>0 ? filtered : ORIGINAL`). Empty results are impossible in the mock — backend must return real empty sets.
- `Bungalow` handled as special-case of `House` in `SearchScreen.js:184-195` but missing from `SearchPropertyModal.js:29` options. `Plot` mapped to `New Launch` fallback in status logic.
- `perSqft = rawPrice / parseInt(sqft)` else `₹6,800/sqft` (`SearchScreen.js:296-316`, `PropertyDetailModal.js:112-146`) — display formula, not a stored field.

**Contact reveal — no privacy** (`SearchScreen.js:260-281`, `SavedScreen.js:52-69`, `EnquiriesScreen.js:144-161`, `HomeScreen.js:706-762`, `PropertyDetailModal.js:623-633`):

- Buyer always receives the full number. `View Number` bottom sheet displays `agent.phone || "+91 98401 22334"` with `Alert "Phone Number Copied!"` then `Call Now` (`tel:`) + `WhatsApp` (`wa.me/?text=Hello! I am interested in …RESTAMP`).
- `HomeScreen.js:759-761` project phones: `{isRevealed ? proj.phone : "View number"}` — pure UI toggle.
- `PropertyDetailModal.js:628` uses `Alert "Contacting Owner Calling … at …"` (no `tel:`). Inconsistent with Search/Saved.

**Wishlist** (`src/context/WishlistContext.js:1-60`): `useState(ALL_PROPERTIES.slice(0,2))`, `toggleWishlist` prepends, string-coerced id compare. No persistence, no user scoping, no server deduplication. `restoreDefaultWishlist` (reset to all 48) is dead code.

**Enquiry (buyer)** (`PropertyDetailModal.js:164-196,650-794`, `EnquiriesScreen.js:33-182`):

- `handleSendQuestion / handleRequestSiteVisit / handleSendEnquiry` = `setState(true)` + `Alert` (`"Question Sent! 📩 …forwarded to owner"`, `"Site Visit Requested! 📅 …consultant will contact"`, `"Enquiry Sent Successfully! 🚀 …shared with seller"`). No object created, no id, no API.
- `EnquiriesScreen.js:33-106 INITIAL_ENQUIRIES` (4 items): `{id, propertyId, agentName, agency, phone, avatar, propertyTitle, propertyPrice, propertyLocation, propertyImage, lastMessage, time, unread, category Site Visits|Active|Closed, status Direct Enquiry|Visit Scheduled|Closed, scheduledVisit}`. `propertyId`s `chennai-1|chennai-2` do not exist in `ALL_PROPERTIES` → `handleOpenProperty:163-182` synthesizes a fake property. `Negotiating` tab (`FILTER_TABS:108`) matches zero mocks. Confirms enquiry→property FK is currently fictional.
- `MessageScreen.js` chat (`INITIAL_CHATS` + 1200ms auto-reply bot) is a separate, unwired messaging prototype — **do not mistake for the V1 enquiry model**.

**Buyer identity** (`ProfileScreen.js:43-438`, `AccountScreen.js:32-513` legacy):

- Active: `Jessica Taylor, jessica.taylor@example.com, Verified Buyer & Owner` + `activePlanName = subscription?.planName || "Gold Assist"` + counts `properties 8, leads 6, wishlist 5` (hardcoded fallbacks). `Payment History` = `Alert "₹1,999 on 26 Sep 2026 (Gold Assist)"`, `Invoices` = `Alert "INV-2026-0814 …18% GST"`.
- Legacy (dead): `Alex Morgan, alex.morgan@restamp.app, 12 Site Visits, Visa ••••4242` — only buyer payment reference in the app. Two buyer identities with no reconciliation.

### 2.3 Owner side — fact

**State** (`src/context/OwnerContext.js`):

- `subscription`: `{id:"owner-pro", name/planName:"Owner Pro Plan", validity:"3 Months", daysRemaining:24, listingLimit:5, usedListings:3, price/amountPaid:"₹2,999", active:true, status:"Active", startDate:"01 Sep 2026", expiryDate:"01 Dec 2026"}`.
- `ownerProfile`: `{name:"Rajesh Kumar", firstName:"Raj" (no lastName — `OwnerDashboardScreen` falls back to `"Kumar"`), phone:"+91 98401 23456", email:"rajesh.kumar@example.com", verified:true, kycStatus:"Verified", memberSince:"June 2025"}`. No linkage to buyer `Jessica Taylor`.
- `properties[8]` (`own-prop-1…8`): statuses `active×3, pending×1, rejected×1, closed×2, draft×1`. Supported-but-unused `expired`. Fields: `purpose Rent|Sell|Lease`, `category Residential|Commercial`, `propertyType`, `bhk`, `city/district/locality/address/landmark`, `price (number) + priceFormatted + priceUnit`, `deposit/maintenance/leaseDuration/lockInPeriod`, `builtUpArea/carpetArea/floor/totalFloors/propertyAge/facing/furnishing/parking/amenities[]`, `images[]/coverPhoto`, `status/views/enquiries/visits/listedDate`, `documents[{id,name,type,status}]`, `moderationNote/rejectionReason/closedOutcome/closedDate/pauseReason`.
- `leads[6]`: `{id, customerName, phone, email, avatar, propertyId, propertyTitle, propertyLocality, propertyPrice, propertyImage, requirement Rent|Buy, budget, status new|contacted|visit_scheduled|visited|negotiating|closed, timestamp, preferredVisitDate, message, visitData{date,time,note}|null, closedOutcome|null|"Rented"}`.
- Methods: `activateSubscription`, `addProperty` (forces `status:"pending"`, `id:own-prop-${Date.now()}`, increments `usedListings`), `updatePropertyStatus`, `deleteProperty`, `updateLeadStatus`, `scheduleVisit`, `closeLead(id, outcome, closeRelatedProperty, propertyId)`.

**Add-property wizard** (`OwnerAddPropertyScreen.js`): purpose gate (`Rent|Sell|Lease`) → 6 steps (`StepIndicator.js` says 6, header text says `Step {n}/5` — off-by-one). Prefills (`Anna Nagar`, `Plot 42…`, `25000`, `7200000`…). Step 5 photos = `SAMPLE_PHOTO_URLS` Unsplash per category; `handleUploadDocument` fabricates `Electricity_Bill_{city}.pdf / "Uploaded & Encrypted"`. `handlePublishProperty` gates on `subscription.active && usedListings < listingLimit`, builds title/pricing, forces `pending`, navigates to `OwnerPublishSuccess`. Renewal modal text: `"You have utilized your active property listing quota…"`.

**Lifecycle transitions in frontend (do not adopt blindly):**

- `draft → pending` (Publish). `pending → active|rejected` assumed (no code; `OwnerPublishSuccessScreen` says `"verification team typically validates within 2–4 business hours"` — contradicts automated-verification requirement).
- `rejected → pending` via `Edit & Resubmit` jumping to `initialStep:5`.
- `active → closed` via **Pause** (`pauseReason:"Owner Paused"`, message `"temporarily hide it from buyer searches. You can resume anytime"` — but status becomes `closed`, for which no resume path exists) or **Close** (`closedOutcome:"Closed by Owner"`).
- `* → closed` via `OwnerCloseLeadModal.js` outcomes `Rented|Sold|Leased|Not Converted` + optional `Also mark "{propertyTitle}" as Closed listing` checkbox. This is the only path that sets semantically meaningful terminal outcomes.
- `expired` appears in `STATUS_TABS` but has zero transitions. Editing is locked while `pending` (`OwnerPropertyCard.js`).

**Leads** (`OwnerLeadsScreen.js`, `OwnerLeadDetailScreen.js`, `OwnerSiteVisitModal.js`): stepper `new→contacted→visit_scheduled→visited→negotiating→closed` with unguarded taps (any stage clickable except `closed`/`visit_scheduled` which open modals). `new→contacted` auto-fires on Call/Chat `Alert`. Visit modal dates are hardcoded (`Tomorrow, Saturday 28 Sep…`), times 5 slots. Phones never masked; Call/Chat are `Alert`s, not `Linking`.

**Plans / coupons / payments** (`OwnerPlansScreen.js`, `OwnerPlanConfirmScreen.js`, `OwnerPaymentScreen.js`, `OwnerPaymentSuccess/FailedScreen.js`, `MenuScreen.js:100-308`):

- Residential: `Basic ₹0 / 1 / 30 Days`, `Gold Assist ₹1,999 / 5 / 90 Days POPULAR`, `Titanium VIP ₹4,999 / 10 / Until Deal Closed`. Commercial: `Commercial Free ₹0 / 1 / 30 Days`, `Corporate Boost ₹3,499 / 5 / 90 Days POPULAR`, `Enterprise Managed ₹8,999 / 10 / Until Leased/Sold`. Fallback phantom plan `Owner Pro Plan ₹2,999 / 5 / 3 Months` appears in `OwnerContext`, `OwnerPlanConfirm` fallback, `OwnerPayment` fallback — matches none of the above.
- `MenuScreen.js` additionally lists Agent tiers (`Starter ₹2,999/mo … Elite Agency ₹14,999/mo`, commercial broker tiers) — no corresponding broker flow.
- Coupon: `RESTAMP|OWNER10|PROMO → flat ₹300 off`, case-insensitive, no expiry/usage/plan guard (applies to ₹0 plans), client-side only, invalid → `Alert`. Applied state resets on edit but `discount` persists until re-apply.
- Payment: `selectedMethodId` default `card_1`, hardcoded `••••8463 / 08/29 / •••`, `raj.kumar@okhdfcbank`, bank chips. `handlePay(true)` on `Pay Now` → 1200ms → `activateSubscription` + success; `handlePay(false)` on header `MoreVertical` or `Simulate Payment Failure` link → failed screen. Order summary in `OwnerPaymentScreen` is **hardcoded** (`₹2,999.00 / -₹300.00 / Up to 5`) regardless of plan. Success screen: hardcoded `TXN-2026-98124`, auto-redirect 3200ms to `OwnerNavigator`, `numericAmount` parsed by regex.
- Assurance copy (`"100% money-back guarantee if you don't receive buyer inquiries in 30 days"`) is a business promise with no backend representation.

---

## 3. Documentation Findings

**Status: source file absent — contents below are the review brief's claims about the doc, not verified quotes.**

Per the brief, the doc allegedly establishes:

- Marketplace with Buyer/Tenant, Owner, Broker, separate Admin web app; `FastAPI + SQLAlchemy + Alembic + MySQL`; layered `API → schema → service → repository`; auth via Phone+OTP and Google OAuth; RBAC; property lifecycle `DRAFT → PENDING → AUTOMATED VERIFICATION → VERIFIED → PUBLISHED → ACTIVE` plus `SOLD/RENTED/LEASED` (hidden from search, retained in DB); masked-vs-full phone by entitlement; broker region model (e.g. `Medavakkam` + surrounding); payment vs subscription/entitlement split; admin areas (Dashboard, Properties, Verification, Users, Brokers, Enquiries, Reports, Audit Logs, Settings); security/testing expectations; future AI/voice/multilingual.

What cannot be confirmed without the file:

- Exact entity list/fields, OTP provider/limits, token strategy (opaque vs JWT, access/refresh), Google OAuth client mapping to roles, verification automation rules (what "automated" checks), publish semantics (`VERIFIED` vs `PUBLISHED` vs `ACTIVE` — three states where one may suffice), who can set `SOLD/RENTED/LEASED`, broker-region definition (pincode? locality string? radius?), entitlement granularity (per-contact unlock vs subscription window vs per-listing quota), payment provider (Razorpay/Stripe/UPI intent?), refund/coupon rules, admin verification powers (brief says automated, no manual rejection — but frontend shows manual `rejected` with `rejectionReason`).
- **Do not implement from this section.** Every item above is carried into §21 as UNRESOLVED until the doc is produced or the business decides.

---

## 4. Confirmed Business Rules

Strict standard: only what is corroborated by **both** the brief's stated doc baseline **and** non-contradicted frontend intent, or by explicit task requirements. Everything else is in §21.

1. **Three-sided marketplace + admin.** Buyer/Tenant, Owner, Broker are separate account roles; Admin is a separate web application. (Brief; frontend shows buyer+owner modes, broker absent — separation itself is confirmed, broker behavior is not.)
2. **Property lifecycle exists with terminal off-market states.** `SOLD / RENTED / LEASED` properties must disappear from public search but remain in the database for owner dashboard, admin, history/reporting. (Explicit task requirement; frontend partially reflects via `closed + closedOutcome`.)
3. **Verification precedes visibility.** New/edited listings pass through pending/automated verification before public search. (Brief + `pending` + `OwnerPublishSuccess`; manual-vs-automated mechanism unresolved.)
4. **Owner contact privacy by entitlement.** Free users see masked owner phone; eligible paid users see full phone; enforcement must be server-side, never "send full number + hide in UI." (Explicit task requirement; frontend currently violates it — see §9.)
5. **Enquiry V1 is Buyer → Property → Enquiry → Owner.** No chat/negotiation in V1 unless explicitly added later. (Brief + `PropertyDetailModal` + `OwnerLeadsScreen`; `MessageScreen` chat is out of scope.)
6. **Payment and entitlement are separate concerns.** A payment record and a subscription/entitlement record must not be the same table. (Task requirement §9.)
7. **Verification is automated; do not reintroduce manual rejection** unless the doc explicitly requires it. Frontend `rejected + rejectionReason` copy must not be treated as a requirement. (Explicit instruction.)
8. **Future AI/voice/multilingual must not be baked into V1 schema prematurely** — but V1 must not block them (e.g. message/notification content columns should be extensible; see §7).

---

## 5. Frontend → Backend Gap Analysis

| Frontend Feature | Current Implementation (file) | Backend Required | Missing Pieces | Business Decision Required? |
|---|---|---|---|---|
| Authentication | None. No login UI, no OTP, no Google, no tokens, no storage (`AppNavigator.js`, `ProfileScreen.js` hardcoded Jessica, `OwnerContext` hardcoded Rajesh) | Phone+OTP + Google OAuth, session/token architecture, role selection at signup | Provider choice, OTP limits, token type/lifetime, account-linking (buyer+owner same phone?), role model | **Yes — §21.1** |
| Home / discovery | Local filter over 48 all-Sale mocks; empty-result fallback to unfiltered (`HomeScreen.js:274-276`); `Buy\|Rent\|Lease` tabs with no Rent/Lease data | Real search API with purpose, locality, type, BHK, budget, status, sort, pagination | Index/query design, purpose semantics, Rent/Lease seed data | Partial — purpose semantics |
| Search | Same + `Pool/Townhouse/Bungalow` special-cases, `onlyVerified`, 5 sorts (`SearchScreen.js`) | `/properties/search` with validated enums + pagination + total counts | Enum canonicalization, sort whitelist, pagination cursor/offset | **Yes — sort/pagination contract** |
| Property details | Static modal, hardcoded specs (`Semi-Furnished, East, 3rd of 5`), fake amenities, static map image, 3-image fallback gallery (`PropertyDetailModal.js`) | Property + media + documents + verification-status API; gallery/documents real URLs | Media storage (S3?), doc privacy (never public), per-sqft stored vs computed | **Yes — media/doc storage** |
| Wishlist | In-memory `slice(0,2)` + toggle, no user scope (`WishlistContext.js`) | Per-user wishlist CRUD, idempotent toggle, auth-required | Unique `(user, property)` constraint, visibility of unpublished properties in wishlist | **Yes — unpublished-in-wishlist behavior** |
| Enquiry | `Alert`-only send; `EnquiriesScreen` 4 mocks with dangling `propertyId`s; no dedup/spam control | Enquiry entity with ownership, status, dedup, rate-limit, notifications | Duplicate window, status machine, notify channel (push/SMS/WA?) | **Yes — dedup + status + notify** |
| Owner properties | 8 mocks, `All\|Active\|Pending\|Rejected\|Expired\|Closed\|Draft` tabs (`OwnerPropertiesScreen.js`) | Owner-scoped listing API + status machine matching decided lifecycle | Lifecycle mapping (§8), `expired` and `pause` semantics | **Yes** |
| Add property | 6-step wizard, prefilled defaults, `SAMPLE_PHOTO_URLS`, fake doc upload, forces `pending` (`OwnerAddPropertyScreen.js`) | Draft save + submit flow, media/doc upload APIs, server validation, quota check | Draft vs submit distinction, doc types/retention, quota enforcement point | **Yes** |
| Property verification | `"2–4 business hours by team"` + `moderationNote/rejectionReason` mocks | Automated verification pipeline per doc; no manual rejection unless doc says so | Rule set, re-verification on edit, status transitions | **Yes — §21.3** |
| Owner dashboard | Derived counts from mocks, `padStart(2,"0")` formatting (`OwnerDashboardScreen.js`) | Aggregations (views/enquiries/visits) — decide real-time vs materialized | View-counting (auth? dedup? bot-filter?) | **Yes — analytics semantics** |
| Owner leads | 6 mocks, unguarded stepper, `Alert` Call/Chat, hardcoded visit slots (`OwnerLeadsScreen/Detail/SiteVisitModal`) | Lead pipeline API scoped to property owner, visit scheduling, outcome close | Status guards, visit data model, `closeLead→property` coupling | **Yes** |
| Owner profile | Static Rajesh card, `Alert` editors, `KYC VERIFIED` badge (`OwnerProfileScreen.js`) | User/KYC profile APIs | KYC provider/fields/retention | **Yes — KYC scope** |
| Broker | Absent (only plan price cards in `MenuScreen.js:205-308`) | Entire broker domain: role, region, KYC, association (A vs B) | **Everything — §10** | **Yes — blocking** |
| Payment | Simulated `setTimeout`, hardcoded TXN, hardcoded summary (`OwnerPaymentScreen/Success/Failed`) | PSP integration, webhook, idempotency, receipt/invoice | Provider, GST invoice source of truth | **Yes — §13** |
| Subscription/entitlement | In-memory `Owner Pro Plan`, `usedListings` increment (`OwnerContext.js`) | Subscription + entitlement tables, quota + contact-access grants | Plan catalog source of truth (none of the 3 price lists agree) | **Yes — blocking** |
| Contact access | Full numbers everywhere via `tel:/wa.me` | Masked-vs-full API strategy with server-side enforcement + audit | Mask format, unlock model, abuse limits | **Yes — §9** |
| Admin | Absent | Full admin API surface (§14) + audit log | Admin auth (separate IdP? MFA?), powers boundary | **Yes** |

---

## 6. Proposed Backend Architecture

**Verdict on the brief's proposal (FastAPI + SQLAlchemy + Alembic + MySQL, service/repository/schema/API layers): appropriate in principle, risky in the details below. Do not copy blindly.**

### 6.1 What fits

- FastAPI + SQLAlchemy 2.0 (async) + Alembic + MySQL 8 is a defensible conventional choice for a CRUD marketplace with relational integrity (users, properties, enquiries, payments). No reason to reject it.
- Layering `routers → schemas → services → repositories → models` is fine **if** repositories stay thin (query builders) and business rules live in services (lifecycle transitions, entitlement checks, quota). The failure mode to avoid is anemic services + fat routers (where ownership checks get forgotten per-endpoint — the #1 IDOR source).
- Alembic is non-negotiable (never `create_all` in prod). Require one migration per merged PR, reviewed, with downgrade tested.

### 6.2 Missing / must-add layers and cross-cutting concerns

1. **Policy/authorization layer (missing).** RBAC (`buyer|owner|broker|admin`) + resource ownership (`is_owner(property)`, `is_party(enquiry)`, `can_view_phone(user, property)`) must be centralized dependencies (e.g. `require_role`, `require_property_owner`, `require_entitlement`), not inline `if` checks. Every frontend `Alert`-then-mutate path (pause/close/resubmit/lead-status) is a future IDOR if checks are per-route folklore.
2. **Unit-of-work / transaction boundary (missing).** `closeLead(outcome, closePropertyToo)` touches two aggregates; `publish` touches property + quota; `payment webhook` touches payment + subscription + entitlement. These need explicit transactions with row locks (`SELECT … FOR UPDATE` on quota/entitlement rows). The brief's layer list omits transaction handling — add it.
3. **Idempotency layer (missing).** `addProperty` uses `Date.now()` ids client-side; double-tap Publish and retried webhooks will create duplicates. Require `Idempotency-Key` on property-submit and payment-create; webhook handler must be idempotent on provider event id.
4. **File/media service (missing).** Owner wizard uploads photos + PDFs (`ImageUploadCard`, `DocumentUploadCard` promise `PDF/JPG/PNG max 10MB`, `"never displayed on public pages"`). Need presigned-upload flow, MIME/magic-byte validation, AV scan hook, private bucket for documents vs CDN bucket for images. Never store raw uploads in MySQL.
5. **Notification service (missing).** Enquiry/visit/verification events imply push/SMS/WhatsApp. Even if V1 is "in-app only," the enquiry→owner fan-out needs an outbox table + async worker (Celery/ARQ or DB outbox + poller), not inline sends in the request path.
6. **Audit log writer (missing).** Admin actions, verification transitions, phone-number reveals, and payment state changes must emit structured audit rows (§14). Make it a service-level concern, not optional logging.
7. **Config/secrets management (underspecified).** No env story exists in the frontend (`eas.json`/`app.json` have none). Backend needs typed settings (pydantic-settings), per-environment files, secret-manager-backed OTP/PSP/OAuth secrets — never committed.

### 6.3 Unnecessary / avoid

- Do not build a generic "repository-per-model with 30 pass-through methods" — it adds indirection without safety. Repositories should expose intention-named queries (`visible_listings(filters)`, `owner_listings(owner_id)`) that encode the visibility predicate once.
- Do not build GraphQL, CQRS, or microservices for V1. A modular monolith with the above cross-cutting layers is the correct size. Future AI/voice/multilingual (§7) do not justify service splits now.
- Do not create a separate `VERIFIED → PUBLISHED → ACTIVE` triple-table or triple-boolean. Model lifecycle as **one status column + timestamps** (§8). Three booleans will drift.

### 6.4 Scalability / maintainability risks

- MySQL full-text/geo: locality search as `location LIKE %…%` (frontend's approach) will table-scan. V1 needs at minimum composite indexes (§12) and a locality normalization table; be prepared to add OpenSearch/Meilisearch when Rent/Lease volume grows — keep search behind a service interface so the swap is local.
- `views/enquiries/visits` counters on the property row will contend under concurrent reads. Use either atomic `UPDATE … SET views = views+1` with dedup/write-behind, or a separate event table aggregated periodically. Decide before launch (§21.9), not after a hot listing melts the row lock.
- Async SQLAlchemy + Alembic + MySQL driver matrix (`asyncmy` vs `aiomysql`) must be pinned and tested in CI; connection-pool sizing and `pool_pre_ping` are required, not optional.

---

## 7. Database/Domain Analysis

Conceptual model only — **no migrations, no tables created**. `UNRESOLVED` marks every relationship the business must decide.

### 7.1 Entities

**User** — purpose: single identity for all roles (do not create separate Buyer/Owner/Broker tables). Important fields: `id (UUID/PK), phone_e164 (unique, nullable until verified), phone_verified_at, email (unique, nullable), google_sub (unique, nullable), display_name, avatar_url, created_at, last_login_at`. Constraints: at least one verified channel required before transacting; exactly one row per human (dedupe phone↔Google at link time — unresolved). Indexes: `phone_e164`, `google_sub`, `email`. Relationship: `1—* RoleGrant`, `1—* Property (as owner)`, `1—* Enquiry (as buyer)`, `1—* WishlistItem`.

**RoleGrant (not a `role` string on User)** — purpose: allow one human to be buyer+owner (+broker) without dual accounts (frontend currently has two disconnected identities). Fields: `user_id, role (buyer|owner|broker|admin), granted_at, granted_by`. Constraint: unique `(user_id, role)`; `admin` grant requires MFA flag + audit. **UNRESOLVED — BUSINESS DECISION REQUIRED:** can a phone number hold both owner and broker roles? Can a broker also list own properties?

**Property** — purpose: the sale/rent/lease listing. Fields: `id, owner_user_id (FK, NOT NULL), purpose (SELL|RENT|LEASE — canonical; frontend `purposeSelected Rent|Sell|Lease` + buyer `dealType Buy|Rent|Lease` must be mapped once), category (RESIDENTIAL|COMMERCIAL — frontend `Land` must be folded in by decision), property_type (canonical enum; `Bungalow/House`, `Plot/Land` overlap must be resolved), bhk, city, locality_id (FK, not free text), address_text, landmark, geo_lat/lng (nullable V1), built_up_sqft (int, nullable), carpet_sqft, floor, total_floors, age_years, facing, furnishing, parking, price_paise (bigint — never float; frontend mixes `price number`, `priceFormatted`, `priceUnit`), deposit_paise, maintenance_paise, available_from, `status` (single enum per §8), `verification_id (nullable FK)`, `view_count` (or separate events — decide), `published_at, offmarket_at, offmarket_reason (SOLD|RENTED|LEASED|WITHDRAWN|PAUSED — distinct from lead outcome)`, `created_at/updated_at`, `submit_fingerprint (hash for duplicate detection)`. Constraints: owner-only mutation; terminal states immutable except by defined reopen flow. Indexes: `(status, purpose, locality_id, price_paise)`, `(owner_user_id, status)`, `(published_at DESC)`, full-text on title/address if MySQL FTS used.

**PropertyMedia** — purpose: photos/floor-plans. Fields: `id, property_id (FK, cascade delete), kind (COVER|PHOTO|FLOORPLAN), storage_key (not URL), sort_order, width/height, created_at`. Ownership: property owner; visibility follows property visibility. Constraint: exactly one `COVER` per property (partial unique index); max-count enforced in service (frontend allows unbounded adds).

**PropertyDocument** — purpose: ownership proof / tax receipts for verification. Fields: `id, property_id (FK), doc_type (TITLE_DEED|TAX_RECEIPT|NOC|OTHER — decide closed list), storage_key (private bucket), mime, sha256, scan_status, created_at`. **Never served publicly** (`DocumentUploadCard` privacy promise). Served to owner + verification pipeline + admin only, via short-lived signed URLs + audit. Retention/deletion policy unresolved.

**Verification** — purpose: automated verification trail (one row per submission attempt, not a boolean). Fields: `id, property_id (FK), attempt_no, trigger (SUBMIT|RESUBMIT|EDIT), ruleset_version, result (PASS|FAIL|MANUAL_REVIEW — only if manual review is approved), checks_json, decided_at`. Relationship: `Property 1—* Verification`; `property.status` derives from latest attempt. **UNRESOLVED:** rule set, what edits trigger re-verification, whether `FAIL` carries a machine reason code vs human `rejectionReason` (frontend's human text must not be resurrected silently).

**BrokerProfile + BrokerKYC** — purpose: broker identity beyond a role flag. Fields: `user_id (FK, unique), operating_region_id (FK), kyc_status, agency_name, license_no (nullable), created_at`. BrokerKYC: `id, broker_user_id, id_type, doc_storage_key (private), status, reviewed_at`. **UNRESOLVED — BLOCKING:** region granularity (locality row? pincode? radius around `Medavakkam`? multi-region?), "surrounding region" definition, and the association direction (§10).

**PropertyBrokerLink (name TBD)** — purpose: the unresolved association. Either `(property_id, broker_user_id, linked_by, status)` for owner→broker delegation, or `(property_id, owner_user_id, broker_user_id, …)` for broker-created listings. **UNRESOLVED — BLOCKING.** Do not create either table until §10 is decided; creating the wrong one forces a data migration and permission rewrite.

**Enquiry** — purpose: V1 Buyer→Property→Owner interest record (not a chat thread). Fields: `id, property_id (FK), buyer_user_id (FK), owner_user_id (denormalized at creation for scoping + history if property transfers), message (nullable, length-capped), status (NEW|CONTACTED|VISIT_SCHEDULED|VISITED|NEGOTIATING|CLOSED — or a smaller V1 set per §11), visit_date/time/note (nullable, only when scheduled), closed_outcome (nullable), created_at/updated_at`. Constraints: unique `(property_id, buyer_user_id)` within anti-spam window (decide: forever vs N days); buyer can read own, owner of the property can read/transition; nobody else. Indexes: `(property_id, status, created_at)`, `(buyer_user_id, created_at)`, `(owner_user_id, status)`.

**WishlistItem** — purpose: per-user save. Fields: `user_id, property_id, created_at`; PK `(user_id, property_id)`. Visibility rule unresolved: wishlist entry for an off-market/pending property — show as "unavailable" or hide? (Frontend has no rule; backend must pick one.)

**Payment** — purpose: immutable money record from PSP webhook. Fields: `id, user_id, provider (RAZORPAY|STRIPE|… — decide), provider_payment_id (unique), provider_order_id (unique), amount_paise, currency (INR V1), status (INITIATED|SUCCESS|FAILED — transition only via webhook, never client callback), plan_id (nullable FK), coupon_id (nullable FK), raw_webhook_json, idempotency_key (unique), created_at/paid_at`. No mutable "retry in place" — retries create new rows.

**Plan + Subscription/Entitlement (three tables, not one)** — `Plan`: `{id, code (owner-basic…), name, category, price_paise, validity_days (nullable = until-closed), listing_limit, features_json, is_active}` seeded from a decided catalog (current three price lists disagree). `Subscription`: `{id, user_id, plan_id, started_at, expires_at (nullable), status, payment_id (FK)}`. `Entitlement`: `{id, subscription_id, kind (LISTING_QUOTA|CONTACT_REVEAL|…), granted, consumed, expires_at}` — contact reveals and listing publishes decrement/check here, not by string-comparing `planName`. **UNRESOLVED:** is contact access subscription-window-based, per-unit-based, or both? Is `Titanium "until deal closed"` expiry event-driven (what event?) or manual?

**Coupon** — purpose: server-validated promo. Fields: `code (unique, uppercased), kind (FLAT|PCT), amount_paise/pct, max_uses, per_user_limit, valid_from/to, applicable_plan_ids (nullable = all), is_active`. Frontend `₹300 flat for 3 magic strings` is not a spec.

**ContactRevealAudit** — purpose: every full-phone disclosure. Fields: `id, viewer_user_id, property_id, owner_user_id, entitlement_id (nullable), ip_hash, user_agent_hash, created_at`. Required by §9; doubles as abuse-detection source.

**AuditLog** — purpose: admin + sensitive-action trail. Fields: `id, actor_user_id, action, entity_type, entity_id, before_json/after_json (redacted), ip_hash, created_at`. Append-only; no update/delete API. Retention policy unresolved.

**Locality/Region** — purpose: normalize the 8 free-text localities + `Medavakkam`-style broker regions. Fields: `id, city, name (unique per city), pincode (nullable), geo_centroid (nullable), parent_region_id (self-FK for "surrounding")`. Frontend writes raw strings (`Anna Nagar`, `OMR`); backend must resolve to FK at submit time or search will never be consistent.

### 7.2 Relationship map (load-bearing)

- `User 1—* Property` via `owner_user_id`. Broker link (if any) is additive, never a second owner column until decided.
- `Property 1—* Media|Documents|Verifications`; `Property *—1 Locality`.
- `Enquiry *—1 Property`, `Enquiry *—1 Buyer`, denormalized `owner_user_id` for stable scoping.
- `Payment 1—1 Subscription` (one successful payment activates one subscription; retries are new payments).
- `Subscription 1—* Entitlement`; every publish and every phone reveal checks `Entitlement`, never `plan.name`.

---

## 8. Property Lifecycle Analysis

### 8.1 Required flow vs frontend flow

Required (per brief): `DRAFT → PENDING → AUTOMATED VERIFICATION → VERIFIED → PUBLISHED → ACTIVE`, plus `SOLD|RENTED|LEASED` off-market retention.

Frontend (actual): `draft → pending → active|rejected` (manual-team copy), `active → closed` (pause / close / lead-close), stray `expired`, terminal outcomes `Rented|Sold|Leased|Not Converted` living on the **lead**, optionally copied to the property.

**Architectural position:**

- Collapse `VERIFIED → PUBLISHED → ACTIVE` into **one persisted `status` + three timestamps** (`verified_at`, `published_at`, `activated_at`). Three distinct persisted states for what is likely "checks passed → visible → searchable" invites impossible combinations (`VERIFIED` but not `PUBLISHED` forever?). If the business insists all three are user-visible, implement as a single enum with those values and timestamp each entry — never three booleans.
- Recommended V1 enum: `DRAFT, PENDING, VERIFIED, ACTIVE, PAUSED, REJECTED (only if manual review approved), SOLD, RENTED, LEASED, WITHDRAWN, EXPIRED`. Rationale: frontend already needs `PAUSED` (its Pause copy promises resumability but implements `closed` — a data-model bug), and `WITHDRAWN` vs `SOLD/RENTED/LEASED` must be distinct for reporting (a withdrawn listing is not a conversion).
- `SOLD/RENTED/LEASED` semantics (per requirement): rows stay; `status IN (SOLD,RENTED,LEASED)` excluded from every public-search predicate (centralize in one repository method, not per-route `!=` chains); `offmarket_at + offmarket_reason` set atomically with the transition; owner dashboard and admin list them under Closed/History; wishlist entries referencing them render "unavailable" (decision needed); reporting counts conversions from these, not from lead rows.

### 8.2 Behavior matrix

| Surface | Required behavior |
|---|---|
| Database | Row retained with terminal status + `offmarket_at/reason`; immutable except defined reopen (decide: can SOLD ever reopen? default no). |
| Public search | Predicate `status = ACTIVE` (+ purpose/locality/type filters). No other status leaks. Enforce in one query builder; test with fixtures per status. |
| Owner dashboard | All statuses visible with counts; terminal ones under Closed/History with outcome badge (`StatusBadge.js` already renders `RENTED/SOLD/LEASED` — keep the labels, change the source of truth). |
| Admin dashboard | All statuses + verification attempts + audit trail; bulk actions only if explicitly approved. |
| History/reporting | Conversions from property terminal states; lead `closedOutcome` is pipeline info, not the listing's legal status (frontend conflates them via `closePropertyToo` checkbox — backend must record both sides explicitly). |

### 8.3 Edge cases the implementation must handle (design constraints, not code)

- **Edits after verification:** any edit to price/area/address/documents while `ACTIVE` must force `PENDING` + new `Verification` attempt (decide field list; frontend's "editing locked during verification" is correct instinct but must be server-enforced with `409 Conflict` on stale writes, plus optimistic-lock `updated_at`/`version` check).
- **Ownership checks:** every mutate route (`edit, pause, close, resubmit, delete-draft`) requires `property.owner_user_id == caller` (or admin with audit). Frontend passes full objects to `navigate("Add", {editingProperty})` — backend must never trust client-supplied owner id (mass-assignment risk, §15).
- **Publishing/quota:** quota check (`usedListings < listingLimit`) must be inside the publish transaction with `SELECT … FOR UPDATE` on the entitlement row; frontend's pre-check in `OwnerAddPropertyScreen.js:242` is UI convenience only.
- **Duplicate submissions:** double-tap Publish / retry must not create two `PENDING` rows — `Idempotency-Key` + `submit_fingerprint` (hash of owner+address+price+area) with a "possible duplicate" warning path (decide UX).
- **Concurrent requests:** two simultaneous closes, or close-while-editing, must serialize on the property row; losers get `409`, not silent overwrites. Test with parallel-request integration tests (§17).

---

## 9. Authentication & Authorization

### 9.1 What exists vs what is required

Exists: nothing (see §2.1). Required per brief: Phone+OTP and Google OAuth, token/session architecture, RBAC over buyer/owner/broker/admin, resource ownership, admin authorization.

### 9.2 Design constraints (recommendations, not decisions)

- **Identity:** one `User` row per human; phone and Google are *login methods* linked to it. Decide: signup-role selection vs progressive grant (recommended: default `buyer`, grant `owner`/`broker` on first use/KYC — avoids the frontend's split Jessica/Rajesh identities). OTP: provider, code length/TTL (e.g. 6-digit/5-min), max attempts (e.g. 5), resend cooldown, per-phone/per-IP rate limits, dev-bypass only in non-prod with audit.
- **Tokens:** short-lived access JWT (5–15 min) + rotating opaque refresh tokens (stored hashed, single-use, bound to device id). Mobile storage: `expo-secure-store` for refresh, memory for access — frontend currently has neither library installed. Every authenticated route validates `sub` + role grants server-side; never trust a client-sent `role` or `userId`.
- **Authorization matrix (must be tested per §17):**

| Action | Buyer | Owner (own) | Owner (others') | Broker | Admin |
|---|---|---|---|---|---|
| Search ACTIVE listings | ✅ | ✅ | ✅ | ✅ | ✅ |
| View masked contact | ✅ | ✅ | ✅ | ✅ (scope TBD) | ✅ (audited) |
| View full phone | only with entitlement (§9.3) | own listings | ❌ | only with entitlement + region scope | ✅ (audited, no entitlement) |
| Create/edit/pause/close property | ❌ | ✅ own only | ❌ | only via decided link (§10) | ❌ mutate (read/audit only unless doc says otherwise) |
| Read/transition enquiry | own (as buyer) | own listings' | ❌ | only linked scope | ✅ read-only + audit |
| Publish beyond quota | n/a | ❌ (402/409) | n/a | n/a | n/a |

### 9.3 Owner contact privacy (enforced design)

- **API response strategy:** two serializers. Public search/detail returns `{phone_masked: "+91 98••• ••210", contact_reveal_required: true}` — never the full number, never a reversible obfuscation. A separate `POST /properties/{id}/contact-reveal` (auth + entitlement check) returns the full number once, writes a `ContactRevealAudit` row, and is rate-limited. The frontend's current `agent.phone` bundling must be deleted, not patched.
- **Entitlement check order:** authenticate → load property (must be ACTIVE) → check subscription/entitlement (or admin override) → audit → return. Failure returns `403` with no number, not a masked fallback that leaks length/format beyond the fixed mask.
- **Abuse risks:** scraping via reveal endpoint (mitigate: per-user daily reveal cap, per-property velocity alerts, CAPTCHA/step-up on anomaly); screenshot/reshare (mitigate: watermark + audit, accept residual risk); owner-number harvesting via enquiry auto-responses (mitigate: owner number never flows to buyer except via reveal endpoint).
- **Logging:** audit every reveal (§7.1 `ContactRevealAudit`); never log full numbers in app logs; mask in error payloads.

### 9.4 Vulnerability classes to design out now

IDOR (property/enquiry/wishlist id guessing), privilege escalation (`role` self-grant, `owner_user_id` overwrite), token misuse (no expiry/rotation/device binding), OTP abuse (no rate limit, predictable codes), unauthorized contact access (client-side masking), admin exposure (no MFA/IP policy). Each maps to ranked findings in §15 and tests in §17.

---

## 10. Broker Analysis

**Fact:** no broker implementation exists. The brief confirms: Owner and Broker are separate account roles; broker selects a region such as `Medavakkam` and operates within/in the surrounding region. Association direction is explicitly unresolved.

### Option A — Owner creates property → broker association

- Model: property owned by `owner_user_id`; optional `PropertyBrokerLink(property_id, broker_user_id, status, linked_by)` granting scoped rights (view leads, schedule visits, negotiate — never transfer ownership, never close listing without owner consent unless decided).
- Consequences: ownership stays clean; permissions are additive and revocable; search/visibility logic unchanged; broker dashboard is a "shared with me" view. Complexity: link lifecycle (invite/accept/revoke), per-action scope matrix, revocation semantics for in-flight enquiries/visits.
- Requires decisions: who can invite (owner only? broker request?), link expiry, commission/brokerage fields (note: "0% brokerage" marketing copy conflicts with any broker-fee model — must be reconciled), whether one property can have multiple brokers.

### Option B — Broker creates property → owner association

- Model: property created by `broker_user_id` with `owner_user_id` attached (attested ownership). Verification must prove *owner consent*, not just broker input — otherwise brokers can list strangers' property (fraud vector).
- Consequences: heavier onboarding (owner verification/invite/consent flow before publish); ownership disputes possible (broker claims vs owner claims); permission model inverted (broker is creator but not owner); offboarding (broker leaves → property stays with owner) needs explicit transfer rules.
- Requires decisions: consent mechanism (OTP to owner phone? document proof? both?), who pays the listing quota (broker's or owner's subscription?), who receives enquiries first, who can set terminal states.

### Decision required before any broker table exists (blocking)

1. A or B (or hybrid: both flows with distinct link types)?
2. Region definition: `operating_region_id` granularity + "surrounding" rule (adjacency list? radius km? pincode set?). `Medavakkam` must resolve to a `Locality/Region` row, not a string.
3. Broker powers: read leads? schedule visits? edit price? close listing? contact reveal quota shared with buyer entitlement or separate?
4. Broker KYC fields/verification and multi-region/multi-broker cardinality.
5. **Do not create `PropertyBrokerLink` or `BrokerProfile` tables until 1–4 are answered.** Either direction chosen later will otherwise orphan data and force permission rewrites.

---

## 11. Enquiry Analysis

**V1 scope (confirmed):** Buyer → Property → Enquiry → Owner. `MessageScreen.js` chat/negotiation is explicitly out of scope.

- **Entities:** `Enquiry` per §7.1. No thread/message table in V1. If visit scheduling is in V1 (frontend has it), `visit_date/time/note` live on the enquiry; a separate `Visit` table is deferred until rescheduling history is required (decide).
- **Ownership/visibility:** buyer sees own enquiries; owner sees enquiries on own properties; broker sees only linked scope (post-§10); admin read-only + audit. Enquiry detail never exposes the other party's full phone except via the reveal endpoint (§9.3).
- **Status:** frontend's six states (`new|contacted|visit_scheduled|visited|negotiating|closed`) are unguarded UI taps. V1 recommendation: `NEW → CONTACTED → VISIT_SCHEDULED → VISITED → CLOSED` with `NEGOTIATING` optional (defer if no distinct behavior). Guard transitions server-side; `CLOSED` requires `closed_outcome`; terminal rows immutable.
- **Duplicates/spam:** enforce unique `(property_id, buyer_user_id)` within a window (decide: e.g. one open enquiry per property; new message updates existing). Rate-limit creates per user/IP/property; CAPTCHA/step-up on anomaly; length-cap + profanity/link filtering on `message` (decide rules).
- **Authorization:** create requires auth + property ACTIVE + not-own-property (decide: can owners enquire on own listings? default no); transition requires owner-of-property or buyer-own (limited: buyer may cancel own NEW only — decide); every access checks both sides.
- **Notifications:** owner notified on create/visit (channel TBD — push minimum; SMS/WhatsApp decided in §21). Use outbox + worker, not inline sends; buyer notified on status change. No notification content containing full phone numbers.

---

## 12. Search & Performance

Required dimensions (from frontend filters + brief): `location (locality/city), price, property_type, BHK, purpose, + construction_status, verified-only, sort, pagination`.

- **Indexes (MySQL 8, to be validated with EXPLAIN in implementation):** composite `(status, purpose, locality_id, price_paise)` for the dominant query; `(owner_user_id, status)` for owner lists; `(status, published_at DESC)` for Recently Added; covering index including `bhk, property_type` if filter-combos prove selective. Full-text index on `(title, address_text)` only if `MATCH…AGAINST` is adopted; otherwise strict FK + enum predicates (never `LIKE %…%` on free-text location — normalize to `locality_id` at write time).
- **Query risks:** `OR` across purpose/type, unbounded `IN` lists, `OFFSET` deep-pagination, sorting by computed `perSqft` (compute at write or sort by indexed columns only), N+1 on media/agent (use single join + cover-photo-only select for cards; full gallery on detail).
- **Pagination:** cursor-based (`published_at, id`) for public infinite scroll (stable under inserts); offset only for admin tables with explicit max-page guard. Response envelope `{items, next_cursor, total (capped/approximate)}` — exact unbounded totals are a performance trap.
- **Filtering strategy:** whitelist every enum/sort server-side; reject unknown values with `422`, never ignore-and-return-all (frontend's fallback-to-unfiltered behavior must not be replicated).
- **Scalability:** keep search behind a service interface; when volume or geo ("surrounding region") outgrows MySQL, add a search index without touching routers. Cache only ACTIVE-listing *query shapes* with short TTL + publish/invalidation on status change; never cache phone data.

---

## 13. Payment & Subscription Analysis

### 13.1 Frontend vs brief

Frontend presents three mutually inconsistent price sources: `OwnerPlansScreen` (residential/commercial 6 tiers), `MenuScreen` agent tiers (6 more), and the phantom `Owner Pro Plan ₹2,999` fallback. Coupon is 3 magic strings → `₹300`; tax is the string `"Included"` with `18% GST` asserted but never computed; success receipt is hardcoded. **None of this is a pricing requirement.** The brief's only usable directive is the split: `Payment` (money record) vs `Subscription/Entitlement` (access record).

### 13.2 Required separation

- `Payment`: append-only, PSP-driven, idempotent on provider ids. Client "success" callbacks are untrusted; only webhooks transition `INITIATED → SUCCESS/FAILED` (with signature verification + replay protection).
- `Subscription`: created/updated *by* a `SUCCESS` webhook; holds window (`started_at/expires_at`) + `plan_id`.
- `Entitlement`: checkable units (`LISTING_QUOTA`, `CONTACT_REVEAL`). Publish and reveal flows read this, never `plan.name` or client-sent `totalAmount` (frontend's `OwnerPaymentScreen` trusts navigation params — backend must re-price from the `Plan` table).
- `Coupon`: server-resolved at order creation (validate code, plan applicability, dates, per-user/global caps, min amount so ₹0 plans can't go negative); discount computed server-side and frozen on the order.

### 13.3 Must finalize before implementation (blocking)

Provider (Razorpay vs Stripe vs UPI-intent — affects webhook shape, refunds, GST invoices); plan catalog source of truth (codes, prices in paise, validity incl. `"until deal closed"` event definition, listing limits); coupon rules; GST invoice issuer (PSP vs backend) and invoice numbering (`INV-2026-0814` / `RST-2026-8819` are mock strings); refund/chargeback handling; `402 Payment Required` vs `409 Conflict` contract for quota exhaustion.

### 13.4 Payment security (see also §15)

Server-side amount calculation, webhook signature verification, idempotency keys, no card/UPI data touching backend (use PSP Elements/intents; PCI scope stays with provider), PII-redacted payment logs, reconciliation job (provider settlement vs local `SUCCESS` rows), alerting on webhook gaps.

---

## 14. Admin Backend Analysis

Expected areas (per brief): Dashboard, Properties, Verification, Users, Brokers, Enquiries, Reports, Audit Logs, Settings. No admin code exists in the frontend.

- **Required APIs (groups in §16):** read-only list/detail across users/properties/enquiries/payments/brokers with cursor pagination + audit; verification-attempt read (no manual reject unless doc-approved); user role-grant/revoke (dual-control for `admin` grants); broker KYC review (if manual step approved); reports (aggregates, never raw PII dumps); settings (plan/coupon/region master data with change audit).
- **Authorization boundary:** separate admin auth (MFA mandatory, short sessions, IP allowlist option); `require_admin` on every `/admin/*`; admin can read but by default cannot mutate marketplace state (no editing prices, no closing listings, no revealing phones without audit) — any exception needs explicit approval + audit.
- **Sensitive operations:** role grants, KYC decisions, coupon/plan changes, refunds, region merges, PII export. Each requires reason field + `AuditLog` row + (for destructive) second-approver or delayed execution (decide).
- **Verification:** automated per brief — admin sees attempts/checks, does not hand-reject. If the doc explicitly retains manual rejection, it must be a named action with reason codes, not a free-text `rejectionReason` like the frontend mock.

---

## 15. Security Analysis

Ranked by severity if shipped as designed today. No aggregate score per instructions.

**CRITICAL**

- **C1 — Contact PII shipped to all clients.** Full owner/agent phones are embedded in listing payloads (`properties.js` agent objects, `OwnerContext` leads) and opened via `tel:/wa.me`. Any backend that mirrors this shape leaks PII at scale. *Control:* §9.3 two-serializer + reveal endpoint + audit.
- **C2 — No authentication/authorization.** No login, tokens, or ownership checks anywhere; owner mutation paths (`updatePropertyStatus`, `deleteProperty`, `closeLead`) are client-side functions. A backend built to "match" these flows without a policy layer guarantees IDOR/privilege escalation. *Control:* §6.2 policy layer + §9.2 matrix + §17 auth tests.
- **C3 — Client-trusted pricing/payment.** `totalAmount`, `plan`, coupon discount, and "success" all originate client-side (`OwnerPlanConfirmScreen`, `OwnerPaymentScreen.handlePay(true)`). Copying this trust model enables price manipulation and fake activations. *Control:* server pricing, PSP webhooks only, idempotency (§13).

**HIGH**

- **H1 — Mass assignment.** `navigate("Add", {editingProperty})` passes entire objects; a backend accepting the same shape would allow `owner_user_id/status/price` overwrite. *Control:* explicit create/update schemas with read-only fields stripped, ownership from session.
- **H2 — OTP abuse (design-stage).** No provider/limits defined yet. *Control:* attempt caps, resend cooldowns, per-IP/phone throttling, hashed codes, no dev bypass in prod.
- **H3 — File upload abuse.** Wizard promises `PDF/JPG/PNG 10MB` with no validation; backend storing originals or serving docs publicly = RCE/malware + privacy breach. *Control:* presigned uploads, extension+MIME+magic-byte checks, size caps, AV scan, private bucket + signed URLs for docs, image re-encode.
- **H4 — Enquiry/lead spam & harvesting.** No dedup or rate limits; owner phones visible to any buyer. *Control:* §11 dedup + throttles + reveal endpoint.
- **H5 — Admin exposure.** Separate web app with undefined auth. *Control:* MFA, separate session, least-privilege + audit (§14).

**MEDIUM**

- **M1 — SQL injection via dynamic filters.** Low risk with SQLAlchemy bound parameters, but sort/filter string interpolation is the classic hole. *Control:* enum/sort whitelists, no raw SQL from client input.
- **M2 — Error leakage.** FastAPI debug traces or SQL errors would expose schema/PII. *Control:* generic 500s, structured logs server-side only, `exc_info` never to clients.
- **M3 — CORS/token storage.** Mobile + web + admin origins; overly broad CORS or `localStorage` refresh tokens invite theft. *Control:* allowlisted origins, `SecureStore` refresh + memory access, short lifetimes + rotation.
- **M4 — View-counter gaming / analytics poisoning.** Uncertain counting inflates dashboard bills. *Control:* decide dedup/bot rules before launch (§21.9).
- **M5 — Secrets in config.** No secrets story today. *Control:* manager-backed secrets, typed settings, no committed `.env`.

**LOW**

- **L1 — Verbose enums / deep pagination DoS.** Capped totals, max page sizes, query timeouts.
- **L2 — Splash/duplicate root registration, dead screens.** Hygiene: remove `src/index.js` duplication and dead `Explore/Message/Account` screens before they get wired to real APIs by accident.

---

## 16. API Analysis

Groups (operations identified; **not** a final contract — every `†` needs business confirmation):

- `/api/v1/auth` — `POST otp/request, otp/verify, google/start, google/callback, refresh, logout, me`. † provider, TTLs, device binding, role-grant flow.
- `/api/v1/users` — `GET/PATCH me`, KYC submit/status. † KYC fields/provider.
- `/api/v1/properties` — `POST / (draft/submit w/ Idempotency-Key), GET /search (public ACTIVE-only), GET /{id} (masked contact), POST /{id}/contact-reveal (entitlement+audited), PATCH /{id} (owner-only, version-checked), POST /{id}/pause|close|resubmit|reopen †, DELETE /{id} (draft-only?)`. † status vocabulary, edit-reverify fields, reopen rules.
- `/api/v1/media` + `/documents` — presigned upload, attach, delete; docs private + audited. † storage backend, retention.
- `/api/v1/wishlist` — `GET, POST toggle (idempotent), DELETE /{propertyId}`. † off-market entry behavior.
- `/api/v1/enquiries` — buyer `POST /, GET /mine`; owner `GET /received?propertyId&status, PATCH /{id} (guarded transitions incl. visit)`. † status set, dedup window, notify channel.
- `/api/v1/brokers` — **frozen until §10 decided.** Probable: profile/KYC, region read, link invite/accept/revoke, linked-listings/leads. † everything.
- `/api/v1/payments` — `POST /orders (server-priced), POST /webhooks/{provider} (signed), GET /mine`. † provider.
- `/api/v1/subscriptions` + `/entitlements` — `GET /current, GET /quota, POST /consume-check` (internal). † catalog + "until closed" event.
- `/api/v1/plans` + `/coupons` — public plan list; coupon validate (server-side, at order time).
- `/api/v1/admin/*` — per §14, `require_admin` + MFA + audit on all. † powers boundary, approvers.
- Cross-cutting: `401/403/404(substituted to avoid id-oracle where needed)/409/422/429` semantics, `Idempotency-Key` support, cursor pagination envelope, `X-Request-Id` tracing.

---

## 17. Testing Strategy

Minimum bar before production; high-risk items starred:

- **Unit:** lifecycle transition guards (incl. illegal jumps, terminal immutability)★; entitlement/quota checks (masked vs reveal)★; coupon/pricing math (paise, GST, zero-plan guard); mask serializer (assert full number absent from public payloads)★; fingerprint/duplicate logic.
- **Integration:** auth flows (OTP happy/abuse paths, Google link/dedupe)★; property submit→verify→publish→search-visibility chain★; edit-triggers-reverify; publish-quota exhaustion under lock★; payment webhook→subscription→entitlement (incl. replayed/duplicate webhooks)★; enquiry create→owner-visible→notify-outbox; upload→scan→private-serve.
- **AuthZ (per-endpoint matrix):** buyer/owner-other/broker/out-of-scope/admin on every property/enquiry/wishlist/reveal route★; `owner_user_id` overwrite attempts; admin-without-MFA rejection.
- **Search:** per-status visibility fixtures (only ACTIVE surfaces)★; purpose/type/BHK/budget combos; sort whitelist rejection; pagination stability under concurrent inserts; index EXPLAIN review.
- **Wishlist/enquiry:** toggle idempotency; cross-user isolation; duplicate-window enforcement; rate-limit behavior.
- **Payment:** amount-tamper rejection; signature-failure rejection; double-webhook single-activation; refund path.
- **Security:** upload EICAR/double-extension/mime-spoof; CORS origin matrix; error-payload PII scan; rate-limit headers; audit-row presence for reveals/admin actions★.
- **Concurrency/idempotency:** parallel double-Publish (one row)★; parallel closeLead+edit (409, no lost update); retried requests with same `Idempotency-Key`.
- **Regression:** frontend contract tests pinning public payload shapes (especially *absence* of full phone) so future UI work can't reintroduce the leak★.

---

## 18. Risks & Potential Loopholes

1. **Dual identity split** (Jessica buyer vs Rajesh owner) becomes duplicate `User` rows + split entitlements/history. Fix at auth design, not with a later merge script.
2. **Pause-as-closed** destroys resumability and corrupts conversion metrics. Introduce `PAUSED` before any data exists.
3. **Lead-outcome ⇄ listing-status conflation** (`closePropertyToo` checkbox) lets a single buyer's "Not Converted" close — or fail to close — the public listing. Record both explicitly; listing terminal state requires its own owner intent.
4. **Free-text localities** (`Anna Nagar` vs `Anna Nagar East`, `OMR` vs corpus variants) make search and broker regions unreliable. `Locality` master + FK resolution is a launch requirement, not polish.
5. **`expired` with no producer/consumer** will accumulate undecided rows. Either define the expiry job or drop the status.
6. **`Titanium "until deal closed"` without an event definition** is an unbounded liability. Define the closing event (which outcome? who attests? timeout backstop?) or replace with dated validity.
7. **Money-back assurance copy** (`OwnerPlansScreen`, `OwnerPlanConfirmScreen`) with no backing workflow is a dispute pipeline. Either implement claim logic or remove the copy before launch.
8. **Agent plan cards in `MenuScreen`** imply a broker monetization model that contradicts "0% brokerage" elsewhere. Reconcile messaging before pricing tables harden into schema.
9. **Gallery/document absence in mocks** hides storage, scanning, and privacy costs. Budget S3/CDN + AV + signed-URL work explicitly.
10. **Dead screens (`Explore`, `Message`, `Account`)** risk being "revived" mid-implementation with conflicting models (especially `Message` chat vs V1 enquiry). Officially deprecate or remove them now.
11. **Migration hazard:** any broker/region/entitlement table created before §21 decisions will need destructive rewrites. Gate DDL on the decision register.

---

## 19. Implementation Dependencies

Dependency chain (each layer's contract is consumed by the next; skipping ahead creates rework):

`Decisions (§21) → Locality/Region master + User/RoleGrant → Property + Media/Documents + Verification → Search/visibility → Wishlist → Enquiry (+ outbox/notifications) → Broker (post-§10) → Payment → Subscription/Entitlement → Contact-reveal → Admin + Audit → Hardening (rate limits, CORS, secrets, logging, reconciliation)`.

- Auth cannot be built after properties (ownership predicates have no subject). Quota/reveal cannot precede subscriptions. Broker cannot precede the association decision. Admin cannot precede audit instrumentation. Hardening is last *to verify*, but its hooks (audit writer, idempotency, outbox) must be designed in phase 1.

---

## 20. Confirmed Decisions

Per §4 standard — build on these:

1. Separate Buyer/Tenant, Owner, Broker roles + separate Admin web app.
2. Terminal `SOLD/RENTED/LEASED` retained in DB, hidden from public search, visible to owner/admin/history.
3. Verification precedes visibility; automated (no manual rejection without doc evidence).
4. Server-side masked-vs-full phone enforcement via entitlement + audit.
5. V1 enquiry is Buyer→Property→Enquiry→Owner; no chat/negotiation.
6. `Payment` ≠ `Subscription/Entitlement` (three tables + coupon + reveal-audit).
7. Future AI/voice/multilingual must remain possible without V1 schema contortions.

---

## 21. Unresolved Decisions

**Do not implement the dependent domain until each is answered. Owner: business/client.**

1. **Identity/auth:** OTP provider, code TTL/attempts/resend/rate limits; Google client(s) + account-linking/dedupe rule; access/refresh lifetimes + rotation + device binding; signup role flow; can one phone hold owner+broker?
2. **Broker (blocking):** Option A vs B; region granularity + "surrounding" rule; broker powers (read/schedule/edit-price/close); quota ownership; enquiry routing; KYC fields; cardinality (multi-broker, multi-region); brokerage-fee vs "0% brokerage" reconciliation.
3. **Verification:** automated rule set + ruleset versioning; `FAIL` reason codes; which edits trigger re-verification; `VERIFIED→PUBLISHED→ACTIVE` collapse approved?; manual-review existence (default no).
4. **Lifecycle vocabulary:** adopt `DRAFT,PENDING,VERIFIED,ACTIVE,PAUSED,WITHDRAWN,SOLD,RENTED,LEASED,(REJECTED?,EXPIRED?)`?; reopen rules per terminal state; `expired` producer or removal; pause/resume semantics.
5. **Contact entitlement:** subscription-window vs per-reveal credits vs hybrid; caps/velocity rules; mask format; broker reveal scope; admin override audit.
6. **Property enums:** canonical `purpose` mapping (Buy↔Sell?); `category` (fold `Land`?); `property_type` (`Bungalow` vs `House`, `Plot` vs `Land`); BHK representation; required vs optional spec fields; price/deposit/maintenance units (paise everywhere).
7. **Media/documents:** storage backend, image limits/dimensions, doc type closed list, retention/deletion, AV provider, signed-URL TTLs.
8. **Enquiry:** status set (keep `NEGOTIATING`?); dedup window; buyer-cancel rights; visit model (fields on enquiry vs table); notification channels (push/SMS/WhatsApp) + templates.
9. **Analytics:** view/enquiry/visit counting rules (unique? auth-only? bot-filter?); real-time vs aggregated; dashboard SLAs.
10. **Payments:** provider; plan catalog (codes/prices/validity/limits incl. "until closed" event); coupon rules; GST invoice issuer + numbering; refunds/chargebacks; quota-exhaustion status codes.
11. **Locality/region master:** canonical list, pincode/geo, alias resolution, `Medavakkam` + surrounding definition.
12. **Admin:** auth (MFA/IP), powers boundary, approval workflows, audit retention, PII export policy.
13. **Wishlist off-market behavior:** hide vs "unavailable" for pending/paused/terminal properties.
14. **Doc production:** deliver the actual `RESTAMP_Backend_Documentation.docx` or formally supersede it with this register — implementation must not proceed on "brief-memory" of the doc.

---

## 22. Recommended Implementation Order

Deliberately not screen order — dependency order, with rationale:

1. **Decisions + master data.** Close §21.1–4/6/11 first; seed `Locality/Region`, canonical enums. *Why:* every later table references these; changing enums post-data is a migration + backfill.
2. **Database + migrations.** `User, RoleGrant, Property, Media, Documents, Verification, Locality` + Alembic pipeline + audit/outbox scaffolding. *Why:* the contract all services build on; no business logic before the ground truth exists.
3. **Authentication + authorization skeleton.** OTP/Google, tokens, `require_role`/`require_owner` dependencies, storage lib (`SecureStore`) in frontend. *Why:* ownership is meaningless without identity; doing it later retrofits every route.
4. **Users/Roles + KYC stub.** Profile, role grants, KYC submit/status (stub provider). *Why:* unblocks owner/broker onboarding flows.
5. **Properties + verification.** Draft/submit, automated checks, single-status machine, media/doc upload pipeline. *Why:* the core aggregate; search/wishlist/enquiry all hang off it.
6. **Search + visibility.** ACTIVE-only predicate, indexes, cursor pagination, contract tests pinning masked payloads. *Why:* validates the lifecycle end-to-end before engagement features multiply states.
7. **Wishlist.** Scoped CRUD + idempotency + off-market rule. *Why:* small, isolated, exercises auth + visibility.
8. **Enquiries (+ outbox).** Guarded transitions, dedup, throttles, owner notifications via worker. *Why:* needs properties + identity + visibility stable first.
9. **Broker (only after §10).** Profiles, KYC, links, scoped dashboards. *Why:* touches ownership/permissions — building earlier corrupts them.
10. **Payment → Subscription/Entitlement.** PSP orders/webhooks, catalog, coupons, quota + reveal checks. *Why:* monetization depends on every prior aggregate; reveal endpoint goes live here, not earlier.
11. **Admin.** Read APIs, role/KYC/plan management, reports, audit viewer. *Why:* needs all domains + audit events to administer.
12. **Hardening.** Rate limits, CORS, secrets, error hygiene, reconciliation jobs, load/soak + security test gates. *Why:* verify as a whole system, not per-route promises.

---

## 23. Backend Readiness Checklist

- [ ] Actual backend doc produced or §21 formally adopted as its replacement
- [ ] §21.1–14 answered in writing (broker + verification + entitlement are blocking)
- [ ] Canonical enums + `Locality/Region` master (incl. `Medavakkam` + surrounding rule)
- [ ] Single-status lifecycle with timestamps agreed (§8)
- [ ] DB conceptual model approved (no DDL before broker decision)
- [ ] Auth design (OTP/Google/tokens/storage) + authZ matrix signed off
- [ ] Contact-reveal + audit design signed off; public payloads proven phone-free
- [ ] Payment provider + plan/coupon/GST/refund rules signed off; server-pricing agreed
- [ ] Upload pipeline (storage/scan/private-docs) selected
- [ ] Notification channels + outbox design agreed
- [ ] Admin powers + MFA + audit retention agreed
- [ ] API groups + pagination + idempotency + error contract agreed
- [ ] §17 test plan resourced (authZ + lifecycle + webhook + concurrency gates)
- [ ] Dead screens removed or formally deprecated; phantom `Owner Pro Plan ₹2,999` eliminated from code
- [ ] `AGENTS.md` Expo-docs rule acknowledged for any frontend touch-ups (none required for this analysis)

**Current state: 0/15 — not ready.**

---

## 24. Final Recommendation

**Do not start backend implementation yet.**

The frontend is a useful UI prototype but a dangerous spec: it contradicts the required lifecycle, leaks contact PII by construction, simulates payments/entitlements, and omits broker, admin, and auth entirely. The backend planning baseline itself cannot be verified because the source document is missing from the workspace.

**Safest path:**

1. Produce the actual `RESTAMP_Backend_Documentation.docx` (or declare this report's §20/§21 the superseding baseline).
2. Resolve §21 blocking items in order: broker association → verification rules → lifecycle vocabulary → entitlement model → payment provider/catalog.
3. Implement strictly in §22 order with §17 gates — especially the phone-absence contract test, the ACTIVE-only visibility fixtures, and the webhook/idempotency tests — before any broker, payment, or admin code.

Done in that sequence, RESTAMP gets a backend that is secure (no PII leak, no IDOR, no price tampering), migratable (one status column, FK-normalized localities, additive broker links), and extensible (outbox for notifications, entitlement table for future AI/voice/multilingual gating). Started now, it gets the frontend's mock semantics poured into concrete — and every fix after that is a data migration.
