/**
 * RESTAMP Owner V1 — listing management API calls.
 *
 * All functions require the user to be authenticated as OWNER.
 * Errors thrown as ApiError (see client.js).
 */
import {
  apiPost,
  apiGetAuth,
  apiPutAuth,
  apiDelete,
  getAuthTokenSync,
  API_BASE_URL,
} from "./client";
import { getCleanImageUrl } from "./mappers";

/**
 * Map a UI property form object to the backend OwnerListingCreate schema.
 *
 * The OwnerAddPropertyScreen stores values in varied formats; this mapper
 * normalises them into what the backend expects.
 *
 * RENT wiring: every form field supported by POST /owner/listings is
 * forwarded here. Chip labels (lock-in, agreement, available-from,
 * furnishing, etc.) are passed through unchanged — the backend owns the
 * label→canonical normalization. Empty optionals become null/omitted;
 * 0 and false are preserved as legitimate values.
 */
export function buildPayload(property) {
  // --- Transaction type ---
  const lookingTo = (property.lookingTo || property.purpose || "RENT").toUpperCase();
  const txMap = {
    RENT: "RENT",
    RESALE: "RESALE",
    BUY: "BUY",
    SELL: "BUY",
    LEASE: "LEASE",
    "PG/CO-LIVING": "RENT",
    "PAYING GUEST": "RENT",
  };
  const transaction_type = txMap[lookingTo] || "RENT";

  // --- Property type ---
  const uiType = (property.propertyType || property.category || "APARTMENT").toUpperCase();
  const propMap = {
    APARTMENT: "APARTMENT",
    "STUDIO APARTMENT": "APARTMENT",
    "BUILDER FLOOR": "APARTMENT",
    VILLA: "VILLA",
    "INDEPENDENT HOUSE / VILLA": "VILLA",
    "INDEPENDENT HOUSE": "VILLA",
    HOUSE: "HOUSE",
    COMMERCIAL: "COMMERCIAL",
    OFFICE: "COMMERCIAL",
    SHOP: "COMMERCIAL",
    SHOWROOM: "COMMERCIAL",
    "COMMERCIAL BUILDING": "COMMERCIAL",
    "WAREHOUSE / GODOWN": "COMMERCIAL",
    "COMMERCIAL LAND": "COMMERCIAL",
    "CO-WORKING SPACE": "COMMERCIAL",
    PLOT: "PLOT",
    "PLOT / LAND": "PLOT",
    "AGRICULTURAL LAND": "AGRICULTURAL_LAND",
    AGRICULTURAL_LAND: "AGRICULTURAL_LAND",
  };
  const property_type = propMap[uiType] || "APARTMENT";

  // --- Price ---
  let rawPrice = parseFloat(
    String(property.price || property.rentAmount || property.salePrice || 0).replace(/[^0-9.]/g, "")
  );
  if (isNaN(rawPrice) || rawPrice <= 0) rawPrice = 1;
  const price_rupees = Math.round(rawPrice);

  // --- Price period ---
  const price_period =
    transaction_type === "RENT" || transaction_type === "LEASE" ? "MONTHLY" : "TOTAL";

  // --- Construction status ---
  const availStatus = (property.availabilityStatus || "").toUpperCase();
  let construction_status = null;
  if (availStatus.includes("UNDER")) {
    construction_status = "UNDER_CONSTRUCTION";
  } else if (availStatus.includes("LAUNCH")) {
    construction_status = "NEW_LAUNCH";
  } else if (availStatus.includes("READY") || availStatus.includes("MOVE")) {
    construction_status = "READY_TO_MOVE";
  }

  // --- Location ---
  // Pincode is required: no fake default. Callers must collect a real 6-digit
  // pincode before submit; we throw here so a missing pincode can never be
  // silently replaced and POSTed as "600000".
  const rawPincode = String(property.pincode ?? property.postalCode ?? "").trim();
  if (!/^\d{6}$/.test(rawPincode)) {
    throw new Error("A valid 6-digit pincode is required before submit.");
  }
  const pincode = rawPincode;
  const locality = (property.locality || property.area || "").trim() || "Unknown";
  const city = (property.city || property.district || "Chennai").trim();
  const address_line = (property.address || property.landmark || "").trim() || null;

  // --- Dimensions ---
  const rawArea = parseInt(String(property.builtUpArea || property.carpetArea || "").replace(/[^0-9]/g, ""), 10);
  const area_value = isNaN(rawArea) || rawArea <= 0 ? null : rawArea;
  const area_unit = area_value ? "sqft" : null;

  const rawBedrooms = parseInt(String(property.bedrooms || property.bhk || "").replace(/[^0-9]/g, ""), 10);
  const bedrooms = isNaN(rawBedrooms) ? null : rawBedrooms;

  const rawBathrooms = parseInt(String(property.bathrooms || "").replace(/[^0-9]/g, ""), 10);
  const bathrooms = isNaN(rawBathrooms) ? null : rawBathrooms;

  // --- Title ---
  const bhkLabel = property.bhk || (bedrooms ? `${bedrooms} BHK` : "");
  const titleParts = [bhkLabel, property_type.charAt(0) + property_type.slice(1).toLowerCase(), "in", locality].filter(Boolean);
  const title =
    (property.title || titleParts.join(" ") || "Property").slice(0, 255);

  // --- Description ---
  const desc = (property.description || "").trim() || null;

  // --- Images (legacy URL list; cover first for backward compatibility) ---
  const images = (property.images || []).filter((url) => typeof url === "string" && url.startsWith("http")).slice(0, 20);
  if (property.coverPhoto && property.coverPhoto.startsWith("http") && !images.includes(property.coverPhoto)) {
    images.unshift(property.coverPhoto);
  }

  // --- Helpers (null-safe; 0 and false are legitimate values) ---
  const cleanStr = (value, max) => {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    if (!s) return null;
    return max ? s.slice(0, max) : s;
  };
  const toIntOrNull = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
    const s = String(value).trim();
    if (!s) return null;
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? null : n;
  };
  const toBoolOrNull = (value) => {
    if (typeof value === "boolean") return value;
    const s = String(value ?? "").trim().toLowerCase();
    if (["yes", "true", "1", "y"].includes(s)) return true;
    if (["no", "false", "0", "n"].includes(s)) return false;
    return null;
  };
  const toStrArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v) => typeof v === "string" && v.trim() !== "")
      .map((v) => v.trim());
  };

  // --- Contact (per-listing overrides; identity stays server-side) ---
  const contact = property.contact || {};
  const contact_phone = cleanStr(contact.phone ?? property.phoneNumber ?? property.phone, 20);
  const contact_email = cleanStr(contact.email ?? property.email, 255);

  // --- Location extras (district falls back server-side to city) ---
  const district = cleanStr(property.district, 255);
  const sub_locality = cleanStr(property.subLocality ?? property.sub_locality, 255);
  const society_name = cleanStr(property.apartmentSociety ?? property.society_name, 255);
  const house_no = cleanStr(property.houseNo ?? property.house_no, 100);
  const landmark = cleanStr(property.landmark, 255);
  // No lat/lng state exists in the form yet; omit (never invent coordinates).
  const latitude = property.latitude ?? property.lat ?? null;
  const longitude = property.longitude ?? property.lng ?? null;

  // --- Physical extras ---
  const balconies = toIntOrNull(property.balconies);
  const built_up_area = toIntOrNull(property.builtUpArea ?? property.built_up_area);
  const super_built_up_area = toIntOrNull(property.superBuiltUpArea ?? property.super_built_up_area);
  const total_floors = toIntOrNull(property.totalFloors ?? property.total_floors);
  const floor_on = cleanStr(property.floor ?? property.floorOn ?? property.floor_on, 10);
  const is_duplex = toBoolOrNull(property.isDuplex ?? property.duplex);
  const property_age_band = cleanStr(property.propertyAge ?? property.property_age_band, 20);
  const furnishing = cleanStr(property.furnishing, 50);
  const covered_parking = toIntOrNull(property.coveredParking ?? property.covered_parking);
  const open_parking = toIntOrNull(property.openParking ?? property.open_parking);
  const open_sides = cleanStr(property.openSides ?? property.open_sides, 10);
  const overlooking = cleanStr(property.overlooking, 50);
  const power_backup = cleanStr(property.powerBackup ?? property.power_backup, 50);
  const facing = cleanStr(property.facing, 20);
  const ownership_type = cleanStr(property.ownership ?? property.ownership_type, 50);

  // --- RENT terms (labels passed through; backend normalizes) ---
  // Raw input strings are preferred so a legitimate 0 stays 0; the form's
  // precomputed deposit/maintenance numbers are the fallback.
  const security_deposit_rupees = toIntOrNull(
    property.securityDeposit ?? property.security_deposit_rupees ?? property.deposit
  );
  const maintenance_rupees = toIntOrNull(
    property.maintenanceCharges ?? property.maintenance_rupees ?? property.maintenance
  );
  const rent_terms = {
    security_deposit_rupees,
    maintenance_rupees,
    maintenance_period: cleanStr(property.maintenanceFrequency ?? property.maintenance_period, 20),
    is_negotiable: toBoolOrNull(property.rentNegotiable ?? property.negotiable ?? property.is_negotiable),
    available_from: cleanStr(property.availableFrom ?? property.available_from, 50),
    tenant_preference: cleanStr(property.tenantPreference ?? property.tenant_preference, 20),
    lock_in_months: cleanStr(property.lockInPeriod ?? property.lock_in_months, 20),
    agreement_months: cleanStr(
      property.preferredAgreementDuration ?? property.agreement_months, 20
    ),
  };

  // --- Amenities / features / rooms (names only; server resolves by name) ---
  const amenities = toStrArray(property.amenities);
  const property_features = toStrArray(property.propertyFeatures ?? property.property_features);
  const other_rooms = toStrArray(property.otherRooms ?? property.other_rooms);

  // --- Photos (categorized; order = display order, index 0 = cover) ---
  const photos = Array.isArray(property.photos) && property.photos.length > 0
    ? property.photos
        .filter((p) => p && typeof p.url === "string" && p.url.startsWith("http"))
        .slice(0, 20)
        .map((p) => ({ url: p.url, category: p.category || null }))
    : undefined;

  return {
    title,
    transaction_type,
    property_type,
    price_rupees,
    price_period,
    description: desc,
    construction_status,
    locality,
    city,
    district,
    pincode,
    address_line,
    sub_locality,
    society_name,
    house_no,
    landmark,
    latitude,
    longitude,
    area_value,
    area_unit,
    bedrooms,
    bathrooms,
    balconies,
    built_up_area,
    super_built_up_area,
    total_floors,
    floor_on,
    is_duplex,
    property_age_band,
    furnishing,
    covered_parking,
    open_parking,
    open_sides,
    overlooking,
    power_backup,
    facing,
    ownership_type,
    contact_phone,
    contact_email,
    rent_terms,
    amenities,
    property_features,
    other_rooms,
    images,
    ...(photos ? { photos } : {}),
  };
}

