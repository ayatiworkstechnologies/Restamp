/**
 * Buyer enquiries API (Phase 6). Wired for the existing Send Enquiry button;
 * list/detail helpers are ready for a future registered Enquiries surface
 * (the on-disk EnquiriesScreen is not in the navigator — see report).
 * All calls require an authenticated buyer; message is optional (≤2000).
 */
import { apiGetAuth, apiPost } from "./client";

export async function createEnquiry(listingId, message) {
  const body = { property_listing_id: listingId };
  if (message !== undefined && message !== null && String(message).trim() !== "") {
    body.message = String(message).slice(0, 2000);
  }
  return apiPost("/buyer/enquiries", body);
}

export async function fetchMyEnquiries(page = 1, pageSize = 20) {
  return apiGetAuth("/buyer/enquiries", { page, page_size: pageSize });
}

export async function fetchEnquiryDetail(enquiryId) {
  return apiGetAuth(`/buyer/enquiries/${enquiryId}`);
}
