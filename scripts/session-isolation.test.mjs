// Regression tests: session isolation, logout cleanup, logged-out navigation
// and Login visibility (owner data isolation + auth-state navigation).
// Run with: node scripts/session-isolation.test.mjs  (plain node, no deps)
//
// Pure modules (src/auth/session.js) are imported directly; React screens are
// verified by source assertions (same harness pattern as buyer-flow.test.mjs)
// plus inspection.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const session = await import(join(ROOT, "..", "src", "features", "auth", "session.js"));

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

// ---------- Session navigation decisions ----------------------------------
{
  const plan = session.planSessionNavigation;
  check(
    "S1 resolving session waits (no shell rendered)",
    plan({ isLoading: true, isAuthenticated: false, wasAuthenticated: false, currentRouteName: null }).action === "wait"
  );
  check(
    "S2 authenticated session stays",
    plan({ isLoading: false, isAuthenticated: true, wasAuthenticated: true, currentRouteName: "OwnerNavigator" }).action === "stay"
  );
  check(
    "S3 logout resets to the auth entry route",
    plan({ isLoading: false, isAuthenticated: false, wasAuthenticated: true, currentRouteName: "OwnerNavigator" }).action === "reset" &&
      plan({ isLoading: false, isAuthenticated: false, wasAuthenticated: true, currentRouteName: "OwnerNavigator" }).route === "Login"
  );
  check(
    "S4 logout already on Login does not re-reset",
    plan({ isLoading: false, isAuthenticated: false, wasAuthenticated: true, currentRouteName: "Login" }).action === "stay"
  );
  check(
    "S5 a guest that never signed in keeps browsing",
    plan({ isLoading: false, isAuthenticated: false, wasAuthenticated: false, currentRouteName: "MainTabs" }).action === "stay"
  );
  check("S6 auth entry route is Login", session.AUTH_ENTRY_ROUTE === "Login");
  check(
    "S7 guest routes are Login + MainTabs only",
    session.isGuestRoute("Login") === true &&
      session.isGuestRoute("MainTabs") === true &&
      session.isGuestRoute("OwnerNavigator") === false &&
      session.isGuestRoute("Notifications") === false
  );
}

// ---------- Account scope reset -------------------------------------------
{
  const shouldReset = session.shouldResetAccountScope;
  check("A1 same account keeps its cache", shouldReset(11562, 11562) === false);
  check("A2 logout clears the cache", shouldReset(11562, null) === true);
  check("A3 login as another account clears the cache", shouldReset(null, 17744) === true);
  check("A4 switching accounts clears the cache", shouldReset(11562, 17744) === true);
  check("A5 no account at all needs no reset", shouldReset(null, null) === false);
}

// ---------- Owner row scoping (Roshan vs Test 1) --------------------------
{
  const scoped = session.selectOwnerScopedProperties;
  const roshanRows = [
    { id: "12061", title: "Roshan 2 BHK", ownerUserId: 11562 },
    { id: "own-prop-1", title: "Roshan local row", ownerUserId: 11562 },
  ];
  const test1Rows = [{ id: "13000", title: "Test 1 flat", ownerUserId: 17744 }];
  const stale = [...roshanRows, ...test1Rows];

  const forRoshan = scoped(stale, 11562);
  check(
    "O1 Roshan sees exactly his own rows",
    forRoshan.length === 2 && forRoshan.every((p) => p.ownerUserId === 11562)
  );
  const forTest1 = scoped(stale, 17744);
  check(
    "O2 Test 1 never sees Roshan's rows",
    forTest1.length === 1 && forTest1[0].ownerUserId === 17744,
    forTest1
  );
  check("O3 logged out sees no owner rows", scoped(stale, null).length === 0);
  check("O4 undefined owner sees no owner rows", scoped(stale, undefined).length === 0);
  check(
    "O5 rows without an owner stamp belong to nobody",
    scoped([{ id: "x", title: "orphan" }], 11562).length === 0
  );
  check("O6 non-array input is safe", scoped(null, 11562).length === 0);
}

