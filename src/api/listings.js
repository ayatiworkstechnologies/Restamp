/**
 * Detail helper. Single-record fetch mapped onto the UI shape.
 * Honest data rules (P0): a failed or missing record rejects so callers can
 * show an error/not-found state — never a matching mock object. The gallery
 * keeps neutral type-based placeholders only when the real record carries no
 * usable photos (a visual fallback, not a fabricated property).
 */
import { apiGet } from "./client";
import { toUiProperty, PROPERTY_TYPE_FALLBACK_IMAGES } from "./mappers";

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
  const fallbackPool =
    PROPERTY_TYPE_FALLBACK_IMAGES[ui.type] ||
    PROPERTY_TYPE_FALLBACK_IMAGES.Apartment;
  const gallery =
    validGallery.length > 0
      ? validGallery
      : [ui.image, ...fallbackPool.filter((img) => img !== ui.image)];
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
