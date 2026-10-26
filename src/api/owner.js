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
  apiPatchAuth,
  apiDelete,
  getAuthTokenSync,
  API_BASE_URL,
} from "./client";
import { getCleanImageUrl } from "./mappers";

/**
 * Chennai-only pincode rule (temporary business rule, Phase 2). Single
 * frontend source of truth — every form gate and the payload builder share
 * it. Pincodes stay strings end-to-end (never int-converted) so leading
 * zeros survive; exactly six digits are required before the range check.
 */
export const CHENNAI_PINCODE_MIN = 600001;
export const CHENNAI_PINCODE_MAX = 600118;
export const CHENNAI_PINCODE_ERROR =
  "Please enter a valid pincode between 600001 and 600118.";

/**
 * True only for exactly-six-digit strings within the Chennai range.
 * Trims surrounding whitespace; null/undefined/"" are invalid (callers
 * needing "required" vs "invalid" wording branch on emptiness first).
 */
export function isValidChennaiPincode(value) {
  const s = String(value ?? "").trim();
  if (!/^\d{6}$/.test(s)) return false;
  const n = Number(s);
  return n >= CHENNAI_PINCODE_MIN && n <= CHENNAI_PINCODE_MAX;
}

/**
 * Normalize a mandatory pincode: trimmed string, or null when missing.
 * Throws CHENNAI_PINCODE_ERROR for any present-but-invalid value.
 */
export function requireChennaiPincode(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!isValidChennaiPincode(s)) throw new Error(CHENNAI_PINCODE_ERROR);
  return s;
}

/**
 * Owner contact email is optional (Add/Edit Step 1). Blank or
 * whitespace-only means "no email" and maps to null — never a validation
 * error. A non-blank value must match the backend email shape; otherwise
 * callers reject it with OWNER_EMAIL_ERROR.
 */
export const OWNER_EMAIL_ERROR = "Please enter a valid email address";
const OWNER_EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * True for blank (omitted) or well-formed emails; false only for non-empty
 * malformed addresses. Trims surrounding whitespace before checking.
 */
export function isValidOwnerEmail(value) {
  const s = String(value ?? "").trim();
  if (!s) return true;
  return OWNER_EMAIL_RE.test(s);
}

/**
 * Normalize an optional email: trimmed string, or null when blank.
 * Throws OWNER_EMAIL_ERROR for a present-but-invalid value.
 */
export function normalizeOwnerEmail(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!OWNER_EMAIL_RE.test(s)) throw new Error(OWNER_EMAIL_ERROR);
  return s.slice(0, 255);
}

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
    NEW: "BUY",
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
  // Pincode is required and Chennai-only (600001–600118): no fake default.
  // Callers must collect a real in-range pincode before submit; we throw
  // here so a missing/invalid pincode can never be silently replaced.
  const rawPincode = String(property.pincode ?? property.postalCode ?? "").trim();
  const pincode = requireChennaiPincode(rawPincode);
  if (pincode === null) {
    throw new Error(CHENNAI_PINCODE_ERROR);
  }
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
  // Email is optional: blank/whitespace maps to null (never an error);
  // a present-but-malformed address throws so it can never be POSTed.
  const contact = property.contact || {};
  const contact_phone = cleanStr(contact.phone ?? property.phoneNumber ?? property.phone, 20);
  const contact_email = normalizeOwnerEmail(contact.email ?? property.email);

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
  const rent_terms = (transaction_type === "RENT" || transaction_type === "LEASE")
    ? {
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
  }
    // RESALE/BUY listings have no terms row in the database: omit terms so
    // the backend (which explicitly rejects terms on those types) accepts
    // the payload. Mirrors the existing sale-type nulling of
    // tenant/lock-in/agreement in the submit handler.
    : null;

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
 * Fetch EVERY listing of the authenticated owner, following the server's
 * pagination until the owner's own `total` is reached.
 *
 * The backend scopes the list to the bearer token's owner, so this never
 * returns another account's rows. Paging through the whole set (instead of
 * only the first page) keeps the tab counts and the rendered cards
 * consistent for owners with more listings than one page.
 *
 * @param {number} pageSize - server page size (max 100)
 * @param {number} maxPages - safety bound on the number of requests
 * @returns {Promise<{items: Array, total: number}>}
 */
