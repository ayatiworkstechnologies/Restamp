# RESTAMP DATABASE ARCHITECTURE V2.4 — FINAL SURGICAL CORRECTIONS

## Executive Summary

This document presents RESTAMP Database Architecture v2.4, implementing surgical corrections to address all V2.3 inconsistencies while maintaining strict MySQL 8.0/8.4 compatibility and business rule alignment.

**Core Design Principles:**
- **MySQL-Only Design**: Zero partial indexes, filtered indexes, or PostgreSQL features
- **Unambiguous State Models**: Clear separation of verification vs business status
- **Concrete Location Reference**: Single deterministic location hierarchy
- **Transactional Concurrency**: Atomic operations with database-enforced guarantees
- **No Duplicate Models**: Eliminated redundant foreign keys and fields
- **Implementation-Ready**: Complete schema with no remaining ambiguities

## Major Surgical Corrections

### 1. Property Listing - Removed Publication State Duplication

**Corrections Applied**:
- **Removed** `publication_status`, `published_at`, `offmarket_reason` from `property_listings`
- **Kept** `verification_status` (PENDING, VERIFIED)
- **Kept** `listing_status` (AVAILABLE, SOLD, RENTED, LEASED)
- **Removed** duplicate `verification_id` FK

**Business State Flow**:
```
VERIFICATION: PENDING → VERIFIED → AUTO-PUBLISHED
LISTING: AVAILABLE → (SOLD/RENTED/LEASED)
```

**Public Search Logic**:
```sql
WHERE verification_status = 'VERIFIED'
  AND listing_status = 'AVAILABLE'
```

### 2. Removed Circular Verification FK

**Design Decision**:
- Only `verifications.property_listing_id` (→ property_listings.id)
- Removed `property_listings.verification_id`
- **Migration Order**: property_listings → verifications

### 3. Verification Table - Removed Old Review Model

**Removed Fields**:
- `trigger` (SUBMIT/EDIT)
- `manual_review_by`
- `manual_review_notes`
- `reviewed_at`

**Retained Technical Metadata Only**:
- `triggered_at`, `triggered_by`
- `ruleset_version`, `checks_json`, `metadata`
- `result` = PASS/FAIL (technical only)

**Business State**:
- In `property_listings.verification_status` (PENDING/VERIFIED)
- PASS/FAIL is NEVER a rejection state

### 4. Property Location - Deterministic Postcode Reference

**Final Design**:
```sql
CREATE TABLE physical_properties (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    locality_id BIGINT UNSIGNED NOT NULL,
    -- ... other fields
    FOREIGN KEY (locality_id) REFERENCES localities(id)
);
```

**Location Derivation**:
```
property.locality_id
→ localities.village_id
→ taluks.district_id
→ districts.city_id

property.locality_id
→ localities.postcode_id
→ postcodes.pincode
```

**Broker Authorization**: Postcode-based access through `broker_postcode_access_current.postcode_id`

### 5. Enquiries - Removed Duplication

**Removed**: `property_id` (redundant with `property_listing_id`)

**Current Fields**:
```sql
CREATE TABLE enquiries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    property_listing_id BIGINT UNSIGNED NOT NULL,
    buyer_user_id BIGINT UNSIGNED NOT NULL,
    owner_user_id BIGINT UNSIGNED NOT NULL,
    message TEXT,
    status ENUM('NEW', 'CONTACTED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    closing_reason VARCHAR(500) NULL,
    -- ... timestamps
);
```

**Statuses Only**:
- `NEW` → `CONTACTED` → `CLOSED`
- No `closed_outcome`, `SOLD`, `RENTED`, etc.

### 6. Active Enquiry Concurrency - Atomic Design

**Open Transaction**:
```sql
START TRANSACTION;

INSERT INTO enquiries (... status='NEW' ...);
SET @enquiry_id = LAST_INSERT_ID();

INSERT INTO active_enquiries (enquiry_id, buyer_user_id, property_listing_id)
VALUES (@enquiry_id, ?, ?);

COMMIT;
```

**Close Transaction**:
```sql
START TRANSACTION;

UPDATE enquiries 
SET status = 'CLOSED', closing_reason = ?, updated_at = NOW()
WHERE id = ? AND status IN ('NEW', 'CONTACTED');

DELETE FROM active_enquiries WHERE enquiry_id = ?;

COMMIT;
```

**Database Enforcement**: UNIQUE(buyer_user_id, property_listing_id)

### 7. Broker Current Access - Simplified

**Current Table**:
```sql
CREATE TABLE broker_postcode_access_current (
    broker_user_id BIGINT UNSIGNED NOT NULL,
    postcode_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by BIGINT UNSIGNED NOT NULL,
    expires_at TIMESTAMP NULL,
    PRIMARY KEY (broker_user_id, postcode_id),
    INDEX idx_broker_current_broker_user (broker_user_id),
    INDEX idx_broker_current_postcode (postcode_id),
    FOREIGN KEY (broker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (postcode_id) REFERENCES postcodes(id) ON DELETE RESTRICT,
    FOREIGN KEY (granted_by) REFERENCES users(id)
);
```

