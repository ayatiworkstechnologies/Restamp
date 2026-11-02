// Regression test: Menu's "Chennai locality rates" / price estimator shows no
// fabricated market figures (invented per-locality prices, % changes, rental
// yields, or valuations computed from them). With no verified price API, the
// pane shows a neutral "not available yet" state; the locality + deal-type
// "Search in <locality>" shortcut keeps working.
// Run with: node scripts/menu-price-trends.test.mjs  (plain node, no deps)
//
// MenuScreen imports React Native and cannot run here, so its content is
// guarded by source-text assertions (same approach as the other screen tests).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const menuSrc = readFileSync(join(ROOT, "..", "src", "features", "buyer", "screens", "MenuScreen.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// The fabricated trend table and the estimator that was computed from it.
const removedIdentifiers = ["CHENNAI_PRICE_TRENDS", "getLocalityData", "calculateEstimate", "currentLocData", "rentYield"];
check(
  "T1 fabricated trend data and the estimator built on it are gone",
  removedIdentifiers.every((id) => !menuSrc.includes(id)),
  removedIdentifiers.filter((id) => menuSrc.includes(id))
);

// The specific invented figures (avg price per sqft, % change, rental yield).
const fabricated = [
  "₹12,800/sqft", "₹6,850/sqft", "₹8,200/sqft", "₹10,200/sqft", "₹6,100/sqft",
  "+8.4%", "+11.2%", "+6.1%", "+9.0%", "+13.5%", "+7.8%",
  "rate: 12800", "rate: 14500", "rate: 6850",
];
check(
  "T2 none of the invented trend figures remain",
  fabricated.every((f) => !menuSrc.includes(f)),
  fabricated.filter((f) => menuSrc.includes(f))
);
check(
  "T3 no UI labels present the figures as live market data",
  !/Real-time micro-market valuation|VALUATION RESULT|AVG SQ FT RATE|RENTAL YIELD|Yield: \{/.test(menuSrc)
);

// Neutral availability state in the rates card.
const ratesAt = menuSrc.indexOf("CHENNAI LOCALITY RATES");
const ratesBlock = ratesAt >= 0 ? menuSrc.slice(ratesAt, ratesAt + 900) : "";
check(
  "T4 the rates card shows a neutral 'not available yet' state",
  ratesBlock.includes("styles.ratesCard") && ratesBlock.includes("Price trends are not available yet.")
);

// Unrelated Menu behaviour preserved.
check(
  "T5 'Search in <locality>' still navigates to Search with locality and deal type",
  menuSrc.includes("Search in {estLocality}") &&
    /locality: estLocality,\s*\n\s*dealType: priceDealType,/.test(menuSrc) &&
    menuSrc.includes("onPress={cyclePriceDealType}")
);
check(
  "T6 Owner Plan tab and its gating are unchanged",
  menuSrc.includes('{ id: "owner", label: "Owner Plan", icon: Crown }') &&
    menuSrc.includes('...(AGENT_MODULE_ENABLED ? [{ id: "agent", label: "Agent Plan", icon: Briefcase }] : [])')
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall menu-price-trends checks passed");
