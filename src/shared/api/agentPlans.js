/**
 * Agent (BROKER) plans — server-saved, so a purchased plan survives reloads
 * and new logins.
 *
 *   GET  /broker/plan                    -> { has_plan, plan_id, plan_name,
 *                                            locality_limit, valid_until,
 *                                            localities[] }
 *   POST /broker/plans/{id}/subscribe    -> same shape + transaction_id
 *        body { localities: [names] }       (PAYMENT IS SIMULATED server-side)
 *   POST /broker/plan/localities         -> same shape + added_localities
 *        body { localities: [names] }       uses the ACTIVE plan's unused
 *                                           allowance: no payment; 409 without
 *                                           a plan, 422 over the plan limit
 *
 * Purchasing grants coverage for the chosen localities and switches the
 * account's role to BROKER.
 */
import { apiGetAuth, apiPost } from "./client.js";

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
  return apiPost(`/broker/plans/${encodeURIComponent(planId)}/subscribe`, {
    localities: Array.isArray(localities) ? localities : [],
  });
}

/**
 * Add localities to the active plan without paying again (the plan already
 * includes them). Rejects with the ApiError on failure.
 */
export async function addAgentPlanLocalities(localities) {
  return apiPost("/broker/plan/localities", {
    localities: Array.isArray(localities) ? localities : [],
  });
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
  return apiPost("/broker/trial", { locality: String(locality || "").trim() });
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
  };
}