/**
 * Create a new owner property listing.
 * @param {object} property - The form data from OwnerAddPropertyScreen
 * @returns {Promise<object>} The created OwnerListingOut object
 */
export async function createOwnerListing(property) {
  const payload = buildPayload(property);
  return apiPost("/owner/listings", payload);
}

/**
 * Max image size accepted by the backend (mirrors server validation so
 * oversized files are rejected locally with a readable message instead of
 * a wasted upload).
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Derive a consistent {name, type} multipart pair for an upload.
 *
 * Rules (smallest safe client fix for backend 422s):
 * - Extension must be one of .jpg/.jpeg/.png/.webp, else throw locally.
 * - If the picker MIME exists and agrees with the extension, use it.
 * - If the picker MIME is missing, derive it from the extension
 *   (photo.png + missing MIME -> image/png, never image/jpeg).
 * - If the picker MIME conflicts with a supported extension, normalize to
 *   the extension-derived MIME (extension wins; bytes are untouched).
 * - If size is known and exceeds the limit, throw locally.
 * Never renames the URI, never re-encodes bytes.
 */
export function normalizeUploadFile({ name, type, size } = {}) {
  const cleanName = typeof name === "string" && name.trim() !== "" ? name : null;
  if (typeof size === "number" && Number.isFinite(size) && size > MAX_UPLOAD_BYTES) {
    throw new Error("Image exceeds the 10 MB limit.");
  }
  const dot = cleanName ? cleanName.lastIndexOf(".") : -1;
  const ext = dot >= 0 ? cleanName.slice(dot).toLowerCase() : "";
  const extMime = EXT_TO_MIME[ext];
  if (!extMime) {
    throw new Error(
      ext
        ? `Unsupported image format (${ext}). Please choose a JPG, PNG, or WebP photo.`
        : "Photo is missing a file extension. Please choose a JPG, PNG, or WebP photo."
    );
  }
  const declared = typeof type === "string" && type.trim() !== "" ? type.split(";")[0].trim().toLowerCase() : "";
  // Consistent pair wins; missing MIME derives from extension; conflicting
  // MIME normalizes to the extension (bytes untouched either way).
  const mime = !declared || declared === extMime ? declared || extMime : extMime;
  return { name: cleanName || `photo-${Date.now()}.jpg`, type: mime };
}

