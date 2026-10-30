// Regression tests for the FE-O owner-side visit slice (contract §C/§E).
// Run with: node scripts/owner-visits-owner.test.mjs  (plain node, no deps)
// Covers: buyer names come only from chosen display names — a phone-shaped
// value is never rendered ("Buyer #<id>" fallback); visit labels/colors come
// from src/utils/visitStatus.js (incl. "Rescheduled") and no owner screen
// renders the raw server status; rescheduling PATCHes explicit UTC
// scheduled_at and carries `note` ONLY when the owner edited it (an emptied
// note clears it; a pure time change never rewrites it); ScheduleVisitModal
// is opened with toScheduleModalInitial on every reschedule path; the
// server's 422 static text surfaces on failure; every change refetches.
//
// Same tmp-copy harness as visit-status.test.mjs: src/api/*.js use
// extensionless imports (Metro), so they are copied to tmp with extensions
// fixed; the network is fully stubbed via global.fetch — no backend is
// contacted. React screens import React and cannot run here; their wiring
// is guarded by source-text assertions.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "owner-visits-test-"));
for (const d of ["api", "utils", "constants"]) mkdirSync(join(tmp, d));
copyFileSync(join(SRC, "shared", "api", "client.js"), join(tmp, "api", "client.js"));
copyFileSync(join(SRC, "features", "buyer", "api", "buyerMode.js"), join(tmp, "api", "buyerMode.js"));
copyFileSync(join(SRC, "features", "buyer", "api", "buyerModeCore.js"), join(tmp, "api", "buyerModeCore.js"));
writeFileSync(
  join(tmp, "api", "buyerMode.js"),
  readFileSync(join(tmp, "api", "buyerMode.js"), "utf8")
    .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
    .replace(/from "[^"]*buyerModeCore(\.js)?"/g, 'from "./buyerModeCore.js"')
);
writeFileSync(
  join(tmp, "api", "visits.js"),
  readFileSync(join(SRC, "shared", "api", "visits.js"), "utf8")
    .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
    .replace(/from "[^"]*buyerMode(\.js)?"/g, 'from "./buyerMode.js"')
    .replace(/from "[^"]*buyerModeCore(\.js)?"/g, 'from "./buyerModeCore.js"')
);
writeFileSync(
  join(tmp, "utils", "visitStatus.js"),
  readFileSync(join(SRC, "shared", "utils", "visitStatus.js"), "utf8")
    .replace(/from "[^"]*colors(\.js)?"/g, 'from "../constants/colors.js"')
);
copyFileSync(join(SRC, "shared", "constants", "colors.js"), join(tmp, "constants", "colors.js"));
writeFileSync(
  join(tmp, "utils", "ownerVisits.js"),
  readFileSync(join(SRC, "features", "owner", "utils", "ownerVisits.js"), "utf8")
    .replace(/from "[^"]*visits(\.js)?"/g, 'from "../api/visits.js"')
);

const client = await import(join(tmp, "api", "client.js"));
const buyerMode = await import(join(tmp, "api", "buyerMode.js"));
const visits = await import(join(tmp, "api", "visits.js"));
const ownerVisitUtils = await import(join(tmp, "utils", "ownerVisits.js"));

const src = (rel) => readFileSync(join(SRC, rel), "utf8");
const visitsScreenSrc = src("features/owner/screens/OwnerVisitsScreen.js");
const leadDetailSrc = src("features/owner/screens/OwnerLeadDetailScreen.js");
const leadsScreenSrc = src("features/owner/screens/OwnerLeadsScreen.js");
const propertyLeadsSrc = src("features/owner/screens/OwnerPropertyLeadsScreen.js");
const ownerSiteVisitModalSrc = src("features/owner/screens/OwnerSiteVisitModal.js");
const scheduleModalSrc = src("features/buyer/components/ScheduleVisitModal.js");

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
async function attempt(body) {
  try {
    return !!(await body());
  } catch (error) {
    console.log("    (threw: " + (error && error.message) + ")");
    return false;
  }
}

