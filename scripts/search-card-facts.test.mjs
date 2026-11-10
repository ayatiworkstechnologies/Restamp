// Regression test: Search result cards show a rating, bed/bath counts and a
// construction status only when the backend sent a valid value, and the
// status filter never treats a missing status as "Ready to move".
// Removed: the `property.rating || 4.9` star rating, the `3 beds` / `2 baths`
// defaults, and the "Ready to move" / "New Launch" status assumptions (on the
// card and in the filter).
// Run with: node scripts/search-card-facts.test.mjs  (plain node, no deps)
//
// The pure helpers are copied to a tmp dir and imported for real; SearchScreen
// imports React Native, so its wiring is guarded by source-text assertions.
import { mkdtempSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "search-card-facts-test-"));
copyFileSync(join(SRC, "features", "buyer", "utils", "searchCardSpecs.js"), join(tmp, "searchCardSpecs.mjs"));
const { displayRating, displayCount, validConstructionStatus, matchesStatusFilter } = await import(
  pathToFileURL(join(tmp, "searchCardSpecs.mjs")).href
);
// The search card + View Number sheet live in the shared PropertySearchCard (also used by agents).
const searchSrc = readFileSync(join(SRC, "features", "buyer", "screens", "SearchScreen.js"), "utf8") +
  readFileSync(join(SRC, "features", "buyer", "components", "PropertySearchCard.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}
const allNull = (fn, values) => values.filter((v) => fn(v) !== null);
const JUNK = [undefined, null, "", "abc", NaN, Infinity, -1, true, false, {}, []];

// --- 1. Rating -------------------------------------------------------------------
check("R1 a real rating is shown", displayRating(4.3) === "4.3" && displayRating(5) === "5" && displayRating("4.25") === "4.3");
check("R2 missing or invalid ratings are not shown", allNull(displayRating, [...JUNK, 0, 5.1, 10]).length === 0, allNull(displayRating, [...JUNK, 0, 5.1, 10]));
check("R3 no 4.9 fallback anywhere in SearchScreen", !/4\.9/.test(searchSrc));
check(
  "R4 the rating badge renders only with a real rating (no empty placeholder)",
  searchSrc.includes("ratingText: displayRating(property.rating),") &&
    /\{ratingText \? \(\s*<View style=\{styles\.ratingBadge\}>/.test(searchSrc) &&
    !searchSrc.includes("property.rating ||")
);

// --- 2. Beds and baths -------------------------------------------------------------
check("B1 real counts are shown", displayCount(3) === 3 && displayCount(1) === 1 && displayCount("2") === 2 && displayCount(99) === 99);
check(
  "B2 missing, zero, fractional or junk counts are not shown",
  allNull(displayCount, [...JUNK, 0, 1.5, 100]).length === 0,
  allNull(displayCount, [...JUNK, 0, 1.5, 100])
);
// Any default after a beds/baths expression: `? property.beds : 3`, `property.baths || 2`, ...
const countFallback = /property\.(beds|baths)[^}\n]*(:\s*\d|\|\|\s*\d|\?\?\s*\d)/;
check("B3 no 3-beds / 2-baths fallbacks remain", !countFallback.test(searchSrc), (searchSrc.match(countFallback) || [])[0]);
check(
  "B4 each count renders only when real, and the row is skipped when nothing is known",
  searchSrc.includes("beds: displayCount(property.beds),") &&
    searchSrc.includes("baths: displayCount(property.baths),") &&
    searchSrc.includes("{beds || baths || areaValue ? (") &&
    /\{beds \? \(\s*<Text style=\{styles\.specItem\}>/.test(searchSrc) &&
    /\{baths \? \(\s*<Text style=\{styles\.specItem\}>/.test(searchSrc)
);

// --- 3. Construction status ------------------------------------------------------
check(
  "C1 real statuses are kept",
  validConstructionStatus("Ready to move") === "Ready to move" &&
    validConstructionStatus("Under Construction") === "Under Construction" &&
    validConstructionStatus(" new launch ") === "New Launch"
);
check(
  "C2 missing or unknown statuses are null (not 'Ready to move' / 'New Launch')",
  allNull(validConstructionStatus, [...JUNK, "Just Added", "Verified", "READY_TO_MOVE"]).length === 0
);
check(
  "C3 the card shows only a real status (no badge-based or default status)",
  searchSrc.includes("statusText: validConstructionStatus(property.constructionStatus),") &&
    /\{statusText \? \(\s*<View style=\{styles\.statusPill\}>/.test(searchSrc) &&
    !/"Just Added" \? "New Launch"|constructionStatus \|\| "Ready to move"/.test(searchSrc)
);

// Filter behaviour over a mixed set, as SearchScreen applies it.
const listings = [
  { id: 1, constructionStatus: "Ready to move" },
  { id: 2, constructionStatus: "Under Construction" },
  { id: 3, constructionStatus: "New Launch" },
  { id: 4, constructionStatus: undefined },
  { id: 5, constructionStatus: "" },
  { id: 6, constructionStatus: "Something else" },
];
const ids = (selected) => listings.filter((l) => matchesStatusFilter(l.constructionStatus, selected)).map((l) => l.id);
check("F1 'All Status' keeps every listing, including ones with no status", JSON.stringify(ids("All Status")) === "[1,2,3,4,5,6]", ids("All Status"));
check("F2 'Ready to move' matches only real Ready-to-move listings", JSON.stringify(ids("Ready to move")) === "[1]", ids("Ready to move"));
check("F3 other statuses match only their real listings", JSON.stringify(ids("Under Construction")) === "[2]" && JSON.stringify(ids("New Launch")) === "[3]");
check("F4 a missing status matches no specific status", ["Ready to move", "Under Construction", "New Launch"].every((s) => !ids(s).includes(4) && !ids(s).includes(5)));
check(
  "F5 SearchScreen's filter uses matchesStatusFilter (no default status)",
  searchSrc.includes("if (!matchesStatusFilter(item.constructionStatus, selectedStatus)) return false;") &&
    !searchSrc.includes('item.constructionStatus || "Ready to move"')
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall search-card-facts checks passed");
