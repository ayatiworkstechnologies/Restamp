// Owner contact, call tracking and site-visit errors (plain node, no Jest).
//
// - The contact sheet / detail name the listing's REAL owner (the reveal's or
//   the detail's public-safe owner_name), "Property Owner" only when unknown.
// - View Number, Call Now, WhatsApp and the card's Call/WhatsApp use the same
//   revealed number (contact.js remembers it per listing for the session, so
//   no second reveal is sent), normalised to E.164 for tel: / wa.me.
// - A Call tap records "call initiated" fire-and-forget before the dialler
//   opens (never "answered"); not on the caller's own listing.
// - A failed visit request shows the server's real reason; only a genuine
//   network failure is called a connection problem; repeated taps send one
//   request.
//
// Run: node scripts/owner-contact.test.mjs
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const src = (p) => readFileSync(join(SRC, p), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "owner-contact-test-"));
cpSync(SRC, join(tmp, "src"), { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
const load = (rel) => import(pathToFileURL(join(tmp, "src", rel)).href);

const oc = await load("features/buyer/utils/ownerContact.js");
const client = await load("shared/api/client.js");
const buyerMode = await load("features/buyer/api/buyerMode.js");
const contact = await load("shared/api/contact.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- A. Owner name -----------------------------------------------------------------
check("A1 the reveal's owner name wins, then the listing detail's",
  oc.ownerNameFor({ ownerName: "Detail Name" }, { ownerName: "Revealed Name" }) === "Revealed Name" &&
  oc.ownerNameFor({ ownerName: "Detail Name" }, null) === "Detail Name");
check("A2 no real name -> null (the screen shows the fallback), never an agent/sample name",
  oc.ownerNameFor({ agent: { name: "Seller" } }, null) === null && oc.ownerNameFor(null, { ownerName: "  " }) === null &&
  oc.OWNER_NAME_FALLBACK === "Property Owner");
const card = src("features/buyer/components/PropertySearchCard.js");
check("A3 card + contact sheet show the owner's name, not a generic 'Seller'",
  !card.includes('|| "Seller"') && card.includes("{state.ownerName || OWNER_NAME_FALLBACK}") &&
  card.includes("ownerName: ownerNameFor(viewedNumberProperty, contact)"));
const modal = src("features/buyer/components/PropertyDetailModal.js");
check("A4 detail owner section: live detail name, else this listing's reveal",
  modal.includes("ownerNameFor(liveDetail, null) ||") && modal.includes("getRevealedContact(property.backendId)") &&
  !modal.includes("property?.agent?.name || \"\""));

// --- B. One authorized number, normalised -------------------------------------------
check("B1 tel: URLs are E.164 for every stored shape",
  oc.ownerDialUrl("+919876543210") === "tel:+919876543210" && oc.ownerDialUrl("9876543210") === "tel:+919876543210" &&
  oc.ownerDialUrl("+91 98765 43210") === "tel:+919876543210" && oc.ownerDialUrl("919876543210") === "tel:+919876543210" &&
  oc.ownerDialUrl("+16505550100") === "tel:+16505550100");
check("B2 unusable numbers never build a URL", oc.ownerDialUrl("") === null && oc.ownerDialUrl("12") === null &&
  oc.ownerDialUrl("call me") === null && oc.ownerWhatsAppUrl(null) === null);
check("B3 WhatsApp uses the same number (digits, no '+') with the message",
  oc.ownerWhatsAppUrl("+919876543210", "Hi there") === "https://wa.me/919876543210?text=Hi%20there");

const calls = [];
let revealBody = { phone: "+919876543210", owner_name: "Lakshmi R", own_listing: false };
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url).replace(/^https?:\/\/[^/]+/, ""), method: options.method || "GET" });
  const body = String(url).includes("/contact") ? revealBody : { ok: true };
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body), headers: { get: () => "application/json" } };
};
client.setAuthToken("buyer-token");
buyerMode.noteServerRole("BUYER");
check("B4 nothing is known before the reveal", contact.getRevealedContact(41) === null);
const got = await contact.revealContact(41);
check("B5 the reveal returns the number, the owner's name and own-listing flag",
  got.phone === "+919876543210" && got.ownerName === "Lakshmi R" && got.ownListing === false, got);
const again = contact.getRevealedContact(41);
check("B6 the revealed contact is remembered for that listing (Call/WhatsApp reuse it, no second reveal)",
  again && again.phone === got.phone && calls.filter((c) => c.url.includes("/contact")).length === 1, calls);
check("B7 never shared across listings", contact.getRevealedContact(42) === null);
client.setAuthToken("other-account-token");
check("B8 never shared across accounts (new login = new token)", contact.getRevealedContact(41) === null);
revealBody = { phone: "+919876543210" };
check("B9 older servers (phone only) still work; the old helper returns the phone",
  (await contact.revealContactPhone(43)) === "+919876543210" && contact.getRevealedContact(43).ownerName === null);

const hook = card.slice(card.indexOf("export function useViewNumber"), card.indexOf("export function ViewNumberSheet"));
check("B10 card Call/WhatsApp use the known number, else open View Number (no 'unavailable' dead end)",
  hook.includes("const known = knownContact(property);") && (hook.match(/handleViewNumber\(property\);\n      return;/g) || []).length === 2 &&
  hook.includes("const cached = getRevealedContact(backendId);"));
check("B11 the sheet's Call Now / WhatsApp dial the listing's revealed contact",
  card.includes("state.handleCall(state.property);") && card.includes("state.handleWhatsApp(state.property);"));

