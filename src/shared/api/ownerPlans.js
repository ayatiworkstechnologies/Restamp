/**
 * Owner (seller) and Dealer plans against the current backend.
 *
 * Owner and Dealer are MUTUALLY EXCLUSIVE account types on the backend
 * (users.poster_type; a second type is refused with 409 POSTER_TYPE_CONFLICT).
 *
 * Owner:
 *   GET  /subscriptions/me  -> subscriptions.OWNER.subscription
 *   POST /subscriptions/bypass { plan_code: RESTAMP_OWNER_* } (mode OWNER)
 *
 * Dealer (a BROKER plan with areas, priced per pincode in the app):
 *   GET  /broker/plan                -> { has_plan, plan_code, valid_until, localities[] }
 *   GET  /locations/agent-groups     -> areas a dealer can choose: the Agent
 *                                       Location Master, one per PIN code
 *   POST /subscriptions/bypass       smallest BROKER plan covering the area count
 *   POST /broker/plan/localities     the chosen areas
 */
import { fetchAgentLocationGroups, groupLabel } from "./dealerLocations.js";
import { activatePlan, fetchMySubscriptions, fetchCapabilities } from "./subscriptions.js";
import { fetchAgentPlan, activateBrokerPlan, brokerPlanCodeFor } from "./dealerAreaPlans.js";

export { fetchCapabilities };

// App card id -> backend plan code (scripts/seed_plans.py).
const OWNER_CODES = {
  "owner-super": "RESTAMP_OWNER_SUPER",
  "owner-premium": "RESTAMP_OWNER_PREMIUM",
  "owner-elite": "RESTAMP_OWNER_ELITE",
  "owner-special": "RESTAMP_OWNER_SPECIAL",
  "owner-business": "RESTAMP_OWNER_BUSINESS",
  "owner-unlimited-business": "RESTAMP_OWNER_UNLIMITED_BUSINESS",
};
const OWNER_IDS = Object.fromEntries(Object.entries(OWNER_CODES).map(([id, code]) => [code, id]));

const days = (start, end) =>
  start && end ? Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000)) : null;

/**
 * The caller's active owner plan in the shape the Owner screens use
 * ({ active, plan_id, name, listing_limit, start_date, end_date,
 * duration_days }), or null (none / not logged in / error).
 */
export async function fetchOwnerPlan() {
  const me = await fetchMySubscriptions();
  const sub = me?.subscriptions?.OWNER?.subscription;
  if (!sub || sub.status !== "ACTIVE") return null;
  const plan = sub.plan || {};
  const limit = plan.listing_limit;
  return {
    active: true,
    plan_id: OWNER_IDS[plan.code] || plan.code,
    plan_code: plan.code,
    name: plan.name,
    listing_limit: limit == null || limit < 0 ? null : limit,
    start_date: sub.start_date,
    end_date: sub.end_date,
    duration_days: plan.duration_days || days(sub.start_date, sub.end_date),
  };
}

/** Activate an owner plan (app id or code). Rejects on failure, including
 *  409 POSTER_TYPE_CONFLICT for a Dealer account. */
export async function subscribeOwnerPlan(planId) {
  return activatePlan(OWNER_CODES[planId] || planId, "OWNER");
}

/**
 * The caller's active dealer plan, or null. A dealer plan is the account's
 * BROKER plan when the account is a Dealer (poster type BROKER).
 * Shape: { active, plan_id, name, listing_limit, start_date, end_date,
 * duration_days, pincodes, localities, is_trial }.
 */
export async function fetchDealerPlan() {
  const [st, caps] = await Promise.all([fetchAgentPlan(), fetchCapabilities()]);
  if (!st || !st.has_plan || (caps && caps.poster_type && caps.poster_type !== "BROKER")) return null;
  return {
    active: true,
    plan_id: st.plan_code || st.plan_id,
    plan_code: st.plan_code,
    name: st.plan_name,
    listing_limit: null,
    start_date: st.start_date,
    end_date: st.valid_until,
    duration_days: days(st.start_date, st.valid_until),
    localities: st.localities || [],
    pincodes: st.localities || [],
    is_trial: !!st.is_trial,
  };
}

/**
 * Buy a dealer plan for the chosen areas (locality names from the
 * catalogue). Uses the smallest backend BROKER plan that covers them.
 * Rejects on failure (409 POSTER_TYPE_CONFLICT for an Owner account).
 */
export async function subscribeDealerPlan(_planId, localities = []) {
  const names = Array.isArray(localities) ? localities : [];
  const code = await brokerPlanCodeFor(Math.max(1, names.length));
  return activateBrokerPlan(code, names);
}

/**
 * Areas a dealer can choose — the Agent Location Master, one per PIN code:
 * [{ name: "<primary> - <pincode>", primary, pincode, pincodes, zone,
 * localities }]. `name` is the selection value (converted to the stable
 * group id when the plan is saved). Rejects on failure.
 */
export async function fetchDealerPincodes() {
  const items = await fetchAgentLocationGroups({ force: true });
  return items.map((g) => ({
    name: groupLabel(g),
    primary: g.primary_name,
    pincode: g.pincode,
    pincodes: g.pincode ? [g.pincode] : [],
    zone: g.zone,
    localities: g.localities || [],
  }));
}
