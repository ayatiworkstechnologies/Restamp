import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Check,
  ShieldCheck,
  Calendar,
  MapPin,
  Briefcase,
} from "../../../shared/components/HugeIcon.js";
import { useOwner } from "../../owner/context/OwnerContext.js";
import { useAgent } from "../../agent/context/AgentContext.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { AGENT_MODULE_ENABLED } from "../../../shared/constants/features.js";
import COLORS from "../../../shared/constants/colors.js";

export default function ActiveMembershipsScreen({ navigation }) {
  const { subscription } = useOwner();
  const { agentPlan, hasActivePlan, selectedLocalities } = useAgent();
  const { user: authUser } = useAuth();

  const hasOwnerPlan = Boolean(
    subscription?.hasPurchased ||
    subscription?.planName ||
    authUser?.role === "OWNER"
  );
  const hasAgentPlan =
    AGENT_MODULE_ENABLED &&
    Boolean(
      hasActivePlan &&
      (agentPlan?.hasPurchased ||
        agentPlan?.name ||
        authUser?.role === "BROKER" ||
        authUser?.role === "AGENT")
    );

  const handleSwitchToOwner = () => {
    navigation.navigate("OwnerNavigator");
  };

  const handleSwitchToAgent = () => {
    navigation.navigate("AgentNavigator");
  };

  const handleManageOwnerPlan = () => {
    navigation.navigate("OwnerPlans");
  };

  const handleManageAgentPlan = () => {
    navigation.navigate("AgentLocationSelect", {
      selectedLocalities,
      plan: agentPlan,
    });
  };

  const handleExploreAgentPlans = () => {
    navigation.navigate("AgentPlanConfirm");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Memberships & Plans</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.subscriptionsSection}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionHeadingIcon}>
              <Crown size={15} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeadingText}>ACTIVE MEMBERSHIPS & PLANS</Text>
              <Text style={styles.sectionSubHeadingText}>
                Purchased subscription details for your account
              </Text>
            </View>
          </View>

          {/* PROJECT TICKET DESIGN (Active Memberships & Plans) */}
          <View style={styles.ticketCard}>
            {/* 1. Top Row: Status Pill on left + Action Buttons on right */}
            <View style={styles.ticketTopRow}>
              <View style={styles.ticketStatusPill}>
                <View style={styles.ticketCheckCircle}>
                  <Check size={9} color="#FFFFFF" />
                </View>
                <Text style={styles.ticketStatusText}>ACTIVE</Text>
              </View>

              <View style={styles.ticketHeaderButtons}>
                {/* Stats Box (Grid of 3) */}
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>VALIDITY</Text>
                    <Text style={styles.statValue}>
                      {subscription?.validity || "90 Days"}
                    </Text>
                  </View>
                  <View style={[styles.statBox, styles.statBoxBorder]}>
                    <Text style={styles.statLabel}>LISTINGS QUOTA</Text>
                    <Text style={styles.statValue}>
                      {subscription?.usedListings || 0} / {subscription?.listingLimit || 5} Used
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>AMOUNT PAID</Text>
                    <Text style={[styles.statValue, { color: "#16A34A" }]}>
                      {subscription?.amountPaid || "Not purchased"}
                    </Text>
                  </View>
                </View>

                {/* Extra details row: Transaction ref & Features */}
                <View style={styles.metaInfoRow}>
                  <View style={styles.metaItem}>
                    <ShieldCheck size={13} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={styles.metaItemText}>
                      0% Brokerage • Direct Inquiries Active
                    </Text>
                  </View>
                  <Text style={styles.metaItemRef}>
                    {subscription?.txnId || "Not purchased"}
                  </Text>
                </View>

                {subscription?.expiryDate ? (
                  <View style={styles.expiryNoticeRow}>
                    <Calendar size={12} color="#64748B" style={{ marginRight: 5 }} />
                    <Text style={styles.expiryNoticeText}>
                      Expires on {subscription.expiryDate} ({subscription?.daysRemaining || 90} days left)
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons Row */}
                <View style={styles.planActionsRow}>
                  <TouchableOpacity
                    style={styles.ticketDraftBtn}
                    onPress={hasAgentPlan ? handleManageAgentPlan : handleManageOwnerPlan}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ticketDraftBtnText}>
                      {hasAgentPlan ? "Manage" : "Upgrade"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.ticketSaveBtn}
                    onPress={hasAgentPlan ? handleSwitchToAgent : handleSwitchToOwner}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.ticketSaveBtnText}>Dashboard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Details Section */}
            <View style={styles.ticketTabsRow}>
              <View style={[styles.ticketTabItem, styles.ticketTabItemActive]}>
                <Text style={[styles.ticketTabText, styles.ticketTabTextActive]}>
                  Details
                </Text>
              </View>
            </View>

            {/* Details Content */}
            <View style={styles.ticketTabBox}>
              <View style={styles.ticketDetailRow}>
                <Text style={styles.ticketDetailLabel}>Plan:</Text>
                <Text style={styles.ticketDetailValue}>
                  {hasAgentPlan
                    ? (agentPlan?.name || "Agent Pro Plan")
                    : (subscription?.planName || "Owner Pro Plan")}
                </Text>
              </View>
              <View style={styles.ticketDetailRow}>
                <Text style={styles.ticketDetailLabel}>Status:</Text>
                <Text style={styles.ticketDetailValue}>ACTIVE • Verified Partner</Text>
              </View>
              <View style={styles.ticketDetailRow}>
                <Text style={styles.ticketDetailLabel}>Timeline:</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Calendar size={14} color="#0F172A" style={{ marginRight: 5 }} />
                  <Text style={styles.ticketDetailValue}>
                    {hasOwnerPlan && subscription?.expiryDate
                      ? `Expires ${subscription.expiryDate}`
                      : hasAgentPlan && agentPlan?.expiryDate
                      ? `Expires ${agentPlan.expiryDate}`
                      : "90 Days Active"}
                  </Text>
                </View>
              </View>
              <View style={styles.ticketDetailRow}>
                <Text style={styles.ticketDetailLabel}>Validity Period:</Text>
                <Text style={styles.ticketDetailValue}>
                  {hasAgentPlan
                    ? (agentPlan?.validity || "30 Days")
                    : (subscription?.validity || "90 Days")}
                </Text>
              </View>
              <View style={styles.ticketDetailRow}>
                <Text style={styles.ticketDetailLabel}>
                  {hasAgentPlan ? "Covered Localities:" : "Listings Quota:"}
                </Text>
                <Text style={styles.ticketDetailValue}>
                  {hasAgentPlan
                    ? `${selectedLocalities?.length || 10} Areas Active`
                    : `${subscription?.usedListings || 0} / ${subscription?.listingLimit || 5} Used`}
                </Text>
              </View>
              <View style={styles.ticketDetailRow}>
                <Text style={styles.ticketDetailLabel}>Brokerage:</Text>
                <Text style={[styles.ticketDetailValue, { color: "#16A34A" }]}>
                  0% Zero Commission
                </Text>
              </View>
              <View style={styles.ticketDetailRow}>
                <Text style={styles.ticketDetailLabel}>Transaction Ref:</Text>
                <Text style={styles.ticketDetailValue}>
                  {hasAgentPlan
                    ? (agentPlan?.invoiceNumber || "INV-2026-AGT-8821")
                    : (subscription?.txnId || "TXN-2026-98124")}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Partner Options below Ticket Card */}
          {AGENT_MODULE_ENABLED && hasOwnerPlan && !hasAgentPlan ? (
            <TouchableOpacity
              style={styles.addOtherPlanRow}
              onPress={handleExploreAgentPlans}
              activeOpacity={0.8}
            >
              <View style={styles.addOtherLeft}>
                <Briefcase size={16} color="#2563EB" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.addOtherTitle}>Add Agent Membership</Text>
                  <Text style={styles.addOtherSub}>Claim buyer leads in your top Chennai localities</Text>
                </View>
              </View>
              <ArrowRight size={16} color="#2563EB" />
            </TouchableOpacity>
          ) : hasAgentPlan && !hasOwnerPlan ? (
            <TouchableOpacity
              style={styles.addOtherPlanRow}
              onPress={handleManageOwnerPlan}
              activeOpacity={0.8}
            >
              <View style={styles.addOtherLeft}>
                <Crown size={16} color="#D97706" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.addOtherTitle}>Add Owner Membership</Text>
                  <Text style={styles.addOtherSub}>Post your properties with 0% brokerage</Text>
                </View>
              </View>
              <ArrowRight size={16} color="#D97706" />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  circleBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  subscriptionsSection: {
    marginBottom: 20,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionHeadingIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionHeadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  sectionSubHeadingText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  ticketTopRow: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 10,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  ticketHeaderButtons: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 6,
  },
  ticketDraftBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketDraftBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  ticketSaveBtn: {
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 8,
    backgroundColor: "#0284FE",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketSaveBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  ticketStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  ticketCheckCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 14,
    marginBottom: 16,
  },
  ticketGrid: {
    marginBottom: 16,
  },
  ticketGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ticketGridCol: {
    flex: 1,
    paddingRight: 8,
  },
  ticketGridLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 6,
  },
  ticketGridValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  ticketGridSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  ticketTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginTop: 8,
    marginBottom: 14,
  },
  ticketTabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginRight: 22,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  ticketTabItemActive: {
    borderBottomColor: "#F59E0B",
  },
  ticketTabText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  ticketTabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  ticketTabBox: {
    paddingVertical: 6,
  },
  ticketDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  ticketDetailLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  ticketDetailValue: {
    fontSize: 13.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 3,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  metaInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metaItemText: {
    fontSize: 11.5,
    color: "#15803D",
    fontWeight: "500",
  },
  metaItemRef: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  expiryNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  expiryNoticeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "400",
  },
  planActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  primaryPlanBtn: {
    flex: 1.4,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryPlanBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryPlanBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
  },
  secondaryPlanBtnText: {
    color: "#334155",
    fontSize: 12.5,
    fontWeight: "600",
  },
  localitiesPreviewWrap: {
    marginBottom: 10,
  },
  localitiesPreviewTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  localitiesChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  localityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  localityChipText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "500",
  },
  localityMoreChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  localityMoreChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  addOtherPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addOtherLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  addOtherTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  addOtherSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
});