// --- fetch stub ------------------------------------------------------------------------
const sent = [];
let respond = null;
global.fetch = async (url, options = {}) => {
  sent.push({ url: String(url), method: options.method || "GET", body: options.body ? JSON.parse(options.body) : null });
  return respond ? respond() : { ok: true, status: 200, json: async () => ({}) };
};

client.setAuthToken("owner-token");
const jsonOk = (data, status = 200) => () => ({ ok: true, status, json: async () => data });

// --- §C: one representative VisitOut ----------------------------------------------------
const row = (extra = {}) => ({
  id: 7,
  property_listing_id: 3,
  buyer_user_id: 29,
  owner_user_id: 4,
  status: "CONFIRMED",
  initiator: "BUYER",
  scheduled_at: "2030-12-30T11:00:00",
  note: "Gate 2",
  listing: { title: "Sea View", price_paise: 100, price_period: "TOTAL", locality: "Besant Nagar", city: "Chennai", property_type: "APARTMENT" },
  ...extra,
});

// --- 1. Buyer names: chosen names only, never a phone ----------------------------------
{
  const named = visits.toUiVisit(row({ buyer_display_name: "Priya Raman" }));
  check("V1 chosen buyer name shown", named.buyerName === "Priya Raman" && named.buyerLabel === "Priya Raman");
  const anon = visits.toUiVisit(row());
  check("V2 no chosen name -> honest 'Buyer #<id>' fallback", anon.buyerName === null && anon.buyerLabel === "Buyer #29" && anon.ownerLabel === "Owner");
  const phoneish = visits.toUiVisit(row({ buyer_display_name: "+91 98765 43210" }));
  check("V3 phone-shaped names never render", phoneish.buyerName === null && phoneish.buyerLabel === "Buyer #29");
  check(
    "V4 the visits screen renders buyerLabel (never fabricates a name or phone)",
    visitsScreenSrc.includes("{visit.buyerLabel || \"Buyer\"}") &&
      visitsScreenSrc.includes("visit.note ?")
  );
  check(
    "V5 no owner screen builds a fallback Buyer label itself",
    [visitsScreenSrc, leadDetailSrc, leadsScreenSrc, propertyLeadsSrc].every((s) => !s.includes("Buyer #${"))
  );
}

// --- 2. Status labels from visitStatus.js (incl. Rescheduled) ---------------------------
{
  const requestedByBuyer = visits.toUiVisit(row({ status: "REQUESTED" }));
  const { getVisitDisplay: d } = await import(join(tmp, "utils", "visitStatus.js"));
  check("V6 labels come from visitStatus.js for every open state", d(requestedByBuyer, "owner").label === "Requested by buyer" && d(visits.toUiVisit(row()), "owner").label === "Confirmed");
  const moved = visits.toUiVisit(row({ rescheduled_at: "2030-12-29T08:00:00Z" }));
  check("V7 open visit + rescheduled_at -> 'Rescheduled', server status preserved", d(moved, "owner").key === "rescheduled" && d(moved, "owner").label === "Rescheduled" && d(moved, "owner").serverStatus === "CONFIRMED");
  check("V8 declined is not 'Rescheduled'", d(visits.toUiVisit(row({ status: "DECLINED", rescheduled_at: "2030-12-29T08:00:00Z" })), "owner").key === "declined");
  check(
    "V9 the visits screen uses getVisitDisplay for badge key + label and never the raw status",
    visitsScreenSrc.includes("getVisitDisplay(visit, \"owner\")") &&
      visitsScreenSrc.includes("<StatusBadge status={visitDisplay.key} label={visitDisplay.label} />") &&
      !visitsScreenSrc.includes("<StatusBadge status={visit.serverStatus}") &&
      !visitsScreenSrc.includes("{visit.serverStatus}")
  );
  check(
    "V10 lead screens word their visit tags through the display label too",
    leadsScreenSrc.includes("getVisitDisplay(leadVisit, \"owner\")") &&
      leadsScreenSrc.includes("{leadVisitDisplay.label}: {leadVisit.date || \"Date unavailable\"}, {leadVisit.time || \"Time unavailable\"}") &&
      propertyLeadsSrc.includes("getVisitDisplay(leadVisit, \"owner\")") &&
      propertyLeadsSrc.includes("{leadVisitDisplay.label}: {leadVisit.date || \"Date unavailable\"}, {leadVisit.time || \"Time unavailable\"}")
  );
  check(
    "V11 the lead detail badge uses the shared display state",
    leadDetailSrc.includes("getVisitDisplay(ownerVisit, \"owner\")") &&
      leadDetailSrc.includes("<StatusBadge\n                      status={visitDisplay.key}\n                      label={visitDisplay.label}\n                    />") &&
      !leadDetailSrc.includes("VISIT {ownerVisit.serverStatus")
  );
}

