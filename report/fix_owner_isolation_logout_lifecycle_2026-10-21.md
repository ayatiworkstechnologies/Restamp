# Fix Report — Property Status, Owner Isolation, Logout & Auth Navigation

**Date:** 2026-10-21
**Repositories:** `Restamp-latest` (Expo/React Native frontend), `Restamp-backend` (FastAPI + MySQL)
**Status:** implemented, tested locally. No commit / push / merge / deploy / migration performed.

---

## 1. Root causes

### Bug 1 — Property stays in "Pending Verification"

**Root cause: there is no automatic verification, and the UI claimed there was.**

The backend implements an **explicit, audited, owner-driven** verification state
machine (`app/services/owner_listings.py`):

| step | transition | endpoint |
|---|---|---|
| create | `PENDING` / `AVAILABLE` | `POST /owner/listings` |
| verify | `PENDING -> VERIFIED` (audited `verifications` row) | `POST /owner/listings/{id}/verify` |
| reject | `PENDING -> REJECTED` (audited `FAIL` row) | `POST /owner/listings/{id}/reject` |
| resubmit | `REJECTED -> PENDING` | `POST /owner/listings/{id}/submit` |
| publish | `CLOSED -> AVAILABLE` (**VERIFIED only**) | `POST /owner/listings/{id}/publish` |
| archive / deal close | `AVAILABLE -> CLOSED/SOLD/RENTED/LEASED` | `.../archive`, `.../status` |

* There is **no scheduler, worker, background task or timer** anywhere in the
  backend. `grep` over `app/` shows verification only in the explicit
  transition service.
* Buyer visibility is gated on `verification_status == VERIFIED AND
  listing_status == AVAILABLE` (`app/services/listings.py::_visible`), so a
  PENDING listing is never public.
* The ruleset is literally named `owner-explicit-v1` and the audit row records
  `"actor": "owner"`.

So "waiting two minutes" correctly changes nothing — **and the property must
NOT be auto-activated.** The real defect was that the product copy told the
owner a *different* story:

* `OwnerPublishSuccessScreen`: *"Our verification team typically validates
  property ownership within 2 to 4 business hours."*
* `OwnerPropertyCard` pending box: *"Listing will go live once RESTAMP team
  validates ownership."*

No Restamp-team review step exists in the code; the only implemented path is
the explicit verification action the owner can trigger from **My Properties →
Pending → “Verify & Publish”**. The UI never named that next step, so the
listing looked permanently stuck.

**Fix:** keep the property PENDING (no auto-verification invented), replace
the false copy with the real next step, and make the status refresh reliable
(pull-to-refresh + full pagination + honest error state).

### Bug 2 — One owner's property shows in another owner's "My Properties"

**Root cause: the backend was already correct; the leak was in the client's
in-memory owner store.**

* Backend: `require_owner` derives the owner id from the validated Bearer JWT
  (`app/security.py::get_current_user_id` -> `app/deps.py::require_role`).
  `list_owner_listings` / `get_owner_listing` filter on **both**
  `property_listings.user_id` **and** `physical_properties.user_id`
  (`_owner_listing_query`), and every mutating path uses the locked variant
  `_get_owned_listing_for_update`. Verified live: Test 1 gets `total: 0` from
  `GET /owner/listings` and `404` for Roshan's listing id.
* Frontend: `OwnerContext` (mounted **above** the navigator in `App.js`, so it
  survives logout) kept the created listing in `properties` forever, and
  `OwnerPropertiesScreen` / `OwnerDashboardScreen` / `OwnerLeadsScreen`
  **merged those local rows into the server list**:

  ```js
  const localOnly = localProperties.filter((p) => !liveIds.has(p.id));
  return [...liveProperties, ...localOnly];   // <- Roshan's row for Test 1
  ```

  Logout never cleared that store, so Test 1 saw Roshan's listing under
  "My Properties" even though the API returned nothing.

### Bug 3 — Logout leaves the previous account's details visible

**Root cause:** `AuthContext.logout()` only did `setAuthToken(null)` +
`setUser(null)`. It did **not** clear the account-scoped in-memory stores
(owner listings/leads/quota, wishlist), did **not** drop the queued post-login
continuation, and did **not** reset navigation. The backend session is a
stateless JWT (no server-side logout endpoint exists), so the client is the
only place where sign-out can be enforced.

