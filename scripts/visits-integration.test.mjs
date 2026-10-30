// Regression tests for real visit + owner-lifecycle API integration.
// Run with: node scripts/visits-integration.test.mjs  (plain node, no deps)
// Covers: visits.js payload mapping (modal date/time -> backend ISO UTC,
// future-only), server->UI mapping (no invented agent identity/phones),
// buyer/owner visit CRUD contracts via stubbed fetch (no backend contacted),
// owner lifecycle helpers (submit/verify/publish/archive/status) paths, and
// source guards proving mock visit/phone flows are gone from live paths.
//
// Same harness as buyer-flow.test.mjs: src/api/*.js use extensionless
// imports (Metro), so copy to tmp with extensions fixed. React screens and
// components cannot run here; their wiring is verified by source assertions
// plus `npm run build:web` (Metro parse). Stated here, not claimed.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SHARED_API = join(ROOT, "..", "src", "shared", "api");
const BUYER_API = join(ROOT, "..", "src", "features", "buyer", "api");
const OWNER_API = join(ROOT, "..", "src", "features", "owner", "api");
const tmp = mkdtempSync(join(tmpdir(), "visits-integration-test-"));
for (const f of ["client.js", "mappers.js", "contact.js", "visits.js"]) {
  copyFileSync(join(SHARED_API, f), join(tmp, f));
}
for (const f of ["enquiries.js", "buyerMode.js", "buyerModeCore.js"]) {
  copyFileSync(join(BUYER_API, f), join(tmp, f));
}
copyFileSync(join(OWNER_API, "owner.js"), join(tmp, "owner.js"));
for (const f of ["contact.js", "enquiries.js", "visits.js", "owner.js", "mappers.js", "buyerMode.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(tmp, f), "utf8")
      .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
      .replace(/from "[^"]*mappers(\.js)?"/g, 'from "./mappers.js"')
      .replace(/from "[^"]*buyerModeCore(\.js)?"/g, 'from "./buyerModeCore.js"')
      .replace(/from "[^"]*buyerMode(\.js)?"/g, 'from "./buyerMode.js"')
  );
}
const visits = await import(join(tmp, "visits.js"));
const owner = await import(join(tmp, "owner.js"));

function src(rel) {
  return readFileSync(join(ROOT, "..", rel), "utf8");
}

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