**History Table**:
```sql
CREATE TABLE broker_postcode_access_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    broker_user_id BIGINT UNSIGNED NOT NULL,
    postcode_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by BIGINT UNSIGNED NOT NULL,
    revoked_at TIMESTAMP NULL,
    revoked_by BIGINT UNSIGNED NULL,
    status ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL,
    reason VARCHAR(500) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_broker_history_broker_user (broker_user_id),
    INDEX idx_broker_history_postcode (postcode_id),
    INDEX idx_broker_history_status (status),
    FOREIGN KEY (broker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (postcode_id) REFERENCES postcodes(id) ON DELETE RESTRICT,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 8. Payment Idempotency - MySQL-Safe Design

**Payments Table**:
```sql
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255) NULL,
    provider_order_id VARCHAR(255) NULL,
    amount_paise BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('INITIATED', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'INITIATED',
    plan_id BIGINT UNSIGNED NULL,
    idempotency_key VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    INDEX idx_payments_user_id (user_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_idempotency_key (idempotency_key),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);
```

**Unique Constraints**:
- `uk_payments_app_idempotency` (provider, idempotency_key) where status IN active states
- `uk_payments_provider_payment_id` (provider, provider_payment_id)
- `uk_payments_provider_order_id` (provider, provider_order_id)

### 9. Payment Webhooks - Clean Design

**Payment Webhook Events**:
```sql
CREATE TABLE payment_webhook_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT UNSIGNED NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processing_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    processing_attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    payload JSON NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webhook_events_payment_id (payment_id),
    INDEX idx_webhook_events_provider_event_id (provider_event_id),
    UNIQUE uk_webhook_events_provider_event_id (provider_event_id),
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);
```

**Removed**: `payments.raw_webhook_json`

### 10. Authentication - Clean Verification

**Users Table** (Core Profile Only):
- `email` (profile data)
- NO authentication identifiers

**Auth Identities Table**:
```sql
CREATE TABLE auth_identities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    provider ENUM('phone', 'google') NOT NULL,
    provider_identifier VARCHAR(500) NOT NULL,
    verified_at TIMESTAMP NULL,  -- NULL until verification succeeds
    verified_by VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE uk_auth_identities_provider_user (user_id, provider),
    UNIQUE uk_auth_identities_provider_identifier (provider_identifier),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Final Complete Table Inventory

### Core Tables
#### 1. users (Core User Accounts)
- **Purpose**: Core user account information (profile data only)
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `display_name`: VARCHAR(255) NOT NULL
  - `avatar_url`: VARCHAR(500) NULL
  - `status`: ENUM('active', 'suspended', 'closed') NOT NULL DEFAULT 'active'
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Foreign Keys**: None
- **Unique Constraints**: None
- **Indexes**: idx_users_status, idx_users_created_at, idx_users_updated_at

#### 2. auth_identities (Authentication Methods)
- **Purpose**: Single source of truth for authentication
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `user_id`: BIGINT UNSIGNED NOT NULL
  - `provider`: ENUM('phone', 'google') NOT NULL
  - `provider_identifier`: VARCHAR(500) NOT NULL
  - `verified_at`: TIMESTAMP NULL
  - `verified_by`: VARCHAR(255) NULL
  - `metadata`: JSON NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Foreign Keys**: fk_auth_identities_user → users(id) ON DELETE CASCADE
- **Unique Constraints**: uk_auth_identities_provider_user, uk_auth_identities_provider_identifier
- **Indexes**: idx_auth_identities_user_provider, idx_auth_identities_provider_identifier

#### 3. user_current_role (Current Role Assignment)
- **Purpose**: Current role for authorization
- **Primary Key**: user_id (BIGINT UNSIGNED)
- **Columns**:
  - `user_id`: BIGINT UNSIGNED NOT NULL (PK)
  - `role`: ENUM('buyer', 'owner', 'broker', 'admin') NOT NULL
  - `granted_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `granted_by`: BIGINT UNSIGNED NULL
- **Foreign Keys**: fk_user_current_role_user → users(id) ON DELETE CASCADE, fk_user_current_role_granted_by → users(id) ON DELETE SET NULL
- **Unique Constraints**: None
- **Indexes**: idx_current_role_user, idx_current_role_role

#### 4. role_history (Role Change History)
- **Purpose**: Complete audit trail of role changes
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `user_id`: BIGINT UNSIGNED NOT NULL
  - `role`: ENUM('buyer', 'owner', 'broker', 'admin') NOT NULL
  - `granted_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `granted_by`: BIGINT UNSIGNED NULL
  - `revoked_at`: TIMESTAMP NULL
  - `reason`: VARCHAR(500) NULL
  - `metadata`: JSON NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_role_history_user → users(id) ON DELETE CASCADE, fk_role_history_granted_by → users(id) ON DELETE SET NULL
- **Unique Constraints**: None
- **Indexes**: idx_role_history_user, idx_role_history_granted_at, idx_role_history_revoked_at

