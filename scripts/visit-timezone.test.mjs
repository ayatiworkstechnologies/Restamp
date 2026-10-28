// Regression tests for the visit-time contract: UTC everywhere.
// Run with: node scripts/visit-timezone.test.mjs  (plain node, no deps)
// The backend stores visit times as naive UTC and returns them without a
// zone designator ("2030-12-30T11:00:00"). These checks pin that the app
// reads such values as UTC, never double-shifts "Z"/offset values, sends
// explicit UTC instants, and displays the instant in the user's own zone.
//
// Deterministic: the time zone is set here (Asia/Kolkata, then
// America/New_York) instead of depending on the developer machine. Same
// tmp-copy harness as the other script tests; no network.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src", "api");
const tmp = mkdtempSync(join(tmpdir(), "visit-timezone-test-"));
for (const f of ["client.js", "buyerModeCore.js"]) copyFileSync(join(SRC, f), join(tmp, f));
for (const f of ["visits.js", "buyerMode.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(SRC, f), "utf8")
      .replace(/from "\.\/client"/g, 'from "./client.js"')
      .replace(/from "\.\/buyerModeCore"/g, 'from "./buyerModeCore.js"')
      .replace(/from "\.\/buyerMode"/g, 'from "./buyerMode.js"')
  );
}
const { parseApiDateTime, toUiVisit, toVisitPayload } = await import(join(tmp, "visits.js"));
const visitsSrc = readFileSync(join(SRC, "visits.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const INSTANT = Date.UTC(2030, 11, 30, 11, 0, 0); // 30 Dec 2030 11:00 UTC
const ui = (scheduled_at, extra = {}) => toUiVisit({ id: 1, status: "CONFIRMED", scheduled_at, listing: {}, ...extra });

// --- 1. Parsing (Asia/Kolkata) -----------------------------------------------------
check("Z1 test runs in Asia/Kolkata", new Date(INSTANT).getTimezoneOffset() === -330);
check("Z2 zone-less API value is read as UTC", parseApiDateTime("2030-12-30T11:00:00")?.getTime() === INSTANT);
check("Z3 zone-less value with fractional seconds is UTC", parseApiDateTime("2030-12-30T11:00:00.000")?.getTime() === INSTANT);
check("Z4 explicit Z is not shifted twice", parseApiDateTime("2030-12-30T11:00:00Z")?.getTime() === INSTANT);
check("Z5 explicit +05:30 offset honoured", parseApiDateTime("2030-12-30T16:30:00+05:30")?.getTime() === INSTANT);
check("Z6 explicit -05:00 offset honoured", parseApiDateTime("2030-12-30T06:00:00-05:00")?.getTime() === INSTANT);
check(
  "Z7 missing/invalid values give null",
  parseApiDateTime(null) === null &&
    parseApiDateTime(undefined) === null &&
    parseApiDateTime("") === null &&
    parseApiDateTime("not a date") === null
);

// --- 2. Display (Asia/Kolkata) -----------------------------------------------------
{
  const v = ui("2030-12-30T11:00:00");
  check("Z8 11:00 UTC shows as 4:30 PM in Chennai", v.date === "30 Dec 2030" && v.time === "04:30 PM", v);
  check("Z9 Z-suffixed value shows the same time", ui("2030-12-30T11:00:00Z").time === "04:30 PM");
  check("Z10 offset value shows the same time", ui("2030-12-30T16:30:00+05:30").time === "04:30 PM");
  check(
    "Z11 scheduledAt is explicit UTC (safe for new Date in reschedule pickers)",
    v.scheduledAt === "2030-12-30T11:00:00.000Z" && new Date(v.scheduledAt).getTime() === INSTANT
  );
  const crossesMidnight = ui("2030-12-30T20:00:00");
  check(
    "Z12 date rolls over in local time (20:00 UTC = 31 Dec 1:30 AM IST)",
    crossesMidnight.date === "31 Dec 2030" && crossesMidnight.time === "01:30 AM",
    crossesMidnight
  );
  const created = ui("2030-12-30T11:00:00", { created_at: "2030-12-01T05:00:00" });
  check("Z13 createdAt read as UTC too", created.createdAt === "2030-12-01T05:00:00.000Z");
  const blank = ui(null);
  check("Z14 missing scheduled_at renders empty, no crash", blank.date === "" && blank.time === "" && blank.scheduledAt === null);
}

// --- 3. Sending (Asia/Kolkata) -----------------------------------------------------
{
  const body = toVisitPayload({ date: "30 Dec 2030", time: "04:30 PM", note: "Evening" });
  check("Z15 picked 4:30 PM Chennai is sent as explicit UTC 11:00Z", body.scheduled_at === "2030-12-30T11:00:00.000Z", body);
  check("Z16 round trip keeps the instant and the displayed time", ui(body.scheduled_at.replace(".000Z", "")).time === "04:30 PM");
  let pastErr = null;
  try {
    toVisitPayload({ date: "01 Jan 2020", time: "10:00 AM" });
  } catch (e) {
    pastErr = e;
  }
  check("Z17 past local time rejected before sending", pastErr && /future/.test(pastErr.message));
}

// --- 4. Same instant in another zone (no hard-coded +5:30) ------------------------
process.env.TZ = "America/New_York";
{
  check("Z18 zone switched to New York", new Date(INSTANT).getTimezoneOffset() === 300);
  const v = ui("2030-12-30T11:00:00");
  check("Z19 same instant shows 6:00 AM in New York", v.time === "06:00 AM" && v.date === "30 Dec 2030", v);
  const body = toVisitPayload({ date: "30 Dec 2030", time: "06:00 AM" });
  check("Z20 New York 6:00 AM is sent as the same UTC instant", body.scheduled_at === "2030-12-30T11:00:00.000Z", body);
}
process.env.TZ = "Asia/Kolkata";

// --- 5. Source guards --------------------------------------------------------------
check("Z21 payload uses toISOString (explicit UTC)", visitsSrc.includes("scheduled_at: local.toISOString()"));
check("Z22 no manual +5:30 arithmetic", !/330|5\s*\*\s*60\s*\+\s*30|19800/.test(visitsSrc));
check("Z23 toUiVisit parses through parseApiDateTime", visitsSrc.includes("const valid = parseApiDateTime(row?.scheduled_at);"));

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall visit-timezone checks passed");
