# P3 Owner Leads MVP — Implementation Report (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
Backend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-backend`

## What changed

**Backend (no schema/migration changes — none needed)**
- `app/routers/buyer.py` — `POST /buyer/listings/{id}/contact` now ensures one
  ACTIVE `NEW` enquiry per buyer+listing after a successful reveal (idempotent
  reuse; per-reveal `contact_reveal_audits` rows preserved).
- `app/services/enquiries.py` — new `list_owner_leads` (owner scoping,
  physical-property ownership check on the property filter → 404 on foreign
  ids, `NEW`/`CONTACTED`/`CLOSED` filter, newest-first pagination; buyer
  identity is the user id only).
- `app/routers/owner.py` — new `GET /owner/leads` (`property_listing_id`,
  `status`, `page`, `page_size` → `OwnerLeadsResponse`).
- `app/schemas.py` — new `OwnerLeadOut` (no phone field by construction) +
  `OwnerLeadsResponse`.
- `tests/test_owner_leads.py` — new, 6 tests.

**Frontend**
- `src/api/owner.js` — new `fetchOwnerLeads` + `toOwnerLead` (genuine fields
  only; derived `Buyer #id` label; no phone/name/avatar/rating invention).
- `OwnerLeadsScreen.js` / `OwnerPropertyLeadsScreen.js` — genuine fetch by
  selected property (mount + focus), loading/error/Retry + existing empty
  states; Switch Property UI, tabs, and `selectPropertyLeads` kept; honest
  unavailable contact handling; stars only for genuine ratings.
- `OwnerDashboardScreen.js` — Recent Enquiries reuses `GET /owner/leads`
  (pageSize 4); avatar/chip/call fallbacks honest.
- `OwnerLeadDetailScreen.js` — synthetic fallback property removed; phone,
  specs, price, avatar fallbacks honest; static Verified badge removed.
- `scripts/owner-leads-honesty.test.mjs` — new guards.
- Buyer Leads untouched. No detail endpoint added (detail screen uses nav params).

## Verification
- Backend `test_owner_leads.py`: **6/6 pass**. `test_buyer_6b4`: 3/3 pass.
  Combined run with `test_owner_listings`: 35 pass; only failures are 3
  pre-existing `test_buyer_6b5` count assertions broken by 2 leftover committed
  rows in shared `restamp_dev` (ids 175/201, no audits — predates this change;
  left untouched per no-DB-write rule).
- Frontend: **6/6 suites pass**. `npm run build:web` succeeds.
  `git diff --check` clean.
- Nothing staged, committed, pushed, or deployed.

## Remaining limitations
- Status transitions, visit scheduling, notes, and close outcomes are
  device-local (no transition endpoints; Visit/Negotiating tabs empty).
- Pause/close/archive/delete listing semantics need a backend contract.
- No `created_at` on enquiries (id-desc ordering); buyer names withheld
  (`Buyer #id` labels); views/visits/KYC/billing/notifications deferred.
