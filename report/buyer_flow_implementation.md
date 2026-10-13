# Buyer Flow Implementation Report — Home Navigation, Accurate Search, Explore Prep (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
Backend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-backend`

## P1 — Home category navigation (bug fixed)

- **Cause:** the category pill `onPress` (`HomeScreen.js`) called
  `navigation.navigate("Search", …)` after `setSelectedType`, and
  `selectedType` filtered nothing on Home.
- **Fix:** taps set state only (new `All` pill, default `all`);
  `filterProperties` filters all three Home sliders by category with
  missing-type-kept semantics. No Search navigation, tab change, or scroll
  jump; layout/styles/header/nav unchanged; bottom Search tab flow intact.

## P2 — Accurate search

- Removed misleading Rating sort (no backend rating field); fixed Load-more
  gating to loaded-vs-total counts; added exact-match `construction_status`
  filter to `GET /buyer/listings` (existing column, closed vocab, 422
  otherwise) wired through `buildListingParams` + `SearchScreen`.
- Verified-correct, unchanged: deal/type/BHK/budget/q/sort/pagination,
  page reset on filter change, deterministic ordering, honest states.
- Unsupported, documented only: Pool/Townhouse pseudo-category,
  project-name search beyond text fields, rating sort.

## P3 — Explore-by-Location proposal (page on hold)

- Use existing `GET /buyer/listings?locality=<name>` (case-insensitive
  substring on `Locality.name`); zero matches → honest empty. No new
  endpoint, schema change, page build, or Sample-label removal.

## Files changed

- Frontend: `HomeScreen.js`, `SearchScreen.js`, `src/api/mappers.js`,
  `scripts/buyer-flow.test.mjs` (new).
- Backend: `app/routers/buyer.py`, `app/services/listings.py`,
  `tests/test_buyer_6b1.py` (+2 tests).

## Verification

- New `buyer-flow.test.mjs`: 13/13 pass. New backend tests: 2/2 pass.
- Full frontend: 7/7 suites pass. `npm run build:web` succeeds.
  `git diff --check` clean (both repos).
- Older absolute-count backend assertions still fail on pre-existing
  shared-DB pollution (documented; rows untouched).
- Nothing staged, committed, pushed, or deployed. P0–P4 work and all prior
  reports preserved; chat/visits/negotiation/broker out of scope.
