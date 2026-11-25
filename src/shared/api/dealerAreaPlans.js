/**
 * Agent (BROKER) plans — server-saved, so a purchased plan survives reloads
 * and new logins.
 *
 *   GET  /broker/plan                    -> { has_plan, plan_id, plan_name,
 *                                            locality_limit, valid_until,
 *                                            localities[] }
 *   Purchase = POST /subscriptions/bypass (BROKER plan code, after switching
 *        the mode to BROKER) + POST /broker/plan/localities. The simulated
 *        /broker/plans/{id}/subscribe is refused outside development.
 *   POST /broker/plan/localities         -> same shape + added_localities
 *        body { localities: [names] }       uses the ACTIVE plan's unused
 *                                           allowance: no payment; 409 without
 *                                           a plan, 422 over the plan limit
 *
 * Purchasing grants coverage for the chosen localities and switches the
 * account's role to BROKER.
 */
import { apiGet, apiGetAuth, apiPost } from "./client.js";
import { activatePlan } from "./subscriptions.js";
import { toPlanChoice } from "./dealerLocations.js";

/** Purchasable BROKER plans: [{ code, app_id, name, price_paise,
 *  duration_days, locality_limit }]. [] on error. */
export async function fetchBrokerPlanCatalogue() {
  try {
    const data = await apiGet("/broker/plans");
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

/** Server plan code for an app card id ("agent-starter") or a code. */
export async function brokerPlanCode(planIdOrCode) {
  const items = await fetchBrokerPlanCatalogue();
  const hit = items.find((p) => p.app_id === planIdOrCode || p.code === planIdOrCode);
  return hit ? hit.code : planIdOrCode;
}

/** Smallest purchasable BROKER plan covering `count` localities (largest if none). */
export async function brokerPlanCodeFor(count) {
  const items = (await fetchBrokerPlanCatalogue())
    .filter((p) => (p.price_paise || 0) > 0)
    .sort((a, b) => (a.locality_limit || 0) - (b.locality_limit || 0));
  const fit = items.find((p) => (p.locality_limit || 0) >= count) || items[items.length - 1];
  if (!fit) throw new Error("No dealer plan is available right now. Please try again.");
  return fit.code;
}

/**
 * Activate a BROKER plan by code and add the chosen localities. Resolves to
 * the /broker/plan status (+ unmatched/unavailable localities). Rejects on
 * failure (including 409 POSTER_TYPE_CONFLICT for an Owner account).
 */
export async function activateBrokerPlan(code, localities) {
  await activatePlan(code, "BROKER");
  const names = Array.isArray(localities) ? localities : [];
  if (names.length) return addAgentPlanLocalities(names);
  return (await fetchAgentPlan()) || {};
}

/** The caller's active agent plan, or null (no plan / not logged in / error). */
export async function fetchAgentPlan() {
  try {
    const data = await apiGetAuth("/broker/plan");
    return data && data.has_plan ? data : null;
  } catch {
    return null;
  }
}

/** Buy an agent plan for the chosen locality names. Rejects on failure. */
export async function subscribeAgentPlan(planId, localities) {
  return activateBrokerPlan(await brokerPlanCode(planId), localities);
}

/**
 * Add localities to the active plan without paying again (the plan already
 * includes them). Rejects with the ApiError on failure.
 */
export async function addAgentPlanLocalities(localities) {
  // Agent Location Master labels go as stable group ids; older names as names.
  const choice = await toPlanChoice(localities);
  return apiPost("/broker/plan/localities", choice);
}

export const AGENT_AREA_REQUIRED_CODE = "AGENT_AREA_NOT_IN_PLAN";
export const AGENT_TRIAL_PLAN_ID = "agent-trial";
export const AGENT_TRIAL_AREA_MESSAGE =
  "Your free trial includes properties in one area. Upgrade your plan to explore properties in more areas.";

/**
 * True when the backend refused an agent action because the property is
 * outside the areas in the agent's plan (402 AGENT_AREA_NOT_IN_PLAN). The
 * answer is an AGENT plan upgrade — never the buyer plans.
 */
export function isAgentAreaRequired(e) {
  return !!e && e.status === 402 && !!e.data && e.data.code === AGENT_AREA_REQUIRED_CODE;
}

/** The server's upgrade message for an area refusal (or the trial default). */
export function agentAreaMessage(e) {
  const message = e && e.data && e.data.message;
  return typeof message === "string" && message.trim() ? message : AGENT_TRIAL_AREA_MESSAGE;
}

/**
 * Start the agent free trial with ONE area (no payment). Unlimited owner
 * numbers; properties in that area only. Rejects (409) if a plan is active
 * or the trial was already used, (422) if the area is not served.
 */
export async function startAgentTrial(locality) {
  const label = String(locality || "").trim();
  const { group_ids } = await toPlanChoice([label]);
  return apiPost("/broker/trial", group_ids.length ? { group_id: group_ids[0] } : { locality: label });
}

/** Server plan -> the agentPlan shape the agent screens already read. */
export function toUiAgentPlan(server) {
  if (!server) return null;
  const rupees = Math.round((server.price_paise || 0) / 100);
  const price = `₹${rupees.toLocaleString("en-IN")}`;
  const validUntil = server.valid_until ? new Date(server.valid_until) : null;
  return {
    id: server.plan_id,
    name: server.plan_name,
    locationLimit: server.locality_limit,
    price,
    amountPaid: price,
    priceNumeric: rupees,
    hasPurchased: true,
    validity: server.is_trial === true ? "Free trial" : "30 Days",
    expiryDate: validUntil
      ? validUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : undefined,
    transactionId: server.transaction_id,
    localitiesRemaining:
      typeof server.localities_remaining === "number" ? server.localities_remaining : undefined,
    isTrial: server.is_trial === true,
    // Area access included with a Dealer plan: shown as Dealer, never Agent.
    isDealer: server.is_dealer === true,
    localities: Array.isArray(server.localities) ? server.localities : [],
  };
}
