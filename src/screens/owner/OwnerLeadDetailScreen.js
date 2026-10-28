import React, { useState, useMemo, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Building2,
  User,
  Mail,
  Home,
  XCircle,
  FileText,
  Send,
  Plus,
} from "../../components/common/HugeIcon";

import COLORS from "../../constants/colors";
import { useOwner, selectOwnerScopedProperties } from "../../context/OwnerContext";
import { useAuth } from "../../context/AuthContext";
import { updateOwnerLeadStatus, toOwnerLead, selectPropertyLeads, leadPropertyLabel, propertyTypeLabel, leadDateLabel } from "../../api/owner";
import { fetchOwnerVisits, toUiVisit, toVisitPayload, updateOwnerVisit } from "../../api/visits";
import { ownerVisitActions, ownerVisitErrorMessage, proposeVisitForLead } from "../../utils/ownerVisits";
import StatusBadge from "../../components/owner/StatusBadge";
import PrimaryButton from "../../components/owner/PrimaryButton";
import SecondaryButton from "../../components/owner/SecondaryButton";
import OwnerSiteVisitModal from "./OwnerSiteVisitModal";
import OwnerCloseLeadModal from "./OwnerCloseLeadModal";
import OwnerPropertyDetailModal from "./OwnerPropertyDetailModal";

