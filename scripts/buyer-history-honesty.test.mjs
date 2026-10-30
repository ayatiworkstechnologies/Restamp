// Regression tests for P2 buyer history/inbox honesty.
// Run with: node scripts/buyer-history-honesty.test.mjs  (plain node, no deps)
// Covers: empty wishlist init + mock-restore removal (real /buyer/saved sync
// preserved); empty viewed/call history; no INITIAL_ENQUIRIES or mock fallback
// (loading/empty/error distinguished, failure never shows samples); real API
// mapping contracts preserved (saved + enquiries); no fabricated contact
// fallbacks in modified reachable flows; dead-screen minimal honesty; P0/P1
// and API-URL protections intact.
//
// Same harness as the other script tests: src/api/*.js use extensionless
// imports (Metro), so copy to tmp with extensions fixed. Network is fully
// stubbed via global.fetch — no backend is contacted. React contexts and
// screens (WishlistContext, SavedScreen, EnquiriesScreen, MessageScreen,
// AccountScreen) import React and cannot run in this harness; their honesty
// is guarded by source-text assertions below plus inspection and
// `npm run build:web` (Metro parse). Stated here, not overstated.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src", "api");
const tmp = mkdtempSync(join(tmpdir(), "buyer-history-test-"));
for (const f of ["client.js", "mappers.js", "saved.js", "enquiries.js", "buyerMode.js", "buyerModeCore.js"]) {
  copyFileSync(join(SRC, f), join(tmp, f));
}
for (const f of ["saved.js", "enquiries.js", "buyerMode.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(tmp, f), "utf8")
      .replaceAll('from "./client"', 'from "./client.js"')
      .replaceAll('from "./mappers"', 'from "./mappers.js"')
      .replaceAll('from "./buyerMode"', 'from "./buyerMode.js"')
      .replaceAll('from "./buyerModeCore"', 'from "./buyerModeCore.js"')
  );
}
const savedApi = await import(join(tmp, "saved.js"));
const enquiriesApi = await import(join(tmp, "enquiries.js"));

function src(rel) {
  return readFileSync(join(ROOT, "..", rel), "utf8");
}
const wishlistSrc = src("src/context/WishlistContext.js");
const savedScreenSrc = src("src/screens/buyer/SavedScreen.js");
const enquiriesScreenSrc = src("src/screens/buyer/EnquiriesScreen.js");
const messageScreenSrc = src("src/screens/buyer/MessageScreen.js");
const accountScreenSrc = src("src/screens/buyer/AccountScreen.js");
const appNavSrc = src("src/navigation/AppNavigator.js");

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

// --- 1. Wishlist: empty init, no mock restore, real sync preserved ---
check(
  "W1 wishlist initializes empty",
  wishlistSrc.includes("useState([])") && !wishlistSrc.includes("ALL_PROPERTIES.slice(0, 2)")
);
check(
  "W2 mock restore removed and no catalog import",
  !wishlistSrc.includes("restoreDefaultWishlist") &&
    !wishlistSrc.includes("setWishlist(ALL_PROPERTIES)") &&
    !wishlistSrc.includes("data/properties")
);
check(
  "W3 real saved sync preserved (BUYER + backendId gates, refresh path)",
  wishlistSrc.includes("fetchSavedWishlist") &&
    wishlistSrc.includes("saveListingRemote") &&
    wishlistSrc.includes("unsaveListingRemote") &&
    wishlistSrc.includes('user?.role === "BUYER"') &&
    wishlistSrc.includes("getAuthTokenSync()") &&
    wishlistSrc.includes("backendIdOf(property)") &&
    wishlistSrc.includes("setWishlist(items)")
);

// --- 2. Saved API contract still works (functional, stubbed fetch) ---
function buyerCard(over = {}) {
  return {
    listing_id: 201,
    title: "2 BHK Apartment in Anna Nagar",
    price_paise: 2500000,
    price_period: "MONTHLY",
    price_display: "₹25,000/month",
    transaction_type: "RENT",
    property_type: "APARTMENT",
    construction_status: "READY_TO_MOVE",
    description: "Real backend description.",
    area_value: 1100,
    bedrooms: 2,
    bathrooms: 2,
    address_line: "5th Avenue, Anna Nagar",
    location_label: "Anna Nagar, Chennai",
    cover_image_url: "https://cdn.test/cover.jpg",
    ...over,
  };
}
stubFetch(async (url) => {
  if (String(url).includes("/buyer/saved")) {
    return jsonResponse({ items: [buyerCard()], total: 1 });
  }
  return jsonResponse({}, false, 404);
});
{
  const { items, total } = await savedApi.fetchSavedWishlist();
  check(
    "W4 saved API maps real rows (no agent fabrication)",
    total === 1 &&
      items.length === 1 &&
      items[0].backendId === 201 &&
      items[0].title === "2 BHK Apartment in Anna Nagar" &&
      !("agent" in items[0])
  );
}
restoreFetch();

