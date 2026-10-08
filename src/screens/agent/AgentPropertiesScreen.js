import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  MapPin,
  CheckCircle2,
  Phone,
  MessageCircle,
  Building2,
  Bed,
  Maximize2,
  X,
  Users,
  Eye,
  SlidersHorizontal,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useAgent } from "../../context/AgentContext";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import AppBrandHeader from "../../components/AppBrandHeader";
import EmptyState from "../../components/owner/EmptyState";

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
    leads,
    matchPropertyToLead,
  } = useAgent();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDealType, setSelectedDealType] = useState("All");
  const [selectedLocalityFilter, setSelectedLocalityFilter] = useState("All Locations");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedBhk, setSelectedBhk] = useState("All BHK");
  const [selectedBudget, setSelectedBudget] = useState("All Budgets");

  // Selected property for detail view modal
  const [activePropertyModal, setActivePropertyModal] = useState(null);

  // Match Lead sheet state
  const [matchingProperty, setMatchingProperty] = useState(null);

  // Filter properties logic
  const filteredProperties = useMemo(() => {
    return localityProperties.filter((item) => {
      // Deal type
      if (selectedDealType === "Rent" && item.badgeType !== "rent") return false;
      if (
        selectedDealType === "Buy" &&
        item.badgeType !== "sale" &&
        item.badgeType !== "resale"
      )
        return false;
      if (selectedDealType === "Lease" && item.badgeType !== "lease") return false;

      // Locality dropdown filter
      if (selectedLocalityFilter !== "All Locations") {
        const itemLoc = (item.location || "").toLowerCase();
        if (!itemLoc.includes(selectedLocalityFilter.toLowerCase())) return false;
      }

      // Property type
      if (selectedType !== "All Types") {
        if ((item.type || "").toLowerCase() !== selectedType.toLowerCase()) return false;
      }

      // BHK
      if (selectedBhk !== "All BHK") {
        const num = parseInt(selectedBhk);
        if (selectedBhk === "4+ BHK") {
          if ((item.beds || 0) < 4) return false;
        } else if ((item.beds || 0) !== num) {
          return false;
        }
      }

      // Budget filter
      if (selectedBudget !== "All Budgets") {
        const priceStr = item.price || "";
        if (selectedBudget === "Under ₹25K") {
          if (!priceStr.includes("/mo") && !priceStr.includes("/month")) return false;
          const num = parseInt(priceStr.replace(/[^0-9]/g, "")) || 0;
          if (num > 25000) return false;
        } else if (selectedBudget === "₹25K – ₹50K") {
          if (!priceStr.includes("/mo") && !priceStr.includes("/month")) return false;
          const num = parseInt(priceStr.replace(/[^0-9]/g, "")) || 0;
          if (num < 25000 || num > 50000) return false;
        } else if (selectedBudget === "₹50K – ₹1L") {
          if (!priceStr.includes("/mo") && !priceStr.includes("/month")) return false;
          const num = parseInt(priceStr.replace(/[^0-9]/g, "")) || 0;
          if (num < 50000) return false;
        } else if (selectedBudget === "Under ₹1.5 Cr") {
          if (priceStr.includes("/mo") || priceStr.includes("/month")) return false;
          if (priceStr.includes("Cr")) {
            const cr = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
            if (cr > 1.5) return false;
          }
        } else if (selectedBudget === "₹1.5 Cr – ₹3 Cr") {
          if (priceStr.includes("/mo") || priceStr.includes("/month")) return false;
          if (priceStr.includes("Cr")) {
            const cr = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
            if (cr < 1.5 || cr > 3) return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (item.title || "").toLowerCase().includes(q);
        const locMatch = (item.location || "").toLowerCase().includes(q);
        const addrMatch = (item.address || "").toLowerCase().includes(q);
        if (!titleMatch && !locMatch && !addrMatch) return false;
      }

      return true;
    });
  }, [
    localityProperties,
    selectedDealType,
    selectedLocalityFilter,
    selectedType,
    selectedBhk,
    selectedBudget,
    searchQuery,
  ]);

  const handleContactOwner = (item, type = "whatsapp") => {
    const rawPhone = item.ownerPhone || "+919840012345";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

    if (type === "whatsapp") {
      const text = encodeURIComponent(
        `Hello! I am a RESTAMP Agent contacting you regarding your property "${item.title}" in ${item.location}. I have interested clients and would like to arrange a site visit.`
      );
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
        Alert.alert("WhatsApp Unavailable", `Contact Owner at ${rawPhone}`);
      });
    } else {
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        Alert.alert("Call Contact", `Owner Phone: ${rawPhone}`);
      });
    }
  };

  const handleOpenMatchSheet = (property) => {
    setMatchingProperty(property);
  };

  const handleConfirmMatch = (lead) => {
    if (!matchingProperty) return;
    matchPropertyToLead(lead.id, matchingProperty);
    const propTitle = matchingProperty.title;
    setMatchingProperty(null);
    Alert.alert(
      "Lead Matched! 🎉",
      `Successfully matched "${propTitle}" with ${lead.customerName}. You can now schedule a site visit or send property details.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER */}
      <AppBrandHeader currentRole="agent" />

      {/* SCREEN TITLE & SUBTITLE */}
      <View style={styles.screenHeader}>
        <Text style={styles.headerTitle}>Properties</Text>
        <Text style={styles.headerSubtitle}>
          Properties available in your subscribed locations
        </Text>
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
              selectedLocalityFilter !== "All Locations" && styles.filterChipActive,
            ]}
            onPress={() => {
              const options = ["All Locations", ...selectedLocalities];
              const curIdx = options.indexOf(selectedLocalityFilter);
              const nextIdx = (curIdx + 1) % options.length;
              setSelectedLocalityFilter(options[nextIdx]);
            }}
            activeOpacity={0.8}
          >
            <MapPin
              size={12}
              color={
                selectedLocalityFilter !== "All Locations" ? "#2563EB" : "#64748B"
              }
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedLocalityFilter !== "All Locations" &&
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

      {/* PROPERTIES LIST (REUSING BUYER PROPERTY CARD STYLING) */}
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

        {filteredProperties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No properties available in your selected locations."
            description="Try clearing your filters or select a different locality from your covered areas."
            buttonTitle={
              selectedDealType !== "All" ||
              selectedLocalityFilter !== "All Locations" ||
              selectedType !== "All Types"
                ? "Reset Filters"
                : undefined
            }
            onButtonPress={() => {
              setSelectedDealType("All");
              setSelectedLocalityFilter("All Locations");
              setSelectedType("All Types");
              setSelectedBhk("All BHK");
              setSelectedBudget("All Budgets");
              setSearchQuery("");
            }}
          />
        ) : (
          <View style={styles.propertiesList}>
            {filteredProperties.map((item) => {
              const beds = item.beds || 2;
              const sqft = item.sqft || 1200;
              const furnishing = item.furnishing || "Semi Furnished";
              const dealLabel =
                item.badgeType === "rent"
                  ? "Available for Rent"
                  : item.badgeType === "lease"
                  ? "Available for Lease"
                  : "Available for Buy";

              return (
                <View key={item.id} style={styles.propertyCard}>
                  {/* Property Image Container with Badges */}
                  <TouchableOpacity
                    style={styles.imageContainer}
                    activeOpacity={0.9}
                    onPress={() => setActivePropertyModal(item)}
                  >
                    <Image source={{ uri: item.image }} style={styles.propertyImage} />

                    <View style={styles.badgeRowTop}>
                      <View style={styles.verifiedBadge}>
                        <CheckCircle2 size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.verifiedBadgeText}>Owner Verified</Text>
                      </View>

                      <View style={styles.dealTypeBadge}>
                        <Text style={styles.dealTypeBadgeText}>{dealLabel}</Text>
                      </View>
                    </View>

                    <View style={styles.pricePill}>
                      <Text style={styles.pricePillText}>
                        {item.price}
                        {item.pricePeriod ? item.pricePeriod : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Property Card Body */}
                  <View style={styles.cardBody}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>
                      {beds} BHK {item.type || "Apartment"}
                    </Text>

                    <View style={styles.locationRow}>
                      <MapPin size={13} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>

                    {/* Specs Row */}
                    <View style={styles.specsRow}>
                      <View style={styles.specItem}>
                        <Bed size={13} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.specText}>{beds} BHK</Text>
                      </View>
                      <View style={styles.specDivider} />
                      <View style={styles.specItem}>
                        <Maximize2 size={13} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.specText}>{sqft} sq.ft</Text>
                      </View>
                      <View style={styles.specDivider} />
                      <View style={styles.specItem}>
                        <Text style={styles.specText}>{furnishing}</Text>
                      </View>
                    </View>

                    {/* Actions: View Details and Match Lead */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.viewDetailsBtn}
                        onPress={() => setActivePropertyModal(item)}
                        activeOpacity={0.8}
                      >
                        <Eye size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
                        <Text style={styles.viewDetailsBtnText}>View Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.matchLeadBtn}
                        onPress={() => handleOpenMatchSheet(item)}
                        activeOpacity={0.8}
                      >
                        <Users size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text style={styles.matchLeadBtnText}>Match Lead</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MATCH LEAD BOTTOM SHEET MODAL */}
      <Modal
        visible={!!matchingProperty}
        transparent
        animationType="slide"
        onRequestClose={() => setMatchingProperty(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.matchSheetContainer}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.sheetTitle}>Match Property with Lead</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {matchingProperty?.title} • {matchingProperty?.location}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeSheetBtn}
                onPress={() => setMatchingProperty(null)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSelectLeadLabel}>Select an Active Customer Lead:</Text>

            <ScrollView style={styles.leadsSheetScroll} showsVerticalScrollIndicator={false}>
              {leads.map((lead) => (
                <TouchableOpacity
                  key={lead.id}
                  style={styles.sheetLeadItem}
                  onPress={() => handleConfirmMatch(lead)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: lead.avatar }} style={styles.sheetLeadAvatar} />
                  <View style={styles.sheetLeadInfo}>
                    <Text style={styles.sheetLeadName}>{lead.customerName}</Text>
                    <Text style={styles.sheetLeadReq} numberOfLines={1}>
                      {lead.requirement} • {lead.preferredLocality}
                    </Text>
                    <Text style={styles.sheetLeadBudget}>Budget: {lead.budget}</Text>
                  </View>
                  <View style={styles.matchPill}>
                    <Text style={styles.matchPillText}>Assign</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REUSED BUYER PROPERTY DETAIL MODAL WITH AGENT ACTIONS */}
      <PropertyDetailModal
        property={activePropertyModal}
        visible={!!activePropertyModal}
        onClose={() => setActivePropertyModal(null)}
        isAgentView={true}
        onMatchToLead={(prop) => {
          setActivePropertyModal(null);
          handleOpenMatchSheet(prop);
        }}
        onContactOwner={(prop) => {
          handleContactOwner(prop, "whatsapp");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
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
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  propertyImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  badgeRowTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  dealTypeBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dealTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pricePill: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pricePillText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  cardBody: {
    padding: 14,
  },
  propertyTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12.5,
    color: "#64748B",
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  specText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  specDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  viewDetailsBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  matchLeadBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  matchLeadBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
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
  sheetSelectLeadLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
    marginVertical: 10,
  },
  leadsSheetScroll: {
    maxHeight: 320,
  },
  sheetLeadItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 8,
  },
  sheetLeadAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },
  sheetLeadInfo: {
    flex: 1,
    justifyContent: "center",
  },
  sheetLeadName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetLeadReq: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  sheetLeadBudget: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 2,
  },
  matchPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  matchPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
