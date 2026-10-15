// Regression tests for P3 Owner Leads MVP.
// Run with: node scripts/owner-leads-honesty.test.mjs  (plain node, no deps)
// Covers: fetchOwnerLeads request contract + toOwnerLead honest mapping (no
// phone/name/avatar/rating invention); lead screens fetch genuine data with
// loading/error/empty states and backend-validated property filters; no
// fabricated call/message/rating/message/price fallbacks in touched flows;
// dashboard recent leads reuse the same endpoint; P0/P1/P2/API-URL guards.
//
// Same harness as the other script tests: src/api/*.js use extensionless
// imports (Metro), so copy to tmp with extensions fixed. Network is fully
// stubbed via global.fetch — no backend is contacted. React screens import
// React and cannot run in this harness; their wiring is guarded by
// source-text assertions below plus inspection and `npm run build:web`
// (Metro parse). Stated here, not overstated.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src", "api");
const tmp = mkdtempSync(join(tmpdir(), "owner-leads-test-"));
for (const f of ["owner.js", "client.js", "mappers.js"]) {
  copyFileSync(join(SRC, f), join(tmp, f));
}
writeFileSync(
  join(tmp, "owner.js"),
  readFileSync(join(tmp, "owner.js"), "utf8")
    .replace('from "./client"', 'from "./client.js"')
    .replace('from "./mappers"', 'from "./mappers.js"')
);
const { fetchOwnerLeads, toOwnerLead, selectPropertyLeads, toOwnerProperty } = await import(
  join(tmp, "owner.js")
);

