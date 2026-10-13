# Property Add/Edit Workflow — Phase 1 Review Report

## 1. Date

2026-10-12 (UTC).

## 2. Scope

Review-only. No implementation, no file modifications (except this report),
no commits, no pushes, no migrations, no DB writes, no photo uploads/deletes,
no OTP/auth behaviour changes. Both repos inspected read-only at:

- Frontend `Restamp-latest` @ `c257e46`, branch `integration/restamp-latest`
  tracking `ayati/main` (clean, synchronized).
- Backend `Restamp-backend` @ `b98c8e5`, branch `main` tracking
  `origin/main` (clean, synchronized).

No tests were executed in this phase; all findings below are from static
tracing. No test pass is claimed.

## 3. Summary of current implementation

- The seven-step Add form (`OwnerAddPropertyScreen.js`, steps defined
  `:62-70`) works for Add via `POST /owner/listings` + upload-after-publish
  to `POST /owner/listings/{id}/photos`. Server drafts (`listing_drafts`)
  back Save Draft.
- There is **no Edit mode**. Callers pass only `editingProperty` (a lossy
  display object) with no listing id/mode flag; the form partially hydrates
  ~15 fields and always submits via `createOwnerListing` (`POST`), so saving
  from Edit **creates a duplicate listing**. There is no
  `PUT/PATCH /owner/listings/{id}`, no `updateOwnerListing` client, no
  `OwnerListingUpdate` schema, no `update_owner_listing` service, and no
  photo delete/replace endpoint on either side (verified by grep: zero hits
  for `updateOwnerListing|OwnerListingUpdate|update_owner_listing|DELETE.*photo`
  in both repos).
- Both Back buttons currently share one step-decrement handler; top-left Back
  does **not** exit from steps > 1 today. Save Draft always saves (never
  exits); no Edit-specific exit behaviour exists. The reusable
  `ConfirmationModal` exists and backs the step-1 exit dialog — it can be
  reused, no new UI needed.
- Contact defaults are hardcoded demo values (`+91 98401 23456` /
  `rajesh.kumar@example.com`), not the authenticated profile. Pincode is
  generic 6-digit on both sides; **no Chennai allowlist exists anywhere**,
  and non-Chennai pincodes pass today.

## 4. Frontend files, components, functions, line references

All paths under `Restamp-latest/src/`.

- `screens/owner/OwnerAddPropertyScreen.js` (3636 lines) — the entire form.
  - Steps `RENT_STEPS :62-70` (Basic, Location, Details, Pricing/Rent,
    Photos & Details, Amenities, Review).
  - Mode/init: `purposeSelected :217-219` (dead after init),
    `currentStep :220-222` from `route.params.initialStep`,
    `lookingTo/category/propertyType/bhk :255-271`,
    `phoneNumber/email :272-277` (demo fallbacks),
    location `:280-290` (pincode `""` by design `:283-285`),
    details `:293-303`, pricing `:306-314`, photos/details `:317-324`
    (`photosList` defaults to `DEFAULT_SAMPLE_PHOTOS :317`),
    amenities `:327-346`.
  - Route hydration `useEffect :356-434`: edit hydrate `:381-416` (partial,
    see §6); draft hydrate `:419-433`.
  - Drafts: `collectFormSnapshot :438-455`, `FORM_DEFAULTS :457-474`,
    `normalizeDraftData :478-499`, `hydrateForm :501-550`,
    `hydrateFromServerDraft :564-576`,
    `handleSaveDraftPress({exitAfter}) :581-624`
    (POST-first/PUT-repeat + 404-fallback `:592-602`, silent success,
    `Alert` on failure `:619`).
  - Photos: `handlePickImages :637-683`, `handleRemovePhoto :685-701`,
    `handleSetCoverPhoto :703-710`, `handleMovePhoto :712-720`.
  - Validation/nav: `validateStep :723-797` (phone/email `:727-732`,
    pincode `/^\d{6}$/ :748`, required/photo/description checks),
    `handleNext :799-809`, `handleBack :811-818`
    (step>1 → `step-1`, step 1 → exit modal).
  - Submit: `uploadPickedPhotos :833-851`,
    `orderedUploadsFor :853-859` (cover-first, local-only),
    `finishPublishSuccess :861-905` (re-fetch detail `:867`, `addProperty`,
    delete draft only on success `:892-896`),
    `failUploadsStayOnReview :911-928` (stays on Review, retry),
    `handlePublishProperty :930-1146` (pincode gate `:936-952`,
    steps 1–5 loop `:955-964`, subscription gate `:967-974`,
    `newProperty` build `:986-1062`, retry branch `:1071-1099`,
    `createOwnerListing :1100`, uploads `:1108-1120`).
  - Chrome: header top-left Back `:1195-1201`, Save Draft btn `:1216-1237`
    (disabled when clean `:1222`), dirty memo `isDraftDirty :1169-1186`,
    pincode inputs `:1429-1440` + Review duplicate `:2379-2391`,
    bottom bar Back+Next/Publish `:2574-2616`,
    exit `ConfirmationModal :2778-2802` (Save & Exit vs Discard→Dashboard),
    renew modal `:2816-2828`.
