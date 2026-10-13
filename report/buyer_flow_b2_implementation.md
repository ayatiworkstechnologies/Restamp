# Buyer Flow B2 Implementation Report — Contact & Enquiry Honesty (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
Backend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-backend` (tests only; zero tracked changes)

## Verified enquiry-to-owner chain (no gap; no backend change needed)

1. Authenticated buyer taps Send Enquiry on a real property →
   `createEnquiry` → `POST /buyer/enquiries` → `create_enquiry` validates
   the listing and derives `owner_user_id` from `physical_properties.user_id`
   (no client owner ID exists in the contract).
2. The row is visible to exactly that owner via `GET /owner/leads` and the
   per-property Leads screen (`owner_user_id == caller`); other owners see
   nothing; buyers never touch owner endpoints.
3. Success is shown only after the backend resolves; failures reject with an
   honest error and create no partial rows (rollback + gates verified).
4. Idempotency: reveal creates the active lead (message None); a later Send
   Enquiry returns the same row (200 path) — one owner-visible lead per
   buyer+property, repeats only add `contact_reveal_audits` rows. P3 audits,
   P4 transitions, and re-enquiry-after-close preserved.

## Files changed (frontend only)

- `src/screens/buyer/SearchScreen.js` — reveal state machine
  (`idle/loading/revealed/failed/login`) with request-ID guard; number
  shown/copied/dialed only from the authorized response; Login prompt via
  the existing Login route; neutral agent fallbacks; unavailable guidance
  for card-level actions.
- `src/components/PropertyDetailModal.js` — `onLoginRequired` prop (wired in
  Search/Home/Saved/Enquiries/Explore); duplicate-tap guard + Sending state;
  server-confirmed enquiry success; logged-out login prompt; question and
  site visit report not-supported instead of false success; Listed-By
  identity/number neutralized.
- `src/screens/buyer/ExploreScreen.js` — sample numbers never
  dialed/messaged/copied; neutral fallbacks. Page otherwise unchanged.
- `scripts/buyer-flow.test.mjs` — B2 guards (C1–C4, E1–E3) + API contracts
  (A1–A4).
- Backend: `tests/test_owner_leads.py` +1 test
  (`test_b2_reveal_then_enquiry_single_owner_visible_lead`).

## Tests executed and actual results

- Frontend: **7/7 suites pass** (incl. extended buyer-flow: 26 checks).
- New backend B2 test: **passes** (isolated rollback setup; no shared rows
  touched).
- `npm run build:web` succeeds. `git diff --check` clean (both repos).
- Broader shared-DB suites not re-run (pre-existing `test_buyer_6b5`
  pollution documented in P3/P4; unrelated rows untouched).

## Limitations and deferred work

- No post-login return to the property (Login resets to MainTabs by design).
- Explore contact unavailable (samples have no backend records).
- Question/visit/chat/negotiation unimplemented (honest messaging kept);
  availability-note marketing copy untouched.
- Nothing staged, committed, pushed, or deployed. P0–P4 and Buyer Flow B1
  behavior preserved; OTP/auth, schema/migrations, Owner flows untouched.
