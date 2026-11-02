// Regression tests for two-way enquiry messaging (owner replies, §D).
// Run with: node scripts/owner-replies.test.mjs  (plain node, no deps)
// Covers: sendOwnerReply POSTs a trimmed {message} to
// /owner/leads/{id}/messages and returns the server-confirmed message;
// empty / over-long replies never reach the network (rejected, not cut);
// a duplicate reply the server returns again (HTTP 200, same id) appears
// once; the lead summary follows a new reply; honest error text for 422
// closed lead, 429 rate limit, 404 missing and the rest (never "sent");
// sender labels on both sides (owner: Buyer/Owner, buyer: You/Owner); the
// buyer previews use the thread's latest message; screen wiring shows a
// reply only after the server confirms it and keeps the draft on failure.
//
// Same tmp-copy harness as owner-lead-detail.test.mjs: modules are copied to
// tmp with extensionless imports fixed and buyerMode replaced by a
// pass-through; the network is fully stubbed via global.fetch — no backend
// is contacted. React screens import React and cannot run here; their
// wiring is guarded by source-text assertions.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "owner-replies-test-"));
copyFileSync(join(SRC, "shared", "api", "client.js"), join(tmp, "client.js"));
copyFileSync(join(SRC, "shared", "api", "mappers.js"), join(tmp, "mappers.js"));
const fixImports = (text) =>
  text
    .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
    .replace(/from "[^"]*mappers(\.js)?"/g, 'from "./mappers.js"')
    .replace(/from "[^"]*buyerMode(\.js)?"/g, 'from "./buyerMode.js"');
writeFileSync(join(tmp, "owner.js"), fixImports(readFileSync(join(SRC, "features", "owner", "api", "owner.js"), "utf8")));
writeFileSync(join(tmp, "enquiries.js"), fixImports(readFileSync(join(SRC, "features", "buyer", "api", "enquiries.js"), "utf8")));
writeFileSync(join(tmp, "buyerMode.js"), "export const withBuyerMode = (fn) => fn();\n");
const owner = await import(join(tmp, "owner.js"));
const enquiries = await import(join(tmp, "enquiries.js"));
const client = await import(join(tmp, "client.js"));
const {
  sendOwnerReply, mergeLeadMessage, applyOwnerReply, leadMessageSenderLabel,
  ownerReplyErrorMessage, OWNER_REPLY_MAX_LENGTH, toOwnerLead,
} = owner;
const { enquirySenderLabel, toUiEnquiry } = enquiries;

const src = (rel) => readFileSync(join(SRC, rel), "utf8");
const detailSrc = src("features/owner/screens/OwnerLeadDetailScreen.js");
const savedSrc = src("features/buyer/screens/SavedScreen.js");
const enquiriesSrc = src("features/buyer/screens/EnquiriesScreen.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}
async function attempt(body) {
  try {
    return !!(await body());
  } catch (error) {
    console.log("    (threw: " + (error && error.message) + ")");
    return false;
  }
}

// --- fetch stub (records every call; no network) -------------------------------------
const sent = [];
let respond = null;
global.fetch = async (url, options = {}) => {
  sent.push({
    url: String(url),
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body ? JSON.parse(options.body) : null,
  });
  return respond ? respond() : { ok: true, status: 200, json: async () => ({}) };
};
const jsonOk = (data, status = 201) => () => ({ ok: true, status, json: async () => data });
const httpError = (status, detail) => () => ({
  ok: false,
  status,
  json: async () => (detail === undefined ? {} : { detail }),
});
const reply = (extra = {}) => ({ id: 501, body: "Yes, Saturday works.", sender: "OWNER", created_at: "2030-12-31T04:30:00Z", ...extra });

client.setAuthToken("owner-token");

// --- reply request ----------------------------------------------------------------------
check(
  "R1 sendOwnerReply POSTs a trimmed {message} with the owner's token and returns the server message",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk(reply());
    const msg = await sendOwnerReply(41, "  Yes, Saturday works.  ");
    const post = sent[0];
    return (
      sent.length === 1 &&
      post.method === "POST" &&
      post.url.endsWith("/owner/leads/41/messages") &&
      JSON.stringify(post.body) === JSON.stringify({ message: "Yes, Saturday works." }) &&
      String(post.headers.Authorization || post.headers.authorization) === "Bearer owner-token" &&
      msg.id === 501 && msg.sender === "OWNER" && msg.body === "Yes, Saturday works." &&
      msg.createdAt === "2030-12-31T04:30:00.000Z" && typeof msg.timestamp === "string" && msg.timestamp.length > 0
    );
  })
);
check(
  "R2 an empty or whitespace reply never reaches the network",
  await attempt(async () => {
    sent.length = 0;
    for (const text of ["", "   ", "\n\t", null, undefined]) {
      try {
        await sendOwnerReply(41, text);
        return false;
      } catch (error) {
        if (error.kind !== "validation") return false;
      }
    }
    return sent.length === 0;
  })
);
check(
  "R3 an over-long reply is rejected before the network, never silently cut",
  await attempt(async () => {
    sent.length = 0;
    try {
      await sendOwnerReply(41, "y".repeat(OWNER_REPLY_MAX_LENGTH + 1));
      return false;
    } catch (error) {
      return error.kind === "validation" && sent.length === 0 && /1–2000/.test(error.message);
    }
  })
);
check(
  "R4 a reply of exactly 2000 characters is sent unchanged",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk(reply({ body: "z".repeat(2000) }));
    await sendOwnerReply(41, "z".repeat(2000));
    return sent.length === 1 && sent[0].body.message.length === 2000;
  })
);

