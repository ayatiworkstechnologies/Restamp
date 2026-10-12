// Regression tests for property Edit mode (Phase 2).
// Run with: node scripts/property-edit-mode.test.mjs  (plain node, no deps)
// Covers: resolveEditingListingId, buildUpdatePayload (RENT/LEASE keep
// terms, RESALE/BUY null them), buildPayload sale-terms omission, toEditForm
// full hydration incl. LEASE/RESALE/BUY/commercial, headerExitAction table,
// photo id tracking, blank contact defaults (no demo values), optional
// owner email (blank/whitespace -> null, valid kept, invalid rejected),
// and Add-after-Edit reset (fresh reset params exit edit mode; a reset
// empty form carries no photos/emails into the next publish; edit exits
// clear to fresh params so bare Add tab presses stay safe without a
// blanket tabPress reset).
//
// Same harness as photo-retry-state.test.mjs: src/api/owner.js uses
// extensionless imports (Metro), so copy to tmp with extensions fixed.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "api");
const tmp = mkdtempSync(join(tmpdir(), "edit-mode-test-"));
for (const f of ["owner.js", "client.js", "mappers.js"]) {
  copyFileSync(join(SRC, f), join(tmp, f));
}
writeFileSync(
  join(tmp, "owner.js"),
  readFileSync(join(tmp, "owner.js"), "utf8")
    .replace('from "./client"', 'from "./client.js"')
    .replace('from "./mappers"', 'from "./mappers.js"')
);
const {
  resolveEditingListingId, buildPayload, buildUpdatePayload, toEditForm,
  headerExitAction, isLocalPhotoUri, syncIdSetWithPhotos,
  isValidChennaiPincode, requireChennaiPincode,
  CHENNAI_PINCODE_MIN, CHENNAI_PINCODE_MAX, CHENNAI_PINCODE_ERROR,
  isValidOwnerEmail, normalizeOwnerEmail, OWNER_EMAIL_ERROR,
} = await import(join(tmp, "owner.js"));

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- 1. resolveEditingListingId ---
check("E1 listing_id int", resolveEditingListingId({ editingProperty: { listing_id: 12 } }) === 12);
check("E2 id string", resolveEditingListingId({ editingProperty: { id: "34" } }) === 34);
check("E3 listingId param", resolveEditingListingId({ listingId: 7 }) === 7);
check("E4 draft pseudo-id", resolveEditingListingId({ editingProperty: { id: "draft-5" } }) === null);
check("E5 local id", resolveEditingListingId({ editingProperty: { id: "own-prop-1" } }) === null);
check("E6 empty params", resolveEditingListingId({}) === null);
check("E7 undefined", resolveEditingListingId(undefined) === null);
check("E8 zero/negative", resolveEditingListingId({ editingProperty: { id: 0 } }) === null
  && resolveEditingListingId({ editingProperty: { id: -3 } }) === null);
check("E9 empty object", resolveEditingListingId({ editingProperty: {} }) === null);

// --- shared form fixture (mirrors handlePublishProperty newProperty keys) ---
function rentForm(over = {}) {
  return {
    title: "2 BHK Apartment", lookingTo: "Rent", category: "Residential",
    propertyType: "Apartment", bhk: "2 BHK", city: "Chennai", district: "Chennai",
    locality: "Anna Nagar", pincode: "600040", subLocality: "5th Avenue",
    apartmentSociety: "Green Acres", houseNo: "Flat 402", landmark: "Tower Park",
    price: 25000, bedrooms: "2", bathrooms: "2", balconies: "2",
    carpetArea: "1200 sq.ft", builtUpArea: "1380 sq.ft", superBuiltUpArea: "1550 sq.ft",
    totalFloors: "8", floor: "3", duplex: "No", availabilityStatus: "Ready to Move",
    propertyAge: "1–5 Years", monthlyRent: "25000", securityDeposit: "100000",
    maintenanceCharges: "3000", maintenanceFrequency: "Monthly", rentNegotiable: "No",
    availableFrom: "25 Sep 2026", tenantPreference: "Family", lockInPeriod: "1 Year",
    preferredAgreementDuration: "11 Months", otherRooms: ["Pooja Room"],
    furnishing: "Semi-Furnished", coveredParking: 1, openParking: 1,
    description: "Spacious corner flat near the park.",
    ownership: "Freehold", propertyFeatures: ["Vastu Compliant"],
    amenities: ["Lift", "Gym"], openSides: "2", overlooking: "Park",
    powerBackup: "Full", facing: "East",
    contact: { phone: "+919840100001", email: "owner@example.com" },
    photos: [
      { url: "https://t.test/e1.jpg", category: "Living Room" },
      { url: "file:///local/new.png", category: "Bedroom" },
    ],
    ...over,
  };
}

