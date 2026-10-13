# P4 Owner Leads Status Persistence & Reliability — Implementation Report (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
Backend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-backend`

Covers only the three approved decisions (close-only-lead, re-enquiry after
close, Not Converted → CLOSED + reason). Visit/notes persistence and
Visit/Negotiating/LOST behavior remain on hold. No schema/migration changes.

## Files changed

**Backend**
- `app/schemas.py` — new `OwnerLeadUpdate` (`status: NEW|CONTACTED|CLOSED`,
  `closing_reason ≤500`).
- `app/services/enquiries.py` — new `transition_owner_lead`: owner scoping
  (404 on foreign/missing), transition table
  (`NEW→CONTACTED/CLOSED`, `CONTACTED→CLOSED/NEW`, idempotent same-status,
  `CLOSED` terminal, else 422), active-row removal only on `CLOSED`, listing
  never touched.
- `app/routers/owner.py` — new `PATCH /owner/leads/{lead_id}` (savepoint +
  rollback conventions, phone-free `OwnerLeadOut` response).
- `tests/test_owner_leads.py` — 5 new tests (persist+refetch, auth/foreign,
  422 without partial change, Not Converted, listing untouched, re-enquiry,
  phone-free shape).

**Frontend**
- `src/api/owner.js` — new `updateOwnerLeadStatus` (UI/backend vocab
  normalization; 422 surfaces as ApiError).
- `OwnerLeadsScreen.js`, `OwnerPropertyLeadsScreen.js`,
  `OwnerLeadDetailScreen.js` — contacted/close actions persist
  server-confirmed (optimistic flip → server row wins; honest
  "Couldn't update lead" + refetch rollback on failure). Visit scheduling
  stays device-local, labeled on hold.
- `OwnerCloseLeadModal.js` — "also mark listing Closed" toggle removed;
  listing-updated success claim removed; always reports `false, null`.
- All three fetching screens — request-ID guards + unmount invalidation
  (`leadReqId` / `recentLeadsReqId`, `useListings` convention).
- `scripts/owner-leads-honesty.test.mjs` — P4 section (contracts, guards,
  close-only-lead, modal, dashboard).

## Tests executed and actual results

- Backend `test_owner_leads.py`: **11/11 pass** (6 P3 + 5 P4).
- Combined backend (`test_owner_leads`, `test_buyer_6b4`, `test_buyer_6b5`,
  `test_owner_listings`, `test_phase4`): **57 pass, 3 fail** — the failures
  are the pre-existing `test_buyer_6b5` absolute-count assertions broken by 2
  leftover committed rows in shared `restamp_dev` (started 2026-10-06/07,
  predating P3/P4; untouched per the no-DB-write rule).
- Frontend: **6/6 suites pass** (all honesty suites incl. new P4 guards).
- `npm run build:web` succeeds. `git diff --check` clean (both repos).

## Stale-request protection

Stale `GET /owner/leads` responses can no longer overwrite newer rows on
property switches, focus refetches, or unmounts (request-ID comparison before
every `setState`). No new dependencies; loading/retry/error/empty states
preserved.

## Known limitations and deferred decisions

- Visit scheduling/notes, Visit/Negotiating tabs, and LOST remain on hold —
  local-only flips revert on refetch (labeled in code).
- Pause/close/archive/delete listing semantics still need a backend contract.
- No `created_at` on enquiries; buyer names withheld (`Buyer #id`).
- Nothing staged, committed, pushed, or deployed.
