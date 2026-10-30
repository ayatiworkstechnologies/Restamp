// Regression tests for the FE-O owner lead slice (contract §D/§F/§G/§B).
// Run with: node scripts/owner-lead-detail.test.mjs  (plain node, no deps)
// Covers: fetchOwnerLead maps GET /owner/leads/{id} through the same
// toOwnerLead used for list rows (list/detail values identical by
// construction); message threads, last_message facts, and listing
// locality/city map honestly (absent -> undefined/empty, null dates ->
// "Date unavailable"); notes exist only behind GET/POST
// /owner/leads/{id}/notes, the POST body is trimmed, a failure keeps the
// draft in the screen and no device-only note path remains; close sends
// PATCH {status: CLOSED, closing_reason} with exactly the four outcomes,
// the modal cannot double-submit, and no listing endpoint is ever called;
// call_count maps to `calls` (null until the backend sends the counter).
//
// Same tmp-copy harness as owner-lead-dates.test.mjs: src/api/*.js use
// extensionless imports (Metro), so owner.js is copied to tmp with
// extensions fixed; the network is fully stubbed via global.fetch — no
// backend is contacted. React screens import React and cannot run here;
// their wiring is guarded by source-text assertions.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "owner-lead-detail-test-"));
copyFileSync(join(SRC, "api", "client.js"), join(tmp, "client.js"));
copyFileSync(join(SRC, "api", "mappers.js"), join(tmp, "mappers.js"));
writeFileSync(
  join(tmp, "owner.js"),
  readFileSync(join(SRC, "api", "owner.js"), "utf8")
    .replace(/from "\.\/client"/g, 'from "./client.js"')
    .replace(/from "\.\/mappers"/g, 'from "./mappers.js"')
);
const owner = await import(join(tmp, "owner.js"));
const client = await import(join(tmp, "client.js"));
const { toOwnerLead, toOwnerProperty, fetchOwnerLead, fetchAllOwnerLeads, fetchLeadNotes, addLeadNote, updateOwnerLeadStatus, leadDateLabel, LEAD_DATE_UNAVAILABLE } = owner;

