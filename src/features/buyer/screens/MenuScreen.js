import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Building,
  Home,
  Briefcase,
  Calculator,
  ChevronRight,
  Check,
  Search,
  Layers,
  Sparkles,
  Crown,
  ChevronDown,
  ArrowUpRight,
  MapPin,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { enterOwnerFlow, ensureOwnerRole } from "../../../shared/api/users.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";
import { useOwner } from "../../owner/context/OwnerContext.js";
import { useAgent } from "../../agent/context/AgentContext.js";
import { AGENT_MODULE_ENABLED } from "../../../shared/constants/features.js";

const VERTICAL_TABS = [
  { id: "owner", label: "Owner Plan", icon: Crown },
  ...(AGENT_MODULE_ENABLED ? [{ id: "agent", label: "Agent Plan", icon: Briefcase }] : []),
];

/* 3 Agent Plans — 5 / 10 / 15 Chennai localities. Names, prices and limits
   match the tiers on AgentLocationSelectScreen so the flow stays consistent. */
const AGENT_PLANS = [
  {
    id: "agent-starter",
    name: "Agent Starter Plan",
    titlePrefix: "Starter ",
    titlePrefixColor: "#2563EB",
    titleColor: "#0F172A",
    price: "₹2,999",
    priceSub1: "5 localities • 30 days",
    priceSub2: "billed monthly",
    isPopular: false,
    buttonText: "Choose Plan",
    locationLimit: 5,
    features: [
      "Choose 5 Chennai localities",
      "Buyer enquiries from your areas",
      "Agent dashboard, leads & visits",
    ],
  },
  {
    id: "agent-pro",
    name: "Agent Pro Plan",
    titlePrefix: "Pro ",
    titlePrefixColor: "#2563EB",
    titleColor: "#0F172A",
    price: "₹6,999",
    priceSub1: "10 localities • 30 days",
    priceSub2: "billed monthly",
    isPopular: true,
    buttonText: "Choose Plan",
    locationLimit: 10,
    features: [
      "Choose 10 Chennai localities",
      "Buyer enquiries from your areas",
      "Agent dashboard, leads & visits",
    ],
  },
  {
    id: "agent-elite",
    name: "Agent Elite Plan",
    titlePrefix: "Elite ",
    titlePrefixColor: "#2563EB",
    titleColor: "#0F172A",
    price: "₹14,999",
    priceSub1: "15 localities • 30 days",
    priceSub2: "billed monthly",
    isPopular: false,
    buttonText: "Choose Plan",
    locationLimit: 15,
    features: [
      "Choose 15 Chennai localities",
      "Buyer enquiries from your areas",
      "Agent dashboard, leads & visits",
    ],
  },
];

const RESIDENTIAL_TYPES = [
  {
    name: "Apartment / Flat",
    count: "12,450+ Active",
    avgRate: "₹7,200/sqft",
    icon: Building,
  },
  {
    name: "Independent House",
    count: "4,820+ Active",
    avgRate: "₹9,800/sqft",
    icon: Home,
  },
  {
    name: "Residential Plot",
    count: "3,150+ Active",
    avgRate: "₹4,500/sqft",
    icon: Layers,
  },
  {
    name: "Luxury Penthouse",
    count: "620+ Active",
    avgRate: "₹14,500/sqft",
    icon: Sparkles,
  },
];

const COMMERCIAL_TYPES = [
  {
    name: "Tech Park & Office",
    count: "2,400+ Units",
    avgRate: "₹85/sqft rent",
    icon: Briefcase,
  },
  {
    name: "Retail Showroom",
    count: "1,850+ Units",
    avgRate: "₹140/sqft rent",
    icon: Building,
  },
  {
    name: "Commercial Building",
    count: "540+ Units",
    avgRate: "₹18,500/sqft buy",
    icon: Layers,
  },
  {
    name: "Warehouse / Logistics",
    count: "780+ Units",
    avgRate: "₹28/sqft rent",
    icon: Building,
  },
];