// --- 3. Viewed history: honest empty ---
check(
  "V1 no fabricated viewed init",
  !savedScreenSrc.includes("INITIAL_VIEWED_PROPERTIES") &&
    !savedScreenSrc.includes("Viewed 20m ago") &&
    !savedScreenSrc.includes("Viewed 2h ago") &&
    !savedScreenSrc.includes("Viewed Yesterday") &&
    !savedScreenSrc.includes("Viewed 3 days ago")
);
check(
  "V2 viewed starts empty with reusable empty state",
  savedScreenSrc.includes("const [viewedProperties, setViewedProperties] = useState([])") &&
    savedScreenSrc.includes("No recently viewed properties")
);

// --- 4. Call history: honest empty, no fake records or numbers ---
check(
  "C1 no fabricated call init",
  !savedScreenSrc.includes("INITIAL_CALL_HISTORY") &&
    !savedScreenSrc.includes('"call-1"') &&
    !savedScreenSrc.includes("Kavitha Sundar") &&
    !savedScreenSrc.includes("Suresh Menon") &&
    !savedScreenSrc.includes("Site Visit Confirmed")
);
check(
  "C2 call starts empty with reusable empty state",
  savedScreenSrc.includes("const [callHistory, setCallHistory] = useState([])") &&
    savedScreenSrc.includes("No call activity yet")
);
check(
  "C3 no fabricated phone fallbacks in SavedScreen contact flows",
  !savedScreenSrc.includes('agent?.phone || "+') &&
    !savedScreenSrc.includes('phone || "+919876543210"') &&
    !savedScreenSrc.includes('phone || "+91 98401 22334"') &&
    savedScreenSrc.includes("Phone Number Unavailable") &&
    // The contact sheet shows no number until the reveal endpoint returns one.
    savedScreenSrc.includes('agent?.phone || "Shared when you tap Call or WhatsApp"')
);

// --- 5. Enquiries: no mocks, honest loading/empty/error, real mapping ---
check(
  "E1 no INITIAL_ENQUIRIES or mock fallback",
  !enquiriesScreenSrc.includes("INITIAL_ENQUIRIES") &&
    !enquiriesScreenSrc.includes('"enq-1"') &&
    !enquiriesScreenSrc.includes("Arun Kumar") &&
    !enquiriesScreenSrc.includes("?? INITIAL_ENQUIRIES")
);
check(
  "E2 honest empty default (null -> []) with error state",
  enquiriesScreenSrc.includes("const enquiries = serverEnquiries ?? [];") &&
    enquiriesScreenSrc.includes("listError") &&
    enquiriesScreenSrc.includes("Couldn't load enquiries")
);
check(
  "E3 failure path sets error (never samples)",
  enquiriesScreenSrc.includes("setListError(true)") &&
    enquiriesScreenSrc.includes("onPress={loadEnquiries}")
);
check(
  "E4 no mock-catalog lookup or synthetic property",
  !enquiriesScreenSrc.includes("data/properties") &&
    !enquiriesScreenSrc.includes("ALL_PROPERTIES.find") &&
    enquiriesScreenSrc.includes("Property Details Unavailable")
);
check(
  "E5 no fabricated phone fallbacks in enquiries flows",
  !enquiriesScreenSrc.includes('item.phone || "+') &&
    !enquiriesScreenSrc.includes('phone || "+919876543210"') &&
    enquiriesScreenSrc.includes("cleanPhoneOrNull") &&
    enquiriesScreenSrc.includes("Phone Number Unavailable")
);
check(
  "E6 real toRow mapping preserved (agent/phone stay undefined)",
  enquiriesScreenSrc.includes("property_listing_id") &&
    enquiriesScreenSrc.includes("agentName: undefined") &&
    enquiriesScreenSrc.includes("phone: undefined")
);

