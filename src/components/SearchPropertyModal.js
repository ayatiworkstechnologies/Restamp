import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X, XCircle, Check, ChevronDown, Bed, Maximize2 } from "./common/HugeIcon";
import SafeImage from "./common/SafeImage";
import COLORS from "../constants/colors";
import TYPOGRAPHY from "../constants/typography";
import { apiGet } from "../api/client";
import { toUiProperty, buildListingParams, parseSmartQuery } from "../api/mappers";

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

const PROPERTY_TYPE_OPTIONS = ["Home", "Plot", "Villa", "Apartment", "Commercial"];

const CONSTRUCTION_STATUS_OPTIONS = [
  "All Status",
  "Ready to move",
  "Under Construction",
  "New Launch",
];

const BHK_OPTIONS = ["All BHK", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"];

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
  { label: "₹2 Lakh+", value: 200000 },
];

const AreaSquareIcon = ({ size = 15, color = "#64748B" }) => (
  <View
    style={{
      width: size,
      height: size,
      borderWidth: 1.5,
      borderColor: color,
      borderRadius: 2.5,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 6,
    }}
  >
    <View
      style={{
        width: size - 6,
        height: size - 6,
        borderWidth: 1,
        borderColor: color,
        borderStyle: "dashed",
      }}
    />
  </View>
);

