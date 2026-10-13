# Owner Add/Edit Property Workflow — Regression Testing Report

- Date: 2026-10-12 (IST)
- Repository: `Restamp-latest`, branch `integration/restamp-latest`, HEAD `cf66c84`
- Mode: local only. No commits, pushes, deploys, or Vercel/Render config changes.
- Backend connection: local frontend resolves `EXPO_PUBLIC_API_URL`, else defaults to the
  deployed Render backend. No live create/edit/publish calls were made in this phase
  (that would write production data); live end-to-end is explicitly NOT claimed.

## 1. Objective and scope

Verify the Owner Add/Edit Property workflow after the stale-form fix, for all four
listing purposes:

1. New (backend `BUY`)
2. Rent (backend `RENT`)
3. Resale (backend `RESALE`)
4. Lease (backend `LEASE`)

Coverage: fresh Add, purpose switching, create/publish validation and payloads,
edit/publish without duplication or stale leakage, Edit → Publish → Add New transition,
draft save/restore, navigation entry points, and reset-parameter safety.

## 2. Changes inspected

Existing uncommitted implementation (built on, not overwritten):

- Stale Add form fix:
  - `src/screens/owner/OwnerPropertiesScreen.js` — header `+` and EmptyState buttons
    navigate with `{ resetForm: Date.now(), initialStep: 1, editingProperty: null }`.
  - `src/screens/owner/OwnerAddPropertyScreen.js` — `editingListingId` memo includes
    `route?.params?.resetForm`; `resetForm` effect restores full defaults via
    `hydrateForm(normalizeDraftData({}))` with contact prefill parity, clears
    `editBaselineSnapshot`/`submitError`/preview/modal/upload/draft state;
    `exitToProperties()` clears its own edit params before navigating out.
- Add-tab follow-up: no blanket `tabPress` listener in `src/navigation/OwnerNavigator.js`
  (deliberate — it could not distinguish a finished edit from a paused mid-edit resume).
- Email-optional changes: `src/api/owner.js` (`OWNER_EMAIL_ERROR`, `isValidOwnerEmail`,
  `normalizeOwnerEmail`, blank → `null` in `buildPayload`); Step 1 validation allows
  blank/whitespace, still rejects malformed non-empty addresses.
- Files inspected this phase (read-only): `src/api/owner.js` (`buildPayload`,
  `buildUpdatePayload`, `toEditForm`, `resolveEditingListingId`, email/pincode helpers),
  `src/screens/owner/OwnerAddPropertyScreen.js` (mode detection, `FORM_DEFAULTS`,
  `normalizeDraftData`/`hydrateForm`/`applyEditForm`, `validateStep`, publish/update/draft
  handlers, entry/exit navigation), `src/screens/owner/OwnerPropertiesScreen.js`,
  `src/screens/owner/OwnerDashboardScreen.js`, `src/screens/owner/OwnerPublishSuccessScreen.js`,
  `src/navigation/OwnerNavigator.js`, `src/navigation/AppNavigator.js` (tabPress precedent),
  `src/context/OwnerContext.js` (`addProperty` list-only, edit path skips it),
  `src/api/client.js` (base URL + error mapping), `scripts/property-edit-mode.test.mjs`,
  `scripts/photo-retry-state.test.mjs`.
- Preserved: both existing reports
  (`report/property_add_edit_workflow_phase1_review.md`,
  `report/property_add_edit_workflow_phase2_implementation.md`) — untouched.

## 3. Test results by purpose

Method per purpose: automated pure-logic checks in `scripts/property-edit-mode.test.mjs`
(new Section 11, checks `P1–P8`); UI/step flows by code inspection; no live browser runs.

### New (`BUY`)
- Automated (`P1–P5` New): add tx `BUY` PASS, add period `TOTAL` PASS, add terms `null`
  PASS, update tx/terms PASS, hydration round-trip `lookingTo === "New"` PASS.
- Fresh-add leak check (`P8` New): `photos === undefined`, `images []`,
  `contact_email null` PASS.
- Step-4 sale pricing/terms UI, edit hydration of a `BUY` detail, draft flows:
  inspection only — NOT TESTED (automated), manual browser PENDING.

### Rent (`RENT`)
- Automated (`P1–P5` Rent): tx `RENT` PASS, period `MONTHLY` PASS, terms kept
  (deposit 100000 etc.) PASS, update keeps terms PASS, round-trip `"Rent"` PASS.
