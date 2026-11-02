/**
 * RESTAMP buyer plans — phone-reveal (lead) quota.
 *
 * The backend enforces the quota: POST /buyer/listings/{id}/contact answers
 * 402 { detail: { code: "BUYER_PLAN_REQUIRED" } } once the buyer's plan has
 * no leads left. Callers send the buyer to the BuyerPlans screen on that.
 *
 * Purchases are SIMULATED (no payment gateway yet): subscribe records a
 * simulated payment on the server and activates the plan.
 */
import { apiGet, apiGetAuth, apiPost } from "./client.js";
import { withBuyerMode } from "../../features/buyer/api/buyerMode.js";

export const BUYER_PLANS_ROUTE = "BuyerPlans";

export function isBuyerPlanRequired(e) {
  return !!e && e.status === 402;
}

export async function fetchBuyerPlans() {
  const data = await apiGet("/buyer/plans");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchMyBuyerPlan() {
  return withBuyerMode(() => apiGetAuth("/buyer/plan"));
}

export async function subscribeBuyerPlan(code) {
  return withBuyerMode(() =>
    apiPost(`/buyer/plans/${encodeURIComponent(code)}/subscribe`)
  );
}

export function formatPlanPrice(paise) {
  if (!paise) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
