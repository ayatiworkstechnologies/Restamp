import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Modal,
  Share,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search as SearchIcon,
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  SlidersHorizontal,
  ChevronDown,
  MapPin,
  Phone,
  MessageCircle,
  Check,
  X,
  Star,
  CheckCircle2,
  Copy,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useListings } from "../../api/useListings";
import { fetchListingDetail } from "../../api/listings";
import { revealContactPhone } from "../../api/contact";
import { getAuthTokenSync } from "../../api/client";
import { useWishlist } from "../../context/WishlistContext";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import SearchPropertyModal from "../../components/SearchPropertyModal";
import SafeImage from "../../components/common/SafeImage";
import {
  SkeletonPropertyCard,
  NoNetworkState,
} from "../../components/common/Skeleton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const POPULAR_LOCALITIES = [
  "Anna Nagar",
  "OMR",
  "Velachery",
  "T. Nagar",
  "Tambaram",
  "Adyar",
  "ECR",
  "Guindy",
];

const TOP_CATEGORIES = ["House", "Townhouse", "Pool", "Apartment", "Villa", "Plot"];

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "rating", label: "Rating: High to Low" },
  { id: "area_desc", label: "Size: Largest First" },
];

const BUDGET_OPTIONS = [
  { label: "All Budgets", min: 0, max: Infinity },
  { label: "Under ₹50L", min: 0, max: 5000000 },
  { label: "₹50L - ₹1Cr", min: 5000000, max: 10000000 },
  { label: "₹1Cr - ₹2Cr", min: 10000000, max: 20000000 },
  { label: "₹2Cr+", min: 20000000, max: Infinity },
];