- `P8` Rent leak check PASS. Pre-existing `U1–U5`/`U10` Rent assertions still PASS.
- Step-4 deposit-required UI, edit flows: inspection only — NOT TESTED (automated),
  manual browser PENDING.

### Resale (`RESALE`)
- Automated (`P1–P5` Resale): tx `RESALE` PASS, period `TOTAL` PASS, terms `null`
  PASS (add + update), round-trip `"Resale"` PASS. Pre-existing `U7`/`U9` still PASS.
- `P8` Resale leak check PASS.
- Resale-specific UI (price labels, deposit not required, tenant/lock-in nulled in
  submit handler): inspection only — NOT TESTED (automated), manual browser PENDING.

### Lease (`LEASE`)
- Automated (`P1–P5` Lease): tx `LEASE` PASS, period `MONTHLY` PASS, terms kept PASS,
  update keeps terms PASS, round-trip `"Lease"` PASS. Pre-existing `U6` still PASS.
- `P8` Lease leak check PASS.
- Lease UI/validation: inspection only — NOT TESTED (automated), manual browser PENDING.

### Purpose switching (data layer, automated)
- `P6`: Rent form switched to Resale → terms `null`, title/locality/contact preserved PASS.
- `P7`: target `RENT` keeps terms + title PASS.
- Step-level UI switching (chips/price labels/required-field changes) and
  "does switching erase unrelated valid info": code inspection only — switching writes
  through the same `lookingTo` state read by all steps; no clearing logic other than
  terms omission was found — NOT TESTED (automated), manual browser PENDING.

## 4. Form reset and navigation

- Automated: `S1–S7` (reset params exit edit mode; plain Add has no identity; reset form
  carries no photos/email; hydrated blanks) PASS; `T1–T4` (exit-cleared params exit edit,
  freshness marker present, mid-edit still resolves so no blanket reset, drafts untouched)
  PASS. New `P8 ×4` leak checks PASS.
- Inspected: Dashboard `handleAddProperty`, PublishSuccess `handleAddAnother`, and both
  fixed PropertiesScreen entries send `{ resetForm, initialStep: 1, editingProperty: null }`;
  `exitToProperties()` clears its own edit params on all three edit exits (publish success,
  discard-edit, clean back); reset effect restores full defaults; edit/draft branches are
  guarded by `!resetForm`; tab bar supplies no params (hence the exit-clearing design).
- Bare Add-tab after publish/discard, Add-after-Create tab path, focus/freeze remount
  semantics: reasoning verified against `OwnerNavigator` (`detachInactiveScreens`,
  `freezeOnBlur`) — NOT TESTED (automated or browser), manual browser PENDING.

## 5. Validation and payload checks

- Automated: Chennai pincode `R0–R7` PASS; email `M0–M11` (blank/whitespace → null, valid
  kept/trimmed, invalid rejected at helper + `buildPayload`/`buildUpdatePayload`) PASS;
  purpose matrix `P1–P8` PASS (Section 3).
- Inspected only: Step 1 phone (≥8 digits, unchanged) + optional email gate; Step 2
  city/district/locality + pincode gate; Step 3 area/floors; Step 4 purpose-dependent
  messages (resale/expected/rent) and deposit-required-except-sale + `availableFrom`;
  Step 5 photo ≥1 + description ≥10; amenities multi-select passthrough. Photos: remote
  URLs ride in payload order (cover index 0), local device URIs excluded until uploaded.
  NOT TESTED (automated beyond helpers), manual browser PENDING.

## 6. Draft and edit regression

- Automated: `F1–F13` hydration (incl. nulls→blanks, photos w/ media ids + cover) PASS;
  `C1` blank contact → null PASS; `P2` photo-id removal sync PASS; `H1–H3` exit-action
  table PASS.
- Inspected only: server-draft save (`handleSaveDraftPress` POST then PUT, 404 Kre-create
  fallback), restore (`hydrateFromServerDraft`, `normalizeDraftData` merge), draft-continue
  entries, edit loads via `fetchOwnerListing` → `toEditForm` → `applyEditForm` (display
  object never trusted), PATCH-in-place (no duplicate via `updateOwnerListing`, never
  `createOwnerListing` on edit path), photo preservation/removal via end-state
  reconciliation, unfinished-edit resume (params retained mid-edit by design).
  NOT TESTED (automated or live), manual browser PENDING. No live edit/publish was
  performed (would mutate listings).

## 7. Automated test results

Commands executed (2026-10-12, `node v22.23.2`):

