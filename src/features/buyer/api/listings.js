/**
 * Detail helper. Single-record fetch mapped onto the UI shape.
 * Honest data rules (P0): a failed or missing record rejects so callers can
 * show an error/not-found state — never a matching mock object. The gallery
 * keeps neutral type-based placeholders only when the real record carries no
 * usable photos (a visual fallback, not a fabricated property).
 */
import { apiGet } from "../../../shared/api/client.js";
import { toUiProperty } from "../../../shared/api/mappers.js";

export async function fetchListingDetail(listingId) {
  const data = await apiGet(`/buyer/listings/${listingId}`);
  if (!data || typeof data !== "object") {
    throw new Error(`Property not found (${listingId}).`);
  }
  const ui = toUiProperty(data);
  const rawGallery = Array.isArray(data.gallery) ? data.gallery : [];
  const validGallery = rawGallery.filter(
    (u) => typeof u === "string" && u.startsWith("http") && !u.includes("seed.local")
  );
  // No stock/fallback photographs: a detail with no real photos shows an
  // honest empty gallery instead of presenting stock images as the property.
  const gallery = validGallery;
  return { ...ui, gallery };
}

/**
 * Similar properties (Phase 4). Returns UI-shaped cards (max 5, deterministic
 * backend order), [] for an empty result, or null when the source has no
 * numeric backend id (no fetch attempted). API failures reject so callers can
 * render an honest empty state instead of mock substitution.
 */
export async function fetchSimilar(listingId, limit = 5) {
  if (typeof listingId !== "number") return null;
  const data = await apiGet(`/buyer/listings/${listingId}/similar`, { limit });
  if (!Array.isArray(data)) return [];
  return data.map(toUiProperty);
}
