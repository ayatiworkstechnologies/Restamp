# Property Add/Edit Workflow — Phase 2 Implementation Report

## 1. Date

2026-10-12 (UTC).

## 2. Scope

Implemented the Phase 1 review findings
(`report/property_add_edit_workflow_phase1_review.md`, preserved untouched):
explicit Edit mode, in-place PATCH update, photo removal/reorder/cover,
Rent/Lease/Resale terms, back-button split, Edit Save-Draft-exit, blank
contact defaults. Starting commits verified before work: frontend `c257e46`,
backend `b98c8e5` (both trees clean, stashes preserved, no operations in
progress). No commits, pushes, deploys, production changes, UI redesign, or
unrelated refactoring. Phase 1 report not modified; this is a separate file.

## 3. Files changed and purpose

### Backend (`Restamp-backend`, base `b98c8e5`)

- `app/schemas.py`
  - `OwnerListingUpdate(OwnerListingCreate)`: all-optional subclass for PATCH;
    `validate_tx/prop/period` gained `None` pass-through guards (dead for
    Create — required-field type coercion rejects null first — active for
    Update). Inherits every Create validator, so PATCH validation is
    identical to POST validation.
  - `ListingPhotoOut` += `id`, `order_index`, `is_cover`: stable media ids
    are the Edit photo-tracking contract (frontend must not use URLs alone).
  - `rent_terms` comment updated (RENT+LEASE persisted; RESALE/BUY rejected).
- `app/services/owner_listings.py`
  - `TERMED_TX_TYPES = {"RENT","LEASE"}` + `_has_terms()` + `_write_rent_terms_row()`
    (partial-key merge upsert; explicit null clears; `0`/`False` preserved).
  - Create gate changed: non-empty terms on RESALE/BUY now raise `ValueError`
    (explicit 422) instead of being silently dropped; LEASE persists terms
    (previously silently dropped).
  - `update_owner_listing(db, owner_id, listing_id, updates)`: in-place PATCH.
    Exclude_unset semantics (only present keys written); explicit null clears
    nullable columns, 422 on non-nullable nulls; location re-resolved from
    merged values (stored pincode always equals submitted-or-existing);
    merged floor/total check; terms upsert/delete by effective tx type;
    amenities diffed per kind (idempotent, no duplicates); media reconciled
    to ordered end-state (matched by URL, cover = index 0, removed rows'
    `public_id`s returned for post-commit cloud cleanup). Returns
    `(None, [])` for foreign listings (router → 404). Verification/listing
    status and `submitted_at` never touched.
  - `delete_listing_photo()`: owner-scoped single removal + sibling
    renumber (cover invariant); returns `(found, public_id)`.
  - `add_listing_photo()` += optional `public_id` (persisted for cleanup).
  - `_media_map()` now returns `{id,url,category,order_index,is_cover}`.
  - `_reconcile_media()` helper; `_location_of()` helper.
  - Routes use savepoints (`begin_nested`), NOT full rollback: the shared
    pytest session reuses one transaction per test, so a full rollback wipes
    the test's own setup rows (observed: 403 cascades). Savepoints roll back
    only the request's work; identical behavior on request-scoped sessions.
- `app/routers/owner.py`
  - `PATCH /owner/listings/{listing_id}` → 200 `OwnerListingOut` (404 foreign/
    missing, 422 validation, never creates). Post-commit best-effort
    Cloudinary destroy for implicitly removed gallery rows (failures never
    fail the request — DB is source of truth).
  - `DELETE /owner/listings/{id}/photos/{media_id}` → 204 (404 matrix same);
    DB delete+commit first, cloud destroy best-effort after.
  - Upload route passes `public_id` through to `add_listing_photo`.
- `app/models/properties.py`: `property_media.public_id` nullable column
  (upload-path assets recoverable for delete; legacy rows NULL → skip).
- `alembic/versions/e6f7a8b9c0d1_media_public_id.py` (new): additive-only
  migration (add nullable column + downgrade). Applied to local dev DB only
  (`restamp_dev` d5e6f7a8b9c0 → e6f7a8b9c0d1, verified via
  `SHOW COLUMNS`). No production migration run.
- `tests/test_owner_listings.py`: 2 assertions updated to the extended photo
  shape (id/order_index/is_cover); behavior assertions unchanged.
