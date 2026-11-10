/**
 * Contact reveal (Phase 6). POST /buyer/listings/{id}/contact returns the owner
 * phone ONLY on success — callers must never display a number they did not get
 * from this call. Requires an authenticated buyer (401 otherwise).
 *
 * The endpoint is gated on the BUYER role, so the request runs through
 * `withBuyerMode` (server-confirmed role switch) — same as the enquiry and
 * site-visit calls.
 *
 * The response also names the owner (owner_name: public-safe, never a phone
 * number) and says whether the listing is the caller's own (own_listing).
 * Each successful reveal is remembered in memory for the current session
 * (keyed by the auth token + listing), so Call / WhatsApp on a card reuse the
 * number already revealed instead of asking the server again. Nothing is
 * persisted; a new login (new token) starts empty.
 */
import { apiPost, getAuthTokenSync } from "./client.js";
import { withBuyerMode } from "../../features/buyer/api/buyerMode.js";

const revealed = new Map();

function cacheKey(listingId) {
  const token = getAuthTokenSync();
  return token ? `${token}|${Number(listingId)}` : null;
}

/**
 * The contact already revealed for this listing in this session, or null.
 * @returns {{phone: string, ownerName: string|null, ownListing: boolean}|null}
 */
export function getRevealedContact(listingId) {
  const key = cacheKey(listingId);
  return key ? revealed.get(key) || null : null;
}

/**
 * Reveal the owner's contact (authorized, audited server call).
 * @returns {Promise<{phone: string, ownerName: string|null, ownListing: boolean}|null>}
 */
export async function revealContact(listingId) {
  const data = await withBuyerMode(() =>
    apiPost(`/buyer/listings/${listingId}/contact`)
  );
  if (!data || !data.phone) return null;
  const contact = {
    phone: String(data.phone),
    ownerName: typeof data.owner_name === "string" && data.owner_name.trim() ? data.owner_name.trim() : null,
    ownListing: data.own_listing === true,
  };
  const key = cacheKey(listingId);
  if (key) revealed.set(key, contact);
  return contact;
}

export async function revealContactPhone(listingId) {
  const contact = await revealContact(listingId);
  return contact ? contact.phone : null;
}
