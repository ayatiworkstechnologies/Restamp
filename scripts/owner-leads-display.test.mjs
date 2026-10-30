// Regression tests for the Owner leads display fix.
// Run with: node scripts/owner-leads-display.test.mjs  (plain node, no deps)
// Covers: fetchAllOwnerLeads pages through every lead without a property
// filter; pickDefaultLeadProperty opens a property that has leads (the bug:
// leads on an older listing were hidden behind an empty newest listing);
// toOwnerLead shows the buyer's chosen name and falls back to "Buyer #id";
// toOwnerProperty maps the backend enquiry/visit counters; the Leads screen
// loads all leads once and no longer fabricates a locality; historical leads
// on removed listings are kept under an honest "Property no longer
// available" entry and removed listings are hidden from management lists.
//
// Same tmp-copy harness as owner-leads-honesty.test.mjs. Network is fully
// stubbed via global.fetch — no backend is contacted. Screens import React
// and cannot run here; their wiring is guarded by source-text assertions.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src", "api");
const tmp = mkdtempSync(join(tmpdir(), "owner-leads-display-test-"));
for (const f of ["owner.js", "client.js", "mappers.js"]) {
  copyFileSync(join(SRC, f), join(tmp, f));
}
writeFileSync(
  join(tmp, "owner.js"),
  readFileSync(join(tmp, "owner.js"), "utf8")
    .replace('from "./client"', 'from "./client.js"')
    .replace('from "./mappers"', 'from "./mappers.js"')
);
const {
  fetchAllOwnerLeads,
  fetchAllOwnerListings,
  pickDefaultLeadProperty,
  groupOwnerLeads,
  leadPropertyLabel,
  propertyTypeLabel,
  selectPropertyLeads,
  UNAVAILABLE_LEADS_GROUP_ID,
  UNAVAILABLE_PROPERTY_LABEL,
  toOwnerLead,
  toOwnerProperty,
} = await import(join(tmp, "owner.js"));
const leadsScreenSrc = readFileSync(
  join(ROOT, "..", "src", "screens", "owner", "OwnerLeadsScreen.js"),
  "utf8"
);
const contextSrc = readFileSync(join(ROOT, "..", "src", "context", "OwnerContext.js"), "utf8");
const dashboardSrc = readFileSync(join(ROOT, "..", "src", "screens", "owner", "OwnerDashboardScreen.js"), "utf8");
const leadDetailSrc = readFileSync(join(ROOT, "..", "src", "screens", "owner", "OwnerLeadDetailScreen.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const row = (id, listingId, extra = {}) => ({
  id,
  property_listing_id: listingId,
  buyer_user_id: 900 + id,
  message: null,
  status: "NEW",
  closing_reason: null,
  listing: { title: `L${listingId}`, price_paise: 100, price_period: "TOTAL" },
  ...extra,
});

// --- 1. fetchAllOwnerLeads ---------------------------------------------------------
{
  const urls = [];
  const all = Array.from({ length: 150 }, (_, i) => row(i + 1, i % 2 ? 7 : 9));
  global.fetch = async (url) => {
    urls.push(url);
    const u = new URL(url);
    const page = Number(u.searchParams.get("page"));
    const size = Number(u.searchParams.get("page_size"));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: all.slice((page - 1) * size, page * size),
        page,
        page_size: size,
        total: all.length,
      }),
    };
  };
  const resp = await fetchAllOwnerLeads();
  check("D1 pages through every lead (150 over 2 pages)", resp.items.length === 150 && resp.total === 150, urls);
  check("D2 two requests to GET /owner/leads", urls.length === 2 && urls.every((u) => u.includes("/owner/leads?")));
  check("D3 no property filter (all properties)", urls.every((u) => !u.includes("property_listing_id")));

  urls.length = 0;
  global.fetch = async (url) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ items: [], page: 1, page_size: 100, total: 0 }) };
  };
  const empty = await fetchAllOwnerLeads();
  check("D4 empty owner: one request, honest empty", urls.length === 1 && empty.items.length === 0 && empty.total === 0);

  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({ detail: "x" }) });
  let rejected = false;
  try {
    await fetchAllOwnerLeads();
  } catch {
    rejected = true;
  }
  check("D5 server failure rejects (never a fake empty list)", rejected);
}