/**
 * Build the FormData "file" part for an upload.
 *
 * React Native's fetch accepts the {uri, name, type} object form (native
 * bridge streams the file). Browsers do NOT — a plain object is coerced to
 * the text "[object Object]", which FastAPI cannot bind to UploadFile and
 * rejects with 422 "Invalid request". So for browser-resolvable URIs
 * (blob:/data:, as produced by expo-image-picker on web), fetch the bytes
 * and append a real File. Native file:///content:// URIs keep the object
 * form. Throws a retryable offline error when bytes cannot be read, and a
 * readable error when the resolved blob is empty/oversized.
 */
export async function toUploadableFile({ uri, name, type }) {
  const needsBytes =
    typeof uri === "string" &&
    (uri.startsWith("blob:") || uri.startsWith("data:")) &&
    typeof File !== "undefined";
  if (!needsBytes) return { uri, name, type };
  let blob;
  try {
    blob = await (await fetch(uri)).blob();
  } catch {
    const err = new Error(
      "Could not read the selected photo. Please try selecting it again."
    );
    err.kind = "retry";
    err.status = 0;
    throw err;
  }
  if (!blob || blob.size === 0) {
    throw new Error("The selected photo is empty. Please choose another photo.");
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image exceeds the 10 MB limit.");
  }
  return new File([blob], name, { type: type || blob.type || "image/jpeg" });
}

