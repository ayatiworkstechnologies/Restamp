/**
 * Detail helper. Single-record fetch mapped onto the UI shape.
 * Gracefully falls back to mock properties when backend is offline.
 */
import { apiGet } from "./client";
import { toUiProperty, PROPERTY_TYPE_FALLBACK_IMAGES } from "./mappers";
import ALL_PROPERTIES from "../data/properties";

export async function fetchListingDetail(listingId) {
  try {
    const data = await apiGet(`/buyer/listings/${listingId}`);
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
  } catch (e) {
    const found = ALL_PROPERTIES.find((p) => String(p.id) === String(listingId));
    if (found) {
      return {
        ...found,
        gallery: found.gallery || [found.image],
      };
    }
    throw e;
  }
}

/**
 * Similar properties (Phase 4). Returns UI-shaped cards (max 5, deterministic
 * backend order) or null when the source has no numeric backend id (mock flows).
 * Callers keep existing mock fallback on null/error/empty per their own UI rules.
 */
export async function fetchSimilar(listingId, limit = 5) {
  if (typeof listingId !== "number") return null;
  const data = await apiGet(`/buyer/listings/${listingId}/similar`, { limit });
  if (!Array.isArray(data)) return [];
  return data.map(toUiProperty);
}
