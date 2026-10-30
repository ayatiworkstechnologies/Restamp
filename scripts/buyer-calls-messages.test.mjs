// Regression tests for the Buyer Calls and Messages tabs (CONTRACT §A/§B).
// Run with: node scripts/buyer-calls-messages.test.mjs  (plain node, no deps)
// Covers: recordCallTap is passive (signed out / non-BUYER role -> no
// request, never a role switch, failures never throw); fetchCallEvents and
// toUiCallEvent (listing card or "no longer available", UTC -> local time);
// toUiEnquiry exposes the real thread summary and full thread with no
// invented recipient name/phone; screens record a tap only from real Call
// buttons, immediately before the dialler, never from WhatsApp or reveal;
// the fabricated visit note is gone.
//
// Deterministic time zone (Asia/Kolkata). Same tmp-copy harness as the
// other script tests; network fully stubbed via global.fetch.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const SHARED_API = join(SRC, "shared", "api");
const BUYER_API = join(SRC, "features", "buyer", "api");
const tmp = mkdtempSync(join(tmpdir(), "buyer-calls-messages-test-"));
copyFileSync(join(SHARED_API, "client.js"), join(tmp, "client.js"));
copyFileSync(join(SHARED_API, "mappers.js"), join(tmp, "mappers.js"));
for (const f of ["calls.js", "enquiries.js", "buyerMode.js", "buyerModeCore.js"]) {
  copyFileSync(join(BUYER_API, f), join(tmp, f));
}
for (const f of ["calls.js", "enquiries.js", "buyerMode.js", "buyerModeCore.js", "mappers.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(tmp, f), "utf8")
      .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
      .replace(/from "[^"]*mappers(\.js)?"/g, 'from "./mappers.js"')
      .replace(/from "[^"]*buyerMode(\.js)?"/g, 'from "./buyerMode.js"')
      .replace(/from "[^"]*buyerModeCore(\.js)?"/g, 'from "./buyerModeCore.js"')
  );
}
const client = await import(join(tmp, "client.js"));
const buyerMode = await import(join(tmp, "buyerMode.js"));
const { recordCallTap, fetchCallEvents, toUiCallEvent } = await import(join(tmp, "calls.js"));
const { toUiEnquiry, fetchMyEnquiries } = await import(join(tmp, "enquiries.js"));
const read = (rel) => readFileSync(join(SRC, rel), "utf8");
const savedSrc = read("features/buyer/screens/SavedScreen.js");
const modalSrc = read("features/buyer/components/PropertyDetailModal.js");
const searchSrc = read("features/buyer/screens/SearchScreen.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const calls = [];
function stubFetch(status, body) {
  global.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || "GET" });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

const card = {
  listing_id: 12, title: "Sea View 2BHK", price_paise: 250000000, price_period: "TOTAL",
  price_display: "₹25.00 L", transaction_type: "BUY", property_type: "APARTMENT",
  construction_status: null, description: null, area_value: 1100, area_unit: "sqft",
  bedrooms: 2, bathrooms: 2, address_line: "12 Beach Rd", locality: "Besant Nagar",
  city: "Chennai", pincode: "600090", location_label: "Besant Nagar, Chennai",
  cover_image_url: "https://img.example/12.jpg",
};

// --- 1. recordCallTap is passive ---------------------------------------------------
{
  const event = { id: 3, property_listing_id: 12, created_at: "2030-12-30T11:00:00Z" };
  client.setAuthToken(null);
  calls.length = 0;
  stubFetch(201, event);
  check("C1 signed out: no request, resolves null", (await recordCallTap(12)) === null && calls.length === 0);

  client.setAuthToken("tok");
  buyerMode.noteServerRole("OWNER");
  calls.length = 0;
  check("C2 OWNER-mode account: no request and no role switch", (await recordCallTap(12)) === null && calls.length === 0, calls);

  buyerMode.noteServerRole("BUYER");
  calls.length = 0;
  const ok = await recordCallTap(12);
  check(
    "C3 BUYER: exactly one POST /buyer/listings/{id}/call-events (no /users/me/role)",
    calls.length === 1 && calls[0].method === "POST" && calls[0].url.endsWith("/buyer/listings/12/call-events") && ok && ok.id === 3,
    calls
  );

  for (const [status, detail] of [[500, "Internal error"], [422, "Cannot record a call on your own listing"], [404, "Not found"]]) {
    stubFetch(status, { detail });
    let threw = false;
    let res;
    try { res = await recordCallTap(12); } catch { threw = true; }
    check(`C4 ${status} never throws (the call is never blocked)`, !threw && res === null);
  }
  global.fetch = async () => { throw new TypeError("Network request failed"); };
  let threw = false;
  try { await recordCallTap(12); } catch { threw = true; }
  check("C5 offline never throws", !threw);

  calls.length = 0;
  stubFetch(201, event);
  check(
    "C6 missing/invalid listing ids are ignored",
    (await recordCallTap(null)) === null && (await recordCallTap(undefined)) === null &&
      (await recordCallTap("undefined")) === null && (await recordCallTap(0)) === null && calls.length === 0
  );
}

