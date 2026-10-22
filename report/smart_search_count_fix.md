# Search Count Consistency Fix — Implementation Report (2026-10-14, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
No backend, schema, endpoint, auth, or OTP changes.

## Root cause (verified before editing)

The modal's "Show N Properties" button counted the mock `ALL_PROPERTIES`
catalog client-side, while suggestions and results come from the real
backend. For queries matching real listings absent from (or filtered out of)
the mock catalog — e.g. "Home Adyar Sea Breeze 4BHK" — the button read
"Show 0 Properties" beside live matches. A conflicting selected type
(e.g. Apartment vs a Home match) compounded the confusion silently.

## Fix (`src/components/SearchPropertyModal.js` only, plus tests)

- `matchedCount` (mock catalog) deleted; the button now shows a live count
  from `GET /buyer/listings` with `count_only: true`, built with the exact
  same `buildListingParams` inputs Apply sends — count and results page can
  no longer disagree. Debounced, request-ID guarded, unmount-safe; failures
  hide the number (`Show Properties`) instead of inventing one.
- New one-line conflict note (via `parseSmartQuery`): when the query text
  implies BHK/type contradicting the selected controls, the modal states
  plainly that selected filters win. UI selections keep precedence
  everywhere (modal, count, and results page use the same rule).
- Suggestion tap-to-detail, debounce guards, pagination, sorting, and design
  unchanged. `ALL_PROPERTIES` import removed (now unused here).
- `scripts/buyer-flow.test.mjs` — Sec 9 guards (E1–E4).

## Tests actually run and results

- New E1–E4 guards: **pass**. Full frontend: **8/8 suites pass**.
  `npm run build:web` succeeds (`Exported: dist`). `git diff --check`
  clean. Backend suites not run (no backend change; `count_only` is a
  pre-existing tested parameter).

## Remaining manual checks (stated, not claimed)

- Reported query shows a nonzero live count agreeing with Apply results.
- Apartment-selected + Home-matching query shows the conflict note and
  type-consistent results.
- Offline modal open shows count-less button; retry via filter change.
- Nothing staged, committed, pushed, or deployed.