- `screens/owner/OwnerPropertiesScreen.js`
  - `handleEditProperty :193-195` → `navigate("Add", {editingProperty})`;
    `handleResubmit :272-277` → same + `initialStep: 5`;
    `handleContinueDraft :264-270` → `navigate("Add", {draftId, draft})`.
- `components/owner/OwnerPropertyCard.js :193-276` — kebab Edit/Resubmit/
  Continue affordances; pending hides Edit (`isPending :265`).
- `screens/owner/OwnerPropertyDetailModal.js :56-61, :384-391` — Edit Listing
  button forwards property object, no id/mode.
- `screens/owner/OwnerDashboardScreen.js :100-102` — Add only, no Edit path.
- `navigation/OwnerNavigator.js :104-112` (`Add` screen, tab bar hidden),
  `navigation/AppNavigator.js :191-192`.
- `api/owner.js` (555 lines)
  - `buildPayload :29-273` (tx map `:32-42`, type map `:46-67`, price `:70-74`,
    **pincode required + throw `:95-99`**, location `:100-102`,
    contact `:160-162`, rent_terms `:193-211`, photos `:219-224`).
  - `createOwnerListing :280-283` (`POST /owner/listings`);
    `fetchOwnerListings :502-504`, `fetchOwnerListing :511-513`
    (`GET /owner/listings[/{id}]`);
    `toOwnerProperty :519-554` (lossy display mapper, see §6).
  - Photos: `uploadListingPhoto :379-413`
    (`POST /owner/listings/{id}/photos`), `isLocalPhotoUri :419-427`,
    `syncIdSetWithPhotos :434-437`, `pendingLocalPhotos :445-450`,
    `normalizeUploadFile :312-332`, `toUploadableFile :346-370`.
  - Drafts: `createDraft :460-462`, `updateDraft :467-471`,
    `fetchDraft(s) :476-486`, `deleteDraft :491-494`. No listing PUT/PATCH
    or photo DELETE exists in `src` (only `POST` `:282`, `POST photos :387`,
    `GET`s `:503,512` match `owner/listings`).
- `context/OwnerContext.js :537-546` — hardcoded demo `ownerProfile`
  (`phone "+91 98401 23456" :540`, `email "rajesh.kumar@example.com" :541`).
- `context/AuthContext.js :22-53` — real identity source (`phone` from OTP
  `:23`, `email: null :49`); never wired to the form.
- `components/owner/ConfirmationModal.js :5-65` — reusable
  `{visible,title,message,confirmText,cancelText,onConfirm,onCancel}` dialog.

## 5. Backend routes, schemas, services, models, line references

All paths under `Restamp-backend/app/`.

- `routers/owner.py` (286 lines, prefix `/owner :22`). No listing PUT/PATCH
  or photo DELETE exists.
  - `POST /owner/listings` → `create_listing :25-94` (OWNER-only `:29`,
    `price_rupees*100 :32`, `create_owner_listing :34-82`, commit on success
    `:87`, `ValueError→422 :83-86`).
  - `GET /owner/listings` → `list_my_listings :97-106`.
  - `GET /owner/listings/{id}` → `get_my_listing :109-119` (own-only 404).
  - `POST /owner/listings/{id}/photos` → `upload_listing_photo :122-203`
    (category required `:141-143`, MIME+ext `:145`, 10 MB stream cap
    `:150-159`, Cloudinary `:167-169`, append-only cover rule `:134-135`,
    orphan destroy `:186-193`, `is_cover = order_index==0 :202`).
  - Drafts: `POST /drafts :211-227` (always inserts), `GET /drafts :230-237`,
    `GET /drafts/{id} :240-250`, `PUT /drafts/{id} :253-273` (conditional
    merge, not true replace), `DELETE /drafts/{id} :276-286`. All owner-scoped
    (cross-owner → 404).
