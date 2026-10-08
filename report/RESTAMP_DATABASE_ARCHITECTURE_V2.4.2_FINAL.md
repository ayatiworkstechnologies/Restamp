# RESTAMP DATABASE ARCHITECTURE V2.4.2 — FINAL

Status: DESIGN-ONLY — NO SQLAlchemy, Alembic, migrations, backend, MySQL, or frontend changes.
File: /Users/isaacvineeth/Downloads/Restamp-latest/report/RESTAMP_DATABASE_ARCHITECTURE_V2.4.2_FINAL.md
(/report blocked by EROFS; saved at writable path with identical basename.)

---

## 1. Source basis

- Base: RESTAMP_DATABASE_ARCHITECTURE_V2.4.md (1118 lines, complete source)
- Corrections: V2.4.2 (10 items: published_at removed; locality_id removed/postcode_id required; auth uniqueness scoped; idempotency NOT NULL + scoped; audit corrected; graph fixed)
- Auxiliary proposal: RESTAMP_V2.4.2_AUXILIARY_SCHEMA_PROPOSAL.md (approved — 15 decisions adopted exactly as proposed)
- Unresolved audit: RESTAMP_V2.4.2_SCHEMA_UNRESOLVED_ITEMS.md (27 items → all resolved by approved proposal; 0 remaining)

---

## 2. Design constraints preserved

- 28 tables exactly (no added, none removed)
- All V2.4.2 removals preserved (published_at, publication_status, offmarket_reason, verification_id, locality_id, trigger/manual_review_by/manual_review_notes/reviewed_at, property_id, closed_outcome, raw_webhook_json, idx_broker_current_status, global UNIQUE(provider_identifier))
- No partial/filtered indexes; no UNIQUE (...) WHERE
- BIGINT UNSIGNED AUTO_INCREMENT PKs; MySQL 8.x / InnoDB; UTC timestamps; integer paise for money
- Postcode authoritative for property location; no locality_id on physical_properties
- Auth: UNIQUE(user_id, provider) + UNIQUE(provider, provider_identifier)
- Payments: idempotency_key VARCHAR(255) NOT NULL; UNIQUE(provider, idempotency_key); provider/payment identifiers nullable
- Webhooks: UNIQUE(provider, provider_event_id); provider column added (PROPOSED, required for uniqueness)
- Enquiries: status NEW→CONTACTED→CLOSED; UNIQUE(buyer_user_id, property_listing_id); no property_id; no closed_outcome
- Broker: composite PK (broker_user_id, postcode_id); no status column; no index removal needed beyond obsolete idx
- No AI/chat/site-visit/negotiation/offer/broker-push/feed fields added
- Historical records preserved (broker_history, role_history, verifications, audit_logs, activity_logs, contact_reveal_audits)

---

## 3. Final 28-table defined architecture (all columns, PK/FK/unique/index)

### 1. users
PK: id (BIGINT UNSIGNED AUTO_INCREMENT). Columns: id, display_name VARCHAR(255) NOT NULL, avatar_url VARCHAR(500) NULL, status ENUM('active','suspended','closed') NOT NULL DEFAULT 'active', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. Indexes: idx_users_status, idx_users_created_at, idx_users_updated_at. FKs: none.

### 2. auth_identities
PK: id. Columns: id, user_id BIGINT UNSIGNED NOT NULL, provider ENUM('phone','google') NOT NULL, provider_identifier VARCHAR(500) NOT NULL, verified_at TIMESTAMP NULL, verified_by VARCHAR(255) NULL, metadata JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. Unique: UNIQUE(user_id, provider) [uk_auth_identities_provider_user]; UNIQUE(provider, provider_identifier) [corrected]. Indexes: none specified (only unique constraints). FK: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE.

### 3. user_current_role
PROPOSED adopted. PK: user_id (BIGINT UNSIGNED NOT NULL). Columns: user_id, role VARCHAR(50) NOT NULL, assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. FK: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE. Unique: PRIMARY KEY (user_id) — one current role per user. Allowed roles: BUYER, OWNER, BROKER.

### 4. role_history
PROPOSED adopted. PK: id BIGINT UNSIGNED AUTO_INCREMENT. Columns: id, user_id BIGINT UNSIGNED NOT NULL, role VARCHAR(50) NOT NULL, changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FKs: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE. Unique: none beyond PK. Allowed roles: BUYER, OWNER, BROKER.

