// Regression tests for profile/avatar initials: one shared rule
// (src/shared/utils/initials.js) used by every user avatar, with the real
// photo kept when one exists and no blank image or stock person otherwise.
// Run with: node scripts/profile-initials.test.mjs  (plain node, no deps)
import { mkdtempSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const src = (p) => readFileSync(join(SRC, p), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "profile-initials-test-"));
copyFileSync(join(SRC, "shared", "utils", "initials.js"), join(tmp, "initials.mjs"));
const { getInitials } = await import(pathToFileURL(join(tmp, "initials.mjs")).href);

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- the rule -------------------------------------------------------------------
check("I1 first + last name -> two letters", getInitials("Roshan S") === "RS", getInitials("Roshan S"));
check("I2 single name -> one letter", getInitials("Roshan") === "R");
check("I3 middle names are skipped (first + last)", getInitials("Roshan Kumar Shah") === "RS");
check("I4 extra whitespace is ignored", getInitials("   roshan    s  ") === "RS" && getInitials("\tRoshan\n") === "R");
check("I5 missing / empty / whitespace-only -> empty", [undefined, null, "", "   ", "\n\t", 42, {}].every((v) => getInitials(v) === ""));
check("I6 phone-number default names never become initials", getInitials("+919876543210") === "" && getInitials("+91 98765 43210") === "");
check("I7 app placeholders are not names", ["User", "Owner", "Buyer", "Guest", "My Account", "Buyer #12", "Buyer enquiry", " owner "].every((v) => getInitials(v) === ""));
check("I8 non-letter words are skipped", getInitials("Roshan 2") === "R" && getInitials("#1 Roshan") === "R");
check("I9 lower case is upper-cased", getInitials("roshan s") === "RS");
check("I10 Tamil names work (first code point)", getInitials("ரோஷன்") === "ர" && getInitials("ரோஷன் சுந்தர்").length === 2);

// --- one rule everywhere ----------------------------------------------------------
const avatarScreens = [
  "features/buyer/screens/ProfileScreen.js",
  "features/buyer/screens/SavedScreen.js",
  "features/owner/screens/OwnerProfileScreen.js",
  "features/owner/components/OwnerHeader.js",
  "features/owner/screens/OwnerLeadsScreen.js",
  "features/owner/screens/OwnerPropertyLeadsScreen.js",
  "features/owner/screens/OwnerLeadDetailScreen.js",
  "features/owner/screens/OwnerDashboardScreen.js",
  "features/agent/screens/AgentProfileScreen.js",
  "features/agent/screens/AgentDashboardScreen.js",
];
const missing = avatarScreens.filter((f) => !src(f).includes("<InitialsAvatar"));
check("I11 every user avatar uses the shared InitialsAvatar", missing.length === 0, missing);
const adHoc = [...avatarScreens, "features/buyer/components/PropertyDetailModal.js"].filter((f) =>
  /(customerName|ownerDisplayName|profileName)[^\n]{0,30}\.charAt\(0\)/.test(src(f))
);
check("I12 no ad-hoc first-letter initials remain", adHoc.length === 0, adHoc);
check(
  "I13 owner name initials in the property detail use getInitials",
  (src("features/buyer/components/PropertyDetailModal.js").match(/getInitials\(ownerDisplayName\)/g) || []).length >= 4
);
check(
  "I14 the buyer profile header never renders a bare image with no photo",
  !/<Image source=\{\{ uri: userProfile\.avatar \}\}/.test(src("features/buyer/screens/ProfileScreen.js"))
);
const stock = avatarScreens.filter((f) => /unsplash\.com|randomuser\.me|pravatar/.test(src(f)));
check("I15 no stock-photo person as an avatar fallback", stock.length === 0, stock);
const component = src("shared/components/InitialsAvatar.js");
check(
  "I16 the component keeps a real photo, then initials, then an icon",
  /if \(uri\) \{\s*return <Image source=\{\{ uri \}\}/.test(component) &&
    component.includes("getInitials(name)") &&
    component.includes("<User size={iconSize}")
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall profile-initials checks passed");