/* 4 Official Owner Plans */
const OWNER_PLANS = {
  residential: [
    {
      id: "owner-starter",
      name: "RESTAMP STARTER",
      titleColor: "#0F172A",
      price: "₹599",
      originalPrice: "₹1,198",
      priceNumeric: 599,
      validity: "30 Days",
      listingLimit: 1,
      priceSub1: "One-time payment · 30 Days",
      priceSub2: "1 property listing",
      isPopular: false,
      buttonText: "Choose Plan",
      features: [
        "Unlimited Leads",
        "City-Wide Reach",
      ],
    },
    {
      id: "owner-plus",
      name: "RESTAMP PLUS",
      titleColor: "#0F172A",
      price: "₹999",
      originalPrice: "₹1,998",
      priceNumeric: 999,
      validity: "30 Days",
      listingLimit: 2,
      priceSub1: "One-time payment · 30 Days",
      priceSub2: "2 property listings",
      isPopular: false,
      buttonText: "Choose Plan",
      features: [
        "Unlimited Leads",
        "City-Wide Reach",
      ],
    },
    {
      id: "owner-gold",
      name: "RESTAMP GOLD",
      titleColor: "#0F172A",
      price: "₹1,999",
      originalPrice: "₹3,998",
      priceNumeric: 1999,
      validity: "60 Days",
      listingLimit: 5,
      priceSub1: "One-time payment · 60 Days",
      priceSub2: "5 property listings",
      isPopular: true,
      buttonText: "Choose Plan",
      features: [
        "Unlimited Leads",
        "City-Wide Reach",
        "Relationship Manager Assistance",
      ],
    },
    {
      id: "owner-premium",
      name: "RESTAMP PREMIUM",
      titleColor: "#0F172A",
      price: "₹4,999",
      originalPrice: "₹9,998",
      priceNumeric: 4999,
      validity: "90 Days",
      listingLimit: 10,
      priceSub1: "One-time payment · 90 Days",
      priceSub2: "10 property listings",
      isPopular: false,
      buttonText: "Choose Plan",
      features: [
        "Unlimited Leads",
        "City-Wide Reach",
        "Relationship Manager Assistance",
        "Social Media Promotion Assistance",
      ],
    },
  ],
  commercial: [
    {
      id: "owner-comm-basic",
      name: "Commercial Free",
      titleColor: "#0F172A",
      price: "₹0",
      priceSub1: "free forever",
      priceSub2: "office & retail category",
      isPopular: false,
      buttonText: "Get started",
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
      priceSub1: "for 90 days validity",
      priceSub2: "+ GST • full tax credit",
      isPopular: true,
      buttonText: "Get started",
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
      priceSub1: "until leased / sold",
      priceSub2: "corporate advisory mandate",
      isPopular: false,
      buttonText: "Get started",
      features: [
        "Dedicated commercial account manager",
        "Tenant KYC & due diligence",
        "Commercial lease drafting & drone tour",
      ],
    },
  ],
};

// "for 90 days validity" -> "90 Days"; "until deal closed" -> "Until Deal Closed".
const planValidityLabel = (caption) => {
  const text = String(caption || "");
  const days = text.match(/(\d+)\s*days?/i);
  if (days) return `${days[1]} Days`;
  if (/until/i.test(text)) return text.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return "3 Months (90 Days)";
};

