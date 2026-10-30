// Regression tests for enquiry creation times and the Owner profile name editor.
// Run with: node scripts/owner-lead-dates.test.mjs  (plain node, no deps)
// Covers: toOwnerLead maps the backend's created_at (explicit UTC) to a
// local display string; zone-less/offset values follow the UTC rule; null
// gives the honest "Date unavailable" fallback and nothing is inferred from
// ids or listings; the Buyer messaging mapper (toUiEnquiry) reads the same
// contract correctly; screens render the real date; profile name helpers
// validate like the backend (PATCH /users/me) and the placeholder editor is
// gone.
//
// Deterministic: the time zone is set here (Asia/Kolkata, then
// America/New_York). Same tmp-copy harness as the other script tests; no
// network.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "owner-lead-dates-test-"));
copyFileSync(join(SRC, "shared", "api", "client.js"), join(tmp, "client.js"));
copyFileSync(join(SRC, "shared", "api", "mappers.js"), join(tmp, "mappers.js"));
copyFileSync(join(SRC, "features", "buyer", "api", "buyerModeCore.js"), join(tmp, "buyerModeCore.js"));
const file_sources = {
  "owner.js": join(SRC, "features", "owner", "api", "owner.js"),
  "enquiries.js": join(SRC, "features", "buyer", "api", "enquiries.js"),
  "buyerMode.js": join(SRC, "features", "buyer", "api", "buyerMode.js"),
};
for (const [f, p] of Object.entries(file_sources)) {
  writeFileSync(
    join(tmp, f),
    readFileSync(p, "utf8")
      .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
      .replace(/from "[^"]*mappers(\.js)?"/g, 'from "./mappers.js"')
      .replace(/from "[^"]*buyerModeCore(\.js)?"/g, 'from "./buyerModeCore.js"')
      .replace(/from "[^"]*buyerMode(\.js)?"/g, 'from "./buyerMode.js"')
  );
}
copyFileSync(join(SRC, "features", "owner", "utils", "ownerProfile.js"), join(tmp, "ownerProfile.js"));
const { toOwnerLead, leadDateLabel, LEAD_DATE_UNAVAILABLE } = await import(join(tmp, "owner.js"));
const { toUiEnquiry } = await import(join(tmp, "enquiries.js")); // may be undefined (see section 2)
const { initialOwnerNameDraft, validateOwnerName, OWNER_NAME_MAX_LENGTH } = await import(join(tmp, "ownerProfile.js"));
const src = (rel) => readFileSync(join(SRC, rel), "utf8");
const leadsSrc = src("features/owner/screens/OwnerLeadsScreen.js");
const detailSrc = src("features/owner/screens/OwnerLeadDetailScreen.js");
const profileSrc = src("features/owner/screens/OwnerProfileScreen.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const row = (extra = {}) => ({
  id: 41,
  property_listing_id: 9,
  buyer_user_id: 900,
  message: null,
  status: "NEW",
  closing_reason: null,
  listing: { title: "Sea View", price_paise: 100, price_period: "TOTAL" },
  ...extra,
});

// --- 1. Owner lead dates (Asia/Kolkata) --------------------------------------------
check("D1 test runs in Asia/Kolkata", new Date(0).getTimezoneOffset() === -330);
{
  const lead = toOwnerLead(row({ created_at: "2030-12-30T11:00:00Z" }));
  check("D2 explicit UTC kept as the same instant", lead.createdAt === "2030-12-30T11:00:00.000Z", lead.createdAt);
  check("D3 shown in local time (4:30 PM Chennai)", lead.timestamp === "30 Dec 2030, 04:30 PM", lead.timestamp);
  check("D4 label uses the real date", leadDateLabel(lead) === "30 Dec 2030, 04:30 PM");
  check("D5 zone-less value read as UTC", toOwnerLead(row({ created_at: "2030-12-30T11:00:00" })).timestamp === "30 Dec 2030, 04:30 PM");
  check("D6 offset value not shifted twice", toOwnerLead(row({ created_at: "2030-12-30T16:30:00+05:30" })).timestamp === "30 Dec 2030, 04:30 PM");
  check(
    "D7 date rolls over locally (20:00 UTC = 31 Dec 01:30 AM IST)",
    toOwnerLead(row({ created_at: "2030-12-30T20:00:00Z" })).timestamp === "31 Dec 2030, 01:30 AM"
  );
}
{
  const historical = toOwnerLead(row({ created_at: null }));
  check("D8 null created_at: no date, honest fallback", historical.createdAt === null && historical.timestamp === undefined);
  check("D9 fallback text is 'Date unavailable'", leadDateLabel(historical) === "Date unavailable" && LEAD_DATE_UNAVAILABLE === "Date unavailable");
  const older = toOwnerLead(row());
  check("D10 field absent (older backend): same fallback, nothing inferred from id/listing", older.createdAt === null && leadDateLabel(older) === LEAD_DATE_UNAVAILABLE);
  check("D11 invalid value is not shown as a date", leadDateLabel(toOwnerLead(row({ created_at: "yesterday" }))) === LEAD_DATE_UNAVAILABLE);
  check("D12 missing lead object", leadDateLabel(null) === LEAD_DATE_UNAVAILABLE);
}