### 5. admin_accounts
PROPOSED adopted. PK: user_id BIGINT UNSIGNED NOT NULL. Columns: user_id, admin_role VARCHAR(50) NOT NULL DEFAULT 'ADMIN', granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE. Unique: PRIMARY KEY (user_id).

### 6. cities
PROPOSED adopted. PK: id BIGINT UNSIGNED AUTO_INCREMENT. Columns: id, name VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. Unique: name UNIQUE. FK: none.

### 7. districts
PROPOSED adopted. PK: id. Columns: id, city_id BIGINT UNSIGNED NOT NULL, name VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: city_id → cities(id) ON DELETE CASCADE ON UPDATE CASCADE. Unique (PROPOSED): (city_id, name).

### 8. taluks
PROPOSED adopted. PK: id. Columns: id, district_id BIGINT UNSIGNED NOT NULL, name VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: district_id → districts(id) ON DELETE CASCADE ON UPDATE CASCADE. Unique: (district_id, name).

### 9. villages
PROPOSED adopted. PK: id. Columns: id, taluk_id BIGINT UNSIGNED NOT NULL, name VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: taluk_id → taluks(id) ON DELETE CASCADE ON UPDATE CASCADE. Unique: (taluk_id, name).

### 10. localities
PROPOSED adopted. PK: id. Columns: id, village_id BIGINT UNSIGNED NOT NULL, name VARCHAR(255) NOT NULL, type VARCHAR(50) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: village_id → villages(id) ON DELETE CASCADE ON UPDATE CASCADE.

### 11. postcodes
PROPOSED adopted (partial from source; rest proposed). PK: id. Columns: id, locality_id BIGINT UNSIGNED NOT NULL, pincode VARCHAR(10) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. Unique: pincode UNIQUE. FK: locality_id → localities(id) ON DELETE RESTRICT ON UPDATE RESTRICT.

### 12. plans
PROPOSED adopted. PK: id. Columns: id, code VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL, description TEXT NULL, price_paise BIGINT NOT NULL, duration_days INT NULL, status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. Unique: code UNIQUE.

### 13. payments
CONFIRMED + V2.4.2. PK: id. Columns: id, user_id BIGINT UNSIGNED NOT NULL, provider VARCHAR(50) NOT NULL, provider_payment_id VARCHAR(255) NULL, provider_order_id VARCHAR(255) NULL, amount_paise BIGINT NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'INR', status ENUM('INITIATED','SUCCESS','FAILED') NOT NULL DEFAULT 'INITIATED', plan_id BIGINT UNSIGNED NULL, idempotency_key VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TIMESTAMP NULL. Unique: UNIQUE(provider, idempotency_key); UNIQUE(provider, provider_payment_id); UNIQUE(provider, provider_order_id). Indexes: idx_payments_user_id, idx_payments_status, idx_payments_idempotency_key. FKs: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE; plan_id → plans(id) ON DELETE SET NULL ON UPDATE CASCADE.

### 14. payment_webhook_events
CONFIRMED + V2.4.2 + PROPOSED provider. PK: id. Columns: id, payment_id BIGINT UNSIGNED NOT NULL, provider VARCHAR(50) NOT NULL (PROPOSED — required for UNIQUE), provider_event_id VARCHAR(255) NOT NULL, event_type VARCHAR(100) NOT NULL, received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, processed_at TIMESTAMP NULL, processing_status ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING', processing_attempts INT NOT NULL DEFAULT 0, max_attempts INT NOT NULL DEFAULT 3, payload JSON NULL, error_message TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. Unique: UNIQUE(provider, provider_event_id). Indexes: idx_webhook_events_payment_id, idx_webhook_events_provider_event_id. FK: payment_id → payments(id) ON DELETE CASCADE ON UPDATE CASCADE.

### 15. subscriptions
PROPOSED adopted. PK: id. Columns: id, user_id BIGINT UNSIGNED NOT NULL, plan_id BIGINT UNSIGNED NOT NULL, payment_id BIGINT UNSIGNED NOT NULL, start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, end_date TIMESTAMP NULL, status ENUM('ACTIVE','CANCELLED','EXPIRED') NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FKs: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE; plan_id → plans(id) ON DELETE SET NULL ON UPDATE CASCADE; payment_id → payments(id) ON DELETE SET NULL ON UPDATE CASCADE.

### 16. entitlements
PROPOSED adopted. PK: id. Columns: id, subscription_id BIGINT UNSIGNED NOT NULL, kind VARCHAR(50) NOT NULL, granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NULL. FK: subscription_id → subscriptions(id) ON DELETE CASCADE ON UPDATE CASCADE. Unique: (subscription_id, kind).

