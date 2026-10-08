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
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Users,
  Phone,
  MessageSquare,
  Calendar,
  ChevronRight,
  ChevronDown,
  Check,
  Building2,
  MapPin,
  Clock,
  ArrowLeft,
  X,
  ExternalLink,
  MessageCircle,
  MoreVertical,
  Zap,
} from "lucide-react-native";

import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
import StatusBadge from "../../components/owner/StatusBadge";
import EmptyState from "../../components/owner/EmptyState";
import OwnerSiteVisitModal from "./OwnerSiteVisitModal";
import OwnerCloseLeadModal from "./OwnerCloseLeadModal";
import AppBrandHeader from "../../components/AppBrandHeader";

const LEAD_FILTERS = [
  "All",
  "New",
  "Contacted",
  "Visit",
  "Negotiating",
  "Closed",
];

export default function OwnerLeadsScreen({ navigation }) {
  const { properties, leads, updateLeadStatus, scheduleVisit, closeLead } = useOwner();

  // Selected property for property-scoped leads
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties[0]?.id || "own-prop-1"
  );
  const [activeFilter, setActiveFilter] = useState("All");
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState(null);
  const [selectedLeadForClose, setSelectedLeadForClose] = useState(null);

  // Active property object
  const selectedProperty = useMemo(() => {
    return (
      properties.find((p) => p.id === selectedPropertyId) ||
      properties[0] ||
      null
    );
  }, [properties, selectedPropertyId]);

  // All leads belonging to the selected property
  const propertyLeads = useMemo(() => {
    if (!selectedProperty) return [];
    return leads.filter(
      (l) =>
        l.propertyId === selectedProperty.id ||
        (l.propertyTitle &&
          selectedProperty.title &&
          l.propertyTitle.toLowerCase().trim() ===
            selectedProperty.title.toLowerCase().trim())
    );
  }, [leads, selectedProperty]);

  // Top Summary counts for the selected property
  const summaryCounts = useMemo(() => {
    const allCount = propertyLeads.length;
    const newCount = propertyLeads.filter((l) => l.status === "new").length;
    const contactedCount = propertyLeads.filter((l) => l.status === "contacted").length;
    const siteVisitsCount = propertyLeads.filter(
      (l) => l.status === "visit_scheduled" || l.status === "visited"
    ).length;

    return {
      all: allCount,
      new: newCount,
      contacted: contactedCount,
      siteVisits: siteVisitsCount,
    };
  }, [propertyLeads]);

  // Filtered leads based on horizontal filter chips
  const filteredLeads = useMemo(() => {
    if (activeFilter === "All") return propertyLeads;
    if (activeFilter === "New") {
      return propertyLeads.filter((l) => l.status === "new");
    }
    if (activeFilter === "Contacted") {
      return propertyLeads.filter((l) => l.status === "contacted");
    }
    if (activeFilter === "Visit") {
      return propertyLeads.filter(
        (l) => l.status === "visit_scheduled" || l.status === "visited"
      );
    }
    if (activeFilter === "Negotiating") {
      return propertyLeads.filter((l) => l.status === "negotiating");
    }
    if (activeFilter === "Closed") {
      return propertyLeads.filter((l) => l.status === "closed");
    }
    return propertyLeads;
  }, [propertyLeads, activeFilter]);

  // Actions
  const handleCall = (lead) => {
    Alert.alert("Calling Buyer", `Dialing ${lead.customerName} (${lead.phone})...`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => {
          if (lead.status === "new") {
            updateLeadStatus(lead.id, "contacted");
          }
        },
      },
    ]);
  };

  const handleMessage = (lead) => {
    Alert.alert(
      "WhatsApp & Message",
      `Open chat conversation with ${lead.customerName} (${lead.phone}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Chat",
          onPress: () => {
            if (lead.status === "new") {
              updateLeadStatus(lead.id, "contacted");
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (lead) => {
    navigation.navigate("OwnerLeadDetail", { lead });
  };

  const handleMoreOptions = (lead) => {
    Alert.alert(
      lead.customerName,
      `${lead.phone} • ${lead.email || ""}`,
      [
        { text: "Call Buyer", onPress: () => handleCall(lead) },
        { text: "Message on WhatsApp", onPress: () => handleMessage(lead) },
        {
          text: "Schedule Site Visit",
          onPress: () => setSelectedLeadForVisit(lead),
        },
        {
          text: "Close Lead",
          onPress: () => setSelectedLeadForClose(lead),
          style: "destructive",
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleSwitchToBuyer = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
  };

  const formattedPrice = selectedProperty
    ? selectedProperty.priceFormatted ||
      (selectedProperty.price
        ? `₹${selectedProperty.price.toLocaleString("en-IN")}${selectedProperty.priceUnit || ""}`
        : "₹25,000 / month")
    : "₹25,000 / month";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ================= TOP BRAND HEADER (Matching Buyer Page) ================= */}
      <AppBrandHeader currentRole="owner" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Title */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A", letterSpacing: -0.4 }}>
            Buyer Leads
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            Manage enquiries received for your properties
          </Text>
        </View>
        {/* ================= 1ST SECTION: SEGMENTED PILL BAR ================= */}
        <View style={styles.pillContainer}>
          <TouchableOpacity
            style={[
              styles.pillItem,
              activeFilter === "All" && styles.pillItemActive,
            ]}
            onPress={() => setActiveFilter("All")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.pillLabel,
                activeFilter === "All" && styles.pillLabelActive,
              ]}
              numberOfLines={1}
            >
              Total
            </Text>
            <Text
              style={[
                styles.pillCount,
                activeFilter === "All" && styles.pillCountActive,
              ]}
            >
              {summaryCounts.all}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillItem,
              activeFilter === "New" && styles.pillItemActive,
            ]}
            onPress={() => setActiveFilter("New")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.pillLabel,
                activeFilter === "New" && styles.pillLabelActive,
              ]}
              numberOfLines={1}
            >
              New
            </Text>
            <Text
              style={[
                styles.pillCount,
                activeFilter === "New" && styles.pillCountActive,
              ]}
            >
              {summaryCounts.new}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillItem,
              activeFilter === "Contacted" && styles.pillItemActive,
            ]}
            onPress={() => setActiveFilter("Contacted")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.pillLabel,
                activeFilter === "Contacted" && styles.pillLabelActive,
              ]}
              numberOfLines={1}
            >
              Contacted
            </Text>
            <Text
              style={[
                styles.pillCount,
                activeFilter === "Contacted" && styles.pillCountActive,
              ]}
            >
              {summaryCounts.contacted}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillItem,
              activeFilter === "Visit" && styles.pillItemActive,
            ]}
            onPress={() => setActiveFilter("Visit")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.pillLabel,
                activeFilter === "Visit" && styles.pillLabelActive,
              ]}
              numberOfLines={1}
            >
              Visits
            </Text>
            <Text
              style={[
                styles.pillCount,
                activeFilter === "Visit" && styles.pillCountActive,
              ]}
            >
              {summaryCounts.siteVisits}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= PROPERTY SELECTOR ================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>SELECTED PROPERTY</Text>
          <TouchableOpacity
            onPress={() => setShowPropertyPicker(true)}
            activeOpacity={0.7}
            style={styles.switchPropertyLink}
          >
            <Text style={styles.switchPropertyLinkText}>Switch Property</Text>
            <ChevronDown size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {selectedProperty ? (
          <TouchableOpacity
            style={styles.propertyCard}
            onPress={() => setShowPropertyPicker(true)}
            activeOpacity={0.85}
          >
            <Image
              source={{
                uri:
                  selectedProperty.coverPhoto ||
                  selectedProperty.images?.[0] ||
                  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80",
              }}
              style={styles.propertyThumb}
            />

            <View style={styles.propertyDetailsCol}>
              <View style={styles.propertyTitleRow}>
                <Text style={styles.propertyTitle} numberOfLines={1}>
                  {selectedProperty.title}
                </Text>
                <View style={styles.statusBadgeGreen}>
                  <Text style={styles.statusBadgeGreenText}>
                    {(selectedProperty.status || "Active").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.propertyLocRow}>
                <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.propertyLocText} numberOfLines={1}>
                  {selectedProperty.locality || "Anna Nagar"}, {selectedProperty.city || "Chennai"}
                </Text>
              </View>

              <View style={styles.propertyPriceRow}>
                <Text style={styles.propertyPriceText}>{formattedPrice}</Text>
                <View style={styles.propertyLeadsBadge}>
                  <Users size={11} color="#2563EB" style={{ marginRight: 4 }} />
                  <Text style={styles.propertyLeadsBadgeText}>
                    {propertyLeads.length} Leads
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* ================= LEAD FILTERS (HORIZONTAL CHIPS) ================= */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {LEAD_FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              let filterCount = 0;
              if (filter === "All") filterCount = propertyLeads.length;
              else if (filter === "New") filterCount = summaryCounts.new;
              else if (filter === "Contacted") filterCount = summaryCounts.contacted;
              else if (filter === "Visit") filterCount = summaryCounts.siteVisits;
              else if (filter === "Negotiating") {
                filterCount = propertyLeads.filter((l) => l.status === "negotiating").length;
              } else if (filter === "Closed") {
                filterCount = propertyLeads.filter((l) => l.status === "closed").length;
              }

              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                  <View
                    style={[
                      styles.filterCountBadge,
                      isActive && styles.filterCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        isActive && styles.filterCountTextActive,
                      ]}
                    >
                      {filterCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ================= LEAD CARDS LIST ================= */}
        {filteredLeads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No buyer leads yet"
            description="Buyer enquiries for your properties will appear here."
            buttonTitle={activeFilter !== "All" ? "View All Leads" : undefined}
            onButtonPress={activeFilter !== "All" ? () => setActiveFilter("All") : undefined}
          />
        ) : (
          <View style={styles.leadsList}>
            {filteredLeads.map((lead) => {
              const subMetaText =
                lead.subMeta ||
                (lead.status === "new"
                  ? `New Enquiry • ${lead.budget || lead.propertyPrice || "₹20K – ₹30K"}`
                  : `Verified Customer • ${lead.budget || lead.propertyPrice || "₹24,500/month"}`);

              return (
                <View key={lead.id} style={styles.leadCard}>
                  {/* Card Header: Avatar + (Name & Badge + 3-dots) + SubMeta */}
                  <View style={styles.leadHeaderRow}>
                    {lead.avatar ? (
                      <Image source={{ uri: lead.avatar }} style={styles.leadAvatar} />
                    ) : (
                      <View style={styles.leadAvatarFallback}>
                        <Text style={styles.avatarInitial}>
                          {lead.customerName?.charAt(0) || "B"}
                        </Text>
                      </View>
                    )}

                    <View style={styles.leadInfoCol}>
                      <View style={styles.leadTopLine}>
                        <View style={styles.leadNameAndBadge}>
                          <Text style={styles.leadCustomerName} numberOfLines={1}>
                            {lead.customerName}
                          </Text>
                          <StatusBadge
                            status={lead.status}
                            style={styles.leadStatusBadge}
                            textStyle={styles.leadStatusBadgeText}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.moreOptionsBtn}
                          onPress={() => handleMoreOptions(lead)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          activeOpacity={0.7}
                        >
                          <MoreVertical size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.leadSubMeta} numberOfLines={1}>
                        {subMetaText}
                      </Text>
                    </View>
                  </View>

                  {/* Lead Message Paragraph */}
                  {lead.message ? (
                    <Text style={styles.leadMessageText} numberOfLines={3}>
                      {lead.message}
                    </Text>
                  ) : null}

                  {/* Visit Alert Tag (if scheduled) */}
                  {lead.visitData ? (
                    <View style={styles.visitAlertTag}>
                      <Calendar size={12} color="#D97706" style={{ marginRight: 5 }} />
                      <Text style={styles.visitAlertText}>
                        Visit: {lead.visitData.date}, {lead.visitData.time}
                      </Text>
                    </View>
                  ) : null}

                  {/* Card Actions Footer: Call (icon only), Message (icon only), and View Details (solid fill) */}
                  <View style={styles.cardActionsRow}>
                    <View style={styles.leftActionsGroup}>
                      <TouchableOpacity
                        style={styles.callIconBtn}
                        onPress={() => handleCall(lead)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Phone size={17} color="#16A34A" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.messageIconBtn}
                        onPress={() => handleMessage(lead)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MessageCircle size={18} color="#2563EB" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.viewDetailsFillBtn}
                      onPress={() => handleViewDetails(lead)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewDetailsFillText}>View Details</Text>
                      <ChevronRight
                        size={15}
                        color="#FFFFFF"
                        strokeWidth={2.4}
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ================= PROPERTY PICKER MODAL ================= */}
      <Modal
        visible={showPropertyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPropertyPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowPropertyPicker(false)}
        >
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Switch Property</Text>
                <Text style={styles.sheetSubtitle}>
                  View buyer enquiries for a specific listed property
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPropertyPicker(false)}
                activeOpacity={0.7}
                style={styles.sheetCloseBtn}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pickerList}
              showsVerticalScrollIndicator={false}
            >
              {properties.map((prop) => {
                const isSelected = prop.id === selectedPropertyId;
                const propLeadsCount = leads.filter(
                  (l) =>
                    l.propertyId === prop.id ||
                    (l.propertyTitle &&
                      prop.title &&
                      l.propertyTitle.toLowerCase().trim() ===
                        prop.title.toLowerCase().trim())
                ).length;

                return (
                  <TouchableOpacity
                    key={prop.id}
                    style={[
                      styles.pickerItem,
                      isSelected && styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setSelectedPropertyId(prop.id);
                      setActiveFilter("All");
                      setShowPropertyPicker(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          prop.coverPhoto ||
                          prop.images?.[0] ||
                          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80",
                      }}
                      style={styles.pickerThumb}
                    />

                    <View style={styles.pickerInfo}>
                      <Text
                        style={[
                          styles.pickerTitle,
                          isSelected && styles.pickerTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {prop.title}
                      </Text>
                      <Text style={styles.pickerLoc} numberOfLines={1}>
                        {prop.locality || "Anna Nagar"}, {prop.city || "Chennai"}
                      </Text>
                      <View style={styles.pickerBottomRow}>
                        <Text style={styles.pickerPrice}>
                          {prop.priceFormatted || `₹${prop.price?.toLocaleString("en-IN") || "25,000"}${prop.priceUnit || ""}`}
                        </Text>
                        <View style={styles.pickerBadge}>
                          <Text style={styles.pickerBadgeText}>
                            {propLeadsCount} Leads
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.pickerRadio,
                        isSelected && styles.pickerRadioActive,
                      ]}
                    >
                      {isSelected ? (
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Site Visit Modal */}
      {selectedLeadForVisit && (
        <OwnerSiteVisitModal
          visible={Boolean(selectedLeadForVisit)}
          lead={selectedLeadForVisit}
          onClose={() => setSelectedLeadForVisit(null)}
          onVisitScheduled={(leadId, visitData) => {
            scheduleVisit(leadId, visitData);
            setSelectedLeadForVisit(null);
          }}
        />
      )}

      {/* Close Lead Modal */}
      {selectedLeadForClose && (
        <OwnerCloseLeadModal
          visible={Boolean(selectedLeadForClose)}
          lead={selectedLeadForClose}
          onClose={() => setSelectedLeadForClose(null)}
          onCloseLeadWithOutcome={(leadId, outcome, closeProp, propId) => {
            closeLead(leadId, outcome, closeProp, propId);
            setSelectedLeadForClose(null);
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
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
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
    borderBottomColor: "#EEF2F6",
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "400",
  },
  switchModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 10,
  },
  switchModeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* 1ST SECTION: SEGMENTED PILL BAR */
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderRadius: 20,
  },
  pillItemActive: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
    textAlign: "center",
  },
  pillLabelActive: {
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "700",
  },
  pillCount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  pillCountActive: {
    color: "#FFFFFF",
  },

  /* SECTION HEADER */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  switchPropertyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  switchPropertyLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* PROPERTY CARD */
  propertyCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 18,
  },
  propertyThumb: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  propertyDetailsCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  propertyTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 6,
  },
  statusBadgeGreen: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  statusBadgeGreenText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: 0.4,
  },
  propertyLocRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  propertyLocText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "400",
    flex: 1,
  },
  propertyPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  propertyPriceText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  propertyLeadsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  propertyLeadsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* LEAD FILTERS (HORIZONTAL CHIPS) */
  filtersWrapper: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
    marginRight: 6,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  filterCountBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  filterCountTextActive: {
    color: "#FFFFFF",
  },

  /* LEADS LIST & CARDS */
  leadsList: {
    gap: 16,
  },
  leadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  leadHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
  },
  leadAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  leadInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  leadTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leadNameAndBadge: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
    gap: 8,
  },
  leadCustomerName: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  leadStatusBadge: {
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  leadStatusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  moreOptionsBtn: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  leadSubMeta: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 3,
  },
  leadMessageText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
    marginTop: 14,
  },
  visitAlertTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignSelf: "flex-start",
  },
  visitAlertText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#B45309",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  leftActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  callIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  messageIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetailsFillBtn: {
    flex: 1,
    marginLeft: 10,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  viewDetailsFillText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },

  /* PROPERTY PICKER MODAL */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  pickerItemActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  pickerThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  pickerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  pickerTitleActive: {
    color: "#2563EB",
  },
  pickerLoc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  pickerBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  pickerPrice: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  pickerBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pickerBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  pickerRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  pickerRadioActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
});
