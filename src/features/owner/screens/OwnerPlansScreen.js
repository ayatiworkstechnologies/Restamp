import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShieldCheck,
} from "../../../shared/components/HugeIcon.js";
import { useOwner } from "../context/OwnerContext.js";
import PlanCard from "../../../shared/components/PlanCard.js";
import PaymentHeader from "../../../shared/components/PaymentHeader.js";

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <PaymentHeader title="Choose Your Owner Plan" onBack={handleBackToBuyer} />

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

        {/* Shared plan cards — identical to the Owner / Dealer / Agent plan list */}
        {currentPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            name={plan.name}
            titlePrefix={plan.titlePrefix}
            titlePrefixColor={plan.titlePrefixColor}
            titleColor={plan.titleColor}
            price={plan.price}
            priceSub1={plan.priceSub1}
            priceSub2={plan.priceSub2}
            isPopular={plan.isPopular}
            features={plan.features}
            buttonText={plan.buttonText || "Choose Plan"}
            onPress={() => handleSelectPlan(plan)}
          />
        ))}

        {/* Assurance Box */}
        <View style={styles.assuranceBox}>
          <ShieldCheck size={16} color="#16A34A" style={{ marginRight: 8 }} />
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
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  roleBadgeOwner: {
    marginLeft: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeTextOwner: {
    fontSize: 10,
    fontWeight: "600",
    color: "#16A34A",
  },
  paneSubtitle: {
    fontSize: 13,
    color: "#64748B",
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

  assuranceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 8,
  },
  assuranceText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "500",
    flex: 1,
    lineHeight: 17,
  },
});