// --- 3. Reschedule: explicit UTC + note only when edited --------------------------------
check(
  "R1 a reschedule sends an explicit-UTC scheduled_at",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk();
    await visits.updateOwnerVisit(7, { scheduledAtISO: "2030-12-31T05:00:00.000Z" });
    const patch = sent[sent.length - 1];
    return (patch.method === "PATCH" &&
      patch.url.endsWith("/owner/visits/7") &&
      patch.body.scheduled_at === "2030-12-31T05:00:00.000Z" &&
      patch.body.note === undefined);
  })
);
check(
  "R2 an edited note rides along with the new time",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk();
    await visits.updateOwnerVisit(7, { scheduledAtISO: "2030-12-31T05:00:00.000Z", note: "Bring documents" });
    return sent[sent.length - 1].body.note === "Bring documents";
  })
);
check(
  "R3 an emptied note is PATCHed as an empty string (server clears it)",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk();
    await visits.updateOwnerVisit(7, { scheduledAtISO: "2030-12-31T05:00:00.000Z", note: "" });
    const patch = sent[sent.length - 1];
    return patch.body.scheduled_at === "2030-12-31T05:00:00.000Z" && patch.body.note === "";
  })
);
check(
  "R4 a status-only PATCH never touches the note",
  await attempt(async () => {
    sent.length = 0;
    respond = jsonOk();
    await visits.updateOwnerVisit(7, { status: "CONFIRMED" });
    return deepEq(sent[sent.length - 1].body, { status: "CONFIRMED" });
  })
);
{
  const picker = (await import(join(tmp, "api", "visits.js"))).toVisitPayload;
  check(
    "R5 the modal's chosen slot converts to the same UTC instant (round-trip)",
    (() => {
      const chosen = picker({ date: "30 Dec 2030", time: "04:30 pm" }).scheduled_at;
      return chosen === "2030-12-30T11:00:00.000Z";
    })()
  );
  check(
    "R6 every owner reschedule path compares notes and sends the field only when edited",
    visitsScreenSrc.includes("String(data?.note ?? \"\") !== String(visit.note ?? \"\")") &&
      visitsScreenSrc.includes("...(noteChanged ? { note: data?.note ?? \"\" } : {})") &&
      leadDetailSrc.includes("String(visitData?.note ?? \"\") !== String(ownerVisit.note ?? \"\")") &&
      leadDetailSrc.includes("...(noteChanged ? { note: visitData?.note ?? \"\" } : {})") &&
      leadsScreenSrc.includes("String(visitData?.note ?? \"\") !== String(existingVisit.note ?? \"\")") &&
      leadsScreenSrc.includes("...(noteChanged ? { note: visitData?.note ?? \"\" } : {})") &&
      propertyLeadsSrc.includes("String(visitDetails?.note ?? \"\") !== String(existingVisit.note ?? \"\")") &&
      propertyLeadsSrc.includes("...(noteChanged ? { note: visitDetails?.note ?? \"\" } : {})")
  );
  check(
    "R7 every owner reschedule path converts the picked slot through toVisitPayload (explicit UTC)",
    visitsScreenSrc.includes("toVisitPayload({ date: data?.date || data?.fullDate, time: data?.time }).scheduled_at") &&
      leadDetailSrc.includes("toVisitPayload({\n            date: visitData?.date || visitData?.fullDate,") &&
      leadsScreenSrc.includes("toVisitPayload({") &&
      propertyLeadsSrc.includes("toVisitPayload({")
  );
}