const src = (rel) => readFileSync(join(SRC, rel), "utf8");
const detailSrc = src("screens/owner/OwnerLeadDetailScreen.js");
const leadsSrc = src("screens/owner/OwnerLeadsScreen.js");
const propertyLeadsSrc = src("screens/owner/OwnerPropertyLeadsScreen.js");
const ctxSrc = src("context/OwnerContext.js");
const closeModalSrc = src("screens/owner/OwnerCloseLeadModal.js");
const propModalSrc = src("screens/owner/OwnerPropertyDetailModal.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}
function deepEq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
// Runs an async assertion body to completion; any rejection becomes a
// concrete `false` so the honest FAIL line is printed instead of a
// swallowed promise (awaited before `check` sees it — booleans only).
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
let respond = null; // optional () => fake response for the NEXT call
global.fetch = async (url, options = {}) => {
  sent.push({
    url: String(url),
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body ? JSON.parse(options.body) : null,
  });
  return respond
    ? respond()
    : { ok: true, status: 200, json: async () => ({}) };
};
const jsonOk = (data, status = 200) => () => ({ ok: true, status, json: async () => data });

client.setAuthToken("owner-token");

// --- §D: one representative backend row ----------------------------------------------
const listRow = (extra = {}) => ({
  id: 41,
  property_listing_id: 9,
  buyer_user_id: 900,
  buyer_display_name: null,
  listing_removed: false,
  message: "Hi, is this still available?",
  status: "NEW",
  closing_reason: null,
  created_at: "2030-12-30T11:00:00Z",
  listing: {
    title: "Sea View Apartment",
    price_paise: 2500000,
    price_period: "MONTHLY",
    property_type: "APARTMENT",
    locality: "Besant Nagar",
    city: "Chennai",
  },
  last_message: "Still available? I can come this weekend.",
  last_message_at: "2030-12-30T13:10:00Z",
  message_count: 2,
  messages: null,
  ...extra,
});
const detailRow = (extra = {}) =>
  listRow({
    messages: [
      { id: 501, body: "Hi, is this still available?", sender: "BUYER", created_at: "2030-12-30T11:00:00Z" },
      { id: null, body: "Still available? I can come this weekend.", sender: "BUYER", created_at: null },
    ],
    ...extra,
  });

// --- 1. §D: list and detail map identical values -------------------------------------
check(
  "LD1 fetchOwnerLead GETs /owner/leads/{id} and maps through toOwnerLead",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk(detailRow());
    const lead = await fetchOwnerLead(41);
    const get = sent[0];
    return (
      deepEq(lead, toOwnerLead(detailRow())) &&
      get.method === "GET" &&
      get.url.endsWith("/owner/leads/41") &&
      get.headers.Authorization === "Bearer owner-token"
    );
  })
);
check(
  "LD2 the list path pages with the plain contract; screens map its raw rows with the same mapper",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk({ items: [listRow({ messages: null })], page: 1, page_size: 100, total: 1 });
    const { items } = await fetchAllOwnerLeads();
    const url = sent[0].url;
    if (
      !(url.includes("page=1") && url.includes("page_size=100")) ||
      url.includes("property_listing_id=") ||
      sent.length !== 1
    ) {
      return false;
    }
    // The list screen maps each raw server row through the same toOwnerLead
    // the detail endpoint uses, so shared fields are identical by
    // construction; the detail response only adds the full thread.
    const listMapped = toOwnerLead(items[0]);
    sent.length = 0;
    respond = jsonOk(detailRow());
    const detailMapped = await fetchOwnerLead(41);
    return Object.keys(listMapped).every((key) => key === "messages" || deepEq(listMapped[key], detailMapped[key]) || key === "messages");
  })
);
{
  const lead = toOwnerLead(detailRow());
  check("LD3 no invented buyer fields", lead.phone === undefined && lead.email === undefined && lead.avatar === undefined && lead.rating === undefined && lead.budget === undefined && lead.visitData === undefined);
  check("LD4 message_count/last_message only from real fields", lead.messageCount === 2 && lead.lastMessage === "Still available? I can come this weekend.");
  check("LD5 last_message_at explicit UTC + local display (IST)", lead.lastMessageAt === "2030-12-30T13:10:00.000Z" && lead.lastMessageAtText === "30 Dec 2030, 06:40 PM", lead.lastMessageAtText);
  check(
    "LD6 thread maps verbatim: real ids/timestamps; opening legacy message keeps null id/date",
    Array.isArray(lead.messages) &&
      lead.messages.length === 2 &&
      lead.messages[0].id === 501 &&
      lead.messages[0].createdAt === "2030-12-30T11:00:00.000Z" &&
      lead.messages[0].timestamp === "30 Dec 2030, 04:30 PM" &&
      lead.messages[1].id === null &&
      lead.messages[1].createdAt === null &&
      lead.messages[1].body === "Still available? I can come this weekend."
  );
  check("LD7 locality/city are the listing snapshot's real values", lead.propertyLocality === "Besant Nagar" && lead.propertyCity === "Chennai");
  check(
    "LD8 missing message fields (older backend) stay absent, never synthesized",
    (() => {
      const old = toOwnerLead({ id: 7, listing: null });
      return (
        old.messageCount === undefined &&
        old.lastMessage === undefined &&
        old.lastMessageAt === null &&
        old.lastMessageAtText === undefined &&
        old.messages === undefined &&
        old.propertyLocality === "" &&
        old.propertyCity === "" &&
        old.propertyUnavailable === true
      );
    })()
  );
  check("LD9 non-thread rows carry no messages array", toOwnerLead(listRow({ messages: null })).messages === undefined);
  check(
    "LD10 null/absent timestamps keep the honest 'Date unavailable' fallback",
    (() => {
      const noDates = toOwnerLead(listRow({ created_at: null, last_message_at: null }));
      const absent = toOwnerLead(listRow({ last_message: undefined, last_message_at: null }));
      return (
        noDates.createdAt === null &&
        leadDateLabel(noDates) === "Date unavailable" &&
        LEAD_DATE_UNAVAILABLE === "Date unavailable" &&
        noDates.lastMessageAt === null &&
        noDates.lastMessageAtText === undefined &&
        absent.lastMessageAt === null &&
        absent.lastMessageAtText === undefined
      );
    })()
  );
  check(
    "LD11 other zones read the same instants (no hard-coded offsets)",
    (() => {
      process.env.TZ = "America/New_York";
      const lead = toOwnerLead(listRow({ last_message_at: "2030-12-30T11:30:00Z" }));
      process.env.TZ = "Asia/Kolkata";
      return lead.lastMessageAtText === "30 Dec 2030, 06:30 AM";
    })()
  );
}

