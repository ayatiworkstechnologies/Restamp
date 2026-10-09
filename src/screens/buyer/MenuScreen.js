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
  Building2,
  Home,
  Briefcase,
  TrendingUp,
  Calculator,
  ChevronRight,
  ShieldCheck,
  Check,
  Search,
  Layers,
  Sparkles,
  Crown,
  Plus,
  Minus,
  ChevronDown,
  ArrowUpRight,
  MapPin,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import RestampLogo from "../../components/RestampLogo";
import { useAgent } from "../../context/AgentContext";
import { useAuth } from "../../context/AuthContext";
import { enterOwnerFlow } from "../../api/users";

const VERTICAL_TABS = [
  { id: "owner", label: "Owner Plan", icon: Crown },
  { id: "agent", label: "Agent Plan", icon: Briefcase },
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

/* 3 Compact Owner Plans */
const OWNER_PLANS = {
  residential: [
    {
      id: "owner-basic",
      name: "Basic",
      titleColor: "#0F172A",
      price: "₹0",
      priceSub1: "free forever",
      priceSub2: "zero brokerage assurance",
      isPopular: false,
      buttonText: "Get started",
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
      priceSub1: "for 90 days validity",
      priceSub2: "+ GST • verified owner tag",
      isPopular: true,
      buttonText: "Get started",
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
      priceSub1: "until deal closed",
      priceSub2: "full managed advisory",
      isPopular: false,
      buttonText: "Get started",
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

/* 3 Compact Agent Plans */
const AGENT_PLANS = {
  residential: [
    {
      id: "agent-starter",
      name: "Agent Starter (5 Locations)",
      titleColor: "#0F172A",
      price: "₹2,999",
      priceSub1: "Suitable for local agents",
      priceSub2: "billed monthly • 30 days validity",
      isPopular: false,
      buttonText: "Choose Plan",
      locationLimit: 5,
      features: [
        "5 Selected Chennai Localities",
        "Owner-posted properties access",
        "40 Verified buyer & tenant leads",
      ],
    },
    {
      id: "agent-pro",
      name: "Agent Pro (10 Locations)",
      titlePrefix: "Pro ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹6,999",
      priceSub1: "Recommended • High coverage",
      priceSub2: "billed monthly • 30 days validity",
      isPopular: true,
      buttonText: "Choose Plan",
      locationLimit: 10,
      features: [
        "10 Selected Chennai Localities",
        "Full owner contact & property matching",
        "150 Verified buyer & tenant leads",
      ],
    },
    {
      id: "agent-agency",
      name: "Elite Agency (15 Locations)",
      titlePrefix: "Elite ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹14,999",
      priceSub1: "Maximum coverage",
      priceSub2: "billed monthly • 30 days validity",
      isPopular: false,
      buttonText: "Choose Plan",
      locationLimit: 15,
      features: [
        "15 Selected Chennai Localities",
        "500+ Verified HNI buyer leads",
        "Priority visit coordination & CRM sync",
      ],
    },
  ],
  commercial: [
    {
      id: "comm-agent-starter",
      name: "Commercial (5 Locations)",
      titleColor: "#0F172A",
      price: "₹4,999",
      priceSub1: "Suitable for local agents",
      priceSub2: "billed monthly • 30 days validity",
      isPopular: false,
      buttonText: "Choose Plan",
      locationLimit: 5,
      features: [
        "5 Commercial Hub Localities",
        "Verified office & retail tenants",
        "Commercial lead CRM",
      ],
    },
    {
      id: "comm-agent-pro",
      name: "Corporate Partner (10 Locations)",
      titlePrefix: "Corporate ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹9,999",
      priceSub1: "Recommended • Top IT hubs",
      priceSub2: "billed monthly • 30 days validity",
      isPopular: true,
      buttonText: "Choose Plan",
      locationLimit: 10,
      features: [
        "10 Commercial Hub Localities",
        "200+ Corporate tenant contacts",
        "Top category placement for IT hubs",
      ],
    },
    {
      id: "comm-agent-elite",
      name: "Developer Mandate (15 Locations)",
      titlePrefix: "Developer ",
      titlePrefixColor: "#2563EB",
      titleColor: "#0F172A",
      price: "₹19,999",
      priceSub1: "Maximum coverage",
      priceSub2: "billed monthly • 30 days validity",
      isPopular: false,
      buttonText: "Choose Plan",
      locationLimit: 15,
      features: [
        "15 Prime Business Corridors",
        "Institutional tenant network",
        "Exclusive mandate marketing",
      ],
    },
  ],
};

const CHENNAI_PRICE_TRENDS = [
  {
    locality: "Anna Nagar",
    avgPrice: "₹12,800/sqft",
    change: "+8.4%",
    rentYield: "3.8%",
  },
  {
    locality: "OMR IT Corridor",
    avgPrice: "₹6,850/sqft",
    change: "+11.2%",
    rentYield: "4.6%",
  },
  {
    locality: "Adyar & Besant Nagar",
    avgPrice: "₹14,500/sqft",
    change: "+6.1%",
    rentYield: "3.2%",
  },
  {
    locality: "Velachery",
    avgPrice: "₹8,200/sqft",
    change: "+9.0%",
    rentYield: "4.2%",
  },
  {
    locality: "ECR Coastal Strip",
    avgPrice: "₹10,200/sqft",
    change: "+13.5%",
    rentYield: "5.1%",
  },
  {
    locality: "Porur & West Chennai",
    avgPrice: "₹6,100/sqft",
    change: "+7.8%",
    rentYield: "4.4%",
  },
];

const MARKET_INSIGHTS = [
  {
    title: "Chennai Metro Phase 2 Impact",
    summary:
      "Corridors near Porur and OMR Sholinganallur seeing 15% increase in capital appreciation ahead of metro line completion.",
    tag: "High Growth",
  },
  {
    title: "Commercial Grade-A Tech Parks",
    summary:
      "Record 4.2 million sq ft gross absorption in Chennai tech parks driven by Global Capability Centers (GCCs).",
    tag: "Commercial Demand",
  },
  {
    title: "CMDA & DTCP Approval Guide",
    summary:
      "Essential checklist to verify layout regularization, parent deeds, and RERA registration before buying land in Tamil Nadu.",
    tag: "Legal Guide",
  },
];

const PROPERTY_TYPE_OPTIONS = [
  "Apartment / Flat",
  "Independent House",
  "Residential Plot",
  "Commercial Office",
];

export default function MenuScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { hasActivePlan, agentPlan } = useAgent();
  const auth = useAuth();
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

  // Vertical Tab state: 'owner' | 'agent' | 'price' | 'insights'
  const [activeVerticalTab, setActiveVerticalTab] = useState(
    route?.params?.initialTab || "owner"
  );

  // Category: 'residential' | 'commercial'
  const [propertyCategory, setPropertyCategory] = useState("residential");

  // Price Estimator state (Modular Reference Style)
  const [estLocality, setEstLocality] = useState("OMR");
  const [estSqft, setEstSqft] = useState("1500");
  const [priceDealType, setPriceDealType] = useState("Buy"); // "Buy" | "Rent" | "Lease"
  const [pricePropertyType, setPricePropertyType] =
    useState("Apartment / Flat");

  const getLocalityData = () => {
    switch (estLocality) {
      case "Anna Nagar":
        return { rate: 12800, yield: "3.8%", change: "+8.4%" };
      case "Adyar":
        return { rate: 14500, yield: "3.2%", change: "+6.1%" };
      case "Velachery":
        return { rate: 8200, yield: "4.2%", change: "+9.0%" };
      case "ECR":
        return { rate: 10200, yield: "5.1%", change: "+13.5%" };
      case "Porur":
        return { rate: 6100, yield: "4.4%", change: "+7.8%" };
      default:
        return { rate: 6850, yield: "4.6%", change: "+11.2%" };
    }
  };

  const calculateEstimate = () => {
    const sqftNum = parseInt(estSqft) || 1200;
    const data = getLocalityData();
    if (priceDealType === "Rent") {
      const yieldPct = parseFloat(data.yield) / 100;
      const monthlyRent = Math.round((sqftNum * data.rate * yieldPct) / 12);
      return `₹${monthlyRent.toLocaleString("en-IN")}/mo`;
    } else if (priceDealType === "Lease") {
      const leaseAmt = Math.round(sqftNum * data.rate * 0.22);
      return `₹${(leaseAmt / 100000).toFixed(1)} Lakhs`;
    } else {
      const totalPrice = sqftNum * data.rate;
      if (totalPrice >= 10000000) {
        return `₹${(totalPrice / 10000000).toFixed(2)} Cr`;
      }
      return `₹${(totalPrice / 100000).toFixed(1)} Lakhs`;
    }
  };

  const handleDecrementSqft = () => {
    const current = parseInt(estSqft) || 1200;
    setEstSqft(Math.max(300, current - 100).toString());
  };

  const handleIncrementSqft = () => {
    const current = parseInt(estSqft) || 1200;
    setEstSqft((current + 100).toString());
  };

  const cyclePriceDealType = () => {
    if (priceDealType === "Buy") setPriceDealType("Rent");
    else if (priceDealType === "Rent") setPriceDealType("Lease");
    else setPriceDealType("Buy");
  };

  const cyclePropertyType = () => {
    const idx = PROPERTY_TYPE_OPTIONS.indexOf(pricePropertyType);
    const nextIdx = (idx + 1) % PROPERTY_TYPE_OPTIONS.length;
    setPricePropertyType(PROPERTY_TYPE_OPTIONS[nextIdx]);
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
      // Switch backend role to OWNER first, then open Owner Dashboard.
      handleOpenOwnerDashboard();
      return;
    }

    if (planRole === "Agent") {
      navigation.navigate("AgentLocationSelect", {
        plan: {
          id: plan.id,
          name: plan.name,
          locationLimit: plan.locationLimit || (plan.name?.includes("15") ? 15 : plan.name?.includes("5") ? 5 : 10),
          price: plan.price,
          priceNumeric: parseInt(plan.price?.replace(/[^0-9]/g, "")) || 6999,
          validity: "1 Month (30 Days)",
          category: propertyCategory,
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
  const currentPlans =
    activeVerticalTab === "owner"
      ? propertyCategory === "residential"
        ? OWNER_PLANS.residential
        : OWNER_PLANS.commercial
      : propertyCategory === "residential"
        ? AGENT_PLANS.residential
        : AGENT_PLANS.commercial;

  const safeTopPadding = Math.max(insets.top, Platform.OS === "ios" ? 48 : 14);
  const currentLocData = getLocalityData();

  return (
    <View style={styles.screenRoot}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ================= HEADER BAR ================= */}
      <View style={[styles.header, { paddingTop: safeTopPadding }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIconBg}>
            <RestampLogo size={26} />
          </View>
          <Text style={styles.logoText}>
            Res<Text style={styles.logoTextAccent}>tamp</Text>
          </Text>
          <View style={styles.hubBadge}>
            <Text style={styles.hubBadgeText}>SERVICES</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.switchOwnerPill}
            activeOpacity={0.8}
            onPress={handleOpenOwnerDashboard}
            disabled={ownerSwitching}
          >
            <Building2 size={13} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={styles.switchOwnerText}>Owner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Home");
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

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
                  onPress={() => {
                    if (tab.id === "agent") {
                      navigation.navigate("AgentLocationSelect");
                    } else {
                      setActiveVerticalTab(tab.id);
                    }
                  }}
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
          {/* ================= PANE 1 & 2: OWNER PLAN / AGENT PLAN ================= */}
          {(activeVerticalTab === "owner" || activeVerticalTab === "agent") && (
            <View>
              {/* Header Info */}
              <View style={styles.paneHeader}>
                <View style={styles.headerRoleRow}>
                  <Text style={styles.paneMainTitle}>
                    {activeVerticalTab === "owner"
                      ? "Owner Plans"
                      : "Agent Plans"}
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      activeVerticalTab === "owner"
                        ? styles.roleBadgeOwner
                        : styles.roleBadgeAgent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        activeVerticalTab === "owner"
                          ? styles.roleBadgeTextOwner
                          : styles.roleBadgeTextAgent,
                      ]}
                    >
                      {activeVerticalTab === "owner" ? "Individual" : "Partner"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.paneSubtitle}>
                  {activeVerticalTab === "owner"
                    ? "Direct buyer inquiries • 0% brokerage in Chennai"
                    : "Micromarket boost • Verified corporate & HNI leads"}
                </Text>
              </View>

              {/* Quick Direct Owner Access Banner (Testing - Skip Payment) */}
              {activeVerticalTab === "owner" && (
                <View style={styles.ownerTestBanner}>
                  <View style={styles.ownerTestLeft}>
                    <Building2 size={17} color="#2563EB" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ownerTestTitle}>Owner Mode (Testing)</Text>
                      <Text style={styles.ownerTestSub}>
                        Skip payment & open Owner Dashboard
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.ownerTestBtn}
                    onPress={handleOpenOwnerDashboard}
                    disabled={ownerSwitching}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ownerTestBtnText}>Open</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Active Plan Quick Access Banner for Agents */}
              {activeVerticalTab === "agent" && hasActivePlan && (
                <View style={styles.activePlanBanner}>
                  <View style={styles.activePlanLeft}>
                    <Crown size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activePlanTitle}>{agentPlan?.name || "Agent Pro"} Active</Text>
                      <Text style={styles.activePlanSub}>
                        {agentPlan?.locationLimit || 10} Locations • {agentPlan?.daysRemaining || 24} Days Left
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.activePlanBtn}
                    onPress={() => navigation.navigate("AgentNavigator")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.activePlanBtnText}>Dashboard</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.paneSectionHeader}>
                  CHOOSE A PLAN • 3 TIERS
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
                        activeVerticalTab === "owner" ? "Owner" : "Agent",
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
                  Price Estimator & Rates
                </Text>
                <Text style={styles.paneSubtitle}>
                  Real-time micro-market valuation and sqft rates across Chennai
                </Text>
              </View>

              {/* Modular Stack matching reference design */}
              <View style={styles.flightModuleStack}>
                {/* 1. Dark Block: Estimated Valuation Output */}
                <View style={styles.flightDarkCard}>
                  <View style={styles.flightCardHeaderRow}>
                    <Text style={styles.flightCardLabel}>
                      CHENNAI, TN • VALUATION RESULT
                    </Text>
                    <TrendingUp size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.flightDarkValueText}>
                    {calculateEstimate()}
                  </Text>
                  <Text style={styles.flightDarkSubText}>
                    Based on {estSqft} sqft • {priceDealType} in {estLocality}
                  </Text>
                </View>

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

                {/* 3. Light Block: Valuation Mode (Tap to switch) */}
                <TouchableOpacity
                  style={styles.flightLightCard}
                  activeOpacity={0.8}
                  onPress={cyclePriceDealType}
                >
                  <Text style={styles.flightCardLabelLight}>
                    VALUATION TYPE
                  </Text>
                  <View style={styles.flightLightValueRow}>
                    <Text style={styles.flightLightValueText}>
                      {priceDealType === "Buy"
                        ? "BUY / SALE VALUE"
                        : priceDealType === "Rent"
                          ? "MONTHLY RENT"
                          : "LONG LEASE VALUE"}
                    </Text>
                    <ChevronDown size={18} color="#64748B" />
                  </View>
                </TouchableOpacity>

                {/* 4. Light Block: Property Type (Tap to switch) */}
                <TouchableOpacity
                  style={styles.flightLightCard}
                  activeOpacity={0.8}
                  onPress={cyclePropertyType}
                >
                  <Text style={styles.flightCardLabelLight}>PROPERTY TYPE</Text>
                  <View style={styles.flightLightValueRow}>
                    <Text style={styles.flightLightValueText}>
                      {pricePropertyType.toUpperCase()}
                    </Text>
                    <ChevronDown size={18} color="#64748B" />
                  </View>
                </TouchableOpacity>

                {/* 5 & 6. Side-by-Side Split Cards (Rate & Yield) */}
                <View style={styles.flightSplitRow}>
                  <View style={styles.flightSplitCard}>
                    <Text style={styles.flightCardLabelLight}>
                      AVG SQ FT RATE
                    </Text>
                    <Text style={styles.flightSplitValue}>
                      ₹{currentLocData.rate}/sqft
                    </Text>
                  </View>

                  <View style={styles.flightSplitCard}>
                    <Text style={styles.flightCardLabelLight}>
                      RENTAL YIELD
                    </Text>
                    <Text style={styles.flightSplitValue}>
                      {currentLocData.yield} AVG
                    </Text>
                  </View>
                </View>

                {/* 7. Stepper Counter Block (Built-Up Area [ - ] [ + ]) */}
                <View style={styles.flightStepperCard}>
                  <Text style={styles.flightCardLabelLight}>BUILT-UP AREA</Text>
                  <View style={styles.flightStepperValueRow}>
                    <Text style={styles.flightStepperValueText}>
                      {estSqft} SQ FT
                    </Text>

                    <View style={styles.flightStepperControls}>
                      <TouchableOpacity
                        style={styles.flightStepBtn}
                        onPress={handleDecrementSqft}
                        activeOpacity={0.7}
                      >
                        <Minus size={16} color="#0F172A" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.flightStepBtn}
                        onPress={handleIncrementSqft}
                        activeOpacity={0.7}
                      >
                        <Plus size={16} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

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
                {CHENNAI_PRICE_TRENDS.map((trend, tIdx) => (
                  <View
                    key={trend.locality}
                    style={[
                      styles.rateItemRow,
                      tIdx < CHENNAI_PRICE_TRENDS.length - 1 &&
                        styles.rateItemBorder,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rateLocalityText}>
                        {trend.locality}
                      </Text>
                      <Text style={styles.rateYieldText}>
                        Yield: {trend.rentYield}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.ratePriceText}>{trend.avgPrice}</Text>
                      <Text style={styles.rateGrowthText}>{trend.change}</Text>
                    </View>
                  </View>
                ))}
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
                  Market intelligence, growth corridors, and CMDA approval
                  checklists
                </Text>
              </View>

              {MARKET_INSIGHTS.map((insight, idx) => (
                <View key={idx} style={styles.insightBox}>
                  <View style={styles.insightTagBadge}>
                    <Text style={styles.insightTagBadgeText}>
                      {insight.tag}
                    </Text>
                  </View>
                  <Text style={styles.insightTitleText}>{insight.title}</Text>
                  <Text style={styles.insightDescText}>{insight.summary}</Text>
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
              ))}

              <View style={styles.shieldCard}>
                <ShieldCheck
                  size={20}
                  color="#16A34A"
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shieldTitle}>CMDA & RERA Verified</Text>
                  <Text style={styles.shieldSub}>
                    RESTAMP inspects parent title deeds and approval layouts
                    before listing.
                  </Text>
                </View>
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
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  logoText: {
    fontSize: 21,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  logoTextAccent: {
    color: COLORS.primary,
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
  flightDarkSubText: {
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 2,
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
  flightSplitRow: {
    flexDirection: "row",
    gap: 10,
  },
  flightSplitCard: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  flightSplitValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  /* Stepper Counter Card */
  flightStepperCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  flightStepperValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  flightStepperValueText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  flightStepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flightStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Big Search Button (Original App Color) */
  flightSearchActionBtn: {
    height: 48,
    borderRadius: 14,
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
  rateItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  rateItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rateLocalityText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  rateYieldText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  ratePriceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  rateGrowthText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#16A34A",
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
  insightTagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    marginBottom: 6,
  },
  insightTagBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
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
  shieldCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 12,
  },
  shieldTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#15803D",
  },
  shieldSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
    lineHeight: 15,
  },
  activePlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F7FF",
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
    borderRadius: 100,
  },
  ownerTestBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