export async function fetchAllOwnerListings(pageSize = 100, maxPages = 20) {
  const items = [];
  let total = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const resp = await apiGetAuth("/owner/listings", { page, page_size: pageSize });
    const pageItems = Array.isArray(resp?.items) ? resp.items : [];
    items.push(...pageItems);
    total = typeof resp?.total === "number" ? resp.total : items.length;
    if (pageItems.length < pageSize) break;
    if (items.length >= total) break;
  }
  return { items, total: Math.max(total, items.length) };
}

/**
 * Fetch the authenticated owner's buyer-enquiry leads (P3 leads MVP).
 * Only rows the backend authorizes for this owner are ever returned.
 * @param {{propertyListingId?: number, status?: "NEW"|"CONTACTED"|"CLOSED", page?: number, pageSize?: number}} opts
 * @returns {Promise<{items: Array, total: number, page: number, page_size: number}>}
 */
export async function fetchOwnerLeads({ propertyListingId, status, page = 1, pageSize = 50 } = {}) {
  const params = { page, page_size: pageSize };
  if (propertyListingId != null) params.property_listing_id = propertyListingId;
  if (status) params.status = status;
  return apiGetAuth("/owner/leads", params);
}

/**
 * Persist an owner-side lead status change (P4).
 * Status accepts either UI casing ("contacted") or backend casing
 * ("CONTACTED"); it is normalized to the backend vocabulary
 * (NEW/CONTACTED/CLOSED) — anything else rejects with a 422 ApiError.
 * Returns the updated OwnerLeadOut row (phone-free). Callers must render
 * from this server-confirmed response and roll back optimistic flips when
 * the request fails.
 */
export async function updateOwnerLeadStatus(leadId, { status, closingReason } = {}) {
  const normalized = String(status || "").toUpperCase();
  const body = { status: normalized };
  if (closingReason !== undefined && closingReason !== null) {
    body.closing_reason = closingReason;
  }
  return apiPatchAuth(`/owner/leads/${leadId}`, body);
}

/**
 * Paise integer -> short display string (mirrors backend price_display).
 */
function formatLeadPaise(paise, period) {
  const rupees = Math.floor((paise || 0) / 100);
  const main =
    rupees >= 10000000
      ? `₹${(rupees / 10000000).toFixed(2)} Cr`
      : rupees >= 100000
      ? `₹${(rupees / 100000).toFixed(2)} L`
      : `₹${rupees.toLocaleString("en-IN")}`;
  return period === "MONTHLY" ? `${main}/mo` : main;
}

/**
 * Map a backend OwnerLeadOut to the shape owner lead screens render (P3).
 * Only genuine backend fields are forwarded. Buyer phone, name, avatar,
 * rating, budget, visit, and email have no backend source and stay
 * undefined — callers render honest unavailable states instead of samples.
 * propertyId is the string form of the numeric listing id so the existing
 * selectPropertyLeads matching (same property id) keeps working; status is
 * lowercased to the UI vocabulary ("new"/"contacted"/"closed").
 */