// --- 2. §F: server-backed internal notes ----------------------------------------------
check(
  "NT1 fetchLeadNotes GETs the notes endpoint and preserves the server's order",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk({
      items: [
        { id: 71, body: "Follow up next week", created_at: "2031-01-02T10:00:00Z" },
        { id: 72, body: "Tenant visit fixed for Friday", created_at: null },
      ],
      total: 2,
    });
    const { items, total } = await fetchLeadNotes(41);
    const get = sent[0];
    return (
      get.method === "GET" &&
      get.url.endsWith("/owner/leads/41/notes") &&
      total === 2 &&
      items.length === 2 &&
      items[0].id === 71 &&
      items[0].text === "Follow up next week" &&
      items[0].createdAt === "2031-01-02T10:00:00.000Z" &&
      items[0].timestamp === "02 Jan 2031, 03:30 PM" &&
      items[1].id === 72 &&
      items[1].text === "Tenant visit fixed for Friday" &&
      items[1].createdAt === null &&
      items[1].timestamp === undefined
    );
  })
);
check(
  "NT2 addLeadNote POSTs a trimmed body",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk({ id: 73, body: "hello", created_at: "2031-01-02T11:00:00Z" });
    const saved = await addLeadNote(41, "  hello  ");
    const post = sent[0];
    return (
      post.method === "POST" &&
      post.url.endsWith("/owner/leads/41/notes") &&
      post.body.body === "hello" &&
      saved.id === 73 &&
      saved.text === "hello" &&
      saved.createdAt === "2031-01-02T11:00:00.000Z"
    );
  })
);
check(
  "NT3 an empty note never reaches the network (validation before POST)",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk({});
    try {
      await addLeadNote(41, "   ");
      return false;
    } catch (error) {
      return error.kind === "validation" && sent.length === 0;
    }
  })
);
check(
  "NT4 an over-long note is capped at the backend's 2000-char limit",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk({ id: 74, body: "x", created_at: null });
    await addLeadNote(41, "y".repeat(2500));
    const post = sent[0];
    return post.body.body.length === 2000;
  })
);
check(
  "NT5 the server's 422 reason surfaces as ApiError.detail",
  await attempt(async () => {
    sent.length = 0;
    respond = () => ({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Note must be between 1 and 2000 characters." }),
    });
    try {
      await addLeadNote(41, "hi");
      return false;
    } catch (error) {
      return error.status === 422 && error.detail === "Note must be between 1 and 2000 characters.";
    }
  })
);
check(
  "NT6 an unreachable backend maps to a recoverable status-0 error",
  await attempt(async () => {
    sent.length = 0;
    respond = () => Promise.reject(new Error("offline test"));
    try {
      await addLeadNote(41, "hi");
      return false;
    } catch (error) {
      return error.status === 0;
    }
  })
);
client.setAuthToken(null);