### Bug 4 — Wrong post-logout navigation / Login visibility

**Root cause:** navigation was not driven by the authentication state.

* `AppNavigator` had a hardcoded `initialRouteName="Login"` and never
  consulted `useAuth()`; the authenticated screens were always mounted.
* `OwnerProfileScreen.handleLogout` reset to **`MainTabs`** (Buyer Home) after
  signing out, so the user stayed inside the authenticated shell.
* `ProfileScreen.handleLogout` used `nav.navigate("Login")` (a *push*), so
  **Back** returned to the previous account's Profile screen.
* Nothing prevented a protected screen from rendering while logged out.

---

## 2. Changes

### Backend (`Restamp-backend`) — no production code change was needed

The owner scoping, the lifecycle state machine and the buyer-visibility gate
were already correct and are now covered by explicit regression tests.

| file | change |
|---|---|
| `tests/test_owner_isolation.py` | **new** — 6 tests: creation is attributed to the authenticated principal (a client-supplied `user_id` in the body is ignored); Test 1 cannot list/open/edit/transition/lead-filter Roshan's listing; Roshan still can; owner lists stay scoped after an account switch; drafts are scoped; anonymous callers get 401; public marketplace still shows VERIFIED+AVAILABLE listings only. |
| `tests/test_verification_policy.py` | **new** — 4 tests documenting the policy: a new listing stays `PENDING` across repeated reads *and* an explicit wait (no timer auto-verifies), no audit row is written by reads, only the explicit verify endpoint advances it, reject -> resubmit returns to PENDING, and publishing requires VERIFIED. |

### Frontend (`Restamp-latest`)

| file | change |
|---|---|
| `src/auth/session.js` | **new** — pure, unit-tested session helpers: `planSessionNavigation` (wait / stay / reset-to-Login), `shouldResetAccountScope`, `selectOwnerScopedProperties`, `AUTH_ENTRY_ROUTE`, `GUEST_ROUTES`. |
| `src/navigation/navRef.js` | **new** `resetToLogin()` — resets the whole root stack to the `Login` route (Back can no longer reach a protected screen). |
| `src/navigation/RequireAuth.js` | **new** — guard: renders nothing while logged out / while the session resolves, and resets the stack to `Login`. |
| `src/navigation/AppNavigator.js` | Auth state is now the single source of truth: nothing is rendered while the session resolves (no flash of authenticated screens), the initial route follows the auth state, a logout resets the stack to `Login`, and every account-scoped screen (`OwnerNavigator`, owner payment/plan/publish/lead screens, `Notifications`, `Enquiries`, stack `Profile`) is wrapped in `RequireAuth`. |
| `src/context/AuthContext.js` | `logout()` now clears the bearer token, the current user, the queued post-login continuation, bumps a `sessionVersion` (so account stores reset) and resets navigation to `Login`. The token is cleared **first**, so a failure later can never leave a falsely authenticated session. `sessionVersion` is exposed to account-scoped stores. |
| `src/context/OwnerContext.js` | The owner store is scoped to one account: cached listings/leads/quota/plan are dropped whenever the authenticated principal changes; locally created rows are stamped with `ownerUserId`; `selectOwnerScopedProperties` is re-exported. |
| `src/context/WishlistContext.js` | The saved-property list is dropped when the account changes. |
| `src/api/owner.js` | **new** `fetchAllOwnerListings()` — pages through the owner's own collection so tab counts and rendered cards agree for owners with more than one page of listings. |
| `src/screens/owner/OwnerPropertiesScreen.js` | Merges only owner-scoped local rows; uses the paged collection; pull-to-refresh; honest error banner instead of silently showing stale rows; an expired session clears the list and returns to `Login`. |
| `src/screens/owner/OwnerDashboardScreen.js` | Same owner-scoped merge + paged collection. |
| `src/screens/owner/OwnerLeadsScreen.js` | Same owner-scoped merge. |
| `src/screens/owner/OwnerLeadDetailScreen.js`, `src/screens/owner/OwnerPropertyLeadsScreen.js` | Property matching only considers the signed-in owner's rows. |
| `src/screens/owner/OwnerProfileScreen.js` | Sign-out resets to the `Login` route (was `MainTabs`). |
| `src/screens/buyer/ProfileScreen.js` | Sign-out **resets** to `Login` (was a `navigate`, so Back returned to the old profile); the mock identity (`Alex Smith` / `alex.smith@restamp.in`) was removed; a signed-out visitor now sees an honest "You're not signed in" card with a **Login** action. |
| `src/components/owner/OwnerPropertyCard.js` | Pending card names the real next step ("Verify & Publish") instead of the non-existent Restamp team review. |
| `src/screens/owner/OwnerPublishSuccessScreen.js` | Removed the "2 to 4 business hours" promise; states that the listing is saved as Pending Verification and how to publish it. |
| `scripts/session-isolation.test.mjs` | **new** — 52 assertions: session navigation decisions, account-scope resets, owner-row scoping (Roshan vs Test 1), logout cleanup, owner-screen scoping, logged-out navigation + Login visibility, verification copy. |
| `scripts/e2e-owner-isolation.mjs` | **new** — live E2E driving the **real** frontend API modules against the running local backend (read-only): Roshan signs in -> sees his listing -> signs out -> Test 1 signs in -> sees nothing and gets 404 on Roshan's listing -> Roshan signs back in -> still sees it. |
| `scripts/syntax-check.mjs` | **new** — parses every `src/**/*.js` with `@babel/parser` (JSX) as a static check. |