export default function OwnerLeadDetailScreen({ route, navigation }) {
  const { properties, updateLeadStatus, closeLead, addLeadNote } = useOwner();
  const { user: authUser } = useAuth();
  // Only the signed-in owner's rows are ever matched (defence in depth on top
  // of the backend's ownership scoping).
  const scopedProperties = useMemo(
    () => selectOwnerScopedProperties(properties, authUser?.id ?? null),
    [properties, authUser]
  );
  const initialLead = route?.params?.lead;

  const [lead, setLead] = useState(initialLead);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [ownerVisit, setOwnerVisit] = useState(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState(false);
  const [visitBusy, setVisitBusy] = useState(false);

  const loadOwnerVisit = useCallback(() => {
    const listingId = Number(lead?.property_listing_id);
    const buyerUserId = Number(lead?.buyer_user_id);
    if (!Number.isFinite(listingId) || listingId <= 0 || !Number.isFinite(buyerUserId)) {
      setOwnerVisit(null);
      setVisitsLoading(false);
      setVisitsError(false);
      return Promise.resolve(null);
    }
    setVisitsLoading(true);
    setVisitsError(false);
    return fetchOwnerVisits({ propertyListingId: listingId, page: 1, pageSize: 50 }).then(
      (response) => {
        const matches = (response?.items || [])
          .filter((row) => Number(row?.buyer_user_id) === buyerUserId)
          .map(toUiVisit);
        const active = matches.find((row) =>
          ["REQUESTED", "PROPOSED", "CONFIRMED"].includes(row.serverStatus)
        );
        const latest = active || matches.sort((a, b) => Number(b.id) - Number(a.id))[0] || null;
        setOwnerVisit(latest);
        setVisitsLoading(false);
        setVisitsError(false);
        return latest;
      },
      () => {
        setVisitsLoading(false);
        setVisitsError(true);
        return null;
      }
    );
  }, [lead?.property_listing_id, lead?.buyer_user_id]);

  useFocusEffect(
    useCallback(() => {
      loadOwnerVisit();
    }, [loadOwnerVisit])
  );

  const ownerVisitIsOpen =
    !!ownerVisit && ["REQUESTED", "PROPOSED", "CONFIRMED"].includes(ownerVisit.serverStatus);

  const matchedProperty = useMemo(() => {
    if (!lead) return null;
    // Genuine match only; otherwise null (the property modal below is
    // guarded, and the row shows an honest unavailable message). Never
    // synthesize a property record. Only the signed-in owner's rows are
    // considered, so a stale row from another account can never be shown.
    return (
      scopedProperties.find((p) => selectPropertyLeads([lead], p).length > 0) || null
    );
  }, [scopedProperties, lead]);

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
    persistLeadStatus(newStatus);
  };

  // Persist a supported status change (P4): optimistic local flip, then the
  // server-confirmed row; on failure the previous snapshot is restored with
  // an honest error (never false success).
  const persistLeadStatus = async (newStatus, closingReason) => {
    const prevSnapshot = { ...lead };
    updateLeadStatus(lead.id, newStatus, closingReason ?? undefined);
    setLead((prev) => ({
      ...prev,
      status: newStatus,
      ...(closingReason !== undefined ? { closedOutcome: closingReason } : {}),
    }));
    try {
      const updated = await updateOwnerLeadStatus(lead.id, {
        status: newStatus,
        closingReason,
      });
      const mapped = toOwnerLead(updated);
      setLead((prev) => ({
        ...prev,
        ...mapped,
        internalNotes: prev.internalNotes,
      }));
    } catch {
      updateLeadStatus(lead.id, prevSnapshot.status, prevSnapshot.closedOutcome);
      setLead(prevSnapshot);
      Alert.alert(
        "Couldn't update lead",
        "Please check your connection and try again."
      );
    }
  };

  const applyVisitStatus = async (status, action) => {
    if (!ownerVisit || typeof ownerVisit.id !== "number" || visitBusy) return;
    setVisitBusy(true);
    try {
      await updateOwnerVisit(ownerVisit.id, { status });
      await loadOwnerVisit();
    } catch (error) {
      const copy = ownerVisitErrorMessage(error, action);
      Alert.alert(copy.title, copy.message);
    } finally {
      setVisitBusy(false);
    }
  };

  const confirmVisitStatus = (status, action) => {
    const copy = {
      CONFIRMED: ["Confirm Site Visit", `Confirm the visit on ${ownerVisit?.date} at ${ownerVisit?.time}?`, "Confirm"],
      DECLINED: ["Decline Visit Request", "Decline this buyer-requested visit?", "Decline"],
      COMPLETED: ["Complete Site Visit", "Mark this confirmed visit as completed?", "Complete"],
      CANCELLED: ["Cancel Site Visit", "Cancel this site visit?", "Cancel Visit"],
    }[status];
    if (!copy) return;
    Alert.alert(copy[0], copy[1], [
      { text: "Not Now", style: "cancel" },
      {
        text: copy[2],
        style: status === "DECLINED" || status === "CANCELLED" ? "destructive" : "default",
        onPress: () => applyVisitStatus(status, action),
      },
    ]);
  };

  const handleScheduleVisit = async (visitData) => {
    setVisitBusy(true);
    try {
      if (ownerVisitIsOpen && typeof ownerVisit.id === "number") {
        let scheduledAtISO;
        try {
          scheduledAtISO = toVisitPayload({
            date: visitData?.date || visitData?.fullDate,
            time: visitData?.time,
          }).scheduled_at;
        } catch (error) {
          Alert.alert("Invalid Date/Time", error?.message || "Please choose a future date and time.");
          return;
        }
        await updateOwnerVisit(ownerVisit.id, { scheduledAtISO });
        Alert.alert("Visit Rescheduled", "The proposed time was updated.");
      } else {
        await proposeVisitForLead(lead, visitData);
        Alert.alert("Visit Proposed", "The buyer can now confirm or decline the proposed time.");
      }
      setShowVisitModal(false);
      await loadOwnerVisit();
    } catch (error) {
      if (error?.kind === "invalid_lead") {
        Alert.alert("Couldn't propose visit", error.message);
        return;
      }
      if (error?.kind === "invalid_time") {
        Alert.alert("Invalid Date/Time", error.message);
        return;
      }
      const copy = ownerVisitErrorMessage(error, ownerVisitIsOpen ? "reschedule" : "propose");
      Alert.alert(copy.title, copy.message);
    } finally {
      setVisitBusy(false);
    }
  };

  const handleCall = () => {
    // P3 honesty: real leads carry no phone; never dial a sample number.
    if (!lead.phone) {
      Alert.alert(
        "Phone Number Unavailable",
        "The buyer's contact number is not available."
      );
      return;
    }
    Alert.alert("Calling Customer", `Dialing ${lead.customerName} (${lead.phone})...`);
    if (lead.status === "new") {
      handleUpdateStatus("contacted");
    }
  };

  const handleWhatsApp = () => {
    if (!lead.phone) {
      Alert.alert(
        "Phone Number Unavailable",
        "The buyer's contact number is not available."
      );
      return;
    }
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
            {lead.customerName || "Buyer enquiry"}
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
            {lead.avatar ? (
              <Image
                source={{ uri: lead.avatar }}
                style={styles.buyerAvatar}
              />
            ) : (
              <View style={[styles.buyerAvatar, { alignItems: "center", justifyContent: "center", backgroundColor: "#EFF6FF" }]}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#2563EB" }}>
                  {(lead.customerName || "B").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.buyerInfoCol}>
              <View style={styles.buyerNameRow}>
                <Text style={styles.buyerNameText}>{lead.customerName || "Buyer enquiry"}</Text>
              </View>

              <TouchableOpacity
                style={styles.buyerContactRow}
                onPress={handleCall}
                activeOpacity={0.7}
              >
                <Phone size={13} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.buyerPhoneText}>{lead.phone || "Not available"}</Text>
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

          <TouchableOpacity
            style={styles.propertyRow}
            activeOpacity={0.85}
            onPress={() => {
              if (matchedProperty) {
                setShowPropertyModal(true);
              } else {
                Alert.alert(
                  "Property Details Unavailable",
                  "Full property details for this lead are not available."
                );
              }
            }}
          >
            {lead.propertyImage ? (
              <Image
                source={{ uri: lead.propertyImage }}
                style={styles.propertyImage}
              />
            ) : (
              <View style={[styles.propertyImage, { alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" }]}>
                <Building2 size={24} color="#94A3B8" />
              </View>
            )}

            <View style={styles.propertyInfo}>
              <View style={styles.propertyBadgeWrap}>
                <Text style={styles.propertyBadgeText}>
                  {(lead.requirement || "ENQUIRY").toUpperCase()}
                </Text>
              </View>

              <Text style={styles.propertyTitleText} numberOfLines={1}>
                {leadPropertyLabel(lead)}
              </Text>

              <View style={styles.propertyLocRow}>
                <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.propertyLocText} numberOfLines={1}>
                  {lead.propertyLocality || "Not available"}
                </Text>
              </View>

              <Text style={styles.propertyPriceText}>
                {lead.propertyPrice || "—"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionDivider} />

        {/* ================= ENQUIRY DETAILS =================
            Facts about the enquired listing and this lead only. There is no
            buyer-requirement data (budget, preferred locality) in the
            backend, so none is shown or implied. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enquiry Details</Text>

          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PROPERTY TYPE</Text>
              <Text style={styles.specValue}>
                {propertyTypeLabel(lead.propertyType) || "Not available"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ASKING PRICE</Text>
              <Text style={[styles.specValue, { color: "#2563EB", fontWeight: "700" }]}>
                {lead.propertyPrice || "Not available"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>LOCALITY</Text>
              <Text style={styles.specValue}>
                {lead.propertyLocality?.split(",")[0] || "Not available"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>SITE VISIT</Text>
              <Text style={styles.specValue}>
                {ownerVisitIsOpen ? `${ownerVisit.date} · ${ownerVisit.time}` : "Not scheduled"}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ENQUIRED ON</Text>
              <Text style={styles.specValue}>{leadDateLabel(lead)}</Text>
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

          {visitsLoading ? (
            <View style={styles.visitLoadingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.visitLoadingText}>Loading site visits…</Text>
            </View>
          ) : visitsError ? (
            <View style={styles.noVisitRow}>
              <Text style={styles.noVisitText}>Couldn't load site visits for this lead.</Text>
              <TouchableOpacity
                style={styles.scheduleVisitSmallBtn}
                onPress={loadOwnerVisit}
                activeOpacity={0.8}
              >
                <Text style={styles.scheduleVisitSmallBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : ownerVisit ? (
            <View style={styles.visitScheduledRow}>
              <View style={styles.visitCardTop}>
                <View style={styles.visitIconWrap}>
                  <Calendar size={18} color="#2563EB" />
                </View>
                <View style={styles.visitTimeCol}>
                  <Text style={styles.visitStatusLabel}>
                    VISIT {ownerVisit.serverStatus || "PENDING"}
                  </Text>
                  <Text style={styles.visitDateTime}>
                    {ownerVisit.date} · {ownerVisit.time}
                  </Text>
                </View>
              </View>

              {ownerVisit.note ? (
                <View style={styles.visitNotesRow}>
                  <Text style={styles.visitNotesLabel}>Notes: </Text>
                  <Text style={styles.visitNotesText}>{ownerVisit.note}</Text>
                </View>
              ) : null}

              <View style={styles.visitActionRow}>
                {ownerVisitActions(ownerVisit.serverStatus).confirm && (
                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => confirmVisitStatus("CONFIRMED", "confirm")}
                    disabled={visitBusy}
                    activeOpacity={0.8}
                  >
                    <CheckCircle2 size={14} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={styles.rescheduleBtnText}>Confirm Visit</Text>
                  </TouchableOpacity>
                )}
                {ownerVisitActions(ownerVisit.serverStatus).complete && (
                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => confirmVisitStatus("COMPLETED", "complete")}
                    disabled={visitBusy}
                    activeOpacity={0.8}
                  >
                    <CheckCircle2 size={14} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={styles.rescheduleBtnText}>Complete Visit</Text>
                  </TouchableOpacity>
                )}
                {ownerVisitActions(ownerVisit.serverStatus).reschedule && (
                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => setShowVisitModal(true)}
                    disabled={visitBusy}
                    activeOpacity={0.8}
                  >
                    <Calendar size={14} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={styles.rescheduleBtnText}>Reschedule Visit</Text>
                  </TouchableOpacity>
                )}
                {ownerVisitActions(ownerVisit.serverStatus).decline && (
                  <TouchableOpacity
                    style={styles.visitDangerBtn}
                    onPress={() => confirmVisitStatus("DECLINED", "decline")}
                    disabled={visitBusy}
                    activeOpacity={0.8}
                  >
                    <XCircle size={14} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.visitDangerBtnText}>Decline</Text>
                  </TouchableOpacity>
                )}
                {ownerVisitActions(ownerVisit.serverStatus).cancel && (
                  <TouchableOpacity
                    style={styles.visitDangerBtn}
                    onPress={() => confirmVisitStatus("CANCELLED", "cancel")}
                    disabled={visitBusy}
                    activeOpacity={0.8}
                  >
                    <XCircle size={14} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.visitDangerBtnText}>Cancel Visit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noVisitRow}>
              <Text style={styles.noVisitText}>
                No site visit has been requested or proposed for this buyer yet.
              </Text>
              <TouchableOpacity
                style={styles.scheduleVisitSmallBtn}
                onPress={() => setShowVisitModal(true)}
                activeOpacity={0.8}
              >
                <Calendar size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.scheduleVisitSmallBtnText}>Propose Site Visit</Text>
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
            title={ownerVisitIsOpen ? "Update Site Visit" : "Propose New Site Visit"}
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
        onVisitScheduled={(leadId, visitData) => handleScheduleVisit(visitData)}
      />

      {/* Close Lead Modal */}
      <OwnerCloseLeadModal
        visible={showCloseModal}
        lead={lead}
        onClose={() => setShowCloseModal(false)}
        onCloseLeadWithOutcome={(leadId, outcome, closeProp, propId) => {
          // P4 rules: close only the lead (closeProp ignored — the modal no
          // longer offers it), and persist CLOSED with the outcome as
          // closing_reason (no LOST backend status exists).
          closeLead(leadId, outcome, false, null);
          persistLeadStatus("closed", outcome);
          setShowCloseModal(false);
        }}
      />

      {/* Property Details Modal */}
      {matchedProperty && (
        <OwnerPropertyDetailModal
          visible={showPropertyModal}
          property={matchedProperty}
          onClose={() => setShowPropertyModal(false)}
          onEdit={() => {
            setShowPropertyModal(false);
            navigation.navigate("Add", { editingProperty: matchedProperty });
          }}
        />
      )}
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
  visitLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  visitLoadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  visitActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  visitDangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  visitDangerBtnText: {
    color: "#DC2626",
    fontSize: 12.5,
    fontWeight: "600",
  },
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