// --- §F screen wiring: no device-only note path, draft kept on failure ---------------
check(
  "NT7 the device-only note path is gone from OwnerContext",
  !/\baddLeadNote\b/.test(ctxSrc) && !/\binternalNotes\b/.test(ctxSrc) && !/\bcloseLead\b/.test(ctxSrc)
);
{
  const region = detailSrc.match(/const handleAddNote = async \(\) => \{[\s\S]*?\n  \};/);
  const r = region ? region[0] : "";
  const clearedIdx = r.indexOf('setNewNoteText("")');
  const awaitIdx = r.indexOf("await addLeadNoteApi(lead.id, noteContent)");
  const catchIdx = r.indexOf("} catch (error) {");
  check(
    "NT8 the draft is only cleared after the server confirms the note",
    region &&
      awaitIdx > 0 &&
      clearedIdx > awaitIdx &&
      r.split('setNewNoteText("")').length === 2 &&
      catchIdx > clearedIdx,
    { awaitIdx, clearedIdx, catchIdx }
  );
  check(
    "NT9 a failed save never clears the draft and leaves an honest error",
    catchIdx > 0 && r.slice(catchIdx).includes('"Note not saved"') && !r.slice(catchIdx).includes("setNewNoteText")
  );
  check(
    "NT10 saving disables the Submit button + input (no duplicate note)",
    detailSrc.includes("if (noteSaving) return;") &&
      detailSrc.includes("disabled={!newNoteText.trim() || noteSaving}") &&
      detailSrc.includes("editable={!noteSaving}") &&
      detailSrc.includes('{noteSaving ? "Saving…" : "Save Note"}')
  );
  check(
    "NT11 notes load from GET and render only server-confirmed notes",
    detailSrc.includes("fetchLeadNotes(") &&
      detailSrc.includes("addLeadNote as addLeadNoteApi") &&
      detailSrc.includes("{noteItem.text}") &&
      !/\binternalNotes\b/.test(detailSrc)
  );
}

