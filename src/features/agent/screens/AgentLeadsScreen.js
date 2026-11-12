import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  Linking,
  Alert,
  Modal,
} from "react-native";
import { ScrollView } from "../../../shared/components/KeyboardSafe.js";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  Users,
  Phone,
  MessageSquare,
  Calendar,
  ChevronRight,
  MapPin,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  Building2,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useAgent } from "../context/AgentContext.js";
import StatusBadge from "../../owner/components/StatusBadge.js";

const FILTER_TABS = [
  "All",
  "New",
  "Contacted",
  "Visit Scheduled",
  "Negotiating",
  "Closed",
];

export default function AgentLeadsScreen({ navigation }) {
  const { leads, updateLeadStatus, localityProperties, matchPropertyToLead } = useAgent();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [matchingLead, setMatchingLead] = useState(null);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const all = leads.length;
    const newCount = leads.filter((l) => l.status === "new").length;
    const followUps = leads.filter(
      (l) => l.status === "contacted" || l.status === "negotiating" || l.status === "qualified"
    ).length;
    const visits = leads.filter(
      (l) => l.status === "visit_scheduled" || l.status === "visited"
    ).length;

    return { all, newCount, followUps, visits };
  }, [leads]);

  // Tab mapping for status filter
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Tab filter
      if (activeTab === "New" && lead.status !== "new") return false;
      if (activeTab === "Contacted" && lead.status !== "contacted" && lead.status !== "qualified")
        return false;
      if (
        activeTab === "Visit Scheduled" &&
        lead.status !== "visit_scheduled" &&
        lead.status !== "visited"
      )
        return false;
      if (activeTab === "Negotiating" && lead.status !== "negotiating") return false;
      if (
        activeTab === "Closed" &&
        lead.status !== "converted" &&
        lead.status !== "closed" &&
        lead.status !== "lost"
      )
        return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = lead.customerName.toLowerCase().includes(q);
        const reqMatch = (lead.requirement || "").toLowerCase().includes(q);
        const locMatch = (lead.preferredLocality || "").toLowerCase().includes(q);
        if (!nameMatch && !reqMatch && !locMatch) return false;
      }

      return true;
    });
  }, [leads, activeTab, searchQuery]);

  const handleLeadPress = (lead) => {
    navigation.navigate("AgentLeadDetail", { lead });
  };

  const handleCall = (lead) => {
    const cleanPhone = String(lead.phone || "").replace(/[^0-9+]/g, "");
    if (!cleanPhone) {
      Alert.alert("Contact Number Unavailable", "No phone number is available for this lead.");
      return;
    }
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Unavailable", "Could not place this call.");
    });
  };

  const handleMessage = (lead) => {
    const cleanPhone = String(lead.phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      Alert.alert("Contact Number Unavailable", "No phone number is available for this lead.");
      return;
    }
    const text = encodeURIComponent(
      `Hello ${lead.customerName}! I am your RESTAMP Certified Agent regarding your requirement for ${lead.requirement} in ${lead.preferredLocality}. I have matching verified owner listings ready.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
      Alert.alert("WhatsApp Unavailable", "Could not launch WhatsApp.");
    });
  };

  const handleOpenMatchSheet = (lead) => {
    setMatchingLead(lead);
  };

  const handleConfirmMatch = (property) => {
    if (!matchingLead) return;
    matchPropertyToLead(matchingLead.id, property);
    const leadName = matchingLead.customerName;
    setMatchingLead(null);
    Alert.alert(
      "Property Matched! 🎉",
      `"${property.title}" has been matched to ${leadName}. You can now schedule a site visit.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER */}

      {/* SCREEN TITLE & SUBTITLE */}
      <View style={styles.screenHeader}>
        <Text style={styles.headerTitle}>Leads</Text>
        <Text style={styles.headerSubtitle}>Manage your customer enquiries</Text>
      </View>

      {/* SUMMARY: one card, four stats */}
      <View style={styles.summaryCard}>
        {[
          { label: "All Leads", value: summaryCounts.all, color: "#0F172A" },
          { label: "New", value: summaryCounts.newCount, color: COLORS.primary },
          { label: "Follow-ups", value: summaryCounts.followUps, color: "#0F172A" },
          { label: "Visits", value: summaryCounts.visits, color: "#EA580C" },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 ? <View style={styles.summaryDivider} /> : null}
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* SEARCH AND FILTER TABS */}
      <View style={styles.filterSection}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, locality, or requirement..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs: All, New, Contacted, Visit Scheduled, Negotiating, Closed */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* LEADS LIST (REUSING OWNER LEADS CARD STYLING) */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredLeads.length === 0 ? (
          <View style={styles.emptyWrap}>
            {/* Fanned lead-cards illustration */}
            <View style={styles.emptyArt}>
              {["left", "right"].map((side) => (
                <View
                  key={side}
                  style={[styles.emptySheet, side === "left" ? styles.emptySheetLeft : styles.emptySheetRight]}
                >
                  <View style={styles.leadArtAvatarSm} />
                  <View style={styles.emptySheetLine} />
                  <View style={[styles.emptySheetLine, { width: "55%" }]} />
                </View>
              ))}
              <View style={[styles.emptySheet, styles.emptySheetCenter]}>
                {/* Lead header: avatar + name + status */}
                <View style={styles.leadArtHeader}>
                  <View style={styles.leadArtAvatar}>
                    <Users size={14} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={[styles.leadArtLine, { width: "90%", backgroundColor: "#CBD5E1" }]} />
                    <View style={[styles.leadArtLine, { width: "60%" }]} />
                  </View>
                </View>
                <View style={styles.leadArtChip}>
                  <Text style={styles.leadArtChipText}>New</Text>
                </View>
                {/* Requirement rows */}
                <View style={[styles.leadArtLine, { width: "100%" }]} />
                <View style={[styles.leadArtLine, { width: "75%" }]} />
                {/* Actions: call + message */}
                <View style={styles.leadArtActions}>
                  <View style={[styles.leadArtBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                    <Phone size={11} color="#FFFFFF" />
                  </View>
                  <View style={styles.leadArtBtn}>
                    <MessageSquare size={11} color={COLORS.primary} />
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.emptyTitle}>No new leads yet.</Text>
            <Text style={styles.emptyText}>
              Leads from interested buyers in your localities will appear here.
            </Text>
            {activeTab !== "All" ? (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setActiveTab("All")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>View All Leads</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.leadsList}>
            {filteredLeads.map((lead) => {
              const purpose = lead.dealType || "Rent";
              const received = lead.timestamp || "Today, 10:30 AM";

              return (
                <View key={lead.id} style={styles.leadCard}>
                  {/* Card Header: Avatar, Name & StatusBadge */}
                  <View style={styles.cardHeaderRow}>
                    <Image source={{ uri: lead.avatar }} style={styles.avatar} />

                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName} numberOfLines={1}>
                        {lead.customerName}
                      </Text>
                      <Text style={styles.receivedTime}>{received}</Text>
                    </View>

                    <StatusBadge status={lead.status} />
                  </View>

                  {/* Card Body: Requirement, Purpose, Preferred Location, Budget */}
                  <View style={styles.cardDetailsBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Requirement:</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {lead.requirement || "Looking for 2 BHK"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Purpose:</Text>
                      <Text style={styles.detailValue}>{purpose}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Preferred Location:</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {lead.preferredLocality}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Budget:</Text>
                      <Text style={[styles.detailValue, styles.budgetValue]}>
                        {lead.budget}
                      </Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.cardDivider} />

                  {/* Actions: Call, Message, Match Property, View Details */}
                  <View style={styles.cardActionsRow}>
                    <View style={styles.leftIconActions}>
                      <TouchableOpacity
                        style={styles.iconCircleBtn}
                        onPress={() => handleCall(lead)}
                        activeOpacity={0.75}
                      >
                        <Phone size={16} color="#0F172A" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconCircleBtn, { backgroundColor: "#F0FDF4" }]}
                        onPress={() => handleMessage(lead)}
                        activeOpacity={0.75}
                      >
                        <MessageSquare size={16} color="#16A34A" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.btnMatchProperty}
                      onPress={() => handleOpenMatchSheet(lead)}
                      activeOpacity={0.8}
                    >
                      <Users size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.btnMatchPropertyText}>Match Property</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnViewDetails}
                      onPress={() => handleLeadPress(lead)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnViewDetailsText}>View Details</Text>
                      <ChevronRight size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MATCH PROPERTY MODAL */}
      <Modal
        visible={!!matchingLead}
        transparent
        animationType="slide"
        onRequestClose={() => setMatchingLead(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.matchSheetContainer}>
            <View style={styles.matchSheetHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.matchSheetTitle}>Match Property with Lead</Text>
                <Text style={styles.matchSheetSubtitle} numberOfLines={1}>
                  {matchingLead?.customerName} • Seeking: {matchingLead?.requirement} ({matchingLead?.preferredLocality})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeSheetBtn}
                onPress={() => setMatchingLead(null)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.matchSheetPrompt}>
              Select from available owner-posted properties in your subscribed locations:
            </Text>

            <ScrollView style={styles.matchSheetScroll} showsVerticalScrollIndicator={false}>
              {localityProperties
                .filter((p) => {
                  if (!matchingLead) return true;
                  const loc = (p.location || "").toLowerCase();
                  const target = (matchingLead.preferredLocality || "").toLowerCase();
                  return loc.includes(target) || target.includes(loc);
                })
                .concat(localityProperties.slice(0, 4))
                .filter((p, i, self) => self.findIndex((t) => t.id === p.id) === i)
                .map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    style={styles.matchPropItem}
                    onPress={() => handleConfirmMatch(property)}
                    activeOpacity={0.82}
                  >
                    <Image source={{ uri: property.image }} style={styles.matchPropThumb} />
                    <View style={styles.matchPropInfo}>
                      <Text style={styles.matchPropTitle} numberOfLines={1}>
                        {property.title}
                      </Text>
                      <Text style={styles.matchPropLoc} numberOfLines={1}>
                        {property.location}
                      </Text>
                      <Text style={styles.matchPropPrice}>{property.price}</Text>
                    </View>
                    <View style={styles.matchAssignPill}>
                      <Text style={styles.matchAssignPillText}>Select</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  tabsScroll: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tabChip: {
    paddingHorizontal: 16,
    height: 36,
    justifyContent: "center",
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 8,
  },
  emptyArt: {
    width: 200,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  emptySheet: {
    position: "absolute",
    width: 96,
    height: 124,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingTop: 16,
    gap: 8,
  },
  emptySheetLeft: {
    transform: [{ translateX: -44 }, { rotate: "-10deg" }],
  },
  emptySheetRight: {
    transform: [{ translateX: 44 }, { rotate: "10deg" }],
  },
  emptySheetCenter: {
    width: 112,
    height: 140,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  leadArtAvatarSm: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    marginBottom: 2,
  },
  leadArtHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leadArtAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  leadArtLine: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  leadArtChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: "#EFF6FF",
  },
  leadArtChipText: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.primary,
  },
  leadArtActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: "auto",
    marginBottom: 12,
  },
  leadArtBtn: {
    flex: 1,
    height: 20,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySheetLine: {
    height: 6,
    width: "80%",
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 300,
  },
  emptyBtn: {
    alignSelf: "stretch",
    height: 52,
    marginTop: 28,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  leadsList: {
    gap: 14,
  },
  leadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },
  customerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  receivedTime: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  cardDetailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1E293B",
  },
  budgetValue: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leftIconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  btnMatchProperty: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  btnMatchPropertyText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  btnViewDetails: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  btnViewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  matchSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  matchSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  matchSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  matchSheetSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  closeSheetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  matchSheetPrompt: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 12,
  },
  matchSheetScroll: {
    maxHeight: 340,
  },
  matchPropItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 10,
  },
  matchPropThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },
  matchPropInfo: {
    flex: 1,
    justifyContent: "center",
  },
  matchPropTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  matchPropLoc: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  matchPropPrice: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 2,
  },
  matchAssignPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  matchAssignPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
