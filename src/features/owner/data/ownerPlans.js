/**
 * RESTAMP Seller (Owner) plans — single source for the Owner Plans screen and
 * the Menu "Owner Plan" tab.
 *
 * Plan                     Price    Offer    Validity  Posts      RM   Social
 * Startup Plan             1,200      499    30 days   1          –    –
 * Super Plan               1,600      999    45 days   3          –    –
 * Premium Plan             2,000    1,799    60 days   5          Yes  –
 * Elite Plan               3,000    2,499    90 days   20         Yes  Yes
 * Special Plan             4,000    3,499    90 days   30         Yes  Yes
 * Business Plan           70,000   49,999    90 days   50         Yes  Yes
 * Unlimited Business Plan 125,000  99,999   180 days   unlimited  Yes  Yes
 * Location: City Limit for every plan.
 *
 * `listingLimit` is a number (Infinity = unlimited) because the add-property
 * gate compares against it; show it with formatListingLimit().
 */

const inr = (n) => `₹${n.toLocaleString("en-IN")}`;

export const formatListingLimit = (limit) =>
  Number.isFinite(limit) ? String(limit) : "Unlimited";

const SPECS = [
  { id: "owner-startup", name: "Startup Plan", mrp: 1200, offer: 499, days: 30, posts: 1, rm: false, social: false },
  { id: "owner-super", name: "Super Plan", mrp: 1600, offer: 999, days: 45, posts: 3, rm: false, social: false },
  { id: "owner-premium", name: "Premium Plan", mrp: 2000, offer: 1799, days: 60, posts: 5, rm: true, social: false, popular: true },
  { id: "owner-elite", name: "Elite Plan", mrp: 3000, offer: 2499, days: 90, posts: 20, rm: true, social: true },
  { id: "owner-special", name: "Special Plan", mrp: 4000, offer: 3499, days: 90, posts: 30, rm: true, social: true },
  { id: "owner-business", name: "Business Plan", mrp: 70000, offer: 49999, days: 90, posts: 50, rm: true, social: true },
  { id: "owner-unlimited-business", name: "Unlimited Business Plan", mrp: 125000, offer: 99999, days: 180, posts: Infinity, rm: true, social: true },
];

export const OWNER_PLANS_LIST = SPECS.map((p) => {
  const validity = `${p.days} Days`;
  const posts = formatListingLimit(p.posts);
  const postsLabel = Number.isFinite(p.posts)
    ? `${p.posts} property ${p.posts === 1 ? "post" : "posts"}`
    : "Unlimited property posts";
  return {
    id: p.id,
    name: p.name,
    titleColor: "#0F172A",
    price: inr(p.offer),
    originalPrice: inr(p.mrp),
    priceNumeric: p.offer,
    originalPriceNumeric: p.mrp,
    paymentType: "One-time payment",
    validity,
    billingText: `One-time payment · ${validity}`,
    priceSub1: `One-time payment · ${validity}`,
    priceSub2: postsLabel,
    listingLimit: p.posts,
    listingLimitLabel: posts,
    isPopular: !!p.popular,
    features: [
      "Unlimited Leads",
      "City Limit Reach",
      ...(p.rm ? ["Relationship Manager Assistance"] : []),
      ...(p.social ? ["Social Media Promotion"] : []),
    ],
    buttonText: "Choose Plan",
  };
});
