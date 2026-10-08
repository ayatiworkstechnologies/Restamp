import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchMe, updateProfileName } from "../api/auth";
import { getAuthTokenSync, setAuthToken } from "../api/client";

const AuthContext = createContext();

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

  // In-memory token only (no persisted session): a fresh start is logged out
  // unless a token was set earlier in this JS runtime (e.g. fast refresh).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (getAuthTokenSync()) {
          const me = await fetchMe();
          if (!cancelled) setUser(toUser(me, null));
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
      const me = await fetchMe();
      const u = toUser(me, local);
      setUser(u);
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

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    loginWithToken,
    saveProfileName,
    setLocalProfileName,
    refreshMe,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
