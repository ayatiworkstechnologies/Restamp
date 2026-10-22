# Database Reset Preflight — Phase 1 Read-Only Inspection (2026-10-14)

No rows read beyond names/counts. No writes, dumps, deletes, or migrations executed.

## 1. Local database identity (VERIFIED)

- Engine: MySQL via PyMySQL unix socket; database **`restamp_dev`** on
  `localhost` (parsed from local `.env` metadata only — no secrets printed).
- `mysqld` running locally (PID 302), socket `/tmp/mysql.sock` present,
  `SELECT DATABASE()` returns `restamp_dev`, reachable.
- Demonstrably development: name `restamp_dev`, localhost-only socket,
  test-guard conventions in `tests/conftest.py`, 5 users / 33 listings of
  test-shaped data, zero payments/subscriptions.
- Migration state: DB at `e6f7a8b9c0d1`; repo has two newer revisions
  (`e7f8a9b0c1d2`, `f1a2b3c4d5e6`) — DB is behind head (relevant to reset).

## 2. Render database identity (UNVERIFIED — BLOCKED)

- `render.yaml` sets `RESTAMP_DATABASE_URL` manually in the dashboard
  (`sync: false`); the value exists nowhere in the repo.
- Code proves MySQL-only (`mysql.*` column types, Aiven SSL handling in
  `app/db.py`), so a Render PostgreSQL is implausible; likely external
  (Aiven-style) MySQL — but host, database name, row contents, and whether
  it holds real user data **cannot be established from the repo**.
- Distinctness from local is therefore unproven. No backup possibility can
  be assessed. **Do not touch Render until the dashboard URL (metadata
  only) and a provider-side backup are confirmed by a human.**

## 3. Table inventory (local `restamp_dev`, read-only counts)

34 tables. Non-empty: `users` 5, `auth_identities` 5, `user_current_role` 5,
`role_history` 16, `physical_properties` 33, `property_listings` 33,
`property_media` 34, `rent_terms` 3, `listing_amenities` 20,
`amenity_master` 35 (reference seed), `enquiries` 2, `active_enquiries` 2,
`saved_properties` 1, `listing_drafts` 1, location chain
(cities 2/districts 3/taluks 13/villages 13/localities 22/postcodes 22),
`alembic_version` 1. Empty: payments, payment webhooks, subscriptions,
entitlements, plans, broker tables, logs, verification docs.

## 4. FK dependency order (child → parent, from information_schema)

Location chain bottom-up: villages→taluks→districts→cities;
localities→villages; postcodes→localities. Data: drafts/saved/activity/audit/
admin/identities/roles/history → users; media/docs/rent/verifications/
amenity-links → listings; enquiries → listings+users; active → enquiries;
reveals → users+listings; broker rows → users+postcodes; payments → users+
plans; webhooks → payments; subscriptions → users+plans+payments;
entitlements → subscriptions; listings → physical+users; physical → users+
postcodes. Clearing order (children first):
`payment_webhook_events, entitlements, subscriptions, payments,
broker_*_history, broker_*_current, activity/audit_logs, saved_properties,
active_enquiries, contact_reveal_audits, enquiries, listing_drafts,
verifications, property_documents, property_media, rent_terms,
listing_amenities, auth_identities, admin_accounts, role_history,
user_current_role, property_listings, physical_properties, users`,
then location chain only if reseeding geography (else preserve postcodes+
upwards). **Preserve always:** `alembic_version`, `amenity_master` (seed),
`plans` if seeded later (currently empty), location tables unless geography
is deliberately rebuilt.

## 5. Backup / restore (proposed, NOT executed)

- Local: `mysqldump` full dump to a versioned file outside the repo;
  verify with row-count comparison + test restore into a scratch database;
  device has ~519Mi free — ample for this KB-scale dump, but re-check at
  execution time. Uploads live in Cloudinary (`photo_storage.py`), NOT in
  the DB — a row reset orphans Cloudinary assets; handle separately with
  explicit approval (never auto-delete).
- Render: provider-console backup first (unverified — BLOCKED).

## 6. Proposed commands (PROPOSED — NOT EXECUTED)

- Local backup: `mysqldump --single-transaction restamp_dev > <backup path>`.
- Local reset: one transaction deleting child-to-parent per §4, or
  `TRUNCATE` in FK-safe order with `FOREIGN_KEY_CHECKS=0` only if a full
  verified backup exists; then `alembic upgrade head` to close the
  two-revision gap; then re-verify counts are zero (except preserved tables)
  and the app boots.
- Rollback: restore the dump into `restamp_dev` and re-verify counts.

## 7. Risks / approvals needed

- Render target unverified + data classification unknown → **BLOCKED**.
- Local `amenity_master` (35) and location chain double as seed/reference
  data — confirm reseed procedure before clearing.
- Cloudinary orphans need a separate approved cleanup.
- Two pending local migrations must be reconciled with any reset.

## Decision: BLOCKED — DATABASE IDENTITY OR SAFETY NOT VERIFIED

Local is READY FOR RESET PLAN APPROVAL (pending human sign-off); Render is
BLOCKED until dashboard-confirmed identity, data classification, and backup.

---

## 8. Final local-only reset plan — 2026-10-14 (PROPOSED, NOT EXECUTED)

Identity reconfirmed immediately before planning: `restamp_dev` on
localhost socket, alembic `e6f7a8b9c0d1`. Render untouched throughout.

### 8a. Migration correction (supersedes §1/§7 gap note)

