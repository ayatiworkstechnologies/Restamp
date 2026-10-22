import { proposeOwnerVisit, toVisitPayload } from "../api/visits";

export function ownerVisitActions(serverStatus) {
  switch (String(serverStatus || "").toUpperCase()) {
    case "REQUESTED":
      return { confirm: true, decline: true, reschedule: false, complete: false, cancel: true };
    case "PROPOSED":
      return { confirm: false, decline: false, reschedule: true, complete: false, cancel: true };
    case "CONFIRMED":
      return { confirm: false, decline: false, reschedule: true, complete: true, cancel: true };
    default:
      return { confirm: false, decline: false, reschedule: false, complete: false, cancel: false };
  }
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
  if (error?.status === 422) {
    return {
      title: `Couldn't ${action} visit`,
      message: "This visit may have changed. Refresh and try again.",
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