// --- 2. buildUpdatePayload ---
const rentPayload = buildUpdatePayload(rentForm());
check("U1 rent tx", rentPayload.transaction_type === "RENT");
check("U2 rent terms kept", rentPayload.rent_terms
  && rentPayload.rent_terms.security_deposit_rupees === 100000
  && rentPayload.rent_terms.maintenance_rupees === 3000
  && rentPayload.rent_terms.maintenance_period === "Monthly"
  && rentPayload.rent_terms.is_negotiable === false
  && rentPayload.rent_terms.available_from === "25 Sep 2026"
  && rentPayload.rent_terms.tenant_preference === "Family"
  && rentPayload.rent_terms.lock_in_months === "1 Year"
  && rentPayload.rent_terms.agreement_months === "11 Months");
check("U3 locals excluded from photos",
  rentPayload.photos.length === 1 && rentPayload.photos[0].url === "https://t.test/e1.jpg");
check("U4 contact mapped", rentPayload.contact_phone === "+919840100001"
  && rentPayload.contact_email === "owner@example.com");
check("U5 pincode+location", rentPayload.pincode === "600040"
  && rentPayload.locality === "Anna Nagar" && rentPayload.city === "Chennai");

const leasePayload = buildUpdatePayload(rentForm({ lookingTo: "Lease" }));
check("U6 lease tx keeps terms", leasePayload.transaction_type === "LEASE"
  && leasePayload.rent_terms !== null
  && leasePayload.rent_terms.security_deposit_rupees === 100000);

const resalePayload = buildUpdatePayload(rentForm({ lookingTo: "Resale" }));
check("U7 resale tx nulls terms", resalePayload.transaction_type === "RESALE"
  && resalePayload.rent_terms === null);
const buyPayload = buildUpdatePayload(rentForm({ lookingTo: "New" }));
check("U8 buy tx nulls terms", buyPayload.transaction_type === "BUY"
  && buyPayload.rent_terms === null);

// --- 3. buildPayload (Add path shares the same sale-terms rule) ---
check("U9 buildPayload resale nulls terms",
  buildPayload(rentForm({ lookingTo: "Resale" })).rent_terms === null);
check("U10 buildPayload rent keeps terms",
  buildPayload(rentForm()).rent_terms !== null);

// --- 4. toEditForm full hydration ---
function rentDetail(over = {}) {
  return {
    listing_id: 77, title: "2 BHK Apartment", transaction_type: "RENT",
    property_type: "APARTMENT", price_paise: 2500000, price_period: "MONTHLY",
    construction_status: "READY_TO_MOVE", verification_status: "PENDING",
    listing_status: "AVAILABLE", description: "Spacious corner flat near the park.",
    locality: "Anna Nagar", city: "Chennai", district: "Chennai", pincode: "600040",
    address_line: "Flat 402, Green Acres, 5th Avenue, Anna Nagar",
    sub_locality: "5th Avenue", society_name: "Green Acres", house_no: "Flat 402",
    landmark: "Tower Park", latitude: 13.085, longitude: 80.2101,
    area_value: 1200, area_unit: "sqft", bedrooms: 2, bathrooms: 2, balconies: 2,
    built_up_area: 1380, super_built_up_area: 1550, total_floors: 8, floor_on: "3",
    is_duplex: false, property_age_band: "1–5 Years", furnishing: "SEMI_FURNISHED",
    covered_parking: 1, open_parking: 1, open_sides: "2", overlooking: "Park",
    power_backup: "FULL", facing: "East", ownership_type: "FREEHOLD",
    contact_phone: "+919840100001", contact_email: "owner@example.com",
    rent_terms: {
      security_deposit_paise: 10000000, maintenance_paise: 300000,
      maintenance_period: "MONTHLY", is_negotiable: true,
      available_from: "2026-09-25", tenant_preference: "FAMILY",
      lock_in_months: 12, agreement_months: 11,
    },
    amenities: ["Lift", "Gym"], property_features: ["Vastu Compliant"],
    other_rooms: ["Pooja Room"],
    cover_image_url: "https://t.test/e1.jpg",
    gallery: ["https://t.test/e1.jpg", "https://t.test/e2.jpg"],
    photos: [
      { id: 501, url: "https://t.test/e1.jpg", category: "Living Room", order_index: 0, is_cover: true },
      { id: 502, url: "https://t.test/e2.jpg", category: "Bedroom", order_index: 1, is_cover: false },
    ],
    ...over,
  };
}
const f = toEditForm(rentDetail());
check("F1 mode + basics", f.editingListingId === 77 && f.lookingTo === "Rent"
  && f.category === "Residential" && f.propertyType === "Apartment" && f.bhk === "2 BHK");
