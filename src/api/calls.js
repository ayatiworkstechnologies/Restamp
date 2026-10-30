/**
 * Restamp Buyer V1 — "Call button tapped" history (CONTRACT §B, D2).
 *
 * POST /buyer/listings/{id}/call-events records that the buyer tapped Call —
 * never that a call connected or how long it lasted. The server only checks
 * that the listing is publicly visible, that the caller is a BUYER and that
 * it is not the caller's own listing; a repeat within 60 s is deduplicated.
 * GET /buyer/call-events lists the buyer's own taps, newest first, each with
 * the public listing card or null once the listing is no longer public.
 * created_at is explicit UTC and is shown in the user's local time.
 */
import { apiPost, apiGetAuth, getAuthTokenSync } from "./client";
import { withBuyerMode, getConfirmedBuyerRole, isBuyerRole } from "./buyerMode";
import { toUiProperty } from "./mappers";

/**
 * Best-effort record of a Call tap. Call it immediately before opening the
 * dialer — and only from an actual Call button, never on view, contact
 * reveal, sheet open or WhatsApp. It never blocks or fails the call: it
 * skips when signed out or when the server-confirmed role is not BUYER (it
 * never switches the role), and every error resolves to null.
 * @param {number|string} listingId - persistent property_listings.id
 * @returns {Promise<object|null>} the CallEventOut, or null when skipped/failed
 */
export async function recordCallTap(listingId) {
  const id = typeof listingId === "number" ? listingId : parseInt(String(listingId ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0 || !getAuthTokenSync()) return null;
  const role = getConfirmedBuyerRole();
  if (role && !isBuyerRole(role)) return null;
  try {
    return await apiPost(`/buyer/listings/${id}/call-events`);
  } catch {
    return null;
  }
}

/**
 * The authenticated buyer's call-tap history.
 * @param {{page?: number, pageSize?: number}} opts
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export async function fetchCallEvents({ page = 1, pageSize = 20 } = {}) {
  const data = await withBuyerMode(() => apiGetAuth("/buyer/call-events", { page, page_size: pageSize }));
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === "number" ? data.total : 0,
    page: data.page,
    page_size: data.page_size,
  };
}

const NAIVE_ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** Parse an API timestamp as UTC (a zone-less value is UTC); null if invalid. */
function parseUtc(value) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  const d = new Date(NAIVE_ISO_DATETIME.test(s) ? `${s}Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Map a CallEventItem to what the Calls tab renders. `property` is the
 * toUiProperty card, or null when the listing is no longer public — the
 * event is still shown, honestly labelled, never with invented details.
 */
export function toUiCallEvent(row) {
  const at = parseUtc(row && row.created_at);
  const card = row && row.listing && typeof row.listing.listing_id === "number" ? row.listing : null;
  return {
    id: row.id,
    listingId: row.property_listing_id,
    property: card ? toUiProperty(card) : null,
    tappedAt: at ? at.toISOString() : null,
    tappedDate: at ? at.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date unavailable",
    tappedTime: at ? at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
  };
}