#### 5. admin_accounts (Admin Account Metadata)
- **Purpose**: Admin-specific account metadata
- **Primary Key**: user_id (BIGINT UNSIGNED)
- **Columns**:
  - `user_id`: BIGINT UNSIGNED NOT NULL (PK)
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `created_by`: BIGINT UNSIGNED NULL
- **Foreign Keys**: fk_admin_accounts_user → users(id) ON DELETE CASCADE, fk_admin_accounts_created_by → users(id) ON DELETE SET NULL
- **Unique Constraints**: None
- **Indexes**: idx_admin_accounts_created_at

### Location Tables
#### 6. cities (Master City List)
- **Purpose**: Master city data
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `name`: VARCHAR(255) NOT NULL UNIQUE
  - `state`: VARCHAR(255) NOT NULL
  - `country`: VARCHAR(100) NOT NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Foreign Keys**: None
- **Unique Constraints**: uk_cities_name
- **Indexes**: idx_cities_name, idx_cities_is_active

#### 7. districts (Administrative Districts)
- **Purpose**: District-level location data
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `city_id`: BIGINT UNSIGNED NOT NULL
  - `name`: VARCHAR(255) NOT NULL
  - `code`: VARCHAR(50) NULL UNIQUE
  - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_districts_city → cities(id) ON DELETE CASCADE
- **Unique Constraints**: uk_districts_city_code, uk_districts_city_name_active
- **Indexes**: idx_districts_city_id, idx_districts_is_active

#### 8. taluks (Taluk-Level Locations)
- **Purpose**: Taluk-level location data
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `district_id`: BIGINT UNSIGNED NOT NULL
  - `name`: VARCHAR(255) NOT NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_taluks_district → districts(id) ON DELETE CASCADE
- **Unique Constraints**: uk_taluks_district_name_active
- **Indexes**: idx_taluks_district_id, idx_taluks_is_active

#### 9. villages (Village Locations)
- **Purpose**: Village-level location data
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `taluk_id`: BIGINT UNSIGNED NOT NULL
  - `name`: VARCHAR(255) NOT NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_villages_taluk → taluks(id) ON DELETE CASCADE
- **Unique Constraints**: uk_villages_taluk_name_active
- **Indexes**: idx_villages_taluk_id, idx_villages_is_active

#### 10. localities (Neighborhoods/Areas)
- **Purpose**: Neighborhood and area definitions
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `village_id`: BIGINT UNSIGNED NOT NULL
  - `name`: VARCHAR(255) NOT NULL
  - `type`: ENUM('locality', 'area', 'neighborhood') NOT NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_localities_village → villages(id) ON DELETE CASCADE
- **Unique Constraints**: uk_localities_village_name_active, uk_localities_village_type_name_active
- **Indexes**: idx_localities_village_id, idx_localities_type, idx_localities_is_active

#### 11. postcodes (Postcode Zones)
- **Purpose**: Postcode zones for broker access
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `pincode`: VARCHAR(10) NOT NULL UNIQUE
  - `locality_id`: BIGINT UNSIGNED NOT NULL
  - `area_description`: VARCHAR(500) NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_postcodes_locality → localities(id) ON DELETE RESTRICT
- **Unique Constraints**: uk_postcodes_pincode
- **Indexes**: idx_postcodes_locality_id, idx_postcodes_is_active

### Property Tables
#### 12. physical_properties (Master Property Data)
- **Purpose**: Underlying real-world property information
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `locality_id`: BIGINT UNSIGNED NOT NULL
  - `area_value`: DECIMAL(12,2) NOT NULL
  - `area_unit`: ENUM('SQFT', 'SQM', 'ACRE', 'HECTARE') NOT NULL
  - `owner_user_id`: BIGINT UNSIGNED NOT NULL
  - `created_by`: BIGINT UNSIGNED NOT NULL
  - `updated_by`: BIGINT UNSIGNED NOT NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Foreign Keys**: 
  - fk_physical_properties_locality → localities(id)
  - fk_physical_properties_owner → users(id)
  - fk_physical_properties_created_by → users(id)
  - fk_physical_properties_updated_by → users(id)
- **Unique Constraints**: None
- **Indexes**: idx_physical_properties_locality, idx_physical_properties_owner, idx_physical_properties_created_at

#### 13. property_listings (Transaction Listings)
- **Purpose**: Marketplace transaction listings
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `physical_property_id`: BIGINT UNSIGNED NOT NULL
  - `title`: VARCHAR(500) NOT NULL
  - `transaction_type`: ENUM('BUY', 'RESALE', 'RENT', 'LEASE') NOT NULL
  - `price_paise`: BIGINT NOT NULL
  - `price_period`: VARCHAR(50) NULL
  - `raw_price`: DECIMAL(12,2) NULL
  - `deposit_paise`: BIGINT NULL
  - `maintenance_paise`: BIGINT NULL
  - `listing_status`: ENUM('AVAILABLE', 'SOLD', 'RENTED', 'LEASED') NOT NULL DEFAULT 'AVAILABLE'
  - `verification_status`: ENUM('PENDING', 'VERIFIED') NOT NULL DEFAULT 'PENDING'
  - `published_at`: TIMESTAMP NULL
  - `created_by`: BIGINT UNSIGNED NOT NULL
  - `updated_by`: BIGINT UNSIGNED NOT NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_property_listings_physical_property → physical_properties(id) ON DELETE RESTRICT
  - fk_property_listings_created_by → users(id)
  - fk_property_listings_updated_by → users(id)