// ---------- Logout cleanup (AuthContext) ----------------------------------
{
  const authSrc = src("src/features/auth/context/AuthContext.js");
  check(
    "L1 logout clears the bearer token",
    authSrc.includes("setAuthToken(null)")
  );
  check("L2 logout clears the current user", authSrc.includes("setUser(null)"));
  check(
    "L3 logout drops the queued post-login continuation",
    authSrc.includes("continuationStore.clear()")
  );
  check(
    "L4 logout bumps the session version (account stores reset)",
    authSrc.includes("setSessionVersion((v) => v + 1)")
  );
  check(
    "L5 logout resets navigation to the auth entry route",
    authSrc.includes("resetToLogin()") && authSrc.includes('shared/navigation/navRef')
  );
  check(
    "L6 the session version is exposed to account-scoped stores",
    authSrc.includes("sessionVersion,")
  );
  check(
    "L7 a failed logout still leaves the session unauthenticated",
    authSrc.indexOf("setAuthToken(null)") < authSrc.indexOf("resetToLogin()")
  );
}

// ---------- Account-scoped stores reset on account change ------------------
{
  const ownerSrc = src("src/features/owner/context/OwnerContext.js");
  check(
    "C1 owner store resets when the account changes",
    ownerSrc.includes("shouldResetAccountScope(scopedOwnerIdRef.current, authUserId)") &&
      ownerSrc.includes("setProperties([])") &&
      ownerSrc.includes("setLeads([])")
  );
  check(
    "C2 locally created rows are stamped with the owning account",
    ownerSrc.includes("ownerUserId: newProp?.ownerUserId ?? authUserId")
  );
  const wishSrc = src("src/features/buyer/context/WishlistContext.js");
  check(
    "C3 saved properties are reset when the account changes",
    wishSrc.includes("shouldResetAccountScope(scopedAccountIdRef.current, currentId)") &&
      wishSrc.includes("setWishlist([])")
  );
}

// ---------- Owner screens merge only the signed-in account's rows ---------
{
  const propsSrc = src("src/features/owner/screens/OwnerPropertiesScreen.js");
  check(
    "M1 My Properties merges only owner-scoped local rows",
    propsSrc.includes("selectOwnerScopedProperties(localProperties, ownerUserId)") &&
      !/const localOnly = localProperties\.filter/.test(propsSrc)
  );
  check(
    "M2 My Properties reads the owner's own paged collection",
    propsSrc.includes("fetchAllOwnerListings()")
  );
  check(
    "M3 My Properties can be refreshed without signing out",
    propsSrc.includes("RefreshControl") && propsSrc.includes("handleRefresh")
  );
  check(
    "M4 an expired session leaves the owner list and returns to Login",
    propsSrc.includes("resetToLogin()")
  );
  const dashSrc = src("src/features/owner/screens/OwnerDashboardScreen.js");
  check(
    "M5 the owner dashboard merges only owner-scoped local rows",
    dashSrc.includes("selectOwnerScopedProperties(localProperties, ownerUserId)")
  );
  const leadsSrc = src("src/features/owner/screens/OwnerLeadsScreen.js");
  check(
    "M6 the owner leads screen merges only owner-scoped local rows",
    leadsSrc.includes("selectOwnerScopedProperties(localProperties, ownerUserId)")
  );
  const leadDetailSrc = src("src/features/owner/screens/OwnerLeadDetailScreen.js");
  check(
    "M7 the owner lead detail only matches the signed-in owner's rows",
    leadDetailSrc.includes("selectOwnerScopedProperties(properties, authUser?.id ?? null)")
  );
  const propLeadsSrc = src("src/features/owner/screens/OwnerPropertyLeadsScreen.js");
  check(
    "M8 the owner property-leads screen only matches the signed-in owner's rows",
    propLeadsSrc.includes("selectOwnerScopedProperties(properties, authUser?.id ?? null)")
  );
}

