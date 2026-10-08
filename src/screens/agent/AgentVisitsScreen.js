import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Phone,
  CheckCircle2,
  XCircle,
  X,
  User,
  Eye,
  RotateCcw,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useAgent } from "../../context/AgentContext";
import AppBrandHeader from "../../components/AppBrandHeader";
import EmptyState from "../../components/owner/EmptyState";
import StatusBadge from "../../components/owner/StatusBadge";
import ScheduleVisitModal from "../../components/ScheduleVisitModal";

const VISIT_TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function AgentVisitsScreen({ navigation }) {
  const { visits, updateVisitStatus, updateLeadStatus } = useAgent();
  const [activeTab, setActiveTab] = useState("upcoming");

  // Selected visit for "View Details" modal
  const [selectedVisitForDetails, setSelectedVisitForDetails] = useState(null);

  // Reschedule state inside modal
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => v.status === activeTab);
  }, [visits, activeTab]);

  const handleCallCustomer = (phone, name) => {
    const raw = phone || "+919876543210";
    Linking.openURL(`tel:${raw.replace(/[^0-9+]/g, "")}`).catch(() => {
      Alert.alert("Call Customer", `Call ${name} at ${raw}`);
    });
  };

  const handleOpenDetails = (visit) => {
    setSelectedVisitForDetails(visit);
    setIsRescheduling(false);
    setNewDate(visit.fullDate || visit.date || "12 Oct 2026");
    setNewTime(visit.time || "11:30 AM");
  };

  const handleMarkCompleted = (visit) => {
    updateVisitStatus(visit.id, "completed");
    if (visit.leadId) {
      updateLeadStatus(visit.leadId, "visited");
    }
    setSelectedVisitForDetails(null);
    Alert.alert(
      "Visit Completed! ✅",
      `Site visit with ${visit.customerName} has been marked as Completed. Lead status updated to 'Visited'.`
    );
  };

  const handleCancelVisit = (visit) => {
    updateVisitStatus(visit.id, "cancelled");
    setSelectedVisitForDetails(null);
    Alert.alert("Visit Cancelled", "The site visit has been marked as cancelled.");
  };

  const handleConfirmReschedule = (visit, reschedData) => {
    updateVisitStatus(visit.id, "upcoming");
    const d = reschedData?.date || newDate || "15 Oct 2026";
    const t = reschedData?.time || newTime || "04:30 PM";
    visit.fullDate = reschedData?.fullDate || d;
    visit.date = d;
    visit.time = t;
    if (reschedData?.notes) {
      visit.notes = reschedData.notes;
    }
    setIsRescheduling(false);
    setSelectedVisitForDetails(null);
    Alert.alert(
      "Visit Rescheduled! 📅",
      `Site visit rescheduled to ${d} at ${t}. Notification sent to ${visit.customerName}.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER */}
      <AppBrandHeader currentRole="agent" />

      {/* SCREEN TITLE */}
      <View style={styles.screenHeader}>
        <Text style={styles.headerTitle}>Site Visits</Text>
        <Text style={styles.headerSubtitle}>
          Coordinate customer inspections and property walkthroughs
        </Text>
      </View>

      {/* TABS: Upcoming, Completed, Cancelled */}
      <View style={styles.tabsRow}>
        {VISIT_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = visits.filter((v) => v.status === tab.id).length;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* VISITS LIST */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredVisits.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No site visits scheduled."
            description={
              activeTab === "upcoming"
                ? "Schedule visits directly from any customer lead page."
                : `No visits marked as ${activeTab}.`
            }
          />
        ) : (
          <View style={styles.visitsList}>
            {filteredVisits.map((item) => {
              const visitDate = item.fullDate || item.date || "12 Oct 2026";
              const visitTime = item.time || "11:30 AM";

              return (
                <View key={item.id} style={styles.visitCard}>
                  {/* Card Header: Customer Name & Status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.customerNameRow}>
                      <User size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.customerName}>{item.customerName}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        item.status === "completed" && styles.statusPillCompleted,
                        item.status === "cancelled" && styles.statusPillCancelled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          item.status === "completed" && styles.statusPillTextCompleted,
                          item.status === "cancelled" && styles.statusPillTextCancelled,
                        ]}
                      >
                        {item.status === "upcoming"
                          ? "Upcoming"
                          : item.status === "completed"
                          ? "Completed"
                          : "Cancelled"}
                      </Text>
                    </View>
                  </View>

                  {/* Visit Body: Property & Location */}
                  <View style={styles.visitBody}>
                    <View style={styles.bodyField}>
                      <Text style={styles.fieldLabel}>Property:</Text>
                      <Text style={styles.fieldValueBold}>
                        {item.propertyTitle || "2 BHK Apartment"}
                      </Text>
                    </View>

                    <View style={styles.bodyField}>
                      <Text style={styles.fieldLabel}>Location:</Text>
                      <Text style={styles.fieldValue}>
                        {item.propertyLocation || "Anna Nagar, Chennai"}
                      </Text>
                    </View>

                    <View style={styles.dateTimeRow}>
                      <View style={styles.dateTimeBadge}>
                        <Calendar size={13} color="#2563EB" style={{ marginRight: 5 }} />
                        <Text style={styles.dateTimeText}>Visit Date: {visitDate}</Text>
                      </View>

                      <View style={styles.dateTimeBadge}>
                        <Clock size={13} color="#2563EB" style={{ marginRight: 5 }} />
                        <Text style={styles.dateTimeText}>Time: {visitTime}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.cardDivider} />

                  {/* Actions: View Details, Call Customer */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.callCustomerBtn}
                      onPress={() =>
                        handleCallCustomer(item.customerPhone, item.customerName)
                      }
                      activeOpacity={0.8}
                    >
                      <Phone size={14} color="#0F172A" style={{ marginRight: 5 }} />
                      <Text style={styles.callCustomerBtnText}>Call Customer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.viewDetailsBtn}
                      onPress={() => handleOpenDetails(item)}
                      activeOpacity={0.8}
                    >
                      <Eye size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.viewDetailsBtnText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* VISIT DETAILS MODAL */}
      <Modal
        visible={!!selectedVisitForDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVisitForDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Site Visit Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedVisitForDetails(null)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {selectedVisitForDetails && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Details list: Customer, Property, Owner, Location, Date, Time, Notes */}
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer</Text>
                    <Text style={styles.detailValueBold}>
                      {selectedVisitForDetails.customerName} ({selectedVisitForDetails.customerPhone || "+91 98840 55667"})
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Property</Text>
                    <Text style={styles.detailValueBold}>
                      {selectedVisitForDetails.propertyTitle || "2 BHK Apartment"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Owner</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.ownerName || "Sundar Raman"} ({selectedVisitForDetails.ownerPhone || "+91 98400 12345"})
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.propertyLocation || "Anna Nagar, Chennai"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.fullDate || selectedVisitForDetails.date || "12 Oct 2026"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.time || "11:30 AM"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.notes || "Inspection of keys and apartment interior."}
                    </Text>
                  </View>
                </View>

                {/* Actions: Reschedule, Mark Completed, Cancel Visit */}
                <View style={styles.detailsModalActions}>
                  <TouchableOpacity
                    style={styles.btnReschedule}
                    onPress={() => setIsRescheduling(true)}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.btnRescheduleText}>Reschedule</Text>
                  </TouchableOpacity>

                  {selectedVisitForDetails.status !== "completed" && (
                    <TouchableOpacity
                      style={styles.btnComplete}
                      onPress={() => handleMarkCompleted(selectedVisitForDetails)}
                        activeOpacity={0.88}
                      >
                        <CheckCircle2 size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.btnCompleteText}>Mark Completed</Text>
                      </TouchableOpacity>
                    )}

                    {selectedVisitForDetails.status !== "cancelled" && (
                      <TouchableOpacity
                        style={styles.btnCancel}
                        onPress={() => handleCancelVisit(selectedVisitForDetails)}
                        activeOpacity={0.8}
                      >
                        <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={styles.btnCancelText}>Cancel Visit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* RESCHEDULE VISIT MODAL (Matches Reference Image) */}
      <ScheduleVisitModal
        visible={isRescheduling && !!selectedVisitForDetails}
        onClose={() => setIsRescheduling(false)}
        title="Reschedule Visit"
        lead={{
          customerName: selectedVisitForDetails?.customerName,
          phone: selectedVisitForDetails?.customerPhone,
        }}
        property={{
          title: selectedVisitForDetails?.propertyTitle,
          location: selectedVisitForDetails?.propertyLocation,
        }}
        initialTime={selectedVisitForDetails?.time || "10:00 am"}
        onConfirm={(reschedData) => {
          handleConfirmReschedule(selectedVisitForDetails, reschedData);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  visitsList: {
    gap: 14,
  },
  visitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  customerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillCompleted: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  statusPillCancelled: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusPillTextCompleted: {
    color: "#16A34A",
  },
  statusPillTextCancelled: {
    color: "#DC2626",
  },
  visitBody: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  bodyField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  fieldValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1E293B",
  },
  fieldValueBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  dateTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateTimeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  callCustomerBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  callCustomerBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  viewDetailsBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  detailsModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    width: 80,
  },
  detailValue: {
    flex: 1,
    fontSize: 12.5,
    color: "#1E293B",
    textAlign: "right",
  },
  detailValueBold: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  rescheduleForm: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  formHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: "#0F172A",
  },
  confirmRescheduleBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
  },
  confirmRescheduleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailsModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnReschedule: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRescheduleText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  btnComplete: {
    flex: 1.2,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCompleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnCancel: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
});
