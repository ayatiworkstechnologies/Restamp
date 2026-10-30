/**
 * Property visit scheduling API (real backend; replaces the local mock store).
 *
 * Backend contract (see backend app/routers/buyer.py, owner.py + services/visits.py):
 * - POST /buyer/visits {property_listing_id, scheduled_at (ISO datetime), note?}
 *   -> 201 VisitOut (REQUESTED/BUYER). Listing must be VERIFIED+AVAILABLE,
 *   scheduled_at must be in the future.
 * - GET /buyer/visits?status?&page?&page_size? -> VisitsResponse (own visits).
 * - GET /buyer/visits/{id} -> VisitOut (own only, else 404).
 * - PATCH /buyer/visits/{id} {scheduled_at?, status?} — buyers confirm/decline
 *   owner-proposed visits, reschedule requested/confirmed times, cancel open
 *   visits. Status is one of CONFIRMED/DECLINED/CANCELLED (buyers can never
 *   COMPLETED; that is owner-only).
 * - POST /owner/visits {property_listing_id, buyer_user_id, scheduled_at, note?}
 *   -> 201 VisitOut (PROPOSED/OWNER). Buyer must hold an enquiry or contact
 *   relationship on the listing.
 * - GET /owner/visits (+filters), GET /owner/visits/{id}, PATCH
 *   /owner/visits/{id} (confirm/decline buyer requests, reschedule, cancel,
 *   complete confirmed visits).
 * All calls require the matching role (401 anonymous / 403 wrong role);
 * invisible listings and foreign visits are 404; invalid moves are 422.
 * Responses carry no phone numbers and no display names.
 */
import { apiGetAuth, apiPatchAuth, apiPost } from "./client.js";
import { withBuyerMode } from "../../features/buyer/api/buyerMode.js";

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Map the ScheduleVisitModal payload ({date: "30 Oct 2026", time: "04:30 PM"})
 * to a backend ISO datetime. Visit times are UTC everywhere: the picked
 * date/time is the user's local wall clock, and it is sent as an explicit
 * UTC instant (toISOString, "...Z"). The backend stores that instant as
 * naive UTC and returns it without a suffix; toUiVisit reads it back as UTC
 * (see parseApiDateTime) and displays it in the user's local time.
 * Throws a readable Error when the date or time cannot be understood —
 * callers surface validation errors instead of POSTing and must never claim
 * the visit was scheduled.
 */
export function toVisitPayload({ date, time, note } = {}) {
  const m = String(date || "").trim().match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (!m) throw new Error("Please choose a valid visit date.");
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (month === undefined) throw new Error("Please choose a valid visit date.");
  const t = String(time || "10:00 am").trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?\s*[Mm]\.?$/);
  if (!t) throw new Error("Please choose a valid visit time (e.g. 04:30 PM).");
  let hour = parseInt(t[1], 10) % 12;
  if (/^[Pp]/.test(t[3])) hour += 12;
  const local = new Date(Number(m[3]), month, Number(m[1]), hour, parseInt(t[2], 10), 0, 0);
  if (Number.isNaN(local.getTime())) throw new Error("Please choose a valid visit date.");
  if (local.getTime() <= Date.now()) throw new Error("Visits must be scheduled in the future.");
  // Explicit UTC instant: the backend validates "in the future" against UTC
  // now, which a zone-less local wall-clock string would skew by the
  // device's UTC offset.
  const body = { scheduled_at: local.toISOString() };
  if (note !== undefined && note !== null && String(note).trim() !== "") {
    body.note = String(note).slice(0, 2000);
  }
  return body;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// "2030-12-30T11:00:00" style values with no zone designator.
const NAIVE_ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

/**
 * Parse a backend datetime into an instant (Date), or null when absent or
 * invalid. The backend stores visit times as naive UTC and returns them
 * without a zone designator, so zone-less ISO values are read as UTC
 * (JavaScript would otherwise treat them as device-local time). Values that
 * already end in "Z" or an explicit offset (+05:30) are parsed unchanged —
 * never shifted twice. No manual offset arithmetic: display code formats
 * the resulting instant in the user's own time zone.
 */