function src(rel) {
  return readFileSync(join(ROOT, "..", rel), "utf8");
}
const ownerLeadsSrc = src("src/screens/owner/OwnerLeadsScreen.js");
const propertyLeadsSrc = src("src/screens/owner/OwnerPropertyLeadsScreen.js");
const dashboardSrc = src("src/screens/owner/OwnerDashboardScreen.js");
const leadDetailSrc = src("src/screens/owner/OwnerLeadDetailScreen.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const realFetch = globalThis.fetch;
const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

// --- 1. fetchOwnerLeads contract (stubbed fetch captures path + params) ---
let lastUrl = null;
globalThis.fetch = async (url) => {
  lastUrl = String(url);
  return jsonResponse({
    items: [
      {
        id: 11,
        property_listing_id: 77,
        buyer_user_id: 913,
        message: "Is this available?",
        status: "NEW",
        closing_reason: null,
        listing: { title: "2 BHK in Anna Nagar", price_paise: 2500000, price_period: "MONTHLY" },
      },
    ],
    total: 1,
    page: 1,
    page_size: 50,
  });
};
{
  const resp = await fetchOwnerLeads({ propertyListingId: 77, pageSize: 100 });
  check(
    "L1 fetches owner endpoint with validated property filter",
    lastUrl.includes("/owner/leads") &&
      lastUrl.includes("property_listing_id=77") &&
      lastUrl.includes("page_size=100") &&
      resp.total === 1 &&
      resp.items.length === 1
  );
}
{
  lastUrl = null;
  await fetchOwnerLeads({ status: "CONTACTED" });
  check(
    "L2 status param forwarded (existing vocab only)",
    lastUrl.includes("/owner/leads") && lastUrl.includes("status=CONTACTED")
  );
}
globalThis.fetch = realFetch;

// --- 2. toOwnerLead honest mapping (functional) ---
{
  const lead = toOwnerLead({
    id: 11,
    property_listing_id: 77,
    buyer_user_id: 913,
    message: "Is this available?",
    status: "NEW",
    closing_reason: null,
    listing: { title: "2 BHK in Anna Nagar", price_paise: 2500000, price_period: "MONTHLY" },
  });
  check(
    "L3 genuine fields mapped (id, property, buyer, message, status, price)",
    lead.id === 11 &&
      lead.propertyId === "77" &&
      lead.property_listing_id === 77 &&
      lead.buyer_user_id === 913 &&
      lead.message === "Is this available?" &&
      lead.status === "new" &&
      lead.propertyTitle === "2 BHK in Anna Nagar" &&
      typeof lead.propertyPrice === "string" &&
      lead.propertyPrice.includes("25,000")
  );
  check(
    "L4 nothing invented (no phone/name/avatar/rating/budget/visits)",
    lead.phone === undefined &&
      lead.avatar === undefined &&
      lead.rating === undefined &&
      lead.email === undefined &&
      lead.budget === undefined &&
      lead.timestamp === undefined &&
      lead.visitData === undefined &&
      !("agent" in lead)
  );
  const empty = toOwnerLead({
    id: 12,
    property_listing_id: 78,
    buyer_user_id: 914,
    message: null,
    status: "CONTACTED",
    closing_reason: null,
    listing: null,
  });
  check(
    "L5 missing message/listing stay missing (never synthesized)",
    empty.message === undefined &&
      empty.propertyTitle === "" &&
      empty.propertyPrice === "" &&
      empty.status === "contacted"
  );
}
{
  // Property isolation helper still genuine-only.
  const a = { id: 1, propertyId: "77", propertyTitle: "X" };
  const b = { id: 2, propertyId: "78", propertyTitle: "Y" };
  check(
    "L6 selectPropertyLeads isolates by property",
    selectPropertyLeads([a, b], { id: "77", title: "X" }).length === 1 &&
      selectPropertyLeads([a, b], { id: "77", title: "X" })[0].id === 1
  );
}

// --- 3. Screen wiring guards ---
for (const [label, s] of [["Leads", ownerLeadsSrc], ["PropertyLeads", propertyLeadsSrc]]) {
  check(
    `${label} fetches genuine leads (no local mock source)`,
    s.includes("fetchOwnerLeads") &&
      s.includes("toOwnerLead") &&
      !s.includes("INITIAL_LEADS") &&
      s.includes("serverLeads")
  );
  check(
    `${label} honest states (loading/error/empty, retry)`,
    s.includes("leadsLoading") &&
      s.includes("leadsError") &&
      s.includes("Couldn't load") &&
      s.includes("No buyer leads yet") === (label === "Leads") &&
      (s.includes("No buyer leads yet") || s.includes("No Leads Yet"))
  );
  check(
    `${label} no fabricated phone fallbacks`,
    !s.includes('phone || "+') &&
      !s.includes('phone || "+91') &&
      s.includes("Phone Number Unavailable")
  );
  check(
    `${label} no invented ratings/messages`,
    !s.includes("rating || 5") &&
      !s.includes("Great place with a lovely garden") &&
      s.includes("No message provided.")
  );
}
check(
  "Dashboard recent leads reuse the same endpoint",
  dashboardSrc.includes("fetchOwnerLeads") &&
    dashboardSrc.includes("toOwnerLead") &&
    dashboardSrc.includes("serverRecentLeads") &&
    !dashboardSrc.includes("/owner/leads?") &&
    dashboardSrc.includes("Phone Number Unavailable")
);
check(
  "Dashboard no invented chip/counter fallbacks",
  !dashboardSrc.includes('"2 BHK Luxury"') &&
    !dashboardSrc.includes('|| "Verified"') &&
    !dashboardSrc.includes('phone || "+91')
);
check(
  "LeadDetail honest fallbacks (no synthetic property/identity)",
  !leadDetailSrc.includes('"2 BHK Luxury Apartment"') &&
    !leadDetailSrc.includes('"Anna Nagar, Chennai"') &&
    !leadDetailSrc.includes("prop-lead") &&
    !leadDetailSrc.includes("FOR RENT") &&
    leadDetailSrc.includes("Property Details Unavailable") &&
    leadDetailSrc.includes("Not available") &&
    leadDetailSrc.includes("Phone Number Unavailable")
);

// --- 4. P4 status persistence + stale-request protection ---
{
  const { updateOwnerLeadStatus } = await import(join(tmp, "owner.js"));

  // Update contract: PATCH path, normalized vocab, reason forwarded.
  let patchUrl = null;
  let patchBody = null;
  globalThis.fetch = async (url, options = {}) => {
    patchUrl = String(url);
    try {
      patchBody = JSON.parse(options.body || "{}");
    } catch {
      patchBody = null;
    }
    return jsonResponse({
      id: 11,
      property_listing_id: 77,
      buyer_user_id: 913,
      message: "Hi",
      status: "CONTACTED",
      closing_reason: null,
      listing: { title: "T", price_paise: 100, price_period: "TOTAL" },
    });
  };
  await updateOwnerLeadStatus(11, { status: "contacted" });
  check(
    "P4 update contract (PATCH path, normalized status, no invented fields)",
    patchUrl.includes("/owner/leads/11") &&
      patchBody &&
      patchBody.status === "CONTACTED" &&
      !("closing_reason" in patchBody)
  );
  await updateOwnerLeadStatus(11, { status: "closed", closingReason: "Not Converted" });
  check(
    "P4 close contract (CLOSED + closing reason preserved)",
    patchBody.status === "CLOSED" && patchBody.closing_reason === "Not Converted"
  );
  globalThis.fetch = realFetch;
}
for (const [label, s] of [["Leads", ownerLeadsSrc], ["PropertyLeads", propertyLeadsSrc]]) {
  check(
    `${label} server-confirmed updates (no false success)`,
    s.includes("updateOwnerLeadStatus") &&
      s.includes("toOwnerLead(updated)") &&
      s.includes("Couldn't update lead")
  );
  check(
    `${label} stale responses guarded (request-ID, unmount invalidation)`,
    s.includes("leadReqId") &&
      s.includes("leadReqId.current !== myReq") &&
      s.includes("leadReqId.current++")
  );
  check(
    `${label} close never touches the listing`,
    !s.includes("closeLead(leadId, outcome, closeProp") &&
      !s.includes("closeLead(leadId, reason)") &&
      (s.includes("closeLead(leadId, outcome, false, null)") ||
        s.includes("closeLead(leadId, reason, false, null)"))
  );
}
check(
  "LeadDetail persists close as CLOSED (no LOST) with rollback",
  leadDetailSrc.includes("persistLeadStatus") &&
    leadDetailSrc.includes('persistLeadStatus("closed", outcome)') &&
    !leadDetailSrc.includes('status: "lost"') &&
    !leadDetailSrc.includes('"lost" : "closed"') &&
    leadDetailSrc.includes("Couldn't update lead")
);
check(
  "Close modal offers no listing side effect",
  (() => {
    const modalSrc = src("src/screens/owner/OwnerCloseLeadModal.js");
    return (
      !modalSrc.includes("closePropertyToo") &&
      !modalSrc.includes("listing status has been updated") &&
      modalSrc.includes("onCloseLeadWithOutcome?.(lead.id, selectedOutcome, false, null)")
    );
  })()
);
check(
  "Dashboard recent-leads fetch guarded",
  dashboardSrc.includes("recentLeadsReqId") &&
    dashboardSrc.includes("recentLeadsReqId.current !== myReq")
);

// --- 6. My Leads server properties + initialTab + badge removal ---
{
  const profileSrc = src("src/screens/owner/OwnerProfileScreen.js");
  check(
    "S1 selector loads real properties (never context-only)",
    ownerLeadsSrc.includes("fetchOwnerListings") &&
      ownerLeadsSrc.includes("toOwnerProperty") &&
      ownerLeadsSrc.includes("serverProperties") &&
      ownerLeadsSrc.includes("loadProperties") &&
      ownerLeadsSrc.includes("propsReqId") &&
      ownerLeadsSrc.includes("Couldn't load properties")
  );
  check(
    "S2 property fetch never silently empties (error stays error)",
    ownerLeadsSrc.includes("setPropsError(true)") &&
      ownerLeadsSrc.includes("propsError && properties.length === 0")
  );
  check(
    "S3 initialTab honored only for supported tabs",
    ownerLeadsSrc.includes("route?.params?.initialTab") &&
      ownerLeadsSrc.includes("LEAD_FILTERS.includes(route?.params?.initialTab)") &&
      ownerLeadsSrc.includes("[route?.params?.initialTab]")
  );
  check(
    "S4 profile numeric badges removed (layout/nav intact)",
    !profileSrc.includes("countBadge") &&
      !profileSrc.includes("countText") &&
      !profileSrc.includes("activePropertiesCount") &&
      !profileSrc.includes("visitsCount") &&
      profileSrc.includes("badgeRow") &&
      profileSrc.includes('navigation.navigate("Leads")')
  );
  const mapped = toOwnerProperty({
    listing_id: 42,
    title: "T",
    transaction_type: "RENT",
    property_type: "APARTMENT",
    price_paise: 2500000,
    price_period: "MONTHLY",
    price_display: "₹25,000/mo",
    construction_status: null,
    verification_status: "VERIFIED",
    listing_status: "AVAILABLE",
    description: "",
    locality: "L",
    city: "C",
    district: "D",
    pincode: "600001",
    address_line: "A",
    area_value: 100,
    area_unit: "sqft",
    bedrooms: 2,
    bathrooms: 2,
    cover_image_url: null,
  });
  check(
    "S5 server property maps to selector identity (VERIFIED→active)",
    mapped.id === "42" && mapped.listing_id === 42 && mapped.status === "active"
  );
}

// --- 5. P0/P1/P2/API-URL guards intact ---
{
  const wishlistSrc = src("src/context/WishlistContext.js");
  const ctxSrc = src("src/context/OwnerContext.js");
  const clientSrc = src("src/api/client.js");
  const enquiriesScreenSrc = src("src/screens/buyer/EnquiriesScreen.js");
  check(
    "P5 P2 buyer honesty intact",
    wishlistSrc.includes("useState([])") &&
      !wishlistSrc.includes("restoreDefaultWishlist") &&
      !enquiriesScreenSrc.includes("INITIAL_ENQUIRIES")
  );
  check(
    "P6 P0/P1/API-URL intact",
    ctxSrc.includes("const INITIAL_PROPERTIES = [];") &&
      ctxSrc.includes("const INITIAL_LEADS = [];") &&
      clientSrc.includes("resolveApiBaseUrl")
  );
}

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all owner-leads-honesty tests passed");
}