- `schemas.py` (692 lines). No `OwnerListingUpdate`.
  - `OwnerListingCreate :362-541`: `title` required; `transaction_type`
    (`BUY/RESALE/RENT/LEASE :417-423`); `property_type` (6 values `:425-431`);
    `price_rupees` required `ge1 :368`; `pincode` required `/^\d{6}$/ :376`;
    `district` blank→422 `:451-459`; `floor_on` vs `total_floors` check
    `:535-541`; enums for age/furnishing/open-sides/overlooking/power/facing/
    ownership/periods/tenant/lock-in/agreement (`:461-516`); `contact_phone`
    via `normalize_indian_phone :246-266` + validator `:518-521`;
    `contact_email` regex `:186` + validator `:523-533` (empty→422);
    `rent_terms :408` (`RentTermsIn :287-330`); amenities/features/rooms
    (names only `:410-412`); `images :414` vs `photos :415`
    (`ListingPhotoIn :333-346`, 7 categories `:349-359`).
  - `OwnerListingOut :564-617`, `RentTermsOut :544-554`,
    `PhotoUploadOut :627-636`, Draft schemas `:639-692`.
- `services/owner_listings.py` (796 lines). No `update_owner_listing`.
  - `create_owner_listing :221-377`: always inserts `PhysicalProperty :311`
    + `PropertyListing(PENDING/AVAILABLE/now) :314-331`, optional `RentTerms`
    **only if RENT** `:339`, `PropertyMedia :356-365`, amenity links
    `:369-374`. No dedupe/idempotency — every call = new rows.
  - `_find_or_create_postcode :60-151` (exact-pincode wins `:70-72`,
    locality fallback, auto-creates full City→Postcode chain);
    `_resolve_amenity_ids :159-187` (unknown→422, whole create rolls back);
    `_normalize_media_items :190-218` (photos preferred, legacy images
    ignored when photos present).
  - Reads `_owner_listing_query :475-523`, `_row_to_dict :523-578`,
    rent/amenity/media maps `:578-643`; auto-verify PENDING→VERIFIED after
    2 min on read `:433-467`.
  - Photos `add_listing_photo :385-431` (append-only, cover never reset).
  - Drafts `:700-795` (create/list/get/conditional-update/delete).
- `models/properties.py` (13 lines): `physical_properties :6`
  (address/areas/bedrooms/floors/duplex/age/sub-locality/society/house/
  landmark/lat-lng/furnishing/parking/sides/overlooking/power/facing/
  ownership), `property_listings :7` (title/price_paise/period/description/
  construction/verification/listing-status/submitted_at/contact_phone-email/
  closed_reason/`transaction_type` = purpose / `property_type` = category-type),
  `rent_terms :11` (1:1), `property_media :9` (url/category/mime/size/order),
  `amenity_master :12` + `listing_amenities :13`, `listing_drafts :14`.
- `models/locations.py :6-11`: cities→districts→taluks→villages→localities→
  postcodes (`pincode UNIQUE`, no CHECK).
- `services/photo_storage.py :47-90` (Cloudinary-only, fails closed without
  config, best-effort orphan destroy) vs legacy local `services/storage.py`
  (MIME/ext/size validation reused by the route; local save path dead).
- `alembic/versions/`: chain ends at head `d5e6f7a8b9c0_listing_drafts.py`
  (drafts only). Listing/photo columns already exist (`f1a2…` 20 cols,
  `a2b3…` rent/amenities, `b3c4…` media lifecycle, `c4d5…` ownership_type).

## 6. Current Add flow and Edit flow, including API calls

### Add flow (working)

1. Enter via Dashboard Add (`OwnerDashboardScreen.js :100-102`) or Publish
   Success Add Another (passes `editingProperty: null`).
2. Fill steps 1–7; per-step `validateStep`, `handleNext`; header Save Draft
   → `POST /owner/drafts` then `PUT /owner/drafts/{id}`; exit-step-1 dialog
   → Save & Exit or Discard→Dashboard.
