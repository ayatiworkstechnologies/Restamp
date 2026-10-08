import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  ShieldCheck,
  MapPin,
  Building2,
  Users,
  Calendar,
  Crown,
  CreditCard,
  FileText,
  Bell,
  Globe,
  HelpCircle,
  ChevronRight,
  LogOut,
  Sparkles,
  ArrowRight,
  Search,
  Pencil,
  RotateCcw,
  Settings as SettingsIcon,
  Wallet,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useAgent } from "../../context/AgentContext";
import ConfirmationModal from "../../components/owner/ConfirmationModal";
import AppBrandHeader from "../../components/AppBrandHeader";

export default function AgentProfileScreen({ navigation }) {
  const {
    agentProfile,
    agentPlan,
    selectedLocalities,
    localityProperties,
    leads,
    visits,
  } = useAgent();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSwitchToBuyer = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
  };

  const handleManagePlan = () => {
    navigation.navigate("Menu", { initialTab: "agent" });
  };

  const handleManageLocations = () => {
    navigation.navigate("AgentLocationSelect", {
      selectedLocalities,
      plan: agentPlan,
    });
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
    Alert.alert("Logged Out", "You have been signed out of your agent account.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER */}
      <AppBrandHeader currentRole="agent" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER: AGENT AVATAR, NAME, PHONE, EMAIL, VERIFICATION STATUS */}
        <View style={styles.profileHeaderCard}>
          <Image
            source={{
              uri:
                agentProfile?.avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
            }}
            style={styles.avatar}
          />

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.agentName}>{agentProfile?.name || "Vikram Prabhu"}</Text>
              <Pencil size={14} color="#475569" style={styles.pencilIcon} />
            </View>

            <Text style={styles.phoneText}>{agentProfile?.phone || "+91 98400 99888"}</Text>
            <Text style={styles.emailText}>{agentProfile?.email || "vikram.prabhu@restamp.com"}</Text>

            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
              <Text style={styles.verifiedBadgeText}>
                {agentProfile?.kycStatus || "Verified"} Agent Partner
              </Text>
            </View>
          </View>
        </View>

        {/* MODE SWITCH BUTTON (MATCHING OWNER PROFILE DESIGN) */}
        <TouchableOpacity
          style={styles.modeSwitchBanner}
          onPress={handleSwitchToBuyer}
          activeOpacity={0.88}
        >
          <View style={styles.modeSwitchLeft}>
            <View style={styles.modeSwitchIconWrap}>
              <Search size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.modeSwitchTitle}>Switch to Find Property</Text>
              <Text style={styles.modeSwitchSub}>
                Browse flats, villas & commercial properties as a Buyer
              </Text>
            </View>
          </View>
          <ArrowRight size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* 1. MY PLAN */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>MY PLAN</Text>

          <View style={styles.planCardItem}>
            <View style={styles.planCardTop}>
              <View style={styles.planTitleCol}>
                <Text style={styles.planTitleText}>{agentPlan?.name || "Agent Plan"}</Text>
                <Text style={styles.planLimitSub}>
                  {agentPlan?.locationLimit || selectedLocalities.length} Locations
                </Text>
              </View>

              <View style={styles.planActivePill}>
                <Text style={styles.planActivePillText}>
                  {agentPlan?.status === "active" ? "Active" : "Expired"}
                </Text>
              </View>
            </View>

            <View style={styles.planExpiryRow}>
              <Text style={styles.planExpiryLabel}>Expiry Date:</Text>
              <Text style={styles.planExpiryVal}>20 Nov 2026</Text>
            </View>

            <TouchableOpacity
              style={styles.managePlanBtn}
              onPress={handleManagePlan}
              activeOpacity={0.8}
            >
              <Sparkles size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.managePlanBtnText}>Manage Plan</Text>
              <ChevronRight size={14} color={COLORS.primary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. MY LOCATIONS */}
        <View style={styles.menuGroup}>
          <View style={styles.groupHeaderRow}>
            <Text style={styles.groupHeading}>MY LOCATIONS</Text>
            <TouchableOpacity onPress={handleManageLocations} activeOpacity={0.7}>
              <Text style={styles.groupActionLink}>Manage Locations</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationsCoverageBox}>
            <Text style={styles.locationsCoverageNotice}>
              Subscription coverage management — you receive properties & buyer leads exclusively in these areas:
            </Text>

            <View style={styles.locationsChipsGrid}>
              {selectedLocalities.map((loc) => (
                <View key={loc} style={styles.locationChip}>
                  <MapPin size={11} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.locationChipText}>{loc}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.manageLocationsBtn}
              onPress={handleManageLocations}
              activeOpacity={0.8}
            >
              <Text style={styles.manageLocationsBtnText}>Manage Locations</Text>
              <ChevronRight size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. MY ACTIVITY */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>MY ACTIVITY</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Properties")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Building2 size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Available Properties</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{localityProperties.length || 126}</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Leads")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Users size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>My Leads</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{leads.length || 18}</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Visits")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Calendar size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Site Visits</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{visits.length || 4}</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate("AgentEarnings")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Wallet size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Earnings & Commission</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.countBadge, { backgroundColor: "#F0FDF4" }]}>
                <Text style={[styles.countText, { color: "#16A34A" }]}>
                  ₹2.4L
                </Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. KYC / VERIFICATION */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>KYC / VERIFICATION</Text>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() =>
              Alert.alert(
                "KYC Status",
                `Agent RERA ID: ${agentProfile?.reraNumber || "TN/AGENT/2024/00842"}\nStatus: VERIFIED & ACTIVE`
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <ShieldCheck size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>RERA & Identity Verification</Text>
            </View>
            <View style={styles.badgeRow}>
              <Text style={styles.kycStatusText}>Verified</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. PAYMENTS */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>PAYMENTS</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(
                "Payment History",
                "Transactions:\n• 06 Sep 2026 - ₹6,999 (Agent Pro 10 Loc) - Success\n• 06 Aug 2026 - ₹6,999 - Success"
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <CreditCard size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Payment History</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => Alert.alert("Invoices", "Invoice INV-2026-AGT-8821 downloaded.")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <FileText size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Tax Invoices</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 6. NOTIFICATIONS */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>NOTIFICATIONS</Text>

          <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
            <View style={styles.menuLeft}>
              <Bell size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Lead Alerts & Visit Reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#CBD5E1", true: "#BFDBFE" }}
              thumbColor={notificationsEnabled ? COLORS.primary : "#F1F5F9"}
            />
          </View>
        </View>

        {/* 7. HELP & SUPPORT */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>HELP & SUPPORT</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert("Agent Concierge", "Contact RESTAMP Agent Relationship Manager at 1800-420-RESTAMP")
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <HelpCircle size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Agent Support Desk</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => Alert.alert("FAQs", "Agent platform rules, lead SLAs & commission guidelines.")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Globe size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>FAQs & Tutorials</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 8. SETTINGS */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>SETTINGS</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert("Settings", "Agent studio preferences.")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <SettingsIcon size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Account Preferences</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => Alert.alert("Legal", "Terms of Service and Privacy Policy for RESTAMP Agents.")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <FileText size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Terms of Service</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 9. LOGOUT */}
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <LogOut size={18} color="#DC2626" style={styles.menuIcon} />
              <Text style={[styles.menuLabel, { color: "#DC2626", fontWeight: "600" }]}>
                Logout
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout of Agent Studio"
        message="Are you sure you want to log out? Your active subscription and leads will remain securely saved."
        confirmText="Log Out"
        cancelText="Cancel"
        variant="danger"
        icon={LogOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  profileHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E2E8F0",
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  agentName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  pencilIcon: {
    marginLeft: 6,
  },
  phoneText: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  emailText: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  modeSwitchBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    padding: 14,
  },
  modeSwitchLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  modeSwitchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modeSwitchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  modeSwitchSub: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 1,
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  groupHeading: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  groupActionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  planCardItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planTitleCol: {
    flex: 1,
  },
  planTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  planLimitSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  planActivePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planActivePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  planExpiryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  planExpiryLabel: {
    fontSize: 12,
    color: "#64748B",
    marginRight: 6,
  },
  planExpiryVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  managePlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  managePlanBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  locationsCoverageBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationsCoverageNotice: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 10,
  },
  locationsChipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locationChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  manageLocationsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  manageLocationsBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    marginRight: 10,
  },
  menuLabel: {
    fontSize: 13.5,
    color: "#1E293B",
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  kycStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
});
