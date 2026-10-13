# Stale Add Property Tab Fix — Implementation Report (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
No backend, database, schema, migration, authentication, or OTP changes.

## Root cause

Add route params and in-memory form state persist across bottom-tab visits.
Only explicit `freshAddParams()` navigations reset them (Dashboard, My
Properties header/EmptyState, PublishSuccess "Add Another", and the
`exitToProperties` edit-exit clearer). `finishPublishSuccess` navigated to
`OwnerPublishSuccess` without clearing, so a later bare Add-tab press (which
supplies no params) resurrected the just-published edit as a stale Edit mode
(or stale form values). A blanket tab-press reset was deliberately rejected:
it cannot distinguish a finished edit from one paused mid-way.

## Exact fix (one line + comment)

`src/screens/owner/OwnerAddPropertyScreen.js`, in `finishPublishSuccess`,
before `navigation.navigate("OwnerPublishSuccess", …)`:

```js
navigation.setParams(freshAddParams());
```

`freshAddParams` was already imported. Same mechanism as the existing
`exitToProperties` clearing. The reset effect treats it as a fresh form;
paused mid-edit progress is untouched (this runs only on publish success).

## Files changed

- `src/screens/owner/OwnerAddPropertyScreen.js` (fix + comment).
- `scripts/property-edit-mode.test.mjs` (Sec 13 guard: params cleared before
  success navigation).
- `report/add_property_stale_add_tab_fix.md` (this file); short Sec 17
  appended to `report/mock_data_audit.md`.

## Tests run and results

- Full frontend: **7/7 suites pass** (incl. new F1 guard).
- `npm run build:web` succeeds. `git diff --check` clean.
- P0–P4, B1, B2 suites all green; no backend tests affected (no backend change).

## Limitations and manual verification steps (not performed — stated, not claimed)

- Device/manual tap-through not executed: publish a new property → tap the
  Add tab → expect a fresh Add form in Add mode; repeat after an edit
  publish → expect fresh form, not the old edit; start an edit, tab away
  mid-edit, tap Add → prior paused-edit resume behavior unchanged.
- Draft-delete-then-tab edge still relies on the existing "Could Not Load
  Draft" fallback; unchanged by this fix.
- Nothing staged, committed, pushed, or deployed.
