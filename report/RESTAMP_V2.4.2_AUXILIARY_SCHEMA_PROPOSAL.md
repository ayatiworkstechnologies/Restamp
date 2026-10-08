# RESTAMP V2.4.2 — Auxiliary Schema Proposal

Report: /Users/isaacvineeth/Downloads/Restamp-latest/report/RESTAMP_V2.4.2_AUXILIARY_SCHEMA_PROPOSAL.md
(Required /report/RESTAMP_V2.4.2_AUXILIARY_SCHEMA_PROPOSAL.md blocked by EROFS; saved at writable path with identical basename.)
Status: NOT READY FOR IMPLEMENTATION — design-only proposal; no SQLAlchemy/Alembic/DB/backend/front-end created or modified.

---

## 1. Purpose

This document proposes the minimum auxiliary field definitions needed for the 18 unresolved auxiliary/lookup tables (plus 2 index/provider items) identified in RESTAMP_V2.4.2_SCHEMA_UNRESOLVED_ITEMS.md.

Every proposed field is clearly labeled PROPOSED. Nothing is claimed from V2.4. No business rules invented. All V2.4.2 approved decisions preserved.

---

## 2. Source-confirmed constraints

V2.4.2 design gate approved (RESTAMP_DATABASE_ARCHITECTURE_V2.4.2.md — READY):
- 28 tables in dependency order confirmed
- property_listings.published_at / publication_status / offmarket_reason / verification_id — REMOVED
- physical_properties.locality_id — REMOVED; ONLY postcode_id NOT NULL → postcodes(id)
- verifications.trigger / manual_review_by / manual_review_notes / reviewed_at — REMOVED
- enquiries.property_id / enquiries.closed_outcome — REMOVED; status = NEW/CONTACTED/CLOSED; owner changes; UNIQUE(buyer, property_listing)
- payments.raw_webhook_json — MUST NOT EXIST; idempotency_key VARCHAR(255) NOT NULL; UNIQUE(provider, idempotency_key); provider/payment identifiers nullable
- auth_identities: UNIQUE(user_id, provider); UNIQUE(provider, provider_identifier); no global UNIQUE(provider_identifier)
- payment_webhook_events: UNIQUE(provider, provider_event_id); table #14 included
- broker_postcode_access_current: composite PK (broker_user_id, postcode_id); NO status; NO idx_broker_current_status
- No partial/filtered indexes; no UNIQUE ... WHERE; zero circular FKs; location derivation chain preserved

Nothing in V2.4.2 is changed by this proposal.

---

## 3. Proposed definitions

### 19. auth_identities — Additional indexes (PROPOSED)

Purpose: Support lookup by user/provider for auth queries.

PROPOSED indexes (names arbitrary — owner may rename):
- idx_auth_user (user_id)
- idx_auth_provider (provider)
- idx_auth_provider_identifier (provider, provider_identifier) — optional lookup

SOURCE CONFIRMED: unique constraints only (uk_auth_identities_provider_user, corrected uk_auth_identities_provider_identifier). Indexes not specified in V2.4 extract.
REQUIRES OWNER DECISION: Index names and whether all three are needed.

---

### 20. payment_webhook_events.provider (PROPOSED column)

Purpose: Required to satisfy UNIQUE(provider, provider_event_id) — the provider column must exist on this table.

PROPOSED column:

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| provider | VARCHAR(50) | NOT NULL | — | — | — | — | — | Required for scoped uniqueness (V2.4.2 corrected from unscoped) |

SOURCE CONFIRMED: V2.4 source defines payment_webhook_events with provider_event_id, event_type, etc. but does not explicitly list a provider column (line 216+). The V2.4.2 correction requires UNIQUE(provider, provider_event_id) — this implies provider must exist.
REQUIRES OWNER DECISION: Confirm provider column name, nullability (NOT NULL assumed for uniqueness), length.

---

### 1. user_current_role

Purpose: Track user's current role assignment.

