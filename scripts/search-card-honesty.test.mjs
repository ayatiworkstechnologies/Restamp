// Regression test: Search result cards show no fabricated listing data.
// Removed: feature chips inferred from the property type ("CMDA Approved",
// "Clear Title", "Gated Society", "Covered Parking", "100% Power Backup", ...),
// the hard-coded "₹6,800/sqft" fallback, and the assumed 1500 sq ft area.
// Price per sq ft is shown only for a sale listing with a real price and a
// real sq-ft area; otherwise it is omitted. Chips come only from an explicit
// amenities array (the buyer search card has none today).
// Run with: node scripts/search-card-honesty.test.mjs  (plain node, no deps)
//
// The pure helper is copied to a tmp dir and imported for real; SearchScreen
// imports React Native, so its wiring is guarded by source-text assertions.
import { mkdtempSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "search-card-test-"));
copyFileSync(join(SRC, "features", "buyer", "utils", "searchCardSpecs.js"), join(tmp, "searchCardSpecs.mjs"));
const { searchCardSpecs } = await import(pathToFileURL(join(tmp, "searchCardSpecs.mjs")).href);
// The search card + View Number sheet live in the shared PropertySearchCard (also used by agents).
const searchSrc = readFileSync(join(SRC, "features", "buyer", "screens", "SearchScreen.js"), "utf8") +
  readFileSync(join(SRC, "features", "buyer", "components", "PropertySearchCard.js"), "utf8");
const mapperSrc = readFileSync(join(SRC, "shared", "api", "mappers.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const sale = { transactionType: "RESALE", rawPrice: 8500000, sqft: "1,200", areaUnit: "sqft" };

// --- price per sq ft -----------------------------------------------------------
check("S1 real sale price and sq-ft area -> real per-sqft figure", searchCardSpecs(sale).perSqft === "₹7,083/sqft", searchCardSpecs(sale).perSqft);
check("S2 no area -> no per-sqft figure (no ₹6,800, no assumed 1500 sq ft)", searchCardSpecs({ ...sale, sqft: undefined }).perSqft === null);
check("S3 zero or junk area -> none", [0, "0", "", "abc", -5].every((sqft) => searchCardSpecs({ ...sale, sqft }).perSqft === null));
check("S4 no or zero price -> none", [undefined, 0, NaN].every((rawPrice) => searchCardSpecs({ ...sale, rawPrice }).perSqft === null));
check(
  "S5 rentals/leases get no per-sqft figure (monthly rent is not a sqft rate)",
  ["RENT", "LEASE"].every((t) => searchCardSpecs({ ...sale, transactionType: t }).perSqft === null)
);
check("S6 BUY is a sale too", searchCardSpecs({ ...sale, transactionType: "BUY" }).perSqft === "₹7,083/sqft");
check(
  "S7 non-sqft or unknown unit -> no 'per sqft' figure",
  ["sqyd", "acre", undefined, null, ""].every((areaUnit) => searchCardSpecs({ ...sale, areaUnit }).perSqft === null)
);

// --- area ----------------------------------------------------------------------
check("S8 area shown with its real unit", JSON.stringify([searchCardSpecs(sale).areaValue, searchCardSpecs(sale).areaUnitLabel]) === JSON.stringify(["1,200", "sq ft"]));
check("S9 sq yd is labelled sq yd, not sq ft", searchCardSpecs({ ...sale, areaUnit: "sqyd" }).areaUnitLabel === "sq yd");
check("S10 unknown unit gets a neutral label", searchCardSpecs({ ...sale, areaUnit: undefined }).areaUnitLabel === "area");
check("S11 no area -> no area shown", searchCardSpecs({ ...sale, sqft: undefined }).areaValue === null);

// --- feature chips ---------------------------------------------------------------
const types = ["Apartment", "Villa", "House", "Commercial", "Plot"];
check("S12 no chips are inferred from any property type", types.every((type) => searchCardSpecs({ ...sale, type }).tags.length === 0));
check(
  "S13 chips come only from an explicit amenities array",
  JSON.stringify(searchCardSpecs({ ...sale, amenities: ["Lift", " Gym ", "", null] }).tags) === JSON.stringify(["Lift", "Gym"])
);

// --- SearchScreen wiring --------------------------------------------------------
const fabricated = [
  "₹6,800/sqft", "|| 1500", "Gated Society", "Covered Parking", "Lift Access", "Power Backup",
  "Independent Villa", "Private Garden", "Corner Property", "2 Car Parking", "Grade A Tech Park",
  "High Speed Lifts", "Visitor Parking", "CMDA Approved", "2 Side Open", "Clear Title",
];
check("S14 none of the fabricated chips or fallbacks remain in SearchScreen", fabricated.every((f) => !searchSrc.includes(f)), fabricated.filter((f) => searchSrc.includes(f)));
check(
  "S15 SearchScreen uses the honest helper",
  /import \{[^}]*\bsearchCardSpecs\b[^}]*\} from "\.\.\/utils\/searchCardSpecs\.js";/.test(searchSrc) && searchSrc.includes("...searchCardSpecs(property)")
);
check("S16 per-sqft subtext only renders when there is something real to show", searchSrc.includes("{property.pricePeriod || perSqft ? ("));
check("S17 area spec only renders with a real area, using its real unit", searchSrc.includes("{areaValue ? (") && searchSrc.includes("{areaUnitLabel}"));
check("S18 chips row only renders when the listing carries features", searchSrc.includes("{tags.length > 0 ? ("));
check("S19 mapper passes the backend area unit through", mapperSrc.includes("areaUnit: card.area_unit || undefined,"));

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall search-card-honesty checks passed");