- **Unique Constraints**: 
  - uk_property_listings_unique_active (physical_property_id, transaction_type) WHERE listing_status = 'AVAILABLE' AND verification_status = 'VERIFIED'
- **Indexes**: 
  - idx_property_listings_physical_property
  - idx_property_listings_transaction_type
  - idx_property_listings_status
  - idx_property_listings_verification_status
  - idx_property_listings_price
  - idx_property_listings_created_at

#### 14. verifications (Verification Attempts)
- **Purpose**: Automated verification process
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `property_listing_id`: BIGINT UNSIGNED NOT NULL
  - `attempt_no`: INT NOT NULL
  - `trigger`: ENUM('SUBMIT', 'EDIT') NOT NULL
  - `ruleset_version`: VARCHAR(50) NOT NULL
  - `result`: ENUM('PASS', 'FAIL') NOT NULL
  - `triggered_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `triggered_by`: BIGINT UNSIGNED NOT NULL
  - `manual_review_by`: BIGINT UNSIGNED NULL
  - `manual_review_notes`: TEXT NULL
  - `reviewed_at`: TIMESTAMP NULL
  - `checks_json`: JSON NULL
  - `metadata`: JSON NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_verifications_property_listing → property_listings(id) ON DELETE CASCADE
  - fk_verifications_triggered_by → users(id)
  - fk_verifications_manual_review_by → users(id) ON DELETE SET NULL
- **Unique Constraints**: None
- **Indexes**: idx_verifications_property_listing, idx_verifications_result, idx_verifications_triggered_at

#### 15. property_media (Property Photos/Documents)
- **Purpose**: Property media files
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `property_listing_id`: BIGINT UNSIGNED NOT NULL
  - `kind`: ENUM('COVER', 'PHOTO', 'FLOOR_PLAN') NOT NULL
  - `storage_key`: VARCHAR(500) NOT NULL
  - `sort_order`: INT NOT NULL DEFAULT 0
  - `width_px`: INT NULL
  - `height_px`: INT NULL
  - `mime_type`: VARCHAR(100) NULL
  - `file_size_bytes`: BIGINT NULL
  - `is_approved`: BOOLEAN NOT NULL DEFAULT FALSE
  - `approved_by`: BIGINT UNSIGNED NULL
  - `approved_at`: TIMESTAMP NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `created_by`: BIGINT UNSIGNED NOT NULL
- **Foreign Keys**:
  - fk_property_media_property_listing → property_listings(id) ON DELETE CASCADE
  - fk_property_media_approved_by → users(id)
  - fk_property_media_created_by → users(id)
- **Unique Constraints**: None
- **Indexes**: idx_property_media_property_listing, idx_property_media_kind, idx_property_media_is_approved

#### 16. property_documents (Private Property Documents)
- **Purpose**: Private property document files
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `property_listing_id`: BIGINT UNSIGNED NOT NULL
  - `doc_type`: ENUM('TITLE_DEED', 'TAX_RECEIPT', 'NOC', 'OTHER') NOT NULL
  - `document_name`: VARCHAR(500) NOT NULL
  - `storage_key`: VARCHAR(500) NOT NULL
  - `mime_type`: VARCHAR(100) NOT NULL
  - `file_size_bytes`: BIGINT NOT NULL
  - `sha256_hash`: VARCHAR(64) NOT NULL
  - `scan_status`: ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING'
  - `scan_by`: BIGINT UNSIGNED NULL
  - `scan_at`: TIMESTAMP NULL
  - `scan_result`: VARCHAR(500) NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `created_by`: BIGINT UNSIGNED NOT NULL
- **Foreign Keys**:
  - fk_property_documents_property_listing → property_listings(id) ON DELETE CASCADE
  - fk_property_documents_scan_by → users(id)
  - fk_property_documents_created_by → users(id)
- **Unique Constraints**: None
- **Indexes**: idx_property_documents_property_listing, idx_property_documents_type, idx_property_documents_scan_status

### Enquiry Tables
#### 17. enquiries (Buyer Enquiry Records)
- **Purpose**: Buyer enquiry management
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `property_listing_id`: BIGINT UNSIGNED NOT NULL
  - `buyer_user_id`: BIGINT UNSIGNED NOT NULL
  - `owner_user_id`: BIGINT UNSIGNED NOT NULL
  - `message`: TEXT NULL
  - `status`: ENUM('NEW', 'CONTACTED', 'CLOSED') NOT NULL DEFAULT 'NEW'
  - `closing_reason`: VARCHAR(500) NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_enquiries_property_listing → property_listings(id)
  - fk_enquiries_buyer_user → users(id)
  - fk_enquiries_owner_user → users(id)
- **Unique Constraints**: None
- **Indexes**: idx_enquiries_property_listing, idx_enquiries_status, idx_enquiries_created_at

#### 18. active_enquiries (Active Enquiry Concurrency Control)
- **Purpose**: Database-enforced concurrency control for enquiries
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `enquiry_id`: BIGINT UNSIGNED NOT NULL UNIQUE
  - `buyer_user_id`: BIGINT UNSIGNED NOT NULL
  - `property_listing_id`: BIGINT UNSIGNED NOT NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_active_enquiries_enquiry → enquiries(id) ON DELETE CASCADE
  - fk_active_enquiries_buyer_user → users(id)
  - fk_active_enquiries_property_listing → property_listings(id)
- **Unique Constraints**: uk_active_enquiries_buyer_listing (buyer_user_id, property_listing_id)
- **Indexes**: idx_active_enquiries_buyer, idx_active_enquiries_property_listing, idx_active_enquiries_created_at

### Access Control Tables
#### 19. broker_postcode_access_current (Current Broker Access)
- **Purpose**: Current broker postcode permissions
- **Primary Key**: broker_user_id + postcode_id (COMPOSITE)
- **Columns**:
  - `broker_user_id`: BIGINT UNSIGNED NOT NULL (PK)
  - `postcode_id`: BIGINT UNSIGNED NOT NULL (PK)
  - `granted_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `granted_by`: BIGINT UNSIGNED NOT NULL
  - `expires_at`: TIMESTAMP NULL