PROPOSED (minimum — do not invent business rules):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| user_id | BIGINT UNSIGNED | NOT NULL | — | YES (PK/FK) | YES | users(id) | CASCADE | Link to user (SOURCE CONFIRMED via dependency) |
| role | VARCHAR(50) | NOT NULL | — | — | — | — | — | Assigned role (PROPOSED — needed to function) |
| assigned_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | When assigned (PROPOSED) |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | — | — | — | — | Last change (PROPOSED) |

Unique constraints (PROPOSED):
- PRIMARY KEY (user_id) — one current role per user

Foreign keys (SOURCE CONFIRMED):
- user_id → users(id) ON DELETE CASCADE

REQUIRES OWNER DECISION: Role values, whether updated_at needed, assigned_by reference.

---

### 2. role_history

Purpose: Historical role changes.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| user_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | users(id) | CASCADE | User (SOURCE CONFIRMED) |
| role | VARCHAR(50) | NOT NULL | — | — | — | — | — | Previous role (PROPOSED) |
| changed_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Change time (PROPOSED) |
| changed_by | BIGINT UNSIGNED | NULL | — | — | YES | users(id) | SET NULL | Admin/user who changed (PROPOSED) |
| reason | VARCHAR(500) | NULL | — | — | — | — | — | Change reason (PROPOSED — optional) |

Unique constraints (PROPOSED): None required beyond PK.

Foreign keys (SOURCE CONFIRMED):
- user_id → users(id)
- changed_by → users(id) ON DELETE SET NULL

REQUIRES OWNER DECISION: Whether changed_by, reason needed; whether role history is audit-only.

---

### 3. admin_accounts

Purpose: Admin account link to core user.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| user_id | BIGINT UNSIGNED | NOT NULL | — | YES (PK/FK) | YES | users(id) | CASCADE | Admin user (SOURCE CONFIRMED) |
| admin_role | VARCHAR(50) | NOT NULL | 'admin' | — | — | — | — | Admin role (PROPOSED — needed for function) |
| granted_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | When granted (PROPOSED) |
| granted_by | BIGINT UNSIGNED | NULL | — | — | YES | users(id) | SET NULL | Granted by (PROPOSED) |

Unique constraints (PROPOSED): PRIMARY KEY (user_id).

Foreign keys (SOURCE CONFIRMED): user_id → users(id) ON DELETE CASCADE.

REQUIRES OWNER DECISION: Whether admin_role values, granted_by needed.

---

### 4. cities

Purpose: Top-level location.