function futureParts(daysAhead = 7) {
  const d = new Date(Date.now() + daysAhead * 86400000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { date: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`, time: "04:30 PM" };
}

// --- 1. Payload mapping ------------------------------------------------
{
  const { date, time } = futureParts(7);
  const body = visits.toVisitPayload({ date, time, note: "Evening please" });
  const ts = Date.parse(body.scheduled_at);
  check(
    "V1 modal date/time maps to future backend ISO datetime",
    body.scheduled_at.endsWith("Z") && ts > Date.now() && body.note === "Evening please"
  );
  let threw = 0;
  for (const bad of [
    { date: "not a date", time },
    { date, time: "sometime" },
    { date: "01 Jan 2000", time },
  ]) {
    try {
      visits.toVisitPayload(bad);
    } catch {
      threw += 1;
    }
  }
  check("V2 invalid/past date-times throw before any POST", threw === 3);
}

// --- 2. Server -> UI mapping (no invented identity) --------------------
{
  const ui = visits.toUiVisit({
    id: 42,
    property_listing_id: 7,
    buyer_user_id: 3,
    owner_user_id: 9,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    status: "CONFIRMED",
    initiator: "OWNER",
    note: "See you then",
    listing: { title: "2 BHK", price_paise: 500000000, price_period: "TOTAL" },
  });
  const blob = JSON.stringify(ui);
  check(
    "V3 UI visit carries server ids/status, never agent identity or phones",
    ui.id === 42 &&
      ui.property_listing_id === 7 &&
      ui.status === "upcoming" &&
      ui.serverStatus === "CONFIRMED" &&
      !blob.includes("agentName") &&
      !blob.includes("agentPhone") &&
      !blob.includes("+91")
  );
  const terminal = visits.toUiVisit({ id: 1, status: "COMPLETED", scheduled_at: null, listing: {} });
  const cancelled = visits.toUiVisit({ id: 2, status: "DECLINED", scheduled_at: null, listing: {} });
  check(
    "V4 terminal statuses bucket honestly",
    terminal.status === "completed" && cancelled.status === "cancelled"
  );
}

// --- 3. API contracts (stubbed fetch) -----------------------------------
{
  const realFetch = globalThis.fetch;
  let lastUrl = null;
  let lastOptions = null;
  globalThis.fetch = async (url, options = {}) => {
    lastUrl = String(url);
    lastOptions = options;
    return { ok: true, status: 201, json: async () => ({ id: 11, status: "REQUESTED" }) };
  };
  await visits.createBuyerVisit({ listingId: 7, scheduledAtISO: "2030-01-01T10:00:00.000Z", note: "Hi" });
  const sent = JSON.parse(lastOptions.body || "{}");
  check(
    "V5 buyer create posts persisted contract",
    lastUrl.includes("/buyer/visits") &&
      sent.property_listing_id === 7 &&
      sent.scheduled_at === "2030-01-01T10:00:00.000Z" &&
      sent.note === "Hi"
  );
  await visits.updateBuyerVisit(11, { scheduledAtISO: "2030-02-01T10:00:00.000Z" });
  check(
    "V6 buyer reschedule PATCHes time only",
    lastUrl.includes("/buyer/visits/11") &&
      (lastOptions.method || "").toUpperCase() === "PATCH" &&
      JSON.parse(lastOptions.body).scheduled_at === "2030-02-01T10:00:00.000Z"
  );
  await visits.proposeOwnerVisit({ listingId: 7, buyerUserId: 3, scheduledAtISO: "2030-01-01T10:00:00.000Z" });
  const proposed = JSON.parse(lastOptions.body || "{}");
  check(
    "V7 owner propose posts listing + real buyer id (never invented)",
    lastUrl.includes("/owner/visits") &&
      proposed.property_listing_id === 7 &&
      proposed.buyer_user_id === 3
  );
  await owner.verifyListing(9);
  check("V8 owner verify hits explicit endpoint", lastUrl.includes("/owner/listings/9/verify"));
  await owner.publishListing(9);
  check("V9 owner publish hits explicit endpoint", lastUrl.includes("/owner/listings/9/publish"));
  await owner.archiveListing(9);
  check("V10 owner archive hits explicit endpoint", lastUrl.includes("/owner/listings/9/archive"));
  await owner.updateListingStatus(9, { status: "CLOSED", closedReason: "Rented out" });
  const st = JSON.parse(lastOptions.body || "{}");
  check(
    "V11 owner status posts status + reason",
    lastUrl.includes("/owner/listings/9/status") &&
      st.status === "CLOSED" &&
      st.closed_reason === "Rented out"
  );
  await owner.submitListing(9);
  check("V12 owner resubmit hits explicit endpoint", lastUrl.includes("/owner/listings/9/submit"));
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ detail: "BUYER role required" }) });
  let err = null;
  try {
    await visits.createBuyerVisit({ listingId: 7, scheduledAtISO: "2030-01-01T10:00:00.000Z" });
  } catch (e) {
    err = e;
  }
  check("V13 role errors propagate with status (never false success)", err?.status === 403);
  globalThis.fetch = realFetch;
}

// --- 4. Live-flow source guards ------------------------------------------
{
  const detailSrc = src("src/features/buyer/components/PropertyDetailModal.js");
  check(
    "V14 detail modal schedules only via backend (no mock ids/phones)",
    detailSrc.includes("createBuyerVisit") &&
      detailSrc.includes("updateBuyerVisit") &&
      !detailSrc.includes("visit-${Date.now()}") &&
      !detailSrc.includes('agentPhone: property.agent?.phone || "+91')
  );
  const savedSrc = src("src/features/buyer/screens/SavedScreen.js");
  check(
    "V15 saved visits are server-backed, buyer-complete removed",
    savedSrc.includes("fetchBuyerVisits") &&
      !savedSrc.includes("visitsStore") &&
      !savedSrc.includes("handleMarkVisitCompleted") &&
      !savedSrc.includes('|| "+919790988123"')
  );
  const leadSrc = src("src/features/owner/screens/OwnerLeadDetailScreen.js");
  const ownerVisitFlowSrc = src("src/features/owner/utils/ownerVisits.js");
  check(
    "V16 owner proposes visits via backend (relationship-gated)",
    leadSrc.includes("proposeVisitForLead") &&
      ownerVisitFlowSrc.includes("proposeOwnerVisit") &&
      ownerVisitFlowSrc.includes("buyer_user_id") &&
      !leadSrc.includes("scheduleVisit(")
  );
  const propsSrc = src("src/features/owner/screens/OwnerPropertiesScreen.js");
  check(
    "V17 owner lifecycle wired (verify/publish/archive)",
    propsSrc.includes("verifyListing") &&
      propsSrc.includes("publishListing") &&
      propsSrc.includes("archiveListing") &&
      propsSrc.includes("updateListingStatus")
  );
  const modalSrc = src("src/features/buyer/components/PropertyDetailModal.js");
  check(
    "V18 detail shows real owner name, secure call flow (guest login-resume, no auto-dial)",
    modalSrc.includes("property.ownerName") &&
      modalSrc.includes("handleCallOwner") &&
      modalSrc.includes("revealContactPhone") &&
      modalSrc.includes("tel:${phone}") &&
      !modalSrc.includes("Contact Number Unavailable\",\n                    \"Owner contact details are shared only")
  );
  const leadDetailSrc = src("src/features/owner/screens/OwnerLeadDetailScreen.js");
  check(
    "V19 owner close offers real outcomes (sold/rented/leased/archive)",
    propsSrc.includes('"SOLD"') &&
      propsSrc.includes('"RENTED"') &&
      propsSrc.includes('"LEASED"') &&
      leadDetailSrc.includes("proposeVisitForLead") &&
      !leadDetailSrc.includes("scheduleVisit(")
  );
  const mapperSrc = src("src/shared/api/mappers.js");
  check(
    "V20 mapper forwards sanitized owner_name, never invents one",
    mapperSrc.includes("card.owner_name") && mapperSrc.includes("ownerName")
  );

  const ownerVisitsSrc = src("src/features/owner/screens/OwnerVisitsScreen.js");
  const ownerContextSrc = src("src/features/owner/context/OwnerContext.js");
  const ownerNavSrc = src("src/features/owner/navigation/OwnerNavigator.js");
  check(
    "V21 owner visits screen is server-backed and reachable",
    ownerVisitsSrc.includes("fetchOwnerVisits") &&
      ownerVisitsSrc.includes("updateOwnerVisit") &&
      ownerVisitsSrc.includes("toUiVisit") &&
      ownerNavSrc.includes("OwnerVisitsScreen") &&
      ownerNavSrc.includes('name="Visits"') &&
      !ownerContextSrc.includes("visit_scheduled") &&
      !ownerContextSrc.includes("visitData: visitDetails")
  );

  check(
    "V22 buyer confirms/declines proposals through the visits API",
    savedSrc.includes("updateBuyerVisit") &&
      savedSrc.includes('"PROPOSED"') &&
      savedSrc.includes('"CONFIRMED"') &&
      savedSrc.includes('"DECLINED"') &&
      savedSrc.includes("submitBuyerVisitStatus")
  );
}

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
}
console.log("all visits-integration tests passed");