# Smart Search Phase 2 Implementation Report — Query Parsing + Suggestions (2026-10-14, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
Backend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-backend` (unchanged this phase)
No schema/migration changes. No new endpoints. No AI/paid services.

## What changed and why

- `src/api/mappers.js` — new pure `parseSmartQuery(text)`: extracts BHK
  (`<digit> bhk`), price bounds (`under|below|max|up to <n> <unit>` →
  `max_price_paise`, `above|over|min|more than …` → `min_price_paise`;
  lakh/lac/crore/cr/k units), and conservative type words
  (villa/apartment/flat/commercial/plot → canonical). Drops stopwords
  (in/near/at/…). Remainder stays text for the multi-term matcher.
  Ambiguous input (`home`/`house`, unit-less numbers) keeps text search.
- `src/screens/buyer/SearchScreen.js` — parsed values feed `useListings`
  only where UI controls sit at defaults (explicit selections always win);
  a one-line `Smart match: …` note with clear control; no redesign.
- `src/components/SearchPropertyModal.js` — debounced (350ms, min 2 chars)
  live suggestions from existing `GET /buyer/listings?q&page_size=5`,
  request-ID guarded, real titles/localities only, tap-to-fill; failures and
  empty results show nothing extra (static chips remain).
- Ranking unchanged by design: deterministic backend order preserved;
  pagination/sort/filters untouched.

## Supported examples and limitations

- `2 BHK in Anna Nagar` → bedrooms=2 + `anna nagar`; `villa near ECR` →
  type + `ecr`; `apartment under 80 lakhs` → type + max price (remainder
  empty → no `q`); `Home ECR starter 1BHK` → BHK extracted, `home` kept.
- Not handled (documented): `4+ bhk`, unit-less prices, house/home as type,
  multi-bound ranges; suggestions need ≥2 chars; title-tap fills full title
  as the query.

## Tests executed and actual results

- `scripts/buyer-flow.test.mjs` Sec 7 (Q1–Q8): **pass**, including UI-wins
  precedence (by construction review), ambiguous passthrough, blank query,
  and no-new-endpoint guard.
- Backend scoped subset (`smart`, `construction_status`,
  `locality_substring`): **4 passed** (matcher unchanged this phase; confirms
  parsed params land on working filters).
- Full frontend: **8/8 suites pass**. `npm run build:web` succeeds.
  `git diff --check` clean in both repositories.

## Unresolved issues

- None blocking. Manual scenarios (the three example queries, ambiguous
  input, slow-network suggestions, pagination with parsed filters) still
  require device verification — stated, not claimed.
- Nothing staged, committed, pushed, or deployed.