- `tests/test_phase4.py`, `tests/test_phase5_integration.py`: alembic-head
  pins advanced d5e6f7a8b9c0 → e6f7a8b9c0d1 (intended migration); counts
  (33 tables / 49 FKs) unchanged and still passing.
- `tests/test_owner_update.py` (new, 10 tests): PATCH same-id/no-duplicate,
  partial/null/zero/false semantics, invalid-patch atomicity, amenity
  diff/idempotency, LEASE persist + RESALE reject + RENT→RESALE terms drop,
  location/pincode resolution, media end-state/reorder/clear, photo DELETE
  (renumber/cover/cloud-destroy/cloud-failure), full 401/403/404 matrix.

### Frontend (`Restamp-latest`, base `c257e46`)

- `src/api/owner.js` (+221 lines, logic only)
  - `updateOwnerListing()` (PATCH), `deleteListingPhoto()` (DELETE).
  - `resolveEditingListingId()` (listing_id/listingId/id incl. string ids;
    draft-`/own-prop-`/non-positive → null), `headerExitAction()` (pure
    header decision table), `buildUpdatePayload()` (buildPayload +
    RESALE/BUY terms→null), `toEditForm()` (full OwnerListingOut→form mapper
    with documented approximations: commercial/HOUSE/AGRI collapse, chip
    inference, available_from null→"Immediately" (validation requires it),
    duplex null→"No" (create parity), parking null→0, rest null→"").
  - `buildPayload()` terms now RENT/LEASE-only (null otherwise) — required:
    without this, Add Resale/BUY would 422 after the backend fix. Mirrors the
    existing sale-type nulling of tenant/lock-in/agreement.
- `src/screens/owner/OwnerAddPropertyScreen.js` (+374/−50, behavior only;
  diff scanned: zero style/layout/label/icon/element changes — only style
  *conditions* and handler wiring)
  - `editingListingId`/`isEditing` (memo on route params) + `useAuth()`.
  - Contact defaults: `(ownerProfile?.phone || authUser?.phone || "")`,
    email `(ownerProfile?.email || "")` — no demo literals remain as values
    (only an unrelated `placeholder=` hint string, left untouched per UI
    freeze).
  - Edit hydrate replaced partial block with `fetchOwnerListing` →
    `toEditForm` → `applyEditForm` (all 45 states) + ordered
    `editSnapshotOf` baseline for `isEditDirty`; fetch failure or
    id-less edit entry → Alert + goBack (never silent Add fallback, never a
    duplicate).
  - `handleHeaderBack()` (top-left exits whole form any step: dirty→existing
    confirm modal, clean Add→Dashboard, clean Edit→Properties);
    bottom `handleBack()` untouched (steps back).
  - Save Draft in Edit exits via header behavior (zero draft API calls);
    button chrome/label/disabled logic reused with edit-dirty.
  - Exit modal mode-aware: Add unchanged; Edit Save & Exit runs
    `handlePublishProperty` (PATCH path), Discard exits to Properties
    (server listing intact).
  - Submit: shared pincode+steps validation, subscription gate skipped for
    Edit (no new quota), then `handleUpdateProperty` branch placed BEFORE any
    create path — `createOwnerListing` unreachable in Edit; failures stay on
    Review with "Could Not Save Changes" mapping; success refetches detail
    and exits to Properties with NO `addProperty`, NO draft delete, NO
    subscription bump. Upload retry reuses id-keyed queues; post-upload
    order/cover PATCH reconciles final gallery.
- `src/context/OwnerContext.js`: profile `phone`/`email` defaults → `""`
  (name/avatar kept; `setOwnerProfile` has no callers, so no flow regresses;
  Profile screen renders blanks instead of a fake identity — no code change
  there).
- `scripts/property-edit-mode.test.mjs` (new, 40 checks, plain node): id
  resolution, update payloads per tx type, sale-terms omission, full
  toEditForm incl. LEASE/RESALE/BUY/commercial/nulls, exit-action table,
  photo-id tracking, blank-contact→null.

## 4. API endpoints added or modified

- Added `PATCH /owner/listings/{listing_id}` (partial, owner-scoped).
- Added `DELETE /owner/listings/{listing_id}/photos/{media_id}` (204).
- Unchanged: POST/GET listings, POST photos (plus `public_id` persistence),
  all draft routes, buyer/auth/user routes. No route removed.

