/**
 * RESTAMP users API — role switching (P0 owner-property-posting fix).
 *
 * Backend contract (read-only, see backend app/routers/users.py):
 * - POST /users/me/role { role: "BUYER" | "OWNER" | "BROKER" } -> { user_id, role }
 * - GET  /users/me/role -> { user_id, role }
 *
 * Uses the existing authenticated client infrastructure (apiPost / apiGetAuth
 * in client.js), so the current Bearer token is preserved. Never touches the
 * token store and never logs the user out.
 */
import { Alert } from "react-native";
import { apiGetAuth, apiPost, getAuthTokenSync } from "./client.js";
import { createRoleGuard } from "./roleSwitchCore.js";
import { noteServerRole } from "../../features/buyer/api/buyerMode.js";

/**
 * Update the authenticated user's role on the backend.
 *
 * The confirmed role is recorded for the buyer-mode guard (src/api/buyerMode.js)
 * so the next buyer action does not need an extra round trip and, more
 * importantly, so a switch away from BUYER is never mistaken for one.
 *
 * @param {"BUYER" | "OWNER" | "BROKER"} role
 * @returns {Promise<{user_id: number, role: string}>}
 */
export async function setMyRole(role) {
  const result = await apiPost("/users/me/role", { role });
  noteServerRole(result && result.role ? result.role : role);
  return result;
}

/**
 * Fetch the authenticated user's current backend role.
 * @returns {Promise<{user_id: number, role: string}>}
 */
export async function fetchMyRole() {
  return apiGetAuth("/users/me/role");
}

const roleGuard = createRoleGuard({
  setMyRole,
  getToken: getAuthTokenSync,
});

/**
 * Ensure the backend holds the given role before entering a role-gated flow.
 *
 * Roles are mutually exclusive server-side (single user_current_role row):
 * switching to OWNER drops BUYER access and vice versa, so every direction
 * must go through this helper — there are no one-way doors.
 *
 * Concurrent taps share one POST for the same target role. A caller asking
 * for a different role waits for the active switch and then performs a fresh
 * server-side switch rather than trusting a stale auth snapshot. Timeouts and
 * failures reject, so callers never navigate on an unconfirmed role.
 *
 * @param {object} auth - the value returned by useAuth() ({ user, refreshMe })
 * @param {"BUYER" | "OWNER"} role
 * @returns {Promise<{ already: boolean }>}
 */
export async function ensureRole(auth, role) {
  return roleGuard.ensureRole(auth, role);
}

/**
 * Ensure the backend role is OWNER before entering any Owner flow.
 *
 * @param {object} auth - the value returned by useAuth() ({ user, refreshMe })
 * @returns {Promise<{ alreadyOwner: boolean }>}
 */
export async function ensureOwnerRole(auth) {
  const { already } = await ensureRole(auth, "OWNER");
  return { alreadyOwner: already };
}

function roleSwitchErrorMessage(e, role) {
  const mode = role === "BUYER" ? "Buyer mode" : "Owner mode";
  if (!e) return `Could not switch to ${mode}. Please try again.`;
  if (e.kind === "offline") {
    return "No connection. Make sure the backend is running and reachable, then try again.";
  }
  if (e.kind === "login" || e.status === 401) {
    return role === "BUYER"
      ? "Your session has expired. Please log in again."
      : "Your session has expired. Please log in again, then try posting your property.";
  }
  if (e.kind === "denied" || e.status === 403) {
    return "This account is not allowed to switch roles. Please contact support.";
  }
  if (e.kind === "timeout") {
    return "The server did not confirm the role change. Please try again.";
  }
  if (e.kind === "role-unconfirmed") {
    return "The server did not confirm the role change. Please try again.";
  }
  if (e.kind === "validation" || e.status === 400 || e.status === 422) {
    return "The server rejected the role change. Please update the app and try again.";
  }
  return `Could not switch to ${mode}. Please try again.`;
}

/**
 * Single reusable Owner entry point for ALL buyer->owner transitions:
 * Home "Post your Property", Profile "Switch to Post Property", Menu Owner
 * entries, and the Owner header pill.
 *
 * Flow: ensure backend role is OWNER first (real POST, token preserved),
 * and ONLY then navigate into OwnerNavigator. On failure, stays put and
 * shows a clean error — never logs out, never touches OTP state.
 *
 * @param {object} navigation - React Navigation object
 * @param {object} auth - the value returned by useAuth()
 * @param {"Add" | "Dashboard" | "Properties" | "Leads" | "Profile"} ownerScreen
 * @param {object} ownerParams - params forwarded to the OwnerNavigator screen
 * @returns {Promise<boolean>} true when navigation happened
 */
export async function enterOwnerFlow(navigation, auth, ownerScreen = "Dashboard", ownerParams) {
  try {
    await ensureOwnerRole(auth);
  } catch (e) {
    Alert.alert("Could not open Owner mode", roleSwitchErrorMessage(e, "OWNER"));
    return false;
  }
  try {
    navigation.navigate("OwnerNavigator", { screen: ownerScreen, ...(ownerParams ? { params: ownerParams } : {}) });
    return true;
  } catch (e) {
    Alert.alert("Could not open Owner mode", "Navigation failed. Please try again.");
    return false;
  }
}

/**
 * Single reusable Buyer entry point for ALL owner->buyer transitions
 * (Owner header pill, and any future "back to browsing" affordance).
 *
 * Mirror of enterOwnerFlow: ensures the backend role is BUYER first (real
 * POST, token preserved) — buyer endpoints 403 while the account holds
 * OWNER — and ONLY then resets into MainTabs. On failure, stays put with a
 * clean error — never logs out, never touches OTP state.
 *
 * @param {object} navigation - React Navigation object
 * @param {object} auth - the value returned by useAuth()
 * @returns {Promise<boolean>} true when navigation happened
 */
export async function enterBuyerFlow(navigation, auth) {
  // Race-safe ordering (ported from fork): the BUYER role must be confirmed
  // on the server BEFORE navigating — buyer endpoints 403 while the account
  // still holds OWNER. On failure, stay put with a clean error.
  try {
    await ensureRole(auth, "BUYER");
  } catch (e) {
    Alert.alert("Could not open Buyer mode", roleSwitchErrorMessage(e, "BUYER"));
    return false;
  }
  try {
    const rootNav = navigation?.getParent?.() || navigation;
    try {
      rootNav.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
      return true;
    } catch {
      navigation.navigate("MainTabs");
      return true;
    }
  } catch (e) {
    try {
      navigation.navigate("MainTabs");
      return true;
    } catch (err) {
      Alert.alert("Could not open Buyer mode", "Navigation failed. Please try again.");
      return false;
    }
  }
}
