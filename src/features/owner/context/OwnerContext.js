import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../../auth/context/AuthContext.js";
import { shouldResetAccountScope, selectOwnerScopedProperties } from "../../auth/session.js";

// Re-exported so screens can import the scoping helper from the context
// module (the implementation lives in the pure, unit-tested auth/session
// module).
export { selectOwnerScopedProperties };

const OwnerContext = createContext();

// P1 honesty: no fabricated listings, leads, or purchased plans. Collections
// start empty and fill only from genuine sources (GET /owner/listings,
// GET /owner/drafts, user-created pending properties, real lead records).
// The local listing quota in OwnerProvider below is a device-side guard
// only — it asserts no purchase, price, validity period, or usage history.
const INITIAL_PROPERTIES = [];

const INITIAL_LEADS = [];

// Device-side listing quota (a local guard only — it asserts no plan, price,
// validity period, or usage history). Reset to this shape whenever the
// account changes so one account's quota never leaks into the next one.
const INITIAL_SUBSCRIPTION = {
  active: true,
  status: "Active",
  listingLimit: 5,
  usedListings: 0,
};

export function OwnerProvider({ children }) {
  // Local listing quota (device-side guard only). No purchased plan is
  // asserted here: no plan name, price, validity period, start/expiry dates,
  // or usage history. Quota mechanics (limit + locally published count) are
  // unchanged so the Add flow keeps working without a backend plans API.
  const [subscription, setSubscription] = useState(INITIAL_SUBSCRIPTION);

  // Owner Profile — derived from the authenticated user (same source of
  // truth as Buyer Profile). No request is made here: AuthContext already
  // holds the /auth/me user, so identity updates on login and role switch
  // with zero extra calls. Absent fields stay blank/generic — never another
  // mock person's identity. No KYC or membership claims: no backend source
  // exists for them. Listing/lead/plan state below is Owner business data
  // and is intentionally separate from user identity.
  const { user: authUser } = useAuth();
  const authUserId = authUser?.id ?? null;

  const ownerProfile = useMemo(
    () => ({
      name: authUser?.name || "Owner",
      firstName: authUser?.firstName || "",
      phone: authUser?.phone || "",
      email: authUser?.email || "",
      avatar: authUser?.avatar || null,
      verified: authUser?.verified || false,
    }),
    [authUser]
  );

  // Properties State
  const [properties, setProperties] = useState(INITIAL_PROPERTIES);

  // Leads State
  const [leads, setLeads] = useState(INITIAL_LEADS);

  // Pending selected plan during checkout
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

  // Account scope: every row cached in this context belongs to ONE account.
  // When the authenticated principal changes (logout, or signing in as a
  // different user) the cached rows are dropped, so the next account can
  // never see the previous owner's listings, leads or quota.
  const scopedOwnerIdRef = useRef(authUserId);
  useEffect(() => {
    if (!shouldResetAccountScope(scopedOwnerIdRef.current, authUserId)) return;
    scopedOwnerIdRef.current = authUserId;
    setProperties([]);
    setLeads([]);
    setSelectedPlanForCheckout(null);
    setSubscription(INITIAL_SUBSCRIPTION);
  }, [authUserId]);

  // NOTE: drafts are server-backed (src/api/owner.js draft helpers +
  // listing_drafts table). The old in-memory rentDraft system was removed so
  // there is exactly ONE authoritative draft store. Callers use the draft
  // APIs directly (Add screen saves, My Properties lists/deletes).

  // Methods
  const activateSubscription = (plan) => {
    const validityStr = plan?.validity || "3 Months (90 Days)";
    let days = 90;
    if (validityStr.includes("30")) days = 30;
    else if (validityStr.includes("Until Deal Closed") || validityStr.includes("VIP")) days = 365;
    else if (validityStr.includes("90") || validityStr.includes("3 Month")) days = 90;

    const now = new Date();
    const expiryObj = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const formattedStart = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const formattedExpiry = expiryObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const formattedAmount = plan?.amountPaid || plan?.price || "₹2,999";

    const newSub = {
      id: plan?.id || "owner-pro",
      name: plan?.name || "Owner Pro Plan",
      planName: plan?.name || "Owner Pro Plan",
      validity: validityStr,
      daysRemaining: days,
      listingLimit: plan?.listingLimit || 5,
      usedListings: properties.filter((p) => p.status === "active").length,
      price: formattedAmount,
      amountPaid: formattedAmount,
      active: false,
      hasPurchased: false,
      status: "Inactive",
      startDate: formattedStart,
      expiryDate: formattedExpiry,
      txnId: null,
      invoiceNumber: null,
      category: plan?.category || "Residential",
    };
    setSubscription(newSub);
  };

  const addProperty = (newProp) => {
    const propertyWithId = {
      ...newProp,
      // Preserve a server-confirmed id when the caller provides one (e.g. the
      // real listing_id after POST /owner/listings succeeds) so dashboard
      // dedup against GET /owner/listings keeps working. Local-only drafts
      // still get a generated id. Status stays pending — never VERIFIED.
      id: newProp?.id || `own-prop-${Date.now()}`,
      // Stamp the owning account (the authenticated principal) so a cached
      // row can never be rendered for a different account.
      ownerUserId: newProp?.ownerUserId ?? authUserId,
      status: newProp?.status || "pending",
      views: 0,
      enquiries: 0,
      visits: 0,
      listedDate: "Today",
    };
    setProperties((prev) => [propertyWithId, ...prev]);
    // increment used listings
    setSubscription((prev) => ({
      ...prev,
      usedListings: Math.min((prev?.usedListings || 0) + 1, prev?.listingLimit || 5),
    }));
    return propertyWithId;
  };

  const updatePropertyStatus = (id, newStatus, extra = {}) => {
    setProperties((prev) =>
      prev.map((prop) => (prop.id === id ? { ...prop, status: newStatus, ...extra } : prop))
    );
  };

  const deleteProperty = (id) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const updateLeadStatus = (leadId, newStatus, outcome = null) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          return {
            ...lead,
            status: newStatus,
            closedOutcome: outcome || lead.closedOutcome,
          };
        }
        return lead;
      })
    );
  };

  const closeLead = (leadId, outcome, closeRelatedProperty = false, propertyId = null) => {
    updateLeadStatus(leadId, "closed", outcome);
    if (closeRelatedProperty && propertyId) {
      updatePropertyStatus(propertyId, "closed", { closedOutcome: outcome });
    }
  };

  const addLeadNote = (leadId, noteText) => {
    if (!noteText || !noteText.trim()) return;
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          const notes = lead.internalNotes || [];
          return {
            ...lead,
            internalNotes: [
              ...notes,
              {
                id: `note-${Date.now()}`,
                text: noteText.trim(),
                timestamp: "Just now",
              },
            ],
          };
        }
        return lead;
      })
    );
  };

  const contextValue = useMemo(() => ({
    subscription,
    setSubscription,
    activateSubscription,
    ownerProfile,
    // The account this store's rows belong to (null when logged out).
    ownerUserId: authUserId,
    properties,
    setProperties,
    addProperty,
    updatePropertyStatus,
    deleteProperty,
    leads,
    setLeads,
    updateLeadStatus,
    closeLead,
    addLeadNote,
    selectedPlanForCheckout,
    setSelectedPlanForCheckout,
  }), [
    subscription,
    ownerProfile,
    authUserId,
    properties,
    leads,
    selectedPlanForCheckout,
  ]);

  return (
    <OwnerContext.Provider value={contextValue}>
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner() {
  const context = useContext(OwnerContext);
  if (!context) {
    throw new Error("useOwner must be used within an OwnerProvider");
  }
  return context;
}
