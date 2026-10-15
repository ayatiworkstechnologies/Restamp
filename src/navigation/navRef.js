/**
 * Shared navigation ref so authentication guards can route to Login from
 * places without a navigation prop (e.g. WishlistContext, which lives above
 * the NavigationContainer). Attached once in AppNavigator.
 */
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function goLogin(params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate("Login", params);
  }
}