3. Review → `handlePublishProperty`: pincode gate, steps 1–5 revalidation,
   subscription gate, `buildPayload(newProperty)` (throws on bad pincode),
   `POST /owner/listings` → `listing_id`; local `file://` photos excluded
   from payload, uploaded sequentially cover-first via
   `POST /owner/listings/{id}/photos`; failures stay on Review with
   `pendingListingId` + retry (never re-POSTs the listing); success →
   `GET /owner/listings/{id}` re-fetch, `addProperty`, best-effort
   `DELETE /owner/drafts/{draftId}`, navigate Publish Success.

### Edit flow (broken — creates duplicates)

1. Enter via `OwnerPropertiesScreen handleEditProperty :193-195`
   (`navigate Add {editingProperty}`), `handleResubmit` (+`initialStep: 5`),
   detail modal Edit, or leads screens — all pass the same lossy display
   object, never a listing id or mode flag.
2. Form hydrates only (`OwnerAddPropertyScreen.js :381-416`):
   lookingTo/category/propertyType/bhk/city/district/locality/
   pincode|postalCode/subLocality/carpetArea(price→monthlyRent,
   deposit→securityDeposit, maintenance, availableFrom, furnishing,
   http-only `images`→photosList with forced `category: "Living Room"`).
   **Not hydrated:** phone/email, apartmentSociety, houseNo, landmark,
   bedrooms/bathrooms/balconies, builtUp/super/totalFloors/floorOn/duplex,
   availabilityStatus/propertyAge, maintenanceFrequency/rentNegotiable/
   tenantPreference/lockIn/agreement, otherRooms, covered/openParking,
   description, ownership/features/amenities/openSides/overlooking/
   powerBackup/facing. Root cause is twofold: the hydrate block omits them,
   **and** `toOwnerProperty :519-554` drops pincode/bhk/district/subLocality/
   society/houseNo/landmark/furnishing/floor/amenities/deposit/maintenance/
   contact, so live listings arrive lossy.
3. Submit takes the identical Add path (`createOwnerListing POST :1100`):
   new `physical_properties` + `property_listings` rows
   (PENDING/AVAILABLE, new `submitted_at`), media re-inserted from index 0,
   old row never closed. Duplicate creation is certain, not hypothetical.

## 7. Field-by-field frontend-to-database persistence matrix (Add)

`FE state → payload key → schema field → service/model destination → status`.
Verified against `owner.js :29-273`, `routers/owner.py :34-82`,
`services/owner_listings.py :221-377`, `models/properties.py`.

| # | Frontend state | Payload key | Schema → DB | Persisted? |
|---|---|---|---|---|
| 1 | lookingTo/purpose | transaction_type | `OwnerListingCreate.transaction_type` → `property_listings.transaction_type` | Yes (RENT/RESALE/BUY/LEASE) |
| 2 | category/propertyType | property_type | → `property_listings.property_type` (APARTMENT/VILLA/HOUSE/COMMERCIAL/PLOT/AGRI) | Yes (mapped; no separate category column) |
| 3 | bhk | bedrooms (digit-parse) | `bedrooms 0..99` → `physical_properties.bedrooms` | Yes, lossy (label→int) |
| 4 | monthlyRent/price | price_rupees | required `ge1` → `price_paise = *100` | Yes (`*100`; `<=0`→1) |
| 5 | lookingTo | price_period | MONTHLY if RENT/LEASE else TOTAL | Yes (derived) |
| 6 | title (derived `bhk+type`) | title | required → `property_listings.title` | Yes |
| 7 | description | description | `max5000` → `property_listings.description` | Yes |
| 8 | availabilityStatus | construction_status | READY/UNDER/NEW_LAUNCH → same col | Yes |
| 9 | city/district/locality/pincode | city/district/locality/pincode | pincode `/^\d{6}$/` required → resolved to `physical_properties.postcode_id` via chain lookup/auto-create | Normalized, not verbatim (exact-pincode-wins mismatch risk) |
| 10 | subLocality/apartmentSociety/houseNo/landmark | sub_locality/society_name/house_no/landmark | → `physical_properties.*` | Yes |
| 11 | houseNo+society+subLocality+locality | address_line | → `physical_properties.address_line` | Yes (concatenated) |
| 12 | carpetArea/builtUpArea | area_value (+built_up_area) | → `area_value` (+`built_up_area`) | Partial (carpet folded into area_value; see bug B5) |
| 13 | builtUpArea/superBuiltUpArea/totalFloors/floorOn/duplex/propertyAge | built_up_area/super/total_floors/floor_on/is_duplex/property_age_band | floor-vs-total check; **`is_duplex None→False`** (`owner_listings.py :294`) | Yes, except null duplex lost |
| 14 | bedrooms/bathrooms/balconies | same | → same cols | Yes |
| 15 | furnishing/coveredParking/openParking/openSides/overlooking/powerBackup/propertyFacing/ownership | same snake_case | enum-validated → same cols | Yes (invalid→422) |
| 16 | monthlyRent-derived deposit/maintenance + frequency/negotiable/availableFrom/tenant/lockIn/agreement | rent_terms{…} | `RentTermsIn` → `rent_terms` row **only if `transaction_type=="RENT"`** (`owner_listings.py :339`); else silently dropped | Conditional (non-RENT lost) |
| 17 | selectedAmenities/propertyFeatures/otherRooms | amenities/property_features/other_rooms | name-resolved (unknown→422, whole create rolls back) → `listing_amenities` links | Yes |
| 18 | phoneNumber/email | contact_phone/email | phone normalized to `+91…`, email regex; `None` allowed, `""`→422 | Yes |
| 19 | photosList remote `http` | photos[{url,category}] + legacy images[] | `photos` preferred; **`images` ignored when photos present** (`:196`); legacy rows get `mime/byte_size NULL` | Yes (order = array, cover = index 0) |
| 20 | photosList local `file://` | — (excluded) | uploaded post-create via photo endpoint → `property_media` with mime/size | Yes, via second API |
| 21 | verification/listing status | — (not sent) | server `PENDING/AVAILABLE/now` | Server-set |
| 22 | purposeSelected/mapLocationSet/modal flags/errors/isSubmitting | — | nowhere | UI-only, correctly unsent |

