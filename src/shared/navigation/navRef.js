/**
 * Shared navigation ref so authentication guards can route to Login from
 * places without a navigation prop (e.g. WishlistContext, which lives above
 * the NavigationContainer). Attached once in AppNavigator.
 */
import { createNavigationContainerRef } from "@react-navigation/native";
import { AUTH_ENTRY_ROUTE } from "../../features/auth/session.js";

export const navigationRef = createNavigationContainerRef();

export function goLogin(params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate("Login", params);
  }
}

/**
 * Drop the whole navigation stack and land on the logged-out auth entry
 * route ("Login").
 *
 * Used by logout and by the authenticated-screen guard so that a logged-out
 * user can never press Back into a protected screen. Returns true when a
 * reset was actually issued (false when the navigator is not ready yet or the
 * user is already on the auth entry route).
 */
export function resetToLogin() {
  if (!navigationRef.isReady()) return false;
  const current = navigationRef.getCurrentRoute();
  if (current && current.name === AUTH_ENTRY_ROUTE) return false;
  navigationRef.reset({ index: 0, routes: [{ name: AUTH_ENTRY_ROUTE }] });
  return true;
}
