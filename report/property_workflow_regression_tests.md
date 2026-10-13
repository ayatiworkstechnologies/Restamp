# Property Workflow Regression Tests — G1/G2 Guards (2026-10-13, uncommitted)

Frontend: `/Users/isaacvineeth/Downloads/Restamp/Restamp-latest`
No runtime, backend, database, schema, migration, authentication, or OTP changes.

## Guards added (`scripts/property-edit-mode.test.mjs`, Sec 14)

- **G1 — unfinished-edit resume:** asserts the Add `Tab.Screen` block in
  `src/navigation/OwnerNavigator.js` registers no `tabPress`/`listeners` and
  performs no `resetForm`/`setParams` reset, so a bare Add-tab press supplies
  no params and a paused mid-edit resumes. Scoped to the Add block only, so
  unrelated future listeners elsewhere cannot trip it.
- **G2 — draft-save feedback (existing behavior, no new UI):** asserts the
  saving state (`setSavingDraft(true)`, `"Saving..."`), the saved/disabled
  button state (`saveDraftBtnSaved`, `disabled={savingDraft`), and the
  visible failure path (`"Could Not Save Draft"` alert).

## Validation

- Full frontend: **7/7 suites pass** (edit-mode incl. new G1 + 3× G2 checks).
- `npm run build:web` succeeds. `git diff --check` clean.
- Backend suites not run (no backend change; shared-DB caution stands).
- Manual device tap-through not executed — stated, not claimed. G3 remains
  manual-only by design.

## Limitations

- Source-guard style (screens cannot mount in the plain-node harness);
  behavior verified by assertion + inspection + Metro parse, as documented
  in-suite.
- Nothing staged, committed, pushed, or deployed. All prior reports preserved.
