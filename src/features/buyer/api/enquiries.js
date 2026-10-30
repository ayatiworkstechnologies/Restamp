/**
 * Buyer enquiries API. createEnquiry backs Send Enquiry (a repeat on an
 * active enquiry appends a message to its thread, D1); the list and detail
 * calls back the Messages tab in SavedScreen.
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

const NAIVE_ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** Parse an API timestamp as UTC (a zone-less value is UTC); null if invalid. */
function parseUtc(value) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  const d = new Date(NAIVE_ISO_DATETIME.test(s) ? `${s}Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const formatStamp = (d) =>
  d
    ? `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
    : "Date unavailable";

/**
 * Map a backend EnquiryOut to the shape the Messages tab renders. Only
 * genuine backend fields are forwarded: the owner's phone or name is never
 * part of an enquiry, so the UI must reveal contact separately. Timestamps
 * are UTC and shown in local time; a missing one reads "Date unavailable",
 * never a substituted date. `messages` is the full persisted thread (detail
 * responses only) and stays null on list rows.
 */
export function toUiEnquiry(row) {
  const listing = row && row.listing ? row.listing : null;
  const lastAt = parseUtc(row.last_message_at) || parseUtc(row.created_at);
  return {
    id: row.id,
    property_listing_id: row.property_listing_id,
    status: String(row.status || "NEW").toLowerCase(),
    closingReason: row.closing_reason || null,
    propertyImage: listing && listing.cover_image_url ? listing.cover_image_url : null,
    propertyTitle: listing ? listing.title : "",
    propertyPrice: listing && listing.price_display ? listing.price_display : "",
    propertyLocation: listing ? [listing.locality, listing.city].filter(Boolean).join(", ") : "",
    lastMessage: row.last_message || row.message || "",
    messageCount: typeof row.message_count === "number" ? row.message_count : 0,
    lastMessageAt: lastAt ? lastAt.toISOString() : null,
    timestamp: formatStamp(lastAt),
    messages: Array.isArray(row.messages)
      ? row.messages.map((m, i) => {
          const at = parseUtc(m.created_at);
          return { id: m.id ?? `opening-${i}`, body: m.body || "", sender: m.sender || "BUYER", sentAt: at ? at.toISOString() : null, timestamp: formatStamp(at) };
        })
      : null,
  };
}