function SearchPropertyModal({
  visible,
  onClose,
  onApply,
  // Optional: called with the tapped suggestion's UI property (carries a real
  // numeric backendId). The parent opens the detail screen and dismisses this
  // modal; without it, taps only fill the query text (legacy behavior).
  onSelectProperty,
  dealType = "Buy",
  initialLocality = "",
  initialPropertyType = "Apartment",
  initialBhk = "All BHK",
  initialStatus = "All Status",
  initialMinBudget = 0,
  initialMaxBudget = Infinity,
  initialBudgetPreset = "All Budgets",
}) {
  const [localityInput, setLocalityInput] = useState(initialLocality);
  const [selectedLocality, setSelectedLocality] = useState(initialLocality);
  const [modalType, setModalType] = useState(initialPropertyType);
  const [modalBhk, setModalBhk] = useState(initialBhk);
  const [constructionStatus, setConstructionStatus] = useState(initialStatus);
  const [minBudget, setMinBudget] = useState(initialMinBudget);
  const [maxBudget, setMaxBudget] = useState(initialMaxBudget);
  const [modalBudget, setModalBudget] = useState(initialBudgetPreset);
  const [isMinDropdownOpen, setIsMinDropdownOpen] = useState(false);
  const [isMaxDropdownOpen, setIsMaxDropdownOpen] = useState(false);

  // Live suggestions from real backend records (debounced, req-guarded).
  // Matches the user's reference design with rounded thumbnail, specs, and price.
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const suggReqId = useRef(0);

  useEffect(() => {
    if (!visible) {
      suggReqId.current++;
      setLiveSuggestions([]);
      setSuggLoading(false);
      return undefined;
    }

    const text = (localityInput || "").trim().replace(/\s+/g, " ");
    if (text.length === 0) {
      suggReqId.current++;
      setLiveSuggestions([]);
      setSuggLoading(false);
      return undefined;
    }

    setSuggLoading(true);
    const timer = setTimeout(() => {
      const myReq = ++suggReqId.current;
      const dealMap = { Buy: "BUY", Resale: "RESALE", Rent: "RENT", Lease: "LEASE" };
      const typeMap = {
        Apartment: "APARTMENT",
        Villa: "VILLA",
        House: "HOUSE",
        Home: "HOUSE",
        Commercial: "COMMERCIAL",
        Plot: "PLOT",
      };
      const params = { q: text, page: 1, page_size: 6 };
      if (dealMap[dealType]) params.deal = dealMap[dealType];
      if (typeMap[modalType]) params.property_type = typeMap[modalType];
      apiGet("/buyer/listings", params).then(
        (data) => {
          if (suggReqId.current !== myReq) return;
          const items = Array.isArray(data.items) ? data.items : [];
          setLiveSuggestions(items.map(toUiProperty).slice(0, 6));
          setSuggLoading(false);
        },
        () => {
          if (suggReqId.current !== myReq) return;
          setLiveSuggestions([]);
          setSuggLoading(false);
        }
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      suggReqId.current++;
    };
  }, [localityInput, visible, dealType, modalType]);

  // Sync with initial props when opened
  useEffect(() => {
    if (visible) {
      setLocalityInput(initialLocality || "");
      setSelectedLocality(initialLocality || "");
      setModalType(initialPropertyType || "Apartment");
      setModalBhk(initialBhk || "All BHK");
      setConstructionStatus(initialStatus || "All Status");
      setMinBudget(initialMinBudget || 0);
      setMaxBudget(initialMaxBudget !== undefined ? initialMaxBudget : Infinity);
      setModalBudget(initialBudgetPreset || "All Budgets");
      setIsMinDropdownOpen(false);
      setIsMaxDropdownOpen(false);
    }
  }, [visible, initialLocality, initialPropertyType, initialBhk, initialStatus, initialMinBudget, initialMaxBudget, initialBudgetPreset]);

  const isRentDeal = dealType === "Rent" || dealType === "Lease";
  const currentMinList = isRentDeal ? RENT_MIN_BUDGETS : BUY_MIN_BUDGETS;
  const currentMaxList = isRentDeal ? RENT_MAX_BUDGETS : BUY_MAX_BUDGETS;

  const handleSelectBudgetPreset = (preset) => {
    setModalBudget(preset);
    setIsMinDropdownOpen(false);
    setIsMaxDropdownOpen(false);
    if (preset === "All Budgets") {
      setMinBudget(0);
      setMaxBudget(Infinity);
    } else if (preset === "Under ₹50L") {
      setMinBudget(0);
      setMaxBudget(5000000);
    } else if (preset === "₹50L - ₹1Cr") {
      setMinBudget(5000000);
      setMaxBudget(10000000);
    } else if (preset === "₹1Cr - ₹2Cr") {
      setMinBudget(10000000);
      setMaxBudget(20000000);
    } else if (preset === "₹2Cr+") {
      setMinBudget(20000000);
      setMaxBudget(Infinity);
    }
  };

  const budgetSummaryText = useMemo(() => {
    if (minBudget === 0 && maxBudget === Infinity) {
      return modalBudget || "All Budgets";
    }
    const minObj = currentMinList.find((b) => b.value === minBudget);
    const maxObj = currentMaxList.find((b) => b.value === maxBudget);
    if (minBudget > 0 && maxBudget < Infinity) {
      return `${minObj ? minObj.label : "₹" + minBudget} - ${maxObj ? maxObj.label : "₹" + maxBudget}`;
    }
    if (minBudget > 0) return `Above ${minObj ? minObj.label : "₹" + minBudget}`;
    if (maxBudget < Infinity) return `Up to ${maxObj ? maxObj.label : "₹" + maxBudget}`;
    return "All Budgets";
  }, [minBudget, maxBudget, modalBudget, currentMinList, currentMaxList]);

  // Live matched-properties count from the real backend (count_only).
  // The old mock-catalog count could show 0 while live suggestions showed
  // real matches, because the catalog lacks those records. Same effective
  // filters as Apply (via buildListingParams), so the count always agrees
  // with the results page. Failures hide the count instead of inventing one.
  const [liveMatchedCount, setLiveMatchedCount] = useState(null);
  const [countFailed, setCountFailed] = useState(false);
  const countReqId = useRef(0);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      const myReq = ++countReqId.current;
      let params;
      try {
        params = {
          ...buildListingParams(
            {
              dealType,
              propertyType: modalType,
              searchQuery: selectedLocality || localityInput || "",
              bhk: modalBhk,
              minRupees: minBudget,
              maxRupees: maxBudget,
              constructionStatus,
            },
            1,
            1
          ),
          count_only: true,
        };
      } catch {
        if (countReqId.current !== myReq) return;
        setCountFailed(true);
        return;
      }
      setCountFailed(false);
      apiGet("/buyer/listings", params).then(
        (data) => {
          if (countReqId.current !== myReq) return;
          setLiveMatchedCount(typeof data.total === "number" ? data.total : null);
          setCountFailed(false);
        },
        () => {
          if (countReqId.current !== myReq) return;
          setLiveMatchedCount(null);
          setCountFailed(true);
        }
      );
    }, 350);
    return () => {
      clearTimeout(timer);
      countReqId.current++;
    };
  }, [
    visible,
    dealType,
    selectedLocality,
    localityInput,
    modalType,
    modalBhk,
    minBudget,
    maxBudget,
    constructionStatus,
  ]);

  // Conflict note: when the query text implies filters that contradict the
  // selected controls, say so plainly — explicit selections always win, on
  // both this count and the results page.
  const filterConflictNote = useMemo(() => {
    const parsed = parseSmartQuery(selectedLocality || localityInput || "");
    const conflicts = [];
    if (parsed.bedrooms != null && modalBhk !== "All BHK") {
      const sel = parseInt(modalBhk, 10);
      if (modalBhk !== "4+ BHK" && sel !== parsed.bedrooms) {
        conflicts.push(`“${parsed.bedrooms} BHK” in text but ${modalBhk} selected`);
      } else if (modalBhk === "4+ BHK" && parsed.bedrooms < 4) {
        conflicts.push(`“${parsed.bedrooms} BHK” in text but 4+ BHK selected`);
      }
    }
    if (parsed.property_type && modalType && modalType !== "All Types") {
      const typeNames = {
        APARTMENT: "Apartment",
        VILLA: "Villa",
        HOUSE: "House",
        COMMERCIAL: "Commercial",
        PLOT: "Plot",
      };
      const implied = typeNames[parsed.property_type];
      if (implied && implied.toLowerCase() !== String(modalType).toLowerCase()) {
        conflicts.push(`“${parsed.property_type.charAt(0) + parsed.property_type.slice(1).toLowerCase()}” in text but ${modalType} selected`);
      }
    }
    if (conflicts.length === 0) return null;
    return `Note: ${conflicts.join("; ")} — selected filters will be used.`;
  }, [selectedLocality, localityInput, modalBhk, modalType]);

  const handleClearFilters = () => {
    setSelectedLocality("");
    setLocalityInput("");
    setModalType("Apartment");
    setModalBhk("All BHK");
    setMinBudget(0);
    setMaxBudget(Infinity);
    setModalBudget("All Budgets");
    setConstructionStatus("All Status");
    setIsMinDropdownOpen(false);
    setIsMaxDropdownOpen(false);
  };

  const handleApply = () => {
    setIsMinDropdownOpen(false);
    setIsMaxDropdownOpen(false);
    if (onApply) {
      onApply({
        locality: selectedLocality || localityInput || "",
        propertyType: modalType,
        bhk: modalBhk,
        budgetMin: minBudget,
        budgetMax: maxBudget,
        modalBudget: modalBudget,
        constructionStatus: constructionStatus,
        dealType: dealType,
      });
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Search Property</Text>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.8}>
            <X size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScrollContent}
        >
          {/* 1. LOCALITY INPUT & POPULAR LOCALITIES */}
          <View style={styles.modalCard}>
            <Text style={styles.modalSectionLabel}>Enter Locality in Chennai</Text>
            <View style={styles.modalInputRow}>
              <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalTextInput}
                placeholder="Try '1bhk anna nagar' — every word must match"
                placeholderTextColor="#94A3B8"
                value={localityInput}
                underlineColorAndroid="transparent"
                onChangeText={(text) => {
                  setLocalityInput(text);
                  setSelectedLocality(text);
                }}
              />
              {localityInput.length > 0 && (
                <TouchableOpacity onPress={() => { setLocalityInput(""); setSelectedLocality(""); }}>
                  <XCircle size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.modalSubLabel}>Popular Localities</Text>
            <View style={styles.chipsWrap}>
              {LOCALITY_LIST.filter((loc) =>
                loc.toLowerCase().includes(localityInput.toLowerCase())
              ).map((loc) => {
                const isLocSelected = selectedLocality.toLowerCase() === loc.toLowerCase();
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.localityChip, isLocSelected && styles.localityChipSelected]}
                    onPress={() => {
                      setSelectedLocality(loc);
                      setLocalityInput(loc);
                    }}
                  >
                    <Text style={[styles.localityChipText, isLocSelected && styles.localityChipTextSelected]}>
                      {isLocSelected ? "✓ " : "+ "}{loc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Live matching properties / suggestions matching reference design */}
            {(suggLoading || liveSuggestions.length > 0) ? (
              <View style={styles.suggestionsListContainer}>
                <Text style={styles.suggestionsHeading}>
                  {suggLoading && liveSuggestions.length === 0 ? "Searching…" : "Matching Properties"}
                </Text>
                {suggLoading && liveSuggestions.length === 0 ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 14 }} />
                ) : (
                  liveSuggestions.map((s, index) => (
                    <View key={String(s.backendId ?? s.id ?? index)}>
                      <TouchableOpacity
                        style={styles.suggestionItemRow}
                        activeOpacity={0.88}
                        onPress={() => {
                          if (onSelectProperty && typeof s.backendId === "number") {
                            onSelectProperty(s);
                          } else {
                            setSelectedLocality(s.title);
                            setLocalityInput(s.title);
                          }
                        }}
                      >
                        <SafeImage
                          source={{ uri: s.image }}
                          style={styles.suggestionThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionTitleText} numberOfLines={1}>
                            {s.address || s.title}
                          </Text>
                          <View style={styles.suggestionSpecsRow}>
                            <Bed size={16} color="#64748B" strokeWidth={1.8} style={{ marginRight: 6 }} />
                            <Text style={styles.suggestionSpecText}>
                              {s.beds
                                ? `${s.beds} ${s.beds === 1 ? "Bedroom" : "Bedrooms"}`
                                : "Bedrooms not specified"}
                            </Text>
                            {s.sqft ? (
                              <>
                                <View style={{ width: 14 }} />
                                <AreaSquareIcon size={14} color="#64748B" />
                                <Text style={styles.suggestionSpecText}>{s.sqft} sqft</Text>
                              </>
                            ) : null}
                          </View>
                          <Text style={styles.suggestionPriceText}>
                            {s.price || "Price unavailable"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {index < liveSuggestions.length - 1 && (
                        <View style={styles.suggestionDivider} />
                      )}
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>

          {/* 2. PROPERTY TYPE */}
          <View style={styles.modalCard}>
            <Text style={styles.modalSectionLabel}>Property Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROPERTY_TYPE_OPTIONS.map((type) => {
                const isSelected = modalType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.modalFilterChip, isSelected && styles.modalFilterChipActive]}
                    onPress={() => setModalType(type)}
                  >
                    <Text style={[styles.modalFilterChipText, isSelected && styles.modalFilterChipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. BUDGET (MIN TO HIGH DROPDOWNS & PRESETS) */}
          <View style={styles.modalCard}>
            <View style={styles.budgetHeaderRow}>
              <Text style={styles.modalSectionLabel}>Budget</Text>
              <Text style={styles.selectedBudgetText}>{budgetSummaryText}</Text>
            </View>

            <View style={styles.budgetDropdownRow}>
              {/* Min Dropdown Button */}
              <TouchableOpacity
                style={[styles.budgetDropdownBtn, isMinDropdownOpen && styles.budgetDropdownBtnActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsMinDropdownOpen(!isMinDropdownOpen);
                  setIsMaxDropdownOpen(false);
                }}
              >
                <Text style={styles.budgetDropdownLabel}>Min Amount</Text>
                <View style={styles.budgetDropdownValueRow}>
                  <Text style={styles.budgetDropdownValText} numberOfLines={1}>
                    {currentMinList.find((b) => b.value === minBudget)?.label || "Min Amount"}
                  </Text>
                  <ChevronDown
                    size={15}
                    color={isMinDropdownOpen ? COLORS.primary : "#64748B"}
                    style={{ transform: [{ rotate: isMinDropdownOpen ? "180deg" : "0deg" }] }}
                  />
                </View>
              </TouchableOpacity>

              <Text style={styles.budgetToText}>to</Text>

              {/* High / Max Dropdown Button */}
              <TouchableOpacity
                style={[styles.budgetDropdownBtn, isMaxDropdownOpen && styles.budgetDropdownBtnActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsMaxDropdownOpen(!isMaxDropdownOpen);
                  setIsMinDropdownOpen(false);
                }}
              >
                <Text style={styles.budgetDropdownLabel}>High Amount</Text>
                <View style={styles.budgetDropdownValueRow}>
                  <Text style={styles.budgetDropdownValText} numberOfLines={1}>
                    {currentMaxList.find((b) => b.value === maxBudget)?.label || "High Amount"}
                  </Text>
                  <ChevronDown
                    size={15}
                    color={isMaxDropdownOpen ? COLORS.primary : "#64748B"}
                    style={{ transform: [{ rotate: isMaxDropdownOpen ? "180deg" : "0deg" }] }}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Min Popover Menu */}
            {isMinDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <Text style={styles.dropdownMenuHeader}>Select Minimum Budget</Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                  {currentMinList.map((item) => {
                    const isItemActive = minBudget === item.value;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.dropdownMenuItem, isItemActive && styles.dropdownMenuItemActive]}
                        onPress={() => {
                          setMinBudget(item.value);
                          setIsMinDropdownOpen(false);
                          setModalBudget("");
                        }}
                      >
                        <Text style={[styles.dropdownMenuText, isItemActive && styles.dropdownMenuTextActive]}>
                          {item.label}
                        </Text>
                        {isItemActive && <Check size={14} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Max Popover Menu */}
            {isMaxDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <Text style={styles.dropdownMenuHeader}>Select High / Maximum Budget</Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                  {currentMaxList.map((item) => {
                    const isItemActive = maxBudget === item.value;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.dropdownMenuItem, isItemActive && styles.dropdownMenuItemActive]}
                        onPress={() => {
                          setMaxBudget(item.value);
                          setIsMaxDropdownOpen(false);
                          setModalBudget("");
                        }}
                      >
                        <Text style={[styles.dropdownMenuText, isItemActive && styles.dropdownMenuTextActive]}>
                          {item.label}
                        </Text>
                        {isItemActive && <Check size={14} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Quick Preset Budget Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
              {BUDGET_OPTIONS.map((bg) => {
                const isSelected = modalBudget === bg;
                return (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.modalFilterChip, isSelected && styles.modalFilterChipActive]}
                    onPress={() => handleSelectBudgetPreset(bg)}
                  >
                    <Text style={[styles.modalFilterChipText, isSelected && styles.modalFilterChipTextActive]}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. CONSTRUCTION STATUS */}
          <View style={styles.modalCard}>
            <Text style={styles.modalSectionLabel}>Construction Status</Text>
            <View style={styles.statusChipsRow}>
              {CONSTRUCTION_STATUS_OPTIONS.map((status) => {
                const isSelected = constructionStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusFilterChip, isSelected && styles.statusFilterChipActive]}
                    onPress={() => setConstructionStatus(status)}
                  >
                    {isSelected && <Check size={13} color="#FFFFFF" style={{ marginRight: 4 }} />}
                    <Text style={[styles.statusFilterChipText, isSelected && styles.statusFilterChipTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 5. BEDROOMS (BHK) */}
          <View style={styles.modalCard}>
            <Text style={styles.modalSectionLabel}>Bedrooms (BHK)</Text>
            <View style={styles.bhkRow}>
              {BHK_OPTIONS.map((bhk) => {
                const isSelected = modalBhk === bhk;
                return (
                  <TouchableOpacity
                    key={bhk}
                    style={[styles.bhkPill, isSelected && styles.bhkPillActive]}
                    onPress={() => setModalBhk(bhk)}
                  >
                    <Text style={[styles.bhkPillText, isSelected && styles.bhkPillTextActive]}>
                      {bhk}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.modalBottomBar}>
          <TouchableOpacity style={styles.modalResetBtn} onPress={handleClearFilters} activeOpacity={0.7}>
            <Text style={styles.modalResetText}>Clear All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalShowBtn}
            activeOpacity={0.85}
            onPress={handleApply}
          >
            <Text style={styles.modalShowBtnText}>
              {typeof liveMatchedCount === "number"
                ? `Show ${liveMatchedCount} Properties`
                : "Show Properties"}
            </Text>
          </TouchableOpacity>
        </View>
        {filterConflictNote ? (
          <Text style={[styles.modalSubLabel, { textAlign: "center", paddingHorizontal: 20, paddingBottom: 12 }]}>
            {filterConflictNote}
          </Text>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  modalSectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 100,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  modalTextInput: {
    flex: 1,
    ...TYPOGRAPHY.inputText,
    fontSize: 13,
    color: "#0F172A",
    borderWidth: 0,
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
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
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  localityChipSelected: {
    backgroundColor: "#EFF6FF",
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
    borderColor: COLORS.primary,
  },
  modalFilterChipText: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#475569",
  },
  modalFilterChipTextActive: {
    color: COLORS.primary,
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
    backgroundColor: "#EFF6FF",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
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
    backgroundColor: "#EFF6FF",
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  statusFilterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: COLORS.primary,
  },
  statusFilterChipText: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#475569",
    fontWeight: "500",
  },
  statusFilterChipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  bhkRow: {
    flexDirection: "row",
    gap: 8,
  },
  // Bedroom Style
  bhkPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bhkPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: COLORS.primary,
  },
  bhkPillText: {
    ...TYPOGRAPHY.smallHelperText,
    color: "#475569",
  },
  bhkPillTextActive: {
    color: COLORS.primary,
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
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
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
    height: 48,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalShowBtnText: {
    ...TYPOGRAPHY.button,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  suggestionsHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 20,
    marginBottom: 8,
  },
  suggestionsListContainer: {
    marginTop: 8,
  },
  suggestionItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  suggestionThumb: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  suggestionTitleText: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 21,
  },
  suggestionSpecsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 6,
  },
  suggestionSpecText: {
    fontSize: 13.5,
    color: "#64748B",
    fontWeight: "400",
  },
  suggestionPriceText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  suggestionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 96,
  },
});

export default memo(SearchPropertyModal);
