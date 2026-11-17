import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ScrollView } from "../../../shared/components/KeyboardSafe.js";
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
} from "../../../shared/components/HugeIcon.js";

import COLORS from "../../../shared/constants/colors.js";
import InitialsAvatar from "../../../shared/components/InitialsAvatar.js";
import { useOwner, selectOwnerScopedProperties } from "../context/OwnerContext.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import {
  fetchOwnerLead,
  fetchLeadNotes,
  addLeadNote as addLeadNoteApi,
  sendOwnerReply as sendOwnerReplyApi,
  applyOwnerReply,
  leadMessageSenderLabel,
  ownerReplyErrorMessage,
  OWNER_REPLY_MAX_LENGTH,
  updateOwnerLeadStatus,
  toOwnerLead,
  selectPropertyLeads,
  leadPropertyLabel,
  propertyTypeLabel,
  leadDateLabel,
  LEAD_DATE_UNAVAILABLE,
} from "../api/owner.js";
import { fetchOwnerVisits, toUiVisit, toVisitPayload, updateOwnerVisit } from "../../../shared/api/visits.js";
import { getVisitDisplay } from "../../../shared/utils/visitStatus.js";
import {
  isClosedLeadError,
  isLeadClosed,
  leadVisitBlockedReason,
  ownerRescheduleLabel,
  ownerRescheduleSuccess,
  ownerVisitActions,
  ownerVisitErrorMessage,
  proposeVisitForLead,
} from "../utils/ownerVisits.js";
import { formatBuyerPhone } from "../utils/leadContact.js";
import { contactLeadBuyer } from "../utils/contactLeadBuyer.js";
import StatusBadge from "../components/StatusBadge.js";
import PrimaryButton from "../components/PrimaryButton.js";
import SecondaryButton from "../components/SecondaryButton.js";
import OwnerSiteVisitModal from "./OwnerSiteVisitModal.js";
import OwnerCloseLeadModal from "./OwnerCloseLeadModal.js";
import OwnerPropertyDetailModal from "./OwnerPropertyDetailModal.js";

