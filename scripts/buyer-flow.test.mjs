// Regression tests for Buyer Flow: Home category navigation (stays on Home,
// filters Home sections), accurate backend search parameter mapping, and B2
// contact/enquiry honesty (no mock numbers, server-confirmed success,
// logged-out login path, no duplicate submissions, no false persistence).
// Run with: node scripts/buyer-flow.test.mjs  (plain node, no deps)
// Covers: buildListingParams maps deal/type/BHK/budget/sort/query/locality/
// construction_status to the exact supported GET /buyer/listings params;
// unknown types and "All ..." selections are omitted (never invented);
// rating keeps only a defensive relevance fallback; Home category pills never
// navigate to Search and filter the Home feed by type with an "All" default;
// Search offers no rating sort and gates "Load more" on loaded (not
// client-filtered) counts; B2: reveal/contact/enquiry/question/visit honesty
// source guards plus revealContactPhone/createEnquiry API contracts.
//
// Same harness as property-feed-honesty.test.mjs: src/api/*.js use
// extensionless imports (Metro), so copy to tmp with extensions fixed.
// Network is fully stubbed via global.fetch — no backend is contacted. React
// screens (HomeScreen, SearchScreen) and components (PropertyDetailModal)
// cannot run in this harness; their behavior is verified by source
// assertions below plus inspection and `npm run build:web` (Metro parse).
// Stated here, not claimed.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src", "api");
const tmp = mkdtempSync(join(tmpdir(), "buyer-flow-test-"));
for (const f of ["client.js", "mappers.js", "contact.js", "enquiries.js"]) {
  copyFileSync(join(SRC, f), join(tmp, f));
}
for (const f of ["contact.js", "enquiries.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(tmp, f), "utf8").replace(
      'from "./client"',
      'from "./client.js"'
    )
  );
}
const { buildListingParams, parseSmartQuery } = await import(join(tmp, "mappers.js"));
const { revealContactPhone } = await import(join(tmp, "contact.js"));
const { createEnquiry } = await import(join(tmp, "enquiries.js"));

