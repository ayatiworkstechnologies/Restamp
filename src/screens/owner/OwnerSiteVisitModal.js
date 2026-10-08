import React from "react";
import ScheduleVisitModal from "../../components/ScheduleVisitModal";

export default function OwnerSiteVisitModal({
  visible,
  lead,
  onClose,
  onVisitScheduled,
}) {
  if (!lead) return null;

  return (
    <ScheduleVisitModal
      visible={visible}
      onClose={onClose}
      lead={lead}
      property={{
        title: lead.propertyTitle || "Property Site Visit",
        location: lead.preferredLocality || lead.locality || "Prime Location",
      }}
      title="Schedule Visit"
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
