// Static UI taxonomy only. Property records, projects, demand stats, owner
// names, and phone numbers come from the backend; no demo listings live here.
export const PROPERTY_TYPES = [
  { id: "house", name: "Home", icon: "home" },
  { id: "plot", name: "Plot", icon: "grid" },
  { id: "villa", name: "Villa", icon: "business-outline" },
  { id: "apartment", name: "Apartment", icon: "business" },
  { id: "commercial", name: "Commercial", icon: "briefcase" },
];

export const CHENNAI_LOCALITIES = [
  {
    id: "loc-1",
    name: "Anna Nagar",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "loc-2",
    name: "OMR",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "loc-3",
    name: "Velachery",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "loc-4",
    name: "T. Nagar",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "loc-5",
    name: "Tambaram",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "loc-6",
    name: "Adyar",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "loc-7",
    name: "ECR",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "loc-8",
    name: "Guindy",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
  },
];

// Kept as empty compatibility exports for optional Home sections. They must
// stay empty unless populated from a real backend source.
export const RECOMMENDED_PROPERTIES = [];
export const VERIFIED_PROPERTIES = [];
export const RECENTLY_ADDED = [];
export const ALL_PROPERTIES = [];
export const NEWLY_LAUNCHED_PROJECTS = [];
export const DEMAND_DATA = {};

export default ALL_PROPERTIES;
