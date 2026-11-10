/**
 * Pure agent-module logic (no React Native imports), tested by
 * scripts/agent-flow.test.mjs:
 *
 *   - toAgentProfile: the agent profile header comes from the LOGGED-IN
 *     account (AuthContext user), never a seeded or unrelated identity.
 *   - Coverage inventory: listings fetched per plan locality are kept only
 *     when their locality IS that plan locality (the public search matches
 *     substrings, so "Anna Nagar" would also return "Anna Nagar West"), and
 *     each property remembers which plan locality it belongs to.
 *   - filterAgentProperties: deal, locality, type, BHK, budget and smart
 *     search applied together, so no filter resets or bypasses another.
 *   - Plan allowance: how many of the paid localities are still unused, and
 *     whether the location picker should add under the active plan (no
 *     payment) or go through the normal purchase flow.
 */

export const ALL_LOCATIONS = "All Locations";

/** Lower-case, dots dropped ("T. Nagar" -> "t nagar"), other punctuation -> space. */
export function normalizeSearchText(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9₹\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Spelling-insensitive key for a locality name ("T. Nagar" == "T Nagar" == "tnagar"). */
export function localityKey(name) {
  return normalizeSearchText(name).replace(/\s+/g, "");
}

// --- Profile ----------------------------------------------------------------------

/**
 * AuthContext user -> the agentProfile the agent screens read. Only fields
 * the account really has; missing ones are null (the screen shows a neutral
 * placeholder). A phone-number display name is never shown as a name.
 */
export function toAgentProfile(user) {
  if (!user || user.id == null) return null;
  const isPhone = (v) => typeof v === "string" && /^\+?\d[\d\s-]{6,}$/.test(v.trim());
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const candidates = [user.isProfileComplete ? user.display_name : null, full, user.name];
  const name = candidates.find((v) => typeof v === "string" && v.trim() && !isPhone(v) && v !== "User") || null;
  const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    id: user.id,
    name: name ? name.trim() : null,
    phone: clean(user.phone),
    email: clean(user.email),
    avatar: clean(user.avatar),
  };
}

// --- Coverage inventory ---------------------------------------------------------

/**
 * Merge per-locality search pages into the agent's inventory.
 * pages[i] holds the backend cards fetched for localities[i]. A card is kept
 * only when its own locality is that plan locality; duplicates collapse.
 * `toUi(card)` maps a backend card to the UI property.
 */
export function mergeCoverageListings(localities, pages, toUi) {
  const seen = new Map();
  (localities || []).forEach((planLocality, i) => {
    const key = localityKey(planLocality);
    ((pages && pages[i]) || []).forEach((card) => {
      if (!card || card.listing_id == null || localityKey(card.locality) !== key) return;
      if (seen.has(card.listing_id)) return;
      const ui = toUi(card);
      ui.coverageLocality = planLocality;
      seen.set(card.listing_id, ui);
    });
  });
  return Array.from(seen.values());
}

/** Options for the locality filter: All Locations, then each plan locality once. */
export function locationFilterOptions(selectedLocalities) {
  const out = [ALL_LOCATIONS];
  const keys = new Set();
  (selectedLocalities || []).forEach((name) => {
    const key = localityKey(name);
    if (!key || keys.has(key)) return;
    keys.add(key);
    out.push(name);
  });
  return out;
}

/** True when the property belongs to the chosen plan locality (All Locations = any). */
export function matchesLocality(item, locality) {
  if (!locality || locality === ALL_LOCATIONS) return true;
  const key = localityKey(locality);
  return localityKey(item && (item.coverageLocality || item.locality)) === key;
}

// --- Smart search ---------------------------------------------------------------

const STOPWORDS = new Set(["in", "at", "near", "for", "with", "the", "a", "an", "and", "of", "on", "to", "property", "properties"]);

// Each query word may match any of these words (lower case).
const SYNONYMS = {
  flat: ["flat", "apartment"],
  flats: ["flat", "apartment"],
  apartments: ["apartment"],
  apt: ["apartment"],
  buy: ["buy", "sale"],
  sale: ["sale", "buy"],
  sell: ["sale", "buy"],
  purchase: ["buy", "sale"],
  rental: ["rent"],
  renting: ["rent"],
  leasing: ["lease"],
  home: ["home", "house"],
  homes: ["home", "house"],
  houses: ["house"],
  villas: ["villa"],
  office: ["office", "commercial"],
  shop: ["shop", "commercial"],
  land: ["land", "plot"],
  plots: ["plot"],
  furnished: ["furnished"],
};

const DEAL_WORDS = {
  sale: "buy sale",
  resale: "buy sale resale",
  rent: "rent rental",
  lease: "lease",
};

function haystack(item) {
  const beds = Number(item.beds);
  const parts = [
    item.title,
    item.coverageLocality,
    item.locality,
    item.location,
    item.address,
    item.city,
    item.pincode,
    item.type,
    DEAL_WORDS[item.badgeType] || "",
    item.description,
    item.furnishing,
    item.constructionStatus,
    Number.isFinite(beds) && beds > 0 ? `${beds} bhk ${beds}bhk` : "",
  ];
  const fields = parts.map(normalizeSearchText).filter(Boolean);
  // Compacted per field ("|"-joined) so a match can't straddle two fields.
  return { text: fields.join(" "), compact: fields.map((f) => f.replace(/\s+/g, "")).join("|") };
}

