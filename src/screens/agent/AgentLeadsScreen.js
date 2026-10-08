import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  Linking,
  Alert,
  Modal,
} from "react-native";
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
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useAgent } from "../../context/AgentContext";
import AppBrandHeader from "../../components/AppBrandHeader";
import StatusBadge from "../../components/owner/StatusBadge";
import EmptyState from "../../components/owner/EmptyState";

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
    const rawPhone = lead.phone || "+919876543210";
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Lead", `${lead.customerName}: ${rawPhone}`);
    });
  };

  const handleMessage = (lead) => {
    const rawPhone = lead.phone || "+919876543210";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Hello ${lead.customerName}! I am your RESTAMP Certified Agent regarding your requirement for ${lead.requirement} in ${lead.preferredLocality}. I have matching verified owner listings ready.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
      Alert.alert("Message Lead", `Contact ${lead.customerName} at ${rawPhone}`);
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER */}
      <AppBrandHeader currentRole="agent" />

      {/* SCREEN TITLE & SUBTITLE */}
      <View style={styles.screenHeader}>
        <Text style={styles.headerTitle}>Leads</Text>
        <Text style={styles.headerSubtitle}>Manage your customer enquiries</Text>
      </View>

      {/* SUMMARY PILLS: All Leads, New, Follow-ups, Visits */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryNumber}>{summaryCounts.all}</Text>
          <Text style={styles.summaryLabel}>All Leads</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>{summaryCounts.newCount}</Text>
          <Text style={styles.summaryLabel}>New</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryNumber}>{summaryCounts.followUps}</Text>
          <Text style={styles.summaryLabel}>Follow-ups</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}>
          <Text style={[styles.summaryNumber, { color: "#EA580C" }]}>{summaryCounts.visits}</Text>
          <Text style={styles.summaryLabel}>Visits</Text>
        </View>
      </View>

      {/* SEARCH AND FILTER TABS */}
      <View style={styles.filterSection}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
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
          <EmptyState
            icon={Users}
            title="No new leads yet."
            description="Leads from interested buyers in your localities will appear here."
            buttonTitle={activeTab !== "All" ? "View All Leads" : undefined}
            onButtonPress={activeTab !== "All" ? () => setActiveTab("All") : undefined}
          />
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
  summaryBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
  },
  tabsScroll: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tabChipTextActive: {
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
  leadsList: {
    gap: 14,
  },
  leadCard: {
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