check("F2 contact restored", f.phoneNumber === "+919840100001" && f.email === "owner@example.com");
check("F3 location", f.city === "Chennai" && f.district === "Chennai"
  && f.locality === "Anna Nagar" && f.pincode === "600040"
  && f.subLocality === "5th Avenue" && f.apartmentSociety === "Green Acres"
  && f.houseNo === "Flat 402" && f.landmark === "Tower Park");
check("F4 physical", f.bedrooms === "2" && f.bathrooms === "2" && f.balconies === "2"
  && f.carpetArea === "1200" && f.builtUpArea === "1380" && f.superBuiltUpArea === "1550"
  && f.totalFloors === "8" && f.floorOn === "3" && f.duplex === "No"
  && f.availabilityStatus === "Ready to Move" && f.propertyAge === "1–5 Years");
check("F5 pricing+terms", f.monthlyRent === "25000" && f.securityDeposit === "100000"
  && f.maintenanceCharges === "3000" && f.maintenanceFrequency === "Monthly"
  && f.rentNegotiable === "Yes" && f.availableFrom === "25 Sep 2026"
  && f.tenantPreference === "Family" && f.lockInPeriod === "1 Year"
  && f.preferredAgreementDuration === "11 Months");
check("F6 extras", JSON.stringify(f.otherRooms) === JSON.stringify(["Pooja Room"])
  && f.furnishing === "Semi-Furnished" && f.coveredParking === 1 && f.openParking === 1
  && f.description === "Spacious corner flat near the park." && f.ownership === "Freehold"
  && JSON.stringify(f.propertyFeatures) === JSON.stringify(["Vastu Compliant"])
  && JSON.stringify(f.selectedAmenities) === JSON.stringify(["Lift", "Gym"])
  && f.openSides === "2" && f.overlooking === "Park" && f.powerBackup === "Full"
  && f.propertyFacing === "East");
check("F7 photos w/ media ids + cover", f.photosList.length === 2
  && f.photosList[0].id === "remote-501" && f.photosList[0].mediaId === 501
  && f.photosList[0].isCover === true && f.photosList[1].mediaId === 502
  && f.photosList[1].isCover === false);

const leaseForm = toEditForm(rentDetail({ transaction_type: "LEASE" }));
check("F8 lease lookingTo", leaseForm.lookingTo === "Lease");
const resaleForm = toEditForm(rentDetail({
  transaction_type: "RESALE", property_type: "VILLA", price_paise: 900000000,
  price_period: "TOTAL", bedrooms: 4, rent_terms: null,
}));
check("F9 resale lookingTo+price+villa", resaleForm.lookingTo === "Resale"
  && resaleForm.monthlyRent === "9000000" && resaleForm.propertyType === "Independent House / Villa"
  && resaleForm.securityDeposit === "" && resaleForm.availableFrom === "Immediately");
