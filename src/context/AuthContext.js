import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from "react";
import { fetchMe, updateProfileName } from "../api/auth";
import { setMyRole } from "../api/users";
import { getAuthTokenSync, setAuthToken } from "../api/client";
import { invalidateBuyerMode, noteServerRole } from "../api/buyerMode";
import { createContinuationStore } from "../auth/continuation";
import { resetToLogin } from "../navigation/navRef";

const AuthContext = createContext();

// Single-shot post-login continuation (Change 2): one shared store for the
// whole app. Screens queue a protected action before redirecting a guest to
// Login; LoginScreen consumes it exactly once after a successful login.
const continuationStore = createContinuationStore();

function parseName(displayName) {
  if (!displayName || displayName.startsWith("+")) {
    return { firstName: "", lastName: "" };
  }
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function toUser(me, local) {
  const phone = (local && local.phone) || (me.display_name && me.display_name.startsWith("+") ? me.display_name : "");
  const parsed = parseName(me.display_name);
  const firstName = (local && local.firstName) || parsed.firstName;
  const lastName = (local && local.lastName) || parsed.lastName;
  const isProfileComplete = Boolean(
    me.display_name &&
      !me.display_name.startsWith("+") &&
      me.display_name !== phone &&
      me.display_name.trim().length > 0
  );
  const name = isProfileComplete
    ? me.display_name
    : `${firstName} ${lastName}`.trim() || phone || "User";

  return {
    id: me.id,
    display_name: me.display_name,
    role: me.role,
    providers: me.providers || [],
    is_admin: !!me.is_admin,
    phone,
    countryCode: (local && local.countryCode) || "",
    firstName,
    lastName,
    name,
    isProfileComplete,
    email: null,
    avatar: null,
    verified: (me.providers || []).includes("phone"),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Bumped on every login and every logout. Account-scoped stores watch it so
  // a previous account's cached data can never survive into the next session.
  const [sessionVersion, setSessionVersion] = useState(0);

  // In-memory token only (no persisted session): a fresh start is logged out
  // unless a token was set earlier in this JS runtime (e.g. fast refresh).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (getAuthTokenSync()) {
          const me = await fetchMe();
          // The server is the source of truth for the current role; keep the
          // buyer-mode guard in sync so it never acts on a stale role.
          noteServerRole(me && me.role);
          if (!cancelled) {
            setUser(toUser(me, null));
            setSessionVersion((v) => v + 1);
          }
        }
      } catch {
        setAuthToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithToken = useCallback(async (access_token, local) => {
    setAuthToken(access_token);
    try {
      let me = await fetchMe();
      if (me.role == null) {
        // Role-less account: initialize to BUYER (the default for new
        // users). Existing BUYER/OWNER/BROKER roles are never overwritten
        // here. Best-effort: if the POST fails, login still succeeds with
        // the role-less profile and buyer fetches stay gated off.
        try {
          await setMyRole("BUYER");
          me = await fetchMe();
        } catch {
          // keep the fetched profile; role-gated UI degrades gracefully
        }
      }
      const u = toUser(me, local);
      // Seed the confirmed server role (it may be OWNER if this account was
      // last used in owner mode — the buyer-mode guard must not assume BUYER).
      noteServerRole(me && me.role);
      setUser(u);
      // New session: account-scoped stores drop the previous account's data.
      setSessionVersion((v) => v + 1);
      return u;
    } catch (e) {
      setAuthToken(null);
      setUser(null);
      throw e;
    }
  }, []);

  const saveProfileName = useCallback(async (firstName, lastName) => {
    const combined = `${(firstName || "").trim()} ${(lastName || "").trim()}`.trim();
    if (!combined) throw new Error("Name cannot be empty");
    const updatedMe = await updateProfileName(combined);
    let updatedUser = null;
    setUser((prev) => {
      updatedUser = toUser(updatedMe, {
        phone: prev?.phone,
        countryCode: prev?.countryCode,
        firstName,
        lastName,
      });
      return updatedUser;
    });
    return updatedUser || toUser(updatedMe, null);
  }, []);

  const setLocalProfileName = useCallback((firstName, lastName) => {
    setUser((prev) => {
      if (!prev) return prev;
      const name = `${(firstName || "").trim()} ${(lastName || "").trim()}`.trim() || prev.name;
      return { ...prev, firstName: firstName || "", lastName: lastName || "", name };
    });
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    noteServerRole(me && me.role);
    let updated = null;
    setUser((prev) => {
      updated = {
        ...toUser(me, null),
        phone: prev?.phone || "",
        countryCode: prev?.countryCode || "",
        firstName: prev?.firstName || "",
        lastName: prev?.lastName || "",
      };
      updated.name = `${updated.firstName} ${updated.lastName}`.trim() || updated.name;
      return updated;
    });
    return me;
  }, []);

  /**
   * Sign out.
   *
   * The backend session is a stateless JWT with no server-side logout
   * endpoint (see backend app/security.py), so signing out is exactly:
   * dropping the bearer token. Everything else is client-side hygiene that
   * MUST happen so the next account never sees the previous one's data:
   *
   * 1. clear the bearer token (the app's established credential mechanism);
   * 2. clear the current-user profile;
   * 3. drop the single-shot post-login continuation (it belongs to the
   *    account that is signing out, never to the next one);
   * 4. bump the session version so every account-scoped store (owner
   *    listings/leads, wishlist, ...) drops the previous account's cached
   *    rows and re-fetches for the next account;
   * 5. reset the navigation stack to the logged-out auth entry route, so no
   *    protected screen stays on the stack and Back cannot return to one.
   *
   * It never throws and never leaves a falsely authenticated session: the
   * token is cleared first, so a failure in step 5 cannot keep the user
   * signed in.
   */
  const logout = useCallback(async () => {
    // Credentials first: from here on the session is genuinely unauthenticated.
    setAuthToken(null);
    setUser(null);
    // The cached server role belonged to the account that just left.
    invalidateBuyerMode();
    // The queued continuation belongs to the account that just left.
    try {
      continuationStore.clear();
    } catch {
      // ignore: clearing an empty store must never break sign-out
    }
    // Announce the new (logged-out) session to every account-scoped store.
    setSessionVersion((v) => v + 1);
    // Land on the logged-out auth entry route (no protected screen on the
    // stack, so Back cannot return to one).
    try {
      resetToLogin();
    } catch {
      // Navigation may not be mounted yet; the AppNavigator session effect
      // performs the same reset as soon as the auth state settles.
    }
  }, []);

  const setPendingAction = useCallback((fn) => {
    continuationStore.set(fn);
  }, []);

  const consumePendingAction = useCallback(() => {
    return continuationStore.consume();
  }, []);

  const clearPendingAction = useCallback(() => {
    continuationStore.clear();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      sessionVersion,
      loginWithToken,
      saveProfileName,
      setLocalProfileName,
      refreshMe,
      logout,
      setPendingAction,
      consumePendingAction,
      clearPendingAction,
    }),
    [user, isLoading, sessionVersion, loginWithToken, saveProfileName, setLocalProfileName, refreshMe, logout, setPendingAction, consumePendingAction, clearPendingAction]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
