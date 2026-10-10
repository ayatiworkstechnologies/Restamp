import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
} from "lucide-react-native";
import COLORS from "../constants/colors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const TIME_SECTIONS = [
  {
    title: "Morning",
    slots: ["08:00 am", "09:00 am", "10:00 am", "11:00 am", "12:00 pm"],
  },
  {
    title: "Afternoon",
    slots: ["02:00 pm", "03:00 pm", "04:00 pm", "05:00 pm"],
  },
  {
    title: "Evening",
    slots: ["06:00 pm", "07:00 pm", "08:00 pm"],
  },
];

// Default disabled slot to match reference design (e.g. "11:00 am" booked)
const DEFAULT_DISABLED_SLOTS = ["11:00 am"];

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isBeforeToday(date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return check < startOfToday;
}

function ScheduleVisitModal({
  visible,
  onClose,
  onConfirm,
  lead,
  property,
  matchingProperties = [],
  title = "Schedule Visit",
  subtitle,
  initialDate,
  initialTime = "10:00 am",
}) {
  const today = useMemo(() => new Date(), []);

  // Selected date & month navigation
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate instanceof Date) return initialDate;
    const defaultDate = new Date();
    // Default to tomorrow or today
    return defaultDate;
  });

  const [viewMonthDate, setViewMonthDate] = useState(() => {
    const d = initialDate instanceof Date ? initialDate : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [visitNotes, setVisitNotes] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(
    property || matchingProperties[0] || null
  );

  const dateScrollRef = useRef(null);

  // Sync selected property if props update
  useEffect(() => {
    if (property) {
      setSelectedProperty(property);
    } else if (matchingProperties.length > 0 && !selectedProperty) {
      setSelectedProperty(matchingProperties[0]);
    }
  }, [property, matchingProperties]);

  // Generate days in the currently viewed month
  const daysInViewMonth = useMemo(() => {
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const list = [];
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const d = new Date(year, month, dayNum);
      list.push({
        dayNumber: dayNum,
        dayName: WEEKDAYS[d.getDay()],
        date: d,
        isPast: isBeforeToday(d),
      });
    }
    return list;
  }, [viewMonthDate]);

  // Navigate months
  const isPrevMonthDisabled = useMemo(() => {
    return (
      viewMonthDate.getFullYear() < today.getFullYear() ||
      (viewMonthDate.getFullYear() === today.getFullYear() &&
        viewMonthDate.getMonth() <= today.getMonth())
    );
  }, [viewMonthDate, today]);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    setViewMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (dayObj) => {
    if (dayObj.isPast) return;
    setSelectedDate(dayObj.date);
  };

  // Auto scroll to selected day in the horizontal strip
  useEffect(() => {
    if (visible && dateScrollRef.current && daysInViewMonth.length > 0) {
      const idx = daysInViewMonth.findIndex((d) => isSameDay(d.date, selectedDate));
      if (idx >= 0) {
        setTimeout(() => {
          dateScrollRef.current?.scrollTo({
            x: Math.max(0, idx * 72 - 80),
            animated: true,
          });
        }, 150);
      }
    }
  }, [visible, viewMonthDate, selectedDate, daysInViewMonth]);

  const handleConfirm = () => {
    const day = selectedDate.getDate();
    const month = MONTHS_SHORT[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    const weekday = WEEKDAYS[selectedDate.getDay()];

    const dateStr = `${day} ${month} ${year}`;
    const fullDateStr = `${weekday}, ${day} ${month} ${year}`;

    onConfirm({
      date: dateStr,
      fullDate: fullDateStr,
      time: selectedTime,
      notes: visitNotes.trim(),
      property: selectedProperty,
      lead,
    });
    onClose();
  };

  if (!visible) return null;

  const currentMonthName = MONTHS_FULL[viewMonthDate.getMonth()];
  const currentYear = viewMonthDate.getFullYear();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdropPressable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          {/* TOP DRAG & MODAL HEADER (Clean separation, no overlap with month row) */}
          <View style={styles.modalHeaderTop}>
            <View style={styles.dragPill} />
            <View style={styles.headerTitleRow}>
              <Text style={styles.modalHeaderTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* MONTH NAVIGATION HEADER (Matches Reference Image) */}
          <View style={styles.monthHeaderRow}>
            <TouchableOpacity
              style={[
                styles.navCircleBtn,
                isPrevMonthDisabled && styles.navCircleBtnDisabled,
              ]}
              onPress={handlePrevMonth}
              disabled={isPrevMonthDisabled}
              activeOpacity={0.7}
            >
              <ChevronLeft
                size={20}
                color={isPrevMonthDisabled ? "#CBD5E1" : "#0F172A"}
              />
            </TouchableOpacity>

            <Text style={styles.monthTitleText}>
              {currentMonthName} {currentYear}
            </Text>

            <TouchableOpacity
              style={styles.navCircleBtn}
              onPress={handleNextMonth}
              activeOpacity={0.7}
            >
              <ChevronRight size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* HORIZONTAL DATE SELECTOR STRIP (Matches Reference Image) */}
          <View style={styles.dateStripWrapper}>
            <ScrollView
              ref={dateScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStripContent}
            >
              {daysInViewMonth.map((item) => {
                const isSelected = isSameDay(item.date, selectedDate);
                const isDisabled = item.isPast;

                return (
                  <TouchableOpacity
                    key={item.dayNumber}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                      isDisabled && styles.dateCardDisabled,
                    ]}
                    onPress={() => handleSelectDay(item)}
                    disabled={isDisabled}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dateCardDay,
                        isSelected && styles.dateCardDaySelected,
                        isDisabled && styles.dateCardTextDisabled,
                      ]}
                    >
                      {item.dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dateCardNumber,
                        isSelected && styles.dateCardNumberSelected,
                        isDisabled && styles.dateCardTextDisabled,
                      ]}
                    >
                      {item.dayNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* DIVIDER */}
          <View style={styles.sectionDivider} />

          {/* SCROLLABLE TIME SLOTS & DETAILS */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TIME SLOTS SECTIONS (Morning, Afternoon, Evening) */}
            {TIME_SECTIONS.map((section) => (
              <View key={section.title} style={styles.timeSection}>
                <Text style={styles.timeSectionTitle}>{section.title}</Text>
                <View style={styles.slotsGrid}>
                  {section.slots.map((slot) => {
                    const isSelected = selectedTime === slot;
                    const isDisabled = DEFAULT_DISABLED_SLOTS.includes(slot);

                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotBtn,
                          isSelected && styles.slotBtnSelected,
                          isDisabled && styles.slotBtnDisabled,
                        ]}
                        onPress={() => !isDisabled && setSelectedTime(slot)}
                        disabled={isDisabled}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            isSelected && styles.slotTextSelected,
                            isDisabled && styles.slotTextDisabled,
                          ]}
                        >
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* ASSIGNED PROPERTY (if available) */}
            {selectedProperty && (
              <View style={styles.propertySection}>
                <Text style={styles.fieldSectionTitle}>Assigned Property</Text>
                <View style={styles.propertyCard}>
                  <Building2 size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.propertyTitleText} numberOfLines={1}>
                      {selectedProperty.title}
                    </Text>
                    <Text style={styles.propertySubText} numberOfLines={1}>
                      {selectedProperty.location || lead?.preferredLocality || "Prime Location"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* VISIT NOTES INPUT */}
            <View style={styles.notesSection}>
              <Text style={styles.fieldSectionTitle}>Notes for Visit (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={visitNotes}
                onChangeText={setVisitNotes}
                placeholder="Entry gate instructions, customer preferences..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* BOTTOM CONFIRM ACTION */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Calendar size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.confirmBtnText}>Confirm Visit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeaderTop: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 8,
  },
  headerTitleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Month Navigation Header
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  navCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navCircleBtnDisabled: {
    borderColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  monthTitleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },

  // Horizontal Date Strip (Matches Reference Image)
  dateStripWrapper: {
    paddingVertical: 6,
  },
  dateStripContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  dateCard: {
    width: 62,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  dateCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
    borderWidth: 1.6,
  },
  dateCardDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#F1F5F9",
    opacity: 0.45,
  },
  dateCardDay: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
  },
  dateCardDaySelected: {
    color: "#2563EB",
    fontWeight: "600",
  },
  dateCardNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateCardNumberSelected: {
    color: "#1E293B",
    fontWeight: "800",
  },
  dateCardTextDisabled: {
    color: "#94A3B8",
  },

  sectionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },

  modalScroll: {
    maxHeight: 360,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  // Time Slots Section (Matches Reference Image)
  timeSection: {
    marginBottom: 16,
  },
  timeSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 10,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  slotBtnSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    borderWidth: 1.5,
  },
  slotBtnDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  slotText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  slotTextSelected: {
    color: "#2563EB",
    fontWeight: "700",
  },
  slotTextDisabled: {
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Property & Notes
  propertySection: {
    marginBottom: 14,
  },
  fieldSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  propertyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  propertyTitleText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  propertySubText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },

  notesSection: {
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0F172A",
    minHeight: 56,
    textAlignVertical: "top",
  },

  // Footer Button
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  confirmBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default memo(ScheduleVisitModal);
