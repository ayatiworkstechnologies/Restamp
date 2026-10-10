import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Edit,
  ChevronLeft,
  Home,
  Ruler,
  Layers,
  Armchair,
  ArrowUpDown,
  Calendar,
  Banknote,
  Wallet,
  Wrench,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import StatusBadge from "../../components/owner/StatusBadge";
import PropertyGalleryModal from "../../components/PropertyGalleryModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 340;

const formatCurrency = (val) => {
  if (val == null) return null;
  if (typeof val === "number") return `₹${val.toLocaleString("en-IN")}`;
  if (typeof val === "string") {
    if (val.startsWith("₹")) return val;
    const num = Number(val.replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? val : `₹${num.toLocaleString("en-IN")}`;
  }
  return String(val);
};

const formatCount = (val) => {
  if (val == null) return "0";
  if (typeof val === "number") return val.toLocaleString("en-IN");
  return String(val);
};

export default function OwnerPropertyDetailModal({
  visible,
  property,
  onClose,
  onEdit,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  if (!property) return null;

  const formattedPrice =
    property.priceFormatted ||
    (property.price
      ? `₹${property.price.toLocaleString("en-IN")}${property.priceUnit || ""}`
      : "Price On Request");

  const allImages = property.images?.length
    ? property.images
    : property.coverPhoto
    ? [property.coverPhoto]
    : [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
      ];

  // Interpolate header opacity based on scroll
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 100, HERO_HEIGHT - 40],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  const detailItems = [
    { label: "Built-up", value: property.builtUpArea, icon: Ruler },
    { label: "Carpet", value: property.carpetArea, icon: Home },
    { label: "Furnishing", value: property.furnishing, icon: Armchair },
    {
      label: "Floor",
      value:
        property.floor && property.totalFloors
          ? `${property.floor} of ${property.totalFloors}`
          : null,
      icon: Layers,
    },
    { label: "Facing", value: property.facing, icon: ArrowUpDown },
    { label: "Age", value: property.propertyAge, icon: Calendar },
  ].filter((item) => item.value);

  const metaString = [
    property.bhk && property.bhk !== "N/A" ? `${property.bhk} BHK` : null,
    property.propertyType,
    property.category,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal
      visible={Boolean(visible && property)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Floating header that fades in on scroll */}
        <Animated.View
          style={[styles.floatingHeader, { opacity: headerBgOpacity }]}
          pointerEvents="none"
        >
          <View style={styles.floatingHeaderBg} />
        </Animated.View>

        {/* Close button – always visible */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.topRight}>
            <StatusBadge
              status={property.status}
              style={styles.floatingBadge}
            />
          </View>
        </View>

        {/* Scrollable content */}
        <Animated.ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Hero image */}
          <TouchableOpacity
            style={styles.heroWrap}
            activeOpacity={0.92}
            onPress={() => setShowGalleryModal(true)}
          >
            <Image
              source={{ uri: allImages[activeImageIndex] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* Gradient overlay at bottom of hero */}
            <View style={styles.heroGradient} />

            {/* Image counter */}
            {allImages.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {activeImageIndex + 1}/{allImages.length}
                </Text>
              </View>
            )}

            {/* Purpose pill */}
            <View style={styles.purposeOverlay}>
              <Text style={styles.purposeText}>
                For {property.purpose}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <View style={styles.thumbStrip}>
              <FlatList
                horizontal
                data={allImages}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbList}
                keyExtractor={(_, idx) => `thumb-${idx}`}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => setActiveImageIndex(index)}
                    activeOpacity={0.8}
                    style={[
                      styles.thumbWrap,
                      activeImageIndex === index && styles.thumbActive,
                    ]}
                  >
                    <Image
                      source={{ uri: item }}
                      style={styles.thumbImage}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Title block */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{property.title}</Text>
            {metaString ? (
              <Text style={styles.metaString}>{metaString}</Text>
            ) : null}
            <View style={styles.locationRow}>
              <MapPin
                size={13}
                color={COLORS.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.locationText} numberOfLines={2}>
                {property.address || `${property.locality}, ${property.city}`}
              </Text>
            </View>
            <Text style={styles.price}>{formattedPrice}</Text>
            {property.listedDate && (
              <Text style={styles.listedDate}>
                Listed {property.listedDate}
              </Text>
            )}
          </View>

          {/* Performance strip */}
          {(property.views || property.enquiries || property.visits) && (
            <View style={styles.statsStrip}>
              {property.views != null && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatCount(property.views)}
                  </Text>
                  <Text style={styles.statLabel}>Views</Text>
                </View>
              )}
              {property.enquiries != null && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{property.enquiries}</Text>
                  <Text style={styles.statLabel}>Enquiries</Text>
                </View>
              )}
              {property.visits != null && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{property.visits}</Text>
                  <Text style={styles.statLabel}>Visits</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Property Details */}
          {detailItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailGrid}>
                {detailItems.map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <View key={idx} style={styles.detailCell}>
                      <IconComp
                        size={15}
                        color={COLORS.textSecondary}
                        style={{ marginBottom: 6 }}
                      />
                      <Text style={styles.detailValue}>{item.value}</Text>
                      <Text style={styles.detailLabel}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenityGrid}>
                  {property.amenities.map((item, idx) => (
                    <View key={idx} style={styles.amenityItem}>
                      <CheckCircle2
                        size={14}
                        color={COLORS.success}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.amenityText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Financial */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financials</Text>
            <View style={styles.financeList}>
              <FinanceRow
                icon={Banknote}
                label={property.purpose === "Rent" ? "Monthly Rent" : "Price"}
                value={formattedPrice}
              />
              {property.deposit && (
                <FinanceRow
                  icon={Wallet}
                  label="Security Deposit"
                  value={formatCurrency(property.deposit)}
                />
              )}
              {property.maintenance && (
                <FinanceRow
                  icon={Wrench}
                  label="Maintenance"
                  value={`${formatCurrency(property.maintenance)}/mo`}
                />
              )}
              {property.availableFrom && (
                <FinanceRow
                  icon={Calendar}
                  label="Available From"
                  value={property.availableFrom}
                />
              )}
            </View>
          </View>

          {/* Documents */}
          {property.documents?.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Verification</Text>
                {property.documents.map((doc, idx) => (
                  <View key={idx} style={styles.docRow}>
                    <View style={styles.docIcon}>
                      <ShieldCheck size={16} color={COLORS.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{doc.name}</Text>
                      <Text style={styles.docType}>
                        {doc.type} · {doc.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Bottom padding for the docked bar */}
          <View style={{ height: 100 }} />
        </Animated.ScrollView>

        {/* Docked bottom bar */}
        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <View style={styles.bottomBarInner}>
            <View style={styles.bottomPriceCol}>
              <Text style={styles.bottomPriceLabel}>
                {property.purpose === "Rent" ? "Rent" : "Price"}
              </Text>
              <Text style={styles.bottomPrice}>{formattedPrice}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit?.(property)}
              activeOpacity={0.8}
            >
              <Edit size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.editButtonText}>Edit Listing</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Property Gallery Modal */}
      <PropertyGalleryModal
        visible={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        photos={property.photos || allImages}
        property={property}
      />
    </Modal>
  );
}

/* Small helper component */
function FinanceRow({ icon: Icon, label, value }) {
  return (
    <View style={styles.financeRow}>
      <View style={styles.financeLeft}>
        <Icon
          size={15}
          color={COLORS.textSecondary}
          style={{ marginRight: 10 }}
        />
        <Text style={styles.financeLabel}>{label}</Text>
      </View>
      <Text style={styles.financeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* ── Floating header ── */
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 100,
  },
  floatingHeaderBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  /* ── Top controls ── */
  topControls: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    zIndex: 99,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  floatingBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },

  /* ── Hero image ── */
  heroWrap: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: "#F1F5F9",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "transparent",
    // Simulated gradient via layering
    borderTopWidth: 0,
  },
  imageCounter: {
    position: "absolute",
    bottom: 14,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  purposeOverlay: {
    position: "absolute",
    bottom: 14,
    left: 16,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  purposeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  /* ── Thumbnails ── */
  thumbStrip: {
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  thumbList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: {
    borderColor: COLORS.primary,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },

  /* ── Title block ── */
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textDark,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  metaString: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: "400",
    letterSpacing: 0.1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "400",
    flex: 1,
    lineHeight: 18,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textDark,
    marginTop: 14,
    letterSpacing: -0.3,
  },
  listedDate: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 4,
    fontWeight: "400",
  },

  /* ── Stats strip ── */
  statsStrip: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: COLORS.pageBackground,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  /* ── Divider ── */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
    marginVertical: 8,
  },

  /* ── Section ── */
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 14,
    letterSpacing: -0.1,
  },

  /* ── Detail grid ── */
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailCell: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    textAlign: "center",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  /* ── Amenities ── */
  amenityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    paddingVertical: 7,
  },
  amenityText: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textDark,
  },

  /* ── Financials ── */
  financeList: {
    gap: 0,
  },
  financeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  financeLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  financeLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  financeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
  },

  /* ── Documents ── */
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.successBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  docName: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  docType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  bottomBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  bottomPriceCol: {},
  bottomPriceLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "400",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  bottomPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textDark,
    marginTop: 1,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});
