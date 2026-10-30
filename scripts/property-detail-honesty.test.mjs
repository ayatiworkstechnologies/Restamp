// Regression tests: the buyer property detail sheet shows only real listing
// data or neutral placeholders — never sample ratings, rooms, prices,
// amenities, readiness, highlights or descriptions.
// Run with: node scripts/property-detail-honesty.test.mjs  (plain node, no deps)
import { mkdtempSync, copyFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "property-detail-honesty-"));
copyFileSync(join(SRC, "api", "mappers.js"), join(tmp, "mappers.mjs"));
const { toUiProperty } = await import(join(tmp, "mappers.mjs"));
const modal = readFileSync(join(SRC, "components", "PropertyDetailModal.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`ok - ${name}`);
  else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- 1. Invented values are gone from the sheet ------------------------------------
const invented = [
  "property.rating || 4.9", "property.beds : 3", "property.baths : 2", "? property.beds : 3", "? property.baths : 2",
  "₹6,800/sqft", 'property.sqft || 1500', '"1,500 sqft"', '"Ready to move"', '"New Launch"',
  "Gated Society", "Power Backup", "Covered Parking", "Lift Access", "Independent Villa", "CMDA Approved",
  "Exceptional residential property", "Overlooking Main Road", "Vastu Compliant", "Clear Legal Title",
  "Metro Station", '"East / North"', '"3rd of 5"', "Swimming Pool", "Gymnasium", "24/7 Security",
  "INCLUDED FIXTURES & APPLIANCES", "Move-in Ready", '"Semi-Furnished").toString()', '|| "Apartment"',
];
for (const s of invented) check(`I no invented ${JSON.stringify(s)}`, !modal.includes(s));

// --- 2. Real values or neutral placeholders -----------------------------------------
check("P1 rating badge only for a real rating", modal.includes('const hasRating = typeof property.rating === "number" && property.rating > 0;') && modal.includes("{hasRating ? ("));
check("P2 beds/baths/area each rendered only when present", modal.includes("{hasBeds ? (") && modal.includes("{hasBaths ? (") && modal.includes("{hasArea ? ("));
check("P3 per-sqft only from a real price and a real area", modal.includes("property.rawPrice && sqftNum") && modal.includes(': null;\n  const statusText'));
check("P4 readiness pill only from the listing's construction status", modal.includes("const statusText = property.constructionStatus || null;") && modal.includes("{statusText ? ("));
check("P5 neutral description placeholder", modal.includes("The owner hasn't added a description yet."));
check("P6 neutral highlights / amenities placeholders", modal.includes("No highlights have been added for this property yet.") && modal.includes("No amenities have been listed for this property yet."));
check("P7 missing details read 'Not specified'", (modal.match(/\|\| NOT_SPECIFIED/g) || []).length >= 4 && modal.includes('const NOT_SPECIFIED = "Not specified";'));
check("P8 furnishing card only for a real value", modal.includes("{furnishingLabel ? ("));

// --- 3. Mapper no longer invents furnishing ------------------------------------------
const card = {
  listing_id: 7, title: "Flat", price_paise: 3200000, price_period: "MONTHLY", price_display: "₹32,000/mo",
  transaction_type: "RENT", property_type: "APARTMENT", construction_status: null, description: null,
  area_value: null, area_unit: null, bedrooms: null, bathrooms: null, address_line: null, locality: "Adyar",
  city: "Chennai", pincode: "600020", location_label: "Adyar, Chennai", cover_image_url: null,
};
const ui = toUiProperty(card);
check("M1 no furnishing from the API -> undefined (not 'Semi-Furnished')", ui.furnishing === undefined, ui.furnishing);
check("M2 no rating, rooms, area, readiness or description invented", ui.rating === undefined && ui.beds === undefined && ui.baths === undefined && ui.sqft === undefined && ui.constructionStatus === undefined && ui.description === undefined);
check("M3 real furnishing is kept", toUiProperty({ ...card, furnishing: "FULLY_FURNISHED" }).furnishing === "FULLY_FURNISHED");

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall property-detail honesty checks passed");
