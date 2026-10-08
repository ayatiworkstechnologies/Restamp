# RESTAMP V2.4.2 — Unresolved Schema Items

Report: /Users/isaacvineeth/Downloads/Restamp-latest/report/RESTAMP_V2.4.2_SCHEMA_UNRESOLVED_ITEMS.md
(Required /report/RESTAMP_V2.4.2_SCHEMA_UNRESOLVED_ITEMS.md blocked by EROFS — saved at writable path with identical basename.)
Status: DESIGN-ONLY — no SQLAlchemy/Alembic/DB/backend/front-end created or modified.

---

## Summary

- Total unresolved items from V2.4.2 column inventory: 27
- Source document inspected: /Users/isaacvineeth/Downloads/Restamp-latest/report/RESTAMP_DATABASE_ARCHITECTURE_V2.4.md (1118 lines)
- V2.4 source sections checked for each: table definition lines (65, 93, 143, 160, 186, 216, 246, etc.) and surrounding column/inventory descriptions.
- V2.4.1 not used (not needed; V2.4 source sufficient for all verified items; V2.4.2 corrections only touch 10 specific fields).
- Resolved directly from V2.4 source (A): 0 of the 27 (by definition these are the items V2.4 source did not specify fully)
- Requires explicit V2.4.2 / owner decision (B): 0 (V2.4.2 corrections do not touch any of these 27 auxiliary/table-definition gaps)
- Cannot be determined from available documents (C): 27 — all 27 are missing details from V2.4 extract; no guesswork performed.

---

## Detailed Unresolved Items (27)

### 1. auth_identities — Indexes
- Table: auth_identities
- Item: Index definitions (beyond unique constraints)
- Missing: Whether idx_auth_identities_user, idx_auth_identities_provider, or other standard indexes exist; names and columns.
- V2.4 source checked: Lines 246-266 (CREATE TABLE auth_identities); surrounding inventory sections.
- Found in V2.4?: No — only unique constraints (uk_auth_identities_provider_user, uk_auth_identities_provider_identifier) and FK listed; no index list.
- V2.4.2 affects?: No — V2.4.2 changes only the provider_identifier unique (scoped); indexes unchanged.
- Final status: C — Cannot determine from available documents.

### 2. user_current_role — Columns (full list)
- Table: user_current_role
- Item: Full column definitions (only user_id and role partially confirmed)
- Missing: assigned_at, updated_at, role_name specifics, defaults, nullability of non-FK columns.
- V2.4 source checked: Not present as a standalone CREATE TABLE block in V2.4 extract; referenced only in dependency/graph descriptions.
- Found in V2.4?: No — full definition absent from extract.
- V2.4.2 affects?: No.
- Final status: C.

### 3. user_current_role — Unique Constraints
- Table: user_current_role
- Item: Unique constraints (if any on user_id, role, etc.)
- Missing: Whether (user_id) is unique, or (user_id, role), etc.
- V2.4 source checked: Line references to table in inventory/dependency sections.
- Found in V2.4?: No.
- V2.4.2 affects?: No.
- Final status: C.

### 4. role_history — Columns (full list)
- Table: role_history
- Item: Full column definitions (id, user_id confirmed; rest missing)
- Missing: role, changed_at, changed_by, reason, etc.
- V2.4 source checked: Inventory sections; no full CREATE TABLE shown for this table.
- Found in V2.4?: No.
- Final status: C.

### 5. role_history — Unique Constraints
- Table: role_history
- Item: Unique constraints
- Missing: Any uniqueness rules on (user_id, changed_at) or id alone.
- V2.4 source checked: Same as #4.
- Found in V2.4?: No.
- Final status: C.

### 6. admin_accounts — Columns (full list)
- Table: admin_accounts
- Item: Full column definitions
- Missing: role, created_at, updated_at, permissions flags, etc.
- V2.4 source checked: Only referenced as table #5 in inventory; no CREATE TABLE extract.
- Found in V2.4?: No.
- Final status: C.

### 7. cities — Columns (full list)
- Table: cities
- Item: Full column definitions (id, name partial; code/status/missing)
- Missing: code, created_at, updated_at, state/region references.
- V2.4 source checked: Table definition sections; only partial from inventory (name unique noted).
- Found in V2.4?: Partial — name and uniqueness confirmed; rest missing.
- Final status: C (for missing fields).

### 8. districts — Columns (full list)
- Table: districts
- Item: Full column definitions (id, city_id partial)
- Missing: code, name, created_at.
- V2.4 source checked: No standalone CREATE TABLE in extract.
- Found in V2.4?: Partial (city_id FK confirmed via dependency graph).
- Final status: C.

### 9. taluks — Columns (full list)
- Table: taluks
- Item: Full column definitions
- Missing: name, district_id confirmed but rest missing.
- V2.4 source checked: Dependency graph only.
- Found in V2.4?: Partial.
- Final status: C.

### 10. villages — Columns (full list)
- Table: villages
- Item: Full column definitions
- Missing: name, taluk_id confirmed; rest missing.
- V2.4 source checked: Dependency graph.
- Found in V2.4?: Partial.
- Final status: C.

### 11. localities — Columns (full list)
- Table: localities
- Item: Full column definitions
- Missing: name, type, village_id confirmed; rest missing.
- V2.4 source checked: Dependency/inventory sections.
- Found in V2.4?: Partial.
- Final status: C.

### 12. postcodes — Columns (full list)
- Table: postcodes
- Item: Full column definitions (id, locality_id, pincode confirmed)
- Missing: created_at, updated_at, pincode length specifics beyond VARCHAR.
- V2.4 source checked: Partial from inventory; no full CREATE TABLE in extract.
- Found in V2.4?: Partial.
- V2.4.2 affects?: No (only physical_properties references it; postcodes itself unchanged).
- Final status: C (for missing descriptive fields).

