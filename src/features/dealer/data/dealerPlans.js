/**
 * RESTAMP Dealer plans. Prices/limits mirror the backend catalogue in
 * restamp-backend/app/services/owner_plans.py (DEALER_PLANS) — change both
 * together.
 *
 * Plan              Price    Validity  Property posts
 * Dealer Starter    1,999    30 days   10
 * Dealer Growth     4,999    60 days   30
 * Dealer Pro        9,999    90 days   75
 * Dealer Unlimited 19,999   180 days   unlimited
 */
const inr = (n) => `₹${n.toLocaleString("en-IN")}`;

const SPECS = [
  { id: "dealer-starter", name: "Dealer Starter", price: 1999, days: 30, posts: 10 },
  { id: "dealer-growth", name: "Dealer Growth", price: 4999, days: 60, posts: 30, popular: true },
  { id: "dealer-pro", name: "Dealer Pro", price: 9999, days: 90, posts: 75 },
  { id: "dealer-unlimited", name: "Dealer Unlimited", price: 19999, days: 180, posts: Infinity },
];

export const DEALER_PLANS_LIST = SPECS.map((p) => {
  const validity = `${p.days} Days`;
  const postsLabel = Number.isFinite(p.posts) ? `${p.posts} property posts` : "Unlimited property posts";
  return {
    id: p.id,
    kind: "dealer",
    name: p.name,
    titleColor: "#0F172A",
    price: inr(p.price),
    priceNumeric: p.price,
    validity,
    priceSub1: `One-time payment · ${validity}`,
    priceSub2: postsLabel,
    listingLimit: p.posts,
    isPopular: !!p.popular,
    features: [
      postsLabel,
      "Unlimited Leads",
      "City Limit Reach",
      ...(p.price >= 4999 ? ["Relationship Manager Assistance"] : []),
    ],
    buttonText: "Choose Plan",
  };
});