// --- 4. ScheduleVisitModal opens pre-filled on every reschedule path -------------------
{
  const withTime = visits.toScheduleModalInitial(visits.toUiVisit(row()));
  check("M1 initial values come from the visit itself", withTime.initialDate instanceof Date && withTime.initialDate.toISOString() === "2030-12-30T11:00:00.000Z" && withTime.initialTime === "04:30 pm" && withTime.initialNote === "Gate 2");
  check(
    "M2 the visits screen spreads toScheduleModalInitial (no hard-coded defaults left)",
    visitsScreenSrc.includes("{...toScheduleModalInitial(rescheduleVisit || {})}") &&
      !visitsScreenSrc.includes("initialTime={rescheduleVisit?.time || \"10:00 am\"}") &&
      !visitsScreenSrc.includes("new Date(rescheduleVisit.scheduledAt)")
  );
  check(
    "M3 the owner modal wrapper accepts a visit and feeds the shared initial values",
    ownerSiteVisitModalSrc.includes("visit = null,") &&
      ownerSiteVisitModalSrc.includes("const initial = visit ? toScheduleModalInitial(visit) : {};") &&
      ownerSiteVisitModalSrc.includes("initialDate={initial.initialDate}") &&
      ownerSiteVisitModalSrc.includes("initialTime={initial.initialTime}") &&
      ownerSiteVisitModalSrc.includes("initialNote={initial.initialNote}")
  );
  check(
    "M4 the wrapper only feeds the shared note field and a real locale",
    ownerSiteVisitModalSrc.includes("note: notes,") &&
      ownerSiteVisitModalSrc.includes("location: lead.propertyLocality || \"\"") &&
      !ownerSiteVisitModalSrc.includes("preferredLocality")
  );
  check(
    "M5 every open of the wrapper passes the buyer's own visit (reschedule prefill)",
    leadDetailSrc.includes("visit={ownerVisitIsOpen ? ownerVisit : null}") &&
      /visit=\{\n\s*activeVisitByBuyer\.get\(Number\(selectedLeadForVisit\.buyer_user_id\)\) \|\| null\n\s*\}/.test(leadsScreenSrc) &&
      /visit=\{\n\s*activeVisitByBuyer\.get\(Number\(selectedLeadForVisit\.buyer_user_id\)\) \|\| null\n\s*\}/.test(propertyLeadsSrc)
  );
  check(
    "M6 reschedule modals remount per visit so stale pre-fill cannot leak",
    ownerSiteVisitModalSrc.includes("lead={lead}") && visitsScreenSrc.includes("key={rescheduleVisit ? `visit-${rescheduleVisit.id}-${rescheduleVisit.scheduledAt}` : \"none\"}") &&
      leadDetailSrc.includes("key={ownerVisit && ownerVisitIsOpen ? `visit-${ownerVisit.id}-${ownerVisit.scheduledAt}` : \"new\"}")
  );
  check(
    "M7 the visit row's own note is what the screens compare against",
    visits.toUiVisit(row()).note === "Gate 2" && visits.toUiVisit(row({ note: null })).note === ""
  );
}

