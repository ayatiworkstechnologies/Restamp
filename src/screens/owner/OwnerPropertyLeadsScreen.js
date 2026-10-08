import React, { useState, useMemo } from "react";
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
} from "lucide-react-native";

import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
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

  // Filter leads specifically for this property
  const projectLeads = useMemo(() => {
    if (!property) return leads;

    const matched = leads.filter(
      (l) =>
        l.propertyId === property.id ||
        (l.propertyTitle &&
          property.title &&
          l.propertyTitle.toLowerCase() === property.title.toLowerCase())
    );

    // If matching leads exist, use them
    if (matched.length > 0) return matched;

    // Fallback contextual mock leads for this specific property
    const formattedPrice =
      property.priceFormatted ||
      (property.price
        ? `₹${property.price.toLocaleString("en-IN")}${property.priceUnit || ""}`
        : "₹25,000 / month");

    return [
      {
        id: `gen-lead-${property.id}-1`,
        customerName: "Arun Kumar",
        phone: "+91 98840 12345",
        email: "arun.kumar@gmail.com",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocality: `${property.locality || "Anna Nagar"}, Chennai`,
        propertyPrice: formattedPrice,
        propertyImage: property.coverPhoto || property.images?.[0],
        requirement: property.purpose || "Rent",
        budget: formattedPrice,
        status: "new",
        timestamp: "Today • 10:35 AM",
        preferredVisitDate: "Tomorrow, 11:00 AM",
        message: `Hi, I am looking for a 2 BHK apartment for my family. Move-in needed within 10 days. Is covered 4-wheeler parking included in the rent?`,
        visitData: null,
      },
      {
        id: `gen-lead-${property.id}-2`,
        customerName: "Deepak Verma",
        phone: "+91 97910 88231",
        email: "deepak.v@techcorp.in",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocality: `${property.locality || "Anna Nagar"}, Chennai`,
        propertyPrice: formattedPrice,
        propertyImage: property.coverPhoto || property.images?.[0],
        requirement: property.purpose || "Rent",
        budget: formattedPrice,
        status: "negotiating",
        timestamp: "Yesterday • 4:15 PM",
        preferredVisitDate: "Saturday, 4:00 PM",
        message: `Had a great site visit. We agree to ₹24,500/month. Ready to sign agreement with 10 months security deposit.`,
        visitData: {
          date: "Saturday, 28 Sep",
          time: "4:00 PM",
          note: "Family visit confirmed. Wants to check parking and kitchen layout.",
        },
      },
      {
        id: `gen-lead-${property.id}-3`,
        customerName: "Priya Sundaram",
        phone: "+91 94441 55678",
        email: "priya.s@enterprise.in",
        avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocality: `${property.locality || "Anna Nagar"}, Chennai`,
        propertyPrice: formattedPrice,
        propertyImage: property.coverPhoto || property.images?.[0],
        requirement: property.purpose || "Rent",
        budget: formattedPrice,
        status: "visit_scheduled",
        timestamp: "2 days ago",
        preferredVisitDate: "Sunday, 11:30 AM",
        message: "Photos look fantastic! Looking forward to viewing the property this weekend with my family.",
        visitData: {
          date: "Sunday, 29 Sep",
          time: "11:30 AM",
          note: "Wants to check natural light and ventilation.",
        },
      },
    ];
  }, [leads, property]);

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
    Alert.alert("Calling Customer", `Dialing ${lead.customerName} at ${lead.phone || "+91 98840 12345"}...`, [
      { text: "Cancel", style: "cancel" },
      { text: "Call", onPress: () => {} },
    ]);
  };

  const handleChat = (lead) => {
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

  const formattedPrice = property
    ? property.priceFormatted ||
      (property.price
        ? `₹${property.price.toLocaleString("en-IN")}${property.priceUnit || ""}`
        : "Price On Request")
    : "";

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

        {/* ── 2nd Section: LEADS LIST (Old Card Design) ── */}
        {filteredLeads.length === 0 ? (
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
              const isNew = lead.status === "new";
              const isVisitScheduled = lead.status === "visit_scheduled";

              return (
                <TouchableOpacity
                  key={lead.id}
                  style={styles.leadCard}
                  activeOpacity={0.92}
                  onPress={() => navigation.navigate("OwnerLeadDetail", { lead })}
                >
                  {/* Top Header: Avatar, Author/Name, Role & Timestamp, Menu */}
                  <View style={styles.leadHeaderRow}>
                    <Image
                      source={{
                        uri:
                          lead.avatar ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
                      }}
                      style={styles.leadAvatar}
                    />

                    <View style={styles.leadInfoCol}>
                      <Text style={styles.leadCustomerName} numberOfLines={1}>
                        {lead.customerName}
                      </Text>
                      <Text style={styles.leadSubMeta} numberOfLines={1}>
                        {isNew ? "New Enquiry" : "Verified Customer"} • {lead.budget || formattedPrice} • {lead.timestamp || "Today"}
                      </Text>
                    </View>

                    <View style={styles.headerRightActions}>
                      <StatusBadge status={lead.status} />
                      <TouchableOpacity
                        style={styles.moreOptionsBtn}
                        onPress={() => handleMoreOptions(lead)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MoreVertical size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Body Text: Lead Message Quote / Enquiry Paragraph */}
                  <Text style={styles.leadMessageText} numberOfLines={3}>
                    {lead.message ||
                      `Hi, I am interested in your property. Looking for quick move-in. Please share full details.`}
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

                  {/* Bottom Action: View Details Button */}
                  <View style={styles.leadFooterRow}>
                    <TouchableOpacity
                      style={styles.viewDetailFullBtn}
                      onPress={() => navigation.navigate("OwnerLeadDetail", { lead })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewDetailFullBtnText}>View Details</Text>
                      <ChevronRight size={15} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
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
            scheduleVisit(leadId, visitDetails);
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
            closeLead(leadId, reason);
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
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  leadSubMeta: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "400",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moreOptionsBtn: {
    padding: 4,
    borderRadius: 8,
  },
  leadMessageText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
    marginTop: 13,
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
  leadFooterRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  viewDetailFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 6,
  },
  viewDetailFullBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
