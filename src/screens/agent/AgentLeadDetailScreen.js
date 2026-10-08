import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Building2,
  ChevronRight,
  X,
  Check,
  Bed,
  Maximize2,
  Sparkles,
  Eye,
  SlidersHorizontal,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useAgent } from "../../context/AgentContext";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import StatusBadge from "../../components/owner/StatusBadge";
import ScheduleVisitModal from "../../components/ScheduleVisitModal";

const PIPELINE_STAGES = [
  { id: "new", label: "Enquiry Received" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Property Shared" },
  { id: "visit_scheduled", label: "Visit Scheduled" },
  { id: "visited", label: "Visited" },
  { id: "negotiating", label: "Negotiation" },
  { id: "converted", label: "Closed" },
];

export default function AgentLeadDetailScreen({ route, navigation }) {
  const { lead: initialLead } = route.params || {};
  const {
    leads,
    localityProperties,
    updateLeadStatus,
    scheduleVisit,
    matchPropertyToLead,
  } = useAgent();

  // Find updated lead from context
  const lead = leads.find((l) => l.id === initialLead?.id) || initialLead;

  // Modals state
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedPropertyForVisit, setSelectedPropertyForVisit] = useState(null);
  const [visitDate, setVisitDate] = useState("12 Oct 2026");
  const [visitTime, setVisitTime] = useState("11:30 AM");
  const [visitNotes, setVisitNotes] = useState("");

  const [activePropertyModal, setActivePropertyModal] = useState(null);

  // Filter matching properties strictly from Agent's assigned localities
  const matchingProperties = useMemo(() => {
    if (!lead) return [];
    const leadLoc = (lead.preferredLocality || "").toLowerCase();

    const matched = localityProperties.filter((item) => {
      const itemLoc = (item.location || "").toLowerCase();
      const itemAddr = (item.address || "").toLowerCase();
      return itemLoc.includes(leadLoc) || itemAddr.includes(leadLoc) || leadLoc.includes(itemLoc);
    });

    if (matched.length > 0) return matched;
    // Fallback to top properties if locality has no direct text match
    return localityProperties.slice(0, 3);
  }, [localityProperties, lead]);

  const handleCall = () => {
    const rawPhone = lead?.phone || "+919876543210";
    Linking.openURL(`tel:${rawPhone.replace(/[^0-9+]/g, "")}`).catch(() => {
      Alert.alert("Call", `Call ${lead?.customerName} at ${rawPhone}`);
    });
  };

  const handleMessage = () => {
    const rawPhone = lead?.phone || "+919876543210";
    const text = encodeURIComponent(
      `Hello ${lead?.customerName}! I am Vikram Prabhu from RESTAMP regarding your inquiry for ${lead?.requirement} in ${lead?.preferredLocality}. When would be a convenient time for a brief discussion?`
    );
    Linking.openURL(`https://wa.me/${rawPhone.replace(/[^0-9]/g, "")}?text=${text}`).catch(() => {
      Alert.alert("Message", `Contact at ${rawPhone}`);
    });
  };

  const handleSelectProperty = (property) => {
    matchPropertyToLead(lead.id, property);
    Alert.alert(
      "Property Selected! 🏠",
      `"${property.title}" has been assigned to ${lead.customerName}. Status updated to Property Shared.`
    );
  };

  const handleConfirmScheduleVisit = (visitDetails) => {
    const prop =
      visitDetails?.property ||
      selectedPropertyForVisit ||
      matchingProperties[0] || {
        id: "prop-1",
        title: lead.requirement || "2 BHK Apartment",
        location: lead.preferredLocality || "Anna Nagar",
      };

    const finalDate = visitDetails?.date || visitDate || "12 Oct 2026";
    const finalFullDate = visitDetails?.fullDate || finalDate;
    const finalTime = visitDetails?.time || visitTime || "10:00 am";
    const finalNotes = visitDetails?.notes || visitNotes || "Site visit coordinated via RESTAMP Agent";

    scheduleVisit({
      leadId: lead.id,
      customerName: lead.customerName,
      customerPhone: lead.phone,
      propertyId: prop.id,
      propertyTitle: prop.title,
      propertyLocation: prop.location,
      ownerName: prop.ownerName || "Property Owner",
      ownerPhone: prop.ownerPhone || "+91 98400 12345",
      date: finalDate,
      fullDate: finalFullDate,
      time: finalTime,
      notes: finalNotes,
    });

    setScheduleModalVisible(false);
    Alert.alert(
      "Site Visit Scheduled! 📅",
      `Visit for ${prop.title} with ${lead.customerName} scheduled on ${finalDate} at ${finalTime}. Both customer and owner have been notified.`
    );
  };

  const handleUpdateStatus = (stageId) => {
    updateLeadStatus(lead.id, stageId);
    setStatusModalVisible(false);
    const stageObj = PIPELINE_STAGES.find((s) => s.id === stageId);
    Alert.alert("Status Updated", `Lead status changed to "${stageObj?.label}".`);
  };

  if (!lead) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ padding: 20 }}>Lead not found.</Text>
      </SafeAreaView>
    );
  }

  // Current stage index
  const currentStageIndex = PIPELINE_STAGES.findIndex(
    (s) => s.id === lead.status
  );
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: CUSTOMER DETAILS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Details</Text>

          <View style={styles.customerTopRow}>
            <Image source={{ uri: lead.avatar }} style={styles.customerAvatar} />
            <View style={styles.customerInfoCol}>
              <View style={styles.customerNameRow}>
                <Text style={styles.customerName}>{lead.customerName}</Text>
                <StatusBadge status={lead.status} />
              </View>
              <Text style={styles.customerMetaText}>{lead.phone}</Text>
              <Text style={styles.customerMetaText}>{lead.email}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: PROPERTY REQUIREMENT */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Property Requirement</Text>

          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Purpose (Buy / Rent / Lease)</Text>
              <Text style={styles.specValueBold}>{lead.dealType || "Rent"}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Property Type</Text>
              <Text style={styles.specValue}>{lead.requirement?.split(" ")[2] || "Apartment"}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>BHK</Text>
              <Text style={styles.specValue}>{lead.bhk || "2 BHK"}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Budget</Text>
              <Text style={[styles.specValueBold, { color: COLORS.primary }]}>
                {lead.budget || "₹20,000 – ₹30,000"}
              </Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Preferred Locations</Text>
              <Text style={styles.specValue}>{lead.preferredLocality || "Anna Nagar"}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Furnishing</Text>
              <Text style={styles.specValue}>{lead.furnishing || "Semi Furnished"}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Move-in Date</Text>
              <Text style={styles.specValue}>{lead.moveInDate || "Immediate"}</Text>
            </View>
          </View>

          {lead.message && (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Customer Note:</Text>
              <Text style={styles.noteContent}>"{lead.message}"</Text>
            </View>
          )}
        </View>

        {/* SECTION 3: MATCHED PROPERTIES (REUSING BUYER PROPERTY CARDS) */}
        <View style={styles.card}>
          <View style={styles.matchedHeaderRow}>
            <Text style={styles.sectionTitle}>Matched Properties</Text>
            <View style={styles.matchCountPill}>
              <Sparkles size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.matchCountText}>{matchingProperties.length} Suitable</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            Suitable owner-posted properties for this requirement
          </Text>

          <View style={styles.matchedPropertiesList}>
            {matchingProperties.map((prop) => (
              <View key={prop.id} style={styles.buyerPropertyCard}>
                <Image source={{ uri: prop.image }} style={styles.propImage} />

                <View style={styles.propBody}>
                  <View style={styles.propHeaderRow}>
                    <Text style={styles.propTitle} numberOfLines={1}>
                      {prop.beds || 2} BHK {prop.type || "Apartment"}
                    </Text>
                    <View style={styles.propVerifiedBadge}>
                      <Text style={styles.propVerifiedBadgeText}>Owner Verified</Text>
                    </View>
                  </View>

                  <View style={styles.propLocRow}>
                    <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.propLocText} numberOfLines={1}>
                      {prop.location}
                    </Text>
                  </View>

                  <View style={styles.propSpecsRow}>
                    <Text style={styles.propPriceText}>{prop.price}</Text>
                    <Text style={styles.propSpecsText}>
                      • {prop.sqft || 1200} sq.ft • {prop.furnishing || "Semi Furnished"}
                    </Text>
                  </View>

                  {/* Actions: View Property, Select Property */}
                  <View style={styles.propActionsRow}>
                    <TouchableOpacity
                      style={styles.propViewBtn}
                      onPress={() => setActivePropertyModal(prop)}
                      activeOpacity={0.8}
                    >
                      <Eye size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.propViewBtnText}>View Property</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.propSelectBtn}
                      onPress={() => handleSelectProperty(prop)}
                      activeOpacity={0.8}
                    >
                      <Check size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.propSelectBtnText}>Select Property</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* SECTION 4: LEAD ACTIVITY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lead Activity</Text>
          <Text style={styles.cardSubtitle}>Current progression in buyer journey</Text>

          <View style={styles.timelineList}>
            {PIPELINE_STAGES.map((stage, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <View key={stage.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        isPast && styles.timelineDotPast,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {isPast ? (
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      ) : isCurrent ? (
                        <View style={styles.timelineInnerDot} />
                      ) : null}
                    </View>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isPast && styles.timelineLinePast,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineRight}>
                    <Text
                      style={[
                        styles.timelineStageLabel,
                        isCurrent && styles.timelineStageLabelCurrent,
                      ]}
                    >
                      {stage.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.timelineStageSub}>Current Active Stage</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* SECTION 5: ACTIONS (STICKY BOTTOM BAR) */}
      <View style={styles.bottomActionBar}>
        <View style={styles.bottomIconBtns}>
          <TouchableOpacity
            style={styles.bottomCircleBtn}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Phone size={18} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomCircleBtn, { backgroundColor: "#F0FDF4" }]}
            onPress={handleMessage}
            activeOpacity={0.8}
          >
            <MessageSquare size={18} color="#16A34A" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.scheduleVisitBtn}
          onPress={() => setScheduleModalVisible(true)}
          activeOpacity={0.85}
        >
          <Calendar size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.scheduleVisitBtnText}>Schedule Visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.updateStatusBtn}
          onPress={() => setStatusModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.updateStatusBtnText}>Update Status</Text>
        </TouchableOpacity>
      </View>

      {/* REDESIGNED SCHEDULE VISIT MODAL (Matches Reference Image) */}
      <ScheduleVisitModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        onConfirm={handleConfirmScheduleVisit}
        lead={lead}
        property={selectedPropertyForVisit || matchingProperties[0]}
        matchingProperties={matchingProperties}
      />

      {/* UPDATE STATUS MODAL */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Lead Status</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setStatusModalVisible(false)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptionsList}>
              {PIPELINE_STAGES.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.statusOptionRow,
                    lead.status === st.id && styles.statusOptionRowActive,
                  ]}
                  onPress={() => handleUpdateStatus(st.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      lead.status === st.id && styles.statusOptionTextActive,
                    ]}
                  >
                    {st.label}
                  </Text>
                  {lead.status === st.id && <Check size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* REUSED BUYER PROPERTY DETAIL MODAL */}
      <PropertyDetailModal
        property={activePropertyModal}
        visible={!!activePropertyModal}
        onClose={() => setActivePropertyModal(null)}
        isAgentView={true}
        onMatchToLead={(prop) => {
          setActivePropertyModal(null);
          handleSelectProperty(prop);
        }}
        onContactOwner={() => {
          handleCall();
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 12,
  },
  customerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
    marginRight: 12,
  },
  customerInfoCol: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  customerMetaText: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 1,
  },
  specGrid: {
    marginTop: 12,
    gap: 10,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  specLabel: {
    fontSize: 12.5,
    color: "#64748B",
  },
  specValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  specValueBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  noteBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
    fontStyle: "italic",
  },
  matchedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  matchCountPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  matchedPropertiesList: {
    gap: 12,
  },
  buyerPropertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    overflow: "hidden",
  },
  propImage: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
    backgroundColor: "#E2E8F0",
  },
  propBody: {
    padding: 12,
  },
  propHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 6,
  },
  propVerifiedBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  propVerifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  propLocRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  propLocText: {
    fontSize: 11.5,
    color: "#64748B",
  },
  propSpecsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  propPriceText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },
  propSpecsText: {
    fontSize: 11.5,
    color: "#475569",
    marginLeft: 4,
  },
  propActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  propViewBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  propViewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  propSelectBtn: {
    flex: 1.1,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  propSelectBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  timelineList: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: "row",
  },
  timelineLeft: {
    alignItems: "center",
    width: 28,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotPast: {
    backgroundColor: "#16A34A",
  },
  timelineDotCurrent: {
    backgroundColor: COLORS.primary,
  },
  timelineInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: "#E2E8F0",
  },
  timelineLinePast: {
    backgroundColor: "#16A34A",
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 22,
  },
  timelineStageLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  timelineStageLabelCurrent: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.primary,
  },
  timelineStageSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomIconBtns: {
    flexDirection: "row",
    gap: 6,
  },
  bottomCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleVisitBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleVisitBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  updateStatusBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  updateStatusBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
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
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  propSelectBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 10,
    padding: 12,
  },
  propSelectText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusOptionsList: {
    gap: 8,
    paddingBottom: 16,
  },
  statusOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusOptionRowActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  statusOptionText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#334155",
  },
  statusOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