## 5. Field-by-field persistence mapping (Edit)

PATCH accepts the full Create field set, all optional. Scalars overwrite
when present (null clears nullable, 422 on non-nullable null); omitted keys
keep stored values; `0`/`False` preserved (key-presence checks throughout).
Location resolves via merged parts (submitted pincode always stored).
Terms merge per supplied sub-key for RENT/LEASE; RESALE/BUY non-empty terms
→ 422; type moves away from RENT/LEASE drop stale rows. Amenities replace per
supplied kind (diffed). Photos reconcile to ordered end-state (cover idx 0).
Response (`OwnerListingOut` + ids) feeds `toEditForm`, restoring all 7 steps
per the mapper table in `owner.js` + §"approved approximations" above.

## 6. Duplicate prevention

- No update path inserts `property_listings`/`physical_properties` rows
  (verified by row-count assertions + live E2E single-row check).
- Frontend Edit never calls `createOwnerListing` (branch order guarantees;
  covered by "update never create" node test + code path review).
- Amenity/media reconciles are idempotent (retry tests assert stable counts).
- Failed updates commit nothing (savepoint rollback; invalid-patch test
  re-reads unchanged values). No create-fallback anywhere.

## 7. Rent, Lease, Resale support

- RENT: unchanged Add; Edit round-trips all fields incl. full terms.
- LEASE: create now persists terms (was silently dropped); Edit merges
  partial terms; price MONTHLY; verified by pytest + live E2E.
- RESALE/BUY: create/update with null/absent terms succeed; non-empty terms
  → explicit 422 (no silent drop); RENT→RESALE type change deletes the
  inapplicable terms row. Frontend omits terms for these types in both modes.
- No new business rules; no schema gap found for required fields — NO
  migration beyond `public_id` (photo delete), which is unrelated to
  purpose support.

## 8. Photo removal/replacement/cover/order behaviour

- Existing photos carry stable `media_id`s (`remote-<id>`); locals use
  `local-` ids; `isLocalPhotoUri` separates them (unchanged helpers).
- Keep: untouched remotes ride the PATCH end-state unchanged.
- Remove: omitted from end-state (implicit, post-commit cloud best-effort)
  or explicit DELETE (immediate, renumbered, cloud best-effort).
- Replace: remove + upload (new server URL takes the slot in final order).
- Upload: post-PATCH, cover-first, id-keyed retry without re-POSTing the
  listing; success swaps local URIs for server URLs + media ids.
- Cover/order: end-state array order = `order_index` 0..n-1; cover = index 0
  enforced after every mutation (reconcile, delete, upload reorder PATCH).
- Failures never show success (stay on Review + Alert + retry counts).
- Limitation (documented): pre-`public_id` rows and implicitly removed rows
  whose asset destroy fails leave Cloudinary orphans; DB is source of truth.

## 9. Pincode source and validation results — BLOCKED (missing list)

Exhaustive search (both repos' `src/`, `report/`, tests, seeds, AGENTS.md,
workspace root) found NO user-supplied Chennai pincode list — only `600040`
placeholders, Chennai sample data, and the Phase 1 note that no allowlist
exists. Per the §9 stopping condition: **the allowlist portion was STOPPED;
no range (e.g. 600001–600130) or `600*` prefix was invented; all existing
generic `/^\d{6}$/` validation is byte-untouched** (verified via diff grep:
only hydration plumbing references pincode). Action required: user must
supply the exact list; tracked enforcement points are ready (frontend
validateStep/pre-submit/buildPayload + backend schema `pincode` field).

## 10. Back button and Save Draft behaviour

- Top-left: exits whole form any step, both modes (`handleHeaderBack` +
  tested `headerExitAction` table); dirty → existing confirm modal.
- Bottom: unchanged one-step decrement (`handleBack` untouched).
- Save Draft: Add byte-identical behavior; Edit exits with zero draft calls
  (header path + mode-aware modal). Button chrome/labels/position unchanged.

## 11. Tests executed and actual results

