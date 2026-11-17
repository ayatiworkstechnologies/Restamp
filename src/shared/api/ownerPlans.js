/**
 * Owner (seller) plans — saved on the server per user, independent of the
 * current role, so an owner plan and an agent plan can be held together.
 *
 *   GET  /users/me/owner-plan                    -> { active, plan_id, name,
 *                                                    listing_limit, end_date, ... }
 *   POST /users/me/owner-plan/{id}/subscribe     -> same shape + transaction_id
 *                                                   (PAYMENT IS SIMULATED server-side)
 */
import { apiGetAuth, apiPost } from "./client.js";

/** The caller's active owner plan, or null (none / not logged in / error). */
export async function fetchOwnerPlan() {
  try {
    const data = await apiGetAuth("/users/me/owner-plan");
    return data && data.active ? data : null;
  } catch {
    return null;
  }
}

/** Save a purchased owner plan on the server. Rejects on failure. */
export async function subscribeOwnerPlan(planId) {
  return apiPost(`/users/me/owner-plan/${encodeURIComponent(planId)}/subscribe`, {});
}
