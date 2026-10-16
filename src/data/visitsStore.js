/**
 * Shared in-memory store for Buyer site visits.
 * Keeps PropertyDetailModal and SavedScreen in sync.
 */

let visits = [
  {
    id: "visit-1",
    agentName: "Suresh Babu",
    agentRole: "Verified Agent",
    agentPhone: "+91 97909 88123",
    propertyTitle: "2 BHK Luxury Apartment in Anna Nagar",
    propertyLocation: "Anna Nagar, Chennai",
    propertyPrice: "₹45,000/mo",
    date: "30 Oct 2026",
    time: "04:30 PM",
    status: "upcoming",
    notes: "Inspection of keys and apartment interior. Meeting near Anna Nagar Tower Park.",
  },
  {
    id: "visit-2",
    agentName: "Arun Kumar",
    agentRole: "Property Owner",
    agentPhone: "+91 98840 55667",
    propertyTitle: "2 BHK Flat with Balcony in Kilpauk",
    propertyLocation: "Kilpauk, Chennai",
    propertyPrice: "₹38,000/mo",
    date: "01 Nov 2026",
    time: "11:00 AM",
    status: "upcoming",
    notes: "Owner requested a 15-minute prior call before reaching the location.",
  },
  {
    id: "visit-3",
    agentName: "Sundar Raman",
    agentRole: "Property Owner",
    agentPhone: "+91 98400 12345",
    propertyTitle: "3 BHK Luxury Villa in Adyar",
    propertyLocation: "Adyar, Chennai",
    propertyPrice: "₹2.5 Cr",
    date: "25 Sep 2026",
    time: "03:00 PM",
    status: "completed",
    notes: "Full walkthrough completed. CMDA approval documents inspected.",
  },
  {
    id: "visit-4",
    agentName: "Meera Krishnan",
    agentRole: "RESTAMP Agent",
    agentPhone: "+91 98401 33445",
    propertyTitle: "3 BHK Apartment in T. Nagar",
    propertyLocation: "T. Nagar, Chennai",
    propertyPrice: "₹65,000/mo",
    date: "22 Sep 2026",
    time: "10:30 AM",
    status: "completed",
    notes: "Site visit successfully concluded.",
  },
];

let listeners = [];

export function getBuyerVisits() {
  return [...visits];
}

export function addBuyerVisit(visit) {
  visits = [visit, ...visits];
  listeners.forEach((fn) => {
    try {
      fn(visits);
    } catch (e) {}
  });
  return visits;
}

export function updateBuyerVisit(id, updates) {
  visits = visits.map((v) => (v.id === id ? { ...v, ...updates } : v));
  listeners.forEach((fn) => {
    try {
      fn(visits);
    } catch (e) {}
  });
  return visits;
}

export function subscribeBuyerVisits(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