// --- 2. Call history ---------------------------------------------------------------
{
  buyerMode.noteServerRole("BUYER");
  const item = { id: 9, property_listing_id: 12, created_at: "2030-12-30T11:00:00Z", listing: card };
  stubFetch(200, { items: [item], page: 1, page_size: 50, total: 1 });
  calls.length = 0;
  const page = await fetchCallEvents({ page: 1, pageSize: 50 });
  check("H1 GET /buyer/call-events with paging", calls.some((c) => c.url.includes("/buyer/call-events?") && c.url.includes("page_size=50")), calls);
  check("H2 items/total passed through", page.total === 1 && page.items.length === 1);
  stubFetch(503, { detail: "x" });
  let rejected = false;
  try { await fetchCallEvents(); } catch { rejected = true; }
  check("H3 list failure rejects (tab shows its error state)", rejected);

  const ui = toUiCallEvent(item);
  check("H4 card mapped with numeric backendId", ui.property && ui.property.backendId === 12 && ui.property.title === "Sea View 2BHK" && ui.listingId === 12);
  check("H5 UTC instant shown in local time (4:30 PM Chennai)", /^0?4:30\s*pm$/i.test(ui.tappedTime.replace(/ /g, " ")) && ui.tappedDate === "30 Dec 2030", ui);
  check("H6 zone-less created_at read as UTC", toUiCallEvent({ ...item, created_at: "2030-12-30T11:00:00" }).tappedAt === "2030-12-30T11:00:00.000Z");
  const gone = toUiCallEvent({ ...item, listing: null });
  check("H7 listing no longer public: event kept, property null (no invented card)", gone.property === null && gone.listingId === 12);
  check("H8 bad timestamp: honest 'Date unavailable'", toUiCallEvent({ ...item, created_at: "nope" }).tappedDate === "Date unavailable");
  check("H9 no phone or agent fields on a call event", !("phone" in ui) && !("agentName" in ui) && !("agentPhone" in ui));
}

// --- 3. Messages (enquiry threads) ---------------------------------------------------
{
  const snapshot = { title: "Sea View 2BHK", price_paise: 250000000, price_period: "TOTAL", price_display: "₹25.00 L", property_type: "APARTMENT", locality: "Besant Nagar", city: "Chennai", cover_image_url: null };
  const listRow = {
    id: 41, property_listing_id: 12, message: "Is it available?", status: "NEW", closing_reason: null,
    created_at: "2030-12-30T05:00:00Z", message_count: 3, last_message: "Can I visit Sunday?",
    last_message_at: "2030-12-30T11:00:00Z", messages: null, listing: snapshot,
  };
  const m = toUiEnquiry(listRow);
  check("M1 thread summary: count + last message + last activity", m.messageCount === 3 && m.lastMessage === "Can I visit Sunday?" && m.lastMessageAt === "2030-12-30T11:00:00.000Z");
  check("M2 timestamp is the last activity in local time", m.timestamp.startsWith("30 Dec 2030, ") && /4:30/.test(m.timestamp), m.timestamp);
  check("M3 price from price_display, location from locality + city", m.propertyPrice === "₹25.00 L" && m.propertyLocation === "Besant Nagar, Chennai");
  check("M4 no invented recipient name/role/phone", !("recipientPhone" in m) && !("recipientName" in m) && !("recipientRole" in m));
  check("M5 list rows carry no thread (null, not [])", m.messages === null);
  check("M6 no cover photo -> null image, not a stock photo", m.propertyImage === null);

  const detail = toUiEnquiry({
    ...listRow,
    messages: [
      { id: null, body: "Is it available?", sender: "BUYER", created_at: null },
      { id: 77, body: "Can I visit Sunday?", sender: "BUYER", created_at: "2030-12-30T11:00:00Z" },
    ],
  });
  check("M7 full thread kept in order", detail.messages.length === 2 && detail.messages[1].body === "Can I visit Sunday?");
  check("M8 legacy opening message without time: stable key + 'Date unavailable'", detail.messages[0].id === "opening-0" && detail.messages[0].timestamp === "Date unavailable");
  const closed = toUiEnquiry({ ...listRow, status: "CLOSED", closing_reason: "Not Converted" });
  check("M9 closed enquiry keeps its outcome", closed.status === "closed" && closed.closingReason === "Not Converted");
  const legacy = toUiEnquiry({ ...listRow, last_message_at: null, created_at: null, message_count: 0, last_message: null });
  check("M10 no timestamps at all: 'Date unavailable', original message as preview", legacy.timestamp === "Date unavailable" && legacy.lastMessage === "Is it available?");

  stubFetch(200, { items: [listRow], page: 1, page_size: 50, total: 1 });
  calls.length = 0;
  await fetchMyEnquiries(1, 50);
  check("M11 list request uses numeric page/page_size", calls.some((c) => /\/buyer\/enquiries\?page=1&page_size=50$/.test(c.url)), calls);
}

