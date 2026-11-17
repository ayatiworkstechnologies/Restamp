import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../../auth/context/AuthContext.js";
import { shouldResetAccountScope, selectOwnerScopedProperties } from "../../auth/session.js";
import { fetchOwnerPlan, fetchDealerPlan } from "../../../shared/api/ownerPlans.js";
import { DEALER_PLANS_LIST } from "../../dealer/data/dealerPlans.js";
import { OWNER_PLANS_LIST } from "../data/ownerPlans.js";

// Server owner plan -> the subscription shape the Owner screens use.
function subscriptionFromServer(server) {
  const local = [...OWNER_PLANS_LIST, ...DEALER_PLANS_LIST].find((p) => p.id === server.plan_id);
  const fmt = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
  const end = server.end_date ? new Date(server.end_date) : null;
  const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000)) : null;
  return {
    id: server.plan_id,
    name: server.name,
    planName: server.name,
    validity: `${server.duration_days} Days`,
    daysRemaining,
    listingLimit: server.listing_limit == null ? Infinity : server.listing_limit,
    usedListings: 0,
    price: local?.price || null,
    amountPaid: local?.price || null,
    active: true,
    hasPurchased: true,
    simulated: true,
    status: "Active",
    startDate: fmt(server.start_date),
    expiryDate: fmt(server.end_date),
    serverSaved: true,
    category: "Residential",
  };
}

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

  // Plan payments made in this app session (owner + dealer), newest first.
  // Payments are simulated in-app; there is no server payments API yet.
  const [paymentHistory, setPaymentHistory] = useState([]);
  const recordPayment = (kind, plan, amount) => {
    const now = new Date();
    setPaymentHistory((prev) => [
      {
        id: plan?.txnId || `RST-${now.getTime()}`,
        kind,
        planName: plan?.name || (kind === "dealer" ? "Dealer Plan" : "Owner Plan"),
        amount,
        validity: plan?.validity || "",
        listingLimit: plan?.listingLimit,
        date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        status: "Success",
      },
      ...prev,
    ]);
  };

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
    setPaymentHistory([]);
    setSubscription(INITIAL_SUBSCRIPTION);
  }, [authUserId]);

  // Load the saved owner plan from the server whenever the account changes,
  // so a purchase survives logout, restart and switching roles.
  const [ownerPlanLoaded, setOwnerPlanLoaded] = useState(false);
  // Dealer plan: separate from the owner plan (a user can hold both).
  const [dealerSubscription, setDealerSubscription] = useState(null);
  useEffect(() => {
    let alive = true;
    setDealerSubscription(null);
    if (authUserId == null) return undefined;
    fetchDealerPlan().then((server) => {
      if (alive && server) setDealerSubscription(subscriptionFromServer(server));
    });
    return () => {
      alive = false;
    };
  }, [authUserId]);

  const activateDealerSubscription = (plan) => {
    const days = parseInt(String(plan?.validity || "30"), 10) || 30;
    const now = new Date();
    const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    recordPayment("dealer", plan, plan?.amountPaid || plan?.price);
    setDealerSubscription({
      id: plan?.id,
      name: plan?.name,
      planName: plan?.name,
      validity: plan?.validity,
      daysRemaining: days,
      listingLimit: plan?.listingLimit ?? 10,
      price: plan?.amountPaid || plan?.price,
      amountPaid: plan?.amountPaid || plan?.price,
      active: true,
      hasPurchased: true,
      simulated: true,
      status: "Active",
      startDate: fmt(now),
      expiryDate: fmt(new Date(now.getTime() + days * 86400000)),
      txnId: plan?.txnId || null,
    });
  };
  useEffect(() => {
    let alive = true;
    setOwnerPlanLoaded(false);
    if (authUserId == null) return undefined;
    fetchOwnerPlan().then((server) => {
      if (!alive) return;
      if (server) {
        setSubscription((prev) => ({
          ...subscriptionFromServer(server),
          usedListings: prev?.usedListings || 0,
        }));
      }
      setOwnerPlanLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [authUserId]);

  // NOTE: drafts are server-backed (src/api/owner.js draft helpers +
  // listing_drafts table). The old in-memory rentDraft system was removed so
  // there is exactly ONE authoritative draft store. Callers use the draft
  // APIs directly (Add screen saves, My Properties lists/deletes).

  // Methods
  const activateSubscription = (plan) => {
    const validityStr = plan?.validity || "30 Days";
    let days = 30;
    if (validityStr.includes("30")) days = 30;
    else if (validityStr.includes("60")) days = 60;
    else if (validityStr.includes("90") || validityStr.includes("3 Month")) days = 90;
    else if (validityStr.includes("Until Deal Closed") || validityStr.includes("VIP")) days = 365;

    const now = new Date();
    const expiryObj = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const formattedStart = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const formattedExpiry = expiryObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const formattedAmount = plan?.amountPaid || plan?.price || "₹499";

    const newSub = {
      id: plan?.id || "owner-startup",
      name: plan?.name || "Startup Plan",
      planName: plan?.name || "Startup Plan",
      validity: validityStr,
      daysRemaining: days,
      listingLimit: plan?.listingLimit ?? 1,
      usedListings: properties.filter((p) => p.status === "active").length,
      price: formattedAmount,
      amountPaid: formattedAmount,
      // Called after the in-app (simulated) payment completes: the plan is
      // active on this device. No gateway or backend plans API exists yet.
      active: true,
      hasPurchased: true,
      simulated: true,
      status: "Active",
      startDate: formattedStart,
      expiryDate: formattedExpiry,
      txnId: plan?.txnId || null,
      invoiceNumber: null,
      category: plan?.category || "Residential",
    };
    setSubscription(newSub);
    recordPayment("owner", plan, formattedAmount);
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

  // Lead states that used to live only on this device were removed with the
  // server-backed flows: internal notes exist only behind
  // GET/POST /owner/leads/{id}/notes (src/api/owner.js; contract §F), and
  // closing a lead is PATCH /owner/leads/{id} with a server-confirmed
  // closing_reason (contract §G) — never a local-only flip, and it never
  // touches any listing status.

  const hasOwnerPlan = !!(subscription && subscription.hasPurchased && subscription.active);
  const hasDealerPlan = !!(dealerSubscription && dealerSubscription.active);

  const contextValue = useMemo(() => ({
    subscription,
    hasOwnerPlan,
    ownerPlanLoaded,
    dealerSubscription,
    hasDealerPlan,
    activateDealerSubscription,
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
    selectedPlanForCheckout,
    setSelectedPlanForCheckout,
    paymentHistory,
  }), [
    subscription,
    dealerSubscription,
    hasDealerPlan,
    hasOwnerPlan,
    ownerPlanLoaded,
    ownerProfile,
    authUserId,
    properties,
    leads,
    selectedPlanForCheckout,
    paymentHistory,
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