Edit column: every "Yes" above is **not updated** today — Edit re-POSTs a new
row instead. No field has a working update path.

## 8. Photo lifecycle and API findings

- Frontend distinguishes by URI: `isLocalPhotoUri` (`file://|content://|
  blob:|data:` at `owner.js :419-427`) = new; `http(s)` = existing/legacy.
  Picker (`handlePickImages :637-683`) mints `local-{ts}-{idx}` ids with
  `{uri, fileName, mimeType, fileSize, category, isCover: false}`; grid
  supports cover/move/delete with id-keyed retry queues (`:685-720`,
  `syncIdSetWithPhotos`, `pendingLocalPhotos`).
- Create payload carries **only** remote URLs (`buildPayload :125-128, :219-224`,
  `http`-only, max 20, cover unshifted); locals upload post-create,
  sequential, cover-first (`:833-859`, `:1108-1120`); retry reuses
  `pendingListingId` without re-POSTing (`:1071-1099`); success re-fetches
  server gallery (`finishPublishSuccess :867-874`); failures stay on Review
  with banner + `Alert` (`:911-928`, `:2200-2205`); deleting a failed photo
  clears the error (`:694-698`). Upload-failure false-success is already
  guarded (no success navigation until uploads resolve).
- Backend: only `POST /owner/listings/{id}/photos` (`owner.py :122-203`,
  Cloudinary, append-only, cover = `order_index 0` never reset). **No
  DELETE/PATCH photo, no gallery PUT, no reorder/cover service** — removal in
  Edit is client-only today and cannot persist; replace = delete+append which
  does not exist. Edit-with-changed-photos via re-POST duplicates media under
  a new listing id; via photo POST only appends (`order_index 1,2…`).
- Validation parity: frontend `normalizeUploadFile` (jpg/jpeg/png/webp,
  10 MB) matches backend `validate_image_upload` + stream cap; category must
  be one of 7 (route defaults `Living Room`, `None`→422 while DB allows NULL).

## 9. Back-button and Save Draft behaviour findings

- **B. Top-left Back** (`:1195-1201 → handleBack :811-818`): today steps down
  one step when `step > 1`; only on step 1 does it open the exit confirm.
  Required: exit the entire form immediately from **any** step in both modes.
  Smallest change: branch `handleBack` so the header button navigates away
  (reusing the existing exit confirm when `isDraftDirty`, direct exit when
  clean) instead of decrementing. Why: spec; test by asserting header press
  on steps 2/5/7 leaves the form. No new buttons/elements.
- **C. Bottom Back** (`:2575-2583`, rendered only `step > 1`, same handler):
  already steps back one step — keep as-is. Smallest change: none, except
  optionally sharing the handler after the header branch is split.
  Test by asserting bottom press on step n lands on n−1.
