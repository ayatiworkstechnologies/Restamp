// Regression tests for three honesty corrections:
//   N  notifications start empty (no invented notifications, no unread dot)
//   E  Explore shows no fabricated locality figures; its count is the
//      backend's own total, never page length or an invented number
//   A  the agent module is disabled and unreachable
// Run with: node scripts/honesty-gates.test.mjs  (plain node, no deps)
//
// Pure modules are copied to a tmp dir as .mjs and imported for real.
// React screens import React Native and cannot run here; their wiring is
// guarded by source-text assertions.
import { mkdtempSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const src = (p) => readFileSync(join(SRC, p), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "honesty-gates-test-"));
const load = async (rel, name) => {
  const dest = join(tmp, name);
  copyFileSync(join(SRC, rel), dest);
  return import(pathToFileURL(dest).href);
};

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- N: notifications -------------------------------------------------------
const store = await load("shared/data/notificationsStore.js", "notificationsStore.mjs");
check("N1 store starts with no notifications", store.getNotifications().length === 0, store.getNotifications());
check("N2 unread count starts at 0 (no bell dot)", store.getUnreadCount() === 0);
const storeSrc = src("shared/data/notificationsStore.js");
check(
  "N3 no pre-filled notification content in the store source",
  /let notifications = \[\];/.test(storeSrc) && !/Emerald Heights|Suresh Babu|unsplash\.com|notif-\d/.test(storeSrc)
);
check(
  "N4 header and Home only show the dot when something is unread",
  src("shared/components/AppBrandHeader.js").includes("{unreadNotifCount > 0 && <View style={styles.notificationDot} />}") &&
    src("features/buyer/screens/HomeScreen.js").includes("{unreadNotifCount > 0 && <View style={styles.notificationDot} />}")
);
const notifScreenSrc = src("features/buyer/screens/NotificationScreen.js");
check(
  "N5 notification screen has a friendly empty state for no notifications",
  notifScreenSrc.includes("filteredNotifications.length === 0") &&
    notifScreenSrc.includes("No notifications yet") &&
    notifScreenSrc.includes("will appear here")
);

// --- E: Explore figures -------------------------------------------------------
const explore = await load("features/buyer/utils/exploreLocality.js", "exploreLocality.mjs");
const label = explore.localityCountLabel;
check("E1 loading shows no number", label({ loading: true, failed: false, total: 40 }) === "Loading...");
check("E2 the backend total is shown (not the 12-item page)", label({ loading: false, failed: false, total: 40 }) === "40 Available");
check("E3 zero is a real answer", label({ loading: false, failed: false, total: 0 }) === "0 Available");
check("E4 failure shows no number", label({ loading: false, failed: true, total: 40 }) === "Count unavailable");
check(
  "E5 unknown or malformed total shows no number",
  [null, undefined, -1, 2.5, "40"].every((total) => label({ loading: false, failed: false, total }) === "Count unavailable")
);
const exploreSrc = src("features/buyer/screens/ExploreScreen.js");
check(
  "E6 no fabricated locality figures remain in Explore",
  !/YoY|avgPrice|yield: "|Props"|count: "/.test(exploreSrc),
  (exploreSrc.match(/YoY|avgPrice|yield: "|Props"|count: "/g) || []).slice(0, 3)
);
check(
  "E7 count comes from the response total via localityCountLabel",
  exploreSrc.includes("setLocalityTotal(Number.isInteger(data?.total) ? data.total : null);") &&
    exploreSrc.includes("localityCountLabel({") &&
    !exploreSrc.includes("${localityProperties.length} Available")
);
check(
  "E8 the indicative-guide disclaimer is still shown",
  exploreSrc.includes("Indicative neighborhood guide — not live market data.")
);

// --- A: agent module -------------------------------------------------------
const features = await load("shared/constants/features.js", "features.mjs");
check("A1 AGENT_MODULE_ENABLED is false", features.AGENT_MODULE_ENABLED === false);
const navSrc = src("shared/navigation/AppNavigator.js");
const agentRoutes = ["AgentLocationSelect", "AgentPlanConfirm", "AgentPayment", "AgentPaymentSuccess", "AgentNavigator", "AgentLeadDetail", "AgentEarnings"];
const gateStart = navSrc.indexOf("{AGENT_MODULE_ENABLED ? (");
const gateEnd = navSrc.indexOf(") : null}", gateStart);
check(
  "A2 every agent route is registered only inside the flag gate",
  gateStart > 0 &&
    gateEnd > gateStart &&
    agentRoutes.every((r) => {
      const at = navSrc.indexOf(`name="${r}"`);
      return at > gateStart && at < gateEnd && navSrc.indexOf(`name="${r}"`, at + 1) === -1;
    })
);
const menuSrc = src("features/buyer/screens/MenuScreen.js");
check(
  "A3 Menu's Agent Plan tab exists only when enabled, and initialTab is validated against it",
  menuSrc.includes('...(AGENT_MODULE_ENABLED ? [{ id: "agent", label: "Agent Plan", icon: Briefcase }] : [])') &&
    menuSrc.includes('VERTICAL_TABS.some((t) => t.id === requestedTab) ? requestedTab : "owner"')
);
const memberSrc = src("features/buyer/screens/ActiveMembershipsScreen.js");
check(
  "A4 membership agent entry points are gated by the flag",
  /const hasAgentPlan =\s*\n\s*AGENT_MODULE_ENABLED &&/.test(memberSrc) &&
    memberSrc.includes("{AGENT_MODULE_ENABLED && hasOwnerPlan && !hasAgentPlan ? (")
);
check(
  "A5 Profile's agent flag gate stays in place",
  /const hasAgentPlan =\s*\n\s*AGENT_MODULE_ENABLED &&/.test(src("features/buyer/screens/ProfileScreen.js"))
);
const agentCtxSrc = src("features/agent/context/AgentContext.js");
check(
  "A6 agent context actions are no-ops while disabled",
  (agentCtxSrc.match(/if \(!AGENT_MODULE_ENABLED\) return null;/g) || []).length >= 4
);
// Outside the agent feature and the gated screens above, nothing navigates to an agent route.
const { readdirSync, statSync } = await import("node:fs");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith(".js") ? [join(d, f)] : []));
const gated = ["MenuScreen.js", "ProfileScreen.js", "ActiveMembershipsScreen.js"];
const stray = walk(SRC)
  .filter((f) => !f.includes(join("features", "agent")) && !gated.some((g) => f.endsWith(g)))
  .filter((f) => /navigate\(\s*"Agent/.test(readFileSync(f, "utf8")))
  .map((f) => f.slice(SRC.length + 1));
check("A7 no ungated screen navigates to an agent route", stray.length === 0, stray);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall honesty-gates checks passed");
