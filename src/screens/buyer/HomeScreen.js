import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Home as HomeIcon,
  Building2,
  Building,
  Briefcase,
  LayoutGrid,
  Bell,
  Menu,
  Search,
  XCircle,
  Heart,
  CheckCircle2,
  Check,
  Star,
  MapPin,
  Sparkles,
  TrendingUp,
  Tag,
  Info,
  X,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import TYPOGRAPHY from "../../constants/typography";
import {
  PROPERTY_TYPES,
  CHENNAI_LOCALITIES,
  RECOMMENDED_PROPERTIES,
  VERIFIED_PROPERTIES,
  RECENTLY_ADDED,
  ALL_PROPERTIES,
  NEWLY_LAUNCHED_PROJECTS,
  DEMAND_DATA,
} from "../../data/properties";
import { useWishlist } from "../../context/WishlistContext";
import { useOwner } from "../../context/OwnerContext";
import { useAuth } from "../../context/AuthContext";
import { enterOwnerFlow } from "../../api/users";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import RestampLogo from "../../components/RestampLogo";
import SearchPropertyModal from "../../components/SearchPropertyModal";
import { apiGet } from "../../api/client";
import { toUiProperty } from "../../api/mappers";
import SafeImage from "../../components/common/SafeImage";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.78;
const REC_CARD_WIDTH = Math.min(170, Math.max(130, Math.round((width - 40) / 2.45)));
const PROJECT_CARD_WIDTH = Math.min(320, width * 0.84);
const DEMAND_CARD_WIDTH = Math.min(270, width * 0.72);

// MANUAL BANNER HEIGHT CONTROL (Change this value to adjust the banner height)
const POST_PROPERTY_BANNER_HEIGHT = 130;

const DEAL_TYPES = ["Buy", "Resale", "Rent", "Lease"];

const LOCALITY_LIST = [
  "Anna Nagar",
  "OMR",
  "Velachery",
  "ECR",
  "T. Nagar",
  "Tambaram",
  "Adyar",
  "Guindy",
];

const BUDGET_OPTIONS = [
  "All Budgets",
  "Under ₹50L",
  "₹50L - ₹1Cr",
  "₹1Cr - ₹2Cr",
  "₹2Cr+",
];

const BUY_MIN_BUDGETS = [
  { label: "Min Amount", value: 0 },
  { label: "₹20 Lacs", value: 2000000 },
  { label: "₹40 Lacs", value: 4000000 },
  { label: "₹60 Lacs", value: 6000000 },
  { label: "₹80 Lacs", value: 8000000 },
  { label: "₹1 Crore", value: 10000000 },
  { label: "₹1.5 Crore", value: 15000000 },
  { label: "₹2 Crore", value: 20000000 },
  { label: "₹3 Crore", value: 30000000 },
  { label: "₹5 Crore", value: 50000000 },
];

const BUY_MAX_BUDGETS = [
  { label: "High / Max Amount", value: Infinity },
  { label: "₹40 Lacs", value: 4000000 },
  { label: "₹60 Lacs", value: 6000000 },
  { label: "₹80 Lacs", value: 8000000 },
  { label: "₹1 Crore", value: 10000000 },
  { label: "₹1.5 Crore", value: 15000000 },
  { label: "₹2 Crore", value: 20000000 },
  { label: "₹3 Crore", value: 30000000 },
  { label: "₹5 Crore", value: 50000000 },
  { label: "₹10 Crore+", value: 100000000 },
];

const RENT_MIN_BUDGETS = [
  { label: "Min Amount", value: 0 },
  { label: "₹10,000", value: 10000 },
  { label: "₹20,000", value: 20000 },
  { label: "₹35,000", value: 35000 },
  { label: "₹50,000", value: 50000 },
  { label: "₹75,000", value: 75000 },
  { label: "₹1 Lakh", value: 100000 },
];

const RENT_MAX_BUDGETS = [
  { label: "High / Max Amount", value: Infinity },
  { label: "₹25,000", value: 25000 },
  { label: "₹50,000", value: 50000 },
  { label: "₹75,000", value: 75000 },
  { label: "₹1 Lakh", value: 100000 },
  { label: "₹1.5 Lakh", value: 150000 },
  { label: "₹2 Lakh+", value: 200000 },
];

const CONSTRUCTION_STATUS_OPTIONS = [
  "All Status",
  "Ready to move",
  "Under Construction",
  "New Launch",
];