- **D. Save Draft**: today `handleSaveDraftPress :581-624` POST-first/
  PUT-repeat with 404 fallback, silent success, `Alert` on failure; header
  button `:1216-1237` stays on screen, disabled when clean. Required: Add
  keeps this; **Edit must exit the form instead of saving**, keeping button,
  label, style, position untouched. Smallest change: early branch on
  `isEditing` → navigate away (reusing `ConfirmationModal :2778-2802` when
  dirty, mirroring its Save & Exit vs Discard semantics) without calling
  draft APIs. Why: spec forbids draft saves in Edit; test Add-still-saves
  vs Edit-exits-without-POST/PUT.

## 10. Phone, email, and pincode validation findings

- **G. Contact:** source of truth today is the hardcoded demo profile
  (`OwnerContext.js :540-541`), consumed as
  `ownerProfile?.phone || "+91 98401 23456"` (`:272-274`) and equivalent
  email (`:275-277`) — fresh installs show demo contact even with an empty
  profile. The real authenticated identity (`AuthContext.js :22-23, :49`)
  is never wired in. Required: new listings prefill phone from authenticated
  profile or `""` (never demo), email starts `""`; Edit loads saved contact.
  Smallest change: `useState(ownerProfile?.phone ?? useAuth().user?.phone ?? "")`
  and `useState(ownerProfile?.email ?? "")` + default profile to `""`,
  removing the two string literals; hydrate adds `phone/email` from
  `editingProperty`/detail; submit keeps `contact.{phone,email}` wiring.
  Backend already accepts `None` and canonicalizes (`normalize_indian_phone`,
  email regex); note backend also accepts generic `+E.164` 6–15-digit numbers
  and `None` — product to confirm whether contact phone is required.
- **H. Pincode:** frontend sanitizes digits-only max-6 (`:1433, :2383`), gates
  step 2 (`:745-750`), pre-submit (`:936-952`), steps loop (`:955-964`), and
  `buildPayload` throws (`owner.js :95-99`); backend requires `/^\d{6}$/`
  (`schemas.py :376`), service auto-creates location chains. **No Chennai
  allowlist, lookup, or prefix check exists in either repo** (only `600040`
  placeholders and Chennai sample data in tests/seeds). Direct-API bypass of
  *format* is blocked (422), but *any* valid 6-digit pincode (e.g. Bengaluru
  `560038`, already used in backend tests) persists, and exact-pincode-wins
  can attach a mismatched locality without error. Required: Chennai-only
  restriction in **both** layers. Recommended: explicit allowlist of Chennai
  pincodes (authoritative India Post list, e.g. `600001–600130+` curated set —
  exact range to be confirmed against postal data, not assumed) enforced at
  the same three frontend sites + `buildPayload` and as a backend schema
  validator (422 on non-Chennai), with distinct "not a Chennai pincode"
  messaging. Why: format-only checks cannot satisfy the requirement; test
  with Chennai pass / non-Chennai 6-digit reject / direct-POST reject trios.

## 11. Bugs and risks, classified by severity

### Critical

- **C1. Edit saves create duplicates.** No update endpoint; every Edit submit
  is `POST /owner/listings`. Two identical POSTs = two physical+listing rows,
  both PENDING/AVAILABLE, both buyer-visible after auto-verify; old row never
  closed. Fix is the Edit update path (backend PUT/PATCH + frontend branch).
- **C2. Edit hydration drops most fields.** ~30 fields (contact, address
  parts, physical, terms, amenities, description, ownership…) reset to demo
  defaults on Edit entry, so even a future update call would persist wrong
  data until hydration is completed. Fix with full hydrate from
  `GET /owner/listings/{id}` mapped onto every `collectFormSnapshot` key.
- **C3. Photo removal/replacement cannot persist.** No delete/replace API;
  Edit photo deletions are silently lost (or duplicated via re-POST).
  Fix with photo DELETE (+ optional reorder/cover) endpoints and a
  `removedRemote` flush on save.

### High

- **H1. Demo contact/photo/address defaults masquerade as data.**
  Prefilled phone/email, Anna Nagar address, sample photos, corner-flat
  description ship as listing content if untouched. Fix by blanking
  new-listing defaults (phone/email/photos/description/address parts) while
  keeping step-4 numeric/choice defaults that validation requires.
