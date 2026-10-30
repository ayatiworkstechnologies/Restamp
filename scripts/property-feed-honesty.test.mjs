// Regression tests for P0 mock-data honesty (buyer feed + owner leads) and
// P1 honest owner metrics (empty initial collections, zero totals).
// Run with: node scripts/property-feed-honesty.test.mjs  (plain node, no deps)
// Covers: fetchListingDetail rejects on API failure (never a mock object),
// rejects on missing records, preserves real API results; fetchSimilar keeps
// empty results empty and skips non-backend ids; selectPropertyLeads returns
// only genuine matches (possibly []) and never invents leads; sumOwnerMetrics
// derives honest zeros; OwnerContext starts with empty collections and a
// purchase-free quota.
//
// Same harness as property-edit-mode.test.mjs: src/api/*.js use extensionless
// imports (Metro), so copy to tmp with extensions fixed. Network is fully
// stubbed via global.fetch — no backend is contacted. React hooks and
// components (useListings, HomeScreen, PropertyDetailModal,
// OwnerPropertyLeadsScreen, OwnerContext, OwnerDashboardScreen) cannot run in
// this harness; their structural honesty (no mock substitution, honest
// empty/error states, empty initials) is verified by inspection + source
// assertions below + `npm run build:web`.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SHARED_API = join(ROOT, "..", "src", "shared", "api");
const BUYER_API = join(ROOT, "..", "src", "features", "buyer", "api");
const OWNER_API = join(ROOT, "..", "src", "features", "owner", "api");
const tmp = mkdtempSync(join(tmpdir(), "feed-honesty-test-"));
copyFileSync(join(SHARED_API, "client.js"), join(tmp, "client.js"));
copyFileSync(join(SHARED_API, "mappers.js"), join(tmp, "mappers.js"));
copyFileSync(join(BUYER_API, "listings.js"), join(tmp, "listings.js"));
copyFileSync(join(OWNER_API, "owner.js"), join(tmp, "owner.js"));
for (const f of ["owner.js", "listings.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(tmp, f), "utf8")
      .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
      .replace(/from "[^"]*mappers(\.js)?"/g, 'from "./mappers.js"')
  );
}
const { fetchListingDetail, fetchSimilar } = await import(join(tmp, "listings.js"));
const { selectPropertyLeads, sumOwnerMetrics } = await import(join(tmp, "owner.js"));

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
function stubFetch(impl) {
  globalThis.fetch = impl;
}
function restoreFetch() {
  globalThis.fetch = realFetch;
}
const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

// Canned backend ListingDetail (all server-owned fields; no mock shape).
function backendDetail(over = {}) {
  return {
    listing_id: 101,
    title: "2 BHK Apartment in Anna Nagar",
    price_paise: 2500000,
    price_period: "MONTHLY",
    price_display: "₹25,000/month",
    transaction_type: "RENT",
    property_type: "APARTMENT",
    construction_status: "READY_TO_MOVE",
    description: "Real backend description.",
    area_value: 1100,
    area_unit: "sqft",
    bedrooms: 2,
    bathrooms: 2,
    address_line: "5th Avenue, Anna Nagar",
    locality: "Anna Nagar",
    city: "Chennai",
    pincode: "600040",
    location_label: "Anna Nagar, Chennai",
    cover_image_url: "https://cdn.test/cover.jpg",
    gallery: ["https://cdn.test/cover.jpg", "https://cdn.test/room.jpg"],
    verification_status: "VERIFIED",
    listing_status: "AVAILABLE",
    ...over,
  };
}

// --- 1. Detail failure never returns mock data ---
stubFetch(async () => {
  throw new Error("offline");
});
{
  let rejected = false;
  let value;
  try {
    value = await fetchListingDetail(101);
  } catch {
    rejected = true;
  }
  check("D1 detail API failure rejects (never mock)", rejected === true, value);
}

// --- 2. Missing record rejects (not-found, never mock) ---
stubFetch(async () => jsonResponse(null));
{
  let rejected = false;
  try {
    await fetchListingDetail(999999);
  } catch {
    rejected = true;
  }
  check("D2 missing record rejects", rejected === true);
}

