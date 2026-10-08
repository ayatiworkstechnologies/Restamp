import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Check,
  Building2,
  User,
  Mail,
  Home,
  XCircle,
  FileText,
  Send,
  Plus,
} from "lucide-react-native";

import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
import StatusBadge from "../../components/owner/StatusBadge";
import PrimaryButton from "../../components/owner/PrimaryButton";
import SecondaryButton from "../../components/owner/SecondaryButton";
import OwnerSiteVisitModal from "./OwnerSiteVisitModal";
import OwnerCloseLeadModal from "./OwnerCloseLeadModal";

export default function OwnerLeadDetailScreen({ route, navigation }) {
  const { updateLeadStatus, scheduleVisit, closeLead, addLeadNote } = useOwner();
  const initialLead = route?.params?.lead;

  const [lead, setLead] = useState(initialLead);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  if (!lead) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Lead details not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: COLORS.primary, marginTop: 10, fontWeight: "700" }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleUpdateStatus = (newStatus) => {
    if (newStatus === "closed" || newStatus === "lost") {
      setShowCloseModal(true);
      return;
    }
    if (newStatus === "visit_scheduled") {
      setShowVisitModal(true);
      return;
    }
    updateLeadStatus(lead.id, newStatus);
    setLead((prev) => ({ ...prev, status: newStatus }));
  };

  const handleCall = () => {
    Alert.alert("Calling Customer", `Dialing ${lead.customerName} (${lead.phone})...`);
    if (lead.status === "new") {
      handleUpdateStatus("contacted");
    }
  };

  const handleWhatsApp = () => {
    Alert.alert(
      "WhatsApp & Message",
      `Opening direct chat with ${lead.customerName} (${lead.phone}).`
    );
    if (lead.status === "new") {
      handleUpdateStatus("contacted");
    }
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const noteContent = newNoteText.trim();
    addLeadNote?.(lead.id, noteContent);

    const newNoteObj = {
      id: `note-${Date.now()}`,
      text: noteContent,
      timestamp: "Just now",
    };

    setLead((prev) => ({
      ...prev,
      internalNotes: [...(prev.internalNotes || []), newNoteObj],
    }));

    setNewNoteText("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Lead Details</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {lead.customerName}
          </Text>
        </View>

        <StatusBadge status={lead.status} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= BUYER DETAILS ================= */}
        <View style={styles.section}>
          <View style={styles.buyerTopRow}>
            <Image
              source={{
                uri:
                  lead.avatar ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
              }}
              style={styles.buyerAvatar}
            />

            <View style={styles.buyerInfoCol}>
              <View style={styles.buyerNameRow}>
                <Text style={styles.buyerNameText}>{lead.customerName}</Text>
                <View style={styles.verifiedTag}>
                  <Check size={10} color="#16A34A" strokeWidth={3} />
                  <Text style={styles.verifiedTagText}>Verified</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.buyerContactRow}
                onPress={handleCall}
                activeOpacity={0.7}
              >
                <Phone size={13} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.buyerPhoneText}>{lead.phone}</Text>
              </TouchableOpacity>

              {lead.email ? (
                <View style={styles.buyerContactRow}>
                  <Mail size={13} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.buyerEmailText}>{lead.email}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Quick Contact Action Buttons */}
          <View style={styles.buyerActionsRow}>
            <TouchableOpacity
              style={[styles.buyerActionBtn, styles.callBtn]}
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <Phone size={14} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.callBtnText}>Call Buyer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buyerActionBtn, styles.whatsappBtn]}
              onPress={handleWhatsApp}
              activeOpacity={0.8}
            >
              <MessageCircle size={15} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.whatsappBtnText}>WhatsApp Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* ================= INTERESTED PROPERTY ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interested Property</Text>

          <View style={styles.propertyRow}>
            <Image
              source={{
                uri:
                  lead.propertyImage ||
                  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=500&q=80",
              }}
              style={styles.propertyImage}
            />

            <View style={styles.propertyInfo}>
              <View style={styles.propertyBadgeWrap}>
                <Text style={styles.propertyBadgeText}>
                  {(lead.requirement || "FOR RENT").toUpperCase()}
                </Text>
              </View>

              <Text style={styles.propertyTitleText} numberOfLines={1}>
                {lead.propertyTitle || "2 BHK Luxury Apartment"}
              </Text>

              <View style={styles.propertyLocRow}>
                <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.propertyLocText} numberOfLines={1}>
                  {lead.propertyLocality || "Anna Nagar, Chennai"}
                </Text>
              </View>

              <Text style={styles.propertyPriceText}>
                {lead.propertyPrice || "₹25,000 / month"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* ================= BUYER REQUIREMENT ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buyer Requirement</Text>

          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PROPERTY TYPE</Text>
              <Text style={styles.specValue}>
                {lead.propertyTitle?.includes("Villa")
                  ? "Villa"
                  : lead.propertyTitle?.includes("Office")
                  ? "Commercial"
                  : "2 BHK Apartment"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>BUDGET</Text>
              <Text style={[styles.specValue, { color: "#2563EB", fontWeight: "700" }]}>
                {lead.budget || lead.propertyPrice || "₹25,000 / month"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PREFERRED LOCALITY</Text>
              <Text style={styles.specValue}>
                {lead.propertyLocality?.split(",")[0] || "Anna Nagar"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>MOVE-IN / VISIT</Text>
              <Text style={styles.specValue}>
                {lead.preferredVisitDate || "Within 10 days"}
              </Text>
            </View>
          </View>

          {lead.message ? (
            <View style={styles.buyerMessageQuote}>
              <Text style={styles.buyerMessageLabel}>Enquiry Note</Text>
              <Text style={styles.buyerMessageText}>"{lead.message}"</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionDivider} />

        {/* ================= SITE VISIT ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site Visit</Text>

          {lead.visitData ? (
            <View style={styles.visitScheduledRow}>
              <View style={styles.visitCardTop}>
                <View style={styles.visitIconWrap}>
                  <Calendar size={18} color="#2563EB" />
                </View>
                <View style={styles.visitTimeCol}>
                  <Text style={styles.visitStatusLabel}>VISIT CONFIRMED</Text>
                  <Text style={styles.visitDateTime}>
                    {lead.visitData.date} · {lead.visitData.time}
                  </Text>
                </View>
              </View>

              {lead.visitData.note ? (
                <View style={styles.visitNotesRow}>
                  <Text style={styles.visitNotesLabel}>Notes: </Text>
                  <Text style={styles.visitNotesText}>{lead.visitData.note}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.rescheduleBtn}
                onPress={() => setShowVisitModal(true)}
                activeOpacity={0.8}
              >
                <Calendar size={14} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.rescheduleBtnText}>Reschedule Visit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noVisitRow}>
              <Text style={styles.noVisitText}>
                No site visit scheduled for this buyer yet.
              </Text>
              <TouchableOpacity
                style={styles.scheduleVisitSmallBtn}
                onPress={() => setShowVisitModal(true)}
                activeOpacity={0.8}
              >
                <Calendar size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.scheduleVisitSmallBtnText}>Schedule Site Visit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* ================= INTERNAL NOTES ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Internal Notes</Text>
          <Text style={styles.sectionSubtitle}>
            Private notes visible only to you:
          </Text>

          {/* Add Note Input Box */}
          <View style={styles.noteInputBox}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add an internal note about this buyer…"
              placeholderTextColor="#94A3B8"
              value={newNoteText}
              onChangeText={setNewNoteText}
              underlineColorAndroid="transparent"
              multiline
            />
            <TouchableOpacity
              style={[
                styles.saveNoteBtn,
                !newNoteText.trim() && styles.saveNoteBtnDisabled,
              ]}
              onPress={handleAddNote}
              disabled={!newNoteText.trim()}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.saveNoteBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>

          {/* Existing Notes List */}
          {lead.internalNotes && lead.internalNotes.length > 0 ? (
            <View style={styles.savedNotesList}>
              {lead.internalNotes.map((noteItem) => (
                <View key={noteItem.id} style={styles.savedNoteItem}>
                  <View style={styles.savedNoteHeader}>
                    <FileText size={13} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={styles.savedNoteTime}>{noteItem.timestamp}</Text>
                  </View>
                  <Text style={styles.savedNoteContent}>{noteItem.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noNotesPlaceholder}>
              No internal notes added yet. Use the box above to keep private records.
            </Text>
          )}
        </View>

        {/* ================= BOTTOM ACTION BUTTONS ================= */}
        <View style={styles.bottomButtonsRow}>
          <PrimaryButton
            title="Schedule Site Visit"
            onPress={() => setShowVisitModal(true)}
            icon={Calendar}
            style={{ width: "100%", marginBottom: 12 }}
          />

          <SecondaryButton
            title="Close Lead / Mark Outcome"
            onPress={() => setShowCloseModal(true)}
            variant="outline"
            style={{ width: "100%" }}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Site Visit Modal */}
      <OwnerSiteVisitModal
        visible={showVisitModal}
        lead={lead}
        onClose={() => setShowVisitModal(false)}
        onVisitScheduled={(leadId, visitData) => {
          scheduleVisit(leadId, visitData);
          setLead((prev) => ({
            ...prev,
            status: "visit_scheduled",
            visitData,
          }));
        }}
      />

      {/* Close Lead Modal */}
      <OwnerCloseLeadModal
        visible={showCloseModal}
        lead={lead}
        onClose={() => setShowCloseModal(false)}
        onCloseLeadWithOutcome={(leadId, outcome, closeProp, propId) => {
          closeLead(leadId, outcome, closeProp, propId);
          setLead((prev) => ({
            ...prev,
            status: outcome === "Not Converted" ? "lost" : "closed",
            closedOutcome: outcome,
          }));
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
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },

  /* MINIMAL SECTION */
  section: {
    paddingVertical: 18,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginBottom: 12,
  },

  /* BUYER DETAILS */
  buyerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  buyerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E2E8F0",
    marginRight: 14,
  },
  buyerInfoCol: {
    flex: 1,
  },
  buyerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  buyerNameText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginRight: 8,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  buyerContactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  buyerPhoneText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#2563EB",
  },
  buyerEmailText: {
    fontSize: 12.5,
    color: "#64748B",
  },
  buyerActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  buyerActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  callBtn: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  whatsappBtn: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  whatsappBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* INTERESTED PROPERTY */
  propertyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  propertyImage: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  propertyBadgeWrap: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  propertyBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#2563EB",
  },
  propertyTitleText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 3,
  },
  propertyLocRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  propertyLocText: {
    fontSize: 12,
    color: "#64748B",
  },
  propertyPriceText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 3,
  },

  /* BUYER REQUIREMENT */
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specItem: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  specLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  specValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  buyerMessageQuote: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
  },
  buyerMessageLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 3,
  },
  buyerMessageText: {
    fontSize: 13,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 19,
  },

  /* SITE VISIT */
  visitScheduledRow: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  visitCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  visitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  visitTimeCol: {
    flex: 1,
  },
  visitStatusLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.5,
  },
  visitDateTime: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  visitNotesRow: {
    marginTop: 4,
    marginBottom: 10,
  },
  visitNotesLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  visitNotesText: {
    fontSize: 12,
    color: "#78350F",
    marginTop: 1,
  },
  rescheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  rescheduleBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  noVisitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  noVisitText: {
    fontSize: 13,
    color: "#64748B",
    flex: 1,
    marginRight: 10,
  },
  scheduleVisitSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scheduleVisitSmallBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* INTERNAL NOTES */
  noteInputBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  noteInput: {
    minHeight: 60,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    paddingTop: 0,
    marginBottom: 8,
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  saveNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveNoteBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  saveNoteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  savedNotesList: {
    gap: 8,
  },
  savedNoteItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  savedNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  savedNoteTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  savedNoteContent: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
  },
  noNotesPlaceholder: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },

  /* BOTTOM BUTTONS */
  bottomButtonsRow: {
    marginTop: 20,
    marginBottom: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
  },
});