- **H2. Non-RENT rent_terms silently dropped** (`owner_listings.py :339`).
  Lease/Resale submissions lose deposit/maintenance/terms with no 422.
  Fix by either persisting terms per type or rejecting with a clear error.
- **H3. `is_duplex None→False` destroys null** (`:294`); reads mask with
  `bool()`/`False` defaults. Fix with `exclude_unset`-style PATCH semantics
  distinguishing omitted vs explicit-null.
- **H4. Top-left Back steps instead of exiting; Save Draft has no Edit
  branch.** Spec violations; small handler branches (see §9).

### Medium

- **M1. Pincode locality mismatch accepted** (exact-pincode precedence, no
  consistency check). Fix with locality↔pincode validation or warning.
- **M2. Draft `PUT` is merge-not-replace** (`owner_listings.py :772-779`)
  and cannot clear fields; `form_data` full-replace vs field-merge is
  inconsistent. Fix by documenting contract + `exclude_unset` parity for the
  future listing PATCH.
- **M3. `toOwnerProperty` lossy mapper** propagates Edit data loss to every
  consumer (cards, previews, leads screens). Fix by enriching it or bypassing
  it for Edit hydration (direct `fetchOwnerListing`).
- **M4. Purpose mapping conflates Buy/Sell** (`Sell→Resale`, `New→New`,
  `owner.js :32-42` vs form `:255-268`); sale price flows into `monthlyRent`.
  Fix with a single canonical tx map shared by hydrate + payload.
- **M5. `area_value` folds carpet+builtUp** (`owner.js :105-107` prefers
  builtUp); carpet-only listings misrecord. Fix by mapping carpet→area_value
  only when builtUp absent (already partially true) and documenting.
- **M6. International `+E.164` phones accepted** for contact while OTP uses
  stricter rules; `None` contact always allowed. Confirm product intent.

### Low

- **L1. `ListingPhotoIn.url` declared twice** (`schemas.py :336, :338`;
  harmless shadowing). Cleanup.
- **L2. `StepIndicator onStepPress :1249-1252` jumps without validation.**
  Gate on `validateStep` or keep as review affordance (product call).
- **L3. `price<=0 → 1` silent floor** (`owner.js :73`) and
  `deposit || 100000` masks zero (`:982-983`). Prefer explicit 422/keep-zero.

## 12. Minimal file-by-file implementation plan (do not execute)

1. **Backend `app/schemas.py`** — add `OwnerListingUpdate` (all-optional
   `OwnerListingCreate` mirror, `exclude_unset` semantics) + Chennai pincode
   allowlist validator shared with create. Why: blocks bypass + enables PATCH
   without null-wipes. Test: 422 trios (bad format / non-Chennai / blank
   district) + valid Chennai passes.
2. **Backend `app/services/owner_listings.py`** — add `update_owner_listing`
   (scalar overwrite only for `!= None`, `rent_terms` upsert-or-delete,
   amenities diff-by-kind, media diff honoring `removedIds`) + `delete_listing_photo`
   (+ optional `set_cover/reorder`). Why: C1/C3/H3 need server in-place edits.
   Test: update roundtrip, null-clear, terms upsert/delete, media delete,
   cover invariant.
3. **Backend `app/routers/owner.py`** — add `PATCH /owner/listings/{id}`
   (owner-scoped 404, `ValueError→422`, no status change) and
   `DELETE /owner/listings/{id}/photos/{media_id}` (owner-scoped 404,
   Cloudinary destroy best-effort). Why: exposes the services above.
   Test: anon 401 / buyer 403 / cross-owner 404 / owner 200 no-duplicate.
4. **Backend `alembic/versions/`** — no migration required for Edit (all
   columns exist); if photo soft-delete or `updated_at` auditing is wanted,
   add that migration first and name it here. Why: avoid surprise DDL.
5. **Frontend `src/api/owner.js`** — add `updateOwnerListing(id, payload)`
   (`PATCH`), `deleteListingPhoto(listingId, photoId)`, enrich
   `toOwnerProperty` (or add `toEditForm(detail)`) preserving
   pincode/contact/terms/amenities/photos. Why: unblocks Edit submit +
   photo persist. Test: plain-node payload + mapper unit tests.