export default function OwnerLeadDetailScreen({ route, navigation }) {
  const { properties, updateLeadStatus } = useOwner();
  const { user: authUser } = useAuth();
  // Only the signed-in owner's rows are ever matched (defence in depth on top
  // of the backend's ownership scoping).
  const scopedProperties = useMemo(
    () => selectOwnerScopedProperties(properties, authUser?.id ?? null),
    [properties, authUser]
  );
  // Navigation params carry only the initial id + a stale snapshot; the lead
  // itself is reloaded from GET /owner/leads/{id}, so what is rendered is the
  // server's current values (contract §D), not what the previous screen knew.
  const initialLead = route?.params?.lead ?? null;

  const [lead, setLead] = useState(initialLead);
  const [leadFetching, setLeadFetching] = useState(false);
  const [leadError, setLeadError] = useState(false);
  const leadReqId = useRef(0);

  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [ownerVisit, setOwnerVisit] = useState(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState(false);
  const [visitBusy, setVisitBusy] = useState(false);
  // Buyer's number from the audited reveal, kept in memory for this screen
  // only (never in lead state or the owner context).
  const [buyerPhone, setBuyerPhone] = useState(null);
  const [contactBusy, setContactBusy] = useState(null);

  // Internal notes are device-independent: they exist only behind
  // GET/POST /owner/leads/{id}/notes (contract §F), never in a local store.
  const [leadNotes, setLeadNotes] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const notesReqId = useRef(0);

  // Reply to the buyer (shared thread, unlike the private notes above).
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  // Reload the lead from the server (request-ID guard so a late response can
  // never overwrite newer rows). The snapshot from the list stays on screen
  // meanwhile; on failure the honest error row offers a Retry.
  const loadLead = useCallback(() => {
    const leadId = Number(initialLead?.id);
    if (!Number.isFinite(leadId) || leadId <= 0) return Promise.resolve(null);
    const myReq = ++leadReqId.current;
    setLeadFetching(true);
    return fetchOwnerLead(leadId).then(
      (mapped) => {
        if (leadReqId.current !== myReq) return null;
        setLeadError(false);
        setLeadFetching(false);
        if (mapped && Number(mapped.id) === leadId) setLead(mapped);
        return mapped;
      },
      () => {
        if (leadReqId.current !== myReq) return null;
        setLeadError(true);
        setLeadFetching(false);
        return null;
      }
    );
  }, [initialLead?.id]);

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

  const loadLeadNotes = useCallback(() => {
    const leadId = Number(initialLead?.id);
    if (!Number.isFinite(leadId) || leadId <= 0) {
      setLeadNotes([]);
      return Promise.resolve([]);
    }
    const myReq = ++notesReqId.current;
    setNotesLoading(true);
    setNotesError(false);
    return fetchLeadNotes(leadId).then(
      (resp) => {
        if (notesReqId.current !== myReq) return null;
        setLeadNotes(resp.items);
        setNotesLoading(false);
        return resp.items;
      },
      () => {
        if (notesReqId.current !== myReq) return null;
        setNotesError(true);
        setNotesLoading(false);
        return null;
      }
    );
  }, [initialLead?.id]);

  useFocusEffect(
    useCallback(() => {
      loadLead();
      loadLeadNotes();
      loadOwnerVisit();
    }, [loadLead, loadLeadNotes, loadOwnerVisit])
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

  // A closed lead is read-only (any outcome). If it becomes closed while the
  // visit sheet is open (closed elsewhere, then refreshed on focus), the
  // sheet is dismissed so it can't submit; the server refuses it anyway.
  const leadClosed = isLeadClosed(lead);
  useEffect(() => {
    if (leadClosed) setShowVisitModal(false);
  }, [leadClosed]);

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

  // The server refused a write because the lead is closed: show it and pull
  // the real lead + visit state so the screen turns read-only.
  const reconcileClosedLead = () => {
    loadLead();
    loadOwnerVisit();
  };

  const handleUpdateStatus = (newStatus) => {
    if (leadClosed) return;
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
      // Merge only what the PATCH response genuinely carries; the full lead
      // (with the message thread) is reloaded from GET /owner/leads/{id}.
      setLead((prev) => ({
        ...prev,
        status: mapped.status,
        closedOutcome: mapped.closedOutcome,
      }));
    } catch (error) {
      updateLeadStatus(lead.id, prevSnapshot.status, prevSnapshot.closedOutcome);
      setLead(prevSnapshot);
      if (isClosedLeadError(error)) {
        Alert.alert("Lead is closed", "This lead was already closed, so its status can't change.");
        reconcileClosedLead();
        return;
      }
      Alert.alert(
        "Couldn't update lead",
        "Please check your connection and try again."
      );
    }
  };

  // Close the lead (contract §G): PATCH /owner/leads/{id} with status CLOSED
  // and the required closing_reason — one of the modal's four outcomes.
  // Never touches any listing endpoint; on success the lead is refetched so
  // status, filters, and counts come from the server, and the saved status +
  // outcome are applied from the server-confirmed PATCH response first.
  // The server cancels the lead's active site visit in the same transaction,
  // so the visit is reloaded too and shows its real (cancelled) state.
  const handleCloseOutcome = async (outcome) => {
    let updated;
    try {
      updated = await updateOwnerLeadStatus(lead.id, {
        status: "closed",
        closingReason: outcome,
      });
    } catch (error) {
      if (isClosedLeadError(error)) reconcileClosedLead();
      throw error;
    }
    const mapped = toOwnerLead(updated);
    setLead((prev) => (mapped && Number(mapped.id) === Number(lead.id)
      ? { ...prev, status: mapped.status, closedOutcome: mapped.closedOutcome }
      : prev
    ));
    updateLeadStatus(lead.id, mapped.status, mapped.closedOutcome);
    await Promise.all([loadLead(), loadOwnerVisit()]);
  };

  const applyVisitStatus = async (status, action) => {
    if (!ownerVisit || typeof ownerVisit.id !== "number" || visitBusy || leadClosed) return;
    setVisitBusy(true);
    try {
      await updateOwnerVisit(ownerVisit.id, { status });
      await loadOwnerVisit();
    } catch (error) {
      const copy = ownerVisitErrorMessage(error, action);
      Alert.alert(copy.title, copy.message);
      if (isClosedLeadError(error)) reconcileClosedLead();
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
    if (leadClosed) {
      setShowVisitModal(false);
      return;
    }
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
        // §E: the note is sent only when the owner edited it in the modal
        // (an emptied note is PATCHed as "" — the server clears it). A pure
        // time reschedule never touches the checker's previous note.
        const noteChanged =
          String(visitData?.note ?? "") !== String(ownerVisit.note ?? "");
        await updateOwnerVisit(ownerVisit.id, {
          scheduledAtISO,
          ...(noteChanged ? { note: visitData?.note ?? "" } : {}),
        });
        const done = ownerRescheduleSuccess(ownerVisit.serverStatus);
        Alert.alert(done.title, done.message);
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
      if (isClosedLeadError(error)) {
        setShowVisitModal(false);
        reconcileClosedLead();
      }
    } finally {
      setVisitBusy(false);
    }
  };

  // Call / WhatsApp: the number comes from the audited owner reveal (lead
  // rows never carry it), is validated, and only then is a tel: or wa.me URL
  // opened. A NEW lead is marked contacted only after the app really opened.
  const contactBuyer = async (channel) => {
    if (contactBusy) return;
    setContactBusy(channel);
    try {
      const result = await contactLeadBuyer(lead, channel, { cachedPhone: buyerPhone });
      if (result.phone) setBuyerPhone(result.phone);
      if (!result.ok) return;
      if (lead.status === "new") handleUpdateStatus("contacted");
    } finally {
      setContactBusy(null);
    }
  };
  const handleCall = () => contactBuyer("call");
  const handleWhatsApp = () => contactBuyer("whatsapp");

  const handleAddNote = async () => {
    // While the request is in flight the button stays disabled, so a second
    // tap can never send a duplicate note.
    if (noteSaving) return;
    const noteContent = String(newNoteText ?? "").trim();
    if (!noteContent || typeof lead?.id !== "number") return;
    setNoteSaving(true);
    try {
      // The server-confirmed note (id + created_at from the backend) is
      // appended; earlier notes stay. Nothing is added before the response.
      const saved = await addLeadNoteApi(lead.id, noteContent);
      setLeadNotes((prev) => [...(Array.isArray(prev) ? prev : []), saved]);
      setNewNoteText("");
    } catch (error) {
      // The draft stays in the input box — nothing is lost on a failure.
      if (error?.kind === "validation") {
        Alert.alert("Note not saved", error.message);
      } else if (error?.status === 422) {
        Alert.alert("Note not saved", error?.detail || "A note must be 1–2000 characters.");
      } else {
        Alert.alert("Note not saved", "Please check your connection and try again.");
      }
    } finally {
      setNoteSaving(false);
    }
  };

  const handleSendReply = async () => {
    // Same guard as notes: the button is disabled while sending, so a second
    // tap can never send the reply twice.
    if (replySending) return;
    const replyContent = String(replyText ?? "").trim();
    if (!replyContent || typeof lead?.id !== "number") return;
    setReplySending(true);
    try {
      // Only the server-confirmed message is added (applyOwnerReply keeps a
      // duplicate returned by the server once). Nothing shows as sent first.
      const sent = await sendOwnerReplyApi(lead.id, replyContent);
      setLead((prev) => applyOwnerReply(prev, sent));
      setReplyText("");
    } catch (error) {
      // The draft stays in the input box — nothing is lost on a failure.
      Alert.alert("Reply not sent", ownerReplyErrorMessage(error));
      // A closed or missing lead: reload so the screen shows the server state.
      if (error?.status === 422 || error?.status === 404) loadLead();
    } finally {
      setReplySending(false);
    }
  };

  const isOwnerMsg = (sender) => leadMessageSenderLabel(sender) === "Owner";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />

      {/* ================= HEADER ================= */}
      <View style={styles.rHeader}>
        <TouchableOpacity
          style={styles.rBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.rHeaderTitle} pointerEvents="none">Lead Details</Text>
        <StatusBadge status={lead.status} style={styles.rHeaderBadge} />
      </View>

      <ScrollView
        style={styles.rContainer}
        contentContainerStyle={styles.rScroll}
        showsVerticalScrollIndicator={false}
      >
        {leadFetching ? (
          <View style={styles.leadFetchingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.leadFetchingText}>Refreshing lead…</Text>
          </View>
        ) : null}
        {leadError ? (
          <View style={styles.leadErrorRow}>
            <Text style={styles.leadErrorText}>Couldn't refresh lead details.</Text>
            <TouchableOpacity style={styles.leadRetryBtn} onPress={loadLead} activeOpacity={0.8}>
              <Text style={styles.leadRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ================= BUYER CARD ================= */}
        <View style={[styles.rCard, styles.rBuyerCard]}>
          <InitialsAvatar
            name={lead.customerName}
            uri={lead.avatar}
            style={styles.rAvatar}
            textStyle={{ fontSize: 26 }}
          />
          <Text style={styles.rBuyerName}>{lead.customerName || "Buyer enquiry"}</Text>
          <Text style={styles.rBuyerMeta}>
            {buyerPhone ? formatBuyerPhone(buyerPhone) : "Number shown when you call or message"}
          </Text>
          {lead.email ? <Text style={styles.rBuyerMeta}>{lead.email}</Text> : null}

          <View style={styles.rContactRow}>
            <TouchableOpacity
              style={[styles.rContactBtn, styles.rCallBtn]}
              onPress={handleCall}
              disabled={contactBusy !== null}
              activeOpacity={0.8}
            >
              <Phone size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.rCallText}>{contactBusy === "call" ? "Opening…" : "Call"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rContactBtn, styles.rWaBtn]}
              onPress={handleWhatsApp}
              disabled={contactBusy !== null}
              activeOpacity={0.8}
            >
              <MessageCircle size={16} color="#16A34A" style={{ marginRight: 8 }} />
              <Text style={styles.rWaText}>{contactBusy === "whatsapp" ? "Opening…" : "WhatsApp"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= PROPERTY + ENQUIRY ================= */}
        <Text style={styles.rSectionLabel}>Interested in</Text>
        <TouchableOpacity
          style={[styles.rCard, styles.rPropertyCard]}
          activeOpacity={0.9}
          onPress={() => {
            if (matchedProperty) setShowPropertyModal(true);
            else Alert.alert("Property Details Unavailable", "Full property details for this lead are not available.");
          }}
        >
          {lead.propertyImage ? (
            <View>
              <Image source={{ uri: lead.propertyImage }} style={styles.rPropertyImage} />
              <View style={styles.rPropertyTag}>
                <Text style={styles.rPropertyTagText}>{(lead.requirement || "Enquiry").toUpperCase()}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.rPropertyBody}>
            {!lead.propertyImage ? (
              <View style={styles.rPropertyHeadRow}>
                <View style={styles.rPropertyIcon}>
                  <Building2 size={22} color="#2563EB" />
                </View>
                <View style={styles.rPropertyTagInline}>
                  <Text style={styles.rPropertyTagInlineText}>{(lead.requirement || "Enquiry").toUpperCase()}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.rPropertyTitleRow}>
              <Text style={styles.rPropertyTitle} numberOfLines={1}>{leadPropertyLabel(lead)}</Text>
              <Text style={styles.rPropertyPrice}>{lead.propertyPrice || "—"}</Text>
            </View>
            <View style={styles.rLocRow}>
              <MapPin size={13} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.rLocText} numberOfLines={1}>{lead.propertyLocality || "Locality not available"}</Text>
            </View>

            <View style={styles.rFacts}>
              <View style={styles.rFact}>
                <Home size={15} color="#2563EB" />
                <Text style={styles.rFactLabel}>Type</Text>
                <Text style={styles.rFactValue} numberOfLines={1}>{propertyTypeLabel(lead.propertyType) || "—"}</Text>
              </View>
              <View style={styles.rFact}>
                <Clock size={15} color="#2563EB" />
                <Text style={styles.rFactLabel}>Enquired</Text>
                <Text style={styles.rFactValue} numberOfLines={2}>{leadDateLabel(lead)}</Text>
              </View>
              <View style={styles.rFact}>
                <Calendar size={15} color="#2563EB" />
                <Text style={styles.rFactLabel}>Visit</Text>
                <Text style={styles.rFactValue} numberOfLines={1}>
                  {ownerVisitIsOpen ? `${ownerVisit.date || "—"}` : "Not set"}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= CONVERSATION ================= */}
        <Text style={styles.rSectionLabel}>Conversation</Text>
        <View style={styles.rCard}>
          {Array.isArray(lead.messages) && lead.messages.length > 0 ? (
            lead.messages.map((entry, idx) => {
              const mine = isOwnerMsg(entry.sender);
              return (
                <View
                  key={entry.id ?? `msg-${idx}`}
                  style={[styles.rBubbleWrap, mine ? styles.rBubbleWrapMine : null]}
                >
                  <View style={[styles.rBubble, mine ? styles.rBubbleMine : styles.rBubbleTheirs]}>
                    <Text style={[styles.rBubbleText, mine && styles.rBubbleTextMine]}>{entry.body}</Text>
                  </View>
                  <Text style={styles.rBubbleMeta}>
                    {leadMessageSenderLabel(entry.sender)}
                    {entry.timestamp ? ` · ${entry.timestamp}` : ""}
                  </Text>
                </View>
              );
            })
          ) : lead.message ? (
            <View style={styles.rBubbleWrap}>
              <View style={[styles.rBubble, styles.rBubbleTheirs]}>
                <Text style={styles.rBubbleText}>{lead.message}</Text>
              </View>
              <Text style={styles.rBubbleMeta}>Buyer</Text>
            </View>
          ) : (
            <View style={styles.rEmptyWrap}>
              <View style={styles.rEmptyIcon}>
                <MessageCircle size={22} color="#2563EB" />
              </View>
              <Text style={styles.rEmptyTitle}>No messages yet</Text>
              <Text style={styles.rEmptySub}>Send the buyer a message to start the conversation.</Text>
            </View>
          )}

          {lead.status === "closed" ? (
            <Text style={[styles.rEmptySub, styles.rClosedReply]}>This lead is closed, so replies are turned off.</Text>
          ) : (
            <View style={styles.rReplyBox}>
              <TextInput
                style={styles.rReplyInput}
                placeholder="Message the buyer…"
                numberOfLines={1}
                placeholderTextColor="#94A3B8"
                value={replyText}
                onChangeText={setReplyText}
                underlineColorAndroid="transparent"
                editable={!replySending}
                multiline
                maxLength={OWNER_REPLY_MAX_LENGTH}
              />
              <TouchableOpacity
                style={[styles.rSendBtn, (!replyText.trim() || replySending) && styles.rSendBtnDisabled]}
                onPress={handleSendReply}
                disabled={!replyText.trim() || replySending}
                activeOpacity={0.8}
                accessibilityLabel="Send reply"
              >
                {replySending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ================= STICKY ACTION BAR ================= */}
      <SafeAreaView edges={["bottom"]} style={styles.rActionBar}>
        {leadClosed ? (
          <View style={styles.rClosedWrap}>
            <Text style={styles.closedLeadTitle}>
              Lead closed{lead.closedOutcome ? ` · ${lead.closedOutcome}` : ""}
            </Text>
            <Text style={styles.closedLeadText}>This lead is read-only.</Text>
          </View>
        ) : (
          <View style={styles.rActionRow}>
            <SecondaryButton
              title="Close Lead"
              onPress={() => setShowCloseModal(true)}
              variant="outline"
              style={styles.rActionBtn}
            />
            <PrimaryButton
              title={ownerVisitIsOpen ? "Update Visit" : "Propose Visit"}
              onPress={() => setShowVisitModal(true)}
              icon={Calendar}
              style={styles.rActionBtn}
            />
          </View>
        )}
      </SafeAreaView>

      {/* Site Visit Modal (reschedule opens pre-filled with the visit's own
          date/time/note via toScheduleModalInitial; propose starts empty). */}
      <OwnerSiteVisitModal
        key={ownerVisit && ownerVisitIsOpen ? `visit-${ownerVisit.id}-${ownerVisit.scheduledAt}` : "new"}
        visible={showVisitModal}
        lead={lead}
        visit={ownerVisitIsOpen ? ownerVisit : null}
        onClose={() => setShowVisitModal(false)}
        onVisitScheduled={(leadId, visitData) => handleScheduleVisit(visitData)}
      />

      {/* Close Lead Modal — the modal drives the single submit; the outcome
          is saved to the server by handleCloseOutcome and the modal confirms
          only after the request succeeds. */}
      <OwnerCloseLeadModal
        visible={showCloseModal}
        lead={lead}
        onClose={() => setShowCloseModal(false)}
        onCloseLeadWithOutcome={(leadId, outcome) =>
          handleCloseOutcome(outcome)
        }
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
  closedLeadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  closedLeadText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
  },
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
    borderRadius: 10,
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

  /* LEAD REFRESH / NOTES STATES */
  leadFetchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  leadFetchingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  leadErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leadErrorText: {
    fontSize: 12.5,
    color: "#DC2626",
    flex: 1,
    marginRight: 10,
  },
  leadRetryBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  leadRetryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  notesLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  notesErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  /* MESSAGE THREAD */
  threadItem: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  threadTime: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  // Sender line on each thread message (same type ramp as buyerMessageLabel).
  threadSender: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  threadSenderOwner: {
    color: COLORS.primary,
  },
  // Reply box reuses noteInputBox/noteInput/saveNoteBtn; only spacing differs.
  replyBox: {
    marginTop: 12,
    marginBottom: 0,
  },
  replyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyHint: {
    fontSize: 11,
    color: COLORS.lightText,
  },
  replyClosedText: {
    marginTop: 12,
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

  /* ===== Redesign ===== */
  rHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#F4F6FA" },
  rBackBtn: { width: 40, height: 40, borderRadius: 100, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E8ECF2" },
  rHeaderTitle: { position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#0F172A" },
  rHeaderSpacer: { width: 40, height: 40 },
  rBuyerBadge: { marginBottom: 10 },
  rHeaderBadge: { alignSelf: "center", borderRadius: 100 },
  rNewBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563EB", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, shadowColor: "#2563EB", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  rNewDot: { width: 7, height: 7, borderRadius: 100, backgroundColor: "#FFFFFF", marginRight: 6 },
  rNewBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  rContainer: { flex: 1, backgroundColor: "#F4F6FA" },
  rScroll: { paddingHorizontal: 16, paddingTop: 8 },
  rCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#EEF1F5", shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  rSectionLabel: { fontSize: 13, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 22, marginBottom: 10, marginLeft: 4 },
  rBuyerCard: { alignItems: "center", paddingTop: 22, paddingBottom: 18 },
  rAvatar: { width: 72, height: 72, borderRadius: 100, marginBottom: 12 },
  rBuyerName: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 4, textAlign: "center" },
  rBuyerMeta: { fontSize: 14, color: "#64748B", marginTop: 2, textAlign: "center" },
  rContactRow: { flexDirection: "row", gap: 10, marginTop: 18, alignSelf: "stretch" },
  rContactBtn: { flex: 1, height: 46, borderRadius: 100, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  rCallBtn: { backgroundColor: "#2563EB" },
  rCallText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  rWaBtn: { backgroundColor: "#ECFDF3", borderWidth: 1, borderColor: "#BBF7D0" },
  rWaText: { color: "#15803D", fontSize: 15, fontWeight: "700" },
  rPropertyCard: { padding: 0, overflow: "hidden" },
  rPropertyImage: { width: "100%", height: 160 },
  rPropertyHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  rPropertyIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center" },
  rPropertyTagInline: { backgroundColor: "#EEF4FF", borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  rPropertyTagInlineText: { color: "#2563EB", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  rPropertyImageEmpty: { backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  rPropertyTag: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(15,23,42,0.75)", borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  rPropertyTagText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  rPropertyBody: { padding: 16 },
  rPropertyTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rPropertyTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#0F172A" },
  rPropertyPrice: { fontSize: 16, fontWeight: "800", color: "#2563EB" },
  rLocRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  rLocText: { flex: 1, fontSize: 13, color: "#64748B" },
  rFacts: { flexDirection: "row", gap: 8, marginTop: 14 },
  rFact: { flex: 1, backgroundColor: "#F6F8FC", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, gap: 3 },
  rFactLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginTop: 4 },
  rFactValue: { fontSize: 12.5, lineHeight: 17, color: "#0F172A", fontWeight: "700" },
  rBubbleWrap: { alignItems: "flex-start", marginBottom: 12 },
  rBubbleWrapMine: { alignItems: "flex-end" },
  rBubble: { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  rBubbleTheirs: { backgroundColor: "#F1F5F9", borderBottomLeftRadius: 6 },
  rBubbleMine: { backgroundColor: "#2563EB", borderBottomRightRadius: 6 },
  rBubbleText: { fontSize: 14, lineHeight: 20, color: "#0F172A" },
  rBubbleTextMine: { color: "#FFFFFF" },
  rBubbleMeta: { fontSize: 11, color: "#94A3B8", marginTop: 4, marginHorizontal: 4 },
  rEmptyWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  rEmptyIcon: { width: 48, height: 48, borderRadius: 100, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  rEmptyTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  rEmptySub: { fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 4, lineHeight: 18, paddingHorizontal: 12 },
  rClosedReply: { marginTop: 14 },
  rEmptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 8 },
  rReplyBox: { flexDirection: "row", alignItems: "center", overflow: "hidden", backgroundColor: "#F6F8FC", borderRadius: 100, borderWidth: 1, borderColor: "#E8ECF2", paddingLeft: 18, paddingRight: 5, minHeight: 50, marginTop: 14 },
  rReplyInput: { flex: 1, fontSize: 15, lineHeight: 20, color: "#0F172A", maxHeight: 110, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 0, textAlignVertical: "center", outlineStyle: "none" },
  rSendBtn: { width: 40, height: 40, borderRadius: 100, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  rSendBtnDisabled: { backgroundColor: "#CBD5E1" },
  rReplyHint: { fontSize: 11, color: "#94A3B8", marginTop: 6, marginLeft: 16 },
  rActionBar: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EEF1F5", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  rActionRow: { flexDirection: "row", gap: 10, paddingBottom: 8 },
  rActionBtn: { flex: 1, borderRadius: 100 },
  rClosedWrap: { paddingVertical: 6, paddingBottom: 10 },
});