- `node --test scripts/photo-retry-state.test.mjs scripts/property-edit-mode.test.mjs`
  → **2 pass, 0 fail, 0 cancelled/skipped** (`# tests 2 # pass 2 # fail 0`), ending
  `all edit-mode tests passed`. Includes pre-existing E/U/F/H/P/C/R/M/S/T suites plus
  new `P1–P8 ×4 purposes`, `P6–P7` switching. Full output tail lists every `ok - …` line;
  zero `FAIL` lines.
- No other automated suites were run (_detached backend suites would need DB provisioning
  and are out of frontend scope; no new framework introduced).

## 8. Build and Git checks

- `npm run build:web` (`expo export -p web`) → success, `Exported: dist` (ignored, uncommitted).
- `git diff --check` → clean (exit 0).
- Final `git status --short --branch`:
  `## integration/restamp-latest...ayati/main`,
  `M scripts/property-edit-mode.test.mjs`, `M src/api/owner.js`,
  `M src/screens/owner/OwnerAddPropertyScreen.js`, `M src/screens/owner/OwnerPropertiesScreen.js`,
  `?? report/property_add_edit_workflow_phase1_review.md`,
  `?? report/property_add_edit_workflow_phase2_implementation.md`,
  plus this new `?? report/property_add_edit_workflow_regression.md`.
- Backend untouched this phase. No commits, pushes, deploys, or Vercel/Render changes.

## 9. Manual browser testing

Explicitly: **no live, browser, simulator, or deployed testing was performed** in this
phase — all PASS statuses above are automated pure-logic results. Pending manual
verification (per purpose New/Rent/Resale/Lease):

1. Fresh Add from each entry (Dashboard, Properties header, EmptyState, PublishSuccess
   “Add Another”, bare Add tab): clean defaults at step 1, create mode.
2. Purpose switching mid-form: dependent labels/requirements/terms update, unrelated
   inputs preserved.
3. Step-by-step validation messages, pincode boundaries, optional-email blank vs invalid,
   photo pick/remove, amenities.
4. Create → Publish → success screen → Add New (button + tab): fresh form.
5. Edit → change fields/photos → Publish → no duplicate → Add New: fresh form.
6. Draft save → leave → continue (button + tab): exact restore; edit resume via tab
   without save: preserved (no wipe).
7. Offline/submission-failure paths keep entered data with correct error text.

## 10. Bugs found and fixes

- This regression phase found **no new app-logic bugs**: the four-purpose matrix passes
  without modification (tx/period/terms mapping, round-trip, switching preservation, and
  leak-free fresh payloads are all correct as implemented).
- Only change applied: **test-only addition** — Section 11 (`P1–P8`) in
  `scripts/property-edit-mode.test.mjs`. Rationale: make the per-purpose contract explicit
  so future edits to `buildPayload`/`buildUpdatePayload`/`toEditForm` cannot silently
  regress one purpose. No app, backend, schema, auth, or unrelated-UI changes.
- Prior fixes relied upon (not re-applied): stale-form reset (PropertiesScreen params,
  memo dep, full `hydrateForm(normalizeDraftData({}))` restore, `exitToProperties`
  self-clearing) and email-optional behavior.
- Ambiguity noted, not changed: fresh-mount demo prefills (e.g. sample address/amenities)
  vs `FORM_DEFAULTS` blanks used by reset — both are leak-free; unifying them is a product
  decision, left untouched pending approval.

## 11. Limitations and remaining risks

- Component lifecycle (effects, focus/freeze remount, tab merges) is reasoned from code,
  not executed — React Navigation timing (e.g. `setParams`-then-navigate batching,
  frozen-effect deferral) needs on-device confirmation.
- Bare-tab flows, draft resume via tab, mid-edit resume, and all submit/upload-failure
  banners need manual passes.
- Backend behavior (422/500 mapping, PATCH reconciliation, photo upload/delete) was not
  exercised here; backend suites are separate.
- Local frontend without `EXPO_PUBLIC_API_URL` targets production Render — live testing
  requires explicit approval plus a disposable backend/data plan.

## 12. Final summary and next steps

Automated data-layer regression is green across New/Rent/Resale/Lease (26 new purpose
checks, full suites 2/2 pass, web build succeeds, diff clean), with zero app-code changes
in this phase. What remains is manual on-device verification of the Section 9 scenarios
plus a backend-connected (non-production) end-to-end pass, after which the staged
frontend changes can be reviewed for commit. All work stays local; reports preserved;
nothing committed, pushed, or deployed.
