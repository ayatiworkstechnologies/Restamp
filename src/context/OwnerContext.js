import React, { createContext, useContext, useState, useMemo } from "react";

const OwnerContext = createContext();

// P1 honesty: no fabricated listings, leads, or purchased plans. Collections
// start empty and fill only from genuine sources (GET /owner/listings,
// GET /owner/drafts, user-created pending properties, real lead records).
// The local listing quota in OwnerProvider below is a device-side guard
// only — it asserts no purchase, price, validity period, or usage history.
const INITIAL_PROPERTIES = [];

const INITIAL_LEADS = [];

export function OwnerProvider({ children }) {
  // Local listing quota (device-side guard only). No purchased plan is
  // asserted here: no plan name, price, validity period, start/expiry dates,
  // or usage history. Quota mechanics (limit + locally published count) are
  // unchanged so the Add flow keeps working without a backend plans API.
  const [subscription, setSubscription] = useState({
    active: true,
    status: "Active",
    listingLimit: 5,
    usedListings: 0,
  });

  // Owner Profile
  // NOTE (Edit phase): phone/email default to blank — never demo values.
  // New listings prefill the authenticated user's phone (see
  // OwnerAddPropertyScreen); Edit restores the listing's saved contact.
  const [ownerProfile, setOwnerProfile] = useState({
    name: "Arunavo Mukherjee",
    firstName: "Arunavo",
    phone: "",
    email: "",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    verified: true,
    kycStatus: "Verified",
    memberSince: "June 2025",
  });

  // Properties State
  const [properties, setProperties] = useState(INITIAL_PROPERTIES);

  // Leads State
  const [leads, setLeads] = useState(INITIAL_LEADS);

  // Pending selected plan during checkout
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);

  // NOTE: drafts are server-backed (src/api/owner.js draft helpers +
  // listing_drafts table). The old in-memory rentDraft system was removed so
  // there is exactly ONE authoritative draft store. Callers use the draft
  // APIs directly (Add screen saves, My Properties lists/deletes).

  // Methods
  const activateSubscription = (plan) => {
    const newSub = {
      id: plan.id || "owner-pro",
      name: plan.name || "Owner Pro Plan",
      planName: plan.name || "Owner Pro Plan",
      validity: plan.validity || "3 Months",
      daysRemaining: 90,
      listingLimit: plan.listingLimit || 5,
      usedListings: properties.filter((p) => p.status === "active").length,
      price: plan.price || "₹2,999",
      amountPaid: plan.price || "₹2,999",
      active: true,
      status: "Active",
      startDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      expiryDate: "90 Days from now",
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

  const scheduleVisit = (leadId, visitDetails) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          return {
            ...lead,
            status: "visit_scheduled",
            visitData: visitDetails,
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
    setOwnerProfile,
    properties,
    setProperties,
    addProperty,
    updatePropertyStatus,
    deleteProperty,
    leads,
    setLeads,
    updateLeadStatus,
    scheduleVisit,
    closeLead,
    addLeadNote,
    selectedPlanForCheckout,
    setSelectedPlanForCheckout,
  }), [
    subscription,
    ownerProfile,
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