// --- 2. Buyer messaging mapper reads the same contract -----------------------------
// toUiEnquiry belongs to the Buyer messaging work; when that work is not in
// this tree the checks are reported as skipped (never silently passed).
if (typeof toUiEnquiry === "function") {
  const msg = toUiEnquiry(row({ created_at: "2030-12-30T20:00:00Z" }));
  check("B1 toUiEnquiry shows the local calendar day of the UTC instant", msg.timestamp.startsWith("31 Dec 2030, "), msg.timestamp);
  check("B2 toUiEnquiry with null created_at says the date is unavailable", toUiEnquiry(row({ created_at: null })).timestamp === "Date unavailable");
} else {
  console.log("skip - B1/B2: toUiEnquiry not present (Buyer messaging work not in this tree)");
}

// --- 3. Same instant in another zone (no hard-coded offsets) ------------------------
process.env.TZ = "America/New_York";
check("D13 New York shows 6:00 AM for 11:00 UTC", toOwnerLead(row({ created_at: "2030-12-30T11:00:00Z" })).timestamp === "30 Dec 2030, 06:00 AM");
process.env.TZ = "Asia/Kolkata";

// --- 4. Screens render the real date or the fallback -------------------------------
check("S1 Leads cards show leadDateLabel", leadsSrc.includes("{leadDateLabel(lead)}"));
check("S2 Lead detail shows ENQUIRED ON with leadDateLabel", detailSrc.includes(">ENQUIRED ON<") && detailSrc.includes("{leadDateLabel(lead)}"));

// --- 5. Owner profile name editing -------------------------------------------------
check("P1 phone default never offered as the name", initialOwnerNameDraft("+919876543210", "+919876543210") === "");
check("P2 phone-shaped name never offered", initialOwnerNameDraft("98765 43210", "") === "");
check("P3 placeholder 'Owner' not offered", initialOwnerNameDraft("Owner", "") === "");
check("P4 real name offered for editing", initialOwnerNameDraft("  Lakshmi Narayanan ", "+919876543210") === "Lakshmi Narayanan");
check("P5 empty/whitespace rejected", !validateOwnerName("   ").ok && !validateOwnerName(undefined).ok);
check("P6 over-long name rejected", OWNER_NAME_MAX_LENGTH === 255 && !validateOwnerName("x".repeat(256)).ok && validateOwnerName("x".repeat(255)).ok);
{
  const v = validateOwnerName("  Lakshmi   Narayanan  Iyer ");
  check("P7 trims, collapses spaces, splits first/last", v.ok && v.value === "Lakshmi Narayanan Iyer" && v.firstName === "Lakshmi" && v.lastName === "Narayanan Iyer", v);
  const one = validateOwnerName("Lakshmi");
  check("P8 single name: empty last name", one.ok && one.firstName === "Lakshmi" && one.lastName === "");
}
check(
  "P9 placeholder editor replaced by the real one",
  !profileSrc.includes('Alert.alert("Edit Profile", "Owner profile editor")') &&
    profileSrc.includes("onPress={openNameEditor}") &&
    profileSrc.includes("await saveProfileName(result.firstName, result.lastName);")
);
check(
  "P10 failures stay visible (no early success)",
  profileSrc.includes("setNameEditorOpen(false);\n    } catch (e) {") && profileSrc.includes("Couldn't save your name.")
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall owner-lead-dates checks passed");