// --- 2. pickDefaultLeadProperty ----------------------------------------------------
{
  const newest = { id: "12", title: "Newest flat" };
  const older = { id: "9", title: "Older flat" };
  const leads = [toOwnerLead(row(1, 9))];
  check("D6 opens the newest property that has leads", pickDefaultLeadProperty([newest, older], leads) === older);
  check("D7 no leads anywhere: newest property", pickDefaultLeadProperty([newest, older], []) === newest);
  check(
    "D8 no current properties but historical leads: opens the unavailable entry",
    pickDefaultLeadProperty([], leads)?.id === UNAVAILABLE_LEADS_GROUP_ID
  );
  check("D8b no properties and no leads: null", pickDefaultLeadProperty([], []) === null);
  check("D9 tolerates missing inputs", pickDefaultLeadProperty(undefined, undefined) === null);
}

// --- 3. toOwnerLead names ----------------------------------------------------------
{
  check("D10 chosen name shown", toOwnerLead(row(1, 9, { buyer_display_name: "Priya Raman" })).customerName === "Priya Raman");
  check("D11 withheld name falls back to Buyer #id", toOwnerLead(row(2, 9, { buyer_display_name: null })).customerName === "Buyer #902");
  check("D12 older backend without the field still works", toOwnerLead(row(3, 9)).customerName === "Buyer #903");
  check("D13 blank name is not shown", toOwnerLead(row(4, 9, { buyer_display_name: "   " })).customerName === "Buyer #904");
  check("D14 still no phone invented", toOwnerLead(row(5, 9, { buyer_display_name: "A" })).phone === undefined);
}

// --- 4. toOwnerProperty counters ---------------------------------------------------
{
  const base = {
    listing_id: 42, title: "T", transaction_type: "RENT", property_type: "APARTMENT",
    price_paise: 2500000, price_period: "MONTHLY", price_display: "x",
    verification_status: "VERIFIED", listing_status: "AVAILABLE", locality: "L", city: "C",
    pincode: "600001", cover_image_url: null, bedrooms: 2, bathrooms: 2,
  };
  const mapped = toOwnerProperty({ ...base, enquiry_count: 3, visit_count: 1 });
  check("D15 enquiry/visit counters come from the backend", mapped.enquiries === 3 && mapped.visits === 1);
  const legacy = toOwnerProperty(base);
  check("D16 missing counters are honest zeros", legacy.enquiries === 0 && legacy.visits === 0 && legacy.views === 0);
}

// --- 5. Leads screen wiring (source text) ------------------------------------------
check("D17 Leads screen loads all leads once", leadsScreenSrc.includes("fetchAllOwnerLeads()"));
check(
  "D18 lead fetch no longer depends on the selected property",
  !/fetchAllOwnerLeads\([^)]*propertyListingId/.test(leadsScreenSrc) &&
    !leadsScreenSrc.includes("fetchOwnerLeads({ propertyListingId")
);
check("D19 default selection uses pickDefaultLeadProperty", leadsScreenSrc.includes("pickDefaultLeadProperty(properties, allLeads)"));
check("D20 all owner listings loaded (not just the first 50)", leadsScreenSrc.includes("fetchAllOwnerListings()"));
check("D21 no fabricated locality/city fallback", !leadsScreenSrc.includes('"Anna Nagar"'));
check(
  "D22 account switch still clears cached leads",
  contextSrc.includes("shouldResetAccountScope") && contextSrc.includes("setLeads([]);")
);