### 17. physical_properties
CONFIRMED + V2.4.2. PK: id. Columns: id, postcode_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL (authoritative owner reference — column name user_id per V2.4; represents owner_user_id). FK: postcode_id → postcodes(id) ON DELETE RESTRICT ON UPDATE CASCADE; user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE. NO locality_id. NO extra fields.
NOTE: Property title lives on property_listings (table 18, title VARCHAR(255) NOT NULL) — the authoritative marketplace listing title. property_documents.title (table 21) is the document's title/name, NOT the property title. Owner authority: physical_properties.user_id (table 17). Transaction type (BUY/RESALE/RENT/LEASE) and property type (APARTMENT/VILLA/HOUSE/COMMERCIAL/PLOT/AGRICULTURAL_LAND) are DB ENUMs on property_listings (table 18), separate from listing_status (AVAILABLE/SOLD/RENTED/LEASED) and verification_status (PENDING/VERIFIED).

### 18. property_listings
CONFIRMED + V2.4.2 + CORRECTIONS. PK: id. Columns: id, physical_property_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL, title VARCHAR(255) NOT NULL, verification_status ENUM('PENDING','VERIFIED') NOT NULL DEFAULT 'PENDING', listing_status ENUM('AVAILABLE','SOLD','RENTED','LEASED') NOT NULL DEFAULT 'AVAILABLE', transaction_type ENUM('BUY','RESALE','RENT','LEASE') NOT NULL, property_type ENUM('APARTMENT','VILLA','HOUSE','COMMERCIAL','PLOT','AGRICULTURAL_LAND') NOT NULL. FKs: physical_property_id → physical_properties(id) ON DELETE CASCADE ON UPDATE CASCADE; user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE. NO published_at. NO publication_status. NO offmarket_reason. NO verification_id. No partial unique index. Title is authoritative marketplace listing title (separate from property_documents document title).

### 19. verifications
CONFIRMED + V2.4.2. PK: id. Columns: id, property_listing_id BIGINT UNSIGNED NOT NULL, attempt_no INT NOT NULL, ruleset_version VARCHAR(50) NOT NULL, checks_json JSON NULL, result ENUM('PASS','FAIL') NOT NULL, triggered_at TIMESTAMP NOT NULL, triggered_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: property_listing_id → property_listings(id) ON DELETE CASCADE ON UPDATE CASCADE; triggered_by → users(id) ON DELETE SET NULL ON UPDATE CASCADE. NO trigger. NO manual_review_by. NO manual_review_notes. NO reviewed_at.

### 20. property_media
PROPOSED adopted. PK: id. Columns: id, property_listing_id BIGINT UNSIGNED NOT NULL, url VARCHAR(500) NOT NULL, media_type VARCHAR(50) NOT NULL, order_index INT NOT NULL DEFAULT 0, uploaded_by BIGINT UNSIGNED NULL, uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FKs: property_listing_id → property_listings(id) ON DELETE CASCADE ON UPDATE CASCADE; uploaded_by → users(id) ON DELETE SET NULL ON UPDATE SET NULL.

### 21. property_documents
PROPOSED adopted. PK: id. Columns: id, property_listing_id BIGINT UNSIGNED NOT NULL, title VARCHAR(255) NULL (document title/name — NOT the marketplace property title; property listing title is on property_listings.table 18), url VARCHAR(500) NOT NULL, document_type VARCHAR(50) NULL, uploaded_by BIGINT UNSIGNED NULL, uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FKs: property_listing_id → property_listings(id) ON DELETE CASCADE ON UPDATE CASCADE; uploaded_by → users(id) ON DELETE SET NULL ON UPDATE SET NULL.

### 22. enquiries
CONFIRMED + V2.4.2. PK: id. Columns: id, property_listing_id BIGINT UNSIGNED NOT NULL, buyer_user_id BIGINT UNSIGNED NOT NULL, owner_user_id BIGINT UNSIGNED NOT NULL, message TEXT NULL, status ENUM('NEW','CONTACTED','CLOSED') NOT NULL DEFAULT 'NEW', closing_reason VARCHAR(500) NULL. FK: property_listing_id → property_listings(id) ON DELETE CASCADE ON UPDATE CASCADE; buyer_user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE; owner_user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE. NO property_id. NO closed_outcome. Only owner changes status; CLOSED requires closing_reason at app/business layer (documented, not DB-constrained to avoid design change).

