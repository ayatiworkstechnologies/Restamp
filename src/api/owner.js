/**
 * RESTAMP Owner V1 — listing management API calls.
 *
 * All functions require the user to be authenticated as OWNER.
 * Errors thrown as ApiError (see client.js).
 */
import { apiPost, apiGetAuth } from "./client";
import { getCleanImageUrl } from "./mappers";

/**
 * Map a UI property form object to the backend OwnerListingCreate schema.
 *
 * The OwnerAddPropertyScreen stores values in varied formats; this mapper
 * normalises them into what the backend expects.
 */
function buildPayload(property) {
  // --- Transaction type ---
  const lookingTo = (property.lookingTo || property.purpose || "RENT").toUpperCase();
  const txMap = {
    RENT: "RENT",
    RESALE: "RESALE",
    BUY: "BUY",
    SELL: "BUY",
    LEASE: "LEASE",
    "PG/CO-LIVING": "RENT",
    "PAYING GUEST": "RENT",
  };
  const transaction_type = txMap[lookingTo] || "RENT";

  // --- Property type ---
  const uiType = (property.propertyType || property.category || "APARTMENT").toUpperCase();
  const propMap = {
    APARTMENT: "APARTMENT",
    "STUDIO APARTMENT": "APARTMENT",
    "BUILDER FLOOR": "APARTMENT",
    VILLA: "VILLA",
    "INDEPENDENT HOUSE / VILLA": "VILLA",
    "INDEPENDENT HOUSE": "VILLA",
    HOUSE: "HOUSE",
    COMMERCIAL: "COMMERCIAL",
    OFFICE: "COMMERCIAL",
    SHOP: "COMMERCIAL",
    SHOWROOM: "COMMERCIAL",
    "COMMERCIAL BUILDING": "COMMERCIAL",
    "WAREHOUSE / GODOWN": "COMMERCIAL",
    "COMMERCIAL LAND": "COMMERCIAL",
    "CO-WORKING SPACE": "COMMERCIAL",
    PLOT: "PLOT",
    "PLOT / LAND": "PLOT",
    "AGRICULTURAL LAND": "AGRICULTURAL_LAND",
    AGRICULTURAL_LAND: "AGRICULTURAL_LAND",
  };
  const property_type = propMap[uiType] || "APARTMENT";

  // --- Price ---
  let rawPrice = parseFloat(
    String(property.price || property.rentAmount || property.salePrice || 0).replace(/[^0-9.]/g, "")
  );
  if (isNaN(rawPrice) || rawPrice <= 0) rawPrice = 1;
  const price_rupees = Math.round(rawPrice);

  // --- Price period ---
  const price_period =
    transaction_type === "RENT" || transaction_type === "LEASE" ? "MONTHLY" : "TOTAL";

  // --- Construction status ---
  const availStatus = (property.availabilityStatus || "").toUpperCase();
  let construction_status = null;
  if (availStatus.includes("UNDER")) {
    construction_status = "UNDER_CONSTRUCTION";
  } else if (availStatus.includes("LAUNCH")) {
    construction_status = "NEW_LAUNCH";
  } else if (availStatus.includes("READY") || availStatus.includes("MOVE")) {
    construction_status = "READY_TO_MOVE";
  }

  // --- Location ---
  const locality = (property.locality || property.area || "").trim() || "Unknown";
  const city = (property.city || property.district || "Chennai").trim();
  const pincode = (property.pincode || property.postalCode || "600000").trim();
  const address_line = (property.address || property.landmark || "").trim() || null;

  // --- Dimensions ---
  const rawArea = parseInt(String(property.builtUpArea || property.carpetArea || "").replace(/[^0-9]/g, ""), 10);
  const area_value = isNaN(rawArea) || rawArea <= 0 ? null : rawArea;
  const area_unit = area_value ? "sqft" : null;

  const rawBedrooms = parseInt(String(property.bedrooms || property.bhk || "").replace(/[^0-9]/g, ""), 10);
  const bedrooms = isNaN(rawBedrooms) ? null : rawBedrooms;

  const rawBathrooms = parseInt(String(property.bathrooms || "").replace(/[^0-9]/g, ""), 10);
  const bathrooms = isNaN(rawBathrooms) ? null : rawBathrooms;

  // --- Title ---
  const bhkLabel = property.bhk || (bedrooms ? `${bedrooms} BHK` : "");
  const titleParts = [bhkLabel, property_type.charAt(0) + property_type.slice(1).toLowerCase(), "in", locality].filter(Boolean);
  const title =
    (property.title || titleParts.join(" ") || "Property").slice(0, 255);

  // --- Description ---
  const desc = (property.description || "").trim() || null;

  // --- Images ---
  const images = (property.images || []).filter((url) => typeof url === "string" && url.startsWith("http")).slice(0, 20);
  if (property.coverPhoto && property.coverPhoto.startsWith("http") && !images.includes(property.coverPhoto)) {
    images.unshift(property.coverPhoto);
  }

  return {
    title,
    transaction_type,
    property_type,
    price_rupees,
    price_period,
    description: desc,
    construction_status,
    locality,
    city,
    pincode,
    address_line,
    area_value,
    area_unit,
    bedrooms,
    bathrooms,
    images,
  };
}