// --- 6. Historical leads on removed / unavailable listings ------------------------
{
  const live = { id: "12", title: "Sea View 2BHK" };
  const onLive = toOwnerLead(row(1, 12));
  const onRemoved = toOwnerLead(row(2, 9, { listing_removed: true, listing: { title: "Old Villa", price_paise: 500000, price_period: "TOTAL" } }));
  const noSnapshot = toOwnerLead(row(3, 5, { listing: null }));
  const { entries, leadsFor } = groupOwnerLeads([live], [onLive, onRemoved, noSnapshot]);
  check("H1 leads across several listings are all kept", leadsFor(entries[0]).length + leadsFor(entries[1]).length === 3);
  check(
    "H2 removed-listing leads are grouped, never dropped",
    entries.length === 2 &&
      entries[1].id === UNAVAILABLE_LEADS_GROUP_ID &&
      leadsFor(entries[1]).map((l) => l.id).join() === "2,3"
  );
  check(
    "H3 unavailable entry is honest (label only: no price/locality/photo/status)",
    entries[1].title === UNAVAILABLE_PROPERTY_LABEL &&
      entries[1].unavailable === true &&
      Object.keys(entries[1]).sort().join() === "id,title,unavailable"
  );
  check("H4 live listing shows only its own lead", leadsFor(entries[0]).map((l) => l.id).join() === "1");
  check("H5 removed flag mapped", onRemoved.propertyUnavailable === true && onLive.propertyUnavailable === false);
  check("H6 removed lead keeps its real title, marked", leadPropertyLabel(onRemoved) === "Old Villa · No longer available");
  check("H7 live lead shows its real title", leadPropertyLabel(onLive) === "L12");
  check(
    "H8 missing snapshot: neutral fallback, nothing invented",
    leadPropertyLabel(noSnapshot) === UNAVAILABLE_PROPERTY_LABEL &&
      noSnapshot.propertyPrice === "" &&
      noSnapshot.propertyLocality === "" &&
      leadPropertyLabel(null) === UNAVAILABLE_PROPERTY_LABEL
  );
  check(
    "H9 no unavailable entry when every lead has a current property",
    groupOwnerLeads([live], [onLive]).entries.length === 1
  );
  const sameTitle = toOwnerLead(row(4, 9, { listing_removed: true, listing: { title: "Sea View 2BHK", price_paise: 1, price_period: "TOTAL" } }));
  check(
    "H10 a removed listing's lead is never attached to a live one sharing its title",
    selectPropertyLeads([sameTitle], live).length === 0 &&
      groupOwnerLeads([live], [sameTitle]).entries.length === 2
  );
  const noId = { id: "x", propertyTitle: "sea view 2bhk" };
  check(
    "H11 a lead without a listing id never matches by title; it is kept, not dropped",
    selectPropertyLeads([noId], live).length === 0 &&
      groupOwnerLeads([live], [noId]).leadsFor({ id: UNAVAILABLE_LEADS_GROUP_ID })[0] === noId
  );
  check("H12 grouping tolerates empty/missing input", groupOwnerLeads(null, null).entries.length === 0);
}

// --- 7. Removed listings hidden from management lists -----------------------------
{
  const urls = [];
  const rows = [
    { listing_id: 3, removed: false },
    { listing_id: 2, removed: true },
    { listing_id: 1 },
  ];
  global.fetch = async (url) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ items: rows, page: 1, page_size: 100, total: 3 }) };
  };
  const live = await fetchAllOwnerListings();
  check(
    "R1 removed listings left out by default (missing flag = live)",
    live.items.map((r) => r.listing_id).join() === "3,1" && live.total === 2
  );
  const all = await fetchAllOwnerListings(100, 20, { includeRemoved: true });
  check("R2 includeRemoved keeps them", all.items.length === 3 && all.total === 3);
  check(
    "R3 removed flag mapped onto properties",
    toOwnerProperty({ ...rows[1], title: "t", price_paise: 1, price_period: "TOTAL", verification_status: "VERIFIED", listing_status: "AVAILABLE" }).removed === true
  );
}

