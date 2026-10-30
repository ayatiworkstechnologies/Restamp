import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  User,
  XCircle,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import AppBrandHeader from "../../../shared/components/AppBrandHeader.js";
import ScheduleVisitModal from "../../buyer/components/ScheduleVisitModal.js";
import StatusBadge from "../components/StatusBadge.js";
import EmptyState from "../components/EmptyState.js";
import {
  fetchOwnerVisits,
  toUiVisit,
  toVisitPayload,
  toScheduleModalInitial,
  updateOwnerVisit,
} from "../../../shared/api/visits.js";
import { getVisitDisplay } from "../../../shared/utils/visitStatus.js";
import { ownerVisitActions, ownerVisitErrorMessage } from "../utils/ownerVisits.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "awaiting", label: "Awaiting" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Closed" },
];

function matchesFilter(visit, filter) {
  const status = String(visit?.serverStatus || "").toUpperCase();
  if (filter === "all") return true;
  if (filter === "awaiting") return status === "REQUESTED" || status === "PROPOSED";
  if (filter === "upcoming") return status === "CONFIRMED";
  if (filter === "completed") return status === "COMPLETED";
  if (filter === "closed") return status === "DECLINED" || status === "CANCELLED";
  return true;
}

export default function OwnerVisitsScreen() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("awaiting");
  const [busyVisitId, setBusyVisitId] = useState(null);
  const [rescheduleVisit, setRescheduleVisit] = useState(null);

  const loadVisits = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    return fetchOwnerVisits({ page: 1, pageSize: 50 }).then(
      (response) => {
        setVisits((response?.items || []).map(toUiVisit));
        setLoadError(false);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setLoadError(true);
        setLoading(false);
        setRefreshing(false);
      }
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [loadVisits])
  );

  const counts = useMemo(() => {
    const next = {};
    FILTERS.forEach((item) => {
      next[item.id] = visits.filter((visit) => matchesFilter(visit, item.id)).length;
    });
    return next;
  }, [visits]);

  const visibleVisits = useMemo(
    () => visits.filter((visit) => matchesFilter(visit, filter)),
    [visits, filter]
  );

  const applyStatus = async (visit, status, action) => {
    if (typeof visit?.id !== "number" || busyVisitId !== null) return;
    setBusyVisitId(visit.id);
    try {
      await updateOwnerVisit(visit.id, { status });
      await loadVisits();
    } catch (error) {
      const copy = ownerVisitErrorMessage(error, action);
      Alert.alert(copy.title, copy.message);
    } finally {
      setBusyVisitId(null);
    }
  };

  const confirmStatus = (visit, status, action) => {
    const isComplete = status === "COMPLETED";
    const isDecline = status === "DECLINED";
    const title = isComplete
      ? "Complete Site Visit"
      : isDecline
        ? "Decline Visit Request"
        : status === "CONFIRMED"
          ? "Confirm Site Visit"
          : "Cancel Site Visit";
    const message = isComplete
      ? "Mark this confirmed visit as completed?"
      : isDecline
        ? "Decline this buyer-requested visit? The buyer can request another time."
        : status === "CONFIRMED"
          ? `Confirm the visit on ${visit.date} at ${visit.time}?`
          : "Cancel this site visit?";
    Alert.alert(title, message, [
      { text: "Not Now", style: "cancel" },
      {
        text: isComplete ? "Complete" : isDecline ? "Decline" : status === "CONFIRMED" ? "Confirm" : "Cancel Visit",
        style: isDecline || status === "CANCELLED" ? "destructive" : "default",
        onPress: () => applyStatus(visit, status, action),
      },
    ]);
  };

  const submitReschedule = async (data) => {
    const visit = rescheduleVisit;
    if (!visit || typeof visit.id !== "number") return;
    let scheduledAtISO;
    try {
      scheduledAtISO = toVisitPayload({ date: data?.date || data?.fullDate, time: data?.time }).scheduled_at;
    } catch (error) {
      Alert.alert("Invalid Date/Time", error?.message || "Please choose a future date and time.");
      return;
    }
    setRescheduleVisit(null);
    setBusyVisitId(visit.id);
    try {
      // §E: explicit UTC for the time; the note rides along only when the
      // owner edited it in the modal (an emptied note is PATCHed as "" so the
      // server clears it). A pure time change never rewrites the note.
      const noteChanged = String(data?.note ?? "") !== String(visit.note ?? "");
      await updateOwnerVisit(visit.id, {
        scheduledAtISO,
        ...(noteChanged ? { note: data?.note ?? "" } : {}),
      });
      await loadVisits();
      Alert.alert("Visit Rescheduled", "The proposed time was updated.");
    } catch (error) {
      const copy = ownerVisitErrorMessage(error, "reschedule");
      Alert.alert(copy.title, copy.message);
    } finally {
      setBusyVisitId(null);
    }
  };

  const renderActions = (visit) => {
    const actions = ownerVisitActions(visit.serverStatus);
    if (!actions.confirm && !actions.decline && !actions.reschedule && !actions.complete && !actions.cancel) {
      return null;
    }
    return (
      <View style={styles.actionsRow}>
        {actions.confirm && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => confirmStatus(visit, "CONFIRMED", "confirm")}
            disabled={busyVisitId !== null}
          >
            <CheckCircle2 size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.primaryActionText}>Confirm</Text>
          </TouchableOpacity>
        )}
        {actions.complete && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => confirmStatus(visit, "COMPLETED", "complete")}
            disabled={busyVisitId !== null}
          >
            <CheckCircle2 size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.primaryActionText}>Complete</Text>
          </TouchableOpacity>
        )}
        {actions.reschedule && (
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => setRescheduleVisit(visit)}
            disabled={busyVisitId !== null}
          >
            <RotateCcw size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
            <Text style={styles.secondaryActionText}>Reschedule</Text>
          </TouchableOpacity>
        )}
        {actions.decline && (
          <TouchableOpacity
            style={styles.dangerAction}
            onPress={() => confirmStatus(visit, "DECLINED", "decline")}
            disabled={busyVisitId !== null}
          >
            <XCircle size={14} color="#DC2626" style={{ marginRight: 5 }} />
            <Text style={styles.dangerActionText}>Decline</Text>
          </TouchableOpacity>
        )}
        {actions.cancel && (
          <TouchableOpacity
            style={styles.dangerAction}
            onPress={() => confirmStatus(visit, "CANCELLED", "cancel")}
            disabled={busyVisitId !== null}
          >
            <XCircle size={14} color="#DC2626" style={{ marginRight: 5 }} />
            <Text style={styles.dangerActionText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppBrandHeader currentRole="owner" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadVisits(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Site Visits</Text>
          <Text style={styles.pageSubtitle}>
            Confirm buyer requests, propose times, and close completed visits.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(item.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label} ({counts[item.id]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading && visits.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading visits…</Text>
          </View>
        ) : loadError && visits.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Couldn't load visits"
            description="Check your connection and try again."
            buttonTitle="Retry"
            onButtonPress={() => loadVisits()}
          />
        ) : visibleVisits.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No site visits here"
            description="Buyer requests and your proposed visit times will appear in this tab."
            buttonTitle=""
          />
        ) : (
          <View style={styles.list}>
            {visibleVisits.map((visit) => {
              // §C display state: labels/colors from visitStatus.js (owner
              // wording), including "Rescheduled". Actions follow the server
              // status, never this display label.
              const visitDisplay = getVisitDisplay(visit, "owner");
              const locationParts = [visit.propertyLocality, visit.propertyCity]
                .filter(Boolean)
                .join(", ");
              return (
              <View key={visit.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.propertyRow}>
                    <View style={styles.iconCircle}>
                      <MapPin size={16} color={COLORS.primary} />
                    </View>
                    <View style={styles.propertyMeta}>
                      <Text style={styles.propertyTitle} numberOfLines={2}>
                        {visit.propertyTitle || "Property visit"}
                      </Text>
                      {locationParts ? (
                        <Text style={styles.propertyLocation} numberOfLines={1}>
                          {locationParts}
                        </Text>
                      ) : null}
                      <View style={styles.buyerRow}>
                        <User size={12} color="#64748B" style={{ marginRight: 4 }} />
                        {/* The buyer's chosen name from the server, or the
                            honest "Buyer #<id>" fallback — never a phone. */}
                        <Text style={styles.buyerText}>
                          {visit.buyerLabel || "Buyer"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <StatusBadge status={visitDisplay.key} label={visitDisplay.label} />
                </View>

                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleChip}>
                    <Calendar size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
                    <Text style={styles.scheduleText}>{visit.date || "Date unavailable"}</Text>
                  </View>
                  <View style={styles.scheduleChip}>
                    <Clock size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
                    <Text style={styles.scheduleText}>{visit.time || "Time unavailable"}</Text>
                  </View>
                </View>

                {visit.note ? (
                  <View style={styles.noteBlock}>
                    <Text style={styles.noteLabel}>Notes for Visit</Text>
                    <Text style={styles.noteText}>{visit.note}</Text>
                  </View>
                ) : null}
                {renderActions(visit)}
              </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ScheduleVisitModal
        key={rescheduleVisit ? `visit-${rescheduleVisit.id}-${rescheduleVisit.scheduledAt}` : "none"}
        visible={!!rescheduleVisit}
        onClose={() => setRescheduleVisit(null)}
        title="Reschedule Visit"
        property={{ title: rescheduleVisit?.propertyTitle || "Property visit", location: "" }}
        // §C/§E: a reschedule starts from the visit's own agreed values —
        // date, slot time, and the existing shared note — via toScheduleModalInitial.
        {...toScheduleModalInitial(rescheduleVisit || {})}
        onConfirm={submitReschedule}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingBottom: 32 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 18 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: COLORS.textDark },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  filterRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  filterTextActive: { color: "#FFFFFF" },
  loadingBox: { alignItems: "center", paddingVertical: 48 },
  loadingText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 13 },
  list: { paddingHorizontal: 20, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  propertyRow: { flexDirection: "row", alignItems: "flex-start", flex: 1, gap: 10 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  propertyMeta: { flex: 1 },
  propertyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textDark, lineHeight: 19 },
  propertyLocation: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "400",
    marginTop: 1,
  },
  buyerRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  buyerText: { fontSize: 11, color: "#64748B", fontWeight: "500" },
  scheduleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  scheduleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  scheduleText: { fontSize: 11.5, fontWeight: "600", color: "#1D4ED8" },
  noteBlock: {
    marginTop: 10,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#475569",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 9,
  },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryActionText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  dangerAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dangerActionText: { color: "#DC2626", fontSize: 12, fontWeight: "600" },
});
