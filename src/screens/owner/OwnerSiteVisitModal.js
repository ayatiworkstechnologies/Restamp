import React from "react";
import { toScheduleModalInitial } from "../../api/visits";
import ScheduleVisitModal from "../../components/ScheduleVisitModal";

/**
 * ScheduleVisitModal bound to one owner lead.
 *
 * Without a `visit` it is a fresh proposal (default date/time, empty note).
 * With a `visit` (a toUiVisit row) it becomes a reschedule that starts from
 * the visit's own date, time, and note (contract §E: toScheduleModalInitial),
 * so the owner edits what was already agreed instead of guessing. The note is
 * "Notes for Visit" — visible to both the buyer and the owner.
 */
export default function OwnerSiteVisitModal({
  visible,
  lead,
  visit = null,
  onClose,
  onVisitScheduled,
}) {
  if (!lead) return null;

  // Only genuine lead/visit fields feed the modal; a missing locality is
  // left empty rather than replaced with a sample.
  const initial = visit ? toScheduleModalInitial(visit) : {};

  return (
    <ScheduleVisitModal
      visible={visible}
      onClose={onClose}
      lead={lead}
      property={{
        title: lead.propertyTitle || "Property Site Visit",
        location: lead.propertyLocality || "",
      }}
      title="Schedule Visit"
      initialDate={initial.initialDate}
      initialTime={initial.initialTime}
      initialNote={initial.initialNote}
      onConfirm={({ date, fullDate, time, notes }) => {
        if (onVisitScheduled) {
          onVisitScheduled(lead.id, {
            date,
            fullDate,
            time,
            note: notes,
          });
        }
      }}
    />
  );
}
