/**
 * Search result card: price-per-area, area, feature chips, rating, bed/bath
 * counts and construction status — from real listing data only. Every value
 * is null (and hidden by the card) when the backend sent no valid value.
 *
 * - Feature chips come only from an explicit `amenities` array on the
 *   listing. The buyer search card (GET /buyer/listings ListingCard) has no
 *   amenities/features field today, so search cards show no chips; nothing
 *   is inferred from the property type (no "CMDA Approved", "Clear Title",
 *   "Gated Society", ...).
 * - Price per sq ft is shown only for a sale listing (BUY / RESALE) with a
 *   positive price and a positive area measured in sq ft. Otherwise it is
 *   null and the card omits it: no assumed area, no hard-coded rate, and no
 *   "per sq ft" figure computed from a monthly rent.
 * - The area uses the backend's own value and unit; null when absent.
 */

const SALE_TYPES = new Set(["BUY", "RESALE"]);
const UNIT_LABELS = { SQFT: "sq ft", SQYD: "sq yd", SQM: "sq m", ACRE: "acres", ACRES: "acres", CENT: "cents", CENTS: "cents", GROUND: "grounds", GROUNDS: "grounds" };

function areaNumber(sqft) {
  if (sqft == null || sqft === "") return null;
  const n = Number(String(sqft).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function unitKey(unit) {
  return String(unit || "").replace(/[\s._-]/g, "").toUpperCase();
}

export function searchCardSpecs(property) {
  const p = property || {};
  const area = areaNumber(p.sqft);
  const unit = unitKey(p.areaUnit);
  const isSqft = unit === "SQFT" || unit === "SQUAREFEET" || unit === "SQUAREFOOT";

  const price = Number(p.rawPrice);
  const perSqft =
    SALE_TYPES.has(String(p.transactionType || "").toUpperCase()) && area && isSqft && Number.isFinite(price) && price > 0
      ? `₹${Math.round(price / area).toLocaleString("en-IN")}/sqft`
      : null;

  // Area as the card's bold value + unit label; null when the backend sent
  // none. An unrecognised or missing unit is labelled neutrally ("area").
  const areaValue = area ? area.toLocaleString("en-IN") : null;
  const areaUnitLabel = area ? (isSqft ? "sq ft" : UNIT_LABELS[unit] || "area") : null;

  const tags = Array.isArray(p.amenities)
    ? p.amenities.filter((a) => typeof a === "string" && a.trim()).map((a) => a.trim())
    : [];

  return { perSqft, areaValue, areaUnitLabel, tags };
}

/**
 * Rating to display, or null. The backend has no rating today (the mapper
 * sends undefined), so cards normally show none; nothing is substituted.
 * Only a finite number in 0 < r <= 5 counts as a real rating.
 */
export function displayRating(rating) {
  if (rating === null || rating === undefined || rating === "" || typeof rating === "boolean") return null;
  const r = Number(rating);
  if (!Number.isFinite(r) || r <= 0 || r > 5) return null;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Bed/bath count to display, or null. Only a whole number from 1 to 99 (the
 * backend's own bedrooms/bathrooms range) is shown; a missing, zero, negative,
 * fractional or non-numeric value is hidden, never replaced by a default.
 */
export function displayCount(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

/** The construction-status labels the mapper produces from backend values. */
export const CONSTRUCTION_STATUS_LABELS = ["Ready to move", "Under Construction", "New Launch"];

/**
 * The listing's construction status label, or null when the backend sent none
 * (or an unknown value). Never inferred from a badge or defaulted.
 */
export function validConstructionStatus(status) {
  if (typeof status !== "string") return null;
  const s = status.trim().toLowerCase();
  return CONSTRUCTION_STATUS_LABELS.find((label) => label.toLowerCase() === s) || null;
}

/**
 * Client-side status filter. "All Status" matches everything; any specific
 * status matches only listings whose real status equals it, so a listing with
 * no status never matches "Ready to move" (or any other status).
 */
export function matchesStatusFilter(status, selected) {
  if (!selected || selected === "All Status") return true;
  const real = validConstructionStatus(status);
  return real !== null && real.toLowerCase() === String(selected).trim().toLowerCase();
}