const BHK_OPTIONS = ["All BHK", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"];

const PROPERTY_TYPES = ["All Types", "Home", "Plot", "Villa", "Apartment", "Commercial"];

const STATUS_OPTIONS = ["All Status", "Ready to move", "Under Construction", "New Launch"];

export default function SearchScreen({ navigation, route }) {
  // Initial parameters passed from HomeScreen or default to Anna Nagar
  const initialLocality = route?.params?.locality !== undefined ? route.params.locality : "Anna Nagar";
  const initialDeal = route?.params?.dealType || "Buy";
  const initialType = route?.params?.propertyType || route?.params?.type || "All Types";
  const initialBhk = route?.params?.bhk || "All BHK";
  const initialStatus = route?.params?.constructionStatus || "All Status";

  const [searchQuery, setSearchQuery] = useState(initialLocality);
  const [dealTab, setDealTab] = useState(initialDeal);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSort, setSelectedSort] = useState("relevance");
  const [selectedBudget, setSelectedBudget] = useState("All Budgets");
  const [selectedBhk, setSelectedBhk] = useState(initialBhk);
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [minBudget, setMinBudget] = useState(route?.params?.budgetMin || 0);
  const [maxBudget, setMaxBudget] = useState(
    route?.params?.budgetMax !== undefined ? route.params.budgetMax : Infinity
  );
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(
    !!route?.params?.openFilterModal
  );

  const openedFromNavbarRef = useRef(
    route?.params?.fromNavbar !== undefined
      ? !!route.params.fromNavbar
      : !!route?.params?.openFilterModal
  );
  const [openedFromNavbar, setOpenedFromNavbar] = useState(
    route?.params?.fromNavbar !== undefined
      ? !!route.params.fromNavbar
      : !!route?.params?.openFilterModal
  );

  const setFromNavbar = (val) => {
    openedFromNavbarRef.current = val;
    setOpenedFromNavbar(val);
  };

  // Modals for filters
  const [activeDropdown, setActiveDropdown] = useState(null); // 'sort' | 'budget' | 'bhk' | 'type' | 'status' | 'allFilters' | null
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Open the existing detail modal instantly, then enrich with the live record
  // (Phase 3: GET /buyer/listings/{id}) when the card carries a backend id.
  // Mock-sourced cards (no numeric backendId) keep existing mock behavior.
  const openProperty = (property) => {
    setSelectedProperty(property);
    const backendId = property && property.backendId;
    if (typeof backendId !== "number") return;
    setDetailLoading(true);
    fetchListingDetail(backendId).then(
      (detail) => {
        setDetailLoading(false);
        setSelectedProperty((current) =>
          current && current.backendId === backendId ? { ...current, ...detail } : current
        );
      },
      () => {
        setDetailLoading(false);
        Alert.alert(
          "Couldn't load details",
          "Showing saved card info. Check connection and reopen to retry."
        );
      }
    );
  };
  const [viewedNumberProperty, setViewedNumberProperty] = useState(null);
  const [revealedPhone, setRevealedPhone] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { wishlist = [], isWishlisted, toggleWishlist } = useWishlist();

  // Listen to bottom tab Search icon press
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("OPEN_SEARCH_FILTER_MODAL", () => {
      setIsSearchModalOpen(true);
      setFromNavbar(true);
    });
    return () => {
      sub.remove();
    };
  }, []);

  // Listen to incoming route parameter changes
  useEffect(() => {
    if (route?.params?.openFilterModal) {
      setIsSearchModalOpen(true);
      if (route?.params?.fromNavbar !== false) {
        setFromNavbar(true);
      }
      navigation.setParams({ openFilterModal: undefined, fromNavbar: undefined });
    }
    if (route?.params?.locality !== undefined) {
      setSearchQuery(route.params.locality);
    }
    if (route?.params?.dealType) {
      setDealTab(route.params.dealType);
    }
    if (route?.params?.propertyType) {
      setSelectedType(route.params.propertyType);
    } else if (route?.params?.type) {
      setSelectedType(route.params.type);
    }
    if (route?.params?.bhk) {
      setSelectedBhk(route.params.bhk);
    }
    if (route?.params?.constructionStatus) {
      setSelectedStatus(route.params.constructionStatus);
    }
    if (route?.params?.budgetMin !== undefined) {
      setMinBudget(route.params.budgetMin);
    }
    if (route?.params?.budgetMax !== undefined) {
      setMaxBudget(route.params.budgetMax);
    }
    if (route?.params?.category) {
      setSelectedCategory(route.params.category);
    }
  }, [route?.params]);

  // Discovery data: server-side filter/sort/pagination via GET /buyer/listings.
  // Deal, type, BHK, budgets, query and supported sorts run on the backend.
  // Category pseudo-filters (Pool/Townhouse) and construction status have no backend
  // equivalent and are applied client-side below; verified-only is guaranteed server-side.
  const budgetPreset = BUDGET_OPTIONS.find((b) => b.label === selectedBudget);
  const {
    items: apiProperties,
    total,
    loading: listingsLoading,
    loadingMore: listingsLoadingMore,
    error: listingsError,
    loadMore: loadMoreListings,
    refresh: refreshListings,
  } = useListings(
    {
      dealTab,
      selectedType,
      searchQuery,
      locality: "",
      bhk: selectedBhk,
      presetMinRupees: budgetPreset ? budgetPreset.min : 0,
      presetMaxRupees: budgetPreset ? budgetPreset.max : Infinity,
      minRupees: minBudget,
      maxRupees: maxBudget,
      sort: selectedSort,
    },
    { pageSize: 20 }
  );

  const filteredProperties = useMemo(() => {
    return apiProperties.filter((item) => {
      // Category pseudo-filter (no backend equivalent for Pool/Townhouse).
      if (selectedCategory !== "All") {
        const catLower = selectedCategory.toLowerCase();
        if (catLower === "pool") {
          const desc = (item.description || "").toLowerCase();
          const title = (item.title || "").toLowerCase();
          if (!desc.includes("pool") && !title.includes("pool")) return false;
        } else if (catLower === "townhouse") {
          const type = (item.type || "").toLowerCase();
          if (type !== "house" && type !== "villa") return false;
        } else if ((item.type || "").toLowerCase() !== catLower) {
          return false;
        }
      }
      // Construction status has no backend filter param; applied client-side.
      if (selectedStatus !== "All Status") {
        const itemStatus = item.constructionStatus || "Ready to move";
        if (itemStatus.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }
      return true;
    });
  }, [apiProperties, selectedCategory, selectedStatus]);

  // Share handler
  const handleShare = async (property) => {
    try {
      await Share.share({
        message: `Check out ${property.title} in ${property.location} on RESTAMP for ${property.price}!`,
      });
    } catch (error) {
      // Ignored
    }
  };

  // Contact Handlers
  const handleWhatsApp = (property) => {
    const rawPhone = property.agent?.phone || "+919876543210";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Hello! I am interested in ${property.title} (${property.price}) in ${property.location} listed on RESTAMP.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
      Alert.alert("WhatsApp Not Available", `Please contact ${property.agent?.name} at ${rawPhone}`);
    });
  };

  const handleCall = (property) => {
    const rawPhone = property.agent?.phone || "+919876543210";
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Agent", `${property.agent?.name || "Agent"}: ${rawPhone}`);
    });
  };

  const handleViewNumber = (property) => {
    setViewedNumberProperty(property);
    // Phase 6: live contact reveal when authenticated. The sheet keeps showing
    // the existing mock number until (and unless) the audited API succeeds —
    // a real number is never displayed without a successful reveal response.
    setRevealedPhone(null);
    const backendId = property && property.backendId;
    if (typeof backendId === "number" && getAuthTokenSync()) {
      revealContactPhone(backendId).then(
        (phone) => {
          if (phone) setRevealedPhone(phone);
        },
        () => {}
      );
    }
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedBudget("All Budgets");
    setSelectedBhk("All BHK");
    setSelectedType("All Types");
    setSelectedStatus("All Status");
    setOnlyVerified(false);
    setSelectedSort("relevance");
    setActiveDropdown(null);
  };

  // Helper calculations for cards
  const getCardSpecs = (property) => {
    const sqftNum = parseInt(String(property.sqft).replace(/,/g, "")) || 1500;
    const perSqft = property.rawPrice && sqftNum
      ? `₹${Math.round(property.rawPrice / sqftNum).toLocaleString("en-IN")}/sqft`
      : "₹6,800/sqft";
    const statusText = property.constructionStatus || (property.badge === "Just Added" ? "New Launch" : "Ready to move");

    // Dynamic feature chips
    let tags = ["Gated Society", "Power Backup", "Covered Parking", "Lift Access"];
    if (property.type === "Apartment") {
      tags = ["Gated Society", "Power Backup", "Covered Parking", "Lift Access"];
    } else if (property.type === "Villa" || property.type === "House") {
      tags = ["Independent Villa", "Private Garden", "Corner Property", "2 Car Parking"];
    } else if (property.type === "Commercial") {
      tags = ["Grade A Tech Park", "100% Power Backup", "High Speed Lifts", "Visitor Parking"];
    } else if (property.type === "Plot") {
      tags = ["CMDA Approved", "Corner Property", "2 Side Open", "Clear Title"];
    }

    return { perSqft, statusText, tags };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER: [ < BACK ]  [ SEARCH INPUT PILL 🔍 ]  [ ♡ HEART ]           */}
      {/* ========================================================================= */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.circleIconBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (navigation?.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Home");
            }
          }}
        >
          <ArrowLeft size={19} color="#1E293B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchInputContainer}
          activeOpacity={0.85}
          onPress={() => {
            setFromNavbar(false);
            setIsSearchModalOpen(true);
          }}
        >
          <Text
            style={[
              styles.searchInput,
              { color: searchQuery ? "#0F172A" : "#94A3B8", lineHeight: 22 },
            ]}
            numberOfLines={1}
          >
            {searchQuery ? searchQuery : "Search City/Locality/Project"}
          </Text>
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setSearchQuery("");
              }}
              style={{ padding: 4, marginRight: 2 }}
            >
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
          <SearchIcon size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleIconBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Activity")}
        >
          <Heart
            size={19}
            color={wishlist.length > 0 ? "#FF0000" : "#1E293B"}
            fill={wishlist.length > 0 ? "#FF0000" : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Popular Locality Suggestions when searching */}
      {isSearchFocused && (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsHeader}>
            <Text style={styles.suggestionsLabel}>Popular Chennai Localities</Text>
            <TouchableOpacity onPress={() => setIsSearchFocused(false)}>
              <Text style={styles.closeSuggestionsText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionChipsScroll}>
            {POPULAR_LOCALITIES.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[
                  styles.suggestionChip,
                  searchQuery.toLowerCase().includes(loc.toLowerCase()) && styles.suggestionChipActive,
                ]}
                onPress={() => {
                  setSearchQuery(loc);
                  setIsSearchFocused(false);
                }}
              >
                <Text
                  style={[
                    styles.suggestionChipText,
                    searchQuery.toLowerCase().includes(loc.toLowerCase()) && styles.suggestionChipTextActive,
                  ]}
                >
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}



      {/* ========================================================================= */}
      {/* 3. HORIZONTAL FILTER PILLS ROW                                            */}
      {/* ========================================================================= */}
      <View style={styles.filterPillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {/* Main Filter Icon Button */}
          <TouchableOpacity
            style={[
              styles.filterIconPill,
              (selectedBudget !== "All Budgets" ||
                selectedBhk !== "All BHK" ||
                selectedType !== "All Types" ||
                minBudget > 0 ||
                maxBudget < Infinity) &&
                styles.filterIconPillActive,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              setFromNavbar(false);
              setIsSearchModalOpen(true);
            }}
          >
            <SlidersHorizontal size={15} color="#334155" />
          </TouchableOpacity>

          {/* Sort Dropdown Pill */}
          <TouchableOpacity
            style={[styles.filterDropdownPill, selectedSort !== "relevance" && styles.filterDropdownPillActive]}
            activeOpacity={0.8}
            onPress={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
          >
            <Text style={[styles.filterDropdownText, selectedSort !== "relevance" && styles.filterDropdownTextActive]}>
              {selectedSort === "relevance" ? "Sort" : SORT_OPTIONS.find((s) => s.id === selectedSort)?.label}
            </Text>
            <ChevronDown size={14} color={selectedSort !== "relevance" ? COLORS.primary : "#64748B"} />
          </TouchableOpacity>

          {/* Verified / Owner Toggle Pill */}
          <TouchableOpacity
            style={[styles.filterDropdownPill, onlyVerified && styles.filterDropdownPillActive]}
            activeOpacity={0.8}
            onPress={() => setOnlyVerified(!onlyVerified)}
          >
            <Text style={[styles.filterDropdownText, onlyVerified && styles.filterDropdownTextActive]}>
              Verified
            </Text>
            {onlyVerified && <Check size={13} color={COLORS.primary} style={{ marginLeft: 3 }} />}
          </TouchableOpacity>

          {/* Property Type Dropdown Pill */}
          <TouchableOpacity
            style={[styles.filterDropdownPill, selectedType !== "All Types" && styles.filterDropdownPillActive]}
            activeOpacity={0.8}
            onPress={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
          >
            <Text style={[styles.filterDropdownText, selectedType !== "All Types" && styles.filterDropdownTextActive]}>
              {selectedType === "All Types" ? "Type" : selectedType}
            </Text>
            <ChevronDown size={14} color={selectedType !== "All Types" ? COLORS.primary : "#64748B"} />
          </TouchableOpacity>

          {/* Budget Dropdown Pill */}
          <TouchableOpacity
            style={[styles.filterDropdownPill, selectedBudget !== "All Budgets" && styles.filterDropdownPillActive]}
            activeOpacity={0.8}
            onPress={() => setActiveDropdown(activeDropdown === "budget" ? null : "budget")}
          >
            <Text style={[styles.filterDropdownText, selectedBudget !== "All Budgets" && styles.filterDropdownTextActive]}>
              {selectedBudget === "All Budgets" ? "Budget" : selectedBudget}
            </Text>
            <ChevronDown size={14} color={selectedBudget !== "All Budgets" ? COLORS.primary : "#64748B"} />
          </TouchableOpacity>

          {/* BHK Dropdown Pill */}
          <TouchableOpacity
            style={[styles.filterDropdownPill, selectedBhk !== "All BHK" && styles.filterDropdownPillActive]}
            activeOpacity={0.8}
            onPress={() => setActiveDropdown(activeDropdown === "bhk" ? null : "bhk")}
          >
            <Text style={[styles.filterDropdownText, selectedBhk !== "All BHK" && styles.filterDropdownTextActive]}>
              {selectedBhk === "All BHK" ? "BHK" : selectedBhk}
            </Text>
            <ChevronDown size={14} color={selectedBhk !== "All BHK" ? COLORS.primary : "#64748B"} />
          </TouchableOpacity>

          {/* Construction Status Pill */}
          <TouchableOpacity
            style={[styles.filterDropdownPill, selectedStatus !== "All Status" && styles.filterDropdownPillActive]}
            activeOpacity={0.8}
            onPress={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
          >
            <Text style={[styles.filterDropdownText, selectedStatus !== "All Status" && styles.filterDropdownTextActive]}>
              {selectedStatus === "All Status" ? "Status" : selectedStatus}
            </Text>
            <ChevronDown size={14} color={selectedStatus !== "All Status" ? COLORS.primary : "#64748B"} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* 4. RESULTS SUMMARY SUBHEADER: "XX RESULTS | Property in Locality for Sale"*/}
      {/* ========================================================================= */}
      <View style={styles.resultsCountBar}>
        <Text style={styles.resultsCountBold}>
          {filteredProperties.length} RESULTS
        </Text>
        <Text style={styles.resultsCountDivider}> | </Text>
        <Text style={styles.resultsCountSubtext}>
          {selectedType !== "All Types" ? `${selectedType} in ` : "Property in "}
          {searchQuery.trim() ? searchQuery.trim() : "Chennai"} for {dealTab}
        </Text>
      </View>

      {/* ========================================================================= */}
      {/* 5. RESULTS LIST (Exact card design from Image 2 + Details from Image 1)   */}
      {/* ========================================================================= */}
      <ScrollView
        style={styles.resultsListScroll}
        contentContainerStyle={styles.resultsListContent}
        showsVerticalScrollIndicator={false}
      >
        {listingsLoading ? (
          <SkeletonPropertyCard count={3} />
        ) : listingsError ? (
          <NoNetworkState onRetry={refreshListings} />
        ) : filteredProperties.length === 0 ? (
          <View style={styles.emptyResultsBox}>
            <MapPin size={42} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No matching properties found</Text>
            <Text style={styles.emptySubtitle}>
              Try clearing your filters or searching for another locality like Anna Nagar, OMR, or Velachery.
            </Text>
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={handleClearAllFilters}>
              <Text style={styles.clearFiltersBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredProperties.map((property, idx) => {
            const saved = isWishlisted(property.id);
            const { perSqft, statusText, tags } = getCardSpecs(property);

            return (
              <View key={property.id}>
                <TouchableOpacity
                  style={styles.propertyCard}
                  activeOpacity={0.93}
                  onPress={() => openProperty(property)}
                >
                {/* Media Container with Image, Bookmark icon and 10 photos badge */}
                <View style={styles.cardMediaContainer}>
                  <SafeImage source={{ uri: property.image }} style={styles.cardImage} />

                  {/* Heart / Favorite Button in Top Right (Matching Home Screen) */}
                  <TouchableOpacity
                    style={styles.cardHeartBtn}
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

                  {/* 10 Photos Badge in Bottom Right (Matching Image 2) */}
                  <View style={styles.photoCountBadge}>
                    <Text style={styles.photoCountText}>
                      {property.gallery ? `${property.gallery.length} photos` : "10 photos"}
                    </Text>
                  </View>
                </View>

                {/* Card Details Body (Matching Image 2 + Adapted Details from Image 1) */}
                <View style={styles.cardBody}>
                  {/* Row 1: Title on Left, Rating on Right (e.g. 7 Stonesilver Drive    ★ 4.9) */}
                  <View style={styles.titleRatingRow}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>
                      {property.address ? property.address.split(",")[0] : property.title}
                    </Text>
                    <View style={styles.ratingBadge}>
                      <Star size={13} color={COLORS.star} fill={COLORS.star} style={{ marginRight: 3 }} />
                      <Text style={styles.ratingText}>{property.rating || 4.9}</Text>
                    </View>
                  </View>

                  {/* Row 2: Price (e.g. $4.688/month or ₹1.45 Cr • ₹7,838 /sqft) */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceMainText}>
                      {property.price}
                    </Text>
                    <Text style={styles.pricePeriodSubtext}>
                      {property.pricePeriod ? property.pricePeriod : ` • ${perSqft}`}
                    </Text>
                  </View>

                  {/* Row 3: Specs (5 beds    2 baths    3,457 sq ft - as in Image 2) */}
                  <View style={styles.specsRow}>
                    <Text style={styles.specItem}>
                      <Text style={styles.specBold}>{property.beds > 0 ? property.beds : 3} </Text>
                      <Text style={styles.specLabel}>beds</Text>
                    </Text>
                    <Text style={styles.specItem}>
                      <Text style={styles.specBold}>{property.baths > 0 ? property.baths : 2} </Text>
                      <Text style={styles.specLabel}>baths</Text>
                    </Text>
                    <Text style={styles.specItem}>
                      <Text style={styles.specBold}>{property.sqft} </Text>
                      <Text style={styles.specLabel}>sq ft</Text>
                    </Text>
                  </View>

                  {/* Row 4: Locality Address & Status Badge (Adapted Details from Image 1) */}
                  <View style={styles.locationStatusRow}>
                    <View style={styles.locationBox}>
                      <MapPin size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {property.address || property.location}
                      </Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{statusText}</Text>
                    </View>
                  </View>

                  {/* Row 5: Feature Tags (Gated Society, Power Backup, Covered Parking...) */}
                  <View style={styles.featureChipsRow}>
                    {tags.map((tag, idx) => (
                      <View key={idx} style={styles.featureChip}>
                        <Text style={styles.featureChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Row 6: Builder Footer & Action Buttons */}
                  <View style={styles.builderFooterRow}>
                    <View style={styles.agentContactLeft}>
                      <View style={styles.agentAvatarBox}>
                        <Image
                          source={{
                            uri:
                              property.agent?.avatar ||
                              "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
                          }}
                          style={styles.agentAvatar}
                        />
                        <View style={styles.agentVerifiedBadge}>
                          <Check size={7} color="#FFFFFF" strokeWidth={3.5} />
                        </View>
                      </View>
                      <View style={styles.builderInfoBox}>
                        <Text style={styles.agencyNameText} numberOfLines={1}>
                          {property.agent?.agency || "Chennai Prime Realty"}
                        </Text>
                        <Text style={styles.agentSubText} numberOfLines={1}>
                          {property.agent?.name || "Verified Agent"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.footerActionButtons}>
                      {/* View Number Button */}
                      <TouchableOpacity
                        style={styles.viewNumberBtn}
                        activeOpacity={0.8}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleViewNumber(property);
                        }}
                      >
                        <Text style={styles.viewNumberBtnText}>View Number</Text>
                      </TouchableOpacity>

                      {/* WhatsApp Button */}
                      <TouchableOpacity
                        style={styles.whatsAppCircleBtn}
                        activeOpacity={0.85}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleWhatsApp(property);
                        }}
                      >
                        <MessageCircle size={16} color="#16A34A" />
                      </TouchableOpacity>

                      {/* Call Button */}
                      <TouchableOpacity
                        style={styles.callCircleBtn}
                        activeOpacity={0.85}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCall(property);
                        }}
                      >
                        <Phone size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

                {/* Separator line between cards */}
                {idx < filteredProperties.length - 1 && (
                  <View style={styles.cardSeparatorLine} />
                )}
              </View>
            );
          })
        )}
        {!listingsLoading && !listingsError && total > 0 && filteredProperties.length < total && (
          <TouchableOpacity
            style={[styles.clearFiltersBtn, { alignSelf: "center", marginVertical: 16 }]}
            onPress={loadMoreListings}
            disabled={listingsLoadingMore}
          >
            {listingsLoadingMore ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.clearFiltersBtnText}>Load more properties</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* 6. FILTER DROPDOWN BOTTOM SHEETS                                          */}
      {/* ========================================================================= */}

      {/* Sort Options Modal */}
      <Modal
        visible={activeDropdown === "sort"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Sort Properties</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.dropdownItem, selectedSort === opt.id && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedSort(opt.id);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, selectedSort === opt.id && styles.dropdownItemTextActive]}>
                  {opt.label}
                </Text>
                {selectedSort === opt.id && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Property Type Options Modal */}
      <Modal
        visible={activeDropdown === "type"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Property Type</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {PROPERTY_TYPES.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownItem, selectedType === opt && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedType(opt);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, selectedType === opt && styles.dropdownItemTextActive]}>
                  {opt}
                </Text>
                {selectedType === opt && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Budget Options Modal */}
      <Modal
        visible={activeDropdown === "budget"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Budget</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {BUDGET_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.dropdownItem, selectedBudget === opt.label && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedBudget(opt.label);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, selectedBudget === opt.label && styles.dropdownItemTextActive]}>
                  {opt.label}
                </Text>
                {selectedBudget === opt.label && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* BHK Options Modal */}
      <Modal
        visible={activeDropdown === "bhk"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Bedrooms (BHK)</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {BHK_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownItem, selectedBhk === opt && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedBhk(opt);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, selectedBhk === opt && styles.dropdownItemTextActive]}>
                  {opt}
                </Text>
                {selectedBhk === opt && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Construction Status Options Modal */}
      <Modal
        visible={activeDropdown === "status"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Construction Status</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.dropdownItem, selectedStatus === opt && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedStatus(opt);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, selectedStatus === opt && styles.dropdownItemTextActive]}>
                  {opt}
                </Text>
                {selectedStatus === opt && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* All Filters Sheet */}
      <Modal
        visible={activeDropdown === "allFilters"}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.allFiltersSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Deal Type */}
              <Text style={styles.filterSectionTitle}>Listing Type</Text>
              <View style={styles.filterPillsRowWrap}>
                {["Buy", "Resale", "Rent", "Lease"].map((deal) => (
                  <TouchableOpacity
                    key={deal}
                    style={[styles.modalChoicePill, dealTab === deal && styles.modalChoicePillActive]}
                    onPress={() => setDealTab(deal)}
                  >
                    <Text style={[styles.modalChoicePillText, dealTab === deal && styles.modalChoicePillTextActive]}>
                      {deal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* BHK */}
              <Text style={styles.filterSectionTitle}>Bedrooms (BHK)</Text>
              <View style={styles.filterPillsRowWrap}>
                {BHK_OPTIONS.map((bhk) => (
                  <TouchableOpacity
                    key={bhk}
                    style={[styles.modalChoicePill, selectedBhk === bhk && styles.modalChoicePillActive]}
                    onPress={() => setSelectedBhk(bhk)}
                  >
                    <Text style={[styles.modalChoicePillText, selectedBhk === bhk && styles.modalChoicePillTextActive]}>
                      {bhk}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Property Type */}
              <Text style={styles.filterSectionTitle}>Property Type</Text>
              <View style={styles.filterPillsRowWrap}>
                {PROPERTY_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt}
                    style={[styles.modalChoicePill, selectedType === pt && styles.modalChoicePillActive]}
                    onPress={() => setSelectedType(pt)}
                  >
                    <Text style={[styles.modalChoicePillText, selectedType === pt && styles.modalChoicePillTextActive]}>
                      {pt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Construction Status */}
              <Text style={styles.filterSectionTitle}>Construction Status</Text>
              <View style={styles.filterPillsRowWrap}>
                {STATUS_OPTIONS.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.modalChoicePill, selectedStatus === st && styles.modalChoicePillActive]}
                    onPress={() => setSelectedStatus(st)}
                  >
                    <Text style={[styles.modalChoicePillText, selectedStatus === st && styles.modalChoicePillTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.allFiltersFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleClearAllFilters}>
                <Text style={styles.resetBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setActiveDropdown(null)}
              >
                <Text style={styles.applyBtnText}>
                  Show {filteredProperties.length} Properties
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. VIEW NUMBER QUICK MODAL                                                */}
      {/* ========================================================================= */}
      <Modal
        visible={!!viewedNumberProperty}
        transparent
        animationType="slide"
        onRequestClose={() => setViewedNumberProperty(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setViewedNumberProperty(null)}
        >
          <TouchableOpacity
            style={styles.agentContactBottomSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandleBar} />

            {/* Header Row */}
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>Contact Seller / Agent</Text>
                <Text style={styles.sheetSubtitle}>Verified Real Estate Partner</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setViewedNumberProperty(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Agent Profile Box */}
            <View style={styles.sheetAgentProfileCard}>
              <View style={styles.modalAvatarBox}>
                {viewedNumberProperty?.agent?.avatar ? (
                  <Image
                    source={{ uri: viewedNumberProperty.agent.avatar }}
                    style={styles.modalAvatarImage}
                  />
                ) : (
                  <CheckCircle2 size={30} color="#0F172A" />
                )}
                <View style={styles.agentVerifiedCheck}>
                  <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
                </View>
              </View>

              <View style={styles.sheetAgentInfo}>
                <Text style={styles.contactAgentName}>
                  {viewedNumberProperty?.agent?.name || "Verified Agent"}
                </Text>
                <Text style={styles.contactAgencyName}>
                  {viewedNumberProperty?.agent?.agency || "Chennai Verified Partner"}
                </Text>
                <Text style={styles.sheetPropertyContext} numberOfLines={1}>
                  Ref: <Text style={styles.sheetPropertyTitleHighlight}>{viewedNumberProperty?.title}</Text> ({viewedNumberProperty?.price})
                </Text>
              </View>
            </View>

            {/* Phone Number Display with Tap to Copy */}
            <TouchableOpacity
              style={styles.phoneDisplayBox}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  "Phone Number Copied! 📋",
                  `${revealedPhone || viewedNumberProperty?.agent?.phone || "+91 98401 22334"} is ready to use.`
                );
              }}
            >
              <View style={styles.phoneIconCircle}>
                <Phone size={17} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.phoneLabelSmall}>CONTACT NUMBER</Text>
                <Text style={styles.phoneDisplayText}>
                  {revealedPhone || viewedNumberProperty?.agent?.phone || "+91 98401 22334"}
                </Text>
              </View>
              <View style={styles.copyBadge}>
                <Copy size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.copyBadgeText}>Copy</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.sheetAvailabilityNote}>
              ⚡ Usually responds within 15 minutes • 9:00 AM – 8:00 PM
            </Text>

            {/* Action Buttons: Call Now & WhatsApp */}
            <View style={styles.contactModalActions}>
              <TouchableOpacity
                style={styles.callNowBtn}
                activeOpacity={0.85}
                onPress={() => {
                  handleCall(
                    revealedPhone && viewedNumberProperty
                      ? {
                          ...viewedNumberProperty,
                          agent: { ...(viewedNumberProperty.agent || {}), phone: revealedPhone },
                        }
                      : viewedNumberProperty
                  );
                  setViewedNumberProperty(null);
                }}
              >
                <Phone size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.callNowBtnText}>Call Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.whatsappNowBtn}
                activeOpacity={0.85}
                onPress={() => {
                  handleWhatsApp(
                    revealedPhone && viewedNumberProperty
                      ? {
                          ...viewedNumberProperty,
                          agent: { ...(viewedNumberProperty.agent || {}), phone: revealedPhone },
                        }
                      : viewedNumberProperty
                  );
                  setViewedNumberProperty(null);
                }}
              >
                <MessageCircle size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.whatsappNowBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ================= SEARCH PROPERTY FILTER MODAL ================= */}
      <SearchPropertyModal
        visible={isSearchModalOpen}
        onClose={() => {
          const wasFromNavbar = openedFromNavbarRef.current;
          setIsSearchModalOpen(false);
          setFromNavbar(false);
          navigation.setParams({ openFilterModal: undefined, fromNavbar: undefined });
          if (wasFromNavbar) {
            navigation.navigate("Home");
          }
        }}
        onApply={(filters) => {
          setIsSearchModalOpen(false);
          setFromNavbar(false);
          navigation.setParams({ openFilterModal: undefined, fromNavbar: undefined });
          setSearchQuery(filters.locality);
          setSelectedType(filters.propertyType);
          setSelectedBhk(filters.bhk);
          setMinBudget(filters.budgetMin);
          setMaxBudget(filters.budgetMax);
          setSelectedStatus(filters.constructionStatus);
          if (filters.modalBudget) setSelectedBudget(filters.modalBudget);
          if (filters.dealType) setDealTab(filters.dealType);
        }}
        dealType={dealTab}
        initialLocality={searchQuery}
        initialPropertyType={selectedType}
        initialBhk={selectedBhk}
        initialStatus={selectedStatus}
        initialMinBudget={minBudget}
        initialMaxBudget={maxBudget}
        initialBudgetPreset={selectedBudget}
      />

      {/* ========================================================================= */}
      {/* 8. PROPERTY DETAIL MODAL                                                  */}
      {/* ========================================================================= */}
      <PropertyDetailModal
        visible={!!selectedProperty}
        property={selectedProperty}
        onClose={() => {
          setDetailLoading(false);
          setSelectedProperty(null);
        }}
        onSelectProperty={(p) => openProperty(p)}
        isWishlisted={isWishlisted}
        onToggleWishlist={toggleWishlist}
        detailLoading={detailLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* 1. Header Bar */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 10 : 6,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInputContainer: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginHorizontal: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    paddingVertical: 0,
  },

  /* Suggestions Dropdown */
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeSuggestionsText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  suggestionChipsScroll: {
    flexDirection: "row",
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  suggestionChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: COLORS.primary,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
  },
  suggestionChipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  /* 2. Filter Pills */
  filterPillsContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterPillsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterIconPill: {
    width: 36,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterIconPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  filterDropdownPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterDropdownPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  filterDropdownText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  filterDropdownTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  /* 3. Subheader */
  resultsCountBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  resultsCountBold: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  resultsCountDivider: {
    fontSize: 12,
    color: "#94A3B8",
    marginHorizontal: 3,
  },
  resultsCountSubtext: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  /* 4. Results List */
  resultsListScroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  resultsListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },

  /* Property Card */
  propertyCard: {
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  cardSeparatorLine: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 20,
  },
  cardMediaContainer: {
    height: 220,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardHeartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Card Body */
  cardBody: {
    paddingTop: 14,
    paddingHorizontal: 4,
  },
  titleRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 10,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  priceMainText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  pricePeriodSubtext: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginLeft: 3,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 8,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  specBold: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  specLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#475569",
  },
  locationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
    flex: 1,
  },
  statusPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  featureChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  featureChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  builderFooterRow: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentContactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  agentAvatarBox: {
    position: "relative",
    marginRight: 8,
  },
  agentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
  },
  agentVerifiedBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  builderInfoBox: {
    flex: 1,
    justifyContent: "center",
  },
  agencyNameText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  agentSubText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 1,
  },
  footerActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  viewNumberBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  viewNumberBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  whatsAppCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  callCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Empty Box */
  emptyResultsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  clearFiltersBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 100,
  },
  clearFiltersBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  dropdownSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  dropdownItemActive: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  /* All Filters Sheet */
  allFiltersSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterPillsRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  modalChoicePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  modalChoicePillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#F0FDF4",
  },
  modalChoicePillText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  modalChoicePillTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  allFiltersFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  applyBtn: {
    flex: 2,
    height: 44,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Contact Agent Bottom Sheet */
  agentContactBottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 38 : 24,
    width: "100%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandleBar: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetAgentProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  modalAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  agentVerifiedCheck: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sheetAgentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactAgentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  contactAgencyName: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  sheetPropertyContext: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 3,
  },
  sheetPropertyTitleHighlight: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  phoneDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  phoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight || "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  phoneLabelSmall: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  phoneDisplayText: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
    letterSpacing: 0.5,
  },
  copyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  copyBadgeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  sheetAvailabilityNote: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 18,
    marginTop: 4,
  },
  contactModalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  callNowBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  callNowBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  whatsappNowBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappNowBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