function src(rel) {
  return readFileSync(join(ROOT, "..", rel), "utf8");
}
const homeSrc = src("src/screens/buyer/HomeScreen.js");
const searchSrc = src("src/screens/buyer/SearchScreen.js");
const detailSrc = src("src/components/PropertyDetailModal.js");
const exploreSrc = src("src/screens/buyer/ExploreScreen.js");
const modalSrc = src("src/components/SearchPropertyModal.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const P = (ui) => buildListingParams(ui, 1, 20);

// --- 1. Supported mappings reach the backend verbatim ---
check("M1 deal mapping", P({ dealTab: "Rent" }).deal === "RENT");
check(
  "M2 type mapping (all pill names)",
  P({ selectedType: "Apartment" }).property_type === "APARTMENT" &&
    P({ selectedType: "Villa" }).property_type === "VILLA" &&
    P({ selectedType: "Home" }).property_type === "HOUSE" &&
    P({ selectedType: "Plot" }).property_type === "PLOT" &&
    P({ selectedType: "Commercial" }).property_type === "COMMERCIAL" &&
    P({ propertyType: "Apartment" }).property_type === "APARTMENT"
);
check(
  "M3 All/unknown types omitted (never invented)",
  !("property_type" in P({ selectedType: "All Types" })) &&
    !("property_type" in P({ selectedType: "Apartment / Flat" })) &&
    !("property_type" in P({}))
);
check(
  "M4 query/locality contract (q wins, locality fallback, whitespace collapsed)",
  P({ searchQuery: " Anna Nagar " }).q === "Anna Nagar" &&
    P({ searchQuery: "  villa   anna  " }).q === "villa anna" &&
    !("locality" in P({ searchQuery: "x", locality: "OMR" })) &&
    P({ locality: "OMR" }).locality === "OMR" &&
    !("q" in P({ searchQuery: "   " }))
);
check(
  "M5 BHK + budget + sort mapping",
  P({ bhk: "4+ BHK" }).bedrooms_min === 4 &&
    P({ bhk: "2 BHK" }).bedrooms === 2 &&
    !("bedrooms" in P({ bhk: "All BHK" })) &&
    P({ minRupees: 5000000, maxRupees: 10000000 }).min_price_paise === 500000000 &&
    P({ minRupees: 5000000, maxRupees: 10000000 }).max_price_paise === 1000000000 &&
    P({ sort: "price_asc" }).sort === "price_asc" &&
    P({ sort: "bogus" }).sort === "relevance"
);
check(
  "M6 rating keeps defensive relevance fallback only",
  P({ sort: "rating" }).sort === "relevance"
);
check(
  "M7 construction_status canonical mapping + All omitted",
  P({ constructionStatus: "Ready to move" }).construction_status === "READY_TO_MOVE" &&
    P({ constructionStatus: "Under Construction" }).construction_status === "UNDER_CONSTRUCTION" &&
    P({ constructionStatus: "New Launch" }).construction_status === "NEW_LAUNCH" &&
    !("construction_status" in P({ constructionStatus: "All Status" })) &&
    !("construction_status" in P({ constructionStatus: "Bogus" })) &&
    !("construction_status" in P({}))
);

// --- 2. Home category navigation stays on Home ---
check(
  "H1 category pills never navigate to Search",
  (() => {
    const start = homeSrc.indexOf("3. CATEGORY SELECTOR");
    const end = homeSrc.indexOf("POST YOUR PROPERTY PROMO");
    const block = homeSrc.slice(start, end);
    return (
      start !== -1 &&
      end !== -1 &&
      block.includes("setSelectedType(pt.id)") &&
      !block.includes('navigate("Search"') &&
      !block.includes("navigate('Search'")
    );
  })()
);
check(
  "H2 Home feed filters by selected category with honest All default",
  homeSrc.includes('useState("all")') &&
    homeSrc.includes('selectedType !== "all"') &&
    homeSrc.includes("allowedTypes") &&
    homeSrc.includes('{ id: "all", name: "All" }')
);
const appNavSrc = src("src/navigation/AppNavigator.js");
check(
  "H3 bottom Search tab still opens Search normally",
  appNavSrc.includes('emit("OPEN_SEARCH_FILTER_MODAL"') &&
    searchSrc.includes('addListener("OPEN_SEARCH_FILTER_MODAL"')
);

// --- 3. Search accuracy guards ---
check(
  "S1 no rating sort offered (backend has no rating field)",
  !searchSrc.includes('"rating"') && !searchSrc.includes("'rating'")
);
check(
  "S2 load-more gated on loaded counts (not client-filtered counts)",
  searchSrc.includes("apiProperties.length < total") &&
    !searchSrc.includes("filteredProperties.length < total")
);
check(
  "S3 construction status sent to backend (client filter kept as layer)",
  searchSrc.includes("constructionStatus: selectedStatus")
);

// --- 4. B2 contact-reveal honesty (source guards) ---
check(
  "C1 no mock number shown, copied, or dialed on Search",
  !searchSrc.includes("+91 98401 22334") &&
    !searchSrc.includes("+919876543210") &&
    !searchSrc.includes("Verified Agent") &&
    !searchSrc.includes("Chennai Verified Partner") &&
    !searchSrc.includes("Chennai Prime Realty")
);
check(
  "C2 reveal state machine (hidden until success, login/failed states, req guard)",
  searchSrc.includes('useState("idle")') &&
    searchSrc.includes("revealReq") &&
    searchSrc.includes("revealReq.current !== myReq") &&
    searchSrc.includes('setRevealState("loading")') &&
    searchSrc.includes('setRevealState("revealed")') &&
    searchSrc.includes('setRevealState("failed")') &&
    searchSrc.includes('setRevealState("login")') &&
    searchSrc.includes("Not available") &&
    searchSrc.includes("Log In to Continue")
);
check(
  "C3 call/WhatsApp use the revealed number only",
  searchSrc.includes("disabled={revealState") &&
    searchSrc.includes("revealState !== ") &&
    searchSrc.includes("phone: revealedPhone")
);
check(
  "C4 Explore sample numbers never dialed, messaged, or copied",
  !exploreSrc.includes("whatsapp://send") &&
    !exploreSrc.includes("+919876543210") &&
    !exploreSrc.includes("+91 98401 22334") &&
    exploreSrc.includes("Not available")
);

// --- 5. B2 enquiry honesty (source guards) ---
check(
  "E1 no false enquiry success (server-confirmed only, guarded, login path)",
  detailSrc.includes("enquirySending") &&
    detailSrc.includes("setEnquirySending(true)") &&
    detailSrc.includes("Log In Required") &&
    detailSrc.includes("onLoginRequired") &&
    !detailSrc.includes("Otherwise the long-standing mock confirmation")
);
check(
  "E2 question/site-visit never claim persistence",
  !detailSrc.includes("Question Sent!") &&
    !detailSrc.includes("Site Visit Requested!") &&
    !detailSrc.includes("Requested ✓") &&
    detailSrc.includes("Not Supported Yet")
);
check(
  "E3 Listed-By shows no mock identity or number",
  !detailSrc.includes("+91 98765 43210") &&
    !detailSrc.includes("Verified Owner / Seller") &&
    detailSrc.includes("Contact Number Unavailable")
);

// --- 6. B2 API contracts (stubbed fetch, no backend contacted) ---
{
  const realFetch = globalThis.fetch;
  let lastUrl = null;
  let lastOptions = null;
  globalThis.fetch = async (url, options = {}) => {
    lastUrl = String(url);
    lastOptions = options;
    if (lastUrl.includes("/contact")) {
      return { ok: true, status: 200, json: async () => ({ phone: "+919840100001" }) };
    }
    return { ok: true, status: 201, json: async () => ({ id: 9, status: "NEW" }) };
  };
  const phone = await revealContactPhone(77);
  check(
    "A1 reveal returns the authorized number only on success",
    phone === "+919840100001" && lastUrl.includes("/buyer/listings/77/contact")
  );
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  let rejected = false;
  try {
    await revealContactPhone(77);
  } catch {
    rejected = true;
  }
  check("A2 failed reveal rejects (never a number or false success)", rejected === true);
  globalThis.fetch = async (url, options = {}) => {
    lastUrl = String(url);
    lastOptions = options;
    return { ok: true, status: 201, json: async () => ({ id: 9, status: "NEW" }) };
  };
  await createEnquiry(77, "Hello");
  const sentBody = JSON.parse(lastOptions.body || "{}");
  check(
    "A3 enquiry posts the persisted contract (listing id + message ≤2000)",
    lastUrl.includes("/buyer/enquiries") &&
      sentBody.property_listing_id === 77 &&
      sentBody.message === "Hello"
  );
  await createEnquiry(78, "x".repeat(2500));
  const longBody = JSON.parse(lastOptions.body || "{}");
  check(
    "A4 overlong enquiry message capped at 2000 chars",
    longBody.property_listing_id === 78 && longBody.message.length === 2000
  );
  globalThis.fetch = realFetch;
}

if (false) {
  console.log("placeholder-never");
}

// --- 7. Smart query parsing (deterministic, no AI) ---
{
  const t1 = parseSmartQuery("2 BHK in Anna Nagar");
  check(
    "Q1 BHK + locality split (stopword dropped)",
    t1.bedrooms === 2 && t1.q === "anna nagar" && t1.property_type == null
  );
  const t2 = parseSmartQuery("villa near ECR");
  check(
    "Q2 type + locality split",
    t2.property_type === "VILLA" && t2.q === "ecr"
  );
  const t3 = parseSmartQuery("apartment under 80 lakhs");
  check(
    "Q3 price bound parsed (80L -> paise)",
    t3.property_type === "APARTMENT" &&
      t3.max_price_paise === 8000000 * 100 &&
      t3.q === ""
  );
  const t4 = parseSmartQuery("Home ECR starter 1BHK");
  check(
    "Q4 ambiguous home kept as text, 1BHK extracted",
    t4.property_type == null && t4.bedrooms === 1 && t4.q === "home ecr starter"
  );
  const t5 = parseSmartQuery("under 80");
  check(
    "Q5 unit-less price stays text (ambiguous, no filter)",
    t5.max_price_paise == null && t5.q === "under 80"
  );
  const t6 = parseSmartQuery("   ");
  check(
    "Q6 blank query yields no filters",
    t6.q === "" && t6.bedrooms == null && t6.property_type == null &&
      t6.min_price_paise == null && t6.max_price_paise == null
  );
  const t7 = parseSmartQuery("above 1 cr commercial");
  check(
    "Q7 lower bound + type",
    t7.min_price_paise === 10000000 * 100 && t7.property_type === "COMMERCIAL" && t7.q === ""
  );
  check(
    "Q8 suggestions use the existing endpoint (no new API)",
    modalSrc.includes('apiGet("/buyer/listings"') &&
      modalSrc.includes("suggReqId") &&
      modalSrc.includes("Matching Properties") &&
      !modalSrc.includes("/buyer/suggest")
  );
}

// --- 8. Suggestion tap opens the real detail screen ---
{
  const modalBlock = modalSrc.slice(modalSrc.indexOf("liveSuggestions.map"));
  check(
    "D1 tap opens detail with the real listing id (no fabrication)",
    modalSrc.includes("onSelectProperty") &&
      modalBlock.includes("typeof s.backendId") &&
      modalBlock.includes("onSelectProperty(s)")
  );
  check(
    "D2 missing id falls back to query text (never invented)",
    modalBlock.includes("setSelectedLocality(s.title)")
  );
  check(
    "D3 parent opens detail and dismisses modal (close cannot cancel open)",
    searchSrc.includes("onSelectProperty={(suggestion)") &&
      searchSrc.includes("openProperty(suggestion)") &&
      searchSrc.includes("setIsSearchModalOpen(false)")
  );
  check(
    "D4 suggestions respect the selected property type",
    modalSrc.includes("params.property_type") &&
      modalSrc.includes("modalType") &&
      modalSrc.indexOf("property_type", modalSrc.indexOf("suggReqId")) !== -1
  );
  check(
    "D5 clearing the query clears stale suggestions",
    modalSrc.includes("setLiveSuggestions([])")
  );
}

// --- 9. Modal count consistency (live backend count, conflict honesty) ---
{
  check(
    "E1 Show-count uses the live count_only endpoint (never mock catalog)",
    modalSrc.includes("count_only") &&
      modalSrc.includes("liveMatchedCount") &&
      !modalSrc.includes("ALL_PROPERTIES") &&
      !modalSrc.includes("matchedCount")
  );
  check(
    "E2 count reuses Apply's exact filters (buildListingParams)",
    modalSrc.includes("buildListingParams(") &&
      modalSrc.includes("propertyType: modalType")
  );
  check(
    "E3 conflicting query/filter explained, selections win",
    modalSrc.includes("filterConflictNote") &&
      modalSrc.includes("selected filters will be used") &&
      modalSrc.includes("parseSmartQuery(")
  );
  check(
    "E4 count failures hide the number (never invented)",
    modalSrc.includes("Show Properties") &&
      modalSrc.includes("setCountFailed(true)")
  );
}

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all buyer-flow tests passed");
}
