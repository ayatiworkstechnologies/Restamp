import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Phone,
  MessageSquare,
  Calendar,
  Building2,
  ChevronRight,
  SlidersHorizontal,
  X,
  MoreVertical,
  Clock,
  ExternalLink,
  Star,
  MessageCircle,
} from "../../components/common/HugeIcon";

import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
import { selectPropertyLeads, fetchOwnerLeads, toOwnerLead, updateOwnerLeadStatus } from "../../api/owner";
import StatusBadge from "../../components/owner/StatusBadge";
import EmptyState from "../../components/owner/EmptyState";
import OwnerSiteVisitModal from "./OwnerSiteVisitModal";
import OwnerCloseLeadModal from "./OwnerCloseLeadModal";
import OwnerPropertyDetailModal from "./OwnerPropertyDetailModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LEAD_TABS = [
  "All",
  "New",
  "Contacted",
  "Visit Scheduled",
  "Negotiating",
  "Closed",
];

export default function OwnerPropertyLeadsScreen({ route, navigation }) {
  const { properties, leads, updateLeadStatus, scheduleVisit, closeLead } = useOwner();

  // Selected property passed from My Properties
  const routeProperty = route?.params?.property;
  const routePropertyId = route?.params?.propertyId || routeProperty?.id;

  const property = useMemo(() => {
    if (routeProperty) return routeProperty;
    if (routePropertyId) {
      return properties.find((p) => p.id === routePropertyId) || properties[0];
    }
    return properties[0] || null;
  }, [routeProperty, routePropertyId, properties]);

  const [activeTab, setActiveTab] = useState("All");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState(null);
  const [selectedLeadForClose, setSelectedLeadForClose] = useState(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  const formattedPrice = useMemo(() => {
    if (!property) return "—";
    if (property.priceFormatted) return property.priceFormatted;
    if (property.price) {
      const priceNum =
        typeof property.price === "number"
          ? property.price
          : Number(String(property.price).replace(/[^0-9.-]+/g, ""));
      return !isNaN(priceNum)
        ? `₹${priceNum.toLocaleString("en-IN")}${property.priceUnit || ""}`
        : String(property.price);
    }
    return "—";
  }, [property]);

  // Genuine backend leads for this property (P3). The backend validates the
  // property filter against the caller's owned properties (foreign ids 404),
  // and the client-side selectPropertyLeads match below keeps the existing
  // no-leak guarantee as a second layer.
  const [serverLeads, setServerLeads] = useState(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState(false);
  const leadReqId = useRef(0);

  const routeListingId = useMemo(() => {
    if (property && typeof property.listing_id === "number") return property.listing_id;
    const raw = property ? property.listing_id ?? property.id : null;
    const n = parseInt(String(raw ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [property]);

  const loadLeads = useCallback(() => {
    if (routeListingId == null) {
      setServerLeads([]);
      setLeadsError(false);
      setLeadsLoading(false);
      return;
    }
    // Request-ID guard: stale responses must never overwrite newer rows.
    const myReq = ++leadReqId.current;
    setLeadsLoading(true);
    setLeadsError(false);
    fetchOwnerLeads({ propertyListingId: routeListingId, pageSize: 100 }).then(
      (resp) => {
        if (leadReqId.current !== myReq) return;
        setServerLeads((resp.items || []).map(toOwnerLead));
        setLeadsError(false);
        setLeadsLoading(false);
      },
      () => {
        if (leadReqId.current !== myReq) return;
        setLeadsError(true);
        setLeadsLoading(false);
      }
    );
  }, [routeListingId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadLeads);
    return unsubscribe;
  }, [navigation, loadLeads]);

  // Invalidate in-flight fetches on unmount.
  useEffect(() => {
    return () => {
      leadReqId.current++;
    };
  }, []);

  // Mirror local-only status flips onto server rows (device-local until
  // owner transition endpoints exist; a refetch restores the server state).
  const patchServerLead = useCallback((leadId, patch) => {
    setServerLeads((prev) =>
      Array.isArray(prev) ? prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)) : prev
    );
  }, []);

  // Persist a supported status change (P4): optimistic flip, server-confirmed
  // row on success, honest error + refetch on failure (never false success).
  const persistLeadStatus = useCallback(
    async (leadId, status, closingReason) => {
      patchServerLead(leadId, {
        status,
        ...(closingReason !== undefined ? { closedOutcome: closingReason } : {}),
      });
      updateLeadStatus(leadId, status, closingReason ?? undefined);
      try {
        const updated = await updateOwnerLeadStatus(leadId, { status, closingReason });
        const mapped = toOwnerLead(updated);
        setServerLeads((prev) =>
          Array.isArray(prev) ? prev.map((l) => (l.id === leadId ? mapped : l)) : prev
        );
      } catch {
        Alert.alert(
          "Couldn't update lead",
          "Please check your connection and try again."
        );
        loadLeads();
      }
    },
    [patchServerLead, updateLeadStatus, loadLeads]
  );

  // Filter leads specifically for this property. Honest empty (P0+P3): a
  // property with no lead records shows the empty state below — leads are
  // never invented. Server rows come pre-filtered; local-only records are
  // matched with the same genuine-only rule.
  const projectLeads = useMemo(() => {
    const server = Array.isArray(serverLeads) ? serverLeads : [];
    const serverIds = new Set(server.map((l) => l.id));
    const localOnly = (leads || []).filter((l) => !serverIds.has(l.id));
    return selectPropertyLeads([...server, ...localOnly], property);
  }, [serverLeads, leads, property]);

  // Tab and search filtered leads
  const filteredLeads = useMemo(() => {
    let list = projectLeads;
    if (activeTab !== "All") {
      const normalizedTab = activeTab.toLowerCase().replace(" ", "_");
      list = list.filter((l) => {
        if (activeTab === "Visit Scheduled") return l.status === "visit_scheduled";
        return l.status === normalizedTab;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.customerName?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.message?.toLowerCase().includes(q) ||
          l.requirement?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [projectLeads, activeTab, searchQuery]);

  const handleCall = (lead) => {
    if (!lead.phone) {
      Alert.alert(
        "Phone Number Unavailable",
        "The buyer's contact number is not available."
      );
      return;
    }
    Alert.alert("Calling Customer", `Dialing ${lead.customerName} at ${lead.phone}...`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => {
          if (lead.status === "new") {
            persistLeadStatus(lead.id, "contacted");
          }
        },
      },
    ]);
  };

  const handleChat = (lead) => {
    if (!lead.phone) {
      Alert.alert(
        "Phone Number Unavailable",
        "The buyer's contact number is not available."
      );
      return;
    }
    Alert.alert(
      "WhatsApp & Message",
      `Opening direct conversation with ${lead.customerName} (${lead.phone}).`,
      [{ text: "OK" }]
    );
  };

  const handleMoreOptions = (lead) => {
    Alert.alert(
      lead.customerName,
      `Status: ${(lead.status || "NEW").toUpperCase()} • ${lead.phone || ""}`,
      [
        {
          text: "Schedule Visit",
          onPress: () => setSelectedLeadForVisit(lead),
        },
        {
          text: "Close Lead",
          style: "destructive",
          onPress: () => setSelectedLeadForClose(lead),
        },
        {
          text: "View Details",
          onPress: () => navigation.navigate("OwnerLeadDetail", { lead }),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const tabCounts = useMemo(() => {
    const counts = {};
    LEAD_TABS.forEach((tab) => {
      if (tab === "All") {
        counts[tab] = projectLeads.length;
      } else {
        const normalizedTab = tab.toLowerCase().replace(" ", "_");
        counts[tab] = projectLeads.filter((l) => {
          if (tab === "Visit Scheduled") return l.status === "visit_scheduled";
          return l.status === normalizedTab;
        }).length;
      }
    });
    return counts;
  }, [projectLeads]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Minimal header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={COLORS.textDark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Enquiries</Text>
          <Text style={styles.headerCount}>
            {projectLeads.length} {projectLeads.length === 1 ? "lead" : "leads"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.searchToggle, showSearch && styles.searchToggleActive]}
          onPress={() => {
            setShowSearch(!showSearch);
            if (showSearch) setSearchQuery("");
          }}
          activeOpacity={0.7}
        >
          {showSearch ? (
            <X size={18} color={COLORS.primary} />
          ) : (
            <Search size={18} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search bar (collapsible) ── */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Search size={15} color={COLORS.lightText} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, message…"
            placeholderTextColor={COLORS.lightText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <X size={15} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1st Section: Property context strip ── */}
        {property && (
          <TouchableOpacity
            style={styles.propertyStrip}
            activeOpacity={0.7}
            onPress={() => setShowPropertyModal(true)}
          >
            <Image
              source={{
                uri:
                  property.coverPhoto ||
                  property.images?.[0] ||
                  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80",
              }}
              style={styles.propertyThumb}
            />
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyTitle} numberOfLines={1}>
                {property.title}
              </Text>
              <Text style={styles.propertyMeta} numberOfLines={1}>
                {property.locality || "Chennai"} · {formattedPrice}
              </Text>
            </View>
            <ChevronRight size={16} color={COLORS.lightText} />
          </TouchableOpacity>
        )}

        {/* ── 2nd Section: STATUS TABS FILTER (Buyer Search Properties Filter Bar Design) ── */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {/* Main Filter Icon Button */}
            <TouchableOpacity
              style={[styles.filterIconPill, showSearch && styles.filterIconPillActive]}
              activeOpacity={0.8}
              onPress={() => setShowSearch(!showSearch)}
            >
              <SlidersHorizontal size={15} color={showSearch ? COLORS.primary : "#334155"} />
            </TouchableOpacity>

            {LEAD_TABS.map((tab) => {
              const count = tabCounts[tab] || 0;
              const isActive = activeTab === tab;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterDropdownPill, isActive && styles.filterDropdownPillActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterDropdownText, isActive && styles.filterDropdownTextActive]}>
                    {tab}
                  </Text>
                  <View
                    style={[
                      styles.tabCountBadge,
                      isActive && styles.tabCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        isActive && styles.tabCountTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 2nd Section: LEADS LIST (loading / error / empty / real rows) ── */}
        {leadsLoading && serverLeads === null ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : leadsError && projectLeads.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Couldn't load leads"
            description="Please check your connection and try again."
            buttonTitle="Retry"
            onButtonPress={loadLeads}
          />
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={activeTab === "All" ? "No Leads Yet" : `No ${activeTab} Leads`}
            description={
              activeTab === "All"
                ? "As soon as prospective buyers or tenants express interest in this listing, their enquiries will appear here."
                : `There are currently no leads categorized under "${activeTab}" for this property.`
            }
          />
        ) : (
          <View style={styles.leadsList}>
            {filteredLeads.map((lead) => {
              const isVisitScheduled = lead.status === "visit_scheduled";

              return (
                <TouchableOpacity
                  key={lead.id}
                  style={styles.leadCard}
                  activeOpacity={0.94}
                  onPress={() => navigation.navigate("OwnerLeadDetail", { lead })}
                >
                  {/* Top Header: Avatar, Name, Right Actions */}
                  <View style={styles.leadHeaderRow}>
                    {lead.avatar ? (
                      <Image
                        source={{ uri: lead.avatar }}
                        style={styles.leadAvatar}
                      />
                    ) : (
                      <View style={[styles.leadAvatar, { alignItems: "center", justifyContent: "center", backgroundColor: "#EFF6FF" }]}>
                        <Text style={{ fontSize: 18, fontWeight: "700", color: "#2563EB" }}>
                          {(lead.customerName || "B").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.leadInfoCol}>
                      <Text style={styles.leadCustomerName} numberOfLines={1}>
                        {lead.customerName || "Buyer enquiry"}
                      </Text>

                      {/* Rating row only when a genuine rating exists (never invented) */}
                      {lead.rating ? (
                        <View style={styles.ratingStarsRow}>
                          {[1, 2, 3, 4, 5].map((starIdx) => (
                            <Star
                              key={starIdx}
                              size={14}
                              color="#F59E0B"
                              fill={starIdx <= Math.round(lead.rating) ? "#F59E0B" : "transparent"}
                              style={{ marginRight: 2.5 }}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.headerRightActions}>
                      <TouchableOpacity
                        style={styles.headerCircleBtn}
                        onPress={() => handleCall(lead)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Phone size={13.5} color="#16A34A" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.headerCircleBtn, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}
                        onPress={() => handleChat(lead)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <MessageCircle size={14} color="#2563EB" />
                      </TouchableOpacity>

                      <StatusBadge status={lead.status} />

                      <TouchableOpacity
                        style={styles.moreOptionsBtn}
                        onPress={() => handleMoreOptions(lead)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MoreVertical size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Body Text: Lead Message Quote / Enquiry Paragraph */}
                  <Text style={styles.leadMessageText} numberOfLines={3}>
                    {lead.message || "No message provided."}
                  </Text>

                  {/* Visit Scheduled Alert Chip (Preserving visit details) */}
                  {isVisitScheduled && lead.visitData && (
                    <View style={styles.visitChipRow}>
                      <Calendar size={13} color="#D97706" style={{ marginRight: 5 }} />
                      <Text style={styles.visitChipText}>
                        Visit Booked: {lead.visitData.date}, {lead.visitData.time}
                      </Text>
                    </View>
                  )}

                  {/* Dedicated "Schedule a Visit" Button matching user's design */}
                  <TouchableOpacity
                    style={styles.scheduleVisitBtn}
                    onPress={() => setSelectedLeadForVisit(lead)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.scheduleVisitBtnText}>
                      {lead.status === "visit_scheduled" ? "Reschedule Visit" : "Schedule a Visit"}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Site Visit Modal */}
      {selectedLeadForVisit && (
        <OwnerSiteVisitModal
          visible={!!selectedLeadForVisit}
          lead={selectedLeadForVisit}
          onClose={() => setSelectedLeadForVisit(null)}
          onVisitScheduled={(leadId, visitDetails) => {
            // Visit scheduling persistence is on hold (no backend support):
            // device-local flip only, documented in the P4 report.
            scheduleVisit(leadId, visitDetails);
            patchServerLead(leadId, { status: "visit_scheduled", visitData: visitDetails });
            setSelectedLeadForVisit(null);
          }}
        />
      )}

      {/* Close Lead Modal */}
      {selectedLeadForClose && (
        <OwnerCloseLeadModal
          visible={!!selectedLeadForClose}
          lead={selectedLeadForClose}
          onClose={() => setSelectedLeadForClose(null)}
          onLeadClosed={(leadId, reason) => {
            // P4 rule: close only the lead — never the listing.
            closeLead(leadId, reason, false, null);
            persistLeadStatus(leadId, "closed", reason);
            setSelectedLeadForClose(null);
          }}
        />
      )}

      {/* Property Details Preview Modal (Opened via Explore More) */}
      {property && (
        <OwnerPropertyDetailModal
          visible={showPropertyModal}
          property={property}
          onClose={() => setShowPropertyModal(false)}
          onEdit={() => {
            setShowPropertyModal(false);
            navigation.navigate("Add", { editingProperty: property });
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

  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.pageBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textDark,
    letterSpacing: -0.4,
  },
  headerCount: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  searchToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.pageBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  searchToggleActive: {
    backgroundColor: COLORS.primaryLight,
  },

  /* ── Search bar ── */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.pageBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: "400",
    outlineStyle: "none",
    outlineWidth: 0,
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
    backgroundColor: "#FFFFFF",
  },

  /* ── Property context strip ── */
  propertyStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: COLORS.pageBackground,
    borderRadius: 14,
    padding: 10,
  },
  propertyThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    letterSpacing: -0.1,
  },
  propertyMeta: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* ── STATUS TABS (BUYER SEARCH FILTER DESIGN) ── */
  tabsContainer: {
    marginHorizontal: -20,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  tabsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterIconPill: {
    width: 36,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterIconPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  filterDropdownPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  filterDropdownPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  filterDropdownText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  filterDropdownTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  tabCountBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  tabCountBadgeActive: {
    backgroundColor: "#DBEAFE",
  },
  tabCountText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    includeFontPadding: false,
  },
  tabCountTextActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },

  /* ── LEADS LIST (OLD CARD DESIGN) ── */
  leadsList: {
    gap: 12,
  },
  leadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 4,
  },
  leadHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leadAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "#E2E8F0",
  },
  leadInfoCol: {
    flex: 1,
    justifyContent: "center",
  },
  leadCustomerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  ratingStarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  moreOptionsBtn: {
    padding: 4,
    borderRadius: 8,
  },
  leadMessageText: {
    fontSize: 14.5,
    color: "#334155",
    lineHeight: 21,
    marginTop: 12,
    fontWeight: "400",
  },
  visitChipRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  visitChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
  },
  scheduleVisitBtn: {
    backgroundColor: "#E2E8F0",
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  scheduleVisitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
});
