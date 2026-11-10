// Regression tests for owner lead contact actions and the closed-lead lifecycle:
//   K  Call Buyer / WhatsApp Chat use the buyer's number from the audited
//      POST /owner/leads/{id}/contact, validated before any tel: / wa.me URL
//      is opened (previously: leads never carried a phone, so both buttons
//      only showed "Phone Number Unavailable" and nothing was ever launched)
//   L  A closed lead (Rented, Sold, Leased, Not Converted) is read-only: no
//      close, no visit proposal, no visit change, in the lead list, lead
//      details and visit screens; server refusals ("Lead is closed" /
//      "Lead is already closed") reconcile the screen instead of a generic
//      "check your connection"
//   V  Buyer side: a stale visit action after the owner closed the lead
//      explains the closure
// Run with: node scripts/lead-close-contact.test.mjs  (plain node, no deps)
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
const tmp = mkdtempSync(join(tmpdir(), "lead-close-contact-test-"));
cpSync(SRC, join(tmp, "src"), { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
const statusPath = join(tmp, "src", "shared", "utils", "visitStatus.js");
writeFileSync(statusPath, readFileSync(statusPath, "utf8").replace('from "../constants/colors"', 'from "../constants/colors.js"'));
const load = (rel) => import(pathToFileURL(join(tmp, "src", rel)).href);

const contact = await load("features/owner/utils/leadContact.js");
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

// --- K: contact number and URLs ---------------------------------------------------
const { normalizeBuyerPhone, buyerDialUrl, buyerWhatsAppUrl, formatBuyerPhone, openLeadBuyerContact } = contact;
check("K1 stored E.164 Indian mobile is kept", normalizeBuyerPhone("+919876543210") === "+919876543210");
check(
  "K2 local, 0-prefixed, 91-prefixed and spaced forms normalize to +91",
  ["9876543210", "09876543210", "919876543210", "+91 98765-43210", " (98765) 43210 "].every(
    (v) => normalizeBuyerPhone(v) === "+919876543210"
  )
);
check(
  "K3 invalid numbers are refused (never dialled)",
  [null, undefined, "", "   ", "abc", "12345", "5876543210", "+91 5876543210", "98765+43210", "++919876543210",
    "+0123456789", "tel:+919876543210", "+91987654321", {}].every((v) => normalizeBuyerPhone(v) === null)
);
check("K4 other countries pass only as well-formed E.164", normalizeBuyerPhone("+16505550123") === "+16505550123");
check("K5 dialer URL", buyerDialUrl("9876543210") === "tel:+919876543210");
check("K6 WhatsApp URL uses international digits without +", buyerWhatsAppUrl("+919876543210") === "https://wa.me/919876543210");
check("K7 no URL for an invalid number", buyerDialUrl("12345") === null && buyerWhatsAppUrl("") === null);
check("K8 display format", formatBuyerPhone("+919876543210") === "+91 98765 43210" && formatBuyerPhone("x") === "");

function deps({ phone = "+919876543210", revealError, openError } = {}) {
  const calls = { reveal: [], open: [] };
  return {
    calls,
    reveal: async (id) => {
      calls.reveal.push(id);
      if (revealError) throw revealError;
      return phone;
    },
    openURL: async (url) => {
      calls.open.push(url);
      if (openError) throw openError;
    },
  };
}
const lead = { id: 42, status: "new" };

let d = deps();
let r = await openLeadBuyerContact(lead, "call", d);
check("K9 Call reveals for the lead and opens the dialer", r.ok && r.phone === "+919876543210" &&
  d.calls.reveal.join() === "42" && d.calls.open.join() === "tel:+919876543210", { r, calls: d.calls });

d = deps({ phone: "9876543210" });
r = await openLeadBuyerContact(lead, "whatsapp", d);
check("K10 WhatsApp opens wa.me with the normalized number", r.ok && d.calls.open.join() === "https://wa.me/919876543210", d.calls);

d = deps();
r = await openLeadBuyerContact(lead, "whatsapp", { ...d, cachedPhone: "+919876543210" });
check("K11 a number already revealed on this screen is not revealed again", r.ok && d.calls.reveal.length === 0);

d = deps({ revealError: Object.assign(new Error("x"), { status: 404, detail: "Contact not available" }) });
r = await openLeadBuyerContact(lead, "call", d);
check("K12 buyer without a phone: honest message, nothing opened", !r.ok && r.title === "Phone Number Unavailable" &&
  /hasn't added a phone number/.test(r.message) && d.calls.open.length === 0);

d = deps({ revealError: Object.assign(new Error("x"), { status: 404, detail: "Not found" }) });
r = await openLeadBuyerContact(lead, "call", d);
check("K13 not the caller's lead (404): no number, nothing opened", !r.ok && r.title === "Lead Unavailable" && d.calls.open.length === 0);

d = deps({ revealError: Object.assign(new Error("x"), { status: 403, kind: "denied" }) });
r = await openLeadBuyerContact(lead, "call", d);
check("K14 wrong role (403) asks for owner mode", !r.ok && r.title === "Owner Mode Required" && d.calls.open.length === 0);

d = deps({ phone: "12345" });
r = await openLeadBuyerContact(lead, "whatsapp", d);
check("K15 an invalid number from the server is never launched", !r.ok && d.calls.open.length === 0 && !r.phone);

d = deps({ openError: new Error("no handler") });
r = await openLeadBuyerContact(lead, "whatsapp", d);
check("K16 app can't open: says so and shows the number instead", !r.ok && r.phone === "+919876543210" &&
  /WhatsApp/.test(r.title) && r.message.includes("+91 98765 43210"));

d = deps();
r = await openLeadBuyerContact({ id: null }, "call", d);
check("K17 a lead without an id never reveals", !r.ok && d.calls.reveal.length === 0 && d.calls.open.length === 0);

// API wiring: POST to the owner lead contact route, phone taken from {phone}.
const client = await load("shared/api/client.js");
const ownerApi = await load("features/owner/api/owner.js");
const seen = [];
globalThis.fetch = async (url, init) => {
  seen.push({ url: String(url), method: init?.method, auth: init?.headers?.Authorization || init?.headers?.authorization });
  return new Response(JSON.stringify({ phone: "+919876543210" }), { status: 200, headers: { "Content-Type": "application/json" } });
};
client.setAuthToken("test-token");
const phone = await ownerApi.revealLeadBuyerContact(42);
check("K18 revealLeadBuyerContact POSTs /owner/leads/{id}/contact with auth", phone === "+919876543210" &&
  seen.length === 1 && seen[0].method === "POST" && seen[0].url.endsWith("/owner/leads/42/contact") && !!seen[0].auth, seen);
check(
  "K19 lead rows stay phone-free (the reveal is the only source)",
  ownerApi.toOwnerLead({ id: 1, buyer_user_id: 2, property_listing_id: 3, status: "NEW", listing: null }).phone === undefined
);

const detailSrc = src("features/owner/screens/OwnerLeadDetailScreen.js");
const leadsSrc = src("features/owner/screens/OwnerLeadsScreen.js");
const propLeadsSrc = src("features/owner/screens/OwnerPropertyLeadsScreen.js");
const dashSrc = src("features/owner/screens/OwnerDashboardScreen.js");
const glueSrc = src("features/owner/utils/contactLeadBuyer.js");
check(
  "K20 every owner Call/WhatsApp control goes through contactLeadBuyer (no fake 'Dialing…' alerts)",
  [detailSrc, leadsSrc, propLeadsSrc, dashSrc].every((s) => s.includes("contactLeadBuyer(")) &&
    [detailSrc, leadsSrc, propLeadsSrc, dashSrc].every((s) => !/Dialing \$\{/.test(s) && !/if \(!lead\.phone\)/.test(s))
);
check(
  "K21 the glue opens URLs with Linking and alerts when nothing opened",
  glueSrc.includes("Linking.openURL(url)") && glueSrc.includes("revealLeadBuyerContact") &&
    glueSrc.includes("if (!result.ok) Alert.alert(result.title, result.message)")
);

// --- L: closed leads are read-only ----------------------------------------------------
const { isLeadClosed, isClosedLeadError, ownerVisitActions, leadVisitBlockedReason, ownerVisitErrorMessage } = ownerVisits;
check("L1 closed status is recognised in either casing", isLeadClosed({ status: "closed" }) && isLeadClosed({ status: "CLOSED" }) &&
  !isLeadClosed({ status: "new" }) && !isLeadClosed({ status: "contacted" }) && !isLeadClosed(null));
const none = { confirm: false, decline: false, reschedule: false, complete: false, cancel: false };
check(
  "L2 a closed lead's visit has no actions in any status",
  ["REQUESTED", "PROPOSED", "CONFIRMED", "CANCELLED"].every(
    (st) => JSON.stringify(ownerVisitActions(st, { leadClosed: true })) === JSON.stringify(none)
  )
);
check("L3 open leads keep their existing actions", ownerVisitActions("REQUESTED").confirm && ownerVisitActions("CONFIRMED").complete &&
  ownerVisitActions("PROPOSED", { leadClosed: false }).reschedule);
check(
  "L4 every outcome blocks a new proposal, even on a live listing",
  ["Rented", "Sold", "Leased", "Not Converted"].every((o) =>
    /lead is closed/.test(leadVisitBlockedReason({ verification_status: "VERIFIED", listing_status: "AVAILABLE" },
      { status: "closed", closedOutcome: o }) || "")
  ) && leadVisitBlockedReason({ verification_status: "VERIFIED", listing_status: "AVAILABLE" }, { status: "new" }) === null
);
const closedErr = { status: 422, detail: "Lead is closed" };
check("L5 server refusals on closed records are recognised",
  isClosedLeadError(closedErr) && isClosedLeadError({ status: 422, detail: "Lead is already closed" }) &&
    !isClosedLeadError({ status: 422, detail: "Invalid request" }) && !isClosedLeadError({ status: 404, detail: "Lead is closed" }));
check("L6 owner visit errors explain the closure", /lead has been closed/.test(ownerVisitErrorMessage(closedErr, "reschedule").message));

check(
  "L7 lead details: no Update Site Visit / Close Lead on a closed lead, outcome shown instead",
  /\{leadClosed \? \(\s*<View style=\{styles\.bottomButtonsRow\}>\s*<Text style=\{styles\.closedLeadTitle\}>/.test(detailSrc) &&
    detailSrc.includes("Lead closed{lead.closedOutcome ? ` · ${lead.closedOutcome}` : \"\"}")
);
check(
  "L8 lead details: every visit action is gated by the closed lead",
  (detailSrc.match(/ownerVisitActions\(ownerVisit\.serverStatus, \{ leadClosed \}\)/g) || []).length === 5 &&
    !/ownerVisitActions\(ownerVisit\.serverStatus\)/.test(detailSrc)
);
check(
  "L9 lead details: a stale visit sheet can't submit and is dismissed when the lead closes",
  /const handleScheduleVisit = async \(visitData\) => \{\s*if \(leadClosed\) \{\s*setShowVisitModal\(false\);\s*return;/.test(detailSrc) &&
    /useEffect\(\(\) => \{\s*if \(leadClosed\) setShowVisitModal\(false\);/.test(detailSrc) &&
    /visitBusy \|\| leadClosed\) return;/.test(detailSrc)
);
check(
  "L10 lead details: after a close, the lead and its (now cancelled) visit are reloaded",
  detailSrc.includes("await Promise.all([loadLead(), loadOwnerVisit()]);") &&
    detailSrc.includes("updateLeadStatus(lead.id, mapped.status, mapped.closedOutcome);")
);
check(
  "L11 lead details: server refusals on a closed lead reconcile the screen",
  (detailSrc.match(/isClosedLeadError\(error\)/g) || []).length >= 4 && detailSrc.includes("const reconcileClosedLead = () => {")
);
for (const [name, s] of [["Buyer Leads", leadsSrc], ["Property Leads", propLeadsSrc]]) {
  check(
    `L12 ${name}: closed leads show no visit tag or visit button and never count as visit scheduled`,
    s.includes("const leadVisit = isLeadClosed(lead) ? null : activeVisitByBuyer.get(") &&
      !/[^!]activeVisitByBuyer\.has\(Number\(l\.buyer_user_id\)\)/.test(s.replace(/!isLeadClosed\(l\) && activeVisitByBuyer\.has/g, "OK"))
  );
  check(
    `L13 ${name}: menus offer no visit or close on a closed lead`,
    /\.\.\.\(isLeadClosed\(lead\)\s*\?\s*\[\]\s*:\s*\[/.test(s)
  );
  check(
    `L14 ${name}: a stale visit sheet for a closed lead never submits; refusals reload`,
    /const lead = selectedLeadForVisit;\s*if \(isLeadClosed\(lead\)\) \{\s*setSelectedLeadForVisit\(null\);\s*return;/.test(s) &&
      /if \(isClosedLeadError\(error\)\) \{\s*setSelectedLeadForVisit\(null\);\s*loadLeads\(\);\s*loadOwnerVisits\(\);/.test(s)
  );
  check(
    `L15 ${name}: closing reloads leads and visits`,
    s.includes("await Promise.all([loadLeads(), loadOwnerVisits()]);")
  );
}
const visitsSrc = src("features/owner/screens/OwnerVisitsScreen.js");
check("L16 Owner Visits reloads after a closed-lead refusal", (visitsSrc.match(/if \(isClosedLeadError\(error\)\) loadVisits\(\);/g) || []).length === 2);

// --- V: buyer side ---------------------------------------------------------------------
check("V1 buyer recognises the closed-lead refusal", visitStatus.isVisitLeadClosedError(closedErr) &&
  !visitStatus.isVisitLeadClosedError({ status: 422, detail: "Cannot move visit from CANCELLED to CONFIRMED" }));
check("V2 buyer copy says the enquiry was closed and the visit cancelled",
  /closed your enquiry/.test(visitStatus.buyerLeadClosedCopy().message) && /cancelled/.test(visitStatus.buyerLeadClosedCopy().message) &&
    /new enquiry/.test(visitStatus.buyerLeadClosedCopy("request").message));
check("V3 a cancelled visit is shown as Cancelled", visitStatus.getVisitDisplay({ serverStatus: "CANCELLED" }, "buyer").label === "Cancelled");
const savedSrc = src("features/buyer/screens/SavedScreen.js");
const modalSrc = src("features/buyer/components/PropertyDetailModal.js");
check("V4 Activity: cancel, confirm/decline and reschedule handle the closed lead", (savedSrc.match(/if \(isVisitLeadClosedError\(e\)\)/g) || []).length === 3);
check("V5 property detail: respond, cancel and request handle the closed lead", (modalSrc.match(/if \(isVisitLeadClosedError\(e\)\)/g) || []).length === 3);
check(
  "V6 Activity offers no buttons on cancelled visits (only open statuses have actions)",
  /selectedVisitForDetails\.serverStatus === "PROPOSED" && \(/.test(savedSrc) &&
    /\(selectedVisitForDetails\.serverStatus === "REQUESTED" \|\|\s*selectedVisitForDetails\.serverStatus === "CONFIRMED"\) && \(/.test(savedSrc)
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall lead-close-contact checks passed");