---

## 3. The intended property lifecycle (documented)

```
POST /owner/listings
      -> verification_status = PENDING   (NOT visible to buyers)
      -> listing_status     = AVAILABLE
      -> submitted_at       = now

GET  /owner/listings            (read only — never verifies, never writes)

Owner taps "Verify & Publish"  (My Properties -> Pending)
POST /owner/listings/{id}/verify
      -> verification_status = VERIFIED  (audited PASS row, actor=owner)
      -> listing_status     = AVAILABLE  -> NOW VISIBLE to buyers

Owner rejects:  POST .../reject   PENDING -> REJECTED  (owner edits, then)
Owner resubmits: POST .../submit   REJECTED -> PENDING  (submitted_at refreshed)

Owner archives: POST .../archive   AVAILABLE -> CLOSED
Owner publishes:POST .../publish   CLOSED -> AVAILABLE  (VERIFIED only)
Owner closes:   POST .../status    AVAILABLE -> SOLD | RENTED | LEASED  (VERIFIED only, terminal)
```

**A listing stays "Pending Verification" until the explicit verify action is
performed. Time alone never verifies anything, and no unverified listing is
ever activated.**

---

## 4. Tests actually executed

| check | result |
|---|---|
| `pytest tests/ -q` (backend, local `restamp_dev`, rollback-isolated) | **286 passed** (276 pre-existing + 10 new) |
| `pytest tests/test_owner_isolation.py -q` | **6 passed** |
| `pytest tests/test_verification_policy.py -q` | **4 passed** |
| `node scripts/*.test.mjs` (12 frontend suites) | **all PASS** |
| `node scripts/syntax-check.mjs` | **all 105 source files parse cleanly** |
| `node scripts/e2e-owner-isolation.mjs` (live backend) | **13/13 checks passed** |
| `npx expo export -p web` | **Web Bundled (6656 modules)** — the app builds |

## 5. Manual checks still to do (UI)

1. Roshan posts a property in the running app -> `My Properties` -> `Pending`
   shows it; tap **Verify & Publish** -> it moves to `Active` and becomes
   visible in the buyer marketplace.
2. Log out -> the app lands on the **Login** screen, no Roshan data is
   visible, the Home **Login** pill is visible, Back does not return to an
   owner screen.
3. Log in as Test 1 -> `My Properties` is empty; Test 1's profile, leads,
   visits and notifications are Test 1's own.

## 6. Notes on the local database

The verification run was **read-only** except for two self-inflicted probes,
both reverted: the audit row created by a live `verify` call on Roshan's
listing was deleted and the listing restored to `PENDING`/`AVAILABLE`, and a
throwaway OTP identity created by a connectivity probe (`[REDACTED TEST PHONE]`) was
removed. The database is back to its original state: 2 users (Roshan S
`[LOCAL TEST ID]`, Test 1 `[LOCAL TEST ID]`), 1 listing (`[LOCAL TEST ID]`, Roshan, `PENDING`/`AVAILABLE`),
0 verification rows.
