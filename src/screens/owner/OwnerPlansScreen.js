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
  Sparkles,
  Check,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react-native";
import { useOwner } from "../../context/OwnerContext";

/* Compact 3-Tier Owner Plans (Matching MenuScreen design) */
const OWNER_PLANS = {
  residential: [
    {
      id: "owner-basic",
      name: "Basic",
      titleColor: "#0F172A",
      price: "₹0",
      priceNumeric: 0,
      priceSub1: "free forever",
      priceSub2: "zero brokerage assurance",
      isPopular: false,
      buttonText: "Get started",
      validity: "30 Days",
      listingLimit: 1,
      features: [
        "30 Days listing visibility",
        "Direct buyer in-app inquiries",
        "Zero brokerage assurance",
      ],
    },
    {
      id: "owner-gold",
      name: "Gold Assist",
      titlePrefix: "Gold ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹1,999",
      priceNumeric: 1999,
      priceSub1: "for 90 days validity",
      priceSub2: "+ GST • verified owner tag",
      isPopular: true,
      buttonText: "Get started",
      validity: "3 Months (90 Days)",
      listingLimit: 5,
      features: [
        "90 Days top search placement",
        "Verified Owner badge ⭐",
        "Direct WhatsApp & instant phone leads",
      ],
    },
    {
      id: "owner-titanium",
      name: "Titanium VIP",
      titlePrefix: "Titanium ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹4,999",
      priceNumeric: 4999,
      priceSub1: "until deal closed",
      priceSub2: "full managed advisory",
      isPopular: false,
      buttonText: "Get started",
      validity: "Until Deal Closed",
      listingLimit: 10,
      features: [
        "Listing live until sold or rented",
        "Dedicated relationship manager",
        "Professional photoshoot & legal drafting",
      ],
    },
  ],
  commercial: [
    {
      id: "owner-comm-basic",
      name: "Commercial Free",
      titleColor: "#0F172A",
      price: "₹0",
      priceNumeric: 0,
      priceSub1: "free forever",
      priceSub2: "office & retail category",
      isPopular: false,
      buttonText: "Get started",
      validity: "30 Days",
      listingLimit: 1,
      features: [
        "30 Days commercial visibility",
        "Direct in-app corporate leads",
        "Zero brokerage assurance",
      ],
    },
    {
      id: "owner-comm-pro",
      name: "Corporate Boost",
      titlePrefix: "Corporate ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹3,499",
      priceNumeric: 3499,
      priceSub1: "for 90 days validity",
      priceSub2: "+ GST • full tax credit",
      isPopular: true,
      buttonText: "Get started",
      validity: "90 Days",
      listingLimit: 5,
      features: [
        "90 Days prime corporate visibility",
        "Verified Commercial Unit badge",
        "Targeted outreach to GCCs & startups",
      ],
    },
    {
      id: "owner-comm-vip",
      name: "Enterprise Managed",
      titlePrefix: "Enterprise ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹8,999",
      priceNumeric: 8999,
      priceSub1: "until leased / sold",
      priceSub2: "corporate advisory mandate",
      isPopular: false,
      buttonText: "Get started",
      validity: "Until Leased / Sold",
      listingLimit: 10,
      features: [
        "Dedicated commercial account manager",
        "Tenant KYC & due diligence",
        "Commercial lease drafting & drone tour",
      ],
    },
  ],
};

