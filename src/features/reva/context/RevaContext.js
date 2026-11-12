import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useAuth } from "../../auth/context/AuthContext.js";

const RevaContext = createContext(null);

export function RevaProvider({ children }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState(null);

  // Automatically derive active role from current user session (e.g. "OWNER" -> "Owner")
  const defaultRole = useMemo(() => {
    const rawRole = String(user?.role || "").toUpperCase();
    if (rawRole === "OWNER") return "Owner";
    if (rawRole === "BROKER" || rawRole === "AGENT") return "Agent";
    return "Buyer";
  }, [user?.role]);

  const [activeRole, setActiveRole] = useState(defaultRole);

  const openReva = useCallback((prompt = null) => {
    if (typeof prompt === "string" && prompt.trim()) {
      setInitialPrompt(prompt.trim());
    } else {
      setInitialPrompt(null);
    }
    setIsOpen(true);
  }, []);

  const closeReva = useCallback(() => {
    setIsOpen(false);
    setInitialPrompt(null);
  }, []);

  const toggleReva = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openReva,
      closeReva,
      toggleReva,
      activeRole,
      setActiveRole,
      initialPrompt,
      setInitialPrompt,
    }),
    [isOpen, openReva, closeReva, toggleReva, activeRole, initialPrompt]
  );

  return <RevaContext.Provider value={value}>{children}</RevaContext.Provider>;
}

export function useReva() {
  const ctx = useContext(RevaContext);
  if (!ctx) {
    return {
      isOpen: false,
      openReva: () => {},
      closeReva: () => {},
      toggleReva: () => {},
      activeRole: "Buyer",
      setActiveRole: () => {},
      initialPrompt: null,
    };
  }
  return ctx;
}