/**
 * Create a new owner property listing.
 * @param {object} property - The form data from OwnerAddPropertyScreen
 * @returns {Promise<object>} The created OwnerListingOut object
 */
export async function createOwnerListing(property) {
  const payload = buildPayload(property);
  return apiPost("/owner/listings", payload);
}

/**
 * Fetch the authenticated owner's listings.
 * @param {number} page
 * @param {number} pageSize
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export async function fetchOwnerListings(page = 1, pageSize = 20) {
  return apiGetAuth("/owner/listings", { page, page_size: pageSize });
}

/**
 * Fetch a single owner listing by ID.
 * @param {number} listingId
 * @returns {Promise<object>}
 */
export async function fetchOwnerListing(listingId) {
  return apiGetAuth(`/owner/listings/${listingId}`);
}

/**
 * Map a backend OwnerListingOut to the shape OwnerContext properties use.
 * This allows the UI components to work with both mock and live data.
 */
export function toOwnerProperty(apiListing) {
  const isRent = apiListing.price_period === "MONTHLY";
  const pType = apiListing.property_type === "COMMERCIAL" ? "Commercial" : "Apartment";
  const coverPhoto = getCleanImageUrl(
    apiListing.cover_image_url,
    pType,
    apiListing.listing_id || 0
  );

  return {
    id: String(apiListing.listing_id),
    listing_id: apiListing.listing_id,
    title: apiListing.title,
    purpose: apiListing.transaction_type,
    category: apiListing.property_type === "COMMERCIAL" ? "Commercial" : "Residential",
    propertyType: apiListing.property_type,
    price: isRent ? apiListing.price_paise / 100 : apiListing.price_paise / 100,
    priceFormatted: apiListing.price_display,
    priceUnit: isRent ? "/ month" : "",
    city: apiListing.city,
    locality: apiListing.locality,
    address: apiListing.address_line || "",
    builtUpArea: apiListing.area_value ? `${apiListing.area_value} ${apiListing.area_unit || "sqft"}` : "",
    bedrooms: apiListing.bedrooms !== null ? String(apiListing.bedrooms) : "",
    bathrooms: apiListing.bathrooms !== null ? String(apiListing.bathrooms) : "",
    status: apiListing.verification_status === "VERIFIED" ? "active" : "pending",
    verification_status: apiListing.verification_status,
    listing_status: apiListing.listing_status,
    images: [coverPhoto],
    coverPhoto,
    description: apiListing.description || "",
    // Stats not available from listing API (no backend counter yet)
    views: 0,
    enquiries: 0,
    visits: 0,
  };
}