const buyForm = toEditForm(rentDetail({ transaction_type: "BUY" }));
check("F10 buy lookingTo", buyForm.lookingTo === "New");
const commForm = toEditForm(rentDetail({ property_type: "COMMERCIAL" }));
check("F11 commercial", commForm.category === "Commercial" && commForm.propertyType === "Office");
check("F12 null detail", toEditForm(null) === null && toEditForm(undefined) === null);
const nullish = toEditForm(rentDetail({
  contact_phone: null, contact_email: null, description: null, bedrooms: null,
  bathrooms: null, balconies: null, area_value: null, built_up_area: null,
  total_floors: null, floor_on: null, is_duplex: null, furnishing: null,
  covered_parking: null, open_parking: null, rent_terms: null, photos: [],
}));
check("F13 nulls map to blanks", nullish.phoneNumber === "" && nullish.email === ""
  && nullish.description === "" && nullish.bedrooms === "" && nullish.bathrooms === ""
  && nullish.balconies === "" && nullish.carpetArea === "" && nullish.builtUpArea === ""
  && nullish.totalFloors === "" && nullish.floorOn === "" && nullish.duplex === "No"
  && nullish.furnishing === "" && nullish.coveredParking === 0 && nullish.openParking === 0
  && nullish.photosList.length === 0);

// --- 5. headerExitAction ---
check("H1 dirty->confirm", headerExitAction({ isEditing: false, dirty: true }) === "confirm"
  && headerExitAction({ isEditing: true, dirty: true }) === "confirm");
check("H2 add clean->dashboard", headerExitAction({ isEditing: false, dirty: false }) === "exit-dashboard");
check("H3 edit clean->properties", headerExitAction({ isEditing: true, dirty: false }) === "exit-properties");

// --- 6. photo id tracking + blank contacts ---
check("P1 remote not local", isLocalPhotoUri("https://t.test/e1.jpg") === false
  && isLocalPhotoUri("file:///local/new.png") === true);
const liveIds = f.photosList.map((p) => p.id);
check("P2 removal sync by stable id",
  JSON.stringify(syncIdSetWithPhotos(["remote-501", "remote-502"],
    f.photosList.filter((p) => p.id !== "remote-501"))) === JSON.stringify(["remote-502"])
  && liveIds.includes("remote-501"));
const blankPayload = buildPayload(rentForm({ contact: { phone: "", email: "" } }));
check("C1 blank contact -> null (never demo)", blankPayload.contact_phone === null
  && blankPayload.contact_email === null);

// --- 7. Chennai pincode range rule (single shared helper) ---
check("R0 constants", CHENNAI_PINCODE_MIN === 600001 && CHENNAI_PINCODE_MAX === 600118
  && CHENNAI_PINCODE_ERROR === "Please enter a valid pincode between 600001 and 600118.");
for (const pin of ["600001", "600089", "600118", "600040"]) {
  check(`R1 accept ${pin}`, isValidChennaiPincode(pin) === true);
}
for (const pin of ["600000", "600119", "600500", "560038", "60001", "6000118",
                   "abcdef", "", "      ", null, undefined]) {
  check(`R2 reject ${JSON.stringify(pin)}`, isValidChennaiPincode(pin) === false);
}
check("R3 trimmed string preserved", requireChennaiPincode(" 600089 ") === "600089");
check("R4 missing -> null", requireChennaiPincode("") === null
  && requireChennaiPincode("   ") === null);
for (const pin of ["600000", "600119", "abcdef"]) {
  let msg = null;
  try { requireChennaiPincode(pin); } catch (e) { msg = e.message; }
  check(`R5 throw ${pin}`, msg === CHENNAI_PINCODE_ERROR, msg);
}
check("R6 add payload accepts boundary",
  buildPayload(rentForm({ pincode: "600001" })).pincode === "600001"
  && buildPayload(rentForm({ pincode: "600118" })).pincode === "600118");
for (const pin of ["600000", "600119", "600500", "abcdef", ""]) {
  let msg = null;
  try { buildUpdatePayload(rentForm({ pincode: pin })); } catch (e) { msg = e.message; }
  check(`R7 update payload rejects ${JSON.stringify(pin)}`, msg === CHENNAI_PINCODE_ERROR, msg);
}