// ---------- Logged-out navigation + Login visibility ----------------------
{
  const navSrc = src("src/shared/navigation/AppNavigator.js");
  check(
    "N1 the navigator waits for the session instead of flashing a screen",
    navSrc.includes("if (isLoading)") && navSrc.includes("backgroundColor: \"#FFFFFF\"")
  );
  check(
    "N2 the auth state chooses the initial route",
    navSrc.includes('initialRouteName={isAuthenticated ? "MainTabs" : AUTH_ENTRY_ROUTE}')
  );
  check(
    "N3 a logout resets the stack onto the auth entry route",
    navSrc.includes("planSessionNavigation") && navSrc.includes('routes: [{ name: plan.route || AUTH_ENTRY_ROUTE }]')
  );
  check(
    "N4 account-scoped screens are wrapped in the auth guard",
    navSrc.includes("RequireAuth") &&
      navSrc.includes("GuardedOwnerNavigator") &&
      navSrc.includes("GuardedNotifications") &&
      navSrc.includes("GuardedEnquiries")
  );
  const guardSrc = src("src/shared/navigation/RequireAuth.js");
  check(
    "N5 the guard renders nothing while logged out and resets the stack",
    guardSrc.includes("if (isLoading || !isAuthenticated) return null;") &&
      guardSrc.includes("resetToLogin()")
  );
  const navRefSrc = src("src/shared/navigation/navRef.js");
  check(
    "N6 resetToLogin clears the whole stack",
    navRefSrc.includes("navigationRef.reset({ index: 0, routes: [{ name: AUTH_ENTRY_ROUTE }] })")
  );
  const ownerProfileSrc = src("src/features/owner/screens/OwnerProfileScreen.js");
  check(
    "N7 owner sign-out lands on the auth entry route",
    ownerProfileSrc.includes('routes: [{ name: "Login" }]')
  );
  const profileSrc = src("src/features/buyer/screens/ProfileScreen.js");
  const logoutHandler = profileSrc.slice(
    profileSrc.indexOf("const handleLogout"),
    profileSrc.indexOf("const handleLogout") + 700
  );
  check(
    "N8 buyer sign-out lands on the auth entry route",
    logoutHandler.includes('routes: [{ name: "Login" }]') &&
      logoutHandler.includes("nav.reset(") &&
      !logoutHandler.includes('nav.navigate("Login")')
  );
  check(
    "N9 the signed-out profile shows a Login action",
    profileSrc.includes("loggedOutBtn") && profileSrc.includes(">Login</Text>")
  );
  check(
    "N10 no mock identity is shown for the signed-out visitor",
    !profileSrc.includes("Alex Smith") && !profileSrc.includes("alex.smith@restamp.in")
  );
  const homeSrc = src("src/features/buyer/screens/HomeScreen.js");
  check(
    "N11 the Home Login action stays logged-out only",
    homeSrc.includes("!auth.isLoading && !auth.isAuthenticated")
  );
}

// ---------- Verification lifecycle copy (no false promises) ---------------
{
  const cardSrc = src("src/features/owner/components/OwnerPropertyCard.js");
  const successSrc = src("src/features/owner/screens/OwnerPublishSuccessScreen.js");
  check(
    "V1 the pending card names the real next step",
    cardSrc.includes("Verify & Publish") && !cardSrc.includes("RESTAMP team validates")
  );
  check(
    "V2 the success screen does not promise a background review",
    !successSrc.includes("2 to 4 business hours") &&
      !successSrc.includes("verification team") &&
      successSrc.includes("Pending Verification")
  );
  const ownerApiSrc = src("src/features/owner/api/owner.js");
  check(
    "V3 the explicit lifecycle transitions stay available",
    ownerApiSrc.includes("export async function verifyListing") &&
      ownerApiSrc.includes("export async function submitListing") &&
      ownerApiSrc.includes("export async function rejectListing")
  );
}

if (failures > 0) {
  console.log(`${failures} session-isolation test(s) FAILED`);
  process.exit(1);
} else {
  console.log("all session-isolation tests passed");
}
