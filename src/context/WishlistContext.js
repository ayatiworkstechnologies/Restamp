import React, { createContext, useCallback, useContext, useState } from "react";
import ALL_PROPERTIES from "../data/properties";
import { getAuthTokenSync } from "../api/client";
import { fetchSavedWishlist, saveListingRemote, unsaveListingRemote } from "../api/saved";
import { useAuth } from "./AuthContext";

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
  // Initialize with initial sample properties
  const [wishlist, setWishlist] = useState(ALL_PROPERTIES.slice(0, 2));
  // Buyer endpoints 403 for non-BUYER roles (single active role per
  // account), so remote sync only runs for live BUYER accounts. Everyone
  // else keeps the existing local behavior — no request is ever sent.
  const { user } = useAuth();
  const isBuyer = user?.role === "BUYER";

  const isWishlisted = (id) => {
    return wishlist.some((item) => String(item.id) === String(id));
  };

  const toggleWishlist = (property) => {
    if (!property) return;
    const wasSaved = wishlist.some((item) => String(item.id) === String(property.id));
    setWishlist((prev) => {
      const exists = prev.some((item) => String(item.id) === String(property.id));
      if (exists) {
        return prev.filter((item) => String(item.id) !== String(property.id));
      } else {
        return [property, ...prev];
      }
    });
    // Backend sync only when authenticated as BUYER AND the card maps to a
    // real listing. Mock-only cards (no numeric backendId) stay local, and
    // OWNER sessions stay local too (buyer writes would 403), as before.
    if (getAuthTokenSync() && isBuyer) {
      const backendId = backendIdOf(property);
      if (backendId != null) {
        const promise = wasSaved ? unsaveListingRemote(backendId) : saveListingRemote(backendId);
        promise.catch(() => {
          // Rollback local state on backend failure
          setWishlist((prev) => {
            if (wasSaved) {
              const exists = prev.some((item) => String(item.id) === String(property.id));
              return exists ? prev : [property, ...prev];
            } else {
              return prev.filter((item) => String(item.id) !== String(property.id));
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

  const restoreDefaultWishlist = () => {
    setWishlist(ALL_PROPERTIES);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        restoreDefaultWishlist,
        refreshWishlist,
        wishlistLoading,
        wishlistSynced,
      }}
    >
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