// --- 8. Screen wiring (source text) ------------------------------------------------
check("W1 Leads screen groups leads (historical kept)", leadsScreenSrc.includes("groupOwnerLeads(properties, allLeads)"));
check("W2 picker iterates grouped entries with real counts", leadsScreenSrc.includes("leadGroups.entries.map((prop)") && leadsScreenSrc.includes("leadGroups.leadsFor(prop).length"));
check(
  "W3 unavailable entry never opens a property modal",
  leadsScreenSrc.includes("selectedProperty && !selectedProperty.unavailable && (") &&
    leadsScreenSrc.includes("if (!selectedProperty.unavailable) setShowPropertyDetailModal(true);")
);
check("W4 historical lead cards name their listing", leadsScreenSrc.includes("leadPropertyLabel(lead)"));
check("W5 no visits fetched for the unavailable entry", leadsScreenSrc.includes("if (!selectedProperty || selectedProperty.unavailable) return null;"));
check(
  "W6 dashboard total uses every genuine lead",
  dashboardSrc.includes("const totalEnquiries = serverLeadsTotal ?? listingEnquiries;") &&
    dashboardSrc.includes("{leadPropertyLabel(lead)}")
);
check(
  "W7 lead detail uses id-first matching and the honest label",
  leadDetailSrc.includes("selectPropertyLeads([lead], p)") && leadDetailSrc.includes("{leadPropertyLabel(lead)}")
);

// --- 9. Lead detail: real type, asking price, no inferred buyer data ---------------
{
  const villaWordOnCommercial = toOwnerLead(
    row(7, 9, { listing: { title: "Villa-style office", price_paise: 2500000, price_period: "MONTHLY", property_type: "COMMERCIAL" } })
  );
  check("T1 real property_type mapped", villaWordOnCommercial.propertyType === "COMMERCIAL");
  check("T2 label comes from the real type, not title words", propertyTypeLabel(villaWordOnCommercial.propertyType) === "Commercial");
  check(
    "T3 every backend type has a label",
    ["APARTMENT", "VILLA", "HOUSE", "COMMERCIAL", "PLOT", "AGRICULTURAL_LAND"].every((t) => typeof propertyTypeLabel(t) === "string")
  );
  const noType = toOwnerLead(row(8, 9));
  check(
    "T4 missing/unknown type gives null (screen shows neutral fallback)",
    noType.propertyType === undefined &&
      propertyTypeLabel(noType.propertyType) === null &&
      propertyTypeLabel("SPACESHIP") === null &&
      propertyTypeLabel(null) === null
  );
  check("T5 asking price is the listing's real price", villaWordOnCommercial.propertyPrice === "₹25,000/mo");
  check("T6 no buyer budget invented", villaWordOnCommercial.budget === undefined);
}
check(
  "T7 detail screen: no type inferred from title words",
  !leadDetailSrc.includes('propertyTitle?.includes("Villa")') &&
    !leadDetailSrc.includes('propertyTitle?.includes("Office")') &&
    leadDetailSrc.includes('{propertyTypeLabel(lead.propertyType) || "Not available"}')
);
check(
  "T8 detail screen: asking price labelled as such, never as buyer budget",
  leadDetailSrc.includes(">ASKING PRICE<") &&
    !leadDetailSrc.includes(">BUDGET<") &&
    !leadDetailSrc.includes("lead.budget ||") &&
    leadDetailSrc.includes('{lead.propertyPrice || "Not available"}')
);
check(
  "T9 detail screen: no buyer-requirement claims (locality/visit are real lead facts)",
  !leadDetailSrc.includes("PREFERRED LOCALITY") &&
    !leadDetailSrc.includes(">Buyer Requirement<") &&
    !leadDetailSrc.includes("lead.preferredVisitDate") &&
    // The SITE VISIT spec row keeps the approved honest fallbacks now that
    // the §D reload can leave date/time absent on old rows.
    leadDetailSrc.includes('ownerVisit.date || "Date unavailable"') &&
    leadDetailSrc.includes('ownerVisit.time || "Time unavailable"') &&
    leadDetailSrc.includes('"Not scheduled"') &&
    !leadDetailSrc.includes("ownerVisitIsOpen ? `${ownerVisit.date} · ${ownerVisit.time}` : \"Not scheduled\"")
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall owner-leads-display checks passed");
