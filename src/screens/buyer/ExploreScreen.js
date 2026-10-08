import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MapPin,
  Search,
  XCircle,
  Heart,
  Star,
  Phone,
  MessageCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Building,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Compass,
  X,
  Copy,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import TYPOGRAPHY from "../../constants/typography";
import ALL_PROPERTIES, { CHENNAI_LOCALITIES } from "../../data/properties";
import { useWishlist } from "../../context/WishlistContext";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import SafeImage from "../../components/common/SafeImage";

// Enriched neighborhood data for Chennai localities
const LOCALITY_DATA = [
  {
    id: "loc-anna",
    name: "Anna Nagar",
    region: "Prime Central",
    count: "850+ Props",
    avgPrice: "₹9,800/sqft",
    growth: "+12.4% YoY",
    yield: "3.6%",
    metro: "Green Line (3 Stations)",
    vibe: "Upscale residential hub with wide avenues, premier schools, boutique dining, and rapid metro access.",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
    highlights: ["Shanthi Colony", "Tower Park", "2nd Avenue Hub"],
  },
  {
    id: "loc-omr",
    name: "OMR",
    region: "IT Expressway",
    count: "1,420+ Props",
    avgPrice: "₹6,800/sqft",
    growth: "+15.2% YoY",
    yield: "4.4%",
    metro: "Phase 2 Metro Corridor",
    vibe: "Chennai's premier tech corridor hosting Fortune 500 tech parks, gated communities, and high rental yields.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    highlights: ["TIDEL Park", "Sholinganallur", "Siruseri SIPCOT"],
  },
  {
    id: "loc-ecr",
    name: "ECR",
    region: "Coastal Beachfront",
    count: "680+ Props",
    avgPrice: "₹12,500/sqft",
    growth: "+14.1% YoY",
    yield: "3.2%",
    metro: "Scenic Highway & Sea-Link",
    vibe: "Prestigious coastal stretch famous for luxury sea-facing villas, private beach resorts, and tranquil living.",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
    highlights: ["Neelankarai Beach", "Palavakkam", "Akkarai Enclaves"],
  },
  {
    id: "loc-adyar",
    name: "Adyar",
    region: "Prime Central",
    count: "530+ Props",
    avgPrice: "₹14,200/sqft",
    growth: "+9.8% YoY",
    yield: "3.1%",
    metro: "Corridor 3 Metro",
    vibe: "Historic, heritage-rich luxury enclave bordered by the Adyar river and coastline, home to elite educational institutions.",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80",
    highlights: ["Gandhi Nagar", "Kasturibai Nagar", "Besant Ave"],
  },
  {
    id: "loc-velachery",
    name: "Velachery",
    region: "IT Expressway",
    count: "640+ Props",
    avgPrice: "₹7,600/sqft",
    growth: "+11.0% YoY",
    yield: "4.1%",
    metro: "MRTS & Inner Ring Metro",
    vibe: "Vibrant residential and commercial hotspot connecting South Chennai with OMR, packed with malls and transit hubs.",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
    highlights: ["Phoenix Marketcity", "100ft Bypass Rd", "Vijayanagar"],
  },
  {
    id: "loc-tnagar",
    name: "T. Nagar",
    region: "Prime Central",
    count: "910+ Props",
    avgPrice: "₹13,800/sqft",
    growth: "+8.5% YoY",
    yield: "3.5%",
    metro: "Blue Line Metro",
    vibe: "Chennai's retail heartbeat offering prime luxury flats, commercial headquarters, and central connectivity.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    highlights: ["GN Chetty Rd", "Panagal Park", "Pondy Bazaar"],
  },
  {
    id: "loc-guindy",
    name: "Guindy",
    region: "Suburban Hubs",
    count: "490+ Props",
    avgPrice: "₹11,000/sqft",
    growth: "+10.6% YoY",
    yield: "4.2%",
    metro: "Multi-Modal Blue Line",
    vibe: "Strategic corporate nexus bridging the airport with central business hubs, surrounded by national parks.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    highlights: ["Olympia Tech Park", "Race Course", "Kathipara Junction"],
  },
  {
    id: "loc-tambaram",
    name: "Tambaram",
    region: "Suburban Hubs",
    count: "720+ Props",
    avgPrice: "₹5,200/sqft",
    growth: "+13.7% YoY",
    yield: "4.5%",
    metro: "South Suburban Railway Hub",
    vibe: "Thriving suburban hub offering high affordability, excellent schools, and rapid connectivity via GST Road.",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80",
    highlights: ["GST Corridor", "MEPZ IT SEZ", "Tambaram West"],
  },
];

