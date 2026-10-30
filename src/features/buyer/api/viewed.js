/**
 * Restamp Buyer V1 — viewed-property history API calls.
 *
 * GET /buyer/viewed and POST /buyer/viewed/{id} return
 * {id, property_listing_id, buyer_user_id, viewed_at, listing} where
 * `listing` is the same public ListingCard as search/saved, and viewed_at is
 * explicit UTC. Errors are thrown as ApiError (see client.js).
 */
import { apiPost, apiGetAuth, getAuthTokenSync } from "../../../shared/api/client.js";
import { withBuyerMode, getConfirmedBuyerRole, isBuyerRole } from "./buyerMode.js";
import { toUiProperty } from "../../../shared/api/mappers.js";
import { parseApiDateTime } from "../../../shared/api/visits.js";

/**
 * Best-effort, passive tracking that a property detail was opened.
 * Never blocks navigation and never throws: failures resolve to null.
 * It also never switches the account's role — viewing a property is not a
 * buyer action worth flipping an OWNER-mode account for — so it only posts
 * when signed in and the server-confirmed role is BUYER (or not yet known;
 * the server still enforces the role).
 * Idempotent on the server: repeats refresh viewed_at.
 * @param {number} listingId - persistent property_listings.id
 * @returns {Promise<object|null>} the ViewedPropertyOut, or null when skipped/failed
 */
export async function recordViewed(listingId) {
  const id = typeof listingId === "number" ? listingId : parseInt(String(listingId ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0 || !getAuthTokenSync()) return null;
  const role = getConfirmedBuyerRole();
  if (role && !isBuyerRole(role)) return null;
  try {
    return await apiPost(`/buyer/viewed/${id}`);
  } catch {
    return null;
  }
}

/**
 * List the authenticated buyer's most recent viewed properties.
 * @param {{page?: number, pageSize?: number}} opts
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export async function fetchViewed({ page = 1, pageSize = 20 } = {}) {
  const data = await withBuyerMode(() => apiGetAuth("/buyer/viewed", { page, page_size: pageSize }));
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === "number" ? data.total : 0,
    page: data.page,
    page_size: data.page_size,
  };
}

/**
 * Map a backend ViewedPropertyOut to the property card shape the Viewed tab
 * and PropertyDetailModal use (toUiProperty: numeric id/backendId, image,
 * address, price label), plus when it was viewed. Returns null for a row
 * without a listing card, so callers can drop it instead of rendering a
 * broken card. viewed_at is UTC; it is formatted in the user's local time.
 */
export function toUiViewed(row) {
  const card = row && row.listing ? row.listing : null;
  if (!card || typeof card.listing_id !== "number") return null;
  const viewedAt = parseApiDateTime(row.viewed_at);
  return {
    ...toUiProperty(card),
    viewed_at: viewedAt ? viewedAt.toISOString() : null,
    viewedTime: viewedAt ? viewedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
    viewedDate: viewedAt ? viewedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "",
  };
}
