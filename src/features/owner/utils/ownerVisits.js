import { proposeOwnerVisit, toVisitPayload } from "../../../shared/api/visits.js";

// Server details for writes on a closed lead (backend enquiries.py /
// visits.py): the lead itself, and any visit that belongs to it.
export const LEAD_CLOSED_DETAIL = "Lead is closed";
export const LEAD_ALREADY_CLOSED_DETAIL = "Lead is already closed";

/**
 * A closed lead (any outcome: Rented, Sold, Leased, Not Converted) is
 * read-only: no close, no visit proposal, no visit change. The backend
 * enforces this; screens use it to hide the controls.
 */
export function isLeadClosed(lead) {
  return String((lead && lead.status) || "").toLowerCase() === "closed";
}

/** True for the server's refusal of a write on a closed lead or its visit. */
export function isClosedLeadError(error) {
  const detail = error && typeof error.detail === "string" ? error.detail : "";
  return error?.status === 422 && (detail === LEAD_CLOSED_DETAIL || detail === LEAD_ALREADY_CLOSED_DETAIL);
}

const NO_VISIT_ACTIONS = { confirm: false, decline: false, reschedule: false, complete: false, cancel: false };

// Owner moves per server status (backend services/visits.py). On a buyer
// REQUESTED visit, "reschedule" is the owner's counter-proposal: the server
// moves it to PROPOSED at the new time, awaiting the buyer's reply. A visit
// on a closed lead has no moves at all ({ leadClosed: true }).
export function ownerVisitActions(serverStatus, { leadClosed = false } = {}) {
  if (leadClosed) return { ...NO_VISIT_ACTIONS };
  switch (String(serverStatus || "").toUpperCase()) {
    case "REQUESTED":
      return { confirm: true, decline: true, reschedule: true, complete: false, cancel: true };
    case "PROPOSED":
      return { confirm: false, decline: false, reschedule: true, complete: false, cancel: true };
    case "CONFIRMED":
      return { confirm: false, decline: false, reschedule: true, complete: true, cancel: true };
    default:
      return { ...NO_VISIT_ACTIONS };
  }
}

/** Button label for the owner's time change, by the visit's server status. */
export function ownerRescheduleLabel(serverStatus) {
  return String(serverStatus || "").toUpperCase() === "REQUESTED" ? "Propose New Time" : "Reschedule";
}

/**
 * Success copy after a time change was accepted, by the status the visit
 * had BEFORE the change (a counter-proposal on a buyer request now awaits
 * the buyer; it is never described as booked).
 */
export function ownerRescheduleSuccess(previousServerStatus) {
  switch (String(previousServerStatus || "").toUpperCase()) {
    case "REQUESTED":
      return { title: "New Time Proposed", message: "The buyer can confirm or decline the new time." };
    case "CONFIRMED":
      return { title: "Visit Rescheduled", message: "The confirmed visit was moved to the new time." };
    default:
      return { title: "Visit Rescheduled", message: "The proposed time was updated." };
  }
}

/**
 * Why a NEW visit cannot be proposed on this lead's listing, or null when
 * it can. Visits need a live listing (backend: VERIFIED + AVAILABLE, not
 * removed); leads outlive their listing, so the owner's Buyer Leads can show
 * leads on closed, removed or under-review listings. `property` is the
 * owner's own listing row (toOwnerProperty) or the "no longer available"
 * group entry; when it is unknown (not loaded yet) nothing is blocked and
 * the server stays the authority.
 */
export function leadVisitBlockedReason(property, lead) {
  if (isLeadClosed(lead)) {
    return "This lead is closed, so visits can't be scheduled on it.";
  }
  if ((property && property.unavailable) || (lead && lead.propertyUnavailable)) {
    return "This listing was removed, so visits can't be scheduled on it.";
  }
  if (!property) return null;
  const verification = String(property.verification_status || "").toUpperCase();
  const listingStatus = String(property.listing_status || "").toUpperCase();
  if (!verification && !listingStatus) return null;
  if (verification === "VERIFIED" && listingStatus === "AVAILABLE") return null;
  if (verification === "REJECTED") {
    return "This listing wasn't approved, so visits can't be scheduled on it.";
  }
  if (verification && verification !== "VERIFIED") {
    return "This listing isn't live yet (under review), so visits can't be scheduled on it.";
  }
  return "This listing isn't live (closed or completed), so visits can't be scheduled on it.";
}

export function ownerVisitErrorMessage(error, action = "update") {
  if (error?.status === 404) {
    return {
      title: `Couldn't ${action} visit`,
      message: "The visit or listing could not be found.",
    };
  }
  if (error?.status === 403 || error?.kind === "denied") {
    return {
      title: "Owner Mode Required",
      message: "Switch back to Owner mode and try again.",
    };
  }
  if (error?.status === 401 || error?.kind === "login") {
    return {
      title: "Session Expired",
      message: "Please log in again to manage visits.",
    };
  }
  if (isClosedLeadError(error)) {
    return {
      title: `Couldn't ${action} visit`,
      message: "This lead has been closed, so its site visit can no longer be changed.",
    };
  }
  if (error?.status === 422) {
    // Contract §E: business-rule 422s carry short static text (e.g. "Only
    // buyer may reschedule a REQUESTED visit") and the UI shows it. The
    // wording stays the server's — it is never paraphrased into a guess.
    return {
      title: `Couldn't ${action} visit`,
      message: error?.detail || "This visit may have changed. Refresh and try again.",
    };
  }
  return {
    title: `Couldn't ${action} visit`,
    message: "Please check your connection and try again.",
  };
}

export function buildOwnerVisitPayload(lead, visitData) {
  const listingId = Number(lead?.property_listing_id);
  const buyerUserId = Number(lead?.buyer_user_id);
  if (!Number.isFinite(listingId) || listingId <= 0 || !Number.isFinite(buyerUserId) || buyerUserId <= 0) {
    const error = new Error("This lead is missing the buyer or property reference.");
    error.kind = "invalid_lead";
    throw error;
  }
  let scheduledAtISO;
  try {
    scheduledAtISO = toVisitPayload({
      date: visitData?.date || visitData?.fullDate,
      time: visitData?.time,
      note: visitData?.note,
    }).scheduled_at;
  } catch (error) {
    error.kind = "invalid_time";
    throw error;
  }
  return {
    listingId,
    buyerUserId,
    scheduledAtISO,
    note: visitData?.note,
  };
}

export async function proposeVisitForLead(lead, visitData) {
  return proposeOwnerVisit(buildOwnerVisitPayload(lead, visitData));
}
