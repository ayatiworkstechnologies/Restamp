import React, { createContext, useContext, useState, useMemo } from "react";
import ALL_PROPERTIES from "../data/properties";

const AgentContext = createContext();

const DEFAULT_LOCALITIES = [
  "Anna Nagar",
  "Kilpauk",
  "Mogappair",
  "Adyar",
  "Velachery",
  "T. Nagar",
  "Porur",
  "Guindy",
  "Nungambakkam",
  "Tambaram",
];

const INITIAL_AGENT_LEADS = [
  {
    id: "ag-lead-1",
    customerName: "Arun Kumar",
    phone: "+91 98840 55667",
    email: "arun.kumar@gmail.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    requirement: "2 BHK Luxury Apartment",
    preferredLocality: "Anna Nagar",
    budget: "₹20K – ₹30K",
    budgetNumeric: 25000,
    bhk: "2 BHK",
    dealType: "Rent",
    moveInDate: "Immediate (Within 15 days)",
    message: "Looking for a well-ventilated 2 BHK with covered car parking and lift access, preferably near Tower Park.",
    status: "new", // new | contacted | qualified | visit_scheduled | visited | negotiating | converted | lost
    timestamp: "Today, 10:35 AM",
    matchedPropertyId: "chennai-1",
    matchedPropertyTitle: "2 BHK Luxury Apartment in Anna Nagar",
    notes: "Client works in IT corridor, preferred weekend visit.",
    history: [
      { date: "30 Sep 2026, 10:35 AM", action: "Lead received from RESTAMP Buyer Network" },
    ],
  },
  {
    id: "ag-lead-2",
    customerName: "Meera Krishnan",
    phone: "+91 98401 33445",
    email: "meera.krishnan@outlook.com",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    requirement: "3 BHK Premium Gated Villa",
    preferredLocality: "Adyar",
    budget: "₹2.2 Cr – ₹2.8 Cr",
    budgetNumeric: 25000000,
    bhk: "3 BHK",
    dealType: "Buy",
    moveInDate: "Flexible (1-2 months)",
    message: "Seeking East-facing independent villa with private terrace and clear CMDA approvals. Ready for down payment.",
    status: "qualified",
    timestamp: "Yesterday, 3:20 PM",
    matchedPropertyId: "chennai-2",
    matchedPropertyTitle: "3 BHK Luxury Villa in Adyar",
    notes: "Bank pre-approved loan of ₹1.8 Cr available.",
    history: [
      { date: "29 Sep 2026, 03:20 PM", action: "Lead received" },
      { date: "29 Sep 2026, 05:45 PM", action: "Called client - Verified budget and pre-approval" },
    ],
  },
  {
    id: "ag-lead-3",
    customerName: "Suresh Babu",
    phone: "+91 97909 88123",
    email: "suresh.babu@tcs.com",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    requirement: "2 BHK Semi-Furnished Flat",
    preferredLocality: "Velachery",
    budget: "₹22K – ₹26K",
    budgetNumeric: 24000,
    bhk: "2 BHK",
    dealType: "Rent",
    moveInDate: "By 10th of next month",
    message: "Need 2 BHK flat near Velachery MRTS. 100% power backup essential as working from home.",
    status: "visit_scheduled",
    timestamp: "2 days ago",
    matchedPropertyId: "rec-omr-1",
    matchedPropertyTitle: "2 BHK Apartment near Velachery Main Rd",
    scheduledVisitDate: "Sat, 04 Oct 2026",
    scheduledVisitTime: "04:30 PM",
    notes: "Site visit confirmed with Owner Mr. Ramanathan.",
    history: [
      { date: "28 Sep 2026, 11:10 AM", action: "Lead received" },
      { date: "28 Sep 2026, 02:00 PM", action: "Property matched: rec-omr-1" },
      { date: "29 Sep 2026, 04:00 PM", action: "Visit scheduled for Sat 4:30 PM" },
    ],
  },
  {
    id: "ag-lead-4",
    customerName: "Divya Raman",
    phone: "+91 98410 44556",
    email: "divya.raman@cognizant.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    requirement: "Commercial Office Space (1500 sqft)",
    preferredLocality: "Guindy",
    budget: "₹85K – ₹1 Lakh",
    budgetNumeric: 90000,
    bhk: "Commercial",
    dealType: "Rent",
    moveInDate: "Immediate",
    message: "Looking for plug-and-play office setup for 20 workstations with conference room.",
    status: "negotiating",
    timestamp: "3 days ago",
    matchedPropertyId: "rec-omr-2",
    matchedPropertyTitle: "Prime Commercial Floor in Guindy Tech Zone",
    notes: "Client offered ₹80,000/mo; owner countered at ₹85,000/mo with 6 months deposit.",
    history: [
      { date: "27 Sep 2026, 09:30 AM", action: "Site visit completed" },
      { date: "28 Sep 2026, 03:30 PM", action: "Offer submitted to owner" },
      { date: "29 Sep 2026, 01:15 PM", action: "Counter-offer under review" },
    ],
  },
  {
    id: "ag-lead-5",
    customerName: "Rajesh Balaji",
    phone: "+91 98402 77890",
    email: "rajesh.balaji@yahoo.com",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
    requirement: "3 BHK High-Rise Apartment",
    preferredLocality: "Kilpauk",
    budget: "₹1.75 Cr – ₹2.1 Cr",
    budgetNumeric: 19000000,
    bhk: "3 BHK",
    dealType: "Buy",
    moveInDate: "Ready to move",
    message: "Closed sale deed draft completed! Advance token paid to owner.",
    status: "converted",
    timestamp: "5 days ago",
    matchedPropertyId: "chennai-3",
    matchedPropertyTitle: "3 BHK Luxury Flat in Kilpauk Garden Rd",
    notes: "Deal closed at ₹1.88 Cr. Brokerage invoice generated.",
    history: [
      { date: "25 Sep 2026, 04:00 PM", action: "Token agreement executed" },
      { date: "26 Sep 2026, 11:00 AM", action: "Deal marked as Converted" },
    ],
  },
];