// --- 5. Honest failure copy: the server's 422 text surfaces ----------------------------
{
  const err = (payload) => {
    const e = new Error("Request failed.");
    e.status = payload.status;
    e.detail = payload.detail;
    return e;
  };
  check(
    "E1 a 422's static server text is shown verbatim",
    (() => {
      const copy = ownerVisitUtils.ownerVisitErrorMessage(err({ status: 422, detail: "Only buyer may reschedule a REQUESTED visit" }), "reschedule");
      return copy.title === "Couldn't reschedule visit" && copy.message === "Only buyer may reschedule a REQUESTED visit";
    })()
  );
  check("E2 a 422 without a detail keeps an honest generic fallback", ownerVisitUtils.ownerVisitErrorMessage(err({ status: 422 }), "reschedule").message === "This visit may have changed. Refresh and try again.");
  check(
    "E3 403/401/404 keep their dedicated copy",
    ownerVisitUtils.ownerVisitErrorMessage(err({ status: 403 })).title === "Owner Mode Required" &&
      ownerVisitUtils.ownerVisitErrorMessage(err({ status: 401 })).title === "Session Expired" &&
      ownerVisitUtils.ownerVisitErrorMessage(err({ status: 404 }), "confirm").message === "The visit or listing could not be found."
  );
  check(
    "E4 every visit-changing owner path shows the served copy through ownerVisitErrorMessage",
    visitsScreenSrc.includes("const copy = ownerVisitErrorMessage(error, action);") &&
      visitsScreenSrc.includes("const copy = ownerVisitErrorMessage(error, \"reschedule\");") &&
      leadDetailSrc.includes("const copy = ownerVisitErrorMessage(error, ownerVisitIsOpen ? \"reschedule\" : \"propose\");") &&
      leadsScreenSrc.includes("const copy = ownerVisitErrorMessage(error, existingVisit ? \"reschedule\" : \"propose\");") &&
      propertyLeadsSrc.includes("const copy = ownerVisitErrorMessage(error, existingVisit ? \"reschedule\" : \"propose\");") &&
      [visitsScreenSrc, leadDetailSrc, leadsScreenSrc, propertyLeadsSrc].every((s) => s.includes("Alert.alert(copy.title, copy.message);"))
  );
}

// --- 6. Refetch + card facts ------------------------------------------------------------
check(
  "F1 every visit mutation on the visits screen refetches the server list",
  visitsScreenSrc.includes("await loadVisits();") &&
    (visitsScreenSrc.match(/await loadVisits\(\);/g) || []).length >= 2 &&
    visitsScreenSrc.includes("onRefresh={() => loadVisits(true)}")
);
check(
  "F2 the lead screens refetch their visit state after a change",
  leadDetailSrc.includes("await loadOwnerVisit();") &&
    leadsScreenSrc.includes("loadOwnerVisits();") &&
    propertyLeadsSrc.includes("loadOwnerVisits();")
);
check(
  "F3 visit cards carry the property's real title + locality/city and the shared note block",
  visitsScreenSrc.includes("{visit.propertyTitle || \"Property visit\"}") &&
    visitsScreenSrc.includes("[visit.propertyLocality, visit.propertyCity]") &&
    visitsScreenSrc.includes('<Text style={styles.noteLabel}>Notes for Visit</Text>') &&
    visitsScreenSrc.includes("{visit.note}</Text>")
);
check(
  "F4 actions follow the server status, never a display label",
  visitsScreenSrc.includes("const actions = ownerVisitActions(visit.serverStatus);") &&
    visitsScreenSrc.includes('confirmStatus(visit, "CONFIRMED", "confirm")') &&
    visitsScreenSrc.includes('confirmStatus(visit, "COMPLETED", "complete")') &&
    visitsScreenSrc.includes('confirmStatus(visit, "DECLINED", "decline")') &&
    visitsScreenSrc.includes('confirmStatus(visit, "CANCELLED", "cancel")') &&
    visitsScreenSrc.includes('await updateOwnerVisit(visit.id, { status });')
);
check(
  "F5 one action at a time (busy guard blocks a second concurrent PATCH)",
  visitsScreenSrc.includes("if (typeof visit?.id !== \"number\" || busyVisitId !== null) return;") &&
    visitsScreenSrc.includes("disabled={busyVisitId !== null}")
);
check(
  "F6 proposals go through toVisitPayload's rules via the shared helper",
  leadDetailSrc.includes("await proposeVisitForLead(lead, visitData);") &&
    leadsScreenSrc.includes("await proposeVisitForLead(lead, visitData);") &&
    propertyLeadsSrc.includes("await proposeVisitForLead(lead, visitDetails);")
);
check(
  "F7 the shared modal keeps its own honest defaults for fresh proposals",
  scheduleModalSrc.includes('initialNote = "",') && scheduleModalSrc.includes("notes: visitNotes.trim(),")
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall owner-visits-owner checks passed");