// --- duplicates and the thread ------------------------------------------------------------
const thread = [
  { id: 11, body: "Is it available?", sender: "BUYER", createdAt: "2030-12-30T11:00:00.000Z" },
];
check(
  "R5 mergeLeadMessage appends a new message last and keeps a duplicate (same id) once",
  (() => {
    const once = mergeLeadMessage(thread, { id: 501, body: "Yes", sender: "OWNER" });
    const twice = mergeLeadMessage(once, { id: 501, body: "Yes", sender: "OWNER" });
    return (
      once.length === 2 && once[1].id === 501 && once[0].id === 11 &&
      twice === once && twice.length === 2 &&
      mergeLeadMessage(null, { id: 1 }).length === 1 &&
      mergeLeadMessage(thread, null) === thread
    );
  })()
);
check(
  "R6 a duplicate reply returned as HTTP 200 (same id) appears once in the lead",
  await attempt(async () => {
    let lead = { id: 41, messages: thread, messageCount: 1, lastMessage: "Is it available?" };
    respond = jsonOk(reply(), 201);
    lead = applyOwnerReply(lead, await sendOwnerReply(41, "Yes, Saturday works."));
    respond = jsonOk(reply(), 200); // server: identical reply within its double-tap window
    const after = applyOwnerReply(lead, await sendOwnerReply(41, "Yes, Saturday works."));
    return after === lead && after.messages.filter((m) => m.id === 501).length === 1 && after.messageCount === 2;
  })
);
check(
  "R7 a new reply updates the lead summary (count, latest message and its time)",
  (() => {
    const lead = { id: 41, messages: thread, messageCount: 1, lastMessage: "Is it available?", lastMessageAt: "2030-12-30T11:00:00.000Z" };
    const msg = { id: 501, body: "Yes, Saturday works.", sender: "OWNER", createdAt: "2030-12-31T04:30:00.000Z" };
    const next = applyOwnerReply(lead, msg);
    return (
      next !== lead && lead.messages.length === 1 &&
      next.messages.length === 2 && next.messageCount === 2 &&
      next.lastMessage === "Yes, Saturday works." &&
      next.lastMessageAt === "2030-12-31T04:30:00.000Z" &&
      typeof next.lastMessageAtText === "string" && next.lastMessageAtText.length > 0
    );
  })()
);
check(
  "R8 applyOwnerReply leaves the lead untouched without a lead or a message",
  applyOwnerReply(null, reply()) === null &&
    (() => { const l = { id: 1, messages: [] }; return applyOwnerReply(l, null) === l; })()
);

