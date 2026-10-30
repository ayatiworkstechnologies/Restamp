// Regression tests for the shared visit helpers (CONTRACT.md §C/§E, P0).
// Run with: node scripts/visit-status.test.mjs  (plain node, no deps)
// Covers: src/utils/visitStatus.js labels/colors for every status and viewer,
// the "Rescheduled" display rule; src/api/visits.js names (chosen names only,
// never phone-shaped), locality/type, rescheduled_at as UTC, PATCH `note`
// handling, and toScheduleModalInitial; source wiring of StatusBadge and
// ScheduleVisitModal (React components cannot run in this harness).
//
// Deterministic time zone (Asia/Kolkata); network stubbed via global.fetch.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "visit-status-test-"));
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

const client = await import(join(tmp, "api", "client.js"));
const buyerMode = await import(join(tmp, "api", "buyerMode.js"));
const visits = await import(join(tmp, "api", "visits.js"));
const status = await import(join(tmp, "utils", "visitStatus.js"));
const COLORS = (await import(join(tmp, "constants", "colors.js"))).default;
const badgeSrc = readFileSync(join(SRC, "features", "owner", "components", "StatusBadge.js"), "utf8");
const modalSrc = readFileSync(join(SRC, "features", "buyer", "components", "ScheduleVisitModal.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const { getVisitDisplay, isVisitRescheduled, VISIT_TONES } = status;

// --- 1. Display state and colors (contract §C table) -------------------------------
{
  const expect = {
    REQUESTED: ["requested", "orange"],
    PROPOSED: ["proposed", "orange"],
    CONFIRMED: ["confirmed", "green"],
    DECLINED: ["declined", "red"],
    CANCELLED: ["cancelled", "grey"],
    COMPLETED: ["completed", "blue"],
  };
  for (const [s, [key, tone]] of Object.entries(expect)) {
    const d = getVisitDisplay({ serverStatus: s }, "owner");
    check(`S1 ${s} -> ${key} / ${tone}`, d.key === key && d.tone === tone && d.serverStatus === s, d);
  }
  check("S2 confirmed is green (COLORS.success)", getVisitDisplay({ serverStatus: "CONFIRMED" }).color === COLORS.success);
  check("S3 declined is red, cancelled grey: distinguishable", getVisitDisplay({ serverStatus: "DECLINED" }).color === COLORS.danger && getVisitDisplay({ serverStatus: "CANCELLED" }).color === COLORS.muted);
  check("S4 completed is blue, not green", getVisitDisplay({ serverStatus: "COMPLETED" }).color === COLORS.info);
  check("S5 every tone has text + background colors", Object.values(VISIT_TONES).every((t) => /^#/.test(t.color) && /^#/.test(t.background)));
  check(
    "S6 viewer wording for PROPOSED/REQUESTED",
    getVisitDisplay({ serverStatus: "PROPOSED" }, "buyer").label === "Awaiting your reply" &&
      getVisitDisplay({ serverStatus: "PROPOSED" }, "owner").label === "Proposed" &&
      getVisitDisplay({ serverStatus: "REQUESTED" }, "owner").label === "Requested by buyer" &&
      getVisitDisplay({ serverStatus: "REQUESTED" }, "buyer").label === "Requested"
  );
  check("S7 raw VisitOut shape accepted (status/rescheduled_at)", getVisitDisplay({ status: "confirmed" }).key === "confirmed");
  const unknown = getVisitDisplay({ serverStatus: "WEIRD" });
  check("S8 unknown/missing status -> honest grey 'Status unavailable'", unknown.key === "unknown" && unknown.label === "Status unavailable" && getVisitDisplay(null).key === "unknown");
}

// --- 2. Rescheduled display rule ---------------------------------------------------
{
  const at = "2030-12-30T11:00:00Z";
  for (const s of ["REQUESTED", "PROPOSED", "CONFIRMED"]) {
    const d = getVisitDisplay({ serverStatus: s, rescheduledAt: at }, "buyer");
    check(`R1 open ${s} + rescheduled_at -> Rescheduled (purple), server status kept`, d.key === "rescheduled" && d.tone === "purple" && d.label === "Rescheduled" && d.serverStatus === s && d.isRescheduled);
  }
  for (const s of ["DECLINED", "CANCELLED", "COMPLETED"]) {
    check(`R2 closed ${s} never shows Rescheduled`, getVisitDisplay({ serverStatus: s, rescheduledAt: at }).key === s.toLowerCase() && !isVisitRescheduled({ serverStatus: s, rescheduledAt: at }));
  }
  check("R3 no rescheduled_at -> plain status", getVisitDisplay({ serverStatus: "CONFIRMED", rescheduledAt: null }).key === "confirmed");
  check("R4 raw rescheduled_at field also works", getVisitDisplay({ status: "CONFIRMED", rescheduled_at: at }).key === "rescheduled");
}

// --- 3. toUiVisit: names, location, rescheduled_at ---------------------------------
{
  const base = { id: 7, property_listing_id: 3, buyer_user_id: 29, owner_user_id: 4, status: "CONFIRMED", initiator: "BUYER", scheduled_at: "2030-12-30T11:00:00", note: "Gate 2", listing: { title: "Sea View", price_paise: 100, price_period: "TOTAL", locality: "Besant Nagar", city: "Chennai", property_type: "APARTMENT" } };
  const named = visits.toUiVisit({ ...base, buyer_display_name: "Priya Raman", owner_display_name: "Kumar", rescheduled_at: "2030-12-29T08:00:00Z" });
  check("N1 chosen names shown", named.buyerName === "Priya Raman" && named.buyerLabel === "Priya Raman" && named.ownerLabel === "Kumar");
  const anon = visits.toUiVisit(base);
  check("N2 missing names -> 'Buyer #29' / 'Owner' (never invented)", anon.buyerName === null && anon.buyerLabel === "Buyer #29" && anon.ownerName === null && anon.ownerLabel === "Owner");
  const phoneish = visits.toUiVisit({ ...base, buyer_display_name: "+91 98765 43210", owner_display_name: "9876543210" });
  check("N3 phone-shaped names are never rendered", phoneish.buyerName === null && phoneish.buyerLabel === "Buyer #29" && phoneish.ownerLabel === "Owner");
  check("N4 locality/city/type mapped", named.propertyLocality === "Besant Nagar" && named.propertyCity === "Chennai" && named.propertyType === "APARTMENT");
  check("N5 rescheduledAt is explicit UTC", named.rescheduledAt === "2030-12-29T08:00:00.000Z" && anon.rescheduledAt === null);
  check("N6 scheduled time still read as UTC (4:30 PM Chennai)", named.time === "04:30 PM" && named.date === "30 Dec 2030");
  check("N7 display works on a toUiVisit row", getVisitDisplay(named, "owner").key === "rescheduled" && getVisitDisplay(anon, "owner").key === "confirmed");
  check("N8 old backend without new fields keeps working", visits.toUiVisit({ id: 1, status: "REQUESTED", scheduled_at: null, listing: {} }).propertyLocality === "");

  // --- 4. toScheduleModalInitial: reschedule starts from the agreed visit ----------
  const init = visits.toScheduleModalInitial(named);
  check("M1 initial date is the visit instant", init.initialDate instanceof Date && init.initialDate.toISOString() === "2030-12-30T11:00:00.000Z");
  check("M2 initial time in the modal's slot format", init.initialTime === "04:30 pm", init.initialTime);
  check("M3 existing note pre-filled", init.initialNote === "Gate 2");
  const round = visits.toVisitPayload({ date: named.date, time: init.initialTime });
  check("M4 confirming unchanged values keeps the same UTC instant", round.scheduled_at === "2030-12-30T11:00:00.000Z", round);
  const empty = visits.toScheduleModalInitial({ scheduledAt: null, note: null });
  check("M5 no visit time -> modal defaults kept", empty.initialDate === undefined && empty.initialTime === undefined && empty.initialNote === "");
}

// --- 5. PATCH bodies: note only when given -------------------------------------------
{
  const sent = [];
  global.fetch = async (url, opts = {}) => {
    sent.push({ url, body: opts.body ? JSON.parse(opts.body) : null });
    return { ok: true, status: 200, json: async () => ({ id: 7 }) };
  };
  client.setAuthToken("test-token");
  buyerMode.noteServerRole("BUYER");
  await visits.updateOwnerVisit(7, { status: "CONFIRMED" });
  check("P1 status-only PATCH never touches the note", JSON.stringify(sent.at(-1).body) === '{"status":"CONFIRMED"}', sent.at(-1));
  await visits.updateOwnerVisit(7, { scheduledAtISO: "2030-12-31T05:00:00.000Z", note: "Bring documents" });
  check("P2 reschedule + note", sent.at(-1).url.endsWith("/owner/visits/7") && sent.at(-1).body.scheduled_at === "2030-12-31T05:00:00.000Z" && sent.at(-1).body.note === "Bring documents");
  await visits.updateOwnerVisit(7, { note: "" });
  check("P3 empty string clears the note", sent.at(-1).body.note === "");
  await visits.updateBuyerVisit(8, { scheduledAtISO: "2030-12-31T05:00:00.000Z", note: "x".repeat(2100) });
  check("P4 buyer PATCH carries note, capped at 2000", sent.at(-1).url.endsWith("/buyer/visits/8") && sent.at(-1).body.note.length === 2000);
  client.setAuthToken(null);
}

// --- 6. Component wiring (source text) ---------------------------------------------
check("C1 StatusBadge takes visit colors from visitStatus.js", badgeSrc.includes('visitStatus') && badgeSrc.includes("VISIT_TONE_BY_KEY[normalized]"));
check(
  "C2 no duplicate hard-coded visit cases left in StatusBadge",
  !/case "(requested|proposed|confirmed|completed|declined|cancelled)"/.test(badgeSrc)
);
check("C3 non-visit badge cases untouched", ['case "active"', 'case "pending"', 'case "new"', 'case "contacted"', 'case "rented"'].every((c) => badgeSrc.includes(c)));
check("C4 StatusBadge supports a viewer-specific label", badgeSrc.includes("label: labelOverride") && badgeSrc.includes("labelOverride ? String(labelOverride).toUpperCase() : label"));
check("C5 ScheduleVisitModal accepts initialNote", modalSrc.includes('initialNote = "",') && modalSrc.includes('typeof initialNote === "string" ? initialNote : ""'));
check("C6 the shared-visibility hint is shown", modalSrc.includes("Visible to both the buyer and the owner."));
check("C7 onConfirm still returns the trimmed notes", modalSrc.includes("notes: visitNotes.trim(),"));

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall visit-status checks passed");