- Backend (`.venv/bin/python -m pytest`, local `restamp_dev`):
  - `test_owner_update.py` (new): **14 passed** (10 Edit/photo/terms/authz +
    4 fixes-addendum: single-null clear, null-only no-op, empty-object clear,
    service-boundary pincode).
  - Owner scope + pins (`test_owner_listings|photos|drafts|update` +
    2 regression pins): **70 passed**.
  - Full suite: **162 passed, 14 failed** — all 14 proven PRE-EXISTING
    state pollution, not regressions: the identical 14 fail on the pristine
    `b98c8e5` baseline with my diff stashed (`git stash -u` → run → pop,
    work restored byte-identical). Causes: duplicate-key seed collisions
    (`Duplicate entry '600001' postcodes.pincode`), COUNT assertions vs
    accumulated rows (`assert 2 == 0` enquiries), across buyer/phase tests
    that seed via direct SQL and never touch changed code paths.
  - No test pass claimed for the 14; they fail with and without this change.
- Frontend (plain node, no deps):
  - `scripts/property-edit-mode.test.mjs` (new): **40/40 passed**.
  - `scripts/photo-retry-state.test.mjs` (existing): **passed**.
  - `npm run build:web` (`expo export -p web`): **SUCCESS, `Exported: dist`**
    (validates all JSX/JS incl. edited screen; `dist/` is gitignored).
- Live local E2E (uvicorn :8123 + OTP-debug, dev DB only, scoped cleanup):
  real `buildUpdatePayload` output (chip labels "1 Year", "25 Sep 2026")
  → PATCH accepted/persisted; reorder+recategorize; amenity replace;
  status preserved; single listing/media rows; cross-owner 404; anon 401;
  resale+terms 422; lease terms persist; photo DELETE 204 + cover renumber;
  **17/17 checks PASSED**, rows cleaned up afterwards.

## 12. Build results

- `npm run build:web`: SUCCESS. No backend build step (interpreted; pytest
  collection green).

## 13. Migration required and why

- `e6f7a8b9c0d1_media_public_id.py`: adds nullable
  `property_media.public_id` — required so photo DELETE can destroy the
  Cloudinary asset post-commit (§6.7). Additive-only, downgrade included,
  applied to local dev DB for testing. Deployment: run `alembic upgrade
  head` on staging/prod during release; no data backfill (old rows NULL →
  cloud cleanup skipped, DB delete unaffected). No other migration needed:
  every form field already has a column/M2M/JSON home.

## 14. Incomplete work, limitations, remaining risks

1. **Chennai rule implemented** — superseded by §16 (range 600001–600118
   shipped on both sides) and §17 (service-boundary enforcement).
2. Validation-parity edge: legacy RENT rows with NULL deposit/area/floors/
   description cannot pass Add-parity step validation until the owner fills
   them (documented; prevents silent bad data, may mildly annoy).
3. Postcode resolver locality-fallback: an in-range but unseen pincode
   paired with an already-stored locality resolves to that locality's
   previously stored postcode — i.e. a different pincode than submitted
   (see §17; locality↔pincode consistency awaits a product decision in the
   future area-lookup phase — no redesign here).
4. Commercial subtype / HOUSE / AGRI collapse on round-trip (pre-existing
   forward-map loss); BHK "5+»-style chips inferred.
5. Multi-call Edit save (PATCH → DELETEs → uploads → order PATCH) is
   per-call atomic, not single-transaction; failures surface errors and stay
   on Review with retry-safe queues.
6. Cloud orphans possible when asset destroy fails post-commit (logged
   best-effort); DB stays consistent.
7. Dev DB `restamp_dev` accumulates committed test rows across runs
   (pre-existing fixture design); the 14 failures are its symptom. A fresh
   DB or per-test savepoint isolation would fix the suite (out of scope).

## 15. Final Git status and diff summary

- Frontend (`integration/restamp-latest`, upstream `ayati/main` in sync):
  `M src/api/owner.js`, `M src/context/OwnerContext.js`,
  `M src/screens/owner/OwnerAddPropertyScreen.js`
  (+609/−71 across the three), `?? scripts/property-edit-mode.test.mjs`,
  `?? report/property_add_edit_workflow_phase1_review.md` (Phase 1, preserved).
  No UI/layout/label/element changes (diff scanned).