// --- 4. Screen wiring (source text) ------------------------------------------------
{
  const handleCall = savedSrc.slice(savedSrc.indexOf("const handleCall = ("), savedSrc.indexOf("const callListingOwner"));
  check(
    "W1 SavedScreen records the tap only when a listing id is given, right before tel:",
    handleCall.includes("if (listingId != null) recordCallTap(listingId);") &&
      handleCall.indexOf("recordCallTap(listingId)") < handleCall.indexOf("tel:+") &&
      handleCall.indexOf("cleanPhoneOrNull(phone)") < handleCall.indexOf("recordCallTap(listingId)")
  );
  check("W2 SavedScreen never calls recordCallTap(null)", !savedSrc.includes("recordCallTap(null)"));
  const whatsapp = savedSrc.slice(savedSrc.indexOf("const openWhatsApp"), savedSrc.indexOf("const handleCall = ("));
  check("W3 WhatsApp and reveal paths never record a call", !whatsapp.includes("recordCallTap(") && !savedSrc.slice(savedSrc.indexOf("const withRevealedPhone"), savedSrc.indexOf("const openWhatsApp")).includes("recordCallTap("));
  check("W4 owner numbers only via the reveal endpoint (callListingOwner)", savedSrc.includes("(digits) => handleCall(digits, \"Property Owner\", listingId)"));
  check(
    "W5 no mock recipient/agent lookups in Calls/Messages",
    !savedSrc.includes("recipientPhone") && !savedSrc.includes("findAgentByName") && !savedSrc.includes("item.agentPhone")
  );
  check("W6 Calls tab uses the real call-event mapper", savedSrc.includes(".map(toUiCallEvent)") && savedSrc.includes("Property no longer available"));
  check("W7 Messages: loading, error + retry, full thread on expand", savedSrc.includes("Loading messages…") && savedSrc.includes("Couldn't load messages") && savedSrc.includes("fetchEnquiryDetail(enquiryId)"));
  check("W8 message preview is the real text, not a literal placeholder", !savedSrc.includes('"{item.lastMessage}"') && savedSrc.includes("{`\"${item.lastMessage}\"`}"));
  check("W9 fetchMyEnquiries called with (page, pageSize), not an object", savedSrc.includes("fetchMyEnquiries(1, 50)") && !savedSrc.includes("fetchMyEnquiries({"));
  check("W10 ActivityIndicator comes from react-native, not HugeIcon", /ActivityIndicator,\n\} from "react-native";/.test(savedSrc));

  const modalCall = modalSrc.slice(modalSrc.indexOf("const handleCallOwner"), modalSrc.indexOf("const handleCallOwner") + 2000);
  check("W11 detail modal records the tap right before tel:", modalCall.indexOf("recordCallTap(backendId)") > -1 && modalCall.indexOf("recordCallTap(backendId)") < modalCall.indexOf("tel:"));
  check("W12 search Call records the tap before tel:", searchSrc.indexOf("recordCallTap(property?.backendId)") > -1 && searchSrc.indexOf("recordCallTap(property?.backendId)") < searchSrc.indexOf("tel:+${digits}"));
  check("W13 fabricated visit note removed", !modalSrc.includes("Requested via Property Details page."));
  check("W14 buyer visits use shared status + names + reschedule prefill", savedSrc.includes('getVisitDisplay(item, "buyer")') && savedSrc.includes("item.ownerLabel") && savedSrc.includes("toScheduleModalInitial(selectedVisitForDetails || {})"));
}

client.setAuthToken(null);
if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall buyer calls/messages checks passed");
