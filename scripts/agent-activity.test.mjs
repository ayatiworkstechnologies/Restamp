// Regression tests for the agent My Activity flow and owner lead sources:
//   G  The buyer-mode guard leaves an agent (BROKER) in agent mode: agents
//      use the buyer activity endpoints directly (backend
//      require_buyer_or_agent); only other roles (e.g. OWNER) are switched
//      to BUYER. Viewed/call taps are recorded for agents too.
//   A  The agent Activity tab IS the buyer My Activity screen (SavedScreen),
//      with "browse" buttons pointing at the agent's Properties tab; the
//      old agent Leads screen is no longer in the tab bar.
//   B  Buyer My Activity no longer has an Agents tab (5 tabs remain).
//   O  Owner leads carry the real source role: a Buyer or Agent corner badge.
//   P  The agent property sheet IS the buyer sheet: Request Site Visit, Send
//      Enquiry, Call, Got questions, wishlist heart; the call tap is recorded
//      only when "Call now" opens the dialler; the shared wishlist syncs for
//      agents; owners see how many call taps came from agents.
//   T  Agent Properties uses the buyer search card (heart, View Number,
//      WhatsApp, Call; no Match Lead); agent browsing/detail/similar use the
//      area-restricted /broker endpoints; an area refusal (402
//      AGENT_AREA_NOT_IN_PLAN) offers the AGENT upgrade, never buyer plans;
//      the free trial (one area) starts from the Menu or the first-time gate.
// Run with: node scripts/agent-activity.test.mjs  (plain node, no deps)
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const src = (p) => readFileSync(join(SRC, p), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "agent-activity-test-"));
cpSync(SRC, join(tmp, "src"), { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
const patch = (rel, from, to) => {
  const p = join(tmp, "src", rel);
  writeFileSync(p, readFileSync(p, "utf8").split(from).join(to));
};
patch("features/buyer/api/calls.js", 'from "./buyerMode"', 'from "./buyerMode.js"');
patch("features/buyer/api/calls.js", 'from "../../../shared/api/client"', 'from "../../../shared/api/client.js"');
patch("features/buyer/api/calls.js", 'from "../../../shared/api/mappers"', 'from "../../../shared/api/mappers.js"');
patch("shared/utils/visitStatus.js", 'from "../constants/colors"', 'from "../constants/colors.js"');
const load = (rel) => import(pathToFileURL(join(tmp, "src", rel)).href);

const core = await load("features/buyer/api/buyerModeCore.js");
const client = await load("shared/api/client.js");
const buyerMode = await load("features/buyer/api/buyerMode.js");
const { recordViewed } = await load("features/buyer/api/viewed.js");
const { recordCallTap } = await load("features/buyer/api/calls.js");
const owner = await load("features/owner/api/owner.js");
const buyerPlans = await load("shared/api/buyerPlans.js");
const agentPlans = await load("shared/api/agentPlans.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- G: buyer-mode guard ---------------------------------------------------------
check("G1 BUYER and BROKER are buyer-capable; OWNER is not",
  core.isBuyerCapableRole("buyer") && core.isBuyerCapableRole("BROKER") && !core.isBuyerCapableRole("OWNER") &&
  !core.isBuyerCapableRole(null) && core.isBuyerRole("BROKER") === false);
{
  const sets = [];
  const guard = core.createBuyerModeGuard({
    getToken: () => "t", fetchRole: async () => ({ role: "BROKER" }),
    setRole: async (r) => { sets.push(r); return { role: r }; },
  });
  const r = await guard.ensure();
  check("G2 an agent is never switched to BUYER", r.already === true && r.role === "BROKER" && sets.length === 0, { r, sets });
  const again = await guard.ensure();
  check("G3 the confirmed agent role is cached (no extra request)", again.role === "BROKER" && sets.length === 0);
}
{
  const sets = [];
  const guard = core.createBuyerModeGuard({
    getToken: () => "t", fetchRole: async () => ({ role: "OWNER" }),
    setRole: async (r) => { sets.push(r); return { role: r }; },
  });
  const r = await guard.ensure();
  check("G4 an OWNER-mode account is still switched to BUYER", r.role === "BUYER" && sets.join() === "BUYER");
}
const calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || "GET" });
  return { ok: true, status: 201, json: async () => ({ ok: true }), text: async () => "{}", headers: { get: () => "application/json" } };
};
client.setAuthToken("agent-token");
buyerMode.noteServerRole("BROKER");
await recordViewed(12);
await recordCallTap(12);
check("G5 viewed and call taps are recorded for an agent, with no role switch",
  calls.map((c) => `${c.method} ${c.url.replace(/^https?:\/\/[^/]+/, "")}`).join(" | ") ===
    "POST /buyer/viewed/12 | POST /buyer/listings/12/call-events", calls);
