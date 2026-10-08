import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
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
  ArrowLeft,
  Bell,
  MoreHorizontal,
  ArrowUpRight,
  User,
} from "lucide-react-native";

import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
import { fetchOwnerListings, toOwnerProperty } from "../../api/owner";
import RestampLogo from "../../components/RestampLogo";
import AppBrandHeader from "../../components/AppBrandHeader";

export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 0
  );

  const { properties: localProperties, leads, subscription, ownerProfile } = useOwner();

  const [liveProperties, setLiveProperties] = useState(null);

  const loadLiveListings = useCallback(() => {
    fetchOwnerListings(1, 50)
      .then((resp) => setLiveProperties((resp.items || []).map(toOwnerProperty)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadLiveListings();
    const unsubscribe = navigation.addListener("focus", loadLiveListings);
    return unsubscribe;
  }, [navigation, loadLiveListings]);

  const properties = useMemo(() => {
    if (!liveProperties) return localProperties;
    const liveIds = new Set(liveProperties.map((p) => p.id));
    const localOnly = localProperties.filter((p) => !liveIds.has(p.id));
    return [...liveProperties, ...localOnly];
  }, [liveProperties, localProperties]);

  // Calculate summary counts
  const activeCount = properties.filter((p) => p.status === "active").length;
  const pendingCount = properties.filter((p) => p.status === "pending").length;
  const closedCount = properties.filter((p) => p.status === "closed").length;

  // Aggregate performance stats
  const totalViews = properties.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalEnquiries = properties.reduce((acc, p) => acc + (p.enquiries || 0), 0);
  const totalVisits = properties.reduce((acc, p) => acc + (p.visits || 0), 0);

  // Latest leads & primary property
  const recentLeads = leads.slice(0, 4);
  const primaryProperty = properties.find((p) => p.status === "active") || properties[0];

  // Dynamic date matching reference design ("Wednesday, 11 May")
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours();
  const greetingText =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  const ownerName = ownerProfile?.firstName || "Arunavo";

  const handleAddProperty = () => {
    navigation.navigate("Add", { resetForm: Date.now(), initialStep: 1 });
  };

  const handleMyProperties = (tab = "Active") => {
    navigation.navigate("Properties", { initialTab: tab });
  };

  const handleViewLeads = () => {
    navigation.navigate("Leads");
  };

  const handleManagePlan = () => {
    navigation.navigate("OwnerPlans");
  };

  const handleSwitchToBuyer = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
  };

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ================= FIXED BRAND HEADER (Matching Buyer Page) ================= */}
      <View style={[styles.headerWrapper, { paddingTop: topInset }]}>
        <AppBrandHeader currentRole="owner" />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. GREETING SECTION (Matches reference photo: Date / Good morning / Arunavo,) */}
        <View style={styles.greetingSection}>
          <Text style={styles.dateText}>{todayFormatted}</Text>
          <Text style={styles.greetingMainText}>{greetingText}</Text>
          <Text style={styles.greetingSubName}>{ownerName},</Text>
        </View>

        {/* 2. TOP FEATURE / STATUS CARD: Primary Active Listing */}
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => {
            if (primaryProperty) {
              handleMyProperties("Active");
            } else {
              handleAddProperty();
            }
          }}
          activeOpacity={0.88}
        >
          <View style={styles.featureLeftCol}>
            <Text style={styles.featureCardSub}>
              {primaryProperty ? "Primary Listing" : "Quick Action"}
            </Text>
            <Text style={styles.featureCardTitle} numberOfLines={1}>
              {primaryProperty?.title || "Add Your First Property"}
            </Text>
          </View>

          <View style={styles.featureRightCol}>
            <View style={[styles.nowBadge, primaryProperty ? styles.liveBadge : styles.startBadge]}>
              <Text style={styles.nowBadgeText}>
                {primaryProperty ? "Live" : "Start"}
              </Text>
            </View>
            <ArrowRight size={18} color="#475569" style={{ marginLeft: 10 }} />
          </View>
        </TouchableOpacity>

        {/* 3. 2-COLUMN METRICS GRID: Real Estate Stats */}
        {/* Row 1: Active Listings & Pending Verification */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Active Listings */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => handleMyProperties("Active")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Building2 size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {String(activeCount).padStart(2, "0")}
            </Text>
            <Text style={styles.metricLabel}>Active listings</Text>
          </TouchableOpacity>

          {/* Card 2: Pending Verification */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => handleMyProperties("Pending")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Clock size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {String(pendingCount).padStart(2, "0")}
            </Text>
            <Text style={styles.metricLabel}>Pending verification</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Total Inquiries & Property Views */}
        <View style={[styles.metricsGrid, { marginTop: 10 }]}>
          {/* Card 3: Total Inquiries */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={handleViewLeads}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <MessageSquare size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>{totalEnquiries || 14}</Text>
            <Text style={styles.metricLabel}>Total inquiries</Text>
          </TouchableOpacity>

          {/* Card 4: Property Views */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => handleMyProperties("Active")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Eye size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {totalViews > 0 ? totalViews.toLocaleString("en-IN") : "1,248"}
            </Text>
            <Text style={styles.metricLabel}>Property views</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3: Site Visits & Closed Listings */}
        <View style={[styles.metricsGrid, { marginTop: 10 }]}>
          {/* Card 5: Site Visits Booked */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={handleViewLeads}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <Calendar size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {String(totalVisits || 6).padStart(2, "0")}
            </Text>
            <Text style={styles.metricLabel}>Site visits booked</Text>
          </TouchableOpacity>

          {/* Card 6: Closed Listings */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => handleMyProperties("Closed")}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconWrap}>
                <ShieldCheck size={17} color="#1E293B" strokeWidth={1.8} />
              </View>
              <ArrowRight size={14} color="#94A3B8" />
            </View>
            <Text style={styles.metricNumber}>
              {String(closedCount).padStart(2, "0")}
            </Text>
            <Text style={styles.metricLabel}>Closed listings</Text>
          </TouchableOpacity>
        </View>

        {/* 4. QUICK ACTION BANNER: + List New Property */}
        <TouchableOpacity
          style={styles.addPropertyBanner}
          onPress={handleAddProperty}
          activeOpacity={0.88}
        >
          <View style={styles.addBannerLeft}>
            <View style={styles.addBannerIconWrap}>
              <Plus size={18} color={COLORS.primary} strokeWidth={2.8} />
            </View>
            <View style={styles.addBannerTextWrap}>
              <Text style={styles.addBannerTitle}>List a New Property</Text>
              <Text style={styles.addBannerSub}>
                Add rental, lease, or resale property in minutes
              </Text>
            </View>
          </View>
          <View style={styles.addBannerArrowWrap}>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </TouchableOpacity>

        {/* 5. RECENT ENQUIRIES (Matching Workout-Card Reference Design) */}
        <View style={styles.minimalSection}>
          <View style={styles.sectionHeaderWithSub}>
            <View>
              <Text style={styles.sectionTitle}>Recent Enquiries</Text>
              <Text style={styles.sectionSubtitle}>
                {leads.length} enquiries • <Text style={styles.sectionSubtitleAccent}>Active today</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleViewLeads}
              activeOpacity={0.7}
              style={styles.viewAllRow}
            >
              <Text style={styles.viewAllText}>View all</Text>
              <ArrowRight size={14} color={COLORS.primary} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.enquiriesList}>
            {recentLeads.map((lead, idx) => {
              return (
                <TouchableOpacity
                  key={lead.id || idx}
                  style={styles.enquiryCard}
                  onPress={() => navigation.navigate("OwnerLeadDetail", { lead })}
                  activeOpacity={0.75}
                >
                  {/* Round Profile Avatar Image */}
                  <View style={styles.enquiryAvatarWrap}>
                    <Image
                      source={{
                        uri:
                          lead.avatar ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
                      }}
                      style={styles.enquiryAvatar}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Middle Info */}
                  <View style={styles.enquiryInfo}>
                    <Text style={styles.enquiryName} numberOfLines={1}>
                      {lead.customerName}
                    </Text>
                    <View style={styles.enquirySubRow}>
                      <View style={styles.enquiryChip}>
                        <Text style={styles.enquiryChipText} numberOfLines={1}>
                          {lead.propertyTitle || "2 BHK Luxury"}
                        </Text>
                      </View>
                      <Text style={styles.enquiryDot}>•</Text>
                      <Text style={styles.enquiryStatusText} numberOfLines={1}>
                        {lead.budget || lead.timestamp || "Verified"}
                      </Text>
                    </View>
                  </View>

                  {/* Right Action: Call button */}
                  <TouchableOpacity
                    style={styles.enquiryCallBtn}
                    onPress={() =>
                      Alert.alert("Call Lead", `Dialing ${lead.phone || "+91 98765 43210"}?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Call", onPress: () => {} },
                      ])
                    }
                    activeOpacity={0.7}
                  >
                    <Phone size={14} color={COLORS.primary} fill={COLORS.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 6. OWNER PLAN & QUOTA (Minimal Card) */}
        <View style={styles.minimalSection}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ShieldCheck size={18} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Owner Plan</Text>
            </View>
            <View style={styles.planStatusPill}>
              <Text style={styles.planStatusText}>Active</Text>
            </View>
          </View>

          <View style={styles.minimalListCard}>
            <View style={styles.planRowItem}>
              <Text style={styles.planKey}>Current Plan</Text>
              <Text style={styles.planVal}>{subscription?.planName || "Owner Pro Plan"}</Text>
            </View>
            <View style={styles.planRowDivider} />
            <View style={styles.planRowItem}>
              <Text style={styles.planKey}>Validity</Text>
              <Text style={styles.planVal}>{subscription?.validity || "Until Leased / Sold"}</Text>
            </View>
            <View style={styles.planRowDivider} />
            <View style={styles.planRowItem}>
              <Text style={styles.planKey}>Listing Quota</Text>
              <Text style={styles.planVal}>
                {activeCount} of {subscription?.listingLimit || 5} used
              </Text>
            </View>

            <TouchableOpacity
              style={styles.managePlanBtn}
              onPress={handleManagePlan}
              activeOpacity={0.8}
            >
              <Text style={styles.managePlanBtnText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIconBg: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  logoTextAccent: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  ownerBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchModePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  switchModeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  // 2. Greeting Section
  greetingSection: {
    marginBottom: 16,
    marginTop: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  greetingMainText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  greetingSubName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: -0.5,
    lineHeight: 30,
    marginTop: 2,
  },

  // 3. Feature Status Card: Primary Active Listing
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  featureLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  featureCardSub: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  featureRightCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  nowBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
  },
  liveBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  startBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  nowBadgeText: {
    color: "#059669",
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // 4. 2-Column Metrics Grid
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

  // 4. Quick Action Banner
  addPropertyBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  addBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  addBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addBannerTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  addBannerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  addBannerSub: {
    color: "#DBEAFE",
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  addBannerArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },

  // 5. Minimal List Sections
  minimalSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionHeaderWithSub: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
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
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
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
    alignItems: "center",
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
    marginRight: 14,
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
    marginRight: 10,
  },
  enquiryName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  enquirySubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  enquiryChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    maxWidth: "58%",
  },
  enquiryChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  enquiryDot: {
    fontSize: 11,
    color: "#94A3B8",
    marginHorizontal: 6,
  },
  enquiryStatusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    flexShrink: 1,
  },
  enquiryCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  minimalListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    overflow: "hidden",
  },

  // Plan Details
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
});