const INITIAL_VISITS = [
  {
    id: "vis-1",
    leadId: "ag-lead-3",
    customerName: "Suresh Babu",
    customerPhone: "+91 97909 88123",
    propertyId: "rec-omr-1",
    propertyTitle: "2 BHK Luxury Apartment in Anna Nagar",
    propertyLocation: "Anna Nagar, Chennai",
    ownerName: "Sundar Raman",
    ownerPhone: "+91 98400 12345",
    date: "Today",
    fullDate: "30 Sep 2026",
    time: "04:30 PM",
    status: "upcoming", // upcoming | completed | cancelled
    notes: "Owner will be at property. Keys available with security if delayed.",
  },
  {
    id: "vis-2",
    leadId: "ag-lead-1",
    customerName: "Arun Kumar",
    customerPhone: "+91 98840 55667",
    propertyId: "chennai-1",
    propertyTitle: "2 BHK Flat with Balcony in Kilpauk",
    propertyLocation: "Kilpauk, Chennai",
    ownerName: "Venkatesh Prasad",
    ownerPhone: "+91 98844 77665",
    date: "Tomorrow",
    fullDate: "01 Oct 2026",
    time: "11:00 AM",
    status: "upcoming",
    notes: "Inspection of covered parking and modular kitchen required.",
  },
  {
    id: "vis-3",
    leadId: "ag-lead-4",
    customerName: "Divya Raman",
    customerPhone: "+91 98410 44556",
    propertyId: "rec-omr-2",
    propertyTitle: "Commercial Floor in Guindy",
    propertyLocation: "Guindy, Chennai",
    ownerName: "Olympia Tech Park Admin",
    ownerPhone: "+91 98411 99001",
    date: "Yesterday",
    fullDate: "29 Sep 2026",
    time: "03:00 PM",
    status: "completed",
    notes: "Site visit done. Client was impressed with power backup and server room.",
  },
  {
    id: "vis-4",
    leadId: "ag-lead-5",
    customerName: "Rajesh Balaji",
    customerPhone: "+91 98402 77890",
    propertyId: "chennai-3",
    propertyTitle: "3 BHK High-Rise in Kilpauk",
    propertyLocation: "Kilpauk, Chennai",
    ownerName: "Kasturi Rangan",
    ownerPhone: "+91 98405 55443",
    date: "24 Sep 2026",
    fullDate: "24 Sep 2026",
    time: "10:30 AM",
    status: "completed",
    notes: "Final inspection before token payment.",
  },
];

