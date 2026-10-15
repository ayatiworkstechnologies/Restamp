// Regression tests for login validation + protected-action auth guard.
// Covers Change 1 (exactly-10-digit +91 validation, paste-safe), Change 2
// (guest deferral, single-shot resume, cancel/skip drops, role checks kept),
// and Change 3 (conditional Home Login button).
// Run with: node scripts/auth-guard.test.mjs  (plain node, no deps)
// Pure modules (src/auth/phone, continuation, requireAuth) run directly;
// React screens are verified by source assertions (same harness pattern as
// buyer-flow.test.mjs) plus inspection.
import { mkdtempSync, copyFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const AUTH = join(ROOT, "..", "src", "auth");
const tmp = mkdtempSync(join(tmpdir(), "auth-guard-test-"));
for (const f of ["phone.js", "continuation.js", "requireAuth.js"]) {
  copyFileSync(join(AUTH, f), join(tmp, f));
}
const phone = await import(join(tmp, "phone.js"));
const cont = await import(join(tmp, "continuation.js"));
const guard = await import(join(tmp, "requireAuth.js"));

function src(rel) {
  return readFileSync(join(ROOT, "..", rel), "utf8");
}

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// ---------- Change 1: phone validation ----------
check("P1 empty input rejected", phone.isPhoneValidForCountry("", "+91") === false);
check("P2 9 digits rejected", phone.isPhoneValidForCountry("987654321", "+91") === false);
check("P3 10 digits accepted", phone.isPhoneValidForCountry("9876543210", "+91") === true);
check(
  "P4 typing 11+ digits retains max 10",
  phone.sanitizePhoneInput("98765432109", "+91") === "9876543210"
);
check(
  "P5 paste with letters/spaces cannot bypass",
  phone.sanitizePhoneInput("  98ab76 543 210 xyz!!", "+91") === "9876543210" &&
    phone.isPhoneValidForCountry("  98ab76 543 210 xyz!!", "+91") === true &&
    phone.sanitizePhoneInput("+91 98765 43210 999", "+91") === "9198765432"
);
check(
  "P6 +91 never counted as part of the 10",
  phone.maxPhoneDigits("+91") === 10 &&
    phone.phoneValidationMessage("98765", "+91").includes("10 digits") &&
    phone.phoneValidationMessage("", "+91").length > 0
);
check(
  "P7 other country codes keep working (7-15 digits)",
  phone.isPhoneValidForCountry("5551234", "+1") === true &&
    phone.isPhoneValidForCountry("555123", "+1") === false &&
    phone.isPhoneValidForCountry("9876543210", "+44") === true
);

// ---------- Change 2: continuation store (single-shot) ----------
{
  const store = cont.createContinuationStore();
  let runs = 0;
  const action = () => {
    runs += 1;
  };
  check("C1 empty store consumes null", store.consume() === null);
  store.set(action);
  check("C2 set/peek/has", store.has() === true && store.peek() === action);
  const got = store.consume();
  check("C3 consume returns action and clears", got === action && store.has() === false);
  got();
  const second = store.consume();
  check("C4 repeated taps cannot re-run (second consume null)", second === null && runs === 1);
  store.set(action);
  store.clear();
  check("C5 cancel/skip drops the action", store.has() === false && store.consume() === null);
  store.set("not-a-function");
  check("C6 non-function never stored", store.has() === false);
}

// ---------- Change 2: guard decisions ----------
check(
  "G1 authed user runs immediately",
  guard.planProtectedAction({ isAuthenticated: true, hasToken: true }).status === "run"
);
check(
  "G2 guest without token defers",
  guard.planProtectedAction({ isAuthenticated: false, hasToken: false }).status === "defer"
);
check(
  "G3 token without auth state still defers (no bypass)",
  guard.planProtectedAction({ isAuthenticated: false, hasToken: true }).status === "defer"
);
check(
  "G4 auth state without token defers (expired session)",
  guard.planProtectedAction({ isAuthenticated: true, hasToken: false }).status === "defer"
);
{
  const fn = () => {};
  const back = guard.planLoginResume({ continuation: fn, canGoBack: true, loginSucceeded: true });
  check("G5 success + back stack resumes in place", back.mode === "resume-back" && back.action === fn);
  const reset = guard.planLoginResume({ continuation: fn, canGoBack: false, loginSucceeded: true });
  check("G6 success without back stack resets then runs", reset.mode === "resume-reset" && reset.action === fn);
  const none = guard.planLoginResume({ continuation: null, canGoBack: true, loginSucceeded: true });
  check("G7 no queued action keeps default entry", none.mode === "default-reset" && none.action === null);
  const failed = guard.planLoginResume({ continuation: fn, canGoBack: true, loginSucceeded: false });
  check("G8 failed/cancelled login never resumes", failed.mode === "default-reset" && failed.action === null);
}

// ---------- Wiring: source assertions ----------
const loginSrc = src("src/screens/auth/LoginScreen.js");
check("W1 login sanitizes input + caps length", loginSrc.includes("sanitizePhoneInput") && loginSrc.includes("handlePhoneChange"));
check("W2 login gates submit on exact validity", loginSrc.includes("isPhoneValidForCountry(phoneNumber"));
check("W3 login shows inline message", loginSrc.includes("phoneValidationMessage") && loginSrc.includes("phoneErrorText"));
check("W4 login resumes or enters on every success path", (loginSrc.match(/enterAfterLogin\(\)/g) || []).length >= 3);
check("W5 skip + unmount abandon drop the action", loginSrc.includes("clearPendingAction") && loginSrc.includes("loginSucceededRef"));
const wishSrc = src("src/context/WishlistContext.js");
check("W6 wishlist toggle defers guests centrally", wishSrc.includes("planProtectedAction") && wishSrc.includes("goLogin()") && wishSrc.includes("setPendingAction"));
const modalSrc = src("src/components/PropertyDetailModal.js");
check("W7 modal passes a resume thunk", modalSrc.includes("onLoginRequired(resume)") && modalSrc.includes("() => handleSendEnquiry()"));
for (const [label, rel] of [
  ["W8a home", "src/screens/buyer/HomeScreen.js"],
  ["W8b search", "src/screens/buyer/SearchScreen.js"],
  ["W8c saved", "src/screens/buyer/SavedScreen.js"],
  ["W8d enquiries", "src/screens/buyer/EnquiriesScreen.js"],
  ["W8e explore", "src/screens/buyer/ExploreScreen.js"],
]) {
  const s = src(rel);
  check(`${label} modal caller routes through guard`, s.includes("onLoginRequired={(resume) => requireAuth(resume)}"));
}
const headerSrc = src("src/components/AppBrandHeader.js");
check("W9 header role switch guarded", headerSrc.includes("requireAuth(doSwitch)"));
const homeSrc = src("src/screens/buyer/HomeScreen.js");
check("W10 home owner entries guarded", homeSrc.includes("requireAuth(doOpenOwnerDashboard)") && homeSrc.includes("requireAuth(doPostProperty)"));
check(
  "W11 login button logged-out only, no flash",
  homeSrc.includes("!auth.isLoading && !auth.isAuthenticated") &&
    homeSrc.includes(">Login</Text>") &&
    homeSrc.includes("navigation.navigate(\"Login\")")
);
const authSrc = src("src/context/AuthContext.js");
check("W12 auth exposes single-shot continuation", authSrc.includes("consumePendingAction") && authSrc.includes("clearPendingAction") && authSrc.includes("setPendingAction"));
const navSrc = src("src/navigation/AppNavigator.js");
check("W13 navigation ref attached for context-level guards", navSrc.includes("navigationRef") && navSrc.includes("ref={navigationRef}"));

if (failures > 0) {
  console.log(`${failures} auth-guard test(s) FAILED`);
  process.exit(1);
} else {
  console.log("all auth-guard tests passed");
}
