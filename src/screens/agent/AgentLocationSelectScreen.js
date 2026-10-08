import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Check,
  MapPin,
  Crown,
  X,
  MoreVertical,
  Sparkles,
} from "lucide-react-native";
import COLORS from "../../constants/colors";

const ALL_LOCALITY_NAMES = [
  "Anna Nagar",
  "Kilpauk",
  "Mogappair",
  "Adyar",
  "Velachery",
  "T. Nagar",
  "Porur",
  "Guindy",
  "Nungambakkam",
  "Tambaram",
  "Alwarpet",
  "Besant Nagar",
  "ECR",
  "OMR",
  "Thiruvanmiyur",
  "Vadapalani",
  "Ambattur",
  "Kodambakkam",
  "Perambur",
  "Medavakkam",
  "Perungudi",
  "Sholinganallur",
  "Kotturpuram",
  "Mylapore",
  "Royapettah",
];

export default function AgentLocationSelectScreen({ route, navigation }) {
  // Plan passed from MenuScreen
  const initialPlan = route?.params?.plan || {
    id: "agent-pro",
    name: "Agent Pro Plan",
    locationLimit: 10,
    price: "₹6,999",
    priceNumeric: 6999,
    validity: "30 Days",
  };

  const [currentPlan, setCurrentPlan] = useState(initialPlan);
  const locationLimit = currentPlan.locationLimit || 10;

  // Selected localities state
  const initialSelected = route?.params?.selectedLocalities || [
    "Anna Nagar",
    "Kilpauk",
    "Mogappair",
    "Adyar",
  ];
  const [selectedLocalities, setSelectedLocalities] = useState(
    initialSelected.slice(0, locationLimit)
  );
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCount = selectedLocalities.length;
  const isLimitReached = selectedCount >= locationLimit;

  // Plan tiers for quick switching if user wants to upgrade/downgrade
  const PLAN_TIERS = [
    {
      limit: 5,
      label: "5 Locations",
      name: "Starter Agent",
      titlePrefix: "Starter ",
      titleSuffix: "Agent (5 Locations)",
      price: "₹2,999",
      priceSub1: "Essential coverage",
      priceSub2: "billed monthly • 30 days validity",
      badge: null,
      features: [
        "5 Selected Chennai Localities",
        "Direct owner contact matching",
        "40 Verified buyer & tenant leads",
      ],
    },
    {
      limit: 10,
      label: "10 Locations",
      name: "Pro Agent",
      titlePrefix: "Pro ",
      titleSuffix: "Agent (10 Locations)",
      price: "₹6,999",
      priceSub1: "Recommended • High coverage",
      priceSub2: "billed monthly • 30 days validity",
      badge: "POPULAR",
      features: [
        "10 Selected Chennai Localities",
        "Full owner contact & property matching",
        "150 Verified buyer & tenant leads",
      ],
    },
    {
      limit: 15,
      label: "15 Locations",
      name: "Elite Agency",
      titlePrefix: "Elite ",
      titleSuffix: "Agency (15 Locations)",
      price: "₹14,999",
      priceSub1: "Maximum coverage",
      priceSub2: "billed monthly • 30 days validity",
      badge: null,
      features: [
        "15 Selected Chennai Localities",
        "500+ Verified HNI buyer leads",
        "Priority visit coordination & CRM sync",
      ],
    },
  ];

  const handleSelectTier = (tier) => {
    setCurrentPlan((prev) => ({
      ...prev,
      name: tier.name,
      locationLimit: tier.limit,
      price: tier.price,
      priceNumeric: parseInt(tier.price.replace(/[^0-9]/g, "")) || 6999,
    }));
    // If current selection exceeds new limit, slice it
    if (selectedLocalities.length > tier.limit) {
      setSelectedLocalities((prev) => prev.slice(0, tier.limit));
    }
  };

  // Filter localities based on search
  const filteredLocalities = useMemo(() => {
    if (!searchQuery.trim()) return ALL_LOCALITY_NAMES;
    const q = searchQuery.toLowerCase().trim();
    return ALL_LOCALITY_NAMES.filter((loc) => loc.toLowerCase().includes(q));
  }, [searchQuery]);

  const toggleLocality = (locName) => {
    if (selectedLocalities.includes(locName)) {
      setSelectedLocalities((prev) => prev.filter((item) => item !== locName));
    } else {
      if (isLimitReached) {
        Alert.alert(
          "Limit Reached",
          `You have reached your ${locationLimit}-location limit for this plan. You can upgrade to a higher tier or deselect an existing location.`
        );
        return;
      }
      setSelectedLocalities((prev) => [...prev, locName]);
    }
  };

  const handleContinue = () => {
    if (selectedCount === 0) {
      Alert.alert("Selection Required", "Please select at least 1 locality to continue.");
      return;
    }
    navigation.navigate("AgentPlanConfirm", {
      plan: currentPlan,
      selectedLocalities,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER: Circular Back Button | Centered Title | Circular More Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111111" strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Choose Your Locations</Text>
          <Text style={styles.headerSubtitle}>
            {selectedCount} of {locationLimit} Localities Selected
          </Text>
        </View>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() =>
            Alert.alert(
              "Location Coverage",
              `Select up to ${locationLimit} prime locations in Chennai where you want to receive exclusive buyer enquiries.`
            )
          }
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={20} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 3 Small Cards in 1 Row (Simplified, No Button, Matching Reference Design) */}
        <View style={styles.tierCardsRowSection}>
          <View style={styles.tierHeaderRow}>
            <Text style={styles.tierSectionTitle}>CHOOSE COVERAGE TIER</Text>
            <Text style={styles.tierSectionSubtitle}>
              {locationLimit} Localities Active
            </Text>
          </View>

          <View style={styles.tierCardsRow}>
            {PLAN_TIERS.map((tier) => {
              const isTierActive = locationLimit === tier.limit;
              return (
                <TouchableOpacity
                  key={tier.limit}
                  style={[
                    styles.smallTierCard,
                    isTierActive
                      ? styles.smallTierCardActive
                      : styles.smallTierCardInactive,
                  ]}
                  onPress={() => handleSelectTier(tier)}
                  activeOpacity={0.82}
                >
                  {/* Floating Popular Badge */}
                  {tier.badge && (
                    <View style={styles.smallBadgePopular}>
                      <Sparkles size={8} color="#FFFFFF" style={{ marginRight: 2 }} />
                      <Text style={styles.smallBadgePopularText}>{tier.badge}</Text>
                    </View>
                  )}

                  {/* Row 1: Plan Name */}
                  <Text style={styles.smallTierName}>
                    {tier.titlePrefix.trim()}
                  </Text>

                  {/* Row 2: Location Count */}
                  <Text style={styles.smallTierLoc}>
                    {tier.limit} Locations
                  </Text>

                  {/* Price */}
                  <Text
                    style={[
                      styles.smallTierPrice,
                      isTierActive && styles.smallTierPriceActive,
                    ]}
                  >
                    {tier.price}
                  </Text>

                  {/* Subtext */}
                  <Text style={styles.smallTierSub}>30 Days</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Localities Chips Carousel */}
        {selectedLocalities.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionLabel}>
              Selected Localities ({selectedLocalities.length})
            </Text>
            <View style={styles.selectedChipsWrap}>
              {selectedLocalities.map((loc) => (
                <View key={loc} style={styles.selectedLocalityChip}>
                  <MapPin size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.selectedLocalityChipText}>{loc}</Text>
                  <TouchableOpacity
                    onPress={() => toggleLocality(loc)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeChipBtn}
                  >
                    <X size={12} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Search Field */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputRow}>
            <Search size={18} color="#94A3B8" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Chennai locality..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Localities List Card */}
        <View style={styles.localitiesCard}>
          {filteredLocalities.map((loc, index) => {
            const isSelected = selectedLocalities.includes(loc);
            const isDisabled = isLimitReached && !isSelected;
            const isLast = index === filteredLocalities.length - 1;

            return (
              <TouchableOpacity
                key={loc}
                style={[
                  styles.localityRow,
                  !isLast && styles.localityRowBorder,
                  isDisabled && styles.localityRowDisabled,
                ]}
                onPress={() => toggleLocality(loc)}
                activeOpacity={isDisabled ? 1 : 0.75}
              >
                <View style={styles.localityLeft}>
                  <View style={[styles.pinIconBox, isSelected && styles.pinIconBoxSelected]}>
                    <MapPin size={16} color={isSelected ? "#2563EB" : "#64748B"} />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.localityName,
                        isSelected && styles.localityNameSelected,
                        isDisabled && styles.localityNameDisabled,
                      ]}
                    >
                      {loc}
                    </Text>
                    <Text style={styles.localityRegion}>Chennai Prime Zone</Text>
                  </View>
                </View>

                {/* Right Circle Check Indicator */}
                <View
                  style={[
                    styles.radioCircle,
                    isSelected ? styles.radioCircleSelected : styles.radioCircleUnselected,
                    isDisabled && styles.radioCircleDisabled,
                  ]}
                >
                  {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* BOTTOM FIXED CTA: Sleek Rounded Pill "Continue" */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, selectedCount === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={selectedCount === 0}
          activeOpacity={0.88}
        >
          <Text style={[styles.continueBtnText, selectedCount === 0 && styles.continueBtnTextDisabled]}>
            Continue ({selectedCount}/{locationLimit})
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "400",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  tierCardsRowSection: {
    marginBottom: 16,
    paddingTop: 10,
  },
  tierHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tierSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tierSectionSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  tierCardsRow: {
    flexDirection: "row",
    gap: 8,
  },
  smallTierCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    position: "relative",
  },
  smallTierCardActive: {
    borderColor: "#2563EB",
    borderWidth: 2,
    backgroundColor: "#EFF6FF",
    shadowColor: "#2563EB",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  smallTierCardInactive: {
    borderColor: "#E2E8F0",
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  smallBadgePopular: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 9,
    zIndex: 10,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  smallBadgePopularText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  smallTierName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
    textAlign: "center",
  },
  smallTierLoc: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 2,
  },
  smallTierPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 4,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  smallTierPriceActive: {
    color: "#2563EB",
  },
  smallTierSub: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
  },
  selectedSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectedChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedLocalityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedLocalityChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2563EB",
    marginRight: 4,
  },
  removeChipBtn: {
    padding: 2,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111111",
    fontWeight: "500",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  localitiesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  localityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  localityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  localityRowDisabled: {
    opacity: 0.45,
  },
  localityLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pinIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pinIconBoxSelected: {
    backgroundColor: "#EFF6FF",
  },
  localityName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111111",
  },
  localityNameSelected: {
    fontWeight: "600",
    color: "#2563EB",
  },
  localityNameDisabled: {
    color: "#94A3B8",
  },
  localityRegion: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleSelected: {
    backgroundColor: "#2563EB",
  },
  radioCircleUnselected: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  radioCircleDisabled: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: "#FFFFFF",
  },
  continueBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  continueBtnDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  continueBtnTextDisabled: {
    color: "#94A3B8",
  },
});