// --- 3. §G: close the lead (server PATCH, four outcomes, no double submit) -----------
check(
  "CL1 close PATCHes CLOSED + closing_reason verbatim for each of the four outcomes",
  await attempt(async () => {
    sent.length = 0;
    const outcomes = ["Rented", "Sold", "Leased", "Not Converted"];
    for (const outcome of outcomes) {
      respond = () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 41, status: "CLOSED", closing_reason: outcome, listing: { title: "T" } }),
      });
      const updated = await updateOwnerLeadStatus(41, { status: "closed", closingReason: outcome });
      const patch = sent[sent.length - 1];
      if (
        patch.method !== "PATCH" ||
        !patch.url.endsWith("/owner/leads/41") ||
        patch.body.status !== "CLOSED" ||
        patch.body.closing_reason !== outcome ||
        // The raw backend-vocabulary row comes back untouched: the screens
        // remap it with toOwnerLead (source-checked below).
        updated.status !== "CLOSED" ||
        updated.closing_reason !== outcome
      ) {
        return false;
      }
    }
    return sent.length === 4;
  })
);
{
  const ids = closeModalSrc.match(/id: "/g) || [];
  const orderOf = (outcome) => closeModalSrc.indexOf(`id: "${outcome}"`);
  check(
    "CL2 exactly the four contract outcomes, in order, nothing else",
    ids.length === 4 &&
      orderOf("Rented") > -1 &&
      orderOf("Rented") < orderOf("Sold") &&
      orderOf("Sold") < orderOf("Leased") &&
      orderOf("Leased") < orderOf("Not Converted"),
    ids
  );
  check(
    "CL3 the confirm button cannot double-submit (saving guard + disabled/loading)",
    closeModalSrc.includes("if (saving) return;") &&
      closeModalSrc.includes("disabled={saving}") &&
      closeModalSrc.includes("loading={saving}")
  );
  check(
    "CL4 the success view is shown only after the server accepted the outcome",
    closeModalSrc.includes("await onCloseLeadWithOutcome(lead.id, selectedOutcome);") &&
      closeModalSrc.indexOf("setIsSuccessView(true)") > closeModalSrc.indexOf("await onCloseLeadWithOutcome") &&
      closeModalSrc.includes("Couldn't close lead")
  );
  check(
    "CL5 closing never touches a listing endpoint from the modal",
    !/archiveListing|publishListing|submitListing|updateOwnerListingStatus|\/owner\/listings/.test(closeModalSrc)
  );
}
{
  const screens = [
    ["Leads", leadsSrc, "await loadLeads();", "handleCloseOutcome(leadId, outcome)"],
    ["PropertyLeads", propertyLeadsSrc, "await loadLeads();", "handleCloseOutcome(leadId, outcome)"],
    ["LeadDetail", detailSrc, "await loadLead();", "handleCloseOutcome(outcome)"],
  ];
  for (const [label, s, refetch, handler] of screens) {
    check(
      `${label} closes through the server PATCH and refetches server values (§G)`,
      s.includes("handleCloseOutcome") &&
        s.includes('status: "closed"') &&
        s.includes("closingReason: outcome") &&
        s.includes(handler) &&
        s.includes(refetch)
    );
  }
  check(
    "CL6 a failed close propagates to the modal (no false success) after a refreshing refetch",
    leadsSrc.includes("throw error;") && propertyLeadsSrc.includes("throw error;")
  );
  check(
    "CL6b every screen renders the PATCH response's server-confirmed row",
    [leadsSrc, propertyLeadsSrc, detailSrc].every((s) => s.includes("const mapped = toOwnerLead(updated);"))
  );
  check(
    "CL7 no owner lead screen ever calls a listing-management endpoint",
    [leadsSrc, propertyLeadsSrc, detailSrc].every(
      (s) => !/archiveListing|publishListing|submitListing|updateOwnerListingStatus|verifyOwnerListing|rejectOwnerListing/.test(s)
    )
  );
}

// --- 4. §B: Call-button counts --------------------------------------------------------
{
  const listing = { listing_id: 9, title: "Sea View", price_paise: 100, price_period: "TOTAL", enquiry_count: 2, visit_count: 1 };
  check("BC1 call_count maps to calls", toOwnerProperty({ ...listing, call_count: 5 }).calls === 5);
  check("BC2 without the counter calls is null (and a real zero is a real zero)", toOwnerProperty(listing).calls === null && toOwnerProperty({ ...listing, call_count: 0 }).calls === 0);
  check(
    "BC3 the detail modal shows Calls only in the existing stats strip, gated on real data",
    propModalSrc.includes("property.calls != null") &&
      propModalSrc.includes("formatCount(property.calls)") &&
      propModalSrc.includes(">Calls<")
  );
}

// --- 5. Detail/list honest loading and error states ----------------------------------
check(
  "S1 the detail screen reloads the lead from the server on focus (params are only the initial snapshot)",
  detailSrc.includes("const initialLead = route?.params?.lead ?? null;") &&
    detailSrc.includes("fetchOwnerLead(leadId)") &&
    detailSrc.includes("leadReqId.current !== myReq") &&
    detailSrc.includes("loadLead();") &&
    detailSrc.includes("loadLeadNotes();")
);
check(
  "S2 stale responses are ignored (request-ID guard) and the lead error row offers a Retry",
  detailSrc.includes("setLeadFetching(true)") &&
    detailSrc.includes("setLeadError(true)") &&
    detailSrc.includes("Couldn't refresh lead details.") &&
    detailSrc.includes("onPress={loadLead}")
);
check(
  "S3 the thread renders from real data with an honest empty state (no fabricated quotes)",
  detailSrc.includes("{lead.messages.map((entry, idx) => (") &&
    detailSrc.includes("{entry.body}") &&
    !detailSrc.includes("lead.lastMessage") // detail never summarizes; it shows the full thread
);
check(
  "S4 list cards show the thread summary with the honest date fallback (§D identical values)",
  leadsSrc.includes('{lead.lastMessage || lead.message || "No message provided."}') &&
    leadsSrc.includes('lead.lastMessageAtText || "Date unavailable"') &&
    leadsSrc.includes('{lead.messageCount === 1 ? "message" : "messages"}')
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall owner-lead-detail checks passed");
