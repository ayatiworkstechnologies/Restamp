# Live Fixes — Owner Identity from Auth + Bounded API Timeout (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
No backend, database, schema, migration, secret, environment, deployment,
OTP-generation, or auth-rule changes.

## Bug A — Owner profile used the authenticated user

- **Root cause:** `OwnerContext` hardcoded a mock person and never synced
  from AuthContext; Buyer Profile already used the auth user.
- **Fix:** `src/context/OwnerContext.js` derives `ownerProfile`
  (`name/firstName/phone/email/avatar/verified`) from `useAuth().user` via
  `useMemo` — zero extra requests, updates on login and role switch.
  Absent fields stay blank/generic (`"Owner"`, `""`, `null`, `false`);
  mock avatar, KYC, and membership claims removed (unused
  `setOwnerProfile` export dropped; verified no callers).
- **Render sites:** `OwnerProfileScreen.js` (conditional avatar, "Not
  provided" fallbacks, KYC row claims removed), `OwnerDashboardScreen.js`
  (neutral greeting fallback), `OwnerHeader.js` (no mock name/avatar).
  Listing/lead/plan state untouched. Same-user data only — no cross-user
  exposure (nothing new is fetched or shared).

## Bug B — API requests could hang forever

- **Gap:** `src/api/client.js` awaited bare `fetch` with no timeout; OTP
  login chains up to 3 sequential unbounded requests behind one spinner.
- **Fix:** `fetchWithTimeout` (`AbortController`, 25s default) applied to
  both request paths. Timeouts reject as kind `"timeout"` (status 0) with a
  recoverable message — never `"login"`, so slow networks are never reported
  as invalid OTP codes. Caller aborts rethrow untouched; plain failures keep
  the existing `"offline"` mapping. `LoginScreen` maps `"timeout"` to clear
  retry copy; `busy` already reset via `finally` (verified, unchanged).
  `__setRequestTimeoutMs` is a test-only override (production never calls it).
- Render cold-start remains a hypothesis (stated, not proven); the timeout
  bounds the symptom regardless of cause. Demo OTP behavior untouched.

## Tests executed and actual results

- New `scripts/live-identity-timeout.test.mjs`: **passes** (identity source
  guards I1–I2; timeout kinds T0–T2; happy-path T3; offline preserved T4).
- Full frontend: **8/8 suites pass**. `npm run build:web` succeeds.
  `git diff --check` clean. Backend suites not run (no backend change).
- Abort-misclassification branch has no current callers (verified by grep);
  covered by inspection + build only, stated here.

## Manual verification steps (not performed — stated, not claimed)

1. OTP login → Buyer Profile shows your name/phone → switch to Owner →
   Owner Profile shows the same identity; Dashboard greeting matches.
2. Fresh install/logged-out Owner entry shows generic blanks, no mock person.
3. Throttle or stall network during OTP request → clear timeout error within
   ~25s (not an endless spinner), busy resets, retry works.
4. Successful OTP login still navigates to MainTabs (or Name setup) as before.
5. Retry after a timeout succeeds once the backend responds.

## Limitations

- Owner KYC/verification has no backend source; rows now report unavailable
  instead of verified.
- Nothing staged, committed, pushed, or deployed.