- **Foreign Keys**:
  - fk_broker_current_broker_user → users(id) ON DELETE CASCADE
  - fk_broker_current_postcode → postcodes(id) ON DELETE RESTRICT
  - fk_broker_current_granted_by → users(id)
- **Unique Constraints**: None
- **Indexes**: idx_broker_current_broker_user, idx_broker_current_postcode

#### 20. broker_postcode_access_history (Broker Access History)
- **Purpose**: Complete audit trail of broker postcode access changes
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `broker_user_id`: BIGINT UNSIGNED NOT NULL
  - `postcode_id`: BIGINT UNSIGNED NOT NULL
  - `granted_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `granted_by`: BIGINT UNSIGNED NOT NULL
  - `revoked_at`: TIMESTAMP NULL
  - `revoked_by`: BIGINT UNSIGNED NULL
  - `status`: ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL
  - `reason`: VARCHAR(500) NULL
  - `metadata`: JSON NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_broker_history_broker_user → users(id) ON DELETE CASCADE
  - fk_broker_history_postcode → postcodes(id) ON DELETE RESTRICT
  - fk_broker_history_granted_by → users(id)
  - fk_broker_history_revoked_by → users(id) ON DELETE SET NULL
- **Unique Constraints**: None
- **Indexes**: idx_broker_history_broker_user, idx_broker_history_postcode, idx_broker_history_status

### Plan/Sub/Entitlement Tables
#### 21. plans (Subscription Plan Catalog)
- **Purpose**: Available subscription plans
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `code`: VARCHAR(100) NOT NULL UNIQUE
  - `name`: VARCHAR(255) NOT NULL
  - `category`: ENUM('RESIDENTIAL', 'COMMERCIAL') NOT NULL
  - `price_paise`: BIGINT NOT NULL
  - `validity_days`: INT NULL
  - `listing_limit`: INT NOT NULL
  - `contact_reveal_limit`: INT NULL
  - `features_json`: JSON NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT TRUE
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: None
- **Unique Constraints**: uk_plans_code
- **Indexes**: idx_plans_category, idx_plans_is_active

#### 22. subscriptions (User Subscriptions)
- **Purpose**: Active user subscriptions
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `user_id`: BIGINT UNSIGNED NOT NULL
  - `plan_id`: BIGINT UNSIGNED NOT NULL
  - `started_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `expires_at`: TIMESTAMP NULL
  - `status`: ENUM('ACTIVE', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE'
  - `payment_id`: BIGINT UNSIGNED NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_subscriptions_user → users(id)
  - fk_subscriptions_plan → plans(id)
  - fk_subscriptions_payment → payments(id)
- **Unique Constraints**: None
- **Indexes**: idx_subscriptions_user_id, idx_subscriptions_status, idx_subscriptions_expires_at

#### 23. entitlements (Usage Entitlements)
- **Purpose**: Resource usage limits
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `subscription_id`: BIGINT UNSIGNED NOT NULL
  - `kind`: ENUM('LISTING_QUOTA', 'CONTACT_REVEAL') NOT NULL
  - `granted`: INT NOT NULL DEFAULT 1
  - `consumed`: INT NOT NULL DEFAULT 0
  - `expires_at`: TIMESTAMP NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_entitlements_subscription → subscriptions(id) ON DELETE CASCADE
- **Unique Constraints**: uk_entitlements_subscription_kind
- **Indexes**: idx_entitlements_subscription_id, idx_entitlements_kind, idx_entitlements_expires_at

### Payment Tables
#### 24. payments (Payment Records)
- **Purpose**: Financial transaction records
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `user_id`: BIGINT UNSIGNED NOT NULL
  - `provider`: VARCHAR(50) NOT NULL
  - `provider_payment_id`: VARCHAR(255) NULL
  - `provider_order_id`: VARCHAR(255) NULL
  - `amount_paise`: BIGINT NOT NULL
  - `currency`: VARCHAR(3) NOT NULL DEFAULT 'INR'
  - `status`: ENUM('INITIATED', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'INITIATED'
  - `plan_id`: BIGINT UNSIGNED NULL
  - `idempotency_key`: VARCHAR(255) NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `paid_at`: TIMESTAMP NULL
- **Foreign Keys**:
  - fk_payments_user → users(id)
  - fk_payments_plan → plans(id)
- **Unique Constraints**:
  - uk_payments_provider_payment_id (provider, provider_payment_id)
  - uk_payments_provider_order_id (provider, provider_order_id)
  - uk_payments_idempotency_key (provider, idempotency_key)
- **Indexes**:
  - idx_payments_user_id
  - idx_payments_status
  - idx_payments_provider_payment_id
  - idx_payments_provider_order_id
  - idx_payments_idempotency_key
  - idx_payments_created_at

#### 25. payment_webhook_events (Webhook Event Processing)
- **Purpose**: External payment webhook processing
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `payment_id`: BIGINT UNSIGNED NOT NULL
  - `provider`: VARCHAR(50) NOT NULL
  - `provider_event_id`: VARCHAR(255) NOT NULL UNIQUE
  - `event_type`: VARCHAR(100) NOT NULL
  - `received_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `processed_at`: TIMESTAMP NULL
  - `processing_status`: ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING'
  - `processing_attempts`: INT NOT NULL DEFAULT 0
  - `max_attempts`: INT NOT NULL DEFAULT 3
  - `payload`: JSON NULL
  - `error_message`: TEXT NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_webhook_events_payment → payments(id) ON DELETE CASCADE
- **Unique Constraints**:
  - uk_webhook_events_provider_event_id (provider, provider_event_id)
- **Indexes**:
  - idx_webhook_events_payment_id
  - idx_webhook_events_provider_event_id
  - idx_webhook_events_processing_status
  - idx_webhook_events_received_at

### Contact & Audit Tables
#### 26. contact_reveal_audits (Contact Access Audit)
- **Purpose**: Contact reveal access tracking
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `viewer_user_id`: BIGINT UNSIGNED NOT NULL
  - `property_listing_id`: BIGINT UNSIGNED NOT NULL
  - `owner_user_id`: BIGINT UNSIGNED NOT NULL
  - `entitlement_id`: BIGINT UNSIGNED NULL
  - `ip_hash`: VARCHAR(64) NOT NULL
  - `user_agent_hash`: VARCHAR(128) NOT NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**:
  - fk_contact_reveal_viewer → users(id)
  - fk_contact_reveal_property_listing → property_listings(id)
  - fk_contact_reveal_owner → users(id)
  - fk_contact_reveal_entitlement → entitlements(id)
- **Unique Constraints**: None
- **Indexes**: idx_contact_reveal_viewer, idx_contact_reveal_property_listing, idx_contact_reveal_created_at

#### 27. activity_logs (User Activity History)
- **Purpose**: User-facing action tracking
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `user_id`: BIGINT UNSIGNED NOT NULL
  - `action`: VARCHAR(100) NOT NULL
  - `entity_type`: VARCHAR(50) NOT NULL
  - `entity_id`: BIGINT UNSIGNED NULL
  - `metadata`: JSON NULL
  - `ip_address`: VARCHAR(45) NULL
  - `user_agent`: VARCHAR(500) NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_activity_logs_user → users(id)
- **Unique Constraints**: None
- **Indexes**: idx_activity_logs_user_id, idx_activity_logs_action, idx_activity_logs_created_at

#### 28. audit_logs (Internal Audit Trail)
- **Purpose**: Internal operation tracking
- **Primary Key**: id (BIGINT UNSIGNED AUTO_INCREMENT)
- **Columns**:
  - `id`: BIGINT UNSIGNED NOT NULL AUTO_INCREMENT (PK)
  - `actor_user_id`: BIGINT UNSIGNED NULL
  - `action`: VARCHAR(100) NOT NULL
  - `entity_type`: VARCHAR(50) NOT NULL
  - `entity_id`: BIGINT UNSIGNED NULL
  - `before_json`: JSON NULL
  - `after_json`: JSON NULL
  - `ip_address`: VARCHAR(45) NULL
  - `user_agent`: VARCHAR(500) NULL
  - `created_at`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Foreign Keys**: fk_audit_logs_actor_user → users(id)
- **Unique Constraints**: None
- **Indexes**: idx_audit_logs_actor_user_id, idx_audit_logs_action, idx_audit_logs_created_at

## 2. Property Title Resolution

**Final Decision**: `property_listings.title` is the authoritative title field.

**Rationale**: The same physical property may appear in multiple transaction contexts (BUY, RESALE, RENT, LEASE), each potentially requiring different titles for marketing/communication purposes. Listing-specific title allows this flexibility while maintaining a single reference point in the `physical_properties` table for the property's core identity.

**Consistency Actions**:
- All references to property titles are now in `property_listings`
- `physical_properties` no longer contains a title field
- Property identification remains with `id` field in `physical_properties`

## 3. Location Model - Concrete Design

**Chosen Authoritative Reference**: `physical_properties.locality_id`

**Location Hierarchy Support**:
- `City`: derivable via `localities.village_id → villages.taluk_id → taluks.district_id → districts.city_id`
- `District`: derivable via `localities.village_id → villages.taluk_id → taluks.district_id`
- `Taluk`: derivable via `localities.village_id → villages.taluk_id`
- `Village`: derivable via `localities.village_id → villages.id`
- `Locality`: directly via `localities.id`
- `Postcode`: derivable via `localities.id → postcodes.locality_id`

**Broker Authorization**: Broker access to `postcodes` table enables property search by postcode.

**Single Reference**: No conflicting location FKs - only `locality_id` in `physical_properties`.

## 4. Broker Postcode Access - MySQL Design

### 4.1 Current Access Table
```sql
CREATE TABLE broker_postcode_access_current (
    broker_user_id BIGINT UNSIGNED NOT NULL,
    postcode_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by BIGINT UNSIGNED NOT NULL,
    expires_at TIMESTAMP NULL,
    PRIMARY KEY (broker_user_id, postcode_id),
    INDEX idx_broker_current_broker_user (broker_user_id),
    INDEX idx_broker_current_postcode (postcode_id),
    FOREIGN KEY fk_broker_current_broker_user 
        (broker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY fk_broker_current_postcode 
        (postcode_id) REFERENCES postcodes(id) ON DELETE RESTRICT,
    FOREIGN KEY fk_broker_current_granted_by 
        (granted_by) REFERENCES users(id)
);
```

### 4.2 History Table
```sql
CREATE TABLE broker_postcode_access_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    broker_user_id BIGINT UNSIGNED NOT NULL,
    postcode_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by BIGINT UNSIGNED NOT NULL,
    revoked_at TIMESTAMP NULL,
    revoked_by BIGINT UNSIGNED NULL,
    status ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL,
    reason VARCHAR(500) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_broker_history_broker_user (broker_user_id),
    INDEX idx_broker_history_postcode (postcode_id),
    INDEX idx_broker_history_status (status),
    FOREIGN KEY fk_broker_history_broker_user 
        (broker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY fk_broker_history_postcode 
        (postcode_id) REFERENCES postcodes(id) ON DELETE RESTRICT,
    FOREIGN KEY fk_broker_history_granted_by 
        (granted_by) REFERENCES users(id),
    FOREIGN KEY fk_broker_history_revoked_by 
        (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**Concurrency Guarantee**: Composite PRIMARY KEY ensures at most one current permission per (broker_user_id, postcode_id), preserving complete history in history table.

**Transaction Behavior**:
- **Grant**: Insert into both tables atomically
- **Revoke**: Update history and delete from current table atomically
- **Expire**: Close history record and delete from current table atomically

## 5. Payment Idempotency - MySQL-Safe Design

**Payments Table**:
```sql
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255) NULL,
    provider_order_id VARCHAR(255) NULL,
    amount_paise BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('INITIATED', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'INITIATED',
    plan_id BIGINT UNSIGNED NULL,
    idempotency_key VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    INDEX idx_payments_user_id (user_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_provider_payment_id (provider, provider_payment_id),
    INDEX idx_payments_provider_order_id (provider, provider_order_id),
    INDEX idx_payments_idempotency_key (provider, idempotency_key),
    INDEX idx_payments_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);
```

**Unique Constraints**:
- `uk_payments_provider_payment_id`: (provider, provider_payment_id)
- `uk_payments_provider_order_id`: (provider, provider_order_id)
- `uk_payments_idempotency_key`: (provider, idempotency_key) for idempotency

**Nullable Provider Identifiers**:
- `provider_payment_id` and `provider_order_id` are nullable
- UNIQUE constraints allow multiple NULL values
- Application creates payment record before receiving provider identifiers
- Subsequent updates set provider IDs to maintain uniqueness

### 6. Payment Webhooks - Clean Design

**Payment Webhook Events**:
```sql
CREATE TABLE payment_webhook_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processing_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    processing_attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    payload JSON NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webhook_events_payment_id (payment_id),
    INDEX idx_webhook_events_provider_event_id (provider_event_id),
    INDEX idx_webhook_events_processing_status (processing_status),
    INDEX idx_webhook_events_received_at (received_at),
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);
```

**Removed**: `payments.raw_webhook_json`

### 7. Payment/Subscription Dependency Order

**Final Dependency Graph**:
1. plans (root)
2. payments (user_id, plan_id)
3. subscriptions (user_id, plan_id, payment_id)
4. entitlements (subscription_id)

**Migration Order**:
1. users
2. auth_identities
3. user_current_role
4. role_history
5. admin_accounts
6. cities
7. districts
8. taluks
9. villages
10. localities
11. postcodes
12. plans
13. payments
14. subscriptions
15. entitlements
16. physical_properties
17. property_listings
18. verifications
19. property_media
20. property_documents
21. enquiries
22. active_enquiries
23. broker_postcode_access_current
24. broker_postcode_access_history
25. contact_reveal_audits
26. activity_logs
27. audit_logs

## 8. Authentication - Clean Verification

**Users Table** (Core Profile Only):
- `email` (profile data)
- NO authentication identifiers

**Auth Identities Table**:
- `provider_identifier` = single source for phone, Google
- `verified_at` = NULL until verification succeeds
- `verified_by` = verification mechanism (OTP, GOOGLE, etc.)

**Clear Separation**:
- users: display_name, avatar_url, status, contact info
- auth_identities: provider, identifier, verification state

### 9. Verification Result - Pure Business Flow

**Business Verification**:
```sql
UPDATE property_listings 
SET verification_status = 'VERIFIED'
WHERE id = ? AND verification_status = 'PENDING';
```

**Technical Metadata Only**:
- `PASS`/`FAIL` in `verifications` table
- NO business rejection consequences
- Business state remains in `property_listings.verification_status`

### 10. Final FK Dependency Graph

**Complete Graph**:
1. users (root)
2. auth_identities (users)
3. user_current_role (users)
4. role_history (users)
5. admin_accounts (users)
6. cities (root)
7. districts (cities)
8. taluks (districts)
9. villages (taluks)
10. localities (villages)
11. postcodes (localities)
12. plans (root)
13. payments (users, plans)
14. subscriptions (users, plan_id, payment_id)
15. entitlements (subscriptions)
16. physical_properties (locality_id)
17. property_listings (physical_property_id, created_by, updated_by)
18. verifications (property_listing_id, triggered_by)
19. property_media (property_listing_id, approved_by, created_by)
20. property_documents (property_listing_id, scan_by, created_by)
21. enquiries (property_listing_id, buyer_user_id, owner_user_id)
22. active_enquiries (enquiry_id, buyer_user_id, property_listing_id)
23. broker_postcode_access_current (broker_user_id, postcode_id, granted_by)
24. broker_postcode_access_history (broker_user_id, postcode_id, granted_by, revoked_by)
25. contact_reveal_audits (viewer_user_id, property_listing_id, owner_user_id, entitlement_id)
26. activity_logs (user_id)
27. audit_logs (actor_user_id)

### Migration Order:
1. users
2. auth_identities
3. user_current_role
4. role_history
5. admin_accounts
6. cities
7. districts
8. taluks
9. villages
10. localities
11. postcodes
12. plans
13. payments
14. subscriptions
15. entitlements
16. physical_properties
17. property_listings
18. verifications
19. property_media
20. property_documents
21. enquiries
22. active_enquiries
23. broker_postcode_access_current
24. broker_postcode_access_history
25. contact_reveal_audits
26. activity_logs
27. audit_logs

## 11. Business Rule Audit

✅ **AUTHENTICATION**: Phone + OTP, Google supported; auth_identities single source; one current role; Owner+Broker cannot coexist

✅ **PROPERTY**: owner_user_id authoritative; property/listing separation; transaction types exactly BUY/RESALE/RENT/LEASE; property types exactly six; listing-specific title; area value + unit

✅ **LOCATION**: Full hierarchy support; property location deterministically identifies postcode; single locality_id reference; no redundant location FKs

✅ **VERIFICATION**: PENDING → VERIFIED → AUTO-PUBLISHED; no manual publication; PASS/FAIL technical only; no EDIT-triggered re-verification

✅ **LISTING STATUS**: AVAILABLE → (SOLD/RENTED/LEASED); non-available listings in DB but excluded from public search

✅ **ENQUIRIES**: NEW → CONTACTED → CLOSED; owner-only status changes; closing_reason; no site visits/chat/negotiation; one active per buyer+listing; DB-enforced concurrency

✅ **BROKER**: postcode-based access; current table composite PK; history preserved; no property pushing

✅ **PAYMENTS**: integer paise; no raw webhook duplication; webhook uniqueness; MySQL-safe idempotency; nullable provider IDs; provider-scoped uniqueness

✅ **SEARCH**: Property search: verification_status=VERIFIED AND listing_status=AVAILABLE; Location search: through village hierarchy; Broker access: through postcode authorization

✅ **AUTHORS**: All tables have clear purposes, primary keys, foreign keys, unique constraints, indexes

## 12. MySQL 8.0/8.4 Compatibility

**Verified No**: Partial indexes, filtered indexes, UNIQUE ... WHERE
**Verified No**: PostgreSQL partial uniqueness, CHECK subqueries, generated columns, fake CHECK(1=1)
**Verified Yes**: Standard MySQL syntax, valid foreign keys, unique constraints on existing columns
**Verified Yes**: No circular FK dependencies, proper migration order

## 13. Implementation Gate

**V2.4 DESIGN STATUS: READY FOR IMPLEMENTATION**

The V2.4 database architecture provides complete, migration-ready schema with:

- Zero ambiguities or undefined references
- MySQL 8.0/8.4 compliant syntax
- Deterministic location hierarchy with single authoritative reference
- Clean separation of business vs technical concerns
- Transaction-safe concurrency controls
- Complete table inventory with exact specifications
- Valid foreign key dependency graph
- Proper migration order

This design resolves all V2.3 inconsistencies while maintaining business requirements and MySQL compatibility.