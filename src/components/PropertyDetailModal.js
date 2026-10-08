import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  CheckCircle2,
  MapPin,
  Phone,
  Send,
  MessageSquare,
  Calendar,
  Droplet,
  Activity,
  Shield,
  Zap,
  Layers,
  Truck,
  Home,
  Star,
  Check,
  X,
  ChevronRight,
  Users,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../constants/colors";
import TYPOGRAPHY from "../constants/typography";
import ALL_PROPERTIES, { RECOMMENDED_PROPERTIES } from "../data/properties";
import { fetchSimilar } from "../api/listings";
import SafeImage from "./common/SafeImage";
import { createEnquiry } from "../api/enquiries";
import { getAuthTokenSync } from "../api/client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const REC_CARD_WIDTH = 220;

const CHENNAI_LOCALITY_OPTIONS = [
  { name: "Anna Nagar", address: "2nd Avenue, Anna Nagar East, Chennai" },
  {
    name: "OMR IT Corridor",
    address: "Rajiv Gandhi Salai, Sholinganallur, OMR, Chennai",
  },
  { name: "Velachery", address: "100 Feet Bypass Rd, Velachery, Chennai" },
  { name: "T. Nagar", address: "GN Chetty Road, T. Nagar, Chennai" },
  { name: "Tambaram", address: "Mudichur Road, Tambaram West, Chennai" },
  { name: "Adyar", address: "Gandhi Nagar 3rd Main Rd, Adyar, Chennai" },
  {
    name: "ECR Beach Road",
    address: "Casuarina Drive, Neelankarai, ECR, Chennai",
  },
  { name: "Guindy", address: "Race Course Road, Guindy, Chennai" },
  { name: "Alwarpet", address: "TTK Road, Alwarpet, Chennai" },
  { name: "Besant Nagar", address: "4th Main Road, Elliot's Beach, Chennai" },
  { name: "Kilpauk", address: "Poonamallee High Road, Kilpauk, Chennai" },
  { name: "Porur", address: "Mount Poonamallee Road, Porur, Chennai" },
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "highlights", label: "Highlights" },
  { id: "details", label: "Property Details" },
  { id: "amenities", label: "Amenities" },
  { id: "location", label: "Location" },
];

