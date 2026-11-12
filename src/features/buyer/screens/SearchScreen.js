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
  Share2,
  SlidersHorizontal,
  ChevronDown,
  MapPin,
  Check,
  X,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useListings } from "../api/useListings.js";
import { parseSmartQuery } from "../../../shared/api/mappers.js";
import { fetchListingDetail } from "../api/listings.js";
import {
  matchesStatusFilter,
} from "../utils/searchCardSpecs.js";
import { useWishlist } from "../context/WishlistContext.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";
import PropertyDetailModal from "../components/PropertyDetailModal.js";
import SearchPropertyModal from "../components/SearchPropertyModal.js";
import PropertySearchCard, { useViewNumber, ViewNumberSheet } from "../components/PropertySearchCard.js";

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
  { id: "area_desc", label: "Size: Largest First" },
];
// NOTE: no rating sort is offered — the backend has no rating field, so a
// "Rating: High to Low" option could not sort accurately. The mapper keeps a
// defensive rating->relevance fallback for legacy state only.

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

function formatShortRupees(rupees) {
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)} L`;
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

export default function SearchScreen({ navigation, route }) {
  // Initial parameters passed from HomeScreen; default empty — never auto-search Anna Nagar
  const initialLocality = route?.params?.locality !== undefined ? route.params.locality : "";
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { wishlist = [], isWishlisted, toggleWishlist } = useWishlist();
  // Protected enquiry actions resume here after a guest logs in (Change 2).
  const requireAuth = useRequireAuth(navigation);

  // Listen to bottom tab Search icon press
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("OPEN_SEARCH_FILTER_MODAL", (payload) => {
      if (payload?.target === "home") return;
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
  // Deal, type, BHK, budgets, construction status, query and supported sorts
  // run on the backend. Category pseudo-filters (Pool/Townhouse) have no
  // backend equivalent and are applied client-side below; verified-only is
  // guaranteed server-side.
  const budgetPreset = BUDGET_OPTIONS.find((b) => b.label === selectedBudget);
  // Smart query parsing (deterministic, no AI): confident BHK / type /
  // price tokens in the query become real backend filters; everything else
  // stays text for the multi-term matcher. Explicit UI selections always
  // win — parsed values fill only untouched defaults.
  const smartQuery = useMemo(() => parseSmartQuery(searchQuery), [searchQuery]);
  const effectiveBhk =
    selectedBhk !== "All BHK"
      ? selectedBhk
      : smartQuery.bedrooms != null
        ? `${smartQuery.bedrooms} BHK`
        : selectedBhk;
  const effectiveType =
    selectedType !== "All Types" ? selectedType : smartQuery.property_type || selectedType;
  const budgetsCustomized = minBudget > 0 || maxBudget < Infinity;
  const effectiveMinRupees = budgetsCustomized
    ? minBudget
    : smartQuery.min_price_paise != null
      ? smartQuery.min_price_paise / 100
      : minBudget;
  const effectiveMaxRupees = budgetsCustomized
    ? maxBudget
    : smartQuery.max_price_paise != null
      ? smartQuery.max_price_paise / 100
      : maxBudget;
  const smartLabels = useMemo(() => {
    const labels = [];
    if (selectedBhk === "All BHK" && smartQuery.bedrooms != null) {
      labels.push(`${smartQuery.bedrooms} BHK`);
    }
    if (selectedType === "All Types" && smartQuery.property_type) {
      labels.push(smartQuery.property_type.charAt(0) + smartQuery.property_type.slice(1).toLowerCase());
    }
    if (!budgetsCustomized && smartQuery.min_price_paise != null) {
      labels.push(`above ${formatShortRupees(smartQuery.min_price_paise / 100)}`);
    }
    if (!budgetsCustomized && smartQuery.max_price_paise != null) {
      labels.push(`under ${formatShortRupees(smartQuery.max_price_paise / 100)}`);
    }
    return labels;
  }, [smartQuery, selectedBhk, selectedType, budgetsCustomized]);
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
      selectedType: effectiveType,
      searchQuery: smartQuery.q,
      locality: "",
      bhk: effectiveBhk,
      presetMinRupees: budgetPreset ? budgetPreset.min : 0,
      presetMaxRupees: budgetPreset ? budgetPreset.max : Infinity,
      minRupees: effectiveMinRupees,
      maxRupees: effectiveMaxRupees,
      sort: selectedSort,
      constructionStatus: selectedStatus,
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
      // A listing without a real status matches no specific status.
      if (!matchesStatusFilter(item.constructionStatus, selectedStatus)) return false;
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

  // View Number sheet + card Call/WhatsApp, shared with the agent Properties
  // screen (components/PropertySearchCard.js).
  const viewNumber = useViewNumber({ navigation, requireAuth });

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


  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
          ) : (
            <SearchIcon size={18} color="#64748B" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleIconBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Activity")}
        >
          <Heart
            size={19}
            color={wishlist.length > 0 ? "#DC2626" : "#1E293B"}
            fill={wishlist.length > 0 ? "#DC2626" : "transparent"}
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
      {smartLabels.length > 0 ? (
        <View style={[styles.resultsCountBar, { paddingTop: 0 }]}>
          <Text style={styles.resultsCountSubtext}>
            Smart match: {smartLabels.join(" • ")}
          </Text>
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 8 }}
          >
            <X size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ========================================================================= */}
      {/* 5. RESULTS LIST (Exact card design from Image 2 + Details from Image 1)   */}
      {/* ========================================================================= */}
      <ScrollView
        style={styles.resultsListScroll}
        contentContainerStyle={styles.resultsListContent}
        showsVerticalScrollIndicator={false}
      >
        {listingsLoading ? (
          <View style={styles.emptyResultsBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.emptyTitle}>Loading properties…</Text>
          </View>
        ) : listingsError ? (
          <View style={styles.emptyResultsBox}>
            <MapPin size={42} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Couldn&apos;t load properties</Text>
            <Text style={styles.emptySubtitle}>
              Check that the backend is reachable and try again.
            </Text>
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={refreshListings}>
              <Text style={styles.clearFiltersBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
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

            return (
              <View key={property.id}>
                <PropertySearchCard
                  property={property}
                  saved={saved}
                  onPress={openProperty}
                  onToggleWishlist={toggleWishlist}
                  onViewNumber={viewNumber.handleViewNumber}
                  onWhatsApp={viewNumber.handleWhatsApp}
                  onCall={viewNumber.handleCall}
                />

                {/* Separator line between cards */}
                {idx < filteredProperties.length - 1 && (
                  <View style={styles.cardSeparatorLine} />
                )}
              </View>
            );
          })
        )}
        {!listingsLoading && !listingsError && total > 0 && apiProperties.length < total && (
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
      <ViewNumberSheet state={viewNumber} />

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
        onSelectProperty={(suggestion) => {
          // Open the tapped suggestion's detail screen, then dismiss
          // the search modal.
          if (suggestion) {
            openProperty(suggestion);
            setIsSearchModalOpen(false);
            setFromNavbar(false);
          }
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
        onLoginRequired={(resume) => requireAuth(resume)}        isWishlisted={isWishlisted}
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
  cardSeparatorLine: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 20,
  },

  /* Card Body */

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
    borderRadius: 10,
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
});
