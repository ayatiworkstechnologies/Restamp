/**
 * RESTAMP Dealer plans — sold PER PINCODE. Mirrors the backend catalogue in
 * restamp-backend/app/services/owner_plans.py (DEALER_PLANS); change both
 * together.
 *
 * Option     Each pincode   Validity
 * 30 Days    ₹200           30 days
 * 60 Days    ₹300           60 days
 *
 * The dealer picks an option, then the pincodes; the total is
 * rate × pincodes. A dealer plan opens the Sales Hub only. Posting
 * properties needs an owner plan (bought separately).
 */
export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const SPECS = [
  { id: "dealer-pincode-30", name: "Dealer 30 Days", rate: 200, days: 30 },
  { id: "dealer-pincode-60", name: "Dealer 60 Days", rate: 300, days: 60 },
];

export const DEALER_PLANS_LIST = SPECS.map((p) => ({
  id: p.id,
  kind: "dealer",
  name: p.name,
  ratePerPincode: p.rate,
  days: p.days,
  price: `${inr(p.rate)} / pincode`,
  priceNumeric: p.rate,
  validity: `${p.days} Days`,
  tabLabel: `${p.days} Days`,
  listingLimit: 0,
  features: ["Sales Hub access in chosen pincodes", "Owner numbers in your areas", "Unlimited Leads"],
}));

/** Total for a dealer option and a number of pincodes (rupees). */
export const dealerTotal = (plan, count) => (plan ? plan.ratePerPincode * Math.max(0, count) : 0);
