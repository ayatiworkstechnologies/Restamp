import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo } from "react";
import { getAuthTokenSync } from "../api/client";
import { fetchSavedWishlist, saveListingRemote, unsaveListingRemote } from "../api/saved";
import { useAuth } from "./AuthContext";
import { goLogin } from "../navigation/navRef";
import { planProtectedAction } from "../auth/requireAuth";
import { shouldResetAccountScope } from "../auth/session";

const WishlistContext = createContext();

// Fire-and-forget remote sync: local state always wins instantly; backend errors
// never break the UI (logged only). No-ops entirely while logged out.
function syncRemote(promise) {
  try {
    const r = promise;
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch {
    // ignore — local behavior is authoritative offline
  }
}

function backendIdOf(property) {
  const id = property && property.backendId;
  return typeof id === "number" ? id : null;
}

export function WishlistProvider({ children }) {
  // P2 honesty: start empty. Logged-out users have no saved properties;
  // authenticated BUYER accounts replace this with the server wishlist via
  // refreshWishlist(). Never seed with sample catalog records.
  const [wishlist, setWishlist] = useState([]);
  // Buyer endpoints 403 for non-BUYER roles (single active role per
  // account), so remote sync only runs for live BUYER accounts. Everyone
  // else keeps the existing local behavior — no request is ever sent.
  const { user, isAuthenticated, setPendingAction } = useAuth();
  const isBuyer = user?.role === "BUYER";
  // Live mirrors (Change 2): the stored post-login continuation may invoke
  // toggleWishlist from a pre-login render closure, so the guard and the
  // body read these refs (always current) instead of render-scope values.
  // setWishlist functional updates are inherently safe across renders.
  const stateRef = useRef({ isAuthenticated: false, isBuyer: false });
  stateRef.current = { isAuthenticated: !!isAuthenticated, isBuyer: !!isBuyer };
  const wishlistRef = useRef([]);
  wishlistRef.current = wishlist;

  const isWishlisted = (id) => {
    return wishlist.some((item) => String(item.id) === String(id));
  };

  const toggleWishlist = (property) => {
    if (!property) return;
    // Saving is a protected persistent action (Change 2): guests are sent
    // to Login with this exact toggle queued; after a successful login the
    // toggle resumes once on the same property. Authenticated users proceed
    // immediately and are never redirected. Live refs keep a pre-login
    // closure correct when it resumes post-login (no login loop).
    const plan = planProtectedAction({
      isAuthenticated: stateRef.current.isAuthenticated,
      hasToken: !!getAuthTokenSync(),
    });
    if (plan.status === "defer") {
      setPendingAction(() => toggleWishlist(property));
      goLogin();
      return;
    }
    const propKey = String(property.id);
    const wasSaved = wishlistRef.current.some((item) => String(item.id) === propKey);
    setWishlist((prev) => {
      const exists = prev.some((item) => String(item.id) === propKey);
      if (exists) {
        return prev.filter((item) => String(item.id) !== propKey);
      } else {
        return [property, ...prev];
      }
    });
    // Backend sync only when authenticated as BUYER AND the card maps to a
    // real listing. Mock-only cards (no numeric backendId) stay local, and
    // OWNER sessions stay local too (buyer writes would 403), as before.
    if (getAuthTokenSync() && stateRef.current.isBuyer) {
      const backendId = backendIdOf(property);
      if (backendId != null) {
        const promise = wasSaved ? unsaveListingRemote(backendId) : saveListingRemote(backendId);
        promise.catch(() => {
          // Rollback local state on backend failure
          setWishlist((prev) => {
            if (wasSaved) {
              const exists = prev.some((item) => String(item.id) === propKey);
              return exists ? prev : [property, ...prev];
            } else {
              return prev.filter((item) => String(item.id) !== propKey);
            }
          });
        });
      }
    }
  };

  const removeFromWishlist = (id) => {
    setWishlist((prev) => prev.filter((item) => String(item.id) !== String(id)));
    if (getAuthTokenSync() && isBuyer && typeof id === "number") {
      syncRemote(unsaveListingRemote(id));
    }
  };

  // Replace local list with the server wishlist (no-op while logged out or
  // while the account holds a non-BUYER role — buyer reads would 403).
  // Returns true when a refresh happened, false when local state was kept.
  // wishlistSynced tracks whether the list currently reflects the server.
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistSynced, setWishlistSynced] = useState(false);
  // Stable identity (useCallback): consumers list this in focus-effect deps,
  // so it must not change every render or effects refire in a loop, spamming
  // the backend. It changes only when the buyer-ness of the account changes
  // (login/logout/role switch), which is exactly when a refetch is wanted.
  const refreshWishlist = useCallback(async () => {
    if (!getAuthTokenSync() || !isBuyer) return false;
    setWishlistLoading(true);
    try {
      const { items } = await fetchSavedWishlist();
      setWishlist(items);
      setWishlistSynced(true);
      return true;
    } catch {
      return false;
    } finally {
      setWishlistLoading(false);
    }
  }, [isBuyer]);

  const clearWishlist = () => {
    setWishlist([]);
  };

  // Account scope: a saved-property list belongs to ONE account. When the
  // authenticated principal changes (logout, or signing in as a different
  // user) the cached list is dropped so the next account never sees the
  // previous account's saved properties. The next refresh re-fetches the new
  // account's server list.
  const scopedAccountIdRef = useRef(user?.id ?? null);
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (!shouldResetAccountScope(scopedAccountIdRef.current, currentId)) return;
    scopedAccountIdRef.current = currentId;
    setWishlist([]);
    setWishlistSynced(false);
  }, [user?.id]);

  const contextValue = useMemo(() => ({
    wishlist,
    isWishlisted,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
    refreshWishlist,
    wishlistLoading,
    wishlistSynced,
  }), [
    wishlist,
    isWishlisted,
    toggleWishlist,
    removeFromWishlist,
    wishlistLoading,
    wishlistSynced,
  ]);

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