export function toOwnerLead(row) {
  const listing = row && row.listing ? row.listing : null;
  return {
    id: row.id,
    propertyId: row.property_listing_id != null ? String(row.property_listing_id) : undefined,
    property_listing_id: row.property_listing_id,
    buyer_user_id: row.buyer_user_id,
    customerName: row.buyer_user_id != null ? `Buyer #${row.buyer_user_id}` : "Buyer enquiry",
    phone: undefined,
    avatar: undefined,
    rating: undefined,
    email: undefined,
    message: row.message || undefined,
    status: String(row.status || "NEW").toLowerCase(),
    closedOutcome: row.closing_reason || undefined,
    propertyTitle: listing ? listing.title : "",
    propertyPrice: listing ? formatLeadPaise(listing.price_paise, listing.price_period) : "",
    propertyLocality: "",
    propertyImage: undefined,
    budget: undefined,
    timestamp: undefined,
    visitData: undefined,
    agency: undefined,
  };
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
 * Update an existing owner property listing in place (Edit mode).
 * NEVER creates a new listing: callers must pass the persistent listing_id
 * and must never fall back to createOwnerListing on failure.
 * @param {number} listingId - persistent property_listings.id
 * @param {object} payload - full OwnerListingUpdate-shaped body
 * @returns {Promise<object>} The updated OwnerListingOut object
 */
export async function updateOwnerListing(listingId, payload) {
  return apiPatchAuth(`/owner/listings/${listingId}`, payload);
}

/**
 * Delete one gallery photo from an owned listing. Returns true on 204;
 * throws otherwise (incl. 404 for foreign listings/photos).
 */
export async function deleteListingPhoto(listingId, mediaId) {
  await apiDelete(`/owner/listings/${listingId}/photos/${mediaId}`);
  return true;
}

/**
 * Permanently delete an owned listing. Returns true on 204; throws
 * otherwise (incl. 401 login / 403 denied / 404 missing). The destructive
 * nature of the action is confirmed by the caller before this is invoked.
 */
export async function deleteOwnerListing(listingId) {
  await apiDelete(`/owner/listings/${listingId}`);
  return true;
}

/**
 * Explicit listing lifecycle transitions (backend state machine; GETs never
 * verify). Each returns the updated OwnerListingOut. Throws ApiError with
 * `status` (401 login / 403 denied / 404 missing / 422 invalid transition).
 * Same-state repeats are idempotent on the server.
 */
export async function submitListing(listingId) {
  return apiPost(`/owner/listings/${listingId}/submit`);
}

export async function verifyListing(listingId) {
  return apiPost(`/owner/listings/${listingId}/verify`);
}

export async function rejectListing(listingId, reason) {
  const body = reason && String(reason).trim() ? { reason: String(reason).slice(0, 500) } : {};
  return apiPost(`/owner/listings/${listingId}/reject`, body);
}

export async function publishListing(listingId) {
  return apiPost(`/owner/listings/${listingId}/publish`);
}

export async function archiveListing(listingId) {
  return apiPost(`/owner/listings/${listingId}/archive`);
}

export async function updateListingStatus(listingId, { status, closedReason } = {}) {
  const body = { status };
  if (closedReason !== undefined && closedReason !== null && String(closedReason).trim() !== "") {
    body.closed_reason = String(closedReason).slice(0, 500);
  }
  return apiPost(`/owner/listings/${listingId}/status`, body);
}

/**
 * Resolve the persistent listing id for Edit mode from navigation params.
 * Returns a positive integer listing id, or null when the params carry no
 * usable identity (caller must stay in Add mode / refuse to edit).
 * Draft pseudo-ids ("draft-…") and local ids ("own-prop-…") resolve to null.
 */
export function resolveEditingListingId(routeParams) {
  const p = routeParams?.editingProperty;
  const raw = p
    ? (p.listing_id ?? p.listingId ?? p.id)
    : (routeParams?.listingId ?? routeParams?.listing_id);
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Fresh Add entry params shared by every "Add Property" entry point
 * (Dashboard, My Properties header + and EmptyState, PublishSuccess
 * "Add Another", edit-exit clearing). Carries a unique resetForm stamp so
 * the Add screen's reset effect always fires, starts at Step 1, and
 * explicitly nulls any stale editingProperty (React Navigation merges
 * params, so omitting the key would preserve the previous edit).
 */
export function freshAddParams() {
  return { resetForm: Date.now(), initialStep: 1, editingProperty: null };
}

/**
 * Select the leads belonging to one property (P0 honesty rule).
 * Returns only genuinely matching records — possibly an empty array, which
 * callers render as an empty state. Never invents leads: a property with no
 * lead records has no leads. Matching mirrors the previous UI behavior
 * (same property id, or same title case-insensitively).
 */
export function selectPropertyLeads(leads, property) {
  const list = Array.isArray(leads) ? leads : [];
  if (!property) return list;
  return list.filter(
    (l) =>
      l.propertyId === property.id ||
      (l.propertyTitle &&
        property.title &&
        l.propertyTitle.toLowerCase() === property.title.toLowerCase())
  );
}

/**
 * Derive owner activity totals from genuine property records only (P1).
 * Missing counters count as zero; an empty or absent list totals to honest
 * zeros — never fabricated fallback metrics. Non-array input yields zeros.
 */
export function sumOwnerMetrics(properties) {
  const list = Array.isArray(properties) ? properties : [];
  return {
    totalViews: list.reduce((acc, p) => acc + (p.views || 0), 0),
    totalEnquiries: list.reduce((acc, p) => acc + (p.enquiries || 0), 0),
    totalVisits: list.reduce((acc, p) => acc + (p.visits || 0), 0),
  };
}

/**
 * Build the PATCH /owner/listings/{id} body from the same form object used
 * for creation. Reuses buildPayload so every field maps identically, then
 * applies the Edit-only rule: RESALE/BUY listings carry rent_terms: null
 * because the backend explicitly rejects terms on those types (422).
 * Remote (http) photos ride along as the gallery end-state (order = display
 * order, index 0 = cover); local device files are excluded here and
 * uploaded afterwards via uploadListingPhoto.
 */
export function buildUpdatePayload(property) {
  const payload = buildPayload(property);
  if (payload.transaction_type === "RESALE" || payload.transaction_type === "BUY") {
    payload.rent_terms = null;
  }
  return payload;
}

const _EDIT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function _paiseToStr(paise) {
  if (paise === undefined || paise === null) return "";
  const n = Math.round(Number(paise) / 100);
  return Number.isFinite(n) ? String(n) : "";
}

function _isoToFormDate(iso) {
  if (!iso) return "Immediately";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return String(iso);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getUTCDate()} ${_EDIT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function _monthsToLockLabel(months) {
  if (months === undefined || months === null) return "";
  const map = { 6: "6 Months", 12: "1 Year", 24: "2 Years" };
  return map[Number(months)] || String(months);
}

function _monthsToAgreementLabel(months) {
  if (months === undefined || months === null) return "";
  const map = { 11: "11 Months", 12: "1 Year", 24: "2 Years", 36: "3 Years", 60: "5 Years" };
  return map[Number(months)] || String(months);
}

function _countChip(value, plusAt, plusLabel) {
  if (value === undefined || value === null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n >= plusAt) return plusLabel;
  return String(Math.trunc(n));
}

/**
 * Map a backend OwnerListingOut (GET /owner/listings/{id}) onto the
 * OwnerAddPropertyScreen form-state keys. This is the SOLE source for Edit
 * hydration — never the lossy display card. Every key buildPayload reads is
 * restored; approved approximations (documented):
 * - commercial subtype / HOUSE / AGRICULTURAL_LAND collapse to the closest
 *   UI option (the forward mapper is already lossy there);
 * - bedrooms>=5 → "5"/"5+" chips, bathrooms>=4 → "4"/"4+", balconies>=3 →
 *   "3"/"3+" (exact chip cannot be inferred);
 * - available_from null → "Immediately" (step-4 validation requires a value);
 * - duplex null → "No" (create-path parity coerces null to false);
 * - numeric steppers (parking) map null → 0; other absent strings → "".
 * Returns null when detail is missing.
 */
export function toEditForm(detail) {
  if (!detail || typeof detail !== "object") return null;
  const tx = String(detail.transaction_type || "RENT").toUpperCase();
  const lookingTo = tx === "LEASE" ? "Lease" : tx === "RESALE" ? "Resale" : tx === "BUY" ? "New" : "Rent";
  const category = detail.property_type === "COMMERCIAL" ? "Commercial" : "Residential";
  let propertyType = "Apartment";
  if (category === "Commercial") {
    propertyType = "Office";
  } else if (detail.property_type === "VILLA" || detail.property_type === "HOUSE") {
    propertyType = "Independent House / Villa";
  } else if (detail.property_type === "PLOT" || detail.property_type === "AGRICULTURAL_LAND") {
    propertyType = "Plot / Land";
  }
  const bd = detail.bedrooms;
  const bhk = category !== "Residential" || propertyType === "Plot / Land"
    ? "N/A"
    : bd === 1 ? "1 BHK" : bd === 2 ? "2 BHK" : bd === 3 ? "3 BHK"
    : bd === 4 ? "4 BHK" : typeof bd === "number" && bd >= 5 ? "4+ BHK" : "2 BHK";
  const terms = detail.rent_terms || {};
  const furnishingMap = { UNFURNISHED: "Unfurnished", SEMI_FURNISHED: "Semi-Furnished", FURNISHED: "Furnished" };
  const powerMap = { NONE: "None", PARTIAL: "Partial", FULL: "Full" };
  const ownershipMap = {
    FREEHOLD: "Freehold", LEASEHOLD: "Leasehold",
    COOPERATIVE_SOCIETY: "Co-operative Society", POWER_OF_ATTORNEY: "Power of Attorney",
  };
  const availMap = {
    READY_TO_MOVE: "Ready to Move", UNDER_CONSTRUCTION: "Under Construction", NEW_LAUNCH: "New Launch",
  };
  const maintMap = { MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly" };
  const tenantMap = { FAMILY: "Family", BACHELOR: "Bachelor", COMPANY: "Company", ANY: "Any" };
  const photos = Array.isArray(detail.photos) ? detail.photos : [];
  return {
    editingListingId: detail.listing_id,
    lookingTo,
    category,
    propertyType,
    bhk,
    phoneNumber: detail.contact_phone || "",
    email: detail.contact_email || "",
    city: detail.city || "",
    district: detail.district || "",
    locality: detail.locality || "",
    pincode: detail.pincode || "",
    subLocality: detail.sub_locality || "",
    apartmentSociety: detail.society_name || "",
    houseNo: detail.house_no || "",
    landmark: detail.landmark || "",
    bedrooms: detail.bedrooms === undefined || detail.bedrooms === null ? "" : String(detail.bedrooms),
    bathrooms: _countChip(detail.bathrooms, 5, "4+"),
    balconies: _countChip(detail.balconies, 4, "3+"),
    carpetArea: detail.area_value === undefined || detail.area_value === null ? "" : String(detail.area_value),
    builtUpArea: detail.built_up_area === undefined || detail.built_up_area === null ? "" : String(detail.built_up_area),
    superBuiltUpArea: detail.super_built_up_area === undefined || detail.super_built_up_area === null
      ? "" : String(detail.super_built_up_area),
    totalFloors: detail.total_floors === undefined || detail.total_floors === null ? "" : String(detail.total_floors),
    floorOn: detail.floor_on || "",
    duplex: detail.is_duplex ? "Yes" : "No",
    availabilityStatus: availMap[detail.construction_status] || "Ready to Move",
    propertyAge: detail.property_age_band || "",
    monthlyRent: _paiseToStr(detail.price_paise) || "0",
    securityDeposit: _paiseToStr(terms.security_deposit_paise),
    maintenanceCharges: _paiseToStr(terms.maintenance_paise),
    maintenanceFrequency: maintMap[terms.maintenance_period] || "",
    rentNegotiable: terms.is_negotiable ? "Yes" : "No",
    availableFrom: _isoToFormDate(terms.available_from),
    tenantPreference: tenantMap[terms.tenant_preference] || "",
    lockInPeriod: _monthsToLockLabel(terms.lock_in_months),
    preferredAgreementDuration: _monthsToAgreementLabel(terms.agreement_months),
    otherRooms: Array.isArray(detail.other_rooms) ? detail.other_rooms : [],
    furnishing: furnishingMap[detail.furnishing] || "",
    coveredParking: typeof detail.covered_parking === "number" ? detail.covered_parking : 0,
    openParking: typeof detail.open_parking === "number" ? detail.open_parking : 0,
    description: detail.description || "",
    ownership: ownershipMap[detail.ownership_type] || "",
    propertyFeatures: Array.isArray(detail.property_features) ? detail.property_features : [],
    selectedAmenities: Array.isArray(detail.amenities) ? detail.amenities : [],
    openSides: detail.open_sides || "",
    overlooking: detail.overlooking || "",
    powerBackup: powerMap[detail.power_backup] || "",
    propertyFacing: detail.facing || "",
    photosList: photos.map((p, idx) => ({
      id: p && p.id !== undefined && p.id !== null ? `remote-${p.id}` : `remote-idx-${idx}`,
      mediaId: p && p.id !== undefined && p.id !== null ? p.id : null,
      url: p ? p.url : "",
      fileName: null,
      mimeType: null,
      fileSize: null,
      category: (p && p.category) || null,
      isCover: idx === 0,
    })),
  };
}

/**
 * Header (top-left) Back decision table (pure; tested).
 * The header ALWAYS exits the whole form — never steps back.
 * @returns {"confirm"|"exit-properties"|"exit-dashboard"}
 */
export function headerExitAction({ isEditing, dirty }) {
  if (dirty) return "confirm";
  return isEditing ? "exit-properties" : "exit-dashboard";
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
    // UI status buckets mirror the backend state machine: terminal
    // SOLD/RENTED/LEASED read as closed (off-market); only VERIFIED+AVAILABLE
    // is active. PENDING/REJECTED/CLOSED/EXPIRED keep their own buckets.
    status: (() => {
      const l = apiListing.listing_status;
      if (l === "CLOSED" || l === "SOLD" || l === "RENTED" || l === "LEASED") return "closed";
      if (l === "EXPIRED") return "expired";
      if (apiListing.verification_status === "REJECTED") return "rejected";
      return apiListing.verification_status === "VERIFIED" ? "active" : "pending";
    })(),
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