/**
 * Upload one picked image file to an existing owner listing.
 * Uses multipart/form-data with the current auth token (same session as
 * createOwnerListing). Returns the server PhotoUploadOut
 * ({id, url, category, mime_type, byte_size, order_index, is_cover}).
 * Throws ApiError-compatible Error with `status` on HTTP failures.
 */
export async function uploadListingPhoto(listingId, { uri, name, type, size, category }) {
  const token = getAuthTokenSync();
  const file = normalizeUploadFile({ name, type, size });
  const form = new FormData();
  form.append("file", await toUploadableFile({ uri, name: file.name, type: file.type }));
  if (category) form.append("category", category);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/owner/listings/${listingId}/photos`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });
  } catch {
    const err = new Error(
      "No connection. Make sure the backend is running and reachable."
    );
    err.kind = "offline";
    err.status = 0;
    throw err;
  }
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;
  const err = new Error(
    (data && data.detail) || `Photo upload failed (${response.status}).`
  );
  err.kind =
    response.status === 401 ? "login" : response.status === 403 ? "denied" : "retry";
  err.status = response.status;
  err.detail = data && data.detail;
  throw err;
}

/**
 * True for user-picked device files (expo-image-picker URIs); remote
 * http(s) URLs are legacy/sample entries, not uploads.
 */
export function isLocalPhotoUri(uri) {
  if (typeof uri !== "string") return false;
  return (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("data:")
  );
}

/**
 * Drop ids that no longer exist in photosList (photo deleted from the form).
 * Identity is the stable photo `id` (unique per pick, even for duplicate
 * filenames) — never array indexes.
 */
export function syncIdSetWithPhotos(ids, photosList) {
  const live = new Set((photosList || []).map((p) => p && p.id));
  return (ids || []).filter((id) => live.has(id));
}

/**
 * Local device photos that still need uploading: local URI, not yet
 * confirmed uploaded, in current array order. Remote URLs and already
 * uploaded photos are never included (never re-upload, never upload
 * deleted photos).
 */
export function pendingLocalPhotos(photosList, uploadedOkIds) {
  const done = new Set(uploadedOkIds || []);
  return (photosList || []).filter(
    (p) => p && isLocalPhotoUri(p.url) && !done.has(p.id)
  );
}

// ---------------------------------------------------------------------------
// Persistent owner drafts (server-backed; single authoritative system).
// form_data carries the complete 7-step snapshot incl. photo metadata.
// ---------------------------------------------------------------------------

/**
 * Save a new draft. Returns the created draft ({id, ...}).
 */
export async function createDraft({ transaction_type, title, current_step, form_data }) {
  return apiPost("/owner/drafts", { transaction_type, title, current_step, form_data });
}

/**
 * Replace an existing draft's snapshot. Returns the updated draft.
 */
export async function updateDraft(draftId, { transaction_type, title, current_step, form_data }) {
  return apiPutAuth(`/owner/drafts/${draftId}`, {
    transaction_type, title, current_step, form_data,
  });
}

/**
 * List the authenticated owner's drafts (most recently updated first).
 */
export async function fetchDrafts() {
  const data = await apiGetAuth("/owner/drafts");
  return Array.isArray(data.items) ? data.items : [];
}

/**
 * Get one owned draft. Throws (404) when missing or owned by someone else.
 */
export async function fetchDraft(draftId) {
  return apiGetAuth(`/owner/drafts/${draftId}`);
}

/**
 * Discard a draft. Resolves true on 204; throws otherwise (incl. 404).
 */
export async function deleteDraft(draftId) {
  await apiDelete(`/owner/drafts/${draftId}`);
  return true;
}

/**
 * Fetch the authenticated owner's listings.
 * @param {number} page
 * @param {number} pageSize
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export async function fetchOwnerListings(page = 1, pageSize = 20) {
  return apiGetAuth("/owner/listings", { page, page_size: pageSize });
}

/**
 * Fetch a single owner listing by ID.
 * @param {number} listingId
 * @returns {Promise<object>}
 */
export async function fetchOwnerListing(listingId) {
  return apiGetAuth(`/owner/listings/${listingId}`);
}

/**
 * Map a backend OwnerListingOut to the shape OwnerContext properties use.
 * This allows the UI components to work with both mock and live data.
 */
export function toOwnerProperty(apiListing) {
  const isRent = apiListing.price_period === "MONTHLY";
  const pType = apiListing.property_type === "COMMERCIAL" ? "Commercial" : "Apartment";
  const coverPhoto = getCleanImageUrl(
    apiListing.cover_image_url,
    pType,
    apiListing.listing_id || 0
  );

  return {
    id: String(apiListing.listing_id),
    listing_id: apiListing.listing_id,
    title: apiListing.title,
    purpose: apiListing.transaction_type,
    category: apiListing.property_type === "COMMERCIAL" ? "Commercial" : "Residential",
    propertyType: apiListing.property_type,
    price: isRent ? apiListing.price_paise / 100 : apiListing.price_paise / 100,
    priceFormatted: apiListing.price_display,
    priceUnit: isRent ? "/ month" : "",
    city: apiListing.city,
    locality: apiListing.locality,
    address: apiListing.address_line || "",
    builtUpArea: apiListing.area_value ? `${apiListing.area_value} ${apiListing.area_unit || "sqft"}` : "",
    bedrooms: apiListing.bedrooms !== null ? String(apiListing.bedrooms) : "",
    bathrooms: apiListing.bathrooms !== null ? String(apiListing.bathrooms) : "",
    status: apiListing.verification_status === "VERIFIED" ? "active" : "pending",
    verification_status: apiListing.verification_status,
    listing_status: apiListing.listing_status,
    images: [coverPhoto],
    coverPhoto,
    description: apiListing.description || "",
    // Stats not available from listing API (no backend counter yet)
    views: 0,
    enquiries: 0,
    visits: 0,
  };
}
