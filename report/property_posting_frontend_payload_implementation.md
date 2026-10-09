# RENT Frontend Payload Wiring Implementation Report

## 1. Date
2026-10-08 (UTC).

## 2. Scope
Wire the EXISTING RENT form state (`OwnerAddPropertyScreen.newProperty`) into the backend `OwnerListingCreate` payload via the single existing `buildPayload()` in `src/api/owner.js`. No UI redesign, no new screens, no uploads, no drafts, no Lease/Resale, no update/delete, no auth/OTP/buyer changes, no commit, no push. Backend untouched (one contract compatibility note in §13, reported not modified).

## 3. Exact files changed
- `src/api/owner.js` — `buildPayload` extended to the full RENT payload (+helpers, now a named export for testability; `createOwnerListing`/`fetchOwner*`/`toOwnerProperty` unchanged).
- `src/screens/owner/OwnerAddPropertyScreen.js` — 3 additive keys on the `newProperty` object only: `photos` (categorized `{url, category}` array), `securityDeposit` + `maintenanceCharges` (raw input strings). No UI, validation, navigation, or default changes.

## 4. Form-field → payload mapping
Kept all 16 existing keys byte-identical in behavior (title/tx/type/price/period/description/construction/locality/city/pincode/address/area/bedrooms/bathrooms/images+cover-first). Added: `district`, `sub_locality` (subLocality), `society_name` (apartmentSociety), `house_no` (houseNo), `landmark`, `latitude/longitude` (omitted — form captures none, never invented), `balconies`, `built_up_area`, `super_built_up_area`, `total_floors`, `floor_on` (floor), `is_duplex` (duplex Yes/No→bool), `property_age_band`, `furnishing`, `covered_parking`, `open_parking`, `open_sides`, `overlooking`, `power_backup`, `facing`, `ownership_type` (ownership), `contact_phone/email` (contact.phone/email), nested `rent_terms` (deposit/maintenance rupees, period, negotiable bool, available_from label, tenant label, lock/agreement labels), `amenities`, `property_features`, `other_rooms`, `photos[{url, category}]` (legacy `images` URL list retained alongside).

## 5. Transformations performed
Digit-parse for int fields (`"1200 sq.ft"`→1200, `"2 BHK"`→2, `"3+"`→3); Yes/No→boolean (unrecognized→null, never coerced); trim + max-length clamp for strings; chip labels (lock-in, agreement, available-from, furnishing, ownership, frequency, tenant) passed through verbatim — backend owns normalization (verified label sets match: `None/6 Months/1 Year/2 Years`, `11 Months/1/2/3/5 Years`, `Immediately/Within…/DD Mon YYYY`, `Semi-Furnished`, `Freehold`, `Monthly`, `Family`).

## 6. Empty/null handling
`""`/whitespace→null (omitted-or-null per backend Optional); `0` and `false` preserved (`balconies "0"`→0, `duplex "No"`→false, parking 0, `rentNegotiable "No"`→false); arrays stay arrays (non-string entries filtered); photos without valid http URL dropped, missing `photos` key omitted so backend falls back to `images`. Raw money strings preferred over the form's precomputed numbers so `"0"` stays 0 instead of falling into the form's `|| 100000` / `|| 3000` defaults.

## 7. Photo/category handling
`photosList` order = payload order = display order; cover = index 0 (backend convention, matches existing cover-first `images` logic). Per-photo `category` forwarded; absent category → null. No picker/upload/storage code added; all URLs remain remote strings.

## 8. Amenity handling
`selectedAmenities`→`amenities`, `propertyFeatures`→`property_features`, `otherRooms`→`other_rooms` as trimmed non-empty name arrays. Vocabulary verified identical to `amenity_master` (16/14/5). IDs never sent; server resolves by name.

## 9. Backend contract compatibility
Payload keys use the exact `OwnerListingCreate` snake_case names; `rent_terms` nesting and `photos[{url, category}]` shape match the backend models; label values are within the backend's accepted sets (verified against `app/schemas.py` validators). One observation (NOT modified, reported per instructions): backend ignores `rent_terms` for non-RENT `transaction_type`, so Lease-form submissions will persist core fields but drop terms until Lease lands — expected, documented backend behavior.

## 10. Tests/checks executed
- Static payload inspection via node against the real `buildPayload` (full + all-empty edge objects): all 50 keys correct; empties→null/[]; `false`/`0` preserved; `photos` key omitted when empty.
- `npm run build:web` (`expo export -p web`): SUCCESS, `Exported: dist`.
- No repo lint/type/test scripts exist (`package.json` has only expo scripts); none added.
- Live E2E against local backend (OTP-debug auth, real `buildPayload` + `apiPost`): POST → listing **3385** `PENDING/AVAILABLE`; `GET /owner/listings/3385` verified district, contact, 8 physical fields, full `rent_terms` (`Tomorrow`→next-day DATE, paise ×100, labels→ENUM/months), 4 amenity links across 3 kinds, 2 categorized photos in order with correct cover.

## 11. E2E result
SUCCESS. Test listing 3385 + its physical/media/terms/amenity rows + test user removed afterwards via scoped deletes only (listing count back to 31; seeds and user listing 2353 untouched). Auto-created `E2E District/E2E Nagar` location-chain rows intentionally left (shared reference data, indistinguishable from legitimate submissions).

## 12. Fields intentionally not sent and why
`latitude/longitude` (form captures no coordinates — never invented); `mapLocationSet`, modal flags, `errors/isSubmitting`, `activePreviewIndex`, `purposeSelected` (dead/UI-only); `priceFormatted/priceUnit/badgeType/purpose/isResale/parking/negotiable-dup` (display derivations); photo client `id`s (temp keys); `status:"pending"` (server owns lifecycle).

## 13. Blockers/deviations
No blockers. No backend mismatch found (Lease-terms note in §9 is known documented behavior, not a bug). One judgment call: 3 additive keys on `newProperty` (no alternative — categories/raw strings are unrecoverable otherwise); no UI or default behavior changed.

## 14. git diff --check result
Clean (`git diff --check` exit 0). Working tree contains only this phase's 2-file diff plus prior uncommitted P0 work, all preserved.

## 15. Explicit confirmation
- no commit — confirmed
- no push — confirmed
- no backend changes — confirmed (backend repo untouched; verified via E2E only)
- no upload implementation — confirmed
- no drafts — confirmed
- no Lease/Resale — confirmed (labels pass through; backend gates terms to RENT)

## Remaining for next phase (inspected, not implemented)
`toOwnerProperty` still drops enriched fields for display (cover-only images, no terms/amenities/physical extras) — dashboard/My Properties enrichment; real photo picker + upload endpoint + storage; drafts table/APIs; update/delete/close; Lease/Resale terms.
