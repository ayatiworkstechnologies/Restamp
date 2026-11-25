/**
 * Backend subscriptions (shared by Buyer, Owner, Dealer and Agent plans).
 *
 *   GET  /subscriptions/plans?role=   public plan catalogue (admin-managed)
 *   GET  /subscriptions/me            the caller's current plan per role
 *   POST /subscriptions/bypass        TEMPORARY payment bypass: activates a
 *                                     plan without payment (provider BYPASS).
 *                                     Poster plans (OWNER / BROKER) need the
 *                                     caller's current role to match.
 *   GET  /users/me/capabilities       poster type (Owner OR Dealer, never
 *                                     both), plan status, can_post
 *
 * The older simulated purchase endpoints (/buyer/plans/{code}/subscribe,
 * /broker/plans/{code}/subscribe) are refused outside development, so every
 * app purchase goes through the bypass, the same as the website.
 */
import { apiGet, apiGetAuth, apiPost } from "./client.js";

/** Public plans for a role ("BUYER" | "OWNER" | "BROKER"). [] on error. */
export async function fetchPublicPlans(role) {
  try {
    const data = await apiGet("/subscriptions/plans", role ? { role } : {});
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

/** { current_role, subscriptions: { BUYER, OWNER, BROKER } } or null. */
export async function fetchMySubscriptions() {
  try {
    return await apiGetAuth("/subscriptions/me");
  } catch {
    return null;
  }
}

/** The account's capabilities (poster_type, can_post, ...) or null. */
export async function fetchCapabilities() {
  try {
    return await apiGetAuth("/users/me/capabilities");
  } catch {
    return null;
  }
}

/**
 * Activate `planCode` through the payment bypass. For OWNER / BROKER plans the
 * app mode is switched to that role first (the backend requires it; it refuses
 * the other poster type with 409 POSTER_TYPE_CONFLICT). Rejects on failure.
 */
export async function activatePlan(planCode, role) {
  if (role === "OWNER" || role === "BROKER") {
    // Lazy: users.js pulls in react-native; keep this module importable by
    // the plain-Node script tests that load the plan APIs.
    const { setMyRole } = await import("./users.js");
    await setMyRole(role);
  }
  return apiPost("/subscriptions/bypass", { plan_code: planCode });
}

/** True when an error is the backend's Owner/Dealer exclusivity refusal. */
export function isPosterTypeConflict(e) {
  return e?.status === 409 && e?.data?.code === "POSTER_TYPE_CONFLICT";
}

/** Display text for a poster-type conflict (backend message when present). */
export function posterTypeConflictMessage(e) {
  return (
    e?.data?.message ||
    "This account is registered for a different plan type. Owner and Dealer plans can't be held on the same account."
  );
}