export function parseApiDateTime(value) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  const parsed = new Date(NAIVE_ISO_DATETIME.test(s) ? `${s}Z` : s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Map a backend VisitOut to the shape visit screens render. Server status
 * vocabulary (REQUESTED/PROPOSED/CONFIRMED/DECLINED/CANCELLED/COMPLETED) maps
 * onto the UI buckets upcoming/completed/cancelled: anything awaiting or
 * confirmed is upcoming; DECLINED joins cancelled. No agent names or phones
 * are invented — contact stays behind the authorized reveal endpoint.
 */
export function toUiVisit(row) {
  // UTC instant from the API; date/time below render it in local time.
  const valid = parseApiDateTime(row?.scheduled_at);
  const created = parseApiDateTime(row?.created_at);
  const status = String(row?.status || "").toUpperCase();
  const uiStatus =
    status === "COMPLETED" ? "completed" : status === "CANCELLED" || status === "DECLINED" ? "cancelled" : "upcoming";
  const listing = row?.listing || {};
  return {
    id: row?.id,
    property_listing_id: row?.property_listing_id,
    buyer_user_id: row?.buyer_user_id,
    owner_user_id: row?.owner_user_id,
    serverStatus: status || null,
    initiator: row?.initiator || null,
    status: uiStatus,
    propertyTitle: listing.title || "",
    propertyPrice: listing.price_paise ?? null,
    pricePeriod: listing.price_period || null,
    note: row?.note || "",
    date: valid ? `${pad(valid.getDate())} ${MONTH_NAMES[valid.getMonth()]} ${valid.getFullYear()}` : "",
    time: valid
      ? (() => {
          let h = valid.getHours();
          const suffix = h >= 12 ? "PM" : "AM";
          h = h % 12 === 0 ? 12 : h % 12;
          return `${pad(h)}:${pad(valid.getMinutes())} ${suffix}`;
        })()
      : "",
    // Explicit-UTC ISO strings, so any later `new Date(scheduledAt)` (e.g.
    // a reschedule picker's initial date) gets the right instant.
    scheduledAt: valid ? valid.toISOString() : row?.scheduled_at || null,
    createdAt: created ? created.toISOString() : row?.created_at || null,
  };
}

// --- Buyer ---------------------------------------------------------------
// The buyer endpoints are gated on the account's current role being BUYER
// (backend app/deps.py: require_buyer). `withBuyerMode` puts the server in
// BUYER mode first (server-confirmed POST /users/me/role) so an account that
// is still in OWNER mode is not refused with 403 "BUYER role required".
// The owner endpoints below are untouched: they need the OWNER role.

export async function createBuyerVisit({ listingId, scheduledAtISO, note } = {}) {
  const body = { property_listing_id: listingId, scheduled_at: scheduledAtISO };
  if (note !== undefined && note !== null && String(note).trim() !== "") {
    body.note = String(note).slice(0, 2000);
  }
  return withBuyerMode(() => apiPost("/buyer/visits", body));
}

export async function fetchBuyerVisits({ status, page = 1, pageSize = 20 } = {}) {
  const params = { page, page_size: pageSize };
  if (status) params.status = status;
  return withBuyerMode(() => apiGetAuth("/buyer/visits", params));
}

export async function fetchBuyerVisit(visitId) {
  return withBuyerMode(() => apiGetAuth(`/buyer/visits/${visitId}`));
}

export async function updateBuyerVisit(visitId, { scheduledAtISO, status } = {}) {
  const body = {};
  if (scheduledAtISO) body.scheduled_at = scheduledAtISO;
  if (status) body.status = status;
  return withBuyerMode(() => apiPatchAuth(`/buyer/visits/${visitId}`, body));
}

// --- Owner ---------------------------------------------------------------

export async function proposeOwnerVisit({ listingId, buyerUserId, scheduledAtISO, note } = {}) {
  const body = {
    property_listing_id: listingId,
    buyer_user_id: buyerUserId,
    scheduled_at: scheduledAtISO,
  };
  if (note !== undefined && note !== null && String(note).trim() !== "") {
    body.note = String(note).slice(0, 2000);
  }
  return apiPost("/owner/visits", body);
}

export async function fetchOwnerVisits({ propertyListingId, status, page = 1, pageSize = 20 } = {}) {
  const params = { page, page_size: pageSize };
  if (propertyListingId) params.property_listing_id = propertyListingId;
  if (status) params.status = status;
  return apiGetAuth("/owner/visits", params);
}

export async function fetchOwnerVisit(visitId) {
  return apiGetAuth(`/owner/visits/${visitId}`);
}

export async function updateOwnerVisit(visitId, { scheduledAtISO, status } = {}) {
  const body = {};
  if (scheduledAtISO) body.scheduled_at = scheduledAtISO;
  if (status) body.status = status;
  return apiPatchAuth(`/owner/visits/${visitId}`, body);
}