6. **Frontend `OwnerAddPropertyScreen.js`** — add `editingListingId/isEditing`
   from `route.params.editingProperty.(listing_id|id)`; full hydrate of every
   `collectFormSnapshot` key (fetching `fetchOwnerListing` when the passed
   object is lossy); branch submit to PATCH (skip draft delete, update local
   via set not add); split header Back to exit vs bottom Back to step-back;
   Save Draft early-exit in Edit; phone/email defaults from auth profile with
   `""` fallbacks; Chennai allowlist at the three existing pincode sites.
   Why: C1–C4/H1/H4/G/H. Test per §13.
7. **Frontend `OwnerPropertiesScreen.js` + `OwnerPropertyDetailModal.js` +
   leads screens** — pass `{editingProperty: fullDetailOrId}` consistently
   (prefer id + fetch, or full `OwnerListingOut`). Why: stops lossy-object
   prop-drilling. Test: Edit entry from each surface lands prefilled.
8. **Frontend `context/OwnerContext.js`** — default profile phone/email to
   `""`. Why: removes demo-data leak (H1). Test: fresh-form contact blank.

## 13. Required tests and acceptance criteria

None executed this phase. Existing coverage: frontend single plain-node
`scripts/photo-retry-state.test.mjs` (retry/MIME/File helpers only, no
runner in `package.json`); backend `pytest` (`test_owner_listings.py`
create/validation/security, `test_owner_drafts.py` drafts,
`test_owner_photos.py` upload append-only, buyer/phase suites) — **zero
coverage** for listing update, photo delete/replace, Edit hydration, Back
nav split, Edit Save-Draft-exit, auth-prefill, Chennai allowlist.

Add/update (frontend plain-node mirroring existing pattern; backend pytest):

1. Create payload minimal + pincode-throw parity (`owner.js :95-99`).
   Accept: RENT fields map; `12345`/`abcdef`/`""` throw exact message.
2. Load-for-edit hydration (http-only, cover preserved, locals skipped).
   Accept: full-field fixture roundtrips through hydrate.
3. Update-without-duplication (retry branch never re-POSTs; PATCH path
   reuses id). Accept: listing count unchanged after Edit save.
4. All-field roundtrip (mirror backend full-RENT test). Accept: every §7 row
   survives; `0`/`false` preserved.
5. Photo remove/replace/failure (queue sync, cover-first retry, Review-stay).
   Accept: delete shrinks queue; failure shows retry count, no false success.
6. Back nav split. Accept: header exits (dirty→confirm, clean→direct);
   bottom decrements.
7. Save Draft Add vs Edit. Accept: Add POST/PUT same id; Edit zero draft
   calls + exits.
8. Phone-prefill + blank email. Accept: auth phone prefilled, demo absent,
   blank email blocks Next per `:727-732`.
9. Chennai pincode (both layers + direct-POST bypass). Accept: Chennai
   passes; valid non-Chennai 6-digit rejected with distinct message via UI
   and API.
10. Ownership (PATCH + photo DELETE): anon 401, buyer 403, cross-owner 404,
    owner 200, verification stays PENDING, cover invariant holds.

## 14. Uncertain findings needing further investigation

1. Chennai allowlist source: no authoritative list found in-repo; exact
   pincode set (India Post) must be chosen in implementation phase.
2. Whether contact phone/email are required or optional on update, and
   whether clearing them to null must be expressible (backend allows `None`
   but validators reject `""`).
3. Whether Lease/Resale terms should persist or 422 (currently silent drop).
4. Whether photo delete should hard-delete rows + Cloudinary objects or
   soft-delete (affects migration decision).
5. `updatePropertyStatus(property.id, "closed")` in `OwnerPropertiesScreen.js
   :197-223` references a status API with no matching backend route found —
   verify if dead code or an undocumented endpoint before touching.

## 15. Git status and confirmation

- Frontend `git status --short --branch` before this report: clean
  (`## integration/restamp-latest...ayati/main`), no ahead/behind, stash list
  unchanged (2 pre-existing entries), no operation in progress.
- Backend `git status --short --branch` before this report: clean
  (`## main...origin/main`), stash empty, no operation in progress.
- No application files were modified during this review (verified via
  `git status --porcelain` empty in both repos prior to writing).
- This report file is the only addition, written per §"Required Review
  Report" into the existing `Restamp-latest/report/` folder following the
  `property_*_*.md` snake_case convention. Re-verify with `git status` after
  writing; no commits, pushes, or deploys performed.

**Stop. Awaiting explicit approval before any implementation.**