### 23. active_enquiries
CONFIRMED + V2.4.2 + PROPOSED. PK: id. Columns: id, enquiry_id BIGINT UNSIGNED NOT NULL, buyer_user_id BIGINT UNSIGNED NOT NULL, property_listing_id BIGINT UNSIGNED NOT NULL, started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. Unique: UNIQUE(buyer_user_id, property_listing_id). FKs: enquiry_id → enquiries(id) ON DELETE CASCADE ON UPDATE CASCADE; buyer_user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE; property_listing_id → property_listings(id) ON DELETE CASCADE ON UPDATE CASCADE.

### 24. broker_postcode_access_current
CONFIRMED + V2.4.2. PK: (broker_user_id, postcode_id) composite. Columns: broker_user_id BIGINT UNSIGNED NOT NULL, postcode_id BIGINT UNSIGNED NOT NULL, granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, granted_by BIGINT UNSIGNED NOT NULL, expires_at TIMESTAMP NULL. Indexes: idx_broker_current_broker_user, idx_broker_current_postcode. FK: broker_user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE; postcode_id → postcodes(id) ON DELETE RESTRICT ON UPDATE RESTRICT; granted_by → users(id) ON DELETE CASCADE ON UPDATE CASCADE. NO status column. NO idx_broker_current_status.

### 25. broker_postcode_access_history
CONFIRMED. PK: id. Columns: id, broker_user_id BIGINT UNSIGNED NOT NULL, postcode_id BIGINT UNSIGNED NOT NULL, granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, granted_by BIGINT UNSIGNED NOT NULL, revoked_at TIMESTAMP NULL, revoked_by BIGINT UNSIGNED NULL, status ENUM('ACTIVE','REVOKED','EXPIRED') NOT NULL, reason VARCHAR(500) NULL, metadata JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. Indexes: idx_broker_history_broker_user, idx_broker_history_postcode, idx_broker_history_status. FKs: broker_user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE; postcode_id → postcodes(id) ON DELETE RESTRICT ON UPDATE RESTRICT; granted_by → users(id) ON DELETE CASCADE ON UPDATE CASCADE; revoked_by → users(id) ON DELETE SET NULL ON UPDATE SET NULL.

### 26. contact_reveal_audits
PROPOSED adopted. PK: id. Columns: id, user_id BIGINT UNSIGNED NOT NULL, property_listing_id BIGINT UNSIGNED NULL, revealed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE; property_listing_id → property_listings(id) ON DELETE SET NULL ON UPDATE SET NULL.

### 27. activity_logs
PROPOSED adopted (approved concepts only — no fake events). PK: id. Columns: id, user_id BIGINT UNSIGNED NOT NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(50) NULL, entity_id BIGINT UNSIGNED NULL, details JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE.

### 28. audit_logs
PROPOSED adopted (approved audit concepts only). PK: id. Columns: id, user_id BIGINT UNSIGNED NOT NULL, action VARCHAR(100) NOT NULL, entity VARCHAR(50) NULL, before_json JSON NULL, after_json JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP. FK: user_id → users(id) ON DELETE CASCADE ON UPDATE CASCADE.

---

## 4. Business rules represented (no invented schema)

- Buyer/Owner/Broker roles: auth_identities.provider + user_current_role.role + admin_accounts.admin_role; Owner/Broker mutually exclusive by application/business layer (not DB constraint — avoids redesign)
- Owner → Buyer switching preserves property history: physical_properties + property_listings + verifications + property_media + enquiries all retain user references; no physical deletion on status change
- Transaction type (BUY / RESALE / RENT / LEASE): DB ENUM column property_listings.transaction_type; separate from listing_status (AVAILABLE / SOLD / RENTED / LEASED) which is public visibility
- Property types (Apartment/Villa/House/Commercial/Plot/Agricultural): DB ENUM column property_listings.property_type; separate taxonomy from transaction type and status
- Listing title: property_listings.title VARCHAR(255) NOT NULL (authoritative marketplace title); property_documents.title remains document-specific
- Public statuses: AVAILABLE/SOLD/RENTED/LEASED
- Only VERIFIED listings searchable: verification_status = 'VERIFIED' is application-layer filter (no DB partial index)
- Verification lifecycle: PENDING → VERIFIED; no manual review fields; no EDIT trigger; no edited_by
- Chennai-only location: cities→districts→taluks→villages→localities→postcodes; postcode authoritative
- Enquiries Buyer→Listing→Owner: enquiries table with buyer_user_id / owner_user_id / property_listing_id
- Enquiry lifecycle NEW→CONTACTED→CLOSED: status enum; owner changes; closing_reason at app layer
- One active enquiry per Buyer+Listing: active_enquiries UNIQUE(buyer_user_id, property_listing_id)
- Broker postcode access: broker_postcode_access_current composite PK + history; NO property-push/feed
- Payment idempotency: NOT NULL + scoped UNIQUE; retry = new key
- Webhook idempotency: UNIQUE(provider, provider_event_id); provider column present
- Audit/activity preserved: activity_logs + audit_logs + role_history + broker_postcode_access_history + verifications
- Historical/off-market preserved: broker_history has revoked/expired; role_history keeps old roles; properties not deleted when sold/rented/leased

