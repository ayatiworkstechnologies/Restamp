import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  MapPin,
  CheckCircle2,
  Building2,
  X,
  SlidersHorizontal,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useAgent } from "../context/AgentContext.js";
import { ALL_LOCATIONS, filterAgentProperties, locationFilterOptions } from "../utils/agentCore.js";
import PropertyDetailModal from "../../buyer/components/PropertyDetailModal.js";
import PropertySearchCard, { useViewNumber, ViewNumberSheet } from "../../buyer/components/PropertySearchCard.js";
import EmptyState from "../../owner/components/EmptyState.js";
import { useWishlist } from "../../buyer/context/WishlistContext.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";

const DEAL_TYPES = ["All", "Buy", "Rent", "Lease"];
const PROPERTY_TYPES = ["All Types", "Apartment", "Villa", "House", "Commercial", "Plot"];
const BHK_OPTIONS = ["All BHK", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"];
const BUDGET_OPTIONS = [
  "All Budgets",
  "Under ₹25K",
  "₹25K – ₹50K",
  "₹50K – ₹1L",
  "Under ₹1.5 Cr",
  "₹1.5 Cr – ₹3 Cr",
];

export default function AgentPropertiesScreen({ navigation }) {
  const {
    selectedLocalities,
    localityProperties,
    inventoryStatus,
    reloadInventory,
  } = useAgent();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const requireAuth = useRequireAuth(navigation);
  // View Number sheet + card Call/WhatsApp: the same hook the buyer Search
  // screen uses; an agent outside its areas gets the agent upgrade prompt.
  const viewNumber = useViewNumber({ navigation, requireAuth });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDealType, setSelectedDealType] = useState("All");
  const [selectedLocalityFilter, setSelectedLocalityFilter] = useState(ALL_LOCATIONS);
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedBhk, setSelectedBhk] = useState("All BHK");
  const [selectedBudget, setSelectedBudget] = useState("All Budgets");

  // Selected property for detail view modal
  const [activePropertyModal, setActivePropertyModal] = useState(null);


  // Every filter and the smart search apply together (agentCore.js), so a
  // locality, deal, type, BHK or budget choice never resets another.
  const filteredProperties = useMemo(
    () =>
      filterAgentProperties(localityProperties, {
        deal: selectedDealType,
        locality: selectedLocalityFilter,
        type: selectedType,
        bhk: selectedBhk,
        budget: selectedBudget,
        query: searchQuery,
      }),
    [
      localityProperties,
      selectedDealType,
      selectedLocalityFilter,
      selectedType,
      selectedBhk,
      selectedBudget,
      searchQuery,
    ]
  );

  // Locality filter: a picker (All Locations + each plan locality). A choice
  // stays selected; it used to advance to the next locality on every tap.
  const [localityPickerOpen, setLocalityPickerOpen] = useState(false);
  const localityOptions = useMemo(() => locationFilterOptions(selectedLocalities), [selectedLocalities]);
  // A locality removed from the plan can't stay selected.
  useEffect(() => {
    if (!localityOptions.includes(selectedLocalityFilter)) setSelectedLocalityFilter(ALL_LOCATIONS);
  }, [localityOptions, selectedLocalityFilter]);
  const hasActiveFilters =
    selectedDealType !== "All" ||
    selectedLocalityFilter !== ALL_LOCATIONS ||
    selectedType !== "All Types" ||
    selectedBhk !== "All BHK" ||
    selectedBudget !== "All Budgets" ||
    searchQuery.trim() !== "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER */}

      {/* SCREEN TITLE & SUBTITLE */}
      <View style={styles.screenHeader}>
        <Text style={styles.headerTitle}>Properties</Text>
      </View>

      {/* SEARCH AND FILTERS */}
      <View style={styles.filterSection}>
        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties, BHK, or localities..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Primary Filter Chips: All, Buy, Rent, Lease */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {DEAL_TYPES.map((deal) => (
            <TouchableOpacity
              key={deal}
              style={[
                styles.dealChip,
                selectedDealType === deal && styles.dealChipActive,
              ]}
              onPress={() => setSelectedDealType(deal)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dealChipText,
                  selectedDealType === deal && styles.dealChipTextActive,
                ]}
              >
                {deal}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Subscribed Locations Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedLocalityFilter !== ALL_LOCATIONS && styles.filterChipActive,
            ]}
            onPress={() => setLocalityPickerOpen(true)}
            activeOpacity={0.8}
          >
            <MapPin
              size={12}
              color={
                selectedLocalityFilter !== ALL_LOCATIONS ? "#2563EB" : "#64748B"
              }
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedLocalityFilter !== ALL_LOCATIONS &&
                  styles.filterChipTextActive,
              ]}
            >
              {selectedLocalityFilter}
            </Text>
          </TouchableOpacity>

          {/* Property Types */}
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                selectedType === type && styles.filterChipActive,
              ]}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedType === type && styles.filterChipTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}

          {/* BHK */}
          {BHK_OPTIONS.map((bhk) => (
            <TouchableOpacity
              key={bhk}
              style={[
                styles.filterChip,
                selectedBhk === bhk && styles.filterChipActive,
              ]}
              onPress={() => setSelectedBhk(bhk)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedBhk === bhk && styles.filterChipTextActive,
                ]}
              >
                {bhk}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Budget */}
          {BUDGET_OPTIONS.map((budget) => (
            <TouchableOpacity
              key={budget}
              style={[
                styles.filterChip,
                selectedBudget === budget && styles.filterChipActive,
              ]}
              onPress={() => setSelectedBudget(budget)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedBudget === budget && styles.filterChipTextActive,
                ]}
              >
                {budget}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* PROPERTIES LIST (the buyer search card) */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultsInfoRow}>
          <Text style={styles.resultsCountText}>
            Showing <Text style={{ fontWeight: "700", color: "#0F172A" }}>{filteredProperties.length}</Text> properties
          </Text>
          <Text style={styles.resultsCoverageText}>
            Coverage: {selectedLocalities.length} Localities
          </Text>
        </View>

        {inventoryStatus === "loading" ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : inventoryStatus === "error" ? (
          // A failed load is never shown as "no properties".
          <EmptyState
            icon={Building2}
            title="Could not load properties."
            description="Check your connection and try again."
            buttonTitle="Try Again"
            onButtonPress={reloadInventory}
          />
        ) : filteredProperties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No properties available in your selected locations."
            description="Try clearing your filters or select a different locality from your covered areas."
            buttonTitle={hasActiveFilters ? "Reset Filters" : null}
            onButtonPress={() => {
              setSelectedDealType("All");
              setSelectedLocalityFilter(ALL_LOCATIONS);
              setSelectedType("All Types");
              setSelectedBhk("All BHK");
              setSelectedBudget("All Budgets");
              setSearchQuery("");
            }}
          />
        ) : (
          <View style={styles.propertiesList}>
            {/* The buyer search card (shared component): photo, wishlist heart,
                price, specs, location, View Number / WhatsApp / Call. Tapping
                it opens the shared property sheet. */}
            {filteredProperties.map((item) => (
              <PropertySearchCard
                key={item.id}
                property={item}
                saved={isWishlisted(item.id)}
                onPress={(prop) => setActivePropertyModal(prop)}
                onToggleWishlist={toggleWishlist}
                onViewNumber={viewNumber.handleViewNumber}
                onWhatsApp={viewNumber.handleWhatsApp}
                onCall={viewNumber.handleCall}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* LOCALITY FILTER PICKER */}
      <Modal
        visible={localityPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLocalityPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.matchSheetContainer}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.sheetTitle}>Filter by Location</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  Your plan covers {selectedLocalities.length} localit{selectedLocalities.length === 1 ? "y" : "ies"}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setLocalityPickerOpen(false)}>
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.leadsSheetScroll} showsVerticalScrollIndicator={false}>
              {localityOptions.map((option) => {
                const active = option === selectedLocalityFilter;
                return (
                  <TouchableOpacity
                    key={option}
                    style={styles.localityOptionRow}
                    onPress={() => {
                      setSelectedLocalityFilter(option);
                      setLocalityPickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <MapPin size={14} color={active ? COLORS.primary : "#64748B"} style={{ marginRight: 8 }} />
                    <Text style={[styles.localityOptionText, active && styles.localityOptionTextActive]}>
                      {option === ALL_LOCATIONS ? "All Locations (your plan)" : option}
                    </Text>
                    {active ? <CheckCircle2 size={16} color={COLORS.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* The buyer property sheet exactly as the buyer screens use it:
          Request Site Visit, Send Enquiry, Call, Got questions, wishlist
          heart and similar properties. Every action runs on the agent's own
          account (backend accepts BROKER on the buyer activity endpoints,
          and the buyer-mode guard never switches an agent to BUYER). */}
      <PropertyDetailModal
        visible={!!activePropertyModal}
        property={activePropertyModal}
        onClose={() => setActivePropertyModal(null)}
        onSelectProperty={(prop) => setActivePropertyModal(prop)}
        onLoginRequired={(resume) => requireAuth(resume)}
        isWishlisted={isWishlisted}
        onToggleWishlist={toggleWishlist}
        listingScope="agent"
      />
      <ViewNumberSheet state={viewNumber} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  localityOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  localityOptionText: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
  },
  localityOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
  },
  filterScroll: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dealChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dealChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dealChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  dealChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  resultsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  resultsCountText: {
    fontSize: 12.5,
    color: "#64748B",
  },
  resultsCoverageText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  propertiesList: {
    gap: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  matchSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  closeSheetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  leadsSheetScroll: {
    maxHeight: 320,
  },
});
