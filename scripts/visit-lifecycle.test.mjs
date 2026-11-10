// Regression tests for the two-way site-visit lifecycle in the app:
//   T  Buyer Activity has a reachable Visits tab (removed by 90e68f5 while
//      its panel, loader and handlers stayed in SavedScreen)
//   P  Owner "Propose Visit": leads on listings that are not live (closed,
//      removed, under review) say so instead of offering a proposal the
//      backend must refuse — previously shown as "The visit or listing
//      could not be found"
//   C  Owner counter-proposal on a buyer request (REQUESTED -> PROPOSED at
//      the new time) is offered and described honestly
//   B  Buyer answers an owner-proposed time (confirm/decline), never
//      "reschedules" it, and sees who set the time
// Run with: node scripts/visit-lifecycle.test.mjs  (plain node, no deps)
//
// src/ is copied to a tmp dir as an ES module tree so pure modules import
// for real; React screens are guarded by source-text assertions.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const src = (p) => readFileSync(join(SRC, p), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "visit-lifecycle-test-"));
cpSync(SRC, join(tmp, "src"), { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
const statusPath = join(tmp, "src", "shared", "utils", "visitStatus.js");
writeFileSync(statusPath, readFileSync(statusPath, "utf8").replace('from "../constants/colors"', 'from "../constants/colors.js"'));
const load = (rel) => import(pathToFileURL(join(tmp, "src", rel)).href);

const ownerVisits = await load("features/owner/utils/ownerVisits.js");
const visitStatus = await load("shared/utils/visitStatus.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- T: Buyer Activity Visits tab ------------------------------------------
const savedSrc = src("features/buyer/screens/SavedScreen.js");
check(
  "T1 Activity has a Visits tab button wired to the visits panel",
  savedSrc.includes('onPress={() => setActiveTab("visits")}') &&
    /activeTab === "visits" && styles\.tabButtonTextActive\]\}>\s*Visits\s*<\/Text>/.test(savedSrc) &&
    savedSrc.includes('{activeTab === "visits" && (')
);
check(
  "T2 the tab shows the server-backed visit count and the panel loads GET /buyer/visits",
  savedSrc.includes("{siteVisits.length}") && savedSrc.includes("fetchBuyerVisits({ page: 1, pageSize: 50 })")
);
check(
  "T3 the existing tabs are all still present (Agents tab removed)",
  ["wishlist", "call", "messages", "visits", "viewed"].every((t) => savedSrc.includes(`onPress={() => setActiveTab("${t}")}`)) &&
    !savedSrc.includes('setActiveTab("agents")')
);
check(
  "T4 SavedScreen is the Activity tab in the real navigator",
  src("shared/navigation/AppNavigator.js").includes('<Tab.Screen name="Activity" component={SavedScreen} />')
);
check(
  "T5 visits reload when Activity regains focus (owner changes show up)",
  /loadServerVisits\(\)\.catch\(\(\) => \{\}\);[\s\S]{0,200}\[refreshWishlist, loadServerVisits/.test(savedSrc)
);

// --- P: propose only on live listings ---------------------------------------
const blocked = ownerVisits.leadVisitBlockedReason;
const live = { verification_status: "VERIFIED", listing_status: "AVAILABLE" };
check("P1 live listing -> proposal allowed", blocked(live, {}) === null);
check("P2 unknown property (not loaded) -> server decides", blocked(null, {}) === null && blocked({}, {}) === null);
check("P3 closed/sold listing -> blocked with a reason", /isn't live/.test(blocked({ verification_status: "VERIFIED", listing_status: "CLOSED" }, {}) || ""));
check("P4 under review -> blocked", /under review/.test(blocked({ verification_status: "PENDING", listing_status: "AVAILABLE" }, {}) || ""));
check("P5 rejected -> blocked", /wasn't approved/.test(blocked({ verification_status: "REJECTED", listing_status: "AVAILABLE" }, {}) || ""));
check(
  "P6 removed listing (lead flag or 'no longer available' group) -> blocked",
  /removed/.test(blocked(live, { propertyUnavailable: true }) || "") && /removed/.test(blocked({ unavailable: true }, {}) || "")
);
for (const screen of ["OwnerLeadsScreen.js", "OwnerPropertyLeadsScreen.js", "OwnerLeadDetailScreen.js"]) {
  check(`P7 ${screen} gates "Propose" on leadVisitBlockedReason`, src(`features/owner/screens/${screen}`).includes("leadVisitBlockedReason("));
}
check(
  "P8 the payload still carries the lead's own listing and buyer ids",
  JSON.stringify(
    (({ listingId, buyerUserId }) => ({ listingId, buyerUserId }))(
      ownerVisits.buildOwnerVisitPayload(
        { property_listing_id: 41, buyer_user_id: 7 },
        { date: (() => { const d = new Date(Date.now() + 3 * 864e5); return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`; })(), time: "11:00 AM" }
      )
    )
  ) === JSON.stringify({ listingId: 41, buyerUserId: 7 })
);
check(
  "P9 server 422 detail (e.g. not live) is shown verbatim, 404 keeps its copy",
  ownerVisits.ownerVisitErrorMessage({ status: 422, detail: "Visits can only be scheduled on a live listing" }, "propose").message ===
    "Visits can only be scheduled on a live listing" &&
    ownerVisits.ownerVisitErrorMessage({ status: 404 }, "propose").title === "Couldn't propose visit"
);

// --- C: owner counter-proposal ---------------------------------------------
const actions = ownerVisits.ownerVisitActions;
check("C1 REQUESTED: owner may confirm, decline, counter-propose, cancel", JSON.stringify(actions("REQUESTED")) === JSON.stringify({ confirm: true, decline: true, reschedule: true, complete: false, cancel: true }));
check("C2 PROPOSED: owner may only move/cancel their own proposal", actions("PROPOSED").confirm === false && actions("PROPOSED").reschedule === true);
check("C3 terminal statuses offer nothing", ["DECLINED", "CANCELLED", "COMPLETED", "", null].every((s) => Object.values(actions(s)).every((v) => v === false)));
check("C4 counter-proposal label", ownerVisits.ownerRescheduleLabel("REQUESTED") === "Propose New Time" && ownerVisits.ownerRescheduleLabel("CONFIRMED") === "Reschedule");
check(
  "C5 success copy never calls a counter-proposal booked",
  ownerVisits.ownerRescheduleSuccess("REQUESTED").title === "New Time Proposed" &&
    /confirm or decline/.test(ownerVisits.ownerRescheduleSuccess("REQUESTED").message) &&
    ownerVisits.ownerRescheduleSuccess("CONFIRMED").title === "Visit Rescheduled"
);
const ownerScreens = ["OwnerLeadsScreen.js", "OwnerPropertyLeadsScreen.js", "OwnerLeadDetailScreen.js", "OwnerVisitsScreen.js"];
check(
  "C6 every owner reschedule path uses the status-aware success copy",
  ownerScreens.every((s) => {
    const text = src(`features/owner/screens/${s}`);
    return text.includes("ownerRescheduleSuccess(") && !text.includes('Alert.alert("Visit Rescheduled", "The proposed time was updated.")');
  })
);

// --- B: buyer side ------------------------------------------------------------
const origin = visitStatus.getVisitOriginLabel;
check("B1 owner-started proposal", origin({ serverStatus: "PROPOSED", initiator: "OWNER" }, "buyer") === "Proposed by the owner");
check("B2 owner counter to the buyer's request", origin({ serverStatus: "PROPOSED", initiator: "BUYER" }, "buyer") === "Owner proposed a new time");
check("B3 buyer's own request", origin({ serverStatus: "REQUESTED", initiator: "BUYER" }, "buyer") === "Requested by you");
check("B4 owner view", origin({ serverStatus: "REQUESTED", initiator: "BUYER" }, "owner") === "Requested by the buyer");
check("B5 unknown initiator/status -> no claim", origin({ serverStatus: "PROPOSED" }, "buyer") === null && origin({ initiator: "OWNER" }, "buyer") === null);
check("B6 status label still comes from the server status", visitStatus.getVisitDisplay({ serverStatus: "CONFIRMED" }, "buyer").label === "Confirmed");
check("B7 the Visits card shows who set the time", savedSrc.includes('getVisitOriginLabel(item, "buyer")'));
const modalSrc = src("features/buyer/components/PropertyDetailModal.js");
check(
  "B8 property modal branches on serverStatus (the UI bucket is never CONFIRMED/PROPOSED)",
  modalSrc.includes("const serverStatus = scheduledVisit.serverStatus;") &&
    !/scheduledVisit\.status === "(CONFIRMED|PROPOSED)"/.test(modalSrc)
);
check(
  "B9 an owner-proposed time is answered (confirm/decline), not rescheduled by the buyer",
  /serverStatus === "PROPOSED"\) \{[\s\S]{0,700}respondToProposedVisit\("DECLINED"\)[\s\S]{0,200}respondToProposedVisit\("CONFIRMED"\)/.test(modalSrc) &&
    modalSrc.includes("updateBuyerVisit(visitId, { status })")
);
check("B10 success copy points at Activity > Visits", !modalSrc.includes("Saved > Visits") && modalSrc.includes("Activity > Visits"));

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall visit-lifecycle checks passed");