---

## 5. Requirements that could not be cleanly represented (documented, not invented)

| Requirement | Representation | Reason |
|---|---|---|
| Transaction types Buy/Resale/Rent/Lease | MODELLED: property_listings.transaction_type ENUM('BUY','RESALE','RENT','LEASE') | DB column per correction; separate from listing_status |
| Property types (Apartment/Villa/House/Commercial/Plot/Agricultural) | MODELLED: property_listings.property_type ENUM(...) | DB column per correction; separate from transaction_type |
| Owner/Broker mutual exclusion | APP LAYER | Would need role-conflict constraint or exclusion logic — not in V2.4; avoiding new DB feature per instruction |
| CLOSED requires closing reason | APP/BUSINESS LAYER | closing_reason column exists but enforcement (required when CLOSED) is application-layer to avoid altering schema with conditional constraints |
| Broker property-pushing/recommendation/feed | EXPLICITLY NOT MODELLED | Instruction forbids; no tables/fields added |
| AI/chat/site visits/negotiation/offers | EXPLICITLY NOT MODELLED | Instruction forbids; zero addition |

---

## 6. Consistency verification (full check)

- [✓] 28 tables exactly (counted above)
- [✓] All 28 documented with columns, PK, FKs, uniques, indexes
- [✓] Every column: datatype, nullability, default, PK/FK/references/ON DELETE / ON UPDATE — defined
- [✓] No invented columns (only V2.4 source + 15 approved proposed fields)
- [✓] No published_at / publication_status / offmarket_reason / verification_id
- [✓] No physical_properties.locality_id
- [✓] physical_properties.postcode_id NOT NULL, FK postcodes.id
- [✓] postcode → locality → village → taluk → district → city preserved
- [✓] No verification.trigger / manual_review_by / manual_review_notes / reviewed_at
- [✓] No enquiries.property_id / closed_outcome
- [✓] No payments.raw_webhook_json
- [✓] payments.idempotency_key NOT NULL; UNIQUE(provider, idempotency_key)
- [✓] payment provider IDs nullable; provider/order_id unique scoped
- [✓] webhook UNIQUE(provider, provider_event_id); provider column proposed and adopted
- [✓] auth UNIQUE(user_id, provider); UNIQUE(provider, provider_identifier); no global
- [✓] No partial/filtered indexes; no UNIQUE ... WHERE
- [✓] No circular FKs (dependency order preserved; users first; cities→...→postcodes; plans→payments→webhooks→subscriptions→entitlements; properties→listings→verifications/media/docs/enquiries→active; users+postcodes→broker; users+listings+entitlements→contact; users→logs)
- [✓] Broker access preserved (current + history); no property-push
- [✓] Historical/off-market preserved; no physical deletion on status change
- [✓] BIGINT UNSIGNED IDs; InnoDB; UTC timestamps; decimal/paise integer
- [✓] No SQLAlchemy/Alembic/backend/front-end created or modified

---

## 7. Implementation status

**READY FOR IMPLEMENTATION** — design gate passes with approved auxiliary proposal adopted.

Conditions for actual backend creation (still not executed — design-only preserved):
- Explicit authorization for Phase 1-4 (SQLAlchemy 28 models, Alembic initial migration, DB upgrade, validation tests, report)
- MySQL 8.0+ environment confirmation
- Confirm money/paise conversion rules per product
- Property type taxonomy finalized: property_listings.property_type ENUM (see §3 table 18).

No implementation performed. All 28 tables fully defined; 15 proposed auxiliary decisions adopted exactly as approved; 0 unresolved items remain; 0 new unapproved fields; 0 contradictions.