- Backend (`main`, upstream `origin/main` in sync):
  `M app/schemas.py`, `M app/services/owner_listings.py`,
  `M app/routers/owner.py`, `M app/models/properties.py`,
  `M tests/test_owner_listings.py`, `M tests/test_phase4.py`,
  `M tests/test_phase5_integration.py`,
  `?? alembic/versions/e6f7a8b9c0d1_media_public_id.py`,
  `?? tests/test_owner_update.py`.
- No commit/push/deploy performed (per stopping conditions). Pre-existing
  frontend stashes untouched. Temp E2E scripts live in `/tmp` only (not in
  repos). Local dev DB migrated (documented above); production untouched.

**Stop. Awaiting explicit approval before any commit, push, deployment, or
production migration. Open item for approval: supply the exact Chennai
pincode list to unblock §9.**

---

## 16. Addendum (2026-10-12, UTC): Chennai pincode range rule 600001–600118

Supersedes the §9/§14.1 blocker: the business rule is now fixed as the
inclusive numeric range `600001–600118` (no allowlist, `600089` included).
Implemented centrally on both sides; no area-name lookup (deferred).

### 16.1 Location inventory (repo-wide search)

Backend `app/`: pincode strings enter ONLY via `OwnerListingCreate.pincode`
(`schemas.py:376`) and `OwnerListingUpdate.pincode (`schemas.py:569`) —
both validated. Reads (`ListingCard:102`, `OwnerListingOut:617`), the
location-chain resolver, buyer/contact/enquiry/auth services, broker
postcode grants (postcode_id FKs, no string input), drafts (`form_data`
opaque JSON, partial drafts allowed) take no new pincode input — unchanged.
No profile/registration/broker/admin pincode fields exist anywhere.
Frontend `src/`: pincode enters ONLY via the owner seven-step form
(`OwnerAddPropertyScreen.js` step-2 + Review inputs) submitted through
`buildPayload`/`buildUpdatePayload` (`api/owner.js`). No other screen
collects a pincode (verified by repo-wide grep) — so Add and Edit plus the
shared builder/gates cover every entry point; direct API calls hit backend
schema validation.

### 16.2 Changes

- Backend `app/schemas.py`: `CHENNAI_PINCODE_MIN/MAX` (600001/600118),
  `CHENNAI_PINCODE_PATTERN`, `CHENNAI_PINCODE_ERROR`
  ("Please enter a valid pincode between 600001 and 600118."),
  `normalize_chennai_pincode()` (None pass-through; trim; empty→422;
  non-six-digit→422; out-of-range→422; strings preserved, never
  int-converted). Wired as `mode="before"` `_pincode` validator on Create
  (inherited by Update). Empty/whitespace rejected wherever mandatory;
  optional Update fields keep None semantics; no optional field made
  mandatory; no schema change; old saved pincodes untouched.
- Frontend `src/api/owner.js`: same constants/message +
  `isValidChennaiPincode()` / `requireChennaiPincode()`; `buildPayload`
  (shared Add+Edit submit path) throws the shared message for
  missing/invalid/out-of-range values.
- Frontend `OwnerAddPropertyScreen.js`: step-2 `validateStep`, pre-submit
  gate, and payload-error mapping all call the shared helper (Add and Edit
  share all three); Alert titles and field labels/layouts unchanged, bodies
  and inline errors now show the shared message; helper text ×2 updated to
  the range (labels untouched).
- Tests: backend `test_normalize_chennai_pincode_helper` (constants, trim,
  None, full reject table incl. message match) +
  `test_chennai_pincode_range_boundaries` (accept 600001/600089/600118/600040
  via API; reject 600000/600119/600500/560038 via API; PATCH accept+reject
  parity; rejected PATCH changes nothing) + range rows in both validation
  matrices; out-of-range API fixtures refreshed to fresh in-range codes
  (600115/600116/600117/600110, unique localities for resolver stability).
  (The former service-level rollback fixture at 600280 was moved to 600112
  in §17 once the service boundary started enforcing the range.)
  Frontend `property-edit-mode.test.mjs` += R0–R7 (constants, accept/reject
  table incl. short/long/alpha/blank/null, trim, throw message, Add+Update
  payload parity).
- `/tmp` E2E scripts moved to in-range pincode 600111 (not in repos).

### 16.3 Verification

- Backend owner scope (`test_owner_listings|update|photos|drafts` + 2
  regression pins): **66 passed** (was 64; +helper +boundary tests).
- Full backend suite: 14 failures unchanged — all proven pre-existing
  dev-DB state pollution (identical on stashed pristine baseline; no new
  failure introduced by the range rule).
- Frontend node: edit-mode suite incl. R0–R7 **all passed**; existing
  photo-retry suite **passed**; `npm run build:web` → **`Exported: dist`**.
- Live local E2E re-run under the range rule: **17/17 PASSED** (incl.
  600111 create→PATCH→DELETE round-trip + scoped cleanup).
- `git diff --check`: clean in both repos. No commit/push/deploy; no
  production data touched; no server left running; stashes untouched.
- Remaining limitation: postcode resolver locality-fallback (M1) unchanged —
  tests pair unique localities with pincodes; a future area-name lookup
  phase (per instructions, not this one) should revisit resolution.

---

## 17. Addendum (2026-10-12, UTC): approved review fixes (M1/M2/M3, L1–L3)

Implements the final-review findings; no UI, schema, migration, or
business-rule changes beyond the fixes.

### M1 — partial-null rent terms (`owner_listings.py` terms block)

A `rent_terms` object whose supplied sub-keys are all null (e.g.
`{"security_deposit_rupees": null}`) previously fell through every branch
and left the row untouched, contradicting the explicit-null-clears
contract. Now any term object with ≥1 supplied sub-key merges via
`_write_rent_terms_row` when a row exists on a RENT/LEASE listing (null
clears that column, omitted sub-keys keep stored values, `0`/`False`
preserved by key-presence checks); a null-only object with no existing row
is a no-op; `{}`/`null`/type-move still delete the row; non-empty terms on
RESALE/BUY still 422. Non-dict `rent_terms` is a 422 instead of a 500.
All branches stay inside the route savepoint (atomic).
Tests: `test_patch_single_null_term_clears_column_keeps_rest`,
`test_patch_null_only_terms_without_row_is_noop`,
`test_patch_empty_terms_object_clears_row` (all in `test_owner_update.py`).

### M2 — service-boundary pincode validation (`owner_listings.py`)

`normalize_chennai_pincode` (from `app/schemas.py`, no duplication, no
circular import — verified) is now enforced inside the service: create
validates first, before any mutation (missing → same range message);
update validates a supplied non-null pincode and stores back the trimmed
value (omitted preserves stored; explicit null stays 422 via the existing
non-nullable guard). API behavior unchanged (schema validates first with
the identical message); failures precede all flushes (atomic).
Tests: rollback fixture moved `600280`→`600112` (it targets amenity
rollback, not pincodes — not weakened), plus
`test_service_boundary_rejects_out_of_range_pincode` proving direct
`create_owner_listing`/`update_owner_listing` calls reject
`600000/600119/600500/560038/abcdef/""` with the shared message, commit
nothing, and still accept/trim an in-range update.

### M3 — locality-fallback comment (docs only, no resolution redesign)

The `update_owner_listing` location comment claiming the stored pincode
"always equals the submitted-or-existing pincode" was corrected to
describe the exact-pincode-first → locality-fallback order and its
consequence (a previously stored postcode with a different pincode can
win). Recorded here and in-code: locality↔pincode consistency needs a
product decision in the future area-lookup phase.

### L1–L3 cleanups

- `area_unit` excluded from the raw-field loop so the canonicalized
  (`lower()`) value survives (single-field updates still handled by the
  dedicated area block).
- Redundant second `description` assignment removed (covered by the
  `_LISTING_UPDATE_FIELDS` loop).
- Unused `fetchOwnerListings` import removed from
  `OwnerAddPropertyScreen.js` (verified zero uses). No UI/layout/label/
  navigation change in any cleanup.

### §17 verification

- Focused backend (owner listings/update/photos/drafts + 2 pins):
  **70 passed** (66 + 4 new).
- Full backend suite: **162 passed, 14 failed** — failing set identical to
  the stashed-baseline pre-existing 14 (buyer/phase seed-count and
  duplicate-key state issues); zero new failures.
- Frontend node suites: edit-mode (incl. R0–R7) and photo-retry **passed**;
  `npm run build:web` → **`Exported: dist`**; `git diff --check` clean in
  both repos.
- No commit/push/deploy; no production migration/data change; stash state
  untouched (2 pre-existing frontend stashes preserved).
