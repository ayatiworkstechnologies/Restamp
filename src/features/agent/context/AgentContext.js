import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { AGENT_MODULE_ENABLED } from "../../../shared/constants/features.js";
import { apiGetAuth } from "../../../shared/api/client.js";
import { toUiProperty } from "../../../shared/api/mappers.js";
import { fetchAgentPlan, toUiAgentPlan } from "../../../shared/api/agentPlans.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { toAgentProfile } from "../utils/agentCore.js";

// Backend transaction type -> the deal key the agent screens filter on.
const BADGE_BY_TRANSACTION = { BUY: "sale", RESALE: "resale", RENT: "rent", LEASE: "lease" };

const AgentContext = createContext();

const INITIAL_AGENT_LEADS = [];

const INITIAL_VISITS = [];

const INITIAL_EARNINGS_TRANSACTIONS = [];

export function AgentProvider({ children }) {
  // Agent plans/leads are not backed by a production API yet. Keep the
  // context empty and inactive rather than seeding a demo identity or plan.
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [agentPlan, setAgentPlan] = useState(null);

  // Localities covered by the Agent
  const [selectedLocalities, setSelectedLocalities] = useState([]);

  // Agent Profile details: identity comes from the logged-in account; only
  // locally tracked extras (e.g. dealsClosedCount) are kept in state.
  const [profileExtras, setAgentProfile] = useState({});

  // Leads and Visits
  const [leads, setLeads] = useState(INITIAL_AGENT_LEADS);
  const [visits, setVisits] = useState(INITIAL_VISITS);

  // Earnings and Commission Transactions
  const [earningsTransactions, setEarningsTransactions] = useState(INITIAL_EARNINGS_TRANSACTIONS);

  // Plan Expiry status simulation
  const [isPlanExpired, setIsPlanExpired] = useState(false);

  // Activate Plan handler
  const activatePlan = (plan, localities) => {
    if (!AGENT_MODULE_ENABLED) return null;
    const now = new Date();
    const expiryObj = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const formattedPrice =
      plan?.amountPaid ||
      plan?.price ||
      (plan?.priceNumeric ? `₹${plan.priceNumeric.toLocaleString("en-IN")}` : "₹6,999");
    const locLimit =
      plan?.locationLimit ||
      (localities && localities.length > 0 ? localities.length : 10);

    setHasActivePlan(true);
    setIsPlanExpired(false);
    setAgentPlan({
      id: plan?.id || "agent-pro",
      name: plan?.name || "Agent Pro Plan",
      locationLimit: locLimit,
      price: formattedPrice,
      amountPaid: formattedPrice,
      priceNumeric:
        plan?.priceNumeric ||
        parseInt(String(formattedPrice).replace(/[^0-9]/g, ""), 10) ||
        6999,
      validity: plan?.validity || "30 Days",
      activatedAt: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      expiryDate: expiryObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      daysRemaining: 30,
      status: "active",
      hasPurchased: true,
      invoiceNumber: `INV-2026-AGT-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    if (localities && localities.length > 0) {
      setSelectedLocalities(localities);
    }
  };

  // Apply a server-saved agent plan (GET /broker/plan or a purchase result).
  const applyServerPlan = (server) => {
    if (!AGENT_MODULE_ENABLED || !server || !server.has_plan) return;
    const ui = toUiAgentPlan(server);
    const end = server.valid_until ? new Date(server.valid_until) : null;
    // The free trial has no end date: no day count is invented for it.
    const daysRemaining = end
      ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;
    setHasActivePlan(true);
    setIsPlanExpired(false);
    setAgentPlan({ ...ui, status: "active", daysRemaining });
    setSelectedLocalities(Array.isArray(server.localities) ? server.localities : []);
  };

  // The plan lives on the server: load it whenever a user logs in, and clear
  // it on logout, so a purchased plan survives reloads and new logins.
  const { user: authUser } = useAuth();
  const authUserId = authUser?.id ?? null;
  const agentProfile = useMemo(() => {
    const base = toAgentProfile(authUser);
    return base ? { ...profileExtras, ...base } : null;
  }, [authUser, profileExtras]);
  // planLoaded: the server's answer for this account has arrived, so "no
  // plan" is a fact (AgentNavigator then asks for the free-trial area).
  const [planLoaded, setPlanLoaded] = useState(false);
  useEffect(() => {
    if (!AGENT_MODULE_ENABLED) return undefined;
    setPlanLoaded(false);
    if (authUserId == null) {
      setHasActivePlan(false);
      setAgentPlan(null);
      setSelectedLocalities([]);
      setAgentProfile({});
      setPlanLoaded(true);
      return undefined;
    }
    let cancelled = false;
    fetchAgentPlan().then((server) => {
      if (cancelled) return;
      if (server) applyServerPlan(server);
      setPlanLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  // Renew Plan handler
  const renewPlan = () => {
    if (!AGENT_MODULE_ENABLED) return null;
    setIsPlanExpired(false);
    setHasActivePlan(true);
    setAgentPlan((prev) => ({
      ...prev,
      daysRemaining: 30,
      status: "active",
      activatedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    }));
  };

  // Update selected localities
  const updateLocalities = (newLocalities) => {
    setSelectedLocalities(newLocalities);
  };

  // Update lead status
  const updateLeadStatus = (leadId, newStatus, additionalData = {}) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          const updatedHistory = [
            ...(lead.history || []),
            {
              date: new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
              action: `Status changed to ${newStatus.replace("_", " ").toUpperCase()}`,
            },
          ];
          return {
            ...lead,
            status: newStatus,
            ...additionalData,
            history: updatedHistory,
          };
        }
        return lead;
      })
    );
  };

  // Match property to lead
  const matchPropertyToLead = (leadId, property) => {
    updateLeadStatus(leadId, "qualified", {
      matchedPropertyId: property.id,
      matchedPropertyTitle: property.title,
    });
  };

  // Schedule a visit
  const scheduleVisit = (visitPayload) => {
    if (!AGENT_MODULE_ENABLED) return null;
    const newVisit = {
      id: `vis-${Date.now()}`,
      status: "upcoming",
      ...visitPayload,
    };
    setVisits((prev) => [newVisit, ...prev]);

    if (visitPayload.leadId) {
      updateLeadStatus(visitPayload.leadId, "visit_scheduled", {
        scheduledVisitDate: visitPayload.fullDate || visitPayload.date,
        scheduledVisitTime: visitPayload.time,
        matchedPropertyId: visitPayload.propertyId,
        matchedPropertyTitle: visitPayload.propertyTitle,
      });
    }
    return newVisit;
  };

  // Update visit status
  const updateVisitStatus = (visitId, status) => {
    setVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, status } : v))
    );
  };

  // Close or lose deal
  const closeDeal = (leadId, outcome, terms = "") => {
    if (!AGENT_MODULE_ENABLED) return null;
    // outcome: 'converted' | 'lost'
    updateLeadStatus(leadId, outcome, {
      notes: terms ? `Outcome: ${outcome.toUpperCase()} - ${terms}` : `Deal marked as ${outcome}`,
    });
    if (outcome === "converted") {
      setAgentProfile((prev) => ({
        ...prev,
        dealsClosedCount: (prev.dealsClosedCount || 0) + 1,
      }));
      // Record commission transaction
      const targetLead = leads.find((l) => l.id === leadId);
      if (targetLead) {
        const commAmt =
          targetLead.dealType === "Rent"
            ? targetLead.budgetNumeric || 25000
            : Math.round((targetLead.budgetNumeric || 20000000) * 0.01);
        const newTx = {
          id: `tx-${Date.now()}`,
          clientName: targetLead.customerName,
          dealType: `${targetLead.dealType === "Rent" ? "Rental" : "Sale"} (${targetLead.bhk || "Property"})`,
          propertyTitle: targetLead.matchedPropertyTitle || "Matched Property",
          locality: targetLead.preferredLocality || "Chennai",
          dealValue: targetLead.budget || "₹25,000",
          commissionRate: targetLead.dealType === "Rent" ? "1 Month Rent" : "1.0%",
          commissionAmount: commAmt,
          commissionFormatted: `₹${commAmt.toLocaleString("en-IN")}`,
          payoutStatus: "processing",
          date: "Today",
          payoutDate: "15 Oct 2026 (Scheduled)",
          invoiceId: `INV-2026-COMM-${Math.floor(1000 + Math.random() * 9000)}`,
          utrNumber: "Pending Bank Clearance",
          bankAccount: "HDFC Bank •••• 4892",
          tdsDeducted: Math.round(commAmt * 0.05),
          netDisbursed: Math.round(commAmt * 0.95),
        };
        setEarningsTransactions((prev) => [newTx, ...prev]);
      }
    }
  };

  // Agent inventory = live owner listings inside the agent's plan areas, from
  // GET /broker/listings: the SERVER restricts it to the agent's covered
  // areas (free trial: one area), whatever filters are sent. Agents never
  // add listings. inventoryStatus ("loading" | "ready" | "error") lets the
  // Properties tab tell a failed load (e.g. the account is not in agent mode
  // on the server yet) from a real "no properties"; reloadInventory retries
  // (AgentNavigator calls it once the server role is BROKER).
  const [localityProperties, setLocalityProperties] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState("loading");
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const reloadInventory = useCallback(() => setInventoryVersion((v) => v + 1), []);
  const localitiesKey = selectedLocalities.join("|");
  useEffect(() => {
    if (!AGENT_MODULE_ENABLED || selectedLocalities.length === 0) {
      setLocalityProperties([]);
      setInventoryStatus("ready");
      return undefined;
    }
    let cancelled = false;
    setInventoryStatus("loading");
    (async () => {
      const cards = [];
      let failed = false;
      try {
        for (let page = 1; page <= 5; page++) {
          const data = await apiGetAuth("/broker/listings", { page, page_size: 100 });
          const items = (data && data.items) || [];
          cards.push(...items);
          if (items.length < 100 || cards.length >= ((data && data.total) || 0)) break;
        }
      } catch {
        // Honest error state on failure; never a substitute list.
        failed = true;
      }
      if (cancelled) return;
      setLocalityProperties(
        failed
          ? []
          : cards.map((card) => {
              const ui = toUiProperty(card);
              ui.badgeType = BADGE_BY_TRANSACTION[ui.transactionType] || "sale";
              return ui;
            })
      );
      setInventoryStatus(failed ? "error" : "ready");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localitiesKey, inventoryVersion]);

  const contextValue = useMemo(() => ({
    planLoaded,
    hasActivePlan,
    agentPlan,
    selectedLocalities,
    agentProfile,
    leads,
    visits,
    earningsTransactions,
    setEarningsTransactions,
    isPlanExpired,
    localityProperties,
    inventoryStatus,
    reloadInventory,
    activatePlan,
    applyServerPlan,
    renewPlan,
    updateLocalities,
    updateLeadStatus,
    matchPropertyToLead,
    scheduleVisit,
    updateVisitStatus,
    closeDeal,
    setIsPlanExpired,
    setAgentProfile,
  }), [
    planLoaded,
    hasActivePlan,
    agentPlan,
    selectedLocalities,
    agentProfile,
    leads,
    visits,
    earningsTransactions,
    isPlanExpired,
    localityProperties,
    inventoryStatus,
    reloadInventory,
  ]);

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
