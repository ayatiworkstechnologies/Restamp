/**
 * Visit status presentation — the single source of labels and colors for
 * site visits, shared by buyer and owner screens (CONTRACT.md §C).
 *
 * Pure module (no React / react-native imports) so it is unit-tested from
 * scripts/visit-status.test.mjs and reused by StatusBadge.
 *
 * Server statuses (app/services/visits.py) are unchanged:
 * REQUESTED, PROPOSED, CONFIRMED, DECLINED, CANCELLED, COMPLETED.
 * "Rescheduled" is a DISPLAY state only: the visit is open (REQUESTED /
 * PROPOSED / CONFIRMED) and the server reports `rescheduled_at` (set when the
 * time changes, cleared when the status changes). Action buttons must keep
 * following the server status, never the display label.
 */
import COLORS from "../constants/colors";

export const VISIT_STATUSES = ["REQUESTED", "PROPOSED", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"];
export const OPEN_VISIT_STATUSES = ["REQUESTED", "PROPOSED", "CONFIRMED"];

// Color roles from the contract. COLORS has no purple token; the purple pair
// is the one StatusBadge already used for visit accents.
export const VISIT_TONES = {
  orange: { color: COLORS.warning, background: COLORS.warningBg },
  green: { color: COLORS.success, background: COLORS.successBg },
  red: { color: COLORS.danger, background: COLORS.errorBg },
  grey: { color: COLORS.muted, background: COLORS.pillGray },
  blue: { color: COLORS.info, background: COLORS.primaryLight },
  purple: { color: "#9333EA", background: "#FAF5FF" },
};

// Display key -> tone. Lower-case keys are what StatusBadge receives.
export const VISIT_TONE_BY_KEY = {
  rescheduled: "purple",
  requested: "orange",
  proposed: "orange",
  confirmed: "green",
  declined: "red",
  cancelled: "grey",
  completed: "blue",
};

function normalizeStatus(visit) {
  const raw = visit ? visit.serverStatus ?? visit.status : null;
  const status = String(raw || "").toUpperCase();
  return VISIT_STATUSES.includes(status) ? status : null;
}

function rescheduledAtOf(visit) {
  if (!visit) return null;
  const value = visit.rescheduledAt ?? visit.rescheduled_at ?? null;
  return value ? value : null;
}

/** True when the visit is open and the server says its time was rescheduled. */
export function isVisitRescheduled(visit) {
  const status = normalizeStatus(visit);
  return Boolean(status && OPEN_VISIT_STATUSES.includes(status) && rescheduledAtOf(visit));
}

/**
 * Presentation for one visit, from the viewer's side.
 * @param {object} visit - a toUiVisit() row ({serverStatus, rescheduledAt}) or a raw VisitOut ({status, rescheduled_at})
 * @param {"buyer"|"owner"} viewer
 * @returns {{key: string, label: string, tone: string, color: string, background: string, serverStatus: string|null, isRescheduled: boolean}}
 */
export function getVisitDisplay(visit, viewer = "owner") {
  const serverStatus = normalizeStatus(visit);
  if (!serverStatus) {
    const tone = VISIT_TONES.grey;
    return { key: "unknown", label: "Status unavailable", tone: "grey", ...tone, serverStatus: null, isRescheduled: false };
  }
  const isRescheduled = isVisitRescheduled(visit);
  const key = isRescheduled ? "rescheduled" : serverStatus.toLowerCase();
  const labels = {
    rescheduled: "Rescheduled",
    requested: viewer === "buyer" ? "Requested" : "Requested by buyer",
    proposed: viewer === "buyer" ? "Awaiting your reply" : "Proposed",
    confirmed: "Confirmed",
    declined: "Declined",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  const tone = VISIT_TONE_BY_KEY[key];
  return { key, label: labels[key], tone, ...VISIT_TONES[tone], serverStatus, isRescheduled };
}