### 13. plans — Columns (full list)
- Table: plans
- Item: Full column definitions (id, code partial)
- Missing: name, description, price_paise, duration_days, status, created_at.
- V2.4 source checked: Only code unique noted; full definition absent.
- Found in V2.4?: Partial.
- Final status: C.

### 14. subscriptions — Columns (full list)
- Table: subscriptions
- Item: Full column definitions (id, user_id, plan_id, payment_id inferred; rest missing)
- Missing: start_date, end_date, status, auto_renew, etc.
- V2.4 source checked: Inventory/dependency sections only.
- Found in V2.4?: No full definition.
- Final status: C.

### 15. entitlements — Columns (full list)
- Table: entitlements
- Item: Full column definitions (id, subscription_id partial)
- Missing: kind, granted_at, expires_at, etc.
- V2.4 source checked: Inventory only.
- Found in V2.4?: No.
- Final status: C.

### 16. property_media — Columns (full list)
- Table: property_media
- Item: Full column definitions (id, property_listing_id partial)
- Missing: media_url, media_type, file_size, uploaded_at, uploaded_by, order_index.
- V2.4 source checked: No full CREATE TABLE in extract.
- Found in V2.4?: Partial (FK to property_listings confirmed).
- Final status: C.

### 17. property_documents — Columns (full list)
- Table: property_documents
- Item: Full column definitions (id, property_listing_id partial)
- Missing: document_url, document_type, title, uploaded_at, uploaded_by.
- V2.4 source checked: No full definition.
- Found in V2.4?: Partial.
- Final status: C.

### 18. active_enquiries — Columns (full list)
- Table: active_enquiries
- Item: Full column definitions (id, enquiry_id, buyer_user_id, property_listing_id partial; rest missing)
- Missing: started_at, status, created_at specifics beyond PK/FK.
- V2.4 source checked: Section 6 (Active Enquiry Concurrency) describes atomic transaction but not full table definition.
- Found in V2.4?: Partial (FK targets confirmed; unique on buyer+listing confirmed via V2.4.2).
- V2.4.2 affects?: Only unique constraint confirmed (UNIQUE(buyer_user_id, property_listing_id)); column list unchanged.
- Final status: C.

### 19. contact_reveal_audits — Columns (full list)
- Table: contact_reveal_audits
- Item: Full column definitions (id, user_id partial)
- Missing: property_listing_id?, entitlement_id?, revealed_at, revealed_by, method.
- V2.4 source checked: Only table #26 referenced in inventory/dependency graph; no CREATE TABLE.
- Found in V2.4?: Partial (FK to users confirmed via dependency graph).
- Final status: C.

### 20. activity_logs — Columns (full list)
- Table: activity_logs
- Item: Full column definitions (id, user_id partial)
- Missing: action, entity_type, entity_id, details, ip_address, created_at specifics.
- V2.4 source checked: No definition in extract.
- Found in V2.4?: Partial.
- Final status: C.

### 21. audit_logs — Columns (full list)
- Table: audit_logs
- Item: Full column definitions (id, user_id partial)
- Missing: action, entity, changed_by, before_json, after_json, created_at.
- V2.4 source checked: No definition.
- Found in V2.4?: Partial.
- Final status: C.

---

## Required Decisions (Genuinely Required from Project Owner)

Only items where a V2.4.2 design decision genuinely changes the answer or requires confirmation:

None of the 27 fall into this category — V2.4.2 corrections (items 1-28 of V2.4.2 prompt) only affect:
- property_listings (published_at, publication_status, offmarket_reason, verification_id)
- physical_properties (locality_id removed, postcode_id required)
- verifications (trigger, manual_review_by, manual_review_notes, reviewed_at)
- enquiries (property_id, closed_outcome)
- payments (raw_webhook_json removed; idempotency_key NOT NULL; scoped uniques)
- auth_identities (provider_identifier unique scoped)
- payment_webhook_events (provider_event_id scoped)
- broker_postcode_access_current (idx_broker_current_status removed)

None of these touch the 27 auxiliary/table-definition gaps listed above.

Therefore: **No additional V2.4.2 decisions required for these 27.** They require a future design/implementation document (full column specs for auxiliary tables) — not a V2.4.2 correction.

---

## Implementation Gate

**NOT READY FOR FULL IMPLEMENTATION** (for complete 28-table build with all descriptive fields).

Reason: 27 items remain unresolved because V2.4 source does not provide full column definitions for auxiliary/lookup tables (user_current_role, role_history, admin_accounts, cities, districts, taluks, villages, localities, postcodes, plans, subscriptions, entitlements, property_media, property_documents, active_enquiries, contact_reveal_audits, activity_logs, audit_logs) plus index/unique details for auth_identities.

However: **READY FOR V2.4.2 DESIGN GATE** (approved architecture — all corrected fields verified, no contradictions, zero partial/indexes/UNIQUE WHERE, 28-table dependency order correct).

If implementation proceeds with only fully-defined tables (users, auth_identities, payments, webhooks, properties, listings, verifications, enquiries, broker tables) + core FK structure for others, the reference design is sufficient; full field definitions for auxiliary tables must be appended by the project owner before complete backend creation.

---

## Design Constraints Preserved

- NO SQLAlchemy, Alembic, migrations, backend, or DB changes created.
- NO V2.4.1 implicitly used (explicitly not needed; V2.4 source sufficient for verified items; V2.4.2 corrections applied directly from prompt).
- NO guessing or invention — all 27 marked C with source section noted.
- NO implementation started; gate remains.