PROPOSED (minimum — V2.4 confirmed id/name; rest proposed):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (SOURCE CONFIRMED via dependency) |
| name | VARCHAR(255) | NOT NULL | — | — | — | — | — | City name (SOURCE CONFIRMED; unique noted) |
| code | VARCHAR(10) | NULL | — | — | — | — | — | City code (PROPOSED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

Unique: name UNIQUE (SOURCE CONFIRMED from V2.4 inventory).

REQUIRES OWNER DECISION: Whether code needed, any region/state reference.

---

### 5. districts

Purpose: District within city.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (SOURCE CONFIRMED via dependency) |
| city_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | cities(id) | CASCADE | City (SOURCE CONFIRMED) |
| name | VARCHAR(255) | NOT NULL | — | — | — | — | — | District name (PROPOSED) |
| code | VARCHAR(10) | NULL | — | — | — | — | — | Code (PROPOSED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

FK: city_id → cities(id) ON DELETE CASCADE.
Unique (PROPOSED): (city_id, name) — one district name per city.

---

### 6. taluks

Purpose: Taluk within district.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK |
| district_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | districts(id) | CASCADE | District (SOURCE CONFIRMED) |
| name | VARCHAR(255) | NOT NULL | — | — | — | — | — | Taluk name (PROPOSED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

FK: district_id → districts(id) ON DELETE CASCADE.
Unique (PROPOSED): (district_id, name).

---

### 7. villages

Purpose: Village within taluk.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK |
| taluk_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | taluks(id) | CASCADE | Taluk (SOURCE CONFIRMED) |
| name | VARCHAR(255) | NOT NULL | — | — | — | — | — | Village name (PROPOSED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

FK: taluk_id → taluks(id) ON DELETE CASCADE.
Unique (PROPOSED): (taluk_id, name).

---

### 8. localities

Purpose: Locality within village.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK |
| village_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | villages(id) | CASCADE | Village (SOURCE CONFIRMED) |
| name | VARCHAR(255) | NOT NULL | — | — | — | — | — | Locality name (PROPOSED) |
| type | VARCHAR(50) | NULL | — | — | — | — | — | Type (PROPOSED — optional) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

FK: village_id → villages(id) ON DELETE CASCADE.

---

### 9. postcodes

Purpose: Postcode / pincode reference (authoritative for location).

PROPOSED (minimum — id, locality_id, pincode confirmed; rest proposed):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (SOURCE CONFIRMED) |
| locality_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | localities(id) | RESTRICT | Locality (SOURCE CONFIRMED) |
| pincode | VARCHAR(10) | NOT NULL | — | — | — | — | — | Unique pincode (SOURCE CONFIRMED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

Unique: pincode UNIQUE (SOURCE CONFIRMED from V2.4 inventory).
FK: locality_id → localities(id) ON DELETE RESTRICT.

REQUIRES OWNER DECISION: Whether created_at needed; whether any additional reference fields.

---

### 10. plans

Purpose: Subscription/plan definitions.

PROPOSED (minimum — code unique confirmed; rest proposed):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (SOURCE CONFIRMED via inventory) |
| code | VARCHAR(50) | NOT NULL | — | — | — | — | — | Plan code (SOURCE CONFIRMED; unique) |
| name | VARCHAR(255) | NOT NULL | — | — | — | — | — | Plan name (PROPOSED) |
| description | TEXT | NULL | — | — | — | — | — | Description (PROPOSED) |
| price_paise | BIGINT | NOT NULL | — | — | — | — | — | Price in paise (PROPOSED; integral) |
| duration_days | INT | NULL | — | — | — | — | — | Duration (PROPOSED) |
| status | ENUM('ACTIVE','INACTIVE') | NOT NULL | 'ACTIVE' | — | — | — | — | Status (PROPOSED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

Unique: code UNIQUE (SOURCE CONFIRMED).

REQUIRES OWNER DECISION: Whether price_paise, duration, status, description needed; whether anything beyond code/plan is required by product rules.

---

### 11. subscriptions

Purpose: Active subscription records.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| user_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | users(id) | CASCADE | User (SOURCE CONFIRMED via dependency) |
| plan_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | plans(id) | RESTRICT | Plan (SOURCE CONFIRMED) |
| payment_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | payments(id) | RESTRICT | Payment (SOURCE CONFIRMED) |
| start_date | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Start (PROPOSED) |
| end_date | TIMESTAMP | NULL | — | — | — | — | — | End (PROPOSED) |
| status | ENUM('ACTIVE','CANCELLED','EXPIRED') | NOT NULL | 'ACTIVE' | — | — | — | — | Status (PROPOSED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

FKs: user_id → users(id); plan_id → plans(id); payment_id → payments(id).
REQUIRES OWNER DECISION: Whether auto_renew, trial fields needed; exact status enum.

---

### 12. entitlements

Purpose: Subscription entitlements.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| subscription_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | subscriptions(id) | CASCADE | Subscription (SOURCE CONFIRMED) |
| kind | VARCHAR(50) | NOT NULL | — | — | — | — | — | Entitlement type (PROPOSED) |
| granted_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Granted (PROPOSED) |
| expires_at | TIMESTAMP | NULL | — | — | — | — | — | Expiry (PROPOSED) |

FK: subscription_id → subscriptions(id) ON DELETE CASCADE.
Unique (PROPOSED): (subscription_id, kind).
REQUIRES OWNER DECISION: Kind values; whether expiry needed.

---

### 13. property_media

Purpose: Property media attachments.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| property_listing_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | property_listings(id) | CASCADE | Listing (SOURCE CONFIRMED) |
| url | VARCHAR(500) | NOT NULL | — | — | — | — | — | Media URL (PROPOSED) |
| media_type | VARCHAR(50) | NOT NULL | — | — | — | — | — | Type (PROPOSED) |
| order_index | INT | NOT NULL | 0 | — | — | — | — | Display order (PROPOSED) |
| uploaded_by | BIGINT UNSIGNED | NULL | — | — | YES | users(id) | SET NULL | uploader (PROPOSED) |
| uploaded_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Uploaded (PROPOSED) |

FKs: property_listing_id → property_listings(id); uploaded_by → users(id) ON DELETE SET NULL.
REQUIRES OWNER DECISION: Whether file_size, thumbnail_url, alt_text needed.

---

### 14. property_documents

Purpose: Property document files.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| property_listing_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | property_listings(id) | CASCADE | Listing (SOURCE CONFIRMED) |
| title | VARCHAR(255) | NULL | — | — | — | — | — | Title (PROPOSED) |
| url | VARCHAR(500) | NOT NULL | — | — | — | — | — | URL (PROPOSED) |
| document_type | VARCHAR(50) | NULL | — | — | — | — | — | Type (PROPOSED) |
| uploaded_by | BIGINT UNSIGNED | NULL | — | — | YES | users(id) | SET NULL | Uploader (PROPOSED) |
| uploaded_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Uploaded (PROPOSED) |

FKs: property_listing_id → property_listings(id); uploaded_by → users(id) ON DELETE SET NULL.
REQUIRES OWNER DECISION: Whether title, document_type needed.

---

### 15. active_enquiries

Purpose: Active enquiry concurrency control (one open enquiry per buyer+listing).

PROPOSED (minimum — V2.4.2 confirms unique; FK targets confirmed):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| enquiry_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | enquiries(id) | CASCADE | Enquiry (SOURCE CONFIRMED via section 6) |
| buyer_user_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | users(id) | CASCADE | Buyer (SOURCE CONFIRMED) |
| property_listing_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | property_listings(id) | CASCADE | Listing (SOURCE CONFIRMED) |
| started_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Started (PROPOSED) |

Unique: UNIQUE(buyer_user_id, property_listing_id) (SOURCE CONFIRMED by V2.4.2 / V2.4 section 6).
FKs: enquiry_id → enquiries(id); buyer_user_id → users(id); property_listing_id → property_listings(id).
REQUIRES OWNER DECISION: Whether started_at needed; whether status column needed (already in enquiries; not duplicated here per design).

---

### 16. contact_reveal_audits

Purpose: Contact reveal audit trail.

PROPOSED (minimum):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| user_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | users(id) | CASCADE | Revealed user (SOURCE CONFIRMED via dependency) |
| property_listing_id | BIGINT UNSIGNED | NULL | — | — | YES | property_listings(id) | SET NULL | Listing (PROPOSED — optional reference) |
| entitlement_id | BIGINT UNSIGNED | NULL | — | — | YES | entitlements(id) | SET NULL | Entitlement (PROPOSED — optional) |
| revealed_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Revealed (PROPOSED) |
| revealed_by | BIGINT UNSIGNED | NULL | — | — | YES | users(id) | SET NULL | Revealed by (PROPOSED) |

FKs: user_id → users(id); property_listing_id → property_listings(id) SET NULL; entitlement_id → entitlements(id) SET NULL; revealed_by → users(id) SET NULL.
REQUIRES OWNER DECISION: Which references needed (property, entitlement, both, none); whether revealed_by needed.

---

### 17. activity_logs

Purpose: User activity audit.

PROPOSED (minimum — only approved concepts: user, action, entity, timestamp):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| user_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | users(id) | CASCADE | User (SOURCE CONFIRMED) |
| action | VARCHAR(100) | NOT NULL | — | — | — | — | — | Action (PROPOSED — e.g., LOGIN, VIEW) |
| entity_type | VARCHAR(50) | NULL | — | — | — | — | — | Entity type (PROPOSED — e.g., PROPERTY) |
| entity_id | BIGINT UNSIGNED | NULL | — | — | — | — | — | Entity ID (PROPOSED) |
| details | JSON | NULL | — | — | — | — | — | Details (PROPOSED) |
| ip_address | VARCHAR(45) | NULL | — | — | — | — | — | IP (PROPOSED — optional) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

FK: user_id → users(id) ON DELETE CASCADE.
REQUIRES OWNER DECISION: Whether action/entity/details/ip needed; whether this is debug-only or audit-required.
No AI/chat/site-visit/offer/negotiation fields added.

---

### 18. audit_logs

Purpose: System audit log.

PROPOSED (minimum — approved audit concepts only):

| Column | Data Type | NULL/NOT NULL | Default | PK | FK | References | ON DELETE | Why needed |
|---|---|---|---|---|---|---|---|---|
| id | BIGINT UNSIGNED | NOT NULL | AUTO_INCREMENT | YES | — | — | — | PK (PROPOSED) |
| user_id | BIGINT UNSIGNED | NOT NULL | — | — | YES | users(id) | CASCADE | Acting user (SOURCE CONFIRMED) |
| action | VARCHAR(100) | NOT NULL | — | — | — | — | — | Action (PROPOSED — e.g., UPDATE, DELETE) |
| entity | VARCHAR(50) | NULL | — | — | — | — | — | Entity name (PROPOSED) |
| changed_by | BIGINT UNSIGNED | NULL | — | — | YES | users(id) | SET NULL | Changed by admin (PROPOSED) |
| before_json | JSON | NULL | — | — | — | — | — | Before state (PROPOSED) |
| after_json | JSON | NULL | — | — | — | — | — | After state (PROPOSED) |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | — | — | — | — | Created (PROPOSED) |

FKs: user_id → users(id); changed_by → users(id) ON DELETE SET NULL.
REQUIRES OWNER DECISION: Whether before_json/after_json needed (heavy); whether entity/action sufficient.
No speculative fields.

---

## 4. Required owner decisions (genuinely needed)

Only from the 20 proposed items above — all are auxiliary/lookup fields not touching V2.4.2 corrections:

1. auth_identities index names / count (item 19)
2. payment_webhook_events.provider column definition (item 20) — required for V2.4.2 unique
3. user_current_role: role values, assigned_by, full columns (item 1)
4. role_history: changed_by, reason, full columns (item 2)
5. admin_accounts: admin_role values, granted_by (item 3)
6. cities: code, created_at (item 4)
7. districts/taluks/villages/localities/postcodes/plans: name/code/created_at specifics (items 5-12)
8. subscriptions/entitlements: status/kind/dates (items 11-12)
9. property_media/document: url/media_type/title specifics (items 13-14)
10. active_enquiries: started_at (item 15)
11. contact_reveal_audits: which references (item 16)
12. activity_logs / audit_logs: which audit fields (items 17-18)

None alter V2.4.2. All are "add minimum fields for auxiliary tables to work."

---

## 5. Proposed 28-table final schema summary

Same 28 tables (no additions, no removals). All V2.4.2 corrections preserved.

| # | Table | V2.4.2 Status | Auxiliary Proposal |
|---|---|---|---|
| 1 | users | CONFIRMED | — |
| 2 | auth_identities | CONFIRMED + index proposal | PROPOSED indexes |
| 3 | user_current_role | PROPOSED fields | PROPOSED |
| 4 | role_history | PROPOSED fields | PROPOSED |
| 5 | admin_accounts | PROPOSED fields | PROPOSED |
| 6 | cities | PROPOSED fields | PROPOSED |
| 7 | districts | PROPOSED fields | PROPOSED |
| 8 | taluks | PROPOSED fields | PROPOSED |
| 9 | villages | PROPOSED fields | PROPOSED |
| 10 | localities | PROPOSED fields | PROPOSED |
| 11 | postcodes | PROPOSED fields | PROPOSED |
| 12 | plans | PROPOSED fields | PROPOSED |
| 13 | payments | CONFIRMED + V2.4.2 | — |
| 14 | payment_webhook_events | CONFIRMED + provider PROPOSED | PROPOSED provider column |
| 15 | subscriptions | PROPOSED fields | PROPOSED |
| 16 | entitlements | PROPOSED fields | PROPOSED |
| 17 | physical_properties | CONFIRMED + V2.4.2 (postcode_id, no locality_id) | — |
| 18 | property_listings | CONFIRMED + V2.4.2 (no published_at etc.) | — |
| 19 | verifications | CONFIRMED + V2.4.2 (no trigger/review fields) | — |
| 20 | property_media | PROPOSED fields | PROPOSED |
| 21 | property_documents | PROPOSED fields | PROPOSED |
| 22 | enquiries | CONFIRMED + V2.4.2 (no property_id/closed_outcome) | — |
| 23 | active_enquiries | CONFIRMED + unique + PROPOSED fields | PROPOSED |
| 24 | broker_postcode_access_current | CONFIRMED + V2.4.2 (composite PK, no index) | — |
| 25 | broker_postcode_access_history | CONFIRMED | — |
| 26 | contact_reveal_audits | PROPOSED fields | PROPOSED |
| 27 | activity_logs | PROPOSED fields | PROPOSED |
| 28 | audit_logs | PROPOSED fields | PROPOSED |

---

## 6. V2.4.2 consistency check

- [✓] Exactly 28 tables — no new, none removed
- [✓] No obsolete fields — all 10 V2.4.2 removals preserved (published_at, publication_status, offmarket_reason, verification_id, locality_id, trigger, manual_review_by, manual_review_notes, reviewed_at, property_id, closed_outcome, raw_webhook_json, idx_broker_current_status, global UNIQUE(provider_identifier))
- [✓] No partial indexes — none proposed; standard indexes only
- [✓] No UNIQUE ... WHERE — none proposed
- [✓] No circular FKs — dependency order unchanged
- [✓] Location hierarchy preserved: physical_properties.postcode_id → postcodes → localities → villages → taluks → districts → cities (locality_id not reintroduced)
- [✓] Auth uniqueness preserved: UNIQUE(user_id, provider) + UNIQUE(provider, provider_identifier); no global UNIQUE(provider_identifier)
- [✓] Payment idempotency preserved: idempotency_key VARCHAR(255) NOT NULL; UNIQUE(provider, idempotency_key); provider/payment IDs nullable
- [✓] Webhook uniqueness preserved: UNIQUE(provider, provider_event_id); provider column proposed to satisfy
- [✓] Enquiry constraints preserved: status NEW→CONTACTED→CLOSED; owner changes; UNIQUE(buyer, property_listing); no property_id; no closed_outcome
- [✓] Broker scope preserved: composite PK (broker_user_id, postcode_id); no broker-pushing/recommendation/feed fields added
- [✓] No AI/chat/site-visit/negotiation/offer schema — none proposed
- [✓] All proposed fields marked PROPOSED; none claimed from V2.4
- [✓] No implementation files created — design-only

---

## 7. Implementation status

**NOT READY FOR IMPLEMENTATION** until owner approves proposed auxiliary fields (items 1-20 above — primarily auxiliary table columns and auth/webhook index/provider additions).

The approved V2.4.2 design (corrected fields, 28-table graph, 10 corrections) is complete and verified. The proposed auxiliary fields only fill gaps in auxiliary/lookup tables so the full database can function; they do not alter any approved business rule.

When owner confirms the proposed fields (or substitutes their own), this proposal can be merged into the V2.4.2 architecture and Phase 1-4 (SQLAlchemy / Alembic / tests / report) can proceed — still with explicit authorization required per user's instruction.

No SQLAlchemy, Alembic, SQL migrations, backend code, MySQL changes, or frontend changes have been created for this proposal.