The "two revisions behind" note was a misread: the 9 revisions form ONE
linear chain ending at single head `e6f7a8b9c0d1` (verified via
`ScriptDirectory.get_heads()`), which is exactly where the DB sits. **No
migration is needed before or after the reset.** Both pending-file
revisions (`e7f8a9b0c1d2`, `f1a2b3c4d5e6`) are nullable ADD COLUMNs that
succeed on empty tables anyway. Preserve `alembic_version` untouched.

### 8b. Backup (proposed, NOT created)

`mysqldump --single-transaction restamp_dev` to a timestamped off-repo file
(~KB scale; ~569Mi free rechecked — ample, recheck again at execution).
Verify by comparing per-table counts against §3 and by restoring into a
scratch database. No backup file created in this phase. Uploads live in
Cloudinary and are NOT covered — leave all assets untouched pending a
separate approved cleanup.

### 8c. Tables to CLEAR (user/application data, child-first)

`payment_webhook_events`, `entitlements`, `subscriptions`, `payments`,
`broker_postcode_access_history`, `broker_postcode_access_current`,
`activity_logs`, `audit_logs`, `saved_properties`, `active_enquiries`,
`contact_reveal_audits`, `enquiries`, `listing_drafts`, `verifications`,
`property_documents`, `property_media`, `rent_terms`, `listing_amenities`,
`auth_identities`, `admin_accounts`, `role_history`, `user_current_role`,
`property_listings`, `physical_properties`, `users`.
(Location chain and `amenity_master` preserved, so geography/postcode FKs
never dangle.)

### 8d. Tables to PRESERVE (and why)

`alembic_version` (migration metadata — dropping it breaks all future
migrates); `amenity_master` (35-row reference seed with no reseed script in
repo); `plans` (empty today — preserve table; reseed-or-skip decision if
plans are seeded later); `cities/districts/taluks/villages/localities/
postcodes` (shared reference geography; clearing forces a full rebuild).

### 8e. Transactionality and rollback limits

Use plain `DELETE` statements in §8c order inside ONE transaction (InnoDB:
fully rollback-safe on error). Do NOT use `TRUNCATE` (DDL implicit-commit,
non-transactional) and do NOT toggle `FOREIGN_KEY_CHECKS` (unnecessary when
ordered correctly). Once committed, recovery is backup-restore only — hence
the §8b verified backup gates execution.

### 8f. Post-reset verification (proposed)

Per-table counts: zero everywhere except §8d preserved tables;
`alembic_version` still `e6f7a8b9c0d1`; app boots and buyer feed renders
honest-empty; OTP login creates a fresh user; one publish→lead→close smoke
flow recreates rows correctly.

### 8g. Decisions still required (human approval)

1. Approve this local plan (or adjust preserve/clear lists).
2. Reseed procedure for `amenity_master`/geography if a full wipe is ever
   wanted instead.
3. Cloudinary orphan cleanup — separate approval, never bundled.
4. Render remains BLOCKED (identity, classification, provider backup).

## Final result: LOCAL PLAN READY FOR HUMAN APPROVAL — RENDER BLOCKED

---

## 9. Execution record — local reset performed 2026-10-14 14:29–14:35 UTC

- Target reconfirmed `restamp_dev` (localhost socket, alembic `e6f7a8b9c0d1`).
- Backup `/tmp/restamp_backups/restamp_dev_full_20261014_142903.sql` (69KB,
  34 tables, dump-completed footer); verified row-for-row against live
  counts (21 non-empty tables, zero mismatches). Scratch-restore not
  possible (app user lacks CREATE DATABASE; root credentials out of scope)
  — documented limitation. Tablespace warning on dump is immaterial
  (data tables fully captured).
- Single-transaction child-first DELETEs per §8c committed (e.g. 33
  listings, 33 physicals, 5 users, 34 media, 20 amenity links, 2
  enquiries/active rows, 16 role rows). No TRUNCATE, no FK toggle, no
  migrations, no seeds.
- Post-reset: only `alembic_version`(1), `amenity_master`(35), and location
  chain remain; alembic still `e6f7a8b9c0d1`; `/health` 200;
  `GET /buyer/listings` 200 with honest `total: 0`.
- Render, Cloudinary, sources, and env untouched. Rollback = restore the
  backup file above.

---

## 10. Aiven/Render preflight — 2026-10-14 (read-only, BLOCKED)

- Target as provided: database `defaultdb` at
  `mysql-2e22bc06-project-5450.f.aivencloud.com:22099`.
- Render connection path (code): `RESTAMP_DATABASE_URL` set manually in the
  Render dashboard (`render.yaml`, `sync: false`) with Aiven SSL handling in
  `app/db.py`; the value exists nowhere in the repo.
- Host DNS resolves and the port accepts TCP (read-only handshake only).
- **Credentials unavailable:** no Aiven password in shell env, no
  `~/.my.cnf`, local `.env` points only at `restamp_dev`. No authentication
  attempted; database identity, tables, counts, alembic revision, and
  real-vs-test classification are all UNVERIFIED.
- Backup method for Aiven MySQL would be `mysqldump --single-transaction`
  over SSL plus an Aiven-console backup, but neither can run without access.
- Proposed reset (once approved AND credentialed): same child-first plan as
  §8, executed against the verified target only, after a verified backup.
- **Next step needed:** user supplies the Aiven password via Render
  dashboard reference (never pasted into chat/files), or runs the inventory
  commands from an already-authenticated session.
- Decision: RENDER BLOCKED — no writes performed, nothing staged/committed.