// --- 6. Enquiries API contract preserved (functional, stubbed fetch) ---
stubFetch(async (url, options = {}) => {
  const u = String(url);
  if (u.includes("/buyer/enquiries") && (options.method || "GET") === "GET") {
    return jsonResponse({
      items: [
        {
          id: "e-1",
          property_listing_id: 301,
          message: "Is this available?",
          status: "OPEN",
          listing: { title: "1 BHK in OMR", price_paise: 1800000, price_period: "MONTHLY" },
        },
      ],
      total: 1,
    });
  }
  if (u.includes("/buyer/enquiries") && options.method === "POST") {
    return jsonResponse({ id: "e-2", status: "OPEN" });
  }
  return jsonResponse({}, false, 404);
});
{
  const data = await enquiriesApi.fetchMyEnquiries(1, 100);
  check(
    "E7 fetchMyEnquiries returns real rows",
    Array.isArray(data.items) && data.items.length === 1 && data.items[0].id === "e-1"
  );
  const created = await enquiriesApi.createEnquiry(301, "Hello");
  check("E8 createEnquiry contract preserved", created && created.id === "e-2");
}
restoreFetch();

// --- 7. Dead screens: minimal honesty, navigation untouched ---
check(
  "M1 MessageScreen honest empty (no chats, replies, or fake calls)",
  !messageScreenSrc.includes("INITIAL_CHATS") &&
    !messageScreenSrc.includes("Ramesh Kumar") &&
    !messageScreenSrc.includes("msg-reply-") &&
    !messageScreenSrc.includes("Calling ${") &&
    messageScreenSrc.includes("useState([])") &&
    messageScreenSrc.includes("No messages yet") &&
    messageScreenSrc.includes("Messaging is not available yet.") &&
    messageScreenSrc.includes("Calling is not available yet.")
);
check(
  "M2 AccountScreen stats neutralized (no sample visits/enquiries/payments)",
  !accountScreenSrc.includes("statNumber}>12<") &&
    !accountScreenSrc.includes("statNumber}>4<") &&
    !accountScreenSrc.includes("2 Upcoming") &&
    !accountScreenSrc.includes("4242") &&
    !accountScreenSrc.includes("Emerald Heights") &&
    !accountScreenSrc.includes("Sea Breeze") &&
    accountScreenSrc.includes("You have no scheduled site visits.") &&
    accountScreenSrc.includes("No payment methods added.") &&
    accountScreenSrc.includes("No property documents available.")
);
check(
  "M3 dead screens stay unregistered (no nav change)",
  !appNavSrc.includes("MessageScreen") &&
    !appNavSrc.includes("AccountScreen") &&
    appNavSrc.includes('name="Enquiries"')
);

// --- 8. P0/P1/API-URL protections intact ---
{
  const useListingsSrc = readFileSync(join(ROOT, "..", "src", "api", "useListings.js"), "utf8");
  const listingsSrc = readFileSync(join(ROOT, "..", "src", "api", "listings.js"), "utf8");
  const ownerCtxSrc = readFileSync(join(ROOT, "..", "src", "context", "OwnerContext.js"), "utf8");
  const ownerApiSrc = readFileSync(join(ROOT, "..", "src", "api", "owner.js"), "utf8");
  const clientSrc = readFileSync(join(ROOT, "..", "src", "api", "client.js"), "utf8");
  check(
    "P1 P0 feed honesty intact (no mock substitution)",
    !useListingsSrc.includes("filterMockProperties") &&
      !useListingsSrc.includes("ALL_PROPERTIES") &&
      !listingsSrc.includes("ALL_PROPERTIES.find")
  );
  check(
    "P2 P1 owner honesty intact (empty initials, honest metrics)",
    ownerCtxSrc.includes("const INITIAL_PROPERTIES = [];") &&
      ownerCtxSrc.includes("const INITIAL_LEADS = [];") &&
      ownerApiSrc.includes("selectPropertyLeads") &&
      ownerApiSrc.includes("sumOwnerMetrics")
  );
  check(
    "P3 API-URL config intact",
    clientSrc.includes("resolveApiBaseUrl") &&
      clientSrc.includes("isLocalHostUrl") &&
      clientSrc.includes("DEFAULT_PROD_API_URL")
  );
}

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all buyer-history-honesty tests passed");
}