// --- errors ---------------------------------------------------------------------------
async function errorFor(responder) {
  respond = responder;
  try {
    await sendOwnerReply(41, "hello");
  } catch (error) {
    return error;
  }
  return null;
}
const closed = await errorFor(httpError(422, "Lead is closed"));
const limited = await errorFor(httpError(429, "Too many messages"));
const missing = await errorFor(httpError(404, "Not found"));
const expired = await errorFor(httpError(401, "Invalid token"));
const denied = await errorFor(httpError(403, "OWNER role required"));
const ownEnquiry = await errorFor(httpError(422, "Cannot reply to your own enquiry"));
const generic422 = await errorFor(httpError(422, "Invalid request"));
const offline = await errorFor(() => Promise.reject(new Error("offline test")));
const serverDown = await errorFor(httpError(500, "Internal error"));
check("E1 422 closed lead -> replies are turned off", ownerReplyErrorMessage(closed) === "This lead is closed, so replies are turned off.", closed && closed.status);
check("E2 429 -> wait before sending more", /wait a while before sending more/.test(ownerReplyErrorMessage(limited)), limited && limited.status);
check("E3 404 -> the lead is no longer available", ownerReplyErrorMessage(missing) === "This lead is no longer available.");
check("E4 401 -> sign in again", /sign in again/.test(ownerReplyErrorMessage(expired)));
check("E5 403 -> switch to the owner account", /owner account/.test(ownerReplyErrorMessage(denied)));
check("E6 another 422 shows the server's own static reason", ownerReplyErrorMessage(ownEnquiry) === "Cannot reply to your own enquiry");
check("E7 the generic 422 gets the length rule, not 'Invalid request'", /1–2000/.test(ownerReplyErrorMessage(generic422)));
check("E8 offline shows the client's connection message", offline && offline.status === 0 && ownerReplyErrorMessage(offline) === offline.message);
check("E9 a server error says the reply wasn't sent", /wasn't sent/.test(ownerReplyErrorMessage(serverDown)));
check(
  "E10 no error message ever claims the reply was sent",
  [closed, limited, missing, expired, denied, ownEnquiry, generic422, offline, serverDown, null, {}].every((e) => {
    const text = ownerReplyErrorMessage(e);
    return typeof text === "string" && text.length > 0 &&
      !/(reply|message) (was |has been )?sent\b|was sent|has been sent|success|delivered/i.test(text.replace("wasn't sent", ""));
  })
);
client.setAuthToken(null);

// --- sender labels ----------------------------------------------------------------------
check(
  "L1 owner side: OWNER -> Owner; BUYER, unknown and legacy null -> Buyer",
  leadMessageSenderLabel("OWNER") === "Owner" && leadMessageSenderLabel("owner") === "Owner" &&
    leadMessageSenderLabel("BUYER") === "Buyer" && leadMessageSenderLabel(null) === "Buyer" &&
    leadMessageSenderLabel(undefined) === "Buyer"
);
check(
  "L2 buyer side: BUYER and legacy null -> You; OWNER -> Owner",
  enquirySenderLabel("BUYER") === "You" && enquirySenderLabel(null) === "You" &&
    enquirySenderLabel("OWNER") === "Owner" && enquirySenderLabel("owner") === "Owner"
);
const threadRow = {
  id: 41, property_listing_id: 9, message: "Is it available?", status: "NEW", closing_reason: null,
  created_at: "2030-12-30T11:00:00Z", message_count: 3,
  last_message: "Yes, Saturday works.", last_message_at: "2030-12-31T04:30:00Z",
  listing: { title: "Sea View Apartment", price_paise: 2500000, price_period: "MONTHLY", price_display: "₹25,000/mo", property_type: "APARTMENT", locality: "Besant Nagar", city: "Chennai", cover_image_url: null },
  messages: [
    { id: null, body: "Is it available?", sender: "BUYER", created_at: null },
    { id: 12, body: "Can I visit Saturday?", sender: "BUYER", created_at: "2030-12-30T12:00:00Z" },
    { id: 501, body: "Yes, Saturday works.", sender: "OWNER", created_at: "2030-12-31T04:30:00Z" },
  ],
};
check(
  "L3 buyer thread keeps server order and labels You / You / Owner with timestamps",
  (() => {
    const ui = toUiEnquiry(threadRow);
    return (
      JSON.stringify(ui.messages.map((m) => enquirySenderLabel(m.sender))) === JSON.stringify(["You", "You", "Owner"]) &&
      JSON.stringify(ui.messages.map((m) => m.body)) === JSON.stringify(threadRow.messages.map((m) => m.body)) &&
      ui.messages[0].timestamp === "Date unavailable" && ui.messages[2].timestamp !== "Date unavailable"
    );
  })()
);
check(
  "L4 buyer Messages preview reflects the owner's reply (latest message)",
  toUiEnquiry({ ...threadRow, messages: null }).lastMessage === "Yes, Saturday works."
);
check(
  "L5 owner thread keeps server order and labels Buyer / Buyer / Owner with timestamps",
  (() => {
    const lead = toOwnerLead({ ...threadRow, buyer_user_id: 900, buyer_display_name: null, listing_removed: false });
    return (
      JSON.stringify(lead.messages.map((m) => leadMessageSenderLabel(m.sender))) === JSON.stringify(["Buyer", "Buyer", "Owner"]) &&
      lead.messages[0].timestamp === undefined && typeof lead.messages[2].timestamp === "string"
    );
  })()
);

// --- screen wiring (source text; screens import React and cannot run here) -----------
const handler = (() => {
  const start = detailSrc.indexOf("const handleSendReply = async");
  return start >= 0 ? detailSrc.slice(start, detailSrc.indexOf("\n  };\n", start)) : "";
})();
check("W1 OwnerLeadDetailScreen has a send-reply handler", handler.length > 0);
check(
  "W2 the reply joins the thread only after the server confirms it (no optimistic message)",
  (() => {
    const awaitIdx = handler.indexOf("await sendOwnerReplyApi(lead.id, replyContent)");
    const applyIdx = handler.indexOf("setLead((prev) => applyOwnerReply(prev, sent))");
    const clearIdx = handler.indexOf('setReplyText("")');
    return awaitIdx > 0 && applyIdx > awaitIdx && clearIdx > awaitIdx &&
      handler.indexOf("setLead(") === applyIdx;
  })()
);
check(
  "W3 a failed send keeps the draft and shows the honest error",
  (() => {
    const catchBlock = handler.slice(handler.indexOf("} catch (error) {"), handler.indexOf("} finally {"));
    return catchBlock.includes('Alert.alert("Reply not sent", ownerReplyErrorMessage(error))') &&
      !catchBlock.includes("setReplyText(");
  })()
);
check(
  "W4 sending disables the button and the input; a second tap returns early",
  handler.includes("if (replySending) return;") &&
    detailSrc.includes("disabled={!replyText.trim() || replySending}") &&
    detailSrc.includes("editable={!replySending}") &&
    detailSrc.includes('{replySending ? "Sending…" : "Send Reply"}')
);
check(
  "W5 a closed lead shows no reply box",
  /lead\.status === "closed" \?\s*\(\s*<Text[^>]*>\s*This lead is closed, so replies are turned off\./.test(detailSrc)
);
check(
  "W6 the owner thread labels each message from its server sender",
  detailSrc.includes("{leadMessageSenderLabel(entry.sender)}") && !detailSrc.includes(">Buyer Messages<")
);
check(
  "W7 the reply box reuses the existing note box, input and button styles",
  /style=\{\[styles\.noteInputBox, styles\.replyBox\]\}/.test(detailSrc) &&
    detailSrc.includes("styles.saveNoteBtnDisabled") && detailSrc.includes("<Send size={14}")
);
check(
  "W8 the buyer thread labels messages from the sender, never a hard-coded 'You'",
  savedSrc.includes("{enquirySenderLabel(m.sender)} · {m.timestamp}") && !savedSrc.includes("You · {m.timestamp}")
);
check(
  "W9 the Enquiries list preview uses the thread's latest message",
  enquiriesSrc.includes('lastMessage: e.last_message || e.message || ""')
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall owner-reply checks passed");
