// Regression tests for the agent flow:
//   P  Agent Profile shows the LOGGED-IN account (it said "Agent profile
//      unavailable": the context never filled agentProfile) and no unrelated
//      identity, invented counts or hard-coded expiry
//   S  Smart property search: partial, case/spelling-insensitive, across
//      title/locality/address/type/deal/BHK, combined with every filter
//   L  Locality filter: All Locations = exactly the plan localities; a pick
//      stays picked (the chip used to advance to the next locality per tap)
//   A  Plan allowance: unused paid localities are added under the active plan
//      without payment (POST /broker/plan/localities); a different tier or no
//      plan keeps the purchase flow
// Run with: node scripts/agent-flow.test.mjs  (plain node, no deps)
//
// src/ is copied to a tmp dir as an ES module tree so pure modules import
// for real; React screens are guarded by source-text assertions.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const src = (p) => readFileSync(join(SRC, p), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "agent-flow-test-"));
cpSync(SRC, join(tmp, "src"), { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
const load = (rel) => import(pathToFileURL(join(tmp, "src", rel)).href);

const core = await load("features/agent/utils/agentCore.js");
const mappers = await load("shared/api/mappers.js");
const client = await load("shared/api/client.js");
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

// --- P: profile identity ------------------------------------------------------------
const { toAgentProfile } = core;
const named = toAgentProfile({
  id: 7, display_name: "Priya Raman", isProfileComplete: true, name: "Priya Raman",
  firstName: "Priya", lastName: "Raman", phone: "+919800000001", email: null, avatar: null,
});
check("P1 the logged-in account's name and phone are shown", named.id === 7 && named.name === "Priya Raman" &&
  named.phone === "+919800000001");
check("P2 missing optional fields stay null (no invented email/photo)", named.email === null && named.avatar === null);
const phoneOnly = toAgentProfile({
  id: 8, display_name: "+919800000002", isProfileComplete: false, name: "+919800000002",
  firstName: "", lastName: "", phone: "+919800000002",
});
check("P3 a phone-number display name is never shown as the name", phoneOnly.name === null &&
  phoneOnly.phone === "+919800000002");
const bare = toAgentProfile({ id: 9, name: "User" });
check("P4 an account with nothing set still yields a profile (no crash)", bare && bare.name === null &&
  bare.phone === null && bare.email === null);
check("P5 logged out -> no profile", toAgentProfile(null) === null && toAgentProfile({}) === null);
const ctxSrc = src("features/agent/context/AgentContext.js");
check("P6 context derives agentProfile from the authenticated user", ctxSrc.includes("toAgentProfile(authUser)") &&
  !/useState\(null\);\s*\n[^\n]*\n?[^\n]*agentProfile/.test(ctxSrc));
const profileSrc = src("features/agent/screens/AgentProfileScreen.js");
check("P7 profile screen has no unrelated agent email, invented counts or fixed expiry",
  !/vikram/i.test(profileSrc) && !profileSrc.includes("|| 126") && !profileSrc.includes("|| 18") &&
  !profileSrc.includes("20 Nov 2026") && profileSrc.includes("agentPlan?.expiryDate"));
check("P8 a nameless agent sees 'Add your name', not 'unavailable'", profileSrc.includes('agentProfile.name || "Add your name"'));

// --- inventory fixtures -----------------------------------------------------------
const BADGE = { BUY: "sale", RESALE: "resale", RENT: "rent", LEASE: "lease" };
const card = (id, o) => ({
  listing_id: id, title: o.title, price_paise: o.rupees * 100, price_period: o.monthly ? "MONTHLY" : "TOTAL",
  price_display: o.display, transaction_type: o.deal, property_type: o.type || "APARTMENT",
  construction_status: null, description: o.description || null, area_value: 1000, area_unit: "sqft",
  bedrooms: o.beds ?? null, bathrooms: null, address_line: o.address || null, locality: o.locality,
  city: "Chennai", pincode: o.pincode || "600020", location_label: `${o.locality}, Chennai ${o.pincode || "600020"}`,
  cover_image_url: null,
});
const toUi = (c) => {
  const ui = mappers.toUiProperty(c);
  ui.badgeType = BADGE[ui.transactionType] || "sale";
  return ui;
};
const plan = ["Adyar", "Anna Nagar", "T Nagar"];
const pages = [
  [
    card(1, { title: "Sea Breeze Residency", locality: "Adyar", deal: "RENT", rupees: 22000, monthly: true, display: "₹22,000/mo", beds: 2, address: "4 Gandhi Nagar 2nd St" }),
    card(2, { title: "Riverside Villa", locality: "Adyar", deal: "BUY", rupees: 24000000, display: "₹2.40 Cr", beds: 4, type: "VILLA" }),
  ],
  [
    card(3, { title: "Green Park Flats", locality: "Anna Nagar", deal: "BUY", rupees: 9500000, display: "₹95.00 L", beds: 3 }),
    // The public search matches substrings: "Anna Nagar" also returns West.
    card(4, { title: "West Tower", locality: "Anna Nagar West", deal: "RENT", rupees: 30000, monthly: true, display: "₹30,000/mo", beds: 2 }),
    card(1, { title: "Sea Breeze Residency", locality: "Adyar", deal: "RENT", rupees: 22000, monthly: true, display: "₹22,000/mo", beds: 2 }),
  ],
  [
    card(5, { title: "Pondy Bazaar Office", locality: "T. Nagar", deal: "LEASE", rupees: 120000, monthly: true, display: "₹1.20 L/mo", type: "COMMERCIAL" }),
    card(6, { title: "Usman Road Home", locality: "T Nagar", deal: "RENT", rupees: 45000, monthly: true, display: "₹45,000/mo", beds: 3, type: "HOUSE" }),
  ],
];
const inventory = core.mergeCoverageListings(plan, pages, toUi);
const ids = (list) => list.map((p) => p.id).sort((a, b) => a - b);

// --- L: locality filter -------------------------------------------------------------
check("L1 All Locations = exactly the plan localities (no 'Anna Nagar West', no duplicates)",
  JSON.stringify(ids(inventory)) === "[1,2,3,5,6]", ids(inventory));
check("L2 mapper keeps the structured locality", inventory.every((p) => typeof p.locality === "string"));
const opts = core.locationFilterOptions([...plan, "adyar"]);
check("L3 picker options: All Locations then each plan locality once", JSON.stringify(opts) ===
  JSON.stringify(["All Locations", "Adyar", "Anna Nagar", "T Nagar"]), opts);
const pick = (locality) => ids(core.filterAgentProperties(inventory, { locality }));
check("L4 Adyar -> only Adyar", JSON.stringify(pick("Adyar")) === "[1,2]", pick("Adyar"));
check("L5 Anna Nagar -> only Anna Nagar", JSON.stringify(pick("Anna Nagar")) === "[3]", pick("Anna Nagar"));
check("L6 T Nagar -> both spellings of T Nagar", JSON.stringify(pick("T Nagar")) === "[5,6]", pick("T Nagar"));
check("L7 All Locations -> all", JSON.stringify(pick("All Locations")) === "[1,2,3,5,6]");
check("L8 picking the same locality again keeps it (no cycling)",
  JSON.stringify(pick("Adyar")) === JSON.stringify(pick("Adyar")));
check("L9 locality + deal + BHK + budget combine",
  JSON.stringify(ids(core.filterAgentProperties(inventory, { locality: "Adyar", deal: "Rent", bhk: "2 BHK", budget: "Under ₹25K" }))) === "[1]");
check("L10 locality + type", JSON.stringify(ids(core.filterAgentProperties(inventory, { locality: "T Nagar", type: "House" }))) === "[6]");
const propsSrc = src("features/agent/screens/AgentPropertiesScreen.js");
check("L11 the location chip opens a picker; no tap-to-advance cycling",
  propsSrc.includes("onPress={() => setLocalityPickerOpen(true)}") && !propsSrc.includes("% options.length") &&
  propsSrc.includes("setSelectedLocalityFilter(option);"));
check("L12 the agent inventory comes from the server's area-restricted endpoint",
  ctxSrc.includes('apiGetAuth("/broker/listings", { page, page_size: 100 })') && !ctxSrc.includes('apiGet("/buyer/listings"'));

// --- S: smart search ------------------------------------------------------------
const search = (query, extra = {}) => ids(core.filterAgentProperties(inventory, { query, ...extra }));
check("S1 partial + any capitalisation", JSON.stringify(search("ADY")) === "[1,2]" &&
  JSON.stringify(search("riverS")) === "[2]", [search("ADY"), search("riverS")]);
check("S2 locality spellings: 't nagar', 'T. Nagar', 'tnagar'",
  ["t nagar", "T. Nagar", "tnagar"].every((q) => JSON.stringify(search(q)) === "[5,6]"));
check("S3 address text matches", JSON.stringify(search("gandhi")) === "[1]");
check("S4 property type and synonyms ('flat' finds apartments)", JSON.stringify(search("villa")) === "[2]" &&
  JSON.stringify(search("flat")) === "[1,3]", [search("villa"), search("flat")]);
check("S5 BHK in any form ('2 bhk', '2bhk', '2BHK')", ["2 bhk", "2bhk", "2BHK"].every((q) => JSON.stringify(search(q)) === "[1]"));
check("S6 deal words ('rent adyar', 'lease', 'buy')", JSON.stringify(search("rent adyar")) === "[1]" &&
  JSON.stringify(search("lease")) === "[5]" && JSON.stringify(search("buy")) === "[2,3]");
check("S7 every word must match somewhere (not overly loose)", JSON.stringify(search("villa anna")) === "[]");
check("S8 filler words are ignored ('3 bhk in anna nagar')", JSON.stringify(search("3 bhk in anna nagar")) === "[3]");
check("S9 search respects the chosen filters (never bypasses them)",
  JSON.stringify(search("adyar", { deal: "Buy" })) === "[2]" &&
  JSON.stringify(search("sea", { locality: "Anna Nagar" })) === "[]");
check("S10 empty / whitespace query -> everything", JSON.stringify(search("   ")) === "[1,2,3,5,6]");
check("S11 pincode matches", JSON.stringify(search("600020")) === "[1,2,3,5,6]");
check("S12 budgets use the real rupee amount ('₹1.20 L/mo' is not under ₹25K)",
  JSON.stringify(ids(core.filterAgentProperties(inventory, { budget: "Under ₹25K" }))) === "[1]" &&
  JSON.stringify(ids(core.filterAgentProperties(inventory, { budget: "Under ₹1.5 Cr" }))) === "[3]" &&
  JSON.stringify(ids(core.filterAgentProperties(inventory, { budget: "₹1.5 Cr – ₹3 Cr" }))) === "[2]");
const rentNoPeriod = toUi(card(9, { title: "Plain Rent", locality: "Adyar", deal: "RENT", rupees: 20000, display: "₹20,000", beds: 1 }));
check("S12b a rent listing saved without /mo still counts as monthly rent",
  core.matchesBudget(rentNoPeriod, "Under ₹25K") && !core.matchesBudget(rentNoPeriod, "Under ₹1.5 Cr"));
check("S13 screen uses the shared filter with every filter + search",
  /filterAgentProperties\(localityProperties, \{\s*deal: selectedDealType,\s*locality: selectedLocalityFilter,\s*type: selectedType,\s*bhk: selectedBhk,\s*budget: selectedBudget,\s*query: searchQuery,/.test(propsSrc));

// --- A: plan allowance ------------------------------------------------------------
const starter = { id: "agent-starter", locationLimit: 5 };
const three = ["Adyar", "Anna Nagar", "T Nagar"];
const a = core.planAllowance(starter, three, { hasActivePlan: true });
check("A1 3 of 5 used -> 2 remaining", a.used === 3 && a.limit === 5 && a.remaining === 2 && a.active);
check("A2 expired or missing plan -> no allowance",
  core.planAllowance(starter, three, { hasActivePlan: true, isPlanExpired: true }).remaining === 0 &&
  !core.planAllowance(null, [], { hasActivePlan: false }).active);
check("A3 same plan -> add (no payment)", core.locationSelectMode(a, starter, starter) === "add" &&
  core.locationSelectMode(a, starter, null) === "add");
check("A4 a different tier or no active plan -> purchase flow",
  core.locationSelectMode(a, starter, { id: "agent-pro", locationLimit: 10 }) === "purchase" &&
  core.locationSelectMode(core.planAllowance(null, [], {}), null, starter) === "purchase");
check("A5 only new localities are sent (spelling-insensitive, once each)",
  JSON.stringify(core.newLocalitiesToAdd(["Adyar", "T. Nagar", "Velachery", "velachery", "Porur"], three)) ===
  JSON.stringify(["Velachery", "Porur"]));
const exhausted = core.planAllowance(starter, [...three, "Velachery", "Porur"], { hasActivePlan: true });
check("A6 5 of 5 -> nothing remaining", exhausted.remaining === 0 && exhausted.used === 5);

// API: the add call goes to the no-payment endpoint, never subscribe.
const calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || "GET", body: options.body });
  const ok = { has_plan: true, plan_id: "agent-starter", locality_limit: 5, localities: [...three, "Velachery"],
    localities_remaining: 1, added_localities: ["Velachery"], unmatched_localities: [] };
  return { ok: true, status: 200, json: async () => ok, text: async () => JSON.stringify(ok), headers: { get: () => "application/json" } };
};
client.setAuthToken("test-token");
const added = await agentPlans.addAgentPlanLocalities(["Velachery"]);
check("A7 addAgentPlanLocalities POSTs /broker/plan/localities with the new names only",
  calls.length === 1 && calls[0].method === "POST" && calls[0].url.endsWith("/broker/plan/localities") &&
  JSON.parse(calls[0].body).localities.join() === "Velachery" && !calls[0].url.includes("subscribe"), calls);
check("A8 server remaining allowance reaches the UI plan", agentPlans.toUiAgentPlan(added).localitiesRemaining === 1);

const pickSrc = src("features/agent/screens/AgentLocationSelectScreen.js");
const addBranch = pickSrc.slice(pickSrc.indexOf("const handleContinue"), pickSrc.indexOf('navigation.navigate("AgentPlanConfirm"'));
check("A9 picker adds under the active plan before any route to payment",
  addBranch.includes('if (mode === "add") {') && addBranch.includes("addUnderActivePlan();") &&
  pickSrc.includes("addAgentPlanLocalities(toAdd)"));
check("A10 switching tier switches the plan id (purchase buys the chosen tier)",
  /setCurrentPlan\(\(prev\) => \(\{\s*\.\.\.prev,[\s\S]{0,120}id: tier\.id,/.test(pickSrc));
check("A11 covered localities can't be dropped in add mode; remaining shown",
  pickSrc.includes("coveredKeys.has(key)") && pickSrc.includes("remaining`"));
check("A12 profile shows the remaining allowance", profileSrc.includes("more included in your plan (no extra payment)"));

console.log(failures ? `\n${failures} failure(s)` : "\nall agent-flow checks passed");
process.exit(failures ? 1 : 0);