export default function OwnerPlansScreen({ navigation }) {
  const [propertyCategory, setPropertyCategory] = useState("residential");
  const { setSelectedPlanForCheckout } = useOwner();

  const currentPlans = OWNER_PLANS[propertyCategory] || OWNER_PLANS.residential;

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

      {/* TOP HEADER: Circular Back Button to Buyer App | Screen Title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBackBtn}
          onPress={handleBackToBuyer}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
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
          <Text style={styles.paneSubtitle}>
            Direct buyer inquiries • 0% brokerage in Chennai
          </Text>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.paneSectionHeader}>CHOOSE A PLAN • 3 TIERS</Text>
        </View>

        {/* ================= COMPACT & SHORT REFERENCE PRICING CARDS (MATCHING BUYER MENU) ================= */}
        {currentPlans.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.refCard,
              plan.isPopular && styles.refCardPopular,
            ]}
          >
            {/* 1. Header: Plan Name + Popular badge */}
            <View style={styles.refCardHeader}>
              <Text style={styles.refPlanTitle}>
                {plan.titlePrefix ? (
                  <Text style={{ color: plan.titlePrefixColor || "#2563EB" }}>
                    {plan.titlePrefix}
                  </Text>
                ) : null}
                <Text style={{ color: plan.titleColor || "#0F172A" }}>
                  {plan.titlePrefix
                    ? plan.name.replace(plan.titlePrefix.trim(), "").trim()
                    : plan.name}
                </Text>
              </Text>

              {plan.isPopular && (
                <View style={styles.refBadgePopular}>
                  <Sparkles
                    size={8.5}
                    color="#FFFFFF"
                    style={{ marginRight: 3 }}
                  />
                  <Text style={styles.refBadgePopularText}>POPULAR</Text>
                </View>
              )}
            </View>

            {/* 2. Big Price + 2-line Subtext */}
            <View style={styles.refPriceRow}>
              <Text style={styles.refPriceBig}>{plan.price}</Text>
              <View style={styles.refPriceSubBox}>
                <Text style={styles.refPriceSub1}>{plan.priceSub1}</Text>
                <Text style={styles.refPriceSub2}>{plan.priceSub2}</Text>
              </View>
            </View>

            {/* 3. Compact CTA Button */}
            <TouchableOpacity
              style={[
                styles.refCtaBtn,
                plan.isPopular ? styles.refCtaBtnPopular : styles.refCtaBtnDefault,
              ]}
              activeOpacity={0.82}
              onPress={() => handleSelectPlan(plan)}
            >
              <Text
                style={[
                  styles.refCtaBtnText,
                  plan.isPopular
                    ? styles.refCtaBtnTextPopular
                    : styles.refCtaBtnTextDefault,
                ]}
              >
                {plan.buttonText || "Get started"}
              </Text>
            </TouchableOpacity>

            {/* 4. Full-Width Edge-to-Edge Divider */}
            <View style={styles.refDivider} />

            {/* 5. Minimalist 3-Point Checklist */}
            <View style={styles.refFeaturesList}>
              {plan.features.map((feature, fIdx) => (
                <View key={fIdx} style={styles.refFeatureRow}>
                  <Check
                    size={14}
                    color="#0F172A"
                    strokeWidth={2.4}
                    style={styles.refCheckIcon}
                  />
                  <Text style={styles.refFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Assurance Box */}
        <View style={styles.assuranceBox}>
          <ShieldCheck size={16} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.assuranceText}>
            100% money-back guarantee if you don't receive buyer inquiries in 30 days.
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  circleBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  paneHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  paneTitle: {
    fontSize: 22,
    fontWeight: "500",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  roleBadgeOwner: {
    marginLeft: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeTextOwner: {
    fontSize: 10,
    fontWeight: "500",
    color: "#15803D",
  },
  paneSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 18,
  },
  categoryPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#0F172A",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#64748B",
  },
  categoryPillTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  paneSectionHeader: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    letterSpacing: 0.7,
  },

  /* ================= COMPACT & SHORT REFERENCE PRICING CARDS ================= */
  refCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 12,
  },
  refCardPopular: {
    borderColor: "#EEF2F6",
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  refCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  refPlanTitle: {
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  refBadgePopular: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  refBadgePopularText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  refPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginBottom: 10,
  },
  refPriceBig: {
    fontSize: 27,
    fontWeight: "500",
    color: "#0F172A",
    letterSpacing: -0.8,
  },
  refPriceSubBox: {
    marginLeft: 8,
    justifyContent: "center",
  },
  refPriceSub1: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "400",
    lineHeight: 14,
  },
  refPriceSub2: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "400",
    lineHeight: 13,
  },
  refCtaBtn: {
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  refCtaBtnDefault: {
    backgroundColor: "#2563EB",
  },
  refCtaBtnPopular: {
    backgroundColor: "#2563EB",
  },
  refCtaBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  refCtaBtnTextDefault: {
    color: "#FFFFFF",
  },
  refCtaBtnTextPopular: {
    color: "#FFFFFF",
  },
  refDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: -16,
    marginTop: 12,
    marginBottom: 10,
  },
  refFeaturesList: {
    gap: 6,
  },
  refFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  refCheckIcon: {
    marginRight: 8,
  },
  refFeatureText: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "500",
    lineHeight: 16,
    flex: 1,
  },
  assuranceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 6,
  },
  assuranceText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "500",
    flex: 1,
  },
});