const BHK_OPTIONS = ["All BHK", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"];

const renderCategoryIcon = (iconName, isSelected) => {
  const color = isSelected ? "#FFFFFF" : COLORS.primary;
  switch (iconName) {
    case "home":
    case "home-sharp":
      return <HomeIcon size={20} color={color} />;
    case "business-outline":
    case "business":
      return <Building2 size={20} color={color} />;
    case "briefcase":
      return <Briefcase size={20} color={color} />;
    case "grid":
      return <LayoutGrid size={20} color={color} />;
    default:
      return <Building size={20} color={color} />;
  }
};

export default function HomeScreen({ navigation }) {
  const [dealType, setDealType] = useState("Buy");
  const [selectedType, setSelectedType] = useState("apartment");
  const [searchQuery, setSearchQuery] = useState("");
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { subscription } = useOwner();
  const auth = useAuth();
  const [ownerSwitching, setOwnerSwitching] = useState(false);

  // P0 fix: the backend requires the OWNER role for /owner/* endpoints.
  // Switch the backend role first (real POST /users/me/role, token
  // preserved), and only then navigate. Never logs out, never touches OTP.
  const handlePostProperty = async () => {
    if (ownerSwitching) return;
    setOwnerSwitching(true);
    try {
      await enterOwnerFlow(navigation, auth, "Add");
    } finally {
      setOwnerSwitching(false);
    }
  };

  const handleOpenOwnerDashboard = async () => {
    if (ownerSwitching) return;
    setOwnerSwitching(true);
    try {
      await enterOwnerFlow(navigation, auth, "Dashboard");
    } finally {
      setOwnerSwitching(false);
    }
  };

  // Selected Property for Detail Modal
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Search & Filter Modal States
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedLocality, setSelectedLocality] = useState("");
  const [localityInput, setLocalityInput] = useState("");
  const [modalType, setModalType] = useState("Apartment");
  const [modalBudget, setModalBudget] = useState("All Budgets");
  const [minBudget, setMinBudget] = useState(0);
  const [maxBudget, setMaxBudget] = useState(Infinity);
  const [isMinDropdownOpen, setIsMinDropdownOpen] = useState(false);
  const [isMaxDropdownOpen, setIsMaxDropdownOpen] = useState(false);
  const [constructionStatus, setConstructionStatus] = useState("All Status");
  const [modalBhk, setModalBhk] = useState("All BHK");

  // Demand & Newly Launched States
  const [demandRegion, setDemandRegion] = useState("Chennai South");
  const [revealedProjectPhone, setRevealedProjectPhone] = useState(null);

  const isRentDeal = dealType === "Rent" || dealType === "Lease";
  const currentMinList = isRentDeal ? RENT_MIN_BUDGETS : BUY_MIN_BUDGETS;
  const currentMaxList = isRentDeal ? RENT_MAX_BUDGETS : BUY_MAX_BUDGETS;

  const formatBudgetDisplay = (val) => {
    if (val === 0) return "Min";
    if (val === Infinity) return "Max";
    if (isRentDeal) {
      return `₹${val.toLocaleString("en-IN")}`;
    }
    if (val >= 10000000) {
      return `₹${val / 10000000} Cr`;
    }
    return `₹${val / 100000} L`;
  };

  const budgetSummaryText = useMemo(() => {
    if (minBudget === 0 && maxBudget === Infinity) return "All Budgets";
    if (minBudget === 0) return `Up to ${formatBudgetDisplay(maxBudget)}`;
    if (maxBudget === Infinity) return `${formatBudgetDisplay(minBudget)}+`;
    return `${formatBudgetDisplay(minBudget)} - ${formatBudgetDisplay(maxBudget)}`;
  }, [minBudget, maxBudget, isRentDeal]);

  const handleSelectBudgetPreset = (bg) => {
    setModalBudget(bg);
    setIsMinDropdownOpen(false);
    setIsMaxDropdownOpen(false);
    if (bg === "All Budgets") {
      setMinBudget(0);
      setMaxBudget(Infinity);
    } else if (bg === "Under ₹50L") {
      setMinBudget(0);
      setMaxBudget(5000000);
    } else if (bg === "₹50L - ₹1Cr") {
      setMinBudget(5000000);
      setMaxBudget(10000000);
    } else if (bg === "₹1Cr - ₹2Cr") {
      setMinBudget(10000000);
      setMaxBudget(20000000);
    } else if (bg === "₹2Cr+") {
      setMinBudget(20000000);
      setMaxBudget(Infinity);
    }
  };

  const filterProperties = (list) => {
    return list.filter((item) => {
      // Deal filter
      if (dealType === "Buy" && item.badgeType !== "sale" && item.badgeType !== "resale") return false;
      if (dealType === "Resale" && item.badgeType !== "resale" && !item.isResale && item.constructionStatus !== "Ready to move") return false;
      if (dealType === "Rent" && item.badgeType !== "rent") return false;
      if (dealType === "Lease" && item.badgeType !== "lease") return false;

      // Locality filter
      if (selectedLocality && selectedLocality !== "") {
        if (!item.location.toLowerCase().includes(selectedLocality.toLowerCase())) {
          return false;
        }
      }

      // BHK filter
      if (modalBhk && modalBhk !== "All BHK") {
        const num = parseInt(modalBhk);
        if (modalBhk === "4+ BHK") {
          if (item.beds < 4) return false;
        } else if (item.beds !== num) {
          return false;
        }
      }

      // Budget Min / High filter
      if (item.rawPrice) {
        if (minBudget > 0 && item.rawPrice < minBudget) return false;
        if (maxBudget < Infinity && item.rawPrice > maxBudget) return false;
      }

      // Construction Status filter
      if (constructionStatus && constructionStatus !== "All Status") {
        const itemStatus = item.constructionStatus || (item.badge === "New Launch" || item.type === "Plot" ? "New Launch" : "Ready to move");
        if (itemStatus.toLowerCase() !== constructionStatus.toLowerCase()) return false;
      }

      // Text query
      if (
        searchQuery.trim() !== "" &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.location.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  };

  const [liveListings, setLiveListings] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    const dealMap = { Buy: "BUY", Resale: "RESALE", Rent: "RENT", Lease: "LEASE" };
    const deal = dealMap[dealType] || "BUY";
    apiGet("/buyer/listings", { deal, page: 1, page_size: 20 })
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.items)) {
          setLiveListings(data.items.map(toUiProperty));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dealType]);

  const baseVerList = liveListings && liveListings.length > 0 ? liveListings : VERIFIED_PROPERTIES;
  const baseRecAddedList = liveListings && liveListings.length > 0 ? [...liveListings].reverse() : RECENTLY_ADDED;
  const baseRecList = liveListings && liveListings.length > 0 ? liveListings : RECOMMENDED_PROPERTIES;

  const recList = filterProperties(baseRecList).length > 0 ? filterProperties(baseRecList) : baseRecList;
  const verList = filterProperties(baseVerList).length > 0 ? filterProperties(baseVerList) : baseVerList;
  const recAddedList = filterProperties(baseRecAddedList).length > 0 ? filterProperties(baseRecAddedList) : baseRecAddedList;

  // Filter preview count inside modal
  const modalMatchedCount = useMemo(() => {
    return ALL_PROPERTIES.filter((item) => {
      if (dealType === "Buy" && item.badgeType !== "sale" && item.badgeType !== "resale") return false;
      if (dealType === "Resale" && item.badgeType !== "resale" && !item.isResale && item.constructionStatus !== "Ready to move") return false;
      if (dealType === "Rent" && item.badgeType !== "rent") return false;
      if (dealType === "Lease" && item.badgeType !== "lease") return false;
      if (selectedLocality && !item.location.toLowerCase().includes(selectedLocality.toLowerCase())) {
        return false;
      }
      if (modalBhk && modalBhk !== "All BHK") {
        const num = parseInt(modalBhk);
        if (modalBhk === "4+ BHK") {
          if (item.beds < 4) return false;
        } else if (item.beds !== num) {
          return false;
        }
      }
      if (item.rawPrice) {
        if (minBudget > 0 && item.rawPrice < minBudget) return false;
        if (maxBudget < Infinity && item.rawPrice > maxBudget) return false;
      }
      if (constructionStatus && constructionStatus !== "All Status") {
        const itemStatus = item.constructionStatus || (item.badge === "New Launch" || item.type === "Plot" ? "New Launch" : "Ready to move");
        if (itemStatus.toLowerCase() !== constructionStatus.toLowerCase()) return false;
      }
      return true;
    }).length || ALL_PROPERTIES.length;
  }, [dealType, selectedLocality, modalBhk, minBudget, maxBudget, constructionStatus]);

  const handleApplyModalFilters = () => {
    setIsMinDropdownOpen(false);
    setIsMaxDropdownOpen(false);
    setIsSearchModalOpen(false);
    navigation.navigate("Search", {
      locality: selectedLocality || localityInput || "",
      dealType: dealType,
      propertyType: modalType,
      bhk: modalBhk,
      budgetMin: minBudget,
      budgetMax: maxBudget,
      constructionStatus: constructionStatus,
    });
  };

  const handleClearModalFilters = () => {
    setSelectedLocality("");
    setLocalityInput("");
    setModalType("Apartment");
    setModalBudget("All Budgets");
    setMinBudget(0);
    setMaxBudget(Infinity);
    setIsMinDropdownOpen(false);
    setIsMaxDropdownOpen(false);
    setModalBhk("All BHK");
    setConstructionStatus("All Status");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================= HEADER BAR ================= */}
        <View style={styles.header}>
          {/* Left Side Restamp Logotype */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIconBg}>
              <RestampLogo size={28} />
            </View>
            <Text style={styles.logoText}>
              Res<Text style={styles.logoTextAccent}>tamp</Text>
            </Text>
          </View>

          {/* Right Side Header Actions: Quick Switch to Owner (Testing) + Notification Bell */}
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
              style={styles.notificationBtn}
              activeOpacity={0.8}
              onPress={() => Alert.alert("Notifications", "You have no unread notifications.")}
            >
              <Bell size={20} color={COLORS.textDark} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= TOP SECTION (BUY / RENT / LEASE, SEARCH, CHIPS) ================= */}
        <View style={styles.topSection}>
          {/* 1. DEAL TABS (BUY, RENT, LEASE) */}
          <View style={styles.dealTypeRow}>
            {DEAL_TYPES.map((type) => {
              const isActive = dealType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={styles.dealTypeTab}
                  activeOpacity={0.7}
                  onPress={() => setDealType(type)}
                >
                  <Text
                    style={[
                      styles.dealTypeText,
                      isActive ? styles.dealTypeTextActive : styles.dealTypeTextInactive,
                    ]}
                  >
                    {type}
                  </Text>
                  {isActive && <View style={styles.activeUnderline} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. SEARCH BAR (INBUILT FILTER, CLICK ASKS FILTER) */}
          <View style={styles.searchRow}>
            <TouchableOpacity
              style={styles.searchInputContainer}
              activeOpacity={0.85}
              onPress={() => setIsSearchModalOpen(true)}
            >
              <Search size={18} color="#94A3B8" style={styles.searchIcon} />
              {selectedLocality || (minBudget > 0 || maxBudget < Infinity) || (constructionStatus !== "All Status") ? (
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, flex: 1 }}>
                  {selectedLocality ? (
                    <View style={styles.activeLocalityTag}>
                      <Text style={styles.activeLocalityTagText}>{selectedLocality}</Text>
                      <TouchableOpacity onPress={() => setSelectedLocality("")}>
                        <XCircle size={15} color={COLORS.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {(minBudget > 0 || maxBudget < Infinity) ? (
                    <View style={styles.activeLocalityTag}>
                      <Text style={styles.activeLocalityTagText}>{budgetSummaryText}</Text>
                      <TouchableOpacity onPress={() => { setMinBudget(0); setMaxBudget(Infinity); setModalBudget("All Budgets"); }}>
                        <XCircle size={15} color={COLORS.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {constructionStatus !== "All Status" ? (
                    <View style={styles.activeLocalityTag}>
                      <Text style={styles.activeLocalityTagText}>{constructionStatus}</Text>
                      <TouchableOpacity onPress={() => setConstructionStatus("All Status")}>
                        <XCircle size={15} color={COLORS.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.searchPlaceholderText}>
                  Search city, locality, project...
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 3. CATEGORY SELECTOR */}
          <View style={styles.categoryPillWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillScroll}
            >
              {PROPERTY_TYPES.map((pt) => {
                const isSelected = selectedType === pt.id;
                return (
                  <TouchableOpacity
                    key={pt.id}
                    style={styles.categoryPillItem}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedType(pt.id);
                      navigation.navigate("Search", {
                        propertyType: pt.name,
                        dealType: dealType,
                        locality: selectedLocality || "",
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected
                          ? styles.categoryPillTextActive
                          : styles.categoryPillTextInactive,
                      ]}
                    >
                      {pt.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ================= POST YOUR PROPERTY PROMO BANNER ================= */}
        <View style={styles.postPropertyWrapper}>
          <TouchableOpacity
            style={styles.postPropertyCard}
            activeOpacity={0.92}
            onPress={handlePostProperty}
          >
            <View style={styles.postPropertyContent}>
              <Text style={styles.postPropertyTitle}>
                Post your Property for <Text style={styles.postPropertyTitleFree}>Free</Text>
              </Text>
              <Text style={styles.postPropertySubtitle}>
                List it on Restamp and get genuine leads
              </Text>
              <View style={styles.postPropertyBtn}>
                <Text style={styles.postPropertyBtnText}>Post your property</Text>
              </View>
            </View>

            <View style={styles.postPropertyImageWrapper}>
              <Image
                source={require("../../../assets/post-property-banner.jpg")}
                style={styles.postPropertyImage}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* ================= RECOMMENDED PROPERTIES (SINGLE ROW SLIDER) ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Properties</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedScrollContainer}
          decelerationRate="fast"
          snapToInterval={REC_CARD_WIDTH + 12}
        >
          {recList.map((property) => {
            const saved = isWishlisted(property.id);
            return (
              <TouchableOpacity
                key={property.id}
                style={styles.recommendedCard}
                activeOpacity={0.9}
                onPress={() => setSelectedProperty(property)}
              >
                <View style={styles.recommendedImageContainer}>
                  <SafeImage source={{ uri: property.image }} style={styles.recommendedImage} />
                  <View style={styles.verifiedGreenBadge}>
                    <Text style={styles.verifiedGreenBadgeText}>verified</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.floatingHeartBtn}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleWishlist(property);
                    }}
                  >
                    <Heart
                      size={20}
                      color={saved ? "#FF0000" : "#FFFFFF"}
                      fill={saved ? "#FF0000" : "rgba(0,0,0,0.3)"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.recommendedCardBody}>
                  <Text style={styles.recommendedTitle} numberOfLines={2}>
                    {property.title}
                  </Text>
                  <Text style={styles.recommendedSubtitle} numberOfLines={2}>
                    <Text style={styles.recommendedPrice}>{property.price}{property.pricePeriod}</Text> • {property.location}. {property.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= VERIFIED PROPERTIES ================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.sectionTitle}>Verified Properties</Text>
            <View style={styles.verifiedTag}>
              <CheckCircle2 size={13} color="#16A34A" style={{ marginRight: 3 }} />
              <Text style={styles.verifiedTagText}>Verified</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardHorizontalList}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 16}
        >
          {verList.map((property) => {
            const saved = isWishlisted(property.id);
            return (
              <TouchableOpacity
                key={property.id}
                style={styles.propertyCard}
                activeOpacity={0.9}
                onPress={() => setSelectedProperty(property)}
              >
                <View style={styles.cardImageContainer}>
                  <SafeImage source={{ uri: property.image }} style={styles.cardImage} />
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeVerified}>
                      <CheckCircle2 size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                      <Text style={styles.badgeTextWhite}>{property.badge}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.floatingHeartBtn}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleWishlist(property);
                    }}
                  >
                    <Heart
                      size={20}
                      color={saved ? "#FF0000" : "#FFFFFF"}
                      fill={saved ? "#FF0000" : "rgba(0,0,0,0.3)"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>{property.price}{property.pricePeriod}</Text>
                    <View style={styles.ratingBadge}>
                      <Star size={13} color={COLORS.star} fill={COLORS.star} />
                      <Text style={styles.ratingText}>{property.rating}</Text>
                    </View>
                  </View>

                  <Text style={styles.propertyTitle} numberOfLines={1}>
                    {property.title}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin size={13} color={COLORS.textSecondary} />
                    <Text style={styles.locationAddress} numberOfLines={1}>
                      {property.location}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= RECENTLY ADDED ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Added</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardHorizontalList}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 16}
        >
          {recAddedList.map((property) => {
            const saved = isWishlisted(property.id);
            return (
              <TouchableOpacity
                key={property.id}
                style={styles.propertyCard}
                activeOpacity={0.9}
                onPress={() => setSelectedProperty(property)}
              >
                <View style={styles.cardImageContainer}>
                  <SafeImage source={{ uri: property.image }} style={styles.cardImage} />
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeOrange}>
                      <Text style={styles.badgeTextWhite}>{property.badge || "Just Added"}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.floatingHeartBtn}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleWishlist(property);
                    }}
                  >
                    <Heart
                      size={20}
                      color={saved ? "#FF0000" : "#FFFFFF"}
                      fill={saved ? "#FF0000" : "rgba(0,0,0,0.3)"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>{property.price}{property.pricePeriod}</Text>
                    <View style={styles.ratingBadge}>
                      <Star size={13} color={COLORS.star} fill={COLORS.star} />
                      <Text style={styles.ratingText}>{property.rating}</Text>
                    </View>
                  </View>

                  <Text style={styles.propertyTitle} numberOfLines={1}>
                    {property.title}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin size={13} color={COLORS.textSecondary} />
                    <Text style={styles.locationAddress} numberOfLines={1}>
                      {property.location}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= NEWLY LAUNCHED PROJECTS (SECTION 4) ================= */}
        <View style={styles.projectSectionHeader}>
          <View style={styles.projectHeaderBadge}>
            <Sparkles size={18} color="#D97706" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.projectSectionTitle}>Newly launched projects</Text>
            <Text style={styles.projectSectionSubtitle}>
              Best prices • Unit of choice • Easy payment plans
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.projectCardList}
          decelerationRate="fast"
          snapToInterval={PROJECT_CARD_WIDTH + 14}
        >
          {NEWLY_LAUNCHED_PROJECTS.map((proj) => {
            const isRevealed = revealedProjectPhone === proj.id;
            return (
              <View key={proj.id} style={styles.newProjectCard}>
                {/* Top Warm Banner */}
                <View style={styles.projectBanner}>
                  <Text style={styles.projectBannerText}>{proj.tag}</Text>
                </View>

                {/* Card Main Body */}
                <View style={styles.projectCardContent}>
                  {/* Left: Round Project Image with RERA Badge */}
                  <View style={styles.projectThumbWrapper}>
                    <SafeImage source={{ uri: proj.image }} style={styles.projectThumb} />
                    <View style={styles.reraBadge}>
                      <Check size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                      <Text style={styles.reraText}>{proj.rera}</Text>
                    </View>
                  </View>

                  {/* Right: Info */}
                  <View style={styles.projectInfoCol}>
                    <Text style={styles.projectTitle} numberOfLines={1}>
                      {proj.title}
                    </Text>
                    <Text style={styles.projectLocality} numberOfLines={1}>
                      {proj.locality}
                    </Text>
                    <Text style={styles.projectPrice}>
                      {proj.priceRange} <Text style={styles.projectTypeDivider}>|</Text> {proj.type}
                    </Text>
                    <View style={styles.growthRow}>
                      <TrendingUp size={11} color="#16A34A" style={{ marginRight: 2 }} />
                      <Text style={styles.growthText}>{proj.growth.replace("▲ ", "")}</Text>
                    </View>
                  </View>
                </View>

                {/* Bottom Action Strip */}
                <View style={styles.projectBottomStrip}>
                  <View style={styles.zeroBrokerageRow}>
                    <Tag size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.zeroBrokerageText}>
                      Get preferred options{"\n"}@zero brokerage
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.viewNumberBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      setRevealedProjectPhone(isRevealed ? null : proj.id);
                    }}
                  >
                    <Text style={styles.viewNumberBtnText}>
                      {isRevealed ? proj.phone : "View number"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ================= DEMAND IN CHENNAI (SECTION 5) ================= */}
        <View style={styles.demandSectionHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.sectionTitle}>Demand in Chennai</Text>
              <TouchableOpacity activeOpacity={0.7} style={{ marginLeft: 6 }}>
                <Info size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.demandSubtitle}>
              Where are buyers searching in Chennai
            </Text>
          </View>
        </View>

        {/* Region Underline Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.demandTabsContainer}
        >
          {["Chennai South", "Chennai Central", "Chennai North", "Chennai West"].map((region) => {
            const isSelected = demandRegion === region;
            return (
              <TouchableOpacity
                key={region}
                activeOpacity={0.8}
                onPress={() => setDemandRegion(region)}
                style={styles.demandTabItem}
              >
                <Text style={[styles.demandTabText, isSelected && styles.demandTabTextActive]}>
                  {region}
                </Text>
                {isSelected && <View style={styles.demandTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Demand Insight Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.demandCardsList}
          decelerationRate="fast"
          snapToInterval={DEMAND_CARD_WIDTH + 14}
        >
          {(DEMAND_DATA[demandRegion] || DEMAND_DATA["Chennai South"]).map((item) => (
            <View key={item.id} style={styles.demandCard}>
              <Text style={styles.demandCategoryTitle}>{item.category}</Text>
              <Text style={styles.demandCategorySubtitle}>{item.subtitle}</Text>

              <View style={styles.demandRankList}>
                {item.localities.map((loc) => (
                  <View key={loc.name} style={styles.demandRankItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demandRankName}>
                        <Text style={styles.demandRankNum}>{loc.rank} </Text>
                        <Text style={styles.demandLocName}>{loc.name}</Text>
                      </Text>
                      <View style={[styles.demandProgressBar, { width: loc.barWidth }]} />
                    </View>
                    <Text style={styles.demandSearchPercent}>{loc.percentage}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.viewMoreLocalitiesBtn}
                onPress={() => navigation.navigate("Search")}
              >
                <Text style={styles.viewMoreLocalitiesText}>View more localities</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>


        {/* ================= EXPLORE BY LOCATION ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore by Location</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.locationList}
        >
          {CHENNAI_LOCALITIES.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              style={styles.locationCard}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedLocality(loc.name);
              }}
            >
              <SafeImage source={{ uri: loc.image }} style={styles.locationCardImage} />
              <View style={styles.locationOverlay} />
              <View style={styles.locationCardContent}>
                <Text style={styles.locationCardName}>{loc.name}</Text>
                <Text style={styles.locationCardCount}>{loc.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* ================= SEARCH PROPERTY FILTER MODAL ================= */}
      <SearchPropertyModal
        visible={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onApply={(filters) => {
          setIsSearchModalOpen(false);
          setSelectedLocality(filters.locality);
          setLocalityInput(filters.locality);
          setModalType(filters.propertyType);
          setModalBhk(filters.bhk);
          setMinBudget(filters.budgetMin);
          setMaxBudget(filters.budgetMax);
          setConstructionStatus(filters.constructionStatus);
          if (filters.modalBudget) setModalBudget(filters.modalBudget);

          navigation.navigate("Search", {
            locality: filters.locality,
            dealType: dealType,
            propertyType: filters.propertyType,
            bhk: filters.bhk,
            budgetMin: filters.budgetMin,
            budgetMax: filters.budgetMax,
            constructionStatus: filters.constructionStatus,
            openFilterModal: false,
          });
        }}
        dealType={dealType}
        initialLocality={selectedLocality}
        initialPropertyType={modalType}
        initialBhk={modalBhk}
        initialStatus={constructionStatus}
        initialMinBudget={minBudget}
        initialMaxBudget={maxBudget}
        initialBudgetPreset={modalBudget}
      />

      {/* ================= PROPERTY DETAIL MODAL ================= */}
      <PropertyDetailModal
        visible={!!selectedProperty}
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onSelectProperty={(property) => setSelectedProperty(property)}
        isWishlisted={isWishlisted}
        onToggleWishlist={toggleWishlist}
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
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 90,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
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
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  logoTextAccent: {
    color: COLORS.primary,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
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
  menuHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  /* TOP SECTION */
  topSection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 4,
    paddingBottom: 10,
  },

  /* 1. DEAL TYPE TABS (BUY, RENT, LEASE) */
  dealTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 20,
  },
  dealTypeTab: {
    alignItems: "flex-start",
  },
  dealTypeText: {
    ...TYPOGRAPHY.sectionHeading,
  },
  dealTypeTextActive: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  dealTypeTextInactive: {
    fontWeight: "400",
    color: "#94A3B8",
  },
  activeUnderline: {
    height: 2.5,
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginTop: 4,
  },

  /* 2. SEARCH BAR */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholderText: {
    ...TYPOGRAPHY.inputText,
    color: "#94A3B8",
    fontSize: 14,
    flex: 1,
  },
  activeLocalityTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  activeLocalityTagText: {
    ...TYPOGRAPHY.smallHelperText,
    color: COLORS.primary,
    fontWeight: "600",
  },

  /* 3. CATEGORY SELECTOR */
  categoryPillWrapper: {
    marginTop: 6,
    marginBottom: 12,
  },
  categoryPillScroll: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  categoryPillItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
  },
  categoryPillText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  categoryPillTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  categoryPillTextInactive: {
    color: "#94A3B8",
    fontWeight: "500",
  },

  /* POST YOUR PROPERTY PROMO BANNER */
  postPropertyWrapper: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  postPropertyCard: {
    height: POST_PROPERTY_BANNER_HEIGHT, // <-- CHANGE HEIGHT MANUALLY HERE (e.g. 130, 145, 160)
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 8,
  },
  postPropertyContent: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    paddingRight: 8,
    zIndex: 2,
  },
  postPropertyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  postPropertyTitleFree: {
    color: "#FFFFFF",
    fontStyle: "italic",
    fontWeight: "900",
  },
  postPropertySubtitle: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 11.5,
    fontWeight: "400",
    marginTop: 3,
    marginBottom: 10,
    lineHeight: 15,
  },
  postPropertyBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    paddingHorizontal: 15,
    paddingVertical: 7.5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  postPropertyBtnText: {
    color: "#111111",
    fontSize: 12.5,
    fontWeight: "700",
  },
  postPropertyImageWrapper: {
    height: "100%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postPropertyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },

  /* SECTION HEADERS */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionHeading,
    color: "#0F172A",
  },
  seeAllText: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  verifiedTagText: {
    ...TYPOGRAPHY.smallHelperText,
    fontWeight: "500",
    color: "#16A34A",
  },

  /* RECOMMENDED PROPERTIES SLIDER (SINGLE ROW) */
  recommendedScrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  recommendedCard: {
    width: REC_CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  recommendedImageContainer: {
    height: 110,
    width: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  recommendedImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  verifiedGreenBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#00C853",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  verifiedGreenBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "500",
    textTransform: "lowercase",
  },
  floatingHeartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  recommendedCardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  recommendedTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0F172A",
    lineHeight: 17,
    marginBottom: 4,
  },
  recommendedSubtitle: {
    fontSize: 11,
    fontWeight: "400",
    color: "#64748B",
    lineHeight: 15,
  },
  recommendedPrice: {
    color: COLORS.primary,
    fontWeight: "500",
  },

  /* NEWLY LAUNCHED PROJECTS */
  projectSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  projectHeaderBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  projectSectionTitle: {
    ...TYPOGRAPHY.sectionHeading,
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 22,
  },
  projectSectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: "#64748B",
    marginTop: 2,
    fontSize: 12,
  },
  projectCardList: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  newProjectCard: {
    width: PROJECT_CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  projectBanner: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 5,
    alignItems: "center",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  projectBannerText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#92400E",
    letterSpacing: 0.3,
  },
  projectCardContent: {
    flexDirection: "row",
    padding: 14,
    alignItems: "center",
  },
  projectThumbWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  projectThumb: {
    width: "100%",
    height: "100%",
  },
  reraBadge: {
    position: "absolute",
    bottom: 2,
    left: 4,
    right: 4,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderRadius: 10,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  reraText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700",
  },
  projectInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  projectTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  projectLocality: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  projectPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  projectTypeDivider: {
    color: "#CBD5E1",
    fontWeight: "400",
  },
  growthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  growthText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#16A34A",
  },
  projectBottomStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FAFAFA",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  zeroBrokerageRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  zeroBrokerageText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 14,
    fontWeight: "500",
  },
  viewNumberBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  viewNumberBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  /* DEMAND IN CHENNAI */
  demandSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  demandSubtitle: {
    ...TYPOGRAPHY.caption,
    color: "#64748B",
    marginTop: 2,
    fontSize: 12.5,
  },
  demandTabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  demandTabItem: {
    marginRight: 20,
    paddingBottom: 8,
    position: "relative",
  },
  demandTabText: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "#64748B",
  },
  demandTabTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  demandTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  demandCardsList: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  demandCard: {
    width: DEMAND_CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  demandCategoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  demandCategorySubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 12,
  },
  demandRankList: {
    marginBottom: 12,
  },
  demandRankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  demandRankName: {
    fontSize: 13,
    lineHeight: 16,
  },
  demandRankNum: {
    fontWeight: "400",
    color: "#94A3B8",
  },
  demandLocName: {
    fontWeight: "700",
    color: "#0F172A",
    textDecorationLine: "underline",
  },
  demandProgressBar: {
    height: 5,
    backgroundColor: "#93C5FD",
    borderRadius: 3,
    marginTop: 4,
  },
  demandSearchPercent: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "500",
  },
  viewMoreLocalitiesBtn: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  viewMoreLocalitiesText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 18,
  },
  feedbackPrompt: {
    fontSize: 12,
    color: "#64748B",
    marginRight: 12,
  },
  feedbackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  feedbackBtnActive: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  feedbackBtnText: {
    fontSize: 11.5,
    color: "#334155",
    fontWeight: "600",
  },

  /* CARD LISTS radius:14 */
  cardHorizontalList: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  propertyCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  cardImageContainer: {
    height: 170,
    width: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  badgeRow: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  badgeGreen: {
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeBlue: {
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeVerified: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeOrange: {
    backgroundColor: "rgba(249, 115, 22, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeTextWhite: {
    color: "#FFFFFF",
    ...TYPOGRAPHY.badge,
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  priceText: {
    ...TYPOGRAPHY.propertyPrice,
    color: COLORS.primary,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    ...TYPOGRAPHY.propertyMeta,
    color: "#0F172A",
    marginLeft: 3,
  },
  propertyTitle: {
    ...TYPOGRAPHY.propertyTitle,
    color: "#0F172A",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  locationAddress: {
    ...TYPOGRAPHY.location,
    color: COLORS.textSecondary,
    marginLeft: 5,
    flex: 1,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  specText: {
    ...TYPOGRAPHY.propertyMeta,
    color: COLORS.textSecondary,
  },
  specDot: {
    marginHorizontal: 8,
    color: COLORS.muted,
  },

  /* VERTICAL CARDS */
  verticalCardsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  verticalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  verticalImageContainer: {
    height: 160,
    width: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  verticalImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },

  /* LOCATION CARDS */
  locationList: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  locationCard: {
    width: 140,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  locationCardImage: {
    width: "100%",
    height: "100%",
  },
  locationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  locationCardContent: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  locationCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  locationCardCount: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },

  /* ================= MODAL STYLES ================= */
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTitle: {
    ...TYPOGRAPHY.screenHeading,
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  modalSectionLabel: {
    ...TYPOGRAPHY.sectionHeading,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 10,
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  modalTextInput: {
    flex: 1,
    ...TYPOGRAPHY.inputText,
    fontSize: 13,
    color: "#0F172A",
    outlineStyle: "none",
    borderWidth: 0,
  },
  modalSubLabel: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#94A3B8",
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  localityChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  localityChipSelected: {
    backgroundColor: "#EBF4FF",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  localityChipText: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#475569",
  },
  localityChipTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  modalFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalFilterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  modalFilterChipText: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#475569",
  },
  modalFilterChipTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  bhkRow: {
    flexDirection: "row",
    gap: 8,
  },
  bhkPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bhkPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  bhkPillText: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#475569",
  },
  bhkPillTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  budgetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedBudgetText: {
    ...TYPOGRAPHY.smallHelperText,
    color: COLORS.primary,
    fontWeight: "600",
  },
  budgetDropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  budgetDropdownBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  budgetDropdownBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#F0F7FF",
  },
  budgetDropdownLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  budgetDropdownValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  budgetDropdownValText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    marginRight: 4,
  },
  budgetToText: {
    marginHorizontal: 10,
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 12,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  dropdownMenuHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownMenuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownMenuItemActive: {
    backgroundColor: "#F0F7FF",
  },
  dropdownMenuText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  dropdownMenuTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  statusChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  statusFilterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  statusFilterChipText: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#475569",
    fontWeight: "500",
  },
  statusFilterChipTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  modalBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    elevation: 8,
  },
  modalResetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  modalResetText: {
    ...TYPOGRAPHY.button,
    color: "#64748B",
  },
  modalShowBtn: {
    flex: 1,
    height: 46,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalShowBtnText: {
    ...TYPOGRAPHY.button,
    color: "#FFFFFF",
  },
});
