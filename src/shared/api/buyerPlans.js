/**
 * RESTAMP buyer plans — phone-reveal (lead) quota.
 *
 * The backend enforces the quota: POST /buyer/listings/{id}/contact answers
 * 402 { detail: { code: "BUYER_PLAN_REQUIRED" } } once the buyer's plan has
 * no leads left. Callers send the buyer to the BuyerPlans screen on that.
 *
 * Purchases use the backend payment bypass (POST /subscriptions/bypass, no
 * money charged; see shared/api/subscriptions.js). The old simulated
 * /buyer/plans/{code}/subscribe is refused outside development.
 */
import { apiGet, apiGetAuth } from "./client.js";
import { withBuyerMode } from "../../features/buyer/api/buyerMode.js";
import { activatePlan } from "./subscriptions.js";

export const BUYER_PLANS_ROUTE = "BuyerPlans";

export function isBuyerPlanRequired(e) {
  // An agent-area refusal is also a 402, but it needs an AGENT plan, never
  // the buyer plans (shared/api/dealerAreaPlans.js: isAgentAreaRequired).
  if (!e || e.status !== 402) return false;
  const code = e.data && e.data.code;
  return !code || code === "BUYER_PLAN_REQUIRED";
}

export async function fetchBuyerPlans() {
  const data = await apiGet("/buyer/plans");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchMyBuyerPlan() {
  return withBuyerMode(() => apiGetAuth("/buyer/plan"));
}

/** Activate a buyer plan, then return the buyer plan status (same shape as
 *  fetchMyBuyerPlan). Buyer plans activate in any app mode. */
export async function subscribeBuyerPlan(code) {
  await activatePlan(code, "BUYER");
  return fetchMyBuyerPlan();
}

export function formatPlanPrice(paise) {
  if (!paise) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