const REGION_TABS = [
  "All Localities",
  "Prime Central",
  "IT Expressway",
  "Coastal Beachfront",
  "Suburban Hubs",
];

export default function ExploreScreen({ navigation }) {
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [selectedRegion, setSelectedRegion] = useState("All Localities");
  const [selectedLocality, setSelectedLocality] = useState(LOCALITY_DATA[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [contactProperty, setContactProperty] = useState(null);

  // Filtered localities by region and search query
  const filteredLocalities = useMemo(() => {
    return LOCALITY_DATA.filter((loc) => {
      const matchesRegion =
        selectedRegion === "All Localities" || loc.region === selectedRegion;
      const matchesSearch =
        searchQuery.trim() === "" ||
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.region.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRegion && matchesSearch;
    });
  }, [selectedRegion, searchQuery]);

  // Properties matching selected locality
  const localityProperties = useMemo(() => {
    const locName = selectedLocality?.name?.toLowerCase() || "";
    const matched = ALL_PROPERTIES.filter((p) => {
      const locStr = (p.location || p.address || "").toLowerCase();
      return locStr.includes(locName);
    });

    // Fallback: if very few direct matches, take top properties
    return matched.length > 0 ? matched : ALL_PROPERTIES.slice(0, 6);
  }, [selectedLocality]);

  const handleCall = (phone, name) => {
    const cleanNumber = (phone || "").replace(/[^0-9+]/g, "");
    if (cleanNumber) {
      Linking.openURL(`tel:${cleanNumber}`).catch(() => {
        Alert.alert("Call Agent", `Dial ${phone} to speak with ${name || "the agent"}.`);
      });
    }
  };

  const handleWhatsApp = (property) => {
    const phone = property?.agent?.phone || "+919876543210";
    const cleanNumber = phone.replace(/[^0-9]/g, "");
    const msg = `Hi, I found ${property?.title || "your property"} in ${property?.location} on RESTAMP and would like more details.`;
    const url = `whatsapp://send?phone=${cleanNumber}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("WhatsApp", `Chat with agent at ${phone}`);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore by Location</Text>
        <Text style={styles.headerSubtitle}>
          Discover Chennai neighborhoods, price trends & verified listings
        </Text>

        {/* Locality Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search locality (e.g. Anna Nagar, OMR, ECR)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
              <XCircle size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= 1. REGION FILTER PILLS ================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionFilterList}
        >
          {REGION_TABS.map((region) => {
            const isActive = selectedRegion === region;
            return (
              <TouchableOpacity
                key={region}
                style={[styles.regionPill, isActive && styles.regionPillActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedRegion(region)}
              >
                <Text
                  style={[
                    styles.regionPillText,
                    isActive && styles.regionPillTextActive,
                  ]}
                >
                  {region}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= 2. LOCALITY SHOWCASE CAROUSEL ================= */}
        <View style={styles.showcaseHeader}>
          <Text style={styles.sectionTitle}>Top Neighborhoods</Text>
          <Text style={styles.sectionMeta}>{filteredLocalities.length} Localities</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.localityCarousel}
        >
          {filteredLocalities.map((loc) => {
            const isSelected = selectedLocality?.id === loc.id;
            return (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.localityCard,
                  isSelected && styles.localityCardSelected,
                ]}
                activeOpacity={0.88}
                onPress={() => setSelectedLocality(loc)}
              >
                <SafeImage source={{ uri: loc.image }} style={styles.localityImage} />
                <View style={styles.localityOverlay} />

                {/* Top Badge: Property Count */}
                <View style={styles.localityCountBadge}>
                  <Text style={styles.localityCountText}>{loc.count}</Text>
                </View>

                {/* Active Selection Check Indicator */}
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <CheckCircle2 size={16} color="#FFFFFF" fill="#0F172A" />
                  </View>
                )}

                {/* Bottom Content on Image */}
                <View style={styles.localityContent}>
                  <Text style={styles.localityName} numberOfLines={1}>
                    {loc.name}
                  </Text>

                  <View style={styles.localityMetricsRow}>
                    <Text style={styles.localityPriceText}>{loc.avgPrice}</Text>
                    <View style={styles.growthBadge}>
                      <Text style={styles.growthText}>{loc.growth}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= 3. SELECTED LOCALITY INSIGHTS CARD ================= */}
        {selectedLocality && (
          <View style={styles.localitySnapshotCard}>
            <View style={styles.snapshotTopRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.locationTitleRow}>
                  <MapPin size={16} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={styles.snapshotTitle}>{selectedLocality.name}</Text>
                  <View style={styles.regionTag}>
                    <Text style={styles.regionTagText}>{selectedLocality.region}</Text>
                  </View>
                </View>
                <Text style={styles.snapshotVibeText}>{selectedLocality.vibe}</Text>
              </View>
            </View>

            {/* Quick Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>AVERAGE PRICE</Text>
                <Text style={styles.metricValue}>{selectedLocality.avgPrice}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>RENTAL YIELD</Text>
                <Text style={styles.metricValue}>{selectedLocality.yield}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>PRICE GROWTH</Text>
                <Text style={[styles.metricValue, { color: "#16A34A" }]}>
                  {selectedLocality.growth}
                </Text>
              </View>
            </View>

            {/* Metro & Highlights Bar */}
            <View style={styles.highlightsBar}>
              <Compass size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.highlightsText} numberOfLines={1}>
                {selectedLocality.metro} • {selectedLocality.highlights?.join(", ")}
              </Text>
            </View>

            {/* Action to view in Search Screen */}
            <TouchableOpacity
              style={styles.searchLocalityBtn}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("Search", {
                  locality: selectedLocality.name,
                  fromNavbar: false,
                })
              }
            >
              <Text style={styles.searchLocalityBtnText}>
                Filter {selectedLocality.name} in Search
              </Text>
              <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* ================= 4. PROPERTIES IN THIS LOCALITY (AIRBNB MINIMALIST CARDS) ================= */}
        <View style={styles.propertiesHeaderRow}>
          <Text style={styles.sectionTitle}>
            Properties in {selectedLocality?.name || "Chennai"}
          </Text>
          <Text style={styles.sectionMeta}>{localityProperties.length} Available</Text>
        </View>

        <View style={styles.cardsList}>
          {localityProperties.map((property) => {
            const saved = isWishlisted(property.id);
            const statusText = property.constructionStatus || "Ready to move";
            const sqftNum = parseInt(String(property.sqft || 1500).replace(/,/g, "")) || 1500;
            const perSqft =
              property.rawPrice && sqftNum
                ? `₹${Math.round(property.rawPrice / sqftNum).toLocaleString("en-IN")}/sqft`
                : "₹7,200/sqft";

            return (
              <TouchableOpacity
                key={property.id}
                style={styles.propertyCard}
                activeOpacity={0.92}
                onPress={() => setSelectedProperty(property)}
              >
                {/* 1. Large 220px Hero Photo with Rounded Corners (Airbnb Style) */}
                <View style={styles.imageWrap}>
                  <SafeImage source={{ uri: property.image }} style={styles.cardImage} />

                  {/* Top-Left: Clean Frosted Status Pill */}
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{statusText}</Text>
                  </View>

                  {/* Top-Right: Floating Heart Button */}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    activeOpacity={0.85}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleWishlist(property);
                    }}
                  >
                    <Heart
                      size={18}
                      color={saved ? "#FF385C" : "#0F172A"}
                      fill={saved ? "#FF385C" : "none"}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                </View>

                {/* 2. Editorial Typography Below Image */}
                <View style={styles.cardContent}>
                  {/* Title & Rating */}
                  <View style={styles.titleRow}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>
                      {property.title}
                    </Text>
                    {property.rating && (
                      <View style={styles.ratingRow}>
                        <Star size={13} color="#0F172A" fill="#0F172A" />
                        <Text style={styles.ratingText}>{property.rating}</Text>
                      </View>
                    )}
                  </View>

                  {/* Location / Area */}
                  <Text style={styles.locationText} numberOfLines={1}>
                    {property.address || property.location}
                  </Text>

                  {/* Specs */}
                  <Text style={styles.specsText} numberOfLines={1}>
                    {property.beds > 0 ? `${property.beds} BHK` : "3 BHK"} • {property.sqft} sq ft
                  </Text>

                  {/* Price & Contact Row */}
                  <View style={styles.priceRow}>
                    <Text style={styles.propertyPrice}>
                      {property.price}
                      <Text style={styles.propertyPriceSub}> • {perSqft}</Text>
                    </Text>

                    <TouchableOpacity
                      style={styles.contactBtn}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        setContactProperty(property);
                      }}
                    >
                      <Phone size={12} color="#0F172A" style={{ marginRight: 4 }} />
                      <Text style={styles.contactBtnText}>Contact</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ================= PROPERTY DETAIL MODAL ================= */}
      <PropertyDetailModal
        visible={!!selectedProperty}
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isWishlisted={isWishlisted(selectedProperty?.id)}
        onToggleWishlist={toggleWishlist}
      />

      {/* ================= CONTACT BOTTOM SHEET ================= */}
      <Modal
        visible={!!contactProperty}
        transparent
        animationType="slide"
        onRequestClose={() => setContactProperty(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContactProperty(null)}
        >
          <TouchableOpacity
            style={styles.bottomSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {contactProperty?.agent?.name || "Verified Agent"}
                </Text>
                <Text style={styles.sheetSub}>
                  {contactProperty?.agent?.agency || "Chennai Prime Realty"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setContactProperty(null)}
              >
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Context */}
            <View style={styles.sheetContextBar}>
              <Building size={13} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.sheetContextText} numberOfLines={1}>
                {contactProperty?.title} ({contactProperty?.price})
              </Text>
            </View>

            {/* Phone Display */}
            <TouchableOpacity
              style={styles.phoneBox}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  "Copied!",
                  `${contactProperty?.agent?.phone || "+91 98401 22334"} copied to clipboard.`
                );
              }}
            >
              <View style={styles.phoneIconCircle}>
                <Phone size={14} color="#0F172A" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.phoneLabel}>PHONE NUMBER</Text>
                <Text style={styles.phoneNumber}>
                  {contactProperty?.agent?.phone || "+91 98401 22334"}
                </Text>
              </View>
              <View style={styles.copyPill}>
                <Copy size={11} color="#0F172A" style={{ marginRight: 4 }} />
                <Text style={styles.copyText}>Copy</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.sheetActionsRow}>
              <TouchableOpacity
                style={styles.sheetCallBtn}
                activeOpacity={0.85}
                onPress={() => {
                  handleCall(contactProperty?.agent?.phone, contactProperty?.agent?.name);
                  setContactProperty(null);
                }}
              >
                <Phone size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sheetCallText}>Call Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetWhatsappBtn}
                activeOpacity={0.85}
                onPress={() => {
                  handleWhatsApp(contactProperty);
                  setContactProperty(null);
                }}
              >
                <MessageCircle size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sheetWhatsappText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "400",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    color: "#0F172A",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* 1. Region Filter Pills */
  regionFilterList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  regionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  regionPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  regionPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  regionPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  /* 2. Locality Showcase Carousel */
  showcaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  sectionMeta: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
  },
  localityCarousel: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 16,
  },
  localityCard: {
    width: 170,
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  localityCardSelected: {
    borderWidth: 2,
    borderColor: "#0F172A",
  },
  localityImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  localityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  localityCountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  localityCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
  },
  selectedIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  localityContent: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  localityName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  localityMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  localityPriceText: {
    fontSize: 12,
    color: "#E2E8F0",
    fontWeight: "500",
  },
  growthBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  growthText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4ADE80",
  },

  /* 3. Locality Insights Snapshot */
  localitySnapshotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 20,
  },
  snapshotTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  snapshotTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  regionTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  regionTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  snapshotVibeText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  highlightsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  highlightsText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
    flex: 1,
  },
  searchLocalityBtn: {
    height: 44,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  searchLocalityBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  /* 4. Properties List (Airbnb Minimalist Cards) */
  propertiesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  cardsList: {
    paddingHorizontal: 16,
    gap: 22,
    paddingBottom: 24,
  },
  propertyCard: {
    backgroundColor: "#FFFFFF",
  },
  imageWrap: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  locationText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
    marginTop: 3,
  },
  specsText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 2,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  propertyPriceSub: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },

  /* Contact Bottom Sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 22,
    width: "100%",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  sheetSub: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "400",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContextBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 14,
  },
  sheetContextText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    flex: 1,
  },
  phoneBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  phoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 1,
  },
  copyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  copyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  sheetActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  sheetCallBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCallText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sheetWhatsappBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetWhatsappText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});