/**
 * Agent (BROKER) plans — server-saved, so a purchased plan survives reloads
 * and new logins.
 *
 *   GET  /broker/plan                    -> { has_plan, plan_id, plan_name,
 *                                            locality_limit, valid_until,
 *                                            localities[] }
 *   POST /broker/plans/{id}/subscribe    -> same shape + transaction_id
 *        body { localities: [names] }       (PAYMENT IS SIMULATED server-side)
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
    validity: "30 Days",
    expiryDate: validUntil
      ? validUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : undefined,
    transactionId: server.transaction_id,
  };
}