export default function MenuScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  // Guests log in first; the plan checkout resumes after login.
  const requireAuth = useRequireAuth(navigation);
  const { setSelectedPlanForCheckout } = useOwner();
  const [ownerSwitching, setOwnerSwitching] = useState(false);

  // P0 fix: backend requires the OWNER role for /owner/* endpoints.
  // Switch the backend role first (real POST /users/me/role, token
  // preserved), and only then navigate. Never logs out, never touches OTP.
  const handleOpenOwnerDashboard = async () => {
    if (ownerSwitching) return;
    setOwnerSwitching(true);
    try {
      await enterOwnerFlow(navigation, auth, "Dashboard");
    } finally {
      setOwnerSwitching(false);
    }
  };

  const { hasActivePlan, agentPlan } = useAgent();

  // Vertical tab: 'owner' | 'agent'. The agent dashboard links back here
  // with initialTab "agent" to upgrade or renew.
  const requestedTab = route?.params?.initialTab;
  const [activeVerticalTab, setActiveVerticalTab] = useState(
    VERTICAL_TABS.some((t) => t.id === requestedTab) ? requestedTab : "owner"
  );

  // Category: 'residential' | 'commercial'
  const [propertyCategory, setPropertyCategory] = useState("residential");

  // Locality + deal type for the "Search in <locality>" shortcut. No price,
  // rate, yield or valuation is computed: there is no verified price data.
  const [estLocality, setEstLocality] = useState("OMR");
  const [priceDealType, setPriceDealType] = useState("Buy"); // "Buy" | "Rent" | "Lease"

  const cyclePriceDealType = () => {
    if (priceDealType === "Buy") setPriceDealType("Rent");
    else if (priceDealType === "Rent") setPriceDealType("Lease");
    else setPriceDealType("Buy");
  };

  const handleNavigateToSearch = (params = {}) => {
    navigation.navigate("MainTabs", {
      screen: "Search",
      params: {
        locality: estLocality,
        dealType: priceDealType,
        category:
          propertyCategory === "commercial" ? "Commercial" : "Residential",
        ...params,
      },
    });
  };

  const handleSelectPlan = (plan, planRole) => {
    if (planRole === "Owner") {
      const priceNumeric =
        plan.priceNumeric !== undefined
          ? plan.priceNumeric
          : parseInt(String(plan.price).replace(/[^0-9]/g, ""), 10) || 0;

      // Free plan: no payment, straight to the Owner Dashboard.
      if (priceNumeric === 0) {
        handleOpenOwnerDashboard();
        return;
      }

      const planPayload = {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        originalPrice: plan.originalPrice,
        priceNumeric,
        validity: plan.validity || planValidityLabel(plan.priceSub1),
        listingLimit: plan.listingLimit || 1,
        features: plan.features,
      };

      try {
        setSelectedPlanForCheckout?.({
          ...planPayload,
          category: propertyCategory,
        });
      } catch (err) {
        // Safe fallback if context is unavailable
      }

      // Smooth direct navigation to OwnerPlanConfirm
      const rootNav = navigation?.getParent?.() || navigation;
      try {
        rootNav.navigate("OwnerPlanConfirm", { plan: planPayload });
      } catch (err) {
        navigation.navigate("OwnerPlanConfirm", { plan: planPayload });
      }
      return;
    }

    // Agent flow: choose Chennai localities -> confirm -> payment -> dashboard.
    if (planRole === "Agent") {
      navigation.navigate("AgentLocationSelect", {
        plan: {
          id: plan.id,
          name: plan.name,
          locationLimit: plan.locationLimit,
          price: plan.price,
          priceNumeric: parseInt(plan.price.replace(/[^0-9]/g, ""), 10),
          validity: "1 Month (30 Days)",
        },
      });
      return;
    }

    Alert.alert(
      `${plan.name} Selected`,
      `Proceed with ${plan.name} (${plan.price}) for your ${propertyCategory} property as an ${planRole}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: () => {
            Alert.alert(
              "Success",
              "Our dedicated listing manager will contact you within 15 minutes.",
            );
          },
        },
      ],
    );
  };


  // Determine current active plans array
  const isAgentTab = activeVerticalTab === "agent";
  const currentPlans = isAgentTab
    ? AGENT_PLANS
    : propertyCategory === "residential"
      ? OWNER_PLANS.residential
      : OWNER_PLANS.commercial;

  const safeTopPadding = Math.max(insets.top, Platform.OS === "ios" ? 48 : 14);

  return (
    <View style={styles.screenRoot}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Brand header lives on Home only; keep the safe-area inset. */}
      <View style={{ paddingTop: safeTopPadding }} />

      {/* ================= MAIN TWO-COLUMN VERTICAL TAB LAYOUT ================= */}
      <View style={styles.mainLayoutContainer}>
        {/* ================= LEFT COLUMN: VERTICAL TAB RAIL ================= */}
        <View style={styles.verticalTabRail}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
          >
            {VERTICAL_TABS.map((tab) => {
              const isActive = activeVerticalTab === tab.id;
              const Icon = tab.icon;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.railItem, isActive && styles.railItemActive]}
                  onPress={() => setActiveVerticalTab(tab.id)}
                  activeOpacity={0.75}
                >
                  {/* Left Active Indicator Bar */}
                  {isActive && <View style={styles.activeBarIndicator} />}

                  <View
                    style={[
                      styles.railIconWrap,
                      isActive && styles.railIconWrapActive,
                    ]}
                  >
                    <Icon
                      size={18}
                      color={isActive ? COLORS.primary : "#64748B"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.railItemText,
                      isActive && styles.railItemTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ================= RIGHT COLUMN: SCROLLABLE CONTENT PANE ================= */}
        <ScrollView
          style={styles.contentPane}
          contentContainerStyle={styles.contentPaneScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= OWNER PLAN / AGENT PLAN ================= */}
          {(activeVerticalTab === "owner" || isAgentTab) && (
            <View>
              {/* Header Info */}
              <View style={styles.paneHeader}>
                <View style={styles.headerRoleRow}>
                  <Text style={styles.paneMainTitle}>
                    {isAgentTab ? "Agent Plans" : "Owner Plans"}
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      isAgentTab ? styles.roleBadgeAgent : styles.roleBadgeOwner,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        isAgentTab ? styles.roleBadgeTextAgent : styles.roleBadgeTextOwner,
                      ]}
                    >
                      {isAgentTab ? "Partner" : "Individual"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Active agent plan: jump straight to the dashboard */}
              {isAgentTab && hasActivePlan && (
                <View style={styles.ownerTestBanner}>
                  <View style={styles.ownerTestLeft}>
                    <Crown size={17} color="#2563EB" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ownerTestTitle}>
                        {agentPlan?.name || "Agent plan"} active
                      </Text>
                      <Text style={styles.ownerTestSub}>
                        {agentPlan?.locationLimit || 0} localities
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.ownerTestBtn}
                    onPress={() => navigation.navigate("AgentNavigator")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ownerTestBtnText}>Dashboard</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.paneSectionHeader}>
                  CHOOSE A PLAN • {currentPlans.length} TIERS
                </Text>
              </View>

              {/* ================= COMPACT & SHORT REFERENCE PRICING CARDS ================= */}
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
                        <Text
                          style={{ color: plan.titlePrefixColor || "#2563EB" }}
                        >
                          {plan.titlePrefix}
                        </Text>
                      ) : null}
                      <Text style={{ color: plan.titleColor || "#0F172A" }}>
                        {plan.titlePrefix
                          ? plan.name
                              .replace(plan.titlePrefix.trim(), "")
                              .replace(/\s+/g, " ")
                              .trim()
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
                      plan.isPopular
                        ? styles.refCtaBtnPopular
                        : styles.refCtaBtnDefault,
                    ]}
                    activeOpacity={0.82}
                    onPress={() =>
                      handleSelectPlan(
                        plan,
                        isAgentTab ? "Agent" : "Owner",
                      )
                    }
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
            </View>
          )}

          {/* ================= PANE 3: PRICE ESTIMATOR & RATES (MODULAR FLIGHT-STYLE BLOCKS) ================= */}
          {activeVerticalTab === "price" && (
            <View>
              <View style={styles.paneHeader}>
                <Text style={styles.paneMainTitle}>
                  Locality Prices
                </Text>
                <Text style={styles.paneSubtitle}>
                  Pick a Chennai locality and search its live listings
                </Text>
              </View>

              {/* Modular Stack matching reference design */}
              <View style={styles.flightModuleStack}>
                {/* 2. Dark Block: Micro-Market Locality */}
                <View style={[styles.flightDarkCard, styles.flightDarkCardAlt]}>
                  <View style={styles.flightCardHeaderRow}>
                    <Text style={styles.flightCardLabel}>
                      MICRO-MARKET LOCALITY
                    </Text>
                    <MapPin size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.flightDarkValueText}>
                    {estLocality.toUpperCase()}
                  </Text>

                  {/* Horizontal Locality Switcher */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.flightLocalityChipsRow}
                  >
                    {[
                      "OMR",
                      "Anna Nagar",
                      "Adyar",
                      "Velachery",
                      "ECR",
                      "Porur",
                    ].map((loc) => (
                      <TouchableOpacity
                        key={loc}
                        style={[
                          styles.flightLocChip,
                          estLocality === loc && styles.flightLocChipActive,
                        ]}
                        onPress={() => setEstLocality(loc)}
                      >
                        <Text
                          style={[
                            styles.flightLocChipText,
                            estLocality === loc &&
                              styles.flightLocChipTextActive,
                          ]}
                        >
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 3. Light Block: Deal type for the Search shortcut (Tap to switch) */}
                <TouchableOpacity
                  style={styles.flightLightCard}
                  activeOpacity={0.8}
                  onPress={cyclePriceDealType}
                >
                  <Text style={styles.flightCardLabelLight}>
                    LOOKING TO
                  </Text>
                  <View style={styles.flightLightValueRow}>
                    <Text style={styles.flightLightValueText}>
                      {priceDealType === "Buy"
                        ? "BUY"
                        : priceDealType === "Rent"
                          ? "RENT"
                          : "LEASE"}
                    </Text>
                    <ChevronDown size={18} color="#64748B" />
                  </View>
                </TouchableOpacity>

                {/* 8. Full-Width Action Button (App Original Color) */}
                <TouchableOpacity
                  style={styles.flightSearchActionBtn}
                  activeOpacity={0.85}
                  onPress={() => handleNavigateToSearch()}
                >
                  <Text style={styles.flightSearchActionBtnText}>
                    Search in {estLocality}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rates Table */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.paneSectionHeader}>
                  CHENNAI LOCALITY RATES
                </Text>
              </View>
              <View style={styles.ratesCard}>
                <View style={styles.ratesEmptyRow}>
                  <Text style={styles.ratesEmptyTitle}>
                    Price trends are not available yet.
                  </Text>
                  <Text style={styles.ratesEmptySub}>
                    Verified locality prices, changes and rental yields will
                    appear here once real data is available.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ================= PANE 4: CHENNAI INSIGHTS ================= */}
          {activeVerticalTab === "insights" && (
            <View>
              <View style={styles.paneHeader}>
                <Text style={styles.paneMainTitle}>
                  Chennai Market Insights
                </Text>
                <Text style={styles.paneSubtitle}>
                  Search live listings across Chennai localities
                </Text>
              </View>

              {/* No verified market-insights source exists, so no statistics,
                  growth figures or guides are shown. */}
              <View style={styles.insightBox}>
                <Text style={styles.insightTitleText}>
                  Market insights are not available yet.
                </Text>
                <Text style={styles.insightDescText}>
                  Verified market data for Chennai localities will appear here
                  once it is available. You can still browse live listings.
                </Text>
                <TouchableOpacity
                  style={styles.insightLink}
                  onPress={() => handleNavigateToSearch()}
                >
                  <Text style={styles.insightLinkText}>
                    Explore Properties
                  </Text>
                  <ChevronRight size={13} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* ================= HEADER BAR ================= */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIconBg: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  logoTextAccent: {
    color: "#0E2773",
    fontWeight: "800",
  },
  hubBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  hubBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchOwnerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  switchOwnerText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  /* ================= MAIN TWO-COLUMN VERTICAL TAB LAYOUT ================= */
  mainLayoutContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },

  /* Left Column: Vertical Tab Rail */
  verticalTabRail: {
    width: 82,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  railContent: {
    paddingVertical: 10,
  },
  railItem: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 4,
  },
  railItemActive: {
    backgroundColor: "#F8FAFC",
  },
  activeBarIndicator: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  railIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  railIconWrapActive: {
    backgroundColor: "#EFF6FF",
  },
  railItemText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 14,
  },
  railItemTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  /* Right Column: Content Pane */
  contentPane: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentPaneScroll: {
    padding: 12,
    paddingBottom: 50,
  },

  /* Pane Header */
  paneHeader: {
    marginBottom: 10,
  },
  headerRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paneMainTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleBadgeOwner: {
    backgroundColor: "#EFF6FF",
  },
  roleBadgeAgent: {
    backgroundColor: "#FEF3C7",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  roleBadgeTextOwner: {
    color: COLORS.primary,
  },
  roleBadgeTextAgent: {
    color: "#B45309",
  },
  paneSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },

  /* Minimal Category Filter Pills */
  categoryPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#0F172A",
    borderWidth: 1.5,
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  categoryPillTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },

  sectionHeaderRow: {
    marginBottom: 8,
  },
  paneSectionHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.7,
  },

  /* ================= COMPACT & SHORT REFERENCE PRICING CARDS ================= */
  refCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 10,
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
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "600",
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
    fontWeight: "700",
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
    marginHorizontal: -15,
    marginTop: 10,
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

  /* ================= FLIGHT-STYLE MODULAR BLOCKS FOR PRICE ESTIMATOR ================= */
  flightModuleStack: {
    gap: 10,
    marginBottom: 16,
  },
  flightDarkCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  flightDarkCardAlt: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  flightCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  flightCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  flightDarkValueText: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  flightLocalityChipsRow: {
    marginTop: 10,
  },
  flightLocChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    backgroundColor: "#334155",
    marginRight: 6,
  },
  flightLocChipActive: {
    backgroundColor: COLORS.primary,
  },
  flightLocChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  flightLocChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* Light Cards with Chevron */
  flightLightCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  flightCardLabelLight: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  flightLightValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  flightLightValueText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },

  /* Split Cards Row */

  /* Stepper Counter Card */

  /* Big Search Button (Original App Color) */
  flightSearchActionBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 2,
  },
  flightSearchActionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Rates Table */
  ratesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  ratesEmptyRow: {
    paddingVertical: 14,
  },
  ratesEmptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratesEmptySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  /* Insights Box */
  insightBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 10,
  },
  insightTitleText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  insightDescText: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 8,
  },
  insightLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightLinkText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
    marginRight: 2,
  },
  activePlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  activePlanLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  activePlanTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  activePlanSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  activePlanBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  activePlanBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ownerTestBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  ownerTestLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  ownerTestTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E40AF",
  },
  ownerTestSub: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 1,
  },
  ownerTestBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 10,
  },
  ownerTestBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
