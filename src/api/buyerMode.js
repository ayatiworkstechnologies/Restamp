/**
 * Buyer-mode wiring for the real backend.
 *
 * Every /buyer/* endpoint is gated on the account's CURRENT role being BUYER
 * (backend app/deps.py: `require_buyer`). The app already switches roles
 * through the sanctioned self-serve endpoint (POST /users/me/role) before
 * entering the owner flow; this module does the mirror image for buyer
 * actions so an account that is currently in OWNER mode (e.g. it just posted a
 * property) is not refused with
 *
 *     403 {"detail": "BUYER role required"}
 *
 * when it browses and sends an enquiry or schedules a visit.
 *
 * Nothing here weakens the server-side check: the switch is a real,
 * authenticated, server-confirmed role change, and the buyer request itself
 * is still validated by the backend.
 */
import { apiGetAuth, apiPost, getAuthTokenSync } from "./client";
import {
  createBuyerModeGuard,
  isRoleGateError,
  isBuyerRole,
} from "./buyerModeCore";

const guard = createBuyerModeGuard({
  getToken: getAuthTokenSync,
  fetchRole: () => apiGetAuth("/users/me/role"),
  setRole: (role) => apiPost("/users/me/role", { role }),
});

/**
 * Record a role the server has just confirmed (login, profile refresh, or an
 * explicit role switch). Keeps the guard's cache honest so the next buyer
 * action does not need an extra round trip.
 */
export function noteServerRole(role) {
  return guard.noteServerRole(role);
}

/** Drop the cached role (the server state is no longer known). */
export function invalidateBuyerMode() {
  return guard.invalidate();
}

export function getConfirmedBuyerRole() {
  return guard.getConfirmedRole();
}

/**
 * Make sure the server holds the BUYER role for this account.
 * Guests (no token) are left alone: the caller decides between "log in
 * first" and "keep browsing".
 */
export async function ensureBuyerMode(options) {
  return guard.ensure(options);
}

/**
 * Run a buyer-gated request with the server in BUYER mode.
 *
 * @param {() => Promise<any>} request - the actual API call
 * @returns {Promise<any>} the API response
 */
export async function withBuyerMode(request) {
  await ensureBuyerMode();
  try {
    return await request();
  } catch (error) {
    if (!isRoleGateError(error)) throw error;
    // The server refused the buyer action although we believed the account
    // was a buyer (e.g. the role changed on another device). Re-read the
    // server's role, switch if needed, and retry the SAME request once.
    invalidateBuyerMode();
    await ensureBuyerMode();
    return request();
  }
}

export { isBuyerRole, isRoleGateError };
