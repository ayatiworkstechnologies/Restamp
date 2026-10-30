/**
 * Saved/wishlist API (Phase 5). Thin wrappers over the frozen Buyer endpoints;
 * cards are mapped with the shared toUiProperty adapter. All calls require an
 * authenticated buyer (401 otherwise) — callers must ensure a token is set.
 *
 * These endpoints are gated on the BUYER role too, so the calls run through
 * `withBuyerMode` (a server-confirmed role switch) like the enquiry and
 * site-visit calls.
 */
import { apiDelete, apiGetAuth, apiPost } from "../../../shared/api/client.js";
import { toUiProperty } from "../../../shared/api/mappers.js";
import { withBuyerMode } from "./buyerMode.js";

export async function fetchSavedWishlist(page = 1, pageSize = 100) {
  const data = await withBuyerMode(() =>
    apiGetAuth("/buyer/saved", { page, page_size: pageSize })
  );
  return {
    items: (data.items || []).map(toUiProperty),
    total: typeof data.total === "number" ? data.total : 0,
  };
}

export async function saveListingRemote(listingId) {
  await withBuyerMode(() => apiPost(`/buyer/saved/${listingId}`));
}

export async function unsaveListingRemote(listingId) {
  await withBuyerMode(() => apiDelete(`/buyer/saved/${listingId}`));
}