// --- 8. Owner email is optional (blank/whitespace -> null, valid kept,
//       invalid rejected at both helper and payload layers) ---
check("M0 email error constant", OWNER_EMAIL_ERROR === "Please enter a valid email address");
for (const v of ["", "   ", null, undefined]) {
  check(`M1 blank email valid ${JSON.stringify(v)}`, isValidOwnerEmail(v) === true);
}
for (const v of ["owner@example.com", "  owner@example.com  ", "a.b+tag@sub.example.co"]) {
  check(`M2 valid email ${JSON.stringify(v)}`, isValidOwnerEmail(v) === true);
}
for (const v of ["not-an-email", "owner@", "owner@example", "a@b.c", "owner @example.com"]) {
  check(`M3 invalid email ${JSON.stringify(v)}`, isValidOwnerEmail(v) === false);
}
check("M4 normalize blank -> null",
  normalizeOwnerEmail("") === null && normalizeOwnerEmail("   ") === null
  && normalizeOwnerEmail(null) === null && normalizeOwnerEmail(undefined) === null);
check("M5 normalize valid trims",
  normalizeOwnerEmail("  owner@example.com  ") === "owner@example.com");
for (const v of ["not-an-email", "owner@", "a@b.c", "  nope  "]) {
  let msg = null;
  try { normalizeOwnerEmail(v); } catch (e) { msg = e.message; }
  check(`M6 normalize rejects ${JSON.stringify(v)}`, msg === OWNER_EMAIL_ERROR, msg);
}
check("M7 buildPayload blank email -> null",
  buildPayload(rentForm({ contact: { phone: "+919840100001", email: "" } })).contact_email === null);
check("M8 buildPayload whitespace email -> null",
  buildPayload(rentForm({ contact: { phone: "+919840100001", email: "   " } })).contact_email === null);
check("M9 buildPayload valid email kept",
  buildPayload(rentForm({ contact: { phone: "+919840100001", email: "owner@example.com" } })).contact_email === "owner@example.com"
  && buildPayload(rentForm({ contact: { phone: "+919840100001", email: "  owner@example.com  " } })).contact_email === "owner@example.com");
for (const v of ["not-an-email", "owner@", "a@b.c"]) {
  let msg = null;
  try { buildPayload(rentForm({ contact: { phone: "+919840100001", email: v } })); } catch (e) { msg = e.message; }
  check(`M10 buildPayload rejects ${JSON.stringify(v)}`, msg === OWNER_EMAIL_ERROR, msg);
}
check("M11 buildUpdatePayload blank email -> null",
  buildUpdatePayload(rentForm({ contact: { phone: "+919840100001", email: "" } })).contact_email === null);

// --- 9. Add-after-Edit reset (stale Add form regression) ---
// Contract: every Add entry passes fresh params
// {resetForm: <ts>, initialStep: 1, editingProperty: null}; the Add screen
// exits edit mode on those params and restores defaults (photos []), so the
// previously edited property cannot leak into the next create.
const freshResetParams = (over = {}) => ({
  resetForm: Date.now(), initialStep: 1, editingProperty: null, ...over,
});
check("S1 reset params exit edit mode",
  resolveEditingListingId(freshResetParams()) === null);
check("S2 legit edit still detected (no reset)",
  resolveEditingListingId({ editingProperty: { listing_id: 77 } }) === 77);
check("S3 plain Add has no edit identity",
  resolveEditingListingId({}) === null && resolveEditingListingId(undefined) === null);
check("S4 reset omits stale listing ids",
  resolveEditingListingId(freshResetParams({ listingId: undefined, listing_id: undefined })) === null);
const resetPayload = buildPayload(rentForm({
  photos: [], images: [],
  contact: { phone: "+919840100001", email: "" },
}));
check("S5 reset empty form carries no photos",
  resetPayload.photos === undefined && Array.isArray(resetPayload.images)
  && resetPayload.images.length === 0);
check("S6 reset empty form carries no email",
  resetPayload.contact_email === null);
const resetHydrated = toEditForm(rentDetail({
  contact_phone: null, contact_email: null, photos: [],
}));
check("S7 reset hydrated contacts/photos are blank",
  resetHydrated.phoneNumber === "" && resetHydrated.email === ""
  && Array.isArray(resetHydrated.photosList) && resetHydrated.photosList.length === 0);

