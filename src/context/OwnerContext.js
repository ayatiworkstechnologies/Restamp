import React, { createContext, useContext, useState } from "react";

const OwnerContext = createContext();

const INITIAL_PROPERTIES = [
  {
    id: "own-prop-1",
    title: "2 BHK Luxury Apartment",
    purpose: "Rent",
    category: "Residential",
    propertyType: "Apartment",
    bhk: "2",
    city: "Chennai",
    district: "Chennai",
    locality: "Anna Nagar",
    address: "Plot 42, 5th Avenue, Shanthi Colony, Anna Nagar",
    landmark: "Opposite Tower Park",
    price: 25000,
    priceUnit: "/ month",
    deposit: 100000,
    maintenance: 3000,
    availableFrom: "25 Sep 2026",
    builtUpArea: "1200 sq.ft",
    carpetArea: "950 sq.ft",
    floor: "3",
    totalFloors: "8",
    propertyAge: "3 Years",
    facing: "East",
    furnishing: "Semi Furnished",
    parking: "Yes",
    amenities: ["Lift", "Security", "Power Backup", "Gym", "Parking", "CCTV", "Park"],
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    status: "active", // active | pending | closed | rejected | expired | draft
    views: 1248,
    enquiries: 35,
    visits: 8,
    listedDate: "12 Aug 2026",
    documents: [
      { id: "doc-1", name: "Sale_Deed_AnnaNagar.pdf", type: "Ownership Proof", status: "Verified" },
      { id: "doc-2", name: "Property_Tax_Receipt_2025.pdf", type: "Property Document", status: "Verified" },
    ],
  },
  {
    id: "own-prop-2",
    title: "3 BHK Premium Sea-View Villa",
    purpose: "Sell",
    category: "Residential",
    propertyType: "Villa",
    bhk: "3",
    city: "Chennai",
    district: "Chennai",
    locality: "ECR",
    address: "Villa 7, Blue Lagoon Enclave, ECR",
    landmark: "Near VGP Golden Beach",
    price: 24500000,
    priceFormatted: "₹2.45 Cr",
    priceUnit: "",
    pricePerSqft: 8750,
    negotiable: "Yes",
    availableFrom: "Immediately",
    builtUpArea: "2800 sq.ft",
    carpetArea: "2350 sq.ft",
    floor: "G+2",
    totalFloors: "2",
    propertyAge: "1 Year",
    facing: "North-East",
    furnishing: "Furnished",
    parking: "Yes",
    amenities: ["Security", "Power Backup", "Gym", "Club House", "Park", "CCTV", "Swimming Pool"],
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    status: "active",
    views: 840,
    enquiries: 18,
    visits: 4,
    listedDate: "28 Aug 2026",
    documents: [
      { id: "doc-3", name: "Patta_Chitta_ECR.pdf", type: "Ownership Proof", status: "Verified" },
    ],
  },
  {
    id: "own-prop-3",
    title: "Commercial Office Floor",
    purpose: "Rent",
    category: "Commercial",
    propertyType: "Office",
    bhk: "N/A",
    city: "Chennai",
    district: "Chennai",
    locality: "Guindy",
    address: "Olympia Tech Road, Guindy Industrial Estate",
    landmark: "Near Guindy Metro Station",
    price: 85000,
    priceUnit: "/ month",
    deposit: 500000,
    maintenance: 12000,
    availableFrom: "01 Oct 2026",
    builtUpArea: "1850 sq.ft",
    carpetArea: "1500 sq.ft",
    floor: "4",
    totalFloors: "10",
    propertyAge: "4 Years",
    facing: "North",
    furnishing: "Semi Furnished",
    parking: "Yes",
    amenities: ["Lift", "Security", "Power Backup", "CCTV", "Fire Safety", "Cafeteria"],
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    status: "active",
    views: 420,
    enquiries: 12,
    visits: 2,
    listedDate: "05 Sep 2026",
    documents: [
      { id: "doc-4", name: "Commercial_Lease_Deed.pdf", type: "Ownership Proof", status: "Verified" },
    ],
  },
  {
    id: "own-prop-4",
    title: "1 BHK Studio Apartment",
    purpose: "Rent",
    category: "Residential",
    propertyType: "Apartment",
    bhk: "1",
    city: "Chennai",
    district: "Chennai",
    locality: "OMR",
    address: "Tower B, Pacifica Techzone, Navalur, OMR",
    landmark: "Behind Vivira Mall",
    price: 16000,
    priceUnit: "/ month",
    deposit: 60000,
    maintenance: 2000,
    availableFrom: "15 Oct 2026",
    builtUpArea: "650 sq.ft",
    carpetArea: "520 sq.ft",
    floor: "7",
    totalFloors: "14",
    propertyAge: "2 Years",
    facing: "East",
    furnishing: "Furnished",
    parking: "Yes",
    amenities: ["Lift", "Security", "Power Backup", "Gym", "Club House"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    moderationNote: "Under review by RESTAMP Verification Team. Estimated completion within 4 hours.",
    views: 0,
    enquiries: 0,
    visits: 0,
    listedDate: "Today",
    documents: [
      { id: "doc-5", name: "Electricity_Bill_OMR.pdf", type: "Property Document", status: "In Review" },
    ],
  },
  {
    id: "own-prop-5",
    title: "4 BHK Penthouse with Private Terrace",
    purpose: "Sell",
    category: "Residential",
    propertyType: "Apartment",
    bhk: "4+",
    city: "Chennai",
    district: "Chennai",
    locality: "Adyar",
    address: "12, Kasturibai Nagar, 3rd Cross, Adyar",
    landmark: "Near Adyar Gate",
    price: 42000000,
    priceFormatted: "₹4.20 Cr",
    priceUnit: "",
    pricePerSqft: 12500,
    negotiable: "No",
    availableFrom: "Immediately",
    builtUpArea: "3360 sq.ft",
    carpetArea: "2900 sq.ft",
    floor: "11",
    totalFloors: "11",
    propertyAge: "5 Years",
    facing: "South-East",
    furnishing: "Furnished",
    parking: "Yes",
    amenities: ["Lift", "Security", "Power Backup", "Gym", "Club House", "Park", "CCTV"],
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    status: "rejected",
    rejectionReason: "Title document scan is blurry and NOC from housing society is missing page 2.",
    views: 45,
    enquiries: 0,
    visits: 0,
    listedDate: "10 Sep 2026",
    documents: [
      { id: "doc-6", name: "Title_Deed_Adyar.pdf", type: "Ownership Proof", status: "Rejected" },
    ],
  },
  {
    id: "own-prop-6",
    title: "2 BHK Independent Gated House",
    purpose: "Rent",
    category: "Residential",
    propertyType: "House",
    bhk: "2",
    city: "Chennai",
    district: "Chennai",
    locality: "Porur",
    address: "24, Sri Ram Nagar, Porur",
    landmark: "Near Porur Junction",
    price: 18000,
    priceUnit: "/ month",
    deposit: 80000,
    maintenance: 1000,
    availableFrom: "Occupied",
    builtUpArea: "1100 sq.ft",
    carpetArea: "900 sq.ft",
    floor: "Ground",
    totalFloors: "1",
    propertyAge: "6 Years",
    facing: "North",
    furnishing: "Unfurnished",
    parking: "Yes",
    amenities: ["Security", "Power Backup", "Parking"],
    images: [
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
    status: "closed",
    closedOutcome: "Rented",
    closedDate: "14 Aug 2026",
    views: 920,
    enquiries: 24,
    visits: 6,
    listedDate: "15 Jul 2026",
    documents: [],
  },
  {
    id: "own-prop-7",
    title: "Prime Commercial Showroom",
    purpose: "Lease",
    category: "Commercial",
    propertyType: "Shop",
    bhk: "N/A",
    city: "Chennai",
    district: "Chennai",
    locality: "T. Nagar",
    address: "Usman Road, T. Nagar",
    landmark: "Near Panagal Park",
    price: 120000,
    priceUnit: "/ month",
    deposit: 800000,
    leaseDuration: "3 Years",
    lockInPeriod: "1 Year",
    availableFrom: "Occupied",
    builtUpArea: "2100 sq.ft",
    carpetArea: "1850 sq.ft",
    floor: "Ground",
    totalFloors: "4",
    propertyAge: "8 Years",
    facing: "East",
    furnishing: "Unfurnished",
    parking: "Yes",
    amenities: ["Power Backup", "CCTV", "Security"],
    images: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    status: "closed",
    closedOutcome: "Leased",
    closedDate: "02 Jun 2026",
    views: 1450,
    enquiries: 48,
    visits: 11,
    listedDate: "10 Apr 2026",
    documents: [],
  },
  {
    id: "own-prop-8",
    title: "3 BHK Gated Community Villa (Draft)",
    purpose: "Sell",
    category: "Residential",
    propertyType: "Villa",
    bhk: "3",
    city: "Chennai",
    district: "Chennai",
    locality: "Velachery",
    address: "Lake View Avenue, Velachery",
    landmark: "Near Phoenix Marketcity",
    price: 18500000,
    priceFormatted: "₹1.85 Cr",
    priceUnit: "",
    pricePerSqft: 7400,
    negotiable: "Yes",
    availableFrom: "Next Month",
    builtUpArea: "2500 sq.ft",
    carpetArea: "2100 sq.ft",
    floor: "G+1",
    totalFloors: "2",
    propertyAge: "New Construction",
    facing: "North",
    furnishing: "Semi Furnished",
    parking: "Yes",
    amenities: ["Lift", "Security", "Power Backup", "Gym", "Club House"],
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
    ],
    coverPhoto: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
    status: "draft",
    views: 0,
    enquiries: 0,
    visits: 0,
    listedDate: "Yesterday",
    documents: [],
  },
];

const INITIAL_LEADS = [
  {
    id: "lead-1",
    customerName: "Harrison Ledley",
    phone: "+91 98840 12345",
    email: "harrison.ledley@gmail.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-1",
    propertyTitle: "2 BHK Luxury Apartment",
    propertyLocality: "Anna Nagar, Chennai",
    propertyPrice: "₹25,000 / month",
    propertyImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80",
    requirement: "Rent",
    budget: "₹20K – ₹30K",
    rating: 5,
    status: "new", // new | contacted | visit_scheduled | visited | negotiating | closed
    timestamp: "Today • 10:35 AM",
    preferredVisitDate: "Tomorrow, 11:00 AM",
    message: "Great place with a lovely garden. Conveniently located near the city",
    visitData: null,
    closedOutcome: null,
  },
  {
    id: "lead-2",
    customerName: "Priya Sundaram",
    phone: "+91 97910 88231",
    email: "priya.sundaram@techcorp.in",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-2",
    propertyTitle: "3 BHK Premium Sea-View Villa",
    propertyLocality: "ECR, Chennai",
    propertyPrice: "₹2.45 Cr",
    propertyImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80",
    requirement: "Buy",
    budget: "₹2.2 Cr – ₹2.5 Cr",
    rating: 5,
    status: "visit_scheduled",
    timestamp: "Yesterday • 4:15 PM",
    preferredVisitDate: "Saturday, 4:00 PM",
    message: "Saw the villa photos, really appreciate the coastal architecture. Would love an in-person tour this weekend with my architect and spouse.",
    visitData: {
      date: "Saturday, 28 Sep",
      time: "4:00 PM",
      note: "Customer visiting with family and architect to verify layout and terrace access.",
    },
    closedOutcome: null,
  },
  {
    id: "lead-3",
    customerName: "Karthik Raman",
    phone: "+91 94441 55678",
    email: "karthik@startupx.co",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-3",
    propertyTitle: "Commercial Office Floor",
    propertyLocality: "Guindy, Chennai",
    propertyPrice: "₹85,000 / month",
    propertyImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80",
    requirement: "Rent",
    budget: "₹80K – ₹90K",
    rating: 5,
    status: "contacted",
    timestamp: "2 days ago",
    preferredVisitDate: "Monday, 10:30 AM",
    message: "Looking for an office space for our 18-member tech consultancy. Need high-speed fiber lines and 24/7 power backup guarantee.",
    visitData: null,
    closedOutcome: null,
  },
  {
    id: "lead-4",
    customerName: "Deepak Verma",
    phone: "+91 98200 44321",
    email: "deepak.v@finance.com",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-1",
    propertyTitle: "2 BHK Luxury Apartment",
    propertyLocality: "Anna Nagar, Chennai",
    propertyPrice: "₹25,000 / month",
    propertyImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80",
    requirement: "Rent",
    budget: "₹24K – ₹26K",
    rating: 5,
    status: "negotiating",
    timestamp: "3 days ago",
    preferredVisitDate: "Completed",
    message: "Had a great site visit. We agree to ₹24,500/month. Ready to sign agreement with 10 months security deposit.",
    visitData: {
      date: "23 Sep 2026",
      time: "11:00 AM",
      note: "Customer satisfied with interiors, final round on agreement clauses.",
    },
    closedOutcome: null,
  },
  {
    id: "lead-5",
    customerName: "Suresh Narayanan",
    phone: "+91 98410 99887",
    email: "suresh.n@tcs.com",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-6",
    propertyTitle: "2 BHK Independent Gated House",
    propertyLocality: "Porur, Chennai",
    propertyPrice: "₹18,000 / month",
    propertyImage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=300&q=80",
    requirement: "Rent",
    budget: "₹18K",
    rating: 5,
    status: "closed",
    closedOutcome: "Rented",
    timestamp: "14 Aug 2026",
    preferredVisitDate: "Completed",
    message: "Rental agreement signed and keys handed over.",
    visitData: null,
  },
  {
    id: "lead-6",
    customerName: "Ananya Iyer",
    phone: "+91 97100 23411",
    email: "ananya.iyer@health.org",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-2",
    propertyTitle: "3 BHK Premium Sea-View Villa",
    propertyLocality: "ECR, Chennai",
    propertyPrice: "₹2.45 Cr",
    propertyImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80",
    requirement: "Buy",
    budget: "₹2.4 Cr",
    rating: 5,
    status: "visited",
    timestamp: "4 days ago",
    preferredVisitDate: "Visited on 22 Sep",
    message: "Completed site inspection. Requested structural drawings and NOC copy for bank loan sanction.",
    visitData: {
      date: "22 Sep 2026",
      time: "3:30 PM",
      note: "Positive response, awaiting loan pre-approval.",
    },
    closedOutcome: null,
  },
  {
    id: "lead-7",
    customerName: "Rajesh Khanna",
    phone: "+91 98402 77123",
    email: "rajesh.khanna@auto.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-1",
    propertyTitle: "2 BHK Luxury Apartment",
    propertyLocality: "Anna Nagar, Chennai",
    propertyPrice: "₹25,000 / month",
    propertyImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80",
    requirement: "Rent",
    budget: "₹25,000",
    rating: 5,
    status: "contacted",
    timestamp: "Yesterday • 2:30 PM",
    preferredVisitDate: "Flexible",
    message: "Enquired about immediate availability and whether water charges are included.",
    visitData: null,
    closedOutcome: null,
    internalNotes: [
      { id: "note-1", text: "Spoke on phone. Looking for 11 months agreement. Works in Ambattur IT park.", timestamp: "Yesterday • 3:00 PM" },
    ],
  },
  {
    id: "lead-8",
    customerName: "Sneha Mohan",
    phone: "+91 97890 33412",
    email: "sneha.m@designstudio.in",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    propertyId: "own-prop-1",
    propertyTitle: "2 BHK Luxury Apartment",
    propertyLocality: "Anna Nagar, Chennai",
    propertyPrice: "₹25,000 / month",
    propertyImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80",
    requirement: "Rent",
    budget: "₹25K – ₹28K",
    status: "visit_scheduled",
    timestamp: "2 days ago",
    preferredVisitDate: "Tomorrow, 11:00 AM",
    message: "Interested in visiting tomorrow. Need to check kitchen modular fittings and balcony view.",
    visitData: {
      date: "Tomorrow",
      time: "11:00 AM",
      note: "Customer visiting with spouse to verify parking slot and balcony view.",
    },
    closedOutcome: null,
  },
];

export function OwnerProvider({ children }) {
  // Subscription State
  const [subscription, setSubscription] = useState({
    id: "owner-pro",
    name: "Owner Pro Plan",
    planName: "Owner Pro Plan",
    validity: "3 Months",
    daysRemaining: 24,
    listingLimit: 5,
    usedListings: 3,
    price: "₹2,999",
    amountPaid: "₹2,999",
    active: true,
    status: "Active",
    startDate: "01 Sep 2026",
    expiryDate: "01 Dec 2026",
  });

  // Owner Profile
  const [ownerProfile, setOwnerProfile] = useState({
    name: "Arunavo Mukherjee",
    firstName: "Arunavo",
    phone: "+91 98401 23456",
    email: "rajesh.kumar@example.com",
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

  return (
    <OwnerContext.Provider
      value={{
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
      }}
    >
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