// --- 3. Real API results preserved ---
stubFetch(async () => jsonResponse(backendDetail()));
{
  const detail = await fetchListingDetail(101);
  check(
    "D3 real detail preserved",
    detail.title === "2 BHK Apartment in Anna Nagar"
      && detail.backendId === 101
      && Array.isArray(detail.gallery)
      && detail.gallery[0] === "https://cdn.test/cover.jpg"
      && !("agent" in detail),
    detail.title
  );
}

// --- 4. Similar: empty stays empty; non-backend ids skip fetch ---
stubFetch(async () => jsonResponse([]));
{
  const similar = await fetchSimilar(101, 5);
  check("D4 similar empty stays empty", Array.isArray(similar) && similar.length === 0);
}
{
  let called = false;
  stubFetch(async () => {
    called = true;
    return jsonResponse([]);
  });
  const similar = await fetchSimilar("rec-1", 5);
  check("D5 non-backend id skips fetch", similar === null && called === false);
}
restoreFetch();

// --- 5. Owner leads: only genuine matches, never invented ---
const leadA = { id: "l1", propertyId: 7, propertyTitle: "Sun Flat", customerName: "A" };
const leadB = { id: "l2", propertyTitle: "sun flat", customerName: "B" };
const leadC = { id: "l3", propertyId: 9, propertyTitle: "Other", customerName: "C" };
check("L1 matches by id", selectPropertyLeads([leadA, leadC], { id: 7 }).length === 1);
// Stable-id contract: a title alone never attaches a lead to a property
// (two listings can share a title; removed-listing leads must not move).
check("L2 never matches by title alone",
  selectPropertyLeads([leadB, leadC], { id: 7, title: "Sun Flat" }).length === 0);
check("L3 no matches returns [] (never fakes)",
  Array.isArray(selectPropertyLeads([leadC], { id: 7, title: "Sun Flat" }))
  && selectPropertyLeads([leadC], { id: 7, title: "Sun Flat" }).length === 0);
check("L4 empty/null leads return []",
  selectPropertyLeads([], { id: 7 }).length === 0
  && selectPropertyLeads(null, { id: 7 }).length === 0);
check("L5 no invented identities",
  JSON.stringify(selectPropertyLeads([leadC], { id: 7, title: "Sun Flat" })) === "[]");

// --- 6. P1 honest owner metrics ---
const zeroTotals = sumOwnerMetrics([]);
check("O1 empty collections total to honest zeros",
  zeroTotals.totalViews === 0 && zeroTotals.totalEnquiries === 0 && zeroTotals.totalVisits === 0);
check("O2 absent input totals to zeros",
  (() => {
    const t = sumOwnerMetrics(null);
    return t.totalViews === 0 && t.totalEnquiries === 0 && t.totalVisits === 0;
  })());
check("O3 genuine records derive real totals (no fabrication)",
  (() => {
    const t = sumOwnerMetrics([
      { views: 10, enquiries: 2, visits: 1 },
      { views: 5, enquiries: 0 },
      {},
    ]);
    return t.totalViews === 15 && t.totalEnquiries === 2 && t.totalVisits === 1;
  })());
// OwnerContext source guard: collections start empty and no mock record or
// purchased-plan fixture may return (the context module itself imports React
// and cannot run in this harness, so the source text is asserted instead).
{
  const root = dirname(fileURLToPath(import.meta.url));
  const ctxSrc = readFileSync(join(root, "..", "src", "features", "owner", "context", "OwnerContext.js"), "utf8");
  check("O4 initial collections are empty",
    ctxSrc.includes("const INITIAL_PROPERTIES = [];")
    && ctxSrc.includes("const INITIAL_LEADS = [];"));
  check("O5 no mock record or fabricated quota fixture",
    !ctxSrc.includes('"own-prop-1"')
    && !ctxSrc.includes('"lead-1"')
    && !ctxSrc.includes("usedListings: 3"));
  // NOTE: activateSubscription's plan-name fallbacks ("Owner Pro Plan") remain
  // for the P5 plan-checkout flow and are intentionally out of P1 scope.
}

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all feed-honesty tests passed");
}