// --- 10. Edit-exit clearing (Add tab-press safety) ---
// exitToProperties clears the Add route to fresh params on every edit exit
// (publish success, discard, clean back), so a later bare Add tab press —
// which supplies no params — cannot resurrect the finished edit. A blanket
// tabPress reset would be unsafe: a mid-edit tab-away looks identical in
// params, and wiping it would destroy legitimate resume progress. Hence no
// listener; these cases pin the contract the exits rely on.
const exitClearedParams = () => ({
  resetForm: Date.now(), initialStep: 1, editingProperty: null,
});
check("T1 exit-cleared params exit edit mode",
  resolveEditingListingId(exitClearedParams()) === null);
check("T2 exit-cleared params carry a freshness marker",
  !!exitClearedParams().resetForm && exitClearedParams().initialStep === 1);
check("T3 mid-edit params still resolve (resume preserved, never blanket-reset)",
  resolveEditingListingId({ editingProperty: { listing_id: 77 } }) === 77);
check("T4 draft params untouched by edit-exit contract",
  resolveEditingListingId({ draftId: "d1" }) === null
  && resolveEditingListingId({ draft: { id: "d1" } }) === null);

// --- 11. Four-purpose matrix (New/Rent/Resale/Lease) ---
// Fresh Add, purpose-dependent payload (tx/period/terms), edit hydration
// round-trip, purpose switching, and leak-free fresh forms — per purpose.
const purposeCases = [
  { lookingTo: "New", tx: "BUY", period: "TOTAL", termsNull: true },
  { lookingTo: "Rent", tx: "RENT", period: "MONTHLY", termsNull: false },
  { lookingTo: "Resale", tx: "RESALE", period: "TOTAL", termsNull: true },
  { lookingTo: "Lease", tx: "LEASE", period: "MONTHLY", termsNull: false },
];
const backToLooking = { BUY: "New", RENT: "Rent", RESALE: "Resale", LEASE: "Lease" };
for (const pc of purposeCases) {
  const add = buildPayload(rentForm({ lookingTo: pc.lookingTo }));
  check(`P1 ${pc.lookingTo} add tx`, add.transaction_type === pc.tx);
  check(`P2 ${pc.lookingTo} add period`, add.price_period === pc.period);
  check(`P3 ${pc.lookingTo} add terms`,
    pc.termsNull ? add.rent_terms === null
      : (add.rent_terms !== null && add.rent_terms.security_deposit_rupees === 100000));
  const upd = buildUpdatePayload(rentForm({ lookingTo: pc.lookingTo }));
  check(`P4 ${pc.lookingTo} update tx/terms`,
    upd.transaction_type === pc.tx
    && (pc.termsNull ? upd.rent_terms === null : upd.rent_terms !== null));
  const back = toEditForm(rentDetail({
    transaction_type: pc.tx, price_period: pc.period,
    ...(pc.termsNull ? { rent_terms: null } : {}),
  }));
  check(`P5 ${pc.lookingTo} hydration round-trip`, back.lookingTo === backToLooking[pc.tx]);
}
// Purpose switching at the data layer: incompatible terms are
// cleared/normalized while unrelated fields survive.
const switchedToResale = buildPayload(rentForm({
  lookingTo: "Resale", title: "Switch House", locality: "Velachery",
  contact: { phone: "+919840100001", email: "owner@example.com" },
}));
check("P6 switch Rent->Resale nulls terms, keeps title/locality/contact",
  switchedToResale.rent_terms === null && switchedToResale.title === "Switch House"
  && switchedToResale.locality === "Velachery"
  && switchedToResale.contact_email === "owner@example.com");
const switchedToRent = buildPayload(rentForm({
  lookingTo: "Rent", title: "Switch House", locality: "Velachery",
  contact: { phone: "+919840100001", email: "owner@example.com" },
}));
check("P7 switch target tx with terms restored",
  switchedToRent.transaction_type === "RENT" && switchedToRent.rent_terms !== null
  && switchedToRent.title === "Switch House");
// Fresh-add per purpose carries no photos/email (no leak into next publish).
for (const pc of purposeCases) {
  const fresh = buildPayload(rentForm({
    lookingTo: pc.lookingTo, photos: [], images: [],
    contact: { phone: "+919840100001", email: "" },
  }));
  check(`P8 fresh ${pc.lookingTo} no photos/email leak`,
    fresh.photos === undefined && Array.isArray(fresh.images)
    && fresh.images.length === 0 && fresh.contact_email === null);
}

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all edit-mode tests passed");
}