calls.length = 0;
buyerMode.noteServerRole("OWNER");
await recordViewed(12);
check("G6 an OWNER-mode account still records nothing", calls.length === 0);

// --- A: agent Activity tab -------------------------------------------------------
const nav = src("features/agent/navigation/AgentNavigator.js");
check("A1 the agent Activity tab renders the buyer My Activity screen",
  nav.includes('import SavedScreen from "../../buyer/screens/SavedScreen.js";') &&
  nav.includes('<SavedScreen {...props} browseRoute="Properties" />') &&
  nav.includes('<Tab.Screen name="Activity" component={AgentActivityScreen} />'));
check("A2 same tab label and icon as the buyer Activity tab; old Leads screen not in the tab bar",
  /Activity: \{\s*label: "Activity",\s*Icon: HugeClock,/.test(nav) && !nav.includes("AgentLeadsScreen") &&
  !nav.includes('name="Leads"'));
const agentDir = join(SRC, "features", "agent", "screens");
const strayLeads = readdirSync(agentDir).filter((f) => f.endsWith(".js") &&
  readFileSync(join(agentDir, f), "utf8").includes('navigation.navigate("Leads")'));
check("A3 no agent screen still navigates to the removed Leads tab", strayLeads.length === 0, strayLeads);

// --- B: buyer My Activity --------------------------------------------------------
const saved = src("features/buyer/screens/SavedScreen.js");
check("B1 the Agents tab, its counter, content and detail modal are gone",
  !saved.includes('setActiveTab("agents")') && !saved.includes("{agents.length}") &&
  !saved.includes("selectedAgentForModal") && !saved.includes("Verified Local Agents"));
check("B2 the five remaining tabs are unchanged",
  ["wishlist", "call", "messages", "visits", "viewed"].every((t) => saved.includes(`onPress={() => setActiveTab("${t}")}`)) &&
  saved.includes('const ACTIVITY_TABS = ["wishlist", "call", "messages", "visits", "viewed"];'));
check("B3 browse buttons go to Home for buyers and to the caller's route for agents",
  saved.includes('export default function SavedScreen({ navigation, route, browseRoute = "Home" })') &&
  !saved.includes('navigation.navigate("Home")') && (saved.match(/navigation\.navigate\(browseRoute\)/g) || []).length === 4);
check("B4 an old initialTab of \"agents\" falls back to the wishlist",
  saved.includes("ACTIVITY_TABS.includes(route?.params?.initialTab)"));

// --- O: owner lead source --------------------------------------------------------
check("O1 source_role maps to agent / buyer / unknown",
  owner.leadSourceRole("BROKER") === "agent" && owner.leadSourceRole("buyer") === "buyer" &&
  owner.leadSourceRole(undefined) === undefined && owner.leadSourceRole("OWNER") === undefined);
const row = (extra) => ({ id: 1, property_listing_id: 2, buyer_user_id: 77, status: "NEW", listing: null, ...extra });
check("O2 toOwnerLead carries the source role; nameless agents are not called buyers",
  owner.toOwnerLead(row({ source_role: "BROKER" })).sourceRole === "agent" &&
  owner.toOwnerLead(row({ source_role: "BROKER" })).customerName === "Agent #77" &&
  owner.toOwnerLead(row({ source_role: "BUYER" })).customerName === "Buyer #77" &&
  owner.toOwnerLead(row({})).sourceRole === undefined);
const badge = src("features/owner/components/LeadSourceBadge.js");
check("O3 the badge shows Buyer/Agent only for a known role (never a guess)",
  badge.includes('if (sourceRole !== "buyer" && sourceRole !== "agent") return null;') &&
  badge.includes('{isAgent ? "Agent" : "Buyer"}'));
for (const screen of ["OwnerLeadsScreen.js", "OwnerPropertyLeadsScreen.js"]) {
  const s = src(`features/owner/screens/${screen}`);
  check(`O4 ${screen} puts the badge on every lead card`,
    s.includes('import LeadSourceBadge from "../components/LeadSourceBadge.js";') &&
    s.includes("<LeadSourceBadge sourceRole={lead.sourceRole}"));
}

// --- P: agent property sheet = buyer sheet -----------------------------------------
const props = src("features/agent/screens/AgentPropertiesScreen.js");
const sheetCall = props.slice(props.indexOf("<PropertyDetailModal"), props.indexOf("/>", props.indexOf("<PropertyDetailModal")));
check("P1 agent screen renders the buyer sheet with the buyer screens' props (no agent-only bar)",
  !sheetCall.includes("isAgentView") && !sheetCall.includes("onMatchToLead") && !sheetCall.includes("onContactOwner") &&
  sheetCall.includes("isWishlisted={isWishlisted}") && sheetCall.includes("onToggleWishlist={toggleWishlist}") &&
  sheetCall.includes("onSelectProperty=") && sheetCall.includes("onLoginRequired={(resume) => requireAuth(resume)}"));
check("P2 the agent's separate contact-owner call (untracked dialer) is gone",
  !props.includes("handleContactOwner") && !props.includes("revealContactPhone") && !props.includes("tel:"));
const modal = src("features/buyer/components/PropertyDetailModal.js");
check("P3 the sheet has one bottom bar for everyone: Request Site Visit, Send Enquiry, Call",
  !modal.includes("isAgentView") && !modal.includes("Match to Lead") && modal.includes("onPress={handleRequestSiteVisit}") &&
  modal.includes("onPress={handleOpenEnquiryModal}") && modal.includes('accessibilityLabel="Call owner"'));
const dial = modal.slice(modal.indexOf("const dialOwner = "), modal.indexOf("const handleCallOwner = "));
check("P4 a call tap is recorded only when the dialler opens (not on reveal or render), once",
  (modal.match(/recordCallTap\(/g) || []).length === 1 && dial.includes("recordCallTap(backendId);") &&
  dial.indexOf("recordCallTap(backendId)") < dial.indexOf("Linking.openURL(url)") && dial.includes("const url = ownerDialUrl(phone);"));
check("P5 Got questions sends through the same enquiry API",
  modal.slice(modal.indexOf("const handleSendQuestion = "), modal.indexOf("const handleRequestSiteVisit = "))
    .includes("createEnquiry(backendId, question)"));
const wish = src("features/buyer/context/WishlistContext.js");
check("P6 the shared wishlist syncs with the server for agents too",
  wish.includes("const isBuyer = isBuyerCapableRole(user?.role);") && !wish.includes('user?.role === "BUYER"'));
const ownerSrc = src("features/owner/api/owner.js");
check("P7 owners get the agent call count and see it under Calls",
  ownerSrc.includes("agentCalls: typeof apiListing.agent_call_count === \"number\" ? apiListing.agent_call_count : null") &&
  src("features/owner/screens/OwnerPropertyDetailModal.js").includes("from agents</Text>"));

// --- T: agent Properties = buyer card; area-limited free trial ----------------------
const areaErr = { status: 402, data: { code: "AGENT_AREA_NOT_IN_PLAN", message: "Your free trial includes properties in one area. Upgrade your plan to explore properties in more areas." } };
const buyerErr = { status: 402, data: { code: "BUYER_PLAN_REQUIRED" } };
check("T1 an agent-area 402 is never mistaken for a buyer-plan 402",
  agentPlans.isAgentAreaRequired(areaErr) && !buyerPlans.isBuyerPlanRequired(areaErr) &&
  buyerPlans.isBuyerPlanRequired(buyerErr) && !agentPlans.isAgentAreaRequired(buyerErr) &&
  buyerPlans.isBuyerPlanRequired({ status: 402 }));
check("T2 the upgrade message is the server's (or the trial default)",
  agentPlans.agentAreaMessage(areaErr).includes("one area") &&
  agentPlans.agentAreaMessage({ status: 402, data: {} }) === agentPlans.AGENT_TRIAL_AREA_MESSAGE);
const upgrade = src("features/agent/utils/agentUpgrade.js");
check("T3 Upgrade opens the agent plans (Menu -> Agent Plan), not the buyer plans",
  upgrade.includes('export const AGENT_UPGRADE_ROUTE = "Menu";') && upgrade.includes('{ initialTab: "agent" }') &&
  !upgrade.includes("BuyerPlans") && !upgrade.includes("BUYER_PLANS_ROUTE"));
const props2 = src("features/agent/screens/AgentPropertiesScreen.js");
check("T4 agent cards are the buyer search card with the wishlist heart; Match Lead is gone",
  props2.includes("<PropertySearchCard") && props2.includes("saved={isWishlisted(item.id)}") &&
  props2.includes("onToggleWishlist={toggleWishlist}") && !props2.includes("Match Lead") &&
  !props2.includes("handleOpenMatchSheet") && !props2.includes("matchPropertyToLead") && !props2.includes("View Details"));
check("T5 View Number uses the shared sheet; the property sheet loads agent-scoped data",
  props2.includes("useViewNumber({ navigation, requireAuth })") && props2.includes("<ViewNumberSheet state={viewNumber} />") &&
  props2.includes('listingScope="agent"'));
const searchScr = src("features/buyer/screens/SearchScreen.js");
check("T6 the buyer Search screen renders the same shared card and sheet",
  searchScr.includes("<PropertySearchCard") && searchScr.includes("<ViewNumberSheet state={viewNumber} />"));
const cardSrc = src("features/buyer/components/PropertySearchCard.js");
const viewNumberCatch = cardSrc.slice(cardSrc.indexOf("const handleViewNumber"), cardSrc.indexOf("const handleLoginFromSheet"));
check("T7 View Number: an agent outside its areas gets the agent upgrade before any buyer-plan routing",
  viewNumberCatch.indexOf("isAgentAreaRequired(e)") > -1 &&
  viewNumberCatch.indexOf("isAgentAreaRequired(e)") < viewNumberCatch.indexOf("isBuyerPlanRequired(e)"));
const listingsSrc = src("features/buyer/api/listings.js");
check("T8 agent detail and similar come from the area-restricted /broker endpoints",
  listingsSrc.includes("apiGetAuth(`/broker/listings/${listingId}`)") &&
  listingsSrc.includes("apiGetAuth(`/broker/listings/${listingId}/similar`, { limit })"));
const modal2 = src("features/buyer/components/PropertyDetailModal.js");
check("T9 the property sheet passes the scope and offers the agent upgrade on every area refusal",
  modal2.includes("fetchListingDetail(backendId, { scope: listingScope })") &&
  modal2.includes("fetchSimilar(backendId, 5, { scope: listingScope })") &&
  (modal2.match(/if \(isAgentAreaRequired\(e\)\) \{/g) || []).length >= 5);
const ctx2 = src("features/agent/context/AgentContext.js");
check("T10 the free trial has no invented day count; the plan's load state is known",
  ctx2.includes(": null;") && ctx2.includes("setPlanLoaded(true)") && ctx2.includes("planLoaded,"));
check("T11 startAgentTrial posts the one area to /broker/trial",
  src("shared/api/agentPlans.js").includes('apiPost("/broker/trial", { locality: String(locality || "").trim() })'));
const pick = src("features/agent/screens/AgentLocationSelectScreen.js");
check("T12 trial setup: exactly one area (a new pick replaces it), Start Free Trial, no payment route",
  pick.includes('route?.params?.trial === true && !allowance.active') && pick.includes("setSelectedLocalities([locName]);") &&
  pick.includes('"Start Free Trial (1 area)"') && pick.includes("startAgentTrial(selectedLocalities[0])"));
check("T13 a trial agent trying a second area gets the upgrade prompt",
  pick.includes("if (isLimitReached && mode === \"add\" && activePlan?.isTrial) {") && pick.includes("promptAgentUpgrade(navigation, null);"));
const nav2 = src("features/agent/navigation/AgentNavigator.js");
check("T14 an agent without a plan picks the trial area before the agent tabs open (only then)",
  nav2.includes("if (!planLoaded) return <AgentSpinner />;") && nav2.includes("if (!hasActivePlan) {") &&
  nav2.includes("route={{ params: { trial: true } }}") && nav2.includes("return <AgentModeGate />;"));
check("T15 the Menu offers the free trial when there is no agent plan",
  src("features/buyer/screens/MenuScreen.js").includes('navigation.navigate("AgentLocationSelect", { trial: true })'));

// --- U. Trial area showed zero properties (role BUYER + locality postcodes) ---
const { createRoleGuard } = await load("shared/api/roleSwitchCore.js");
const posted = [];
const guard = createRoleGuard({ setMyRole: async (role) => { posted.push(role); return { role }; }, getToken: () => "t" });
await guard.ensureRole({ user: { role: "BUYER" }, refreshMe: async () => ({ role: "BROKER" }) }, "BROKER");
await guard.ensureRole({ user: { role: "BROKER" } }, "BROKER");
check("U1 entering agent mode from buyer mode switches the server role to BROKER (once; no POST when already BROKER)",
  posted.length === 1 && posted[0] === "BROKER", posted);
const gate = nav2.slice(nav2.indexOf("function AgentModeGate()"), nav2.indexOf("function AgentSpinner()"));
check("U2 the agent tabs open only after the server confirms BROKER, then the inventory reloads",
  gate.includes('await ensureRole(auth, "BROKER");') && gate.indexOf("reloadInventory();") > gate.indexOf("ensureRole(auth") &&
  gate.includes('if (roleState === "error")') && gate.includes("onPress={confirmRole}") &&
  gate.indexOf("return <AgentTabs />;") > gate.indexOf('if (roleState === "pending")'));
const ctxU = src("features/agent/context/AgentContext.js");
check("U3 a failed inventory load is an error state with a reload, never an empty list posing as 'no properties'",
  ctxU.includes('setInventoryStatus(failed ? "error" : "ready");') && ctxU.includes("}, [localitiesKey, inventoryVersion]);") &&
  ctxU.includes("inventoryStatus,\n    reloadInventory,"));
const propsU = src("features/agent/screens/AgentPropertiesScreen.js");
check("U4 Properties shows loading / 'Could not load properties.' + Try Again before the empty state",
  propsU.indexOf('inventoryStatus === "loading"') > -1 &&
  propsU.indexOf('"Could not load properties."') < propsU.indexOf('"No properties available in your selected locations."') &&
  propsU.includes("onButtonPress={reloadInventory}"));

console.log(failures ? `\n${failures} failure(s)` : "\nall agent-activity checks passed");
process.exit(failures ? 1 : 0);
