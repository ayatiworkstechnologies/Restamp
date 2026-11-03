import React, { useState } from "react";
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
  ShieldCheck,
  CheckCircle2,
} from "../../../shared/components/HugeIcon.js";
import { useOwner } from "../context/OwnerContext.js";

import { OWNER_PLANS_LIST } from "../data/ownerPlans.js";

export { OWNER_PLANS_LIST };

// Backward-compatible structure supporting OWNER_PLANS.residential / commercial
const OWNER_PLANS = {
  residential: OWNER_PLANS_LIST,
  commercial: OWNER_PLANS_LIST,
};
Object.assign(OWNER_PLANS, OWNER_PLANS_LIST);

export { OWNER_PLANS };

export default function OwnerPlansScreen({ navigation }) {
  const [propertyCategory, setPropertyCategory] = useState("residential");
  const { setSelectedPlanForCheckout } = useOwner();

  const currentPlans = OWNER_PLANS_LIST;

  const handleSelectPlan = (plan) => {
    setSelectedPlanForCheckout({
      ...plan,
      category: propertyCategory,
    });
    navigation.navigate("OwnerPlanConfirm", { plan });
  };

  const handleBackToBuyer = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* TOP HEADER: Circular Back Button | Screen Title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBackBtn}
          onPress={handleBackToBuyer}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choose Your Owner Plan</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Role Info */}
        <View style={styles.paneHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.paneTitle}>Owner Plans</Text>
            <View style={styles.roleBadgeOwner}>
              <Text style={styles.roleBadgeTextOwner}>Individual</Text>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.paneSectionHeader}>CHOOSE A PLAN • 7 TIERS</Text>
        </View>

        {/* ================= 7 SELLER PLAN PRICING CARDS ================= */}
        {currentPlans.map((plan) => (
          <View key={plan.id} style={styles.planCard}>
            {/* 1. Header: Plan Name */}
            <Text style={styles.planName}>{plan.name}</Text>

            {/* 2. Price Row: Large Current Price + Original Strikethrough Price */}
            <View style={styles.priceRow}>
              <Text style={styles.priceBig}>{plan.price}</Text>
              {plan.originalPrice ? (
                <Text style={styles.originalPriceText}>{plan.originalPrice}</Text>
              ) : null}
            </View>

            {/* 3. Subtitle / Duration */}
            <Text style={styles.billingText}>{plan.billingText}</Text>

            {/* 4. Subtle Edge-to-Edge Divider */}
            <View style={styles.cardDivider} />

            {/* 5. Property Listings Count Row */}
            <View style={styles.listingsRow}>
              <Text style={styles.listingsLabel}>Post Count</Text>
              <Text style={styles.listingsValue}>{plan.listingLimitLabel}</Text>
            </View>

            {/* 6. Feature List with Green Check Circles */}
            <View style={styles.featuresList}>
              {plan.features.map((feature, fIdx) => (
                <View key={fIdx} style={styles.featureRow}>
                  <CheckCircle2
                    size={17}
                    color="#22C55E"
                    strokeWidth={2.4}
                    style={styles.checkIcon}
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* 7. Action CTA Button */}
            <TouchableOpacity
              style={styles.choosePlanBtn}
              activeOpacity={0.8}
              onPress={() => handleSelectPlan(plan)}
            >
              <Text style={styles.choosePlanText}>
                {plan.buttonText || "Choose Plan"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Assurance Box */}
        <View style={styles.assuranceBox}>
          <ShieldCheck size={16} color="#4ADE80" style={{ marginRight: 8 }} />
          <Text style={styles.assuranceText}>
            Plan prices are indicative; no payment or refund flow is available.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#000000",
  },
  circleBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  paneHeader: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  paneTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  roleBadgeOwner: {
    marginLeft: 10,
    backgroundColor: "#052E16",
    borderWidth: 1,
    borderColor: "#166534",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeTextOwner: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4ADE80",
  },
  paneSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  paneSectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.8,
  },

  /* ================= SLEEK DARK PRICING CARDS ================= */
  planCard: {
    backgroundColor: "#000000",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2430",
    marginBottom: 16,
  },
  planName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E2E8F0",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
    marginBottom: 4,
  },
  priceBig: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  originalPriceText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748B",
    textDecorationLine: "line-through",
    marginLeft: 10,
  },
  billingText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "400",
    marginBottom: 18,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#1F2430",
    marginHorizontal: -20,
    marginBottom: 18,
  },
  listingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  listingsLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  listingsValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  featuresList: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: "#E2E8F0",
    fontWeight: "400",
    lineHeight: 20,
    flex: 1,
  },
  choosePlanBtn: {
    marginTop: 6,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272A",
    backgroundColor: "#0A0A0A",
  },
  choosePlanText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  assuranceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#052E16",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#166534",
    marginTop: 8,
  },
  assuranceText: {
    fontSize: 12,
    color: "#86EFAC",
    fontWeight: "500",
    flex: 1,
    lineHeight: 17,
  },
});