const INITIAL_EARNINGS_TRANSACTIONS = [
  {
    id: "tx-1",
    clientName: "Rajesh Balaji",
    dealType: "Sale (3 BHK Apartment)",
    propertyTitle: "3 BHK Luxury Flat in Kilpauk Garden Rd",
    locality: "Kilpauk",
    dealValue: "₹1.88 Cr",
    commissionRate: "1.0%",
    commissionAmount: 188000,
    commissionFormatted: "₹1,88,000",
    payoutStatus: "paid", // paid | processing | pending
    date: "26 Sep 2026",
    payoutDate: "28 Sep 2026",
    invoiceId: "INV-2026-COMM-1092",
    utrNumber: "CMS49281740921",
    bankAccount: "HDFC Bank •••• 4892",
    tdsDeducted: 9400,
    netDisbursed: 178600,
  },
  {
    id: "tx-2",
    clientName: "Arun Kumar",
    dealType: "Rental (2 BHK Flat)",
    propertyTitle: "2 BHK Luxury Apartment in Anna Nagar",
    locality: "Anna Nagar",
    dealValue: "₹30,000 / mo",
    commissionRate: "1 Month Rent",
    commissionAmount: 30000,
    commissionFormatted: "₹30,000",
    payoutStatus: "paid",
    date: "18 Sep 2026",
    payoutDate: "20 Sep 2026",
    invoiceId: "INV-2026-COMM-1085",
    utrNumber: "CMS48102948102",
    bankAccount: "HDFC Bank •••• 4892",
    tdsDeducted: 1500,
    netDisbursed: 28500,
  },
  {
    id: "tx-3",
    clientName: "Suresh Babu",
    dealType: "Rental (2 BHK Flat)",
    propertyTitle: "2 BHK Apartment near Velachery Main Rd",
    locality: "Velachery",
    dealValue: "₹24,000 / mo",
    commissionRate: "1 Month Rent",
    commissionAmount: 24000,
    commissionFormatted: "₹24,000",
    payoutStatus: "processing",
    date: "02 Oct 2026",
    payoutDate: "10 Oct 2026 (Expected)",
    invoiceId: "INV-2026-COMM-1104",
    utrNumber: "Pending Bank Clearance",
    bankAccount: "HDFC Bank •••• 4892",
    tdsDeducted: 1200,
    netDisbursed: 22800,
  },
  {
    id: "tx-4",
    clientName: "Divya Raman",
    dealType: "Commercial Lease",
    propertyTitle: "Prime Commercial Floor in Guindy Tech Zone",
    locality: "Guindy",
    dealValue: "₹85,000 / mo",
    commissionRate: "1 Month Rent",
    commissionAmount: 85000,
    commissionFormatted: "₹85,000",
    payoutStatus: "pending",
    date: "05 Oct 2026",
    payoutDate: "12 Oct 2026 (Under Verification)",
    invoiceId: "INV-2026-COMM-1110",
    utrNumber: "Pending Token Execution",
    bankAccount: "HDFC Bank •••• 4892",
    tdsDeducted: 4250,
    netDisbursed: 80750,
  },
];

export function AgentProvider({ children }) {
  // Active Agent Subscription Plan
  // Default to active Pro Broker plan so returning agent demo is instantly active
  const [hasActivePlan, setHasActivePlan] = useState(true);
  const [agentPlan, setAgentPlan] = useState({
    id: "agent-pro",
    name: "Agent Pro Plan",
    locationLimit: 10,
    price: "₹6,999",
    priceNumeric: 6999,
    validity: "30 Days",
    activatedAt: "06 Sep 2026",
    daysRemaining: 24,
    status: "active",
    invoiceNumber: "INV-2026-AGT-8821",
  });

  // Localities covered by the Agent
  const [selectedLocalities, setSelectedLocalities] = useState(DEFAULT_LOCALITIES);

  // Agent Profile details
  const [agentProfile, setAgentProfile] = useState({
    name: "Vikram Prabhu",
    agency: "Chennai Prime Realtors",
    phone: "+91 98400 99888",
    email: "vikram.prabhu@restamp.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    reraNumber: "TN/AGENT/2024/00842",
    kycStatus: "Verified",
    rating: 4.9,
    dealsClosedCount: 7,
    memberSince: "Jan 2025",
  });

  // Leads and Visits
  const [leads, setLeads] = useState(INITIAL_AGENT_LEADS);
  const [visits, setVisits] = useState(INITIAL_VISITS);

  // Earnings and Commission Transactions
  const [earningsTransactions, setEarningsTransactions] = useState(INITIAL_EARNINGS_TRANSACTIONS);

  // Plan Expiry status simulation
  const [isPlanExpired, setIsPlanExpired] = useState(false);

  // Activate Plan handler
  const activatePlan = (plan, localities) => {
    setHasActivePlan(true);
    setIsPlanExpired(false);
    setAgentPlan({
      id: plan.id,
      name: plan.name,
      locationLimit: plan.locationLimit || (plan.name.includes("15") ? 15 : plan.name.includes("5") ? 5 : 10),
      price: plan.price,
      priceNumeric: plan.priceNumeric || parseInt(plan.price?.replace(/[^0-9]/g, "")) || 6999,
      validity: plan.validity || "30 Days",
      activatedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      daysRemaining: 30,
      status: "active",
      invoiceNumber: `INV-2026-AGT-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    if (localities && localities.length > 0) {
      setSelectedLocalities(localities);
    }
  };

  // Renew Plan handler
  const renewPlan = () => {
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

  // Filter available properties by Agent's selected localities
  const localityProperties = useMemo(() => {
    if (!selectedLocalities || selectedLocalities.length === 0) {
      return ALL_PROPERTIES;
    }
    const lowerLocalities = selectedLocalities.map((loc) => loc.toLowerCase().trim());
    return ALL_PROPERTIES.filter((item) => {
      const propLoc = (item.location || "").toLowerCase();
      const propAddr = (item.address || "").toLowerCase();
      const propTitle = (item.title || "").toLowerCase();
      return lowerLocalities.some(
        (loc) => propLoc.includes(loc) || propAddr.includes(loc) || propTitle.includes(loc)
      );
    });
  }, [selectedLocalities]);

  return (
    <AgentContext.Provider
      value={{
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
        activatePlan,
        renewPlan,
        updateLocalities,
        updateLeadStatus,
        matchPropertyToLead,
        scheduleVisit,
        updateVisitStatus,
        closeDeal,
        setIsPlanExpired,
        setAgentProfile,
      }}
    >
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
