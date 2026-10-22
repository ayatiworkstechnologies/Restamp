import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { resetToLogin } from "./navRef";

/**
 * Gate for account-scoped screens.
 *
 * Renders nothing while the session is resolving and nothing while the user
 * is logged out, so a protected screen can never display (nor leak a
 * previously loaded account's data). When the user is not authenticated the
 * whole navigation stack is reset to the logged-out auth entry route, which
 * also means Back can never return to a protected screen.
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      resetToLogin();
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) return null;
  return children ?? null;
}