export default function PropertyDetailModal({
  visible,
  property,
  onClose,
  onSelectProperty,
  isWishlisted,
  onToggleWishlist,
  detailLoading,
  isAgentView = false,
  onMatchToLead,
  onContactOwner,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [questionText, setQuestionText] = useState("");
  const [siteVisitRequested, setSiteVisitRequested] = useState(false);
  const [enquirySent, setEnquirySent] = useState(false);
  const [customAddress, setCustomAddress] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [customInputAddress, setCustomInputAddress] = useState("");

  // Live similar-properties state (Phase 4). Declared with the other hooks,
  // before any early return, to preserve hook order on every render.
  // Mock-sourced properties (no numeric backendId) skip fetching entirely.
  const [liveSimilar, setLiveSimilar] = useState(undefined);
  useEffect(() => {
    setLiveSimilar(undefined);
    const backendId = property && property.backendId;
    if (typeof backendId !== "number") return;
    let cancelled = false;
    fetchSimilar(backendId, 5).then(
      (cards) => {
        if (!cancelled) setLiveSimilar(cards);
      },
      () => {
        if (!cancelled) setLiveSimilar(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [property && property.backendId]);

  const mainScrollViewRef = useRef(null);
  const sectionYMap = useRef({});

  const scrollToSection = (tabId) => {
    setActiveTab(tabId);
    const yPos = sectionYMap.current[tabId];
    if (yPos !== undefined && mainScrollViewRef.current) {
      mainScrollViewRef.current.scrollTo({
        y: Math.max(0, yPos - 12),
        animated: true,
      });
    }
  };

  if (!property) return null;

  const saved = isWishlisted ? isWishlisted(property.id) : false;
  const displayAddress = customAddress || property.address || property.location;

  const sqftNum =
    parseInt(String(property.sqft || 1500).replace(/,/g, "")) || 1500;
  const perSqft =
    property.rawPrice && sqftNum
      ? `₹${Math.round(property.rawPrice / sqftNum).toLocaleString("en-IN")}/sqft`
      : "₹6,800/sqft";
  const statusText =
    property.constructionStatus ||
    (property.badge === "Just Added" ? "New Launch" : "Ready to move");

  let tags = [
    "Gated Society",
    "Power Backup",
    "Covered Parking",
    "Lift Access",
  ];
  if (property.type === "Apartment") {
    tags = ["Gated Society", "Power Backup", "Covered Parking", "Lift Access"];
  } else if (property.type === "Villa" || property.type === "House") {
    tags = [
      "Independent Villa",
      "Private Garden",
      "Corner Property",
      "2 Car Parking",
    ];
  } else if (property.type === "Commercial") {
    tags = [
      "Grade A Tech Park",
      "100% Power Backup",
      "High Speed Lifts",
      "Visitor Parking",
    ];
  } else if (property.type === "Plot") {
    tags = ["CMDA Approved", "Corner Property", "2 Side Open", "Clear Title"];
  }

  // Build photo gallery (main image + alternate architectural angles)
  const images = useMemo(() => {
    const rawList =
      property.gallery && property.gallery.length > 0
        ? property.gallery
        : [property.image];
    const cleaned = rawList.filter(
      (u) => typeof u === "string" && u.startsWith("http") && !u.includes("seed.local")
    );
    if (cleaned.length > 0) return cleaned;
    const baseImg =
      property.image && !property.image.includes("seed.local") && property.image.startsWith("http")
        ? property.image
        : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80";
    return [
      baseImg,
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80",
    ];
  }, [property]);

  // Similar properties: live API result wins once loaded (even when empty);
  // while loading, on error, or for mock flows, the existing mock fallback stays.
  const mockSimilarProps = (RECOMMENDED_PROPERTIES || ALL_PROPERTIES)
    .filter((p) => p.id !== (property && property.id))
    .slice(0, 5);
  const similarProps = Array.isArray(liveSimilar) ? liveSimilar : mockSimilarProps;

  const handleSendQuestion = () => {
    if (!questionText.trim()) {
      Alert.alert(
        "Please enter your question",
        "Type your query before sending.",
      );
      return;
    }
    Alert.alert(
      "Question Sent! 📩",
      `Your query regarding "${property.title}" has been forwarded to the owner. They will get back to you shortly!`,
      [{ text: "OK" }],
    );
    setQuestionText("");
  };

  const handleRequestSiteVisit = () => {
    setSiteVisitRequested(true);
    Alert.alert(
      "Site Visit Requested! 📅",
      `We have registered your request to visit "${property.title}". Our property consultant will contact you to confirm the time slot.`,
      [{ text: "Great, thanks!" }],
    );
  };

  const handleSendEnquiry = () => {
    // Phase 6: live enquiry when authenticated with a real listing id.
    // Otherwise the long-standing mock confirmation is preserved unchanged.
    const backendId = property && property.backendId;
    if (typeof backendId === "number" && getAuthTokenSync()) {
      createEnquiry(backendId)
        .then(() => {
          setEnquirySent(true);
          Alert.alert(
            "Enquiry Sent Successfully! 🚀",
            `Your interest in "${property.title}" (${property.price}) has been shared with the property seller.`,
            [{ text: "Done" }]
          );
        })
        .catch(() => {
          Alert.alert(
            "Couldn't send enquiry",
            "Please check your connection and try again.",
            [{ text: "OK" }]
          );
        });
      return;
    }
    setEnquirySent(true);
    Alert.alert(
      "Enquiry Sent Successfully! 🚀",
      `Your interest in "${property.title}" (${property.price}) has been shared with the property seller.`,
      [{ text: "Done" }],
    );
  };

  const quickQuestions = [
    "Is the price negotiable?",
    "Are home loans approved?",
    "Can I schedule a visit today?",
    "What is the maintenance fee?",
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.modalSafeArea}
        edges={["top", "left", "right"]}
      >
        {/* ================= HEADER BAR ================= */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={onClose}
            hitSlop={12}
          >
            <ArrowLeft size={20} color="#1E293B" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Property Details
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              hitSlop={8}
              onPress={async () => {
                try {
                  await Share.share({
                    message: `Check out ${property.title} in ${property.location} on RESTAMP for ${property.price}!`,
                  });
                } catch (e) {}
              }}
            >
              <Share2 size={19} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= SCROLLABLE CONTENT ================= */}
        <ScrollView
          ref={mainScrollViewRef}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* CHILD 0: HERO GALLERY & MAIN INFO (MATCHING IMAGE 2 + ADAPTED DETAILS) */}
          <View style={{ backgroundColor: "#FFFFFF", paddingBottom: 16 }}>
            {/* 1. PROPERTY IMAGE GALLERY HERO (Rounded Card matching Image 2) */}
            <View style={styles.heroCardContainer}>
              <View style={styles.galleryContainer}>
                <SafeImage
                  source={{ uri: images[activeImageIndex] || property.image }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />

                {/* Heart Wishlist Overlay Button (Matching Home Screen) */}
                <TouchableOpacity
                  style={styles.heroBookmarkBtn}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => onToggleWishlist && onToggleWishlist(property)}
                >
                  <Heart
                    size={22}
                    color={saved ? "#FF0000" : "#FFFFFF"}
                    fill={saved ? "#FF0000" : "rgba(0,0,0,0.3)"}
                  />
                </TouchableOpacity>

                {/* Live-detail loading overlay (Phase 3: real record fetch in flight) */}
                {detailLoading && (
                  <View style={styles.heroLoadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}

                {/* Photos Badge in Bottom Right (Matching Image 2) */}
                <View style={styles.heroPhotoCountBadge}>
                  <Text style={styles.heroPhotoCountText}>
                    {images.length > 0
                      ? `${images.length} photos`
                      : "10 photos"}
                  </Text>
                </View>
              </View>

              {/* Image Thumbnail Selector Strip */}
              <View style={styles.thumbnailStrip}>
                {images.map((imgUri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => setActiveImageIndex(idx)}
                    style={[
                      styles.thumbnailWrapper,
                      activeImageIndex === idx && styles.thumbnailActive,
                    ]}
                  >
                    <SafeImage
                      source={{ uri: imgUri }}
                      style={styles.thumbnailImg}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 2. MAIN INFO CARD (Matching Image 2 + Adapted Details from Image 1) */}
            <View style={styles.mainInfoCard}>
              {/* Line 1: Title on Left, Rating on Right */}
              <View style={styles.titleRatingRow}>
                <Text style={styles.propertyTitleText} numberOfLines={2}>
                  {property.title}
                </Text>
                <View style={styles.ratingBadge}>
                  <Star
                    size={14}
                    color={COLORS.star}
                    fill={COLORS.star}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.ratingText}>
                    {property.rating || 4.9}
                  </Text>
                </View>
              </View>

              {/* Line 2: Price (e.g. $4.688/month or ₹1.45 Cr • ₹7,838 /sqft) */}
              <View style={styles.priceRow}>
                <Text style={styles.priceTag}>{property.price}</Text>
                <Text style={styles.priceSubtext}>
                  {property.pricePeriod
                    ? property.pricePeriod
                    : ` • ${perSqft}`}
                </Text>
              </View>

              {/* Line 3: Specs Row (5 beds   2 baths   3,457 sq ft - as in Image 2) */}
              <View style={styles.specsRow}>
                <Text style={styles.specItem}>
                  <Text style={styles.specBold}>
                    {property.beds > 0 ? property.beds : 3}{" "}
                  </Text>
                  <Text style={styles.specLabel}>beds</Text>
                </Text>
                <Text style={styles.specItem}>
                  <Text style={styles.specBold}>
                    {property.baths > 0 ? property.baths : 2}{" "}
                  </Text>
                  <Text style={styles.specLabel}>baths</Text>
                </Text>
                <Text style={styles.specItem}>
                  <Text style={styles.specBold}>{property.sqft} </Text>
                  <Text style={styles.specLabel}>sq ft</Text>
                </Text>
              </View>

              {/* Line 4: Locality Address & Status Badge (Interactive Manual Location Changer) */}
              <View style={styles.locationStatusRow}>
                <TouchableOpacity
                  style={styles.locationBoxInteractive}
                  activeOpacity={0.7}
                  onPress={() => setIsLocationModalOpen(true)}
                >
                  <MapPin
                    size={14}
                    color={COLORS.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {displayAddress}
                  </Text>
                  <View style={styles.changeLocationPill}>
                    <Text style={styles.changeLocationPillText}>Change</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{statusText}</Text>
                </View>
              </View>

              {/* Line 5: Feature Tags */}
              <View style={styles.featureChipsRow}>
                {tags.map((tag, idx) => (
                  <View key={idx} style={styles.featureChip}>
                    <Text style={styles.featureChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* CHILD 1: STICKY SECTION NAVIGATION TAB BAR */}
          <View style={styles.tabBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarScroll}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    activeOpacity={0.8}
                    onPress={() => scrollToSection(tab.id)}
                    style={styles.tabItem}
                  >
                    <Text
                      style={[
                        styles.tabLabelText,
                        isActive && styles.tabLabelTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {isActive && <View style={styles.activeTabIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. OVERVIEW & DESCRIPTION */}
          <View
            style={styles.sectionContainer}
            onLayout={(e) => {
              sectionYMap.current["overview"] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.subSectionTitle}>Overview</Text>
            <Text style={styles.descriptionText}>
              {property.description ||
                "Exceptional residential property in prime location with excellent connectivity, natural lighting, modular fittings, and world-class building amenities. Ready for immediate possession."}
            </Text>
          </View>

          {/* 5. HIGHLIGHTS SECTION */}
          <View
            style={styles.sectionContainer}
            onLayout={(e) => {
              sectionYMap.current["highlights"] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.subSectionTitle}>Highlights</Text>
            <View style={styles.highlightsList}>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>Overlooking Main Road</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  3 sides open corner apartment with excellent ventilation
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  5 mins walk to Metro Station & Bus Terminus
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Gated community with 24/7 Security & CCTV surveillance
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  100% Vastu Compliant East-facing layout
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Freehold Property with Clear Legal Title
                </Text>
              </View>
            </View>
          </View>

          {/* 6. PROPERTY DETAILS GRID */}
          <View
            style={styles.sectionContainer}
            onLayout={(e) => {
              sectionYMap.current["details"] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.subSectionTitle}>Property Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailGridCell}>
                <Text style={styles.detailLabel}>Property Type</Text>
                <Text style={styles.detailValue}>
                  {property.type || "Apartment"}
                </Text>
              </View>
              <View style={styles.detailGridCell}>
                <Text style={styles.detailLabel}>Listing Status</Text>
                <Text style={styles.detailValue}>
                  {property.badge || "For Sale"}
                </Text>
              </View>
              <View style={styles.detailGridCell}>
                <Text style={styles.detailLabel}>Super Built-up</Text>
                <Text style={styles.detailValue}>{property.sqft} sq.ft.</Text>
              </View>
              <View style={styles.detailGridCell}>
                <Text style={styles.detailLabel}>Furnishing</Text>
                <Text style={styles.detailValue}>Semi-Furnished</Text>
              </View>
              <View style={styles.detailGridCell}>
                <Text style={styles.detailLabel}>Facing Direction</Text>
                <Text style={styles.detailValue}>East / North</Text>
              </View>
              <View style={styles.detailGridCell}>
                <Text style={styles.detailLabel}>Floor Level</Text>
                <Text style={styles.detailValue}>3rd of 5 Floors</Text>
              </View>
            </View>
          </View>

          {/* 7. AMENITIES */}
          <View
            style={styles.sectionContainer}
            onLayout={(e) => {
              sectionYMap.current["amenities"] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.subSectionTitle}>Amenities</Text>
            <View style={styles.amenitiesContainer}>
              <View style={styles.amenityChip}>
                <Droplet size={15} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.amenityText}>Swimming Pool</Text>
              </View>
              <View style={styles.amenityChip}>
                <Activity
                  size={15}
                  color="#0F172A"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.amenityText}>Gymnasium</Text>
              </View>
              <View style={styles.amenityChip}>
                <Shield size={15} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.amenityText}>24/7 Security</Text>
              </View>
              <View style={styles.amenityChip}>
                <Zap size={15} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.amenityText}>Power Backup</Text>
              </View>
              <View style={styles.amenityChip}>
                <Layers size={15} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.amenityText}>Elevator</Text>
              </View>
              <View style={styles.amenityChip}>
                <Truck size={15} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.amenityText}>Car Parking</Text>
              </View>
            </View>
          </View>

          {/* 8. FURNISHING STATUS */}
          <View style={styles.sectionContainer}>
            <Text style={styles.subSectionTitle}>Furnishing</Text>
            <View style={styles.furnishingBox}>
              <Home size={18} color="#0F172A" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.furnishingTitle}>Semi-Furnished</Text>
                <Text style={styles.furnishingSubText}>
                  Includes Modular Kitchen, Built-in Wardrobes & Designer Light
                  Fittings.
                </Text>
              </View>
            </View>
          </View>

          {/* LOCATION / MAP */}
          <View
            style={styles.sectionContainer}
            onLayout={(e) => {
              sectionYMap.current["location"] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.subSectionTitle}>Location / Map</Text>
            <View style={styles.mapCard}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80",
                }}
                style={styles.mapImage}
              />
              <View style={styles.mapOverlay}>
                <MapPin size={24} color="#EF4444" />
                <Text style={styles.mapAddressText}>{displayAddress}</Text>
              </View>
            </View>
          </View>

          {/* 9. LISTED BY / PROPERTY OWNER */}
          <View style={styles.sectionContainer}>
            <Text style={styles.subSectionTitle}>Listed By</Text>
            <View style={styles.ownerCard}>
              <Image
                source={{
                  uri:
                    property.agent?.avatar ||
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
                }}
                style={styles.ownerAvatar}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.ownerName}>
                  {property.agent?.name || "Property Owner"}
                </Text>
                <Text style={styles.ownerRole}>
                  {property.agent?.agency || "Verified Owner / Seller"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.ownerCallBtn}
                onPress={() =>
                  Alert.alert(
                    "Contacting Owner",
                    `Calling ${property.agent?.name || "Owner"} at ${property.agent?.phone || "+91 98765 43210"}`,
                  )
                }
              >
                <Phone size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionDividerLine} />

          {/* 10. GOT QUESTIONS ABOUT THIS PROPERTY */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>
              Got questions about this property
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickQuestionsScroll}
            >
              {quickQuestions.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickQuestionChip}
                  onPress={() => setQuestionText(q)}
                >
                  <Text style={styles.quickQuestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.questionInputBox}>
              <TextInput
                style={styles.questionTextInput}
                placeholder="Type your question here..."
                placeholderTextColor="#94A3B8"
                value={questionText}
                onChangeText={setQuestionText}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                style={styles.questionSendBtn}
                onPress={handleSendQuestion}
              >
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionDividerLine} />

          {/* 11. SIMILAR PROPERTIES (live API result, mock fallback otherwise;
              hidden when the loaded live result is empty) */}
          {similarProps.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Similar Properties</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarPropsScroll}
            >
              {similarProps.map((simProp) => {
                const isSimSaved = isWishlisted
                  ? isWishlisted(simProp.id)
                  : false;
                return (
                  <TouchableOpacity
                    key={simProp.id}
                    style={styles.recommendedCard}
                    activeOpacity={0.88}
                    onPress={() => {
                      if (onSelectProperty) {
                        onSelectProperty(simProp);
                      }
                    }}
                  >
                    <View style={styles.recommendedImageContainer}>
                      <SafeImage
                        source={{ uri: simProp.image }}
                        style={styles.recommendedImage}
                      />
                      <View style={styles.verifiedGreenBadge}>
                        <Text style={styles.verifiedGreenBadgeText}>
                          verified
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.simHeartBtn}
                        activeOpacity={0.8}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (onToggleWishlist) onToggleWishlist(simProp);
                        }}
                      >
                        <Heart
                          size={18}
                          color={isSimSaved ? "#FF0000" : "#FFFFFF"}
                          fill={isSimSaved ? "#FF0000" : "rgba(0,0,0,0.3)"}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.recommendedCardBody}>
                      <Text style={styles.recommendedTitle} numberOfLines={2}>
                        {simProp.title}
                      </Text>
                      <Text
                        style={styles.recommendedSubtitle}
                        numberOfLines={2}
                      >
                        <Text style={styles.recommendedPrice}>
                          {simProp.price}
                          {simProp.pricePeriod}
                        </Text>{" "}
                        • {simProp.location}. {simProp.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          )}
        </ScrollView>

        {/* ================= FIXED BOTTOM ACTION STRIP ================= */}
        <View style={styles.bottomBar}>
          {isAgentView ? (
            <>
              <TouchableOpacity
                style={styles.siteVisitBtn}
                activeOpacity={0.85}
                onPress={() => onMatchToLead?.(property)}
              >
                <Users
                  size={18}
                  color={COLORS.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.siteVisitBtnText}>Match to Lead</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendEnquiryBtn}
                activeOpacity={0.85}
                onPress={() => onContactOwner?.(property)}
              >
                <Phone
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.sendEnquiryBtnText}>Contact Owner</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.siteVisitBtn,
                  siteVisitRequested && styles.siteVisitBtnActive,
                ]}
                activeOpacity={0.85}
                onPress={handleRequestSiteVisit}
              >
                <Calendar
                  size={18}
                  color={siteVisitRequested ? "#10B981" : COLORS.primary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.siteVisitBtnText,
                    siteVisitRequested && styles.siteVisitBtnTextActive,
                  ]}
                >
                  {siteVisitRequested ? "Requested ✓" : "Request Site Visit"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendEnquiryBtn,
                  enquirySent && styles.sendEnquiryBtnActive,
                ]}
                activeOpacity={0.85}
                onPress={handleSendEnquiry}
              >
                <MessageSquare
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.sendEnquiryBtnText}>
                  {enquirySent ? "Enquiry Sent ✓" : "Send Enquiry"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ================= MANUAL LOCATION PICKER MODAL ================= */}
        <Modal
          visible={isLocationModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsLocationModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.locationModalOverlay}
            activeOpacity={1}
            onPress={() => setIsLocationModalOpen(false)}
          >
            <TouchableOpacity
              style={styles.locationPickerCard}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={styles.locationPickerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationPickerTitle}>
                    Change Property Location
                  </Text>
                  <Text style={styles.locationPickerSubtitle}>
                    Choose a locality or type any custom street address
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.locationPickerCloseBtn}
                  onPress={() => setIsLocationModalOpen(false)}
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Custom Input */}
              <View style={styles.customAddressInputRow}>
                <TextInput
                  style={styles.customAddressInput}
                  placeholder="Type custom street / address..."
                  placeholderTextColor="#94A3B8"
                  value={customInputAddress}
                  onChangeText={setCustomInputAddress}
                  underlineColorAndroid="transparent"
                />
                <TouchableOpacity
                  style={[
                    styles.saveCustomAddressBtn,
                    !customInputAddress.trim() && { opacity: 0.5 },
                  ]}
                  disabled={!customInputAddress.trim()}
                  onPress={() => {
                    if (customInputAddress.trim()) {
                      setCustomAddress(customInputAddress.trim());
                      setIsLocationModalOpen(false);
                      setCustomInputAddress("");
                    }
                  }}
                >
                  <Text style={styles.saveCustomAddressBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Localities List */}
              <Text style={styles.quickLocalitiesLabel}>
                Select Chennai Locality
              </Text>
              <ScrollView
                style={styles.localitiesListScroll}
                showsVerticalScrollIndicator={false}
              >
                {CHENNAI_LOCALITY_OPTIONS.map((loc, idx) => {
                  const isSelected = displayAddress
                    .toLowerCase()
                    .includes(loc.name.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.localitySelectRow,
                        isSelected && styles.localitySelectRowActive,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCustomAddress(loc.address);
                        setIsLocationModalOpen(false);
                      }}
                    >
                      <View
                        style={[
                          styles.localityIconCircle,
                          isSelected && styles.localityIconCircleActive,
                        ]}
                      >
                        <MapPin
                          size={15}
                          color={isSelected ? COLORS.primary : "#64748B"}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[
                            styles.localitySelectName,
                            isSelected && styles.localitySelectNameActive,
                          ]}
                        >
                          {loc.name}
                        </Text>
                        <Text
                          style={styles.localitySelectAddress}
                          numberOfLines={1}
                        >
                          {loc.address}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Check
                          size={16}
                          color={COLORS.primary}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <ChevronRight size={16} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...TYPOGRAPHY.screenHeading,
    fontSize: 18,
    color: "#0F172A",
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 90,
  },

  /* Category Chips (from Image 2) */
  modalCategoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalCategoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EBEFE3",
  },
  modalCategoryPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2D3728",
  },

  /* 1. GALLERY HERO (Image 2 Rounded Card Design) */
  heroCardContainer: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 10,
  },
  galleryContainer: {
    width: "100%",
    height: 250,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroBookmarkBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  heroLoadingOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },
  heroPhotoCountBadge: {
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
  heroPhotoCountText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
  },
  thumbnailStrip: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  thumbnailWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailActive: {
    borderColor: COLORS.primary,
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
  },

  /* 2. MAIN INFO CARD (Matching Image 2 + Adapted Details) */
  mainInfoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffffffff",
  },
  titleRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propertyTitleText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    marginRight: 10,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#0F172A",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  priceTag: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  priceSubtext: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
    marginLeft: 4,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  specItem: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  specBold: {
    fontSize: 16,
    fontWeight: "600",
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
  locationBoxInteractive: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationText: {
    fontSize: 14,
    color: "#475569",
    marginLeft: 2,
    flex: 1,
    fontWeight: "400",
  },
  changeLocationPill: {
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  changeLocationPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
  },
  statusPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: "500",
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
    fontSize: 14,
    color: "#475569",
    fontWeight: "400",
  },

  /* SECTION NAVIGATION TAB BAR */
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginTop: 12,
  },
  tabBarScroll: {
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabLabelText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "400",
  },
  tabLabelTextActive: {
    color: "#0F172A",
    fontWeight: "600",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 14,
    right: 14,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  /* HIGHLIGHTS BULLET LIST */
  highlightsList: {
    marginTop: 6,
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletSymbol: {
    fontSize: 16,
    color: "#0F172A",
    marginRight: 8,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: "#334155",
    lineHeight: 24,
    fontWeight: "400",
  },

  sectionDividerLine: {
    height: 8,
    backgroundColor: "#F1F5F9",
  },

  /* SECTIONS */
  sectionContainer: {
    padding: 18,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
    fontWeight: "400",
  },

  /* DETAILS GRID (MINIMAL BORDERLESS LAYOUT) */
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
    columnGap: 12,
    marginTop: 8,
  },
  detailGridCell: {
    width: (SCREEN_WIDTH - 48) / 2,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 3,
    fontWeight: "400",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },

  /* AMENITIES */
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  amenityText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "400",
  },

  /* FURNISHING */
  furnishingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  furnishingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  furnishingSubText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
  },

  /* MAP */
  mapCard: {
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginTop: 4,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  mapAddressText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },

  /* OWNER CARD */
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginTop: 4,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  ownerRole: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "400",
  },
  ownerCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },

  /* QUICK QUESTIONS */
  quickQuestionsScroll: {
    marginVertical: 10,
  },
  quickQuestionChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickQuestionText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  questionInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  questionTextInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    fontWeight: "400",
    color: "#0F172A",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  questionSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  /* SIMILAR PROPERTIES */
  similarPropsScroll: {
    paddingRight: 18,
    gap: 14,
  },
  recommendedCard: {
    width: REC_CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  recommendedImageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  recommendedImage: {
    width: "100%",
    height: "100%",
  },
  verifiedGreenBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedGreenBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  simHeartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedCardBody: {
    padding: 12,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
    lineHeight: 20,
  },
  recommendedSubtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 18,
    fontWeight: "400",
  },
  recommendedPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },

  /* FIXED BOTTOM BAR */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  siteVisitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  siteVisitBtnActive: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  siteVisitBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  siteVisitBtnTextActive: {
    color: "#10B981",
  },
  sendEnquiryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sendEnquiryBtnActive: {
    backgroundColor: "#059669",
  },
  sendEnquiryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  /* Location Picker Modal */
  locationModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  locationPickerCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "80%",
  },
  locationPickerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  locationPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  locationPickerSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
    marginTop: 2,
  },
  locationPickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  customAddressInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  customAddressInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "400",
    color: "#0F172A",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  saveCustomAddressBtn: {
    height: 44,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  saveCustomAddressBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  quickLocalitiesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  localitiesListScroll: {
    maxHeight: 280,
  },
  localitySelectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  localitySelectRowActive: {
    backgroundColor: "#EBF4FF",
    borderColor: COLORS.primary,
  },
  localityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  localityIconCircleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.primary,
  },
  localitySelectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  localitySelectNameActive: {
    color: COLORS.primary,
  },
  localitySelectAddress: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
    marginTop: 2,
  },
});
