/**
 * Buyer enquiries API (Phase 6). Wired for the existing Send Enquiry button;
 * list/detail helpers are ready for a future registered Enquiries surface
 * (the on-disk EnquiriesScreen is not in the navigator — see report).
 * All calls require an authenticated buyer; message is optional (≤2000).
 *
 * Every call goes through `withBuyerMode`, which asks the server to put the
 * account in BUYER mode first (POST /users/me/role) when it is not already
 * there. The backend still enforces the role — this only avoids the
 * "403 BUYER role required" that an account in OWNER mode would otherwise
 * get when it browses and sends an enquiry.
 */
import { apiGetAuth, apiPost } from "../../../shared/api/client.js";
import { withBuyerMode } from "./buyerMode.js";

export async function createEnquiry(listingId, message) {
  const body = { property_listing_id: listingId };
  if (message !== undefined && message !== null && String(message).trim() !== "") {
    body.message = String(message).slice(0, 2000);
  }
  return withBuyerMode(() => apiPost("/buyer/enquiries", body));
}

export async function fetchMyEnquiries(page = 1, pageSize = 20) {
  return withBuyerMode(() =>
    apiGetAuth("/buyer/enquiries", { page, page_size: pageSize })
  );
}

export async function fetchEnquiryDetail(enquiryId) {
  return withBuyerMode(() => apiGetAuth(`/buyer/enquiries/${enquiryId}`));
}

/**
 * Map a backend EnquiryOut to the shape the Messages tab renders.
 * Only genuine backend fields are forwarded. Buyer phone/names are not
 * returned by the backend for leads, so they stay undefined.
 */
export function toUiEnquiry(row) {
  const listing = row && row.listing ? row.listing : null;
  const createdAt = row && row.created_at ? new Date(row.created_at) : null;
  return {
    id: row.id,
    property_listing_id: row.property_listing_id,
    recipientName: "Owner",
    recipientRole: "Property Owner",
    status: String(row.status || "NEW").toLowerCase(),
    timestamp: createdAt ? createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "",
    propertyImage: listing ? listing.cover_image_url : null,
    propertyTitle: listing ? listing.title : "",
    propertyPrice: listing ? (listing.price_paise != null ? `₹${Math.round(listing.price_paise / 100)}` : "") : "",
    propertyLocation: listing ? `${listing.locality || ""}, ${listing.city || ""}`.replace(/^,/, "") : "",
    lastMessage: row.message || "",
    message: row.message || "",
  };
}
