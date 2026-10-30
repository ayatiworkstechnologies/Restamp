/**
 * Session-state decision helpers (pure, framework-free, unit-tested).
 *
 * Authentication state is the SINGLE source of truth for choosing between the
 * authenticated navigator and the logged-out auth entry experience:
 * - while the session is still resolving -> "wait" (render neither shell, so a
 *   logged-out user never sees a flash of authenticated screens and a logged-in
 *   user never sees the login screen);
 * - authenticated -> stay on the authenticated navigator;
 * - logged out -> the auth entry route ("Login") is the only valid root, but
 *   ONLY after a real logout. A guest that never signed in may still browse
 *   the public tabs (MainTabs), which is the existing "Skip" flow.
 *
 * The helpers never touch navigation directly; the caller (AppNavigator /
 * AuthContext) applies the decision.
 */

/** The logged-out / auth entry route of the root stack. */
export const AUTH_ENTRY_ROUTE = "Login";

/**
 * Routes a logged-out visitor may legitimately see.
 * "Login" is the auth entry experience; "MainTabs" is the public browsing
 * shell (Home / Search / Activity / Profile / Menu) reachable via "Skip".
 */
export const GUEST_ROUTES = ["Login", "MainTabs"];

/**
 * True when the named route is reachable without an authenticated session.
 */
export function isGuestRoute(name) {
  return GUEST_ROUTES.indexOf(name) !== -1;
}

/**
 * Decide what the root navigator should do for the current session state.
 *
 * @param {object} args
 * @param {boolean} args.isLoading - the session is still being resolved
 * @param {boolean} args.isAuthenticated - an authenticated user is present
 * @param {boolean} args.wasAuthenticated - the previous session was authenticated
 * @param {string|null} args.currentRouteName - the route currently rendered
 * @returns {{action: "wait"|"stay"|"reset", route?: string}}
 */
export function planSessionNavigation({
  isLoading,
  isAuthenticated,
  wasAuthenticated,
  currentRouteName,
}) {
  if (isLoading) return { action: "wait" };
  if (isAuthenticated) return { action: "stay" };
  // Logged out. A logout (was authenticated -> now not) must drop the user on
  // the auth entry route; a guest who never signed in keeps browsing.
  if (wasAuthenticated && currentRouteName !== AUTH_ENTRY_ROUTE) {
    return { action: "reset", route: AUTH_ENTRY_ROUTE };
  }
  return { action: "stay" };
}

/**
 * Account-scoped in-memory stores must be dropped when the signed-in account
 * changes. True when the account scope differs from the one the store was
 * populated for (including "no account" / "a different account").
 *
 * @param {number|null|undefined} previousOwnerId
 * @param {number|null|undefined} currentOwnerId
 * @returns {boolean}
 */
export function shouldResetAccountScope(previousOwnerId, currentOwnerId) {
  const prev = previousOwnerId == null ? null : Number(previousOwnerId);
  const next = currentOwnerId == null ? null : Number(currentOwnerId);
  if (prev === null && next === null) return false;
  if (prev === null || next === null) return true;
  return prev !== next;
}

/**
 * Keep only the locally cached owner rows that belong to the given account.
 *
 * Locally created rows are stamped with `ownerUserId` (the authenticated
 * principal's user id). Rows without a stamp belong to no account and are
 * never shown. This is a client-side safety net on top of the backend's
 * ownership scoping — the backend is the authority, this only guarantees that
 * a stale in-memory row can never be rendered for the wrong account.
 *
 * @param {Array} localList
 * @param {number|null|undefined} ownerUserId
 * @returns {Array}
 */
export function selectOwnerScopedProperties(localList, ownerUserId) {
  const list = Array.isArray(localList) ? localList : [];
  if (ownerUserId == null) return [];
  const owner = Number(ownerUserId);
  if (!Number.isFinite(owner)) return [];
  return list.filter((p) => p && Number(p.ownerUserId) === owner);
}
