// Regression test: Menu's "Chennai Market Insights" pane shows no unsupported
// claims. Removed: invented statistics ("15% increase in capital
// appreciation", "4.2 million sq ft" absorption), a "CMDA & DTCP Approval
// Guide" card for a checklist that does not exist, and the "CMDA & RERA
// Verified" / "RESTAMP inspects parent title deeds" trust claim — no title,
// RERA or CMDA verification exists anywhere in the backend (listing
// "verification" is a review status). With no verified market-insights
// source, the pane shows a neutral "not available yet" state.
// Run with: node scripts/menu-market-insights.test.mjs  (plain node, no deps)
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

const unsupported = [
  "MARKET_INSIGHTS",
  "15% increase",
  "capital appreciation",
  "4.2 million sq ft",
  "gross absorption",
  "Global Capability Centers",
  "CMDA & DTCP Approval Guide",
  "Essential checklist",
  "CMDA & RERA Verified",
  "inspects parent title deeds",
  "title deeds",
  "Market intelligence, growth corridors",
  "High Growth",
];
check(
  "I1 the invented statistics, non-existent guide and trust claim are gone",
  unsupported.every((t) => !menuSrc.includes(t)),
  unsupported.filter((t) => menuSrc.includes(t))
);
check(
  "I2 no verification badge (ShieldCheck / shieldCard) is rendered in Menu",
  !/<ShieldCheck\b|styles\.shield/.test(menuSrc)
);

const paneAt = menuSrc.indexOf('activeVerticalTab === "insights"');
const pane = paneAt >= 0 ? menuSrc.slice(paneAt, menuSrc.indexOf("<View style={{ height: 40 }} />", paneAt)) : "";
check("I3 the insights pane still exists (design preserved)", pane.includes("Chennai Market Insights") && pane.includes("styles.insightBox"));
check("I4 it shows the neutral 'not available yet' state", pane.includes("Market insights are not available yet."));
check(
  "I5 its only action is the honest Search shortcut",
  pane.includes("onPress={() => handleNavigateToSearch()}") && pane.includes("Explore Properties")
);
check(
  "I6 no percentages or volume figures are shown in the pane",
  !/\d+(\.\d+)?\s*%|\d+(\.\d+)?\s*million/i.test(pane),
  (pane.match(/\d+(\.\d+)?\s*%|\d+(\.\d+)?\s*million/gi) || []).slice(0, 3)
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall menu-market-insights checks passed");
