import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  ArrowRight,
  Search,
  MessageSquare,
  Phone,
  Eye,
  Building2,
  ShieldCheck,
  Plus,
  Users,
  Sparkles,
  Crown,
  AlertTriangle,
  X,
  CheckCircle2,
  MapPin,
  Check,
  Wallet,
  WifiOff,
} from "lucide-react-native";

import COLORS from "../../constants/colors";
import { useAgent } from "../../context/AgentContext";
import { useNetwork } from "../../context/NetworkContext";
import { SkeletonDashboard } from "../../components/common/Skeleton";
import AppBrandHeader from "../../components/AppBrandHeader";
import StatusBadge from "../../components/owner/StatusBadge";

export default function AgentDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? StatusBar.currentHeight || 28 : 0
  );

  const {
    agentPlan,
    selectedLocalities,
    agentProfile,
    leads,
    visits,
    earningsTransactions = [],
    isPlanExpired,
    localityProperties,
    matchPropertyToLead,
  } = useAgent();

  const { isOffline, isChecking, checkConnection } = useNetwork();

  const [locationsModalVisible, setLocationsModalVisible] = useState(false);
  const [matchingLead, setMatchingLead] = useState(null);

  // Dynamic date matching reference design ("Wednesday, Oct 7")
  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const month = today.toLocaleDateString("en-US", { month: "short" });
  const day = today.getDate();
  const todayFormatted = `${weekday}, ${month} ${day}`;

  // Dynamic greeting based on current local hour ("Good Morning,")
  const currentHour = today.getHours();
  const greetingText =
    currentHour < 12
      ? "Good Morning,"
      : currentHour < 17
      ? "Good Afternoon,"
      : "Good Evening,";

  const rawAgentName = agentProfile?.name || "Vikram Prabhu";
  const agentName = rawAgentName.endsWith(",") ? rawAgentName : `${rawAgentName},`;

  // Calculate summary counts
  const availablePropertiesCount = localityProperties.length || 126;
  const newLeadsCount = leads.filter((l) => l.status === "new").length || leads.length;
  const todaysVisitsCount = visits.filter(
    (v) => v.date === "Today" || v.status === "upcoming"
  ).length || 3;
  const totalEarned = useMemo(() => {
    return (earningsTransactions || []).reduce(
      (acc, curr) => acc + (curr.commissionAmount || 0),
      0
    );
  }, [earningsTransactions]);
  const formattedEarned =
    totalEarned >= 100000
      ? `₹${(totalEarned / 100000).toFixed(1)}L`
      : `₹${(totalEarned / 1000).toFixed(0)}k`;

  // Latest leads
  const recentLeads = leads.slice(0, 3);

  const handleManagePlan = () => {
    navigation.navigate("Menu", { initialTab: "agent" });
  };

  const handleViewAllLocations = () => {
    setLocationsModalVisible(true);
  };

  const handleLeadPress = (lead) => {
    navigation.navigate("AgentLeadDetail", { lead });
  };

  const handleOpenMatchLead = (lead) => {
    setMatchingLead(lead);
  };

  const handleConfirmMatch = (property) => {
    if (!matchingLead) return;
    matchPropertyToLead(matchingLead.id, property);
    const leadName = matchingLead.customerName;
    setMatchingLead(null);
    Alert.alert(
      "Property Matched! 🎉",
      `"${property.title}" has been matched to ${leadName}. You can now schedule a site visit or contact the customer.`
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ================= FIXED BRAND HEADER (Matching Owner Page) ================= */}
      <View style={[styles.headerWrapper, { paddingTop: topInset }]}>
        <AppBrandHeader currentRole="agent" />
      </View>

      {isOffline && (
        <View style={styles.offlineNoticeBanner}>
          <WifiOff size={14} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.offlineNoticeText}>
            Offline Mode • Showing cached dashboard data
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. GREETING & HERO SECTION (Redesigned Section 1: Date / Greeting / Name / Welcome Card) */}
        <View style={styles.greetingSection}>
          <Text style={styles.dateText}>{todayFormatted}</Text>
          <Text style={styles.greetingMainText}>{greetingText}</Text>
          <Text style={styles.greetingSubName}>{agentName}</Text>
        </View>

        {/* EXPIRED PLAN BANNER (IF APPLICABLE) */}
        {isPlanExpired && (
          <View style={styles.expiredBanner}>
            <View style={styles.expiredLeft}>
              <AlertTriangle size={20} color="#DC2626" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiredTitle}>Your Agent Plan has expired.</Text>
                <Text style={styles.expiredSub}>
                  Renew to unlock new property listings and fresh customer enquiries.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.renewBtn}
              onPress={handleManagePlan}
              activeOpacity={0.8}
            >
              <Text style={styles.renewBtnText}>Renew Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. WELCOME BACK HERO BANNER CARD (Section 1 Redesign with Fixed Height) */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeBannerLeft}>
            <Text style={styles.welcomeBannerTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeBannerEmoji}>👋</Text>
            <Text style={styles.welcomeBannerSub}>
              Everything looks good{"\n"}today.
            </Text>
          </View>
          <Image
            source={require("../../../assets/agent-welcome-building.png")}
            style={styles.welcomeBannerImage}
            resizeMode="contain"
          />
        </View>

        {/* 3. 2-COLUMN METRICS GRID: Real Estate Stats (OVERVIEW) */}
        {/* Row 1: Available Properties & New Leads */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Available Properties */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate("Properties")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Building2 size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {String(availablePropertiesCount).padStart(2, "0")}
            </Text>
            <Text style={styles.metricLabel}>Available Properties</Text>
          </TouchableOpacity>

          {/* Card 2: New Leads */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate("Leads")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Users size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {String(newLeadsCount).padStart(2, "0")}
            </Text>
            <Text style={styles.metricLabel}>New Leads</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Visits Today & Closed Deals */}
        <View style={[styles.metricsGrid, { marginTop: 10 }]}>
          {/* Card 3: Visits Today */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate("Visits")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Calendar size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {String(todaysVisitsCount).padStart(2, "0")}
            </Text>
            <Text style={styles.metricLabel}>Visits Today</Text>
          </TouchableOpacity>

          {/* Card 4: Earnings & Commission */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate("AgentEarnings")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Wallet size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {formattedEarned || "₹2.4L"}
            </Text>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Earnings & Comm.
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. COVERED LOCATIONS COMPACT CHIPS SECTION */}
        <View style={styles.locationsSection}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MapPin size={17} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Covered Locations</Text>
              <View style={styles.locBadge}>
                <Text style={styles.locBadgeText}>
                  {selectedLocalities.length}/{agentPlan?.locationLimit || 10}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleViewAllLocations} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.localityChipsWrap}>
            {selectedLocalities.slice(0, 5).map((loc) => (
              <View key={loc} style={styles.localityChip}>
                <Text style={styles.localityChipText}>{loc}</Text>
              </View>
            ))}
            {selectedLocalities.length > 5 && (
              <TouchableOpacity
                style={styles.localityMoreChip}
                onPress={handleViewAllLocations}
                activeOpacity={0.8}
              >
                <Text style={styles.localityMoreChipText}>
                  +{selectedLocalities.length - 5} More
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 5. QUICK ACTION BANNER: Browse Available Properties (Matching Owner Banner style) */}
        <TouchableOpacity
          style={styles.actionBanner}
          onPress={() => navigation.navigate("Properties")}
          activeOpacity={0.88}
        >
          <View style={styles.actionBannerLeft}>
            <View style={styles.actionBannerIconWrap}>
              <Building2 size={18} color={COLORS.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.actionBannerTextWrap}>
              <Text style={styles.actionBannerTitle}>Browse Properties</Text>
              <Text style={styles.actionBannerSub}>
                Owner-listed properties in your covered locations
              </Text>
            </View>
          </View>
          <View style={styles.actionBannerArrowWrap}>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </TouchableOpacity>

        {/* 6. QUICK ACTIONS PILLS ROW */}
        <View style={styles.quickActionPillsRow}>
          <TouchableOpacity
            style={styles.quickActionPillBtn}
            onPress={() => navigation.navigate("Leads")}
            activeOpacity={0.82}
          >
            <Users size={14} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.quickActionPillText}>View New Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPillBtn}
            onPress={() => navigation.navigate("Visits")}
            activeOpacity={0.82}
          >
            <Calendar size={14} color="#EA580C" style={{ marginRight: 6 }} />
            <Text style={styles.quickActionPillText}>Upcoming Visits</Text>
          </TouchableOpacity>
        </View>

        {/* 7. RECENT LEADS (Matching Owner Dashboard Recent Enquiries list design) */}
        <View style={styles.minimalSection}>
          <View style={styles.sectionHeaderWithSub}>
            <View>
              <Text style={styles.sectionTitle}>Recent Leads</Text>
              <Text style={styles.sectionSubtitle}>
                {leads.length} customer enquiries • <Text style={styles.sectionSubtitleAccent}>Active today</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Leads")}
              activeOpacity={0.7}
              style={styles.viewAllRow}
            >
              <Text style={styles.viewAllText}>View all</Text>
              <ArrowRight size={14} color={COLORS.primary} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.enquiriesList}>
            {recentLeads.map((lead, idx) => (
              <View key={lead.id || idx} style={styles.enquiryCard}>
                {/* Round Profile Avatar Image */}
                <TouchableOpacity
                  style={styles.enquiryAvatarWrap}
                  onPress={() => handleLeadPress(lead)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{
                      uri:
                        lead.avatar ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
                    }}
                    style={styles.enquiryAvatar}
                    resizeMode="cover"
                  />
                </TouchableOpacity>

                {/* Middle Info */}
                <TouchableOpacity
                  style={styles.enquiryInfo}
                  onPress={() => handleLeadPress(lead)}
                  activeOpacity={0.8}
                >
                  <View style={styles.enquiryNameRow}>
                    <Text style={styles.enquiryName} numberOfLines={1}>
                      {lead.customerName}
                    </Text>
                    <StatusBadge status={lead.status} />
                  </View>

                  <View style={styles.enquirySubRow}>
                    <View style={styles.enquiryChip}>
                      <Text style={styles.enquiryChipText} numberOfLines={1}>
                        {lead.requirement || "2 BHK Flat"}
                      </Text>
                    </View>
                    <Text style={styles.enquiryDot}>•</Text>
                    <Text style={styles.enquiryLocText} numberOfLines={1}>
                      {lead.preferredLocality}
                    </Text>
                    <Text style={styles.enquiryDot}>•</Text>
                    <Text style={styles.enquiryBudgetText} numberOfLines={1}>
                      {lead.budget}
                    </Text>
                  </View>

                  {/* Action Buttons for Lead */}
                  <View style={styles.enquiryActionsRow}>
                    <TouchableOpacity
                      style={styles.enquiryActionSecondaryBtn}
                      onPress={() => handleLeadPress(lead)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.enquiryActionSecondaryText}>View Lead</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.enquiryActionPrimaryBtn}
                      onPress={() => handleOpenMatchLead(lead)}
                      activeOpacity={0.8}
                    >
                      <Users size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.enquiryActionPrimaryText}>Match Property</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* View All Leads Button */}
          <TouchableOpacity
            style={styles.viewAllFullBtn}
            onPress={() => navigation.navigate("Leads")}
            activeOpacity={0.85}
          >
            <Text style={styles.viewAllFullBtnText}>View All Leads</Text>
            <ArrowRight size={15} color={COLORS.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* 8. AGENT SUBSCRIPTION SUMMARY (Matching Owner minimalListCard) */}
        <View style={styles.minimalSection}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ShieldCheck size={18} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Agent Subscription</Text>
            </View>
            <View style={styles.planStatusPill}>
              <Text style={styles.planStatusText}>Active</Text>
            </View>
          </View>

          <View style={styles.minimalListCard}>
            <View style={styles.planRowItem}>
              <Text style={styles.planKey}>Current Plan</Text>
              <Text style={styles.planVal}>{agentPlan?.name || "Agent Pro Plan"}</Text>
            </View>
            <View style={styles.planRowDivider} />
            <View style={styles.planRowItem}>
              <Text style={styles.planKey}>Coverage Limit</Text>
              <Text style={styles.planVal}>
                {selectedLocalities.length} of {agentPlan?.locationLimit || 10} Locations Used
              </Text>
            </View>
            <View style={styles.planRowDivider} />
            <View style={styles.planRowItem}>
              <Text style={styles.planKey}>Active until</Text>
              <Text style={styles.planVal}>20 Nov 2026</Text>
            </View>

            <TouchableOpacity
              style={styles.managePlanBtn}
              onPress={handleManagePlan}
              activeOpacity={0.8}
            >
              <Text style={styles.managePlanBtnText}>Manage Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* LOCATIONS MODAL DIALOG */}
      <Modal
        visible={locationsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationsModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Your Covered Locations</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedLocalities.length} of {agentPlan?.locationLimit || 10} locations assigned
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setLocationsModalVisible(false)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalLocGrid}>
                {selectedLocalities.map((loc, idx) => (
                  <View key={loc} style={styles.modalLocItem}>
                    <View style={styles.modalLocIndex}>
                      <Text style={styles.modalLocIndexText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.modalLocName}>{loc}</Text>
                    <CheckCircle2 size={16} color="#16A34A" />
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setLocationsModalVisible(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.modalDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MATCH PROPERTY TO LEAD MODAL */}
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
                <Text style={styles.matchSheetTitle}>Match Property</Text>
                <Text style={styles.matchSheetSubtitle} numberOfLines={1}>
                  Client: {matchingLead?.customerName} • {matchingLead?.preferredLocality}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setMatchingLead(null)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.matchSheetHint}>
              Select an owner-posted property in {matchingLead?.preferredLocality}:
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
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
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
    paddingBottom: 36,
    backgroundColor: "#FFFFFF",
  },
  headerWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 100,
  },

  // 1. Greeting Section (Redesigned Section 1)
  greetingSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F75A8",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  greetingMainText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: 2,
  },
  greetingSubName: {
    fontSize: 27,
    fontWeight: "800",
    color: "#374766",
    letterSpacing: -0.6,
    lineHeight: 33,
  },

  // Welcome Back Hero Banner Card (Vibrant Blue Card with 3D isometric building - fixed height)
  welcomeBanner: {
    backgroundColor: "#024EFA",
    borderRadius: 20,
    height: 112, // Fixed height per design requirement (compact & responsive)
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 8,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#024EFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  welcomeBannerLeft: {
    flex: 1,
    paddingRight: 10,
    justifyContent: "center",
  },
  welcomeBannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  welcomeBannerEmoji: {
    fontSize: 16,
    marginVertical: 2,
    lineHeight: 20,
  },
  welcomeBannerSub: {
    fontSize: 12.5,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.92)",
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  welcomeBannerImage: {
    width: 108,
    height: 98,
  },

  expiredBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  expiredLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  expiredTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
  },
  expiredSub: {
    fontSize: 11,
    color: "#B91C1C",
    marginTop: 2,
  },
  renewBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  renewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },


  // 3. 2-Column Metrics Grid (Matching Owner metricsGrid & metricCard)
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  metricCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
    letterSpacing: -0.1,
  },

  // 4. Covered Locations Section
  locationsSection: {
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  locBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  locBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  localityChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  localityChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  localityChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  localityMoreChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  localityMoreChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // 5. Quick Action Banner (Matching Owner addPropertyBanner)
  actionBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  actionBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionBannerTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  actionBannerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  actionBannerSub: {
    color: "#DBEAFE",
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBannerArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },

  // 6. Quick Action Secondary Pills Row
  quickActionPillsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  quickActionPillBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },

  // 7. Minimal List Sections (Recent Enquiries/Leads)
  minimalSection: {
    marginBottom: 20,
  },
  sectionHeaderWithSub: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
    letterSpacing: -0.1,
  },
  sectionSubtitleAccent: {
    color: "#2563EB",
    fontWeight: "600",
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  enquiriesList: {
    gap: 10,
  },
  enquiryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  enquiryAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#EEF2F6",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  enquiryAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  enquiryInfo: {
    flex: 1,
  },
  enquiryNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  enquiryName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  enquirySubRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  enquiryChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  enquiryChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  enquiryDot: {
    fontSize: 11,
    color: "#94A3B8",
    marginHorizontal: 5,
  },
  enquiryLocText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  enquiryBudgetText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  enquiryActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  enquiryActionSecondaryBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  enquiryActionSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  enquiryActionPrimaryBtn: {
    flex: 1.2,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  enquiryActionPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  viewAllFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  viewAllFullBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // 8. Subscription Summary Card (Matching Owner minimalListCard)
  minimalListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    overflow: "hidden",
  },
  planStatusPill: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  planStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  planRowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planRowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
  },
  planKey: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  planVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  managePlanBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  managePlanBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  locationsModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
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
  modalSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    maxHeight: 320,
  },
  modalLocGrid: {
    gap: 8,
  },
  modalLocItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 12,
  },
  modalLocIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalLocIndexText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  modalLocName: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  modalFooter: {
    marginTop: 16,
  },
  modalDoneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalDoneBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
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
  matchSheetHint: {
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
    width: 56,
    height: 56,
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
  offlineNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
  },
  offlineNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
});
