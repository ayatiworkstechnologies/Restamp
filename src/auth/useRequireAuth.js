/**
 * Reusable authentication guard for protected persistent actions (Change 2).
 *
 * Usage in any screen with a navigation prop:
 *   const requireAuth = useRequireAuth(navigation);
 *   onPress={() => requireAuth(() => doPersistentThing())}
 *
 * Authenticated users run the action immediately (never redirected).
 * Guests get the action stored as a single-shot post-login continuation and
 * are sent to the existing Login screen; LoginScreen resumes it (goBack +
 * run once) after a successful OTP login and drops it on cancel/Skip.
 */
import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getAuthTokenSync } from "../api/client";
import { planProtectedAction } from "./requireAuth";

export function useRequireAuth(navigation) {
  const auth = useAuth();
  return useCallback(
    (action) => {
      const plan = planProtectedAction({
        isAuthenticated: !!auth?.isAuthenticated,
        hasToken: !!getAuthTokenSync(),
      });
      if (plan.status === "run") {
        if (typeof action === "function") action();
        return true;
      }
      if (typeof action === "function") auth.setPendingAction(action);
      try {
        navigation.navigate("Login");
      } catch {
        // navigation unavailable; the action stays queued until login
      }
      return false;
    },
    [auth, navigation]
  );
}