// --- C. Call tracking ---------------------------------------------------------------------
const handleCall = hook.slice(hook.indexOf("const handleCall = "), hook.indexOf("// Contact-reveal state"));
check("C1 card/sheet Call records the tap fire-and-forget before dialling, not on own listing",
  handleCall.includes("if (!known.ownListing) recordCallTap(property?.backendId);") &&
  !handleCall.includes("await recordCallTap") &&
  handleCall.indexOf("recordCallTap(") < handleCall.indexOf("Linking.openURL(url)"));
const vnb = src("features/buyer/components/ViewNumberButton.js");
const vnbCall = vnb.slice(vnb.indexOf("const call = (e) =>"), vnb.indexOf("const call = (e) =>") + 400);
check("C2 the inline View Number button (Home, detail) records the tap before dialling",
  vnbCall.includes("if (!ownListing) recordCallTap(Number(backendId));") &&
  vnbCall.indexOf("recordCallTap(") < vnbCall.indexOf("Linking.openURL(url)"));
const dial = modal.slice(modal.indexOf("const dialOwner = "), modal.indexOf("const handleCallOwner = "));
check("C3 detail Call now records the tap before dialling, not on own listing",
  dial.includes("if (!ownListing) recordCallTap(backendId);") && dial.indexOf("recordCallTap(") < dial.indexOf("Linking.openURL(url)"));
check("C4 the detail Call reuses this session's reveal (no second request)",
  modal.includes("(cached ? Promise.resolve(cached) : revealContact(backendId))"));
check("C5 Explore uses the shared sheet (its own popup could never reveal or call)",
  src("features/buyer/screens/ExploreScreen.js").includes("<ViewNumberSheet state={viewNumber} />"));

// --- D. Site visit errors --------------------------------------------------------------
const e = (status, detail, kind) => ({ status, detail, kind });
check("D1 own listing -> its real reason", oc.visitErrorCopy(e(422, "cannot schedule a visit on your own listing")).kind === "own");
check("D2 a visit already open -> 'Visit Already Requested', points to Activity > Visits",
  oc.visitErrorCopy(e(422, "A visit is already active for this buyer on this listing")).kind === "duplicate" &&
  /Activity > Visits/.test(oc.visitErrorCopy(e(422, "A visit is already active for this buyer on this listing")).message));
check("D3 other server validation shows the server's reason",
  oc.visitErrorCopy(e(422, "Visit time must be in the future")).message === "Visit time must be in the future" &&
  /valid future date/.test(oc.visitErrorCopy(e(422, "Invalid request")).message));
check("D4 only a real network failure says 'check your connection'",
  /connection/.test(oc.visitErrorCopy(e(undefined, undefined, "offline")).message) &&
  /connection/.test(oc.visitErrorCopy(e(undefined, undefined, "timeout")).message) &&
  !/connection/.test(oc.visitErrorCopy(e(500, "Internal error", "retry")).message) &&
  !/connection/.test(oc.visitErrorCopy(e(422, "cannot schedule a visit on your own listing")).message));
const confirm = modal.slice(modal.indexOf("const handleConfirmVisit = "), modal.indexOf("const handleLoginRequired = "));
check("D5 repeated taps send one visit request; the guard always resets",
  confirm.includes("if (visitSubmitting.current) return;") && confirm.includes("visitSubmitting.current = true;") &&
  confirm.includes("visitSubmitting.current = false;"));
check("D6 the failure alert uses the real reason; a duplicate reloads the open visit",
  confirm.includes("const copy = visitErrorCopy(e);") && confirm.includes('if (copy.kind === "duplicate") {') &&
  confirm.includes("Alert.alert(copy.title, copy.message") && !confirm.includes('"Couldn\'t schedule visit",\n          "Please check your connection'));

// --- E. Owner sees who requested the visit ------------------------------------------------
const patchVisits = join(tmp, "src", "shared/utils/visitStatus.js");
writeFileSync(patchVisits, readFileSync(patchVisits, "utf8").split('from "../constants/colors"').join('from "../constants/colors.js"'));
const visits = await load("shared/api/visits.js");
const row = (extra) => ({ id: 1, property_listing_id: 2, buyer_user_id: 77, owner_user_id: 9, status: "REQUESTED",
  initiator: "BUYER", scheduled_at: "2030-01-02T05:00:00", listing: {}, ...extra });
check("E1 requester_role maps to the Buyer/Agent badge; unknown stays unknown",
  visits.toUiVisit(row({ requester_role: "BROKER" })).requesterRole === "agent" &&
  visits.toUiVisit(row({ requester_role: "BUYER" })).requesterRole === "buyer" &&
  visits.toUiVisit(row({})).requesterRole === undefined);
check("E2 an agent with no chosen name reads 'Agent #id', a buyer 'Buyer #id'",
  visits.toUiVisit(row({ requester_role: "BROKER" })).buyerLabel === "Agent #77" &&
  visits.toUiVisit(row({})).buyerLabel === "Buyer #77" &&
  visits.toUiVisit(row({ requester_role: "BROKER", buyer_display_name: "Ravi K" })).buyerLabel === "Ravi K");
check("E3 owner visit cards show the corner tag",
  src("features/owner/screens/OwnerVisitsScreen.js").includes("<LeadSourceBadge sourceRole={visit.requesterRole} inset={14} />"));

console.log(failures ? `\n${failures} failure(s)` : "\nall owner-contact checks passed");
process.exit(failures ? 1 : 0);
