/**
 * Buyer/agent -> listing owner contact helpers (pure: no React Native
 * imports, tested by scripts/owner-contact.test.mjs).
 *
 * - The owner's number comes only from the authorized contact reveal
 *   (POST /buyer/listings/{id}/contact). Call Now, WhatsApp and the card
 *   Call button all build their URLs from that same number, normalised to
 *   E.164 by the shared rule in owner/utils/leadContact.js.
 * - The owner's name is the server's public-safe owner_name (never a phone
 *   number), from the reveal or the listing detail. "Property Owner" is
 *   shown only when no real name is known.
 * - visitErrorCopy turns a failed visit request into its real reason; only
 *   a genuine network failure is described as a connection problem.
 */
import { normalizeBuyerPhone } from "../../owner/utils/leadContact.js";

export const OWNER_NAME_FALLBACK = "Property Owner";

/** tel: URL for the owner's revealed number, or null when it isn't usable. */
export function ownerDialUrl(raw) {
  const phone = normalizeBuyerPhone(raw);
  return phone ? `tel:${phone}` : null;
}

/** WhatsApp click-to-chat URL (international digits, no "+"), or null. */
export function ownerWhatsAppUrl(raw, text) {
  const phone = normalizeBuyerPhone(raw);
  if (!phone) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone.slice(1)}${query}`;
}

/**
 * The real owner name for a listing: the reveal's owner_name, then the
 * listing detail's ownerName, else null (the caller shows the fallback).
 * Only names that belong to THIS listing are used: `revealed` must be the
 * reveal result for the same listing.
 */
export function ownerNameFor(property, revealed) {
  const pick = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  return pick(revealed && revealed.ownerName) || pick(property && property.ownerName) || null;
}

const OWN_LISTING = /own listing/i;
const ALREADY_ACTIVE = /already active/i;

/**
 * {title, message, kind} for a failed site-visit request. kind:
 * "own" (the caller's own listing), "duplicate" (a visit is already open),
 * "invalid" (other server validation, its own reason shown), "server",
 * "offline" (no response / timeout), or "unknown".
 */
export function visitErrorCopy(error) {
  const status = error && error.status;
  const detail = error && typeof error.detail === "string" ? error.detail : "";
  if (status === 422 && OWN_LISTING.test(detail)) {
    return {
      kind: "own",
      title: "This Is Your Listing",
      message: "You can't request a site visit on a property you listed.",
    };
  }
  if (status === 422 && ALREADY_ACTIVE.test(detail)) {
    return {
      kind: "duplicate",
      title: "Visit Already Requested",
      message: "You already have an open visit for this property. Manage it under Activity > Visits.",
    };
  }
  if (status === 422 && detail && detail !== "Invalid request") {
    return { kind: "invalid", title: "Visit Not Scheduled", message: detail };
  }
  if (status === 422) {
    return {
      kind: "invalid",
      title: "Visit Not Scheduled",
      message: "Please choose a valid future date and time and try again.",
    };
  }
  if (error && (error.kind === "offline" || error.kind === "timeout" || status === 0)) {
    return {
      kind: "offline",
      title: "Couldn't schedule visit",
      message: "Please check your connection and try again.",
    };
  }
  if (typeof status === "number" && status >= 500) {
    return {
      kind: "server",
      title: "Couldn't schedule visit",
      message: "Something went wrong on our side. Please try again in a moment.",
    };
  }
  return {
    kind: "unknown",
    title: "Couldn't schedule visit",
    message: "The visit was not scheduled. Please try again.",
  };
}