/** Query -> list of alternatives per term ("2 bhk" -> "2bhk", "t nagar" -> "tnagar"). */
export function searchTerms(query) {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  const terms = [];
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    if (/^\d+$/.test(w) && (words[i + 1] === "bhk" || words[i + 1] === "bk")) {
      w = `${w}bhk`;
      i++;
    } else if (/^\d+bk$/.test(w)) {
      w = w.replace(/bk$/, "bhk");
    } else if (/^[a-z]$/.test(w) && words[i + 1]) {
      // A lone initial belongs to the next word: "t nagar" -> "tnagar".
      w = `${w}${words[i + 1]}`;
      i++;
    }
    if (STOPWORDS.has(w)) continue;
    const alts = new Set(SYNONYMS[w] || [w]);
    if (w.length > 3 && w.endsWith("s")) alts.add(w.slice(0, -1));
    terms.push(Array.from(alts));
  }
  return terms;
}

/**
 * Every term must appear somewhere in the property (title, locality, address,
 * city, pincode, type, deal, BHK, description, ...), as a case-insensitive
 * partial match, ignoring dots and spaces ("tnagar" finds "T. Nagar").
 * An empty query matches everything.
 */
export function matchesAgentSearch(item, query) {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;
  const { text, compact } = haystack(item || {});
  return terms.every((alts) => alts.some((t) => text.includes(t) || compact.includes(t.replace(/\s+/g, ""))));
}

// --- Filters --------------------------------------------------------------------

function isMonthly(item) {
  // Rent is always a monthly figure, even when a listing was saved without
  // the MONTHLY period (its price then shows no "/mo").
  return /\/\s*mo(nth)?\b/i.test(String(item.price || "")) || item.transactionType === "RENT";
}

function rupees(item) {
  if (Number.isFinite(item.rawPrice)) return item.rawPrice;
  const n = parseInt(String(item.price || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

const BUDGETS = {
  "Under ₹25K": { monthly: true, max: 25000 },
  "₹25K – ₹50K": { monthly: true, min: 25000, max: 50000 },
  "₹50K – ₹1L": { monthly: true, min: 50000, max: 100000 },
  "Under ₹1.5 Cr": { monthly: false, max: 15000000 },
  "₹1.5 Cr – ₹3 Cr": { monthly: false, min: 15000000, max: 30000000 },
};

export function matchesBudget(item, budget) {
  const range = BUDGETS[budget];
  if (!range) return true;
  if (isMonthly(item) !== range.monthly) return false;
  const value = rupees(item);
  if (value == null) return false;
  if (range.min != null && value < range.min) return false;
  if (range.max != null && value > range.max) return false;
  return true;
}

export function matchesDeal(item, deal) {
  if (!deal || deal === "All") return true;
  if (deal === "Buy") return item.badgeType === "sale" || item.badgeType === "resale";
  if (deal === "Rent") return item.badgeType === "rent";
  if (deal === "Lease") return item.badgeType === "lease";
  return true;
}

export function matchesBhk(item, bhk) {
  if (!bhk || bhk === "All BHK") return true;
  const beds = Number(item.beds);
  if (!Number.isFinite(beds)) return false;
  if (bhk === "4+ BHK") return beds >= 4;
  return beds === parseInt(bhk, 10);
}

export function matchesType(item, type) {
  if (!type || type === "All Types") return true;
  return String(item.type || "").toLowerCase() === type.toLowerCase();
}

/** All agent filters together. Each one only ever narrows the list. */
export function filterAgentProperties(items, filters = {}) {
  const { deal, locality, type, bhk, budget, query } = filters;
  return (items || []).filter(
    (item) =>
      item &&
      matchesDeal(item, deal) &&
      matchesLocality(item, locality) &&
      matchesType(item, type) &&
      matchesBhk(item, bhk) &&
      matchesBudget(item, budget) &&
      matchesAgentSearch(item, query)
  );
}

// --- Plan allowance -------------------------------------------------------------

/** {limit, used, remaining, active} for the agent's current plan. */
export function planAllowance(agentPlan, selectedLocalities, { hasActivePlan = false, isPlanExpired = false } = {}) {
  const limit = Number(agentPlan && agentPlan.locationLimit) || 0;
  const used = new Set((selectedLocalities || []).map(localityKey).filter(Boolean)).size;
  const active = Boolean(hasActivePlan && !isPlanExpired && agentPlan && limit > 0);
  return { limit, used, remaining: active ? Math.max(0, limit - used) : 0, active };
}

/**
 * "add": the picker adds localities under the active plan (no payment).
 * "purchase": no usable plan, or the agent picked a different tier.
 */
export function locationSelectMode(allowance, activePlan, pickedPlan) {
  if (!allowance || !allowance.active || !activePlan) return "purchase";
  if (!pickedPlan) return "add";
  if (pickedPlan.id && activePlan.id) return pickedPlan.id === activePlan.id ? "add" : "purchase";
  return Number(pickedPlan.locationLimit) === Number(activePlan.locationLimit) ? "add" : "purchase";
}

/** Chosen localities that the plan does not cover yet (spelling-insensitive, once each). */
export function newLocalitiesToAdd(chosen, existing) {
  const have = new Set((existing || []).map(localityKey));
  const out = [];
  (chosen || []).forEach((name) => {
    const key = localityKey(name);
    if (!key || have.has(key)) return;
    have.add(key);
    out.push(name);
  });
  return out;
}
