# Smart Search Implementation Report — Multi-Term Matching (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
Backend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-backend`
No schema/migration changes. No new endpoints. No AI/paid services.

## Previous behavior and root cause

`q` was a single `%…%` pattern OR-ed across title/description/locality, so
`villa anna nagar` only matched when those words appeared contiguously in one
field; `%`/`_` in input acted as LIKE wildcards; bedrooms/property-type/
address/city were not text-searchable at all.

## Implemented matching rules (`app/services/listings.py`)

- Trim + split on whitespace, cap 5 terms; blank `q` adds no filter.
- AND across terms, OR across fields: title, description, locality,
  address line, city (all already joined; case-insensitive `ilike`).
- `escape_like_term` escapes `\`, `%`, `_` with explicit `ESCAPE '\\'`;
  all expressions parameterized (SQLAlchemy bound params, no raw SQL).
- Non-text filters, construction-status, sorts (deterministic id tiebreaks),
  and pagination untouched; joins are many-to-one so no duplicate rows.
- Deliberately excluded: property-type/BHK text rules (enum/numeric fields;
  covered by existing exact filters).

## Files changed

- Backend: `app/services/listings.py` (query branch + `escape_like_term`),
  `tests/test_buyer_6b1.py` (`_seed_smart` helper,
  `test_smart_multi_term_search`, `test_smart_search_specials_and_blank_query`).
- Frontend: `src/api/mappers.js` (`q` trim + whitespace collapse),
  `src/components/SearchPropertyModal.js` (placeholder copy only),
  `scripts/buyer-flow.test.mjs` (M4 whitespace-collapse assertion).

## Tests actually run and results

- New backend tests: **pass** (mid-word, case-insensitive, locality,
  cross-field multi-term, all-terms-required, whitespace, literal `%`/`_`,
  blank-`q` parity, zero-match empty, filter/sort/pagination composition).
  Scoped to unique tokens — immune to shared-DB rows.
- Older absolute-count assertions in `test_buyer_6b1.py` still fail on
  pre-existing shared-DB pollution (documented in prior phases; rows
  untouched, assertions not weakened).
- Full frontend: **8/8 suites pass**. `npm run build:web` succeeds.
  `git diff --check` clean in both repositories.

## Known limitations and performance

- `1bhk`-style BHK text and property-type words match only when literally
  present in text fields; numeric BHK/type filters remain the accurate path.
- Leading-`%` LIKEs cannot use indexes (fine at current scale; single query,
  no N+1). MySQL `ESCAPE '\\'` relies on default backslash handling.
- Nothing staged, committed, pushed, or deployed.
