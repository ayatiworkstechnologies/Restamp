/**
 * Saved/wishlist API (Phase 5). Thin wrappers over the frozen Buyer endpoints;
 * cards are mapped with the shared toUiProperty adapter. All calls require an
 * authenticated buyer (401 otherwise) — callers must ensure a token is set.
 */
import { apiDelete, apiGetAuth, apiPost } from "./client";
import { toUiProperty } from "./mappers";

export async function fetchSavedWishlist(page = 1, pageSize = 100) {
  const data = await apiGetAuth("/buyer/saved", { page, page_size: pageSize });
  return {
    items: (data.items || []).map(toUiProperty),
    total: typeof data.total === "number" ? data.total : 0,
  };
}

export async function saveListingRemote(listingId) {
  await apiPost(`/buyer/saved/${listingId}`);
}

export async function unsaveListingRemote(listingId) {
  await apiDelete(`/buyer/saved/${listingId}`);
}
