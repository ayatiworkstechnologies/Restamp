import React, { useState, useRef, useEffect, useMemo, memo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Share,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  X,
  Maximize2,
  Share2,
  ChevronRight,
  Layers,
  Camera,
} from "lucide-react-native";
import COLORS from "../constants/colors";
import SafeImage from "./common/SafeImage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Curated architectural room samples mapped by room category
// These guarantee rich category sections (Living Room, Bedroom, Kitchen, etc.)
// even when a property listing only has a basic cover photo or generic set.
const CURATED_ROOM_SAMPLES = {
  "Living Room": [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  ],
  Bedroom: [
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
  ],
  Kitchen: [
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
  ],
  Bathroom: [
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
  ],
  Balcony: [
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  ],
  Exterior: [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  ],
  "Floor Plan": [
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
  ],
};

const STANDARD_CATEGORIES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Balcony",
  "Exterior",
  "Floor Plan",
];

function PropertyGalleryModal({
  visible,
  onClose,
  photos = [],
  property = null,
  initialCategory = "all",
}) {
  const [activeTab, setActiveTab] = useState(initialCategory || "all");
  const [lightboxIndex, setLightboxIndex] = useState(null); // null = closed, number = open

  const mainScrollViewRef = useRef(null);
  const tabScrollViewRef = useRef(null);
  const sectionYMap = useRef({});
  const tabLayoutMap = useRef({});
  const isProgrammaticScroll = useRef(false);

  // Normalize photos into categorized groups
  const { categorizedSections, allFlattenedPhotos } = useMemo(() => {
    // 1. Check if photos already have explicit category attributes (e.g. from Owner form)
    const hasExplicitCategories =
      Array.isArray(photos) &&
      photos.some(
        (p) =>
          p &&
          typeof p === "object" &&
          p.category &&
          typeof p.category === "string"
      );

    if (hasExplicitCategories) {
      // Group by photo.category
      const groups = {};
      const flatList = [];

      photos.forEach((photo, idx) => {
        if (!photo) return;
        const url = typeof photo === "string" ? photo : photo.url;
        if (!url) return;
        const category =
          (typeof photo === "object" && photo.category) || "Living Room";
        if (!groups[category]) groups[category] = [];

        const normalizedItem = {
          id: photo.id || `photo-${idx}`,
          url,
          category,
          isCover: Boolean(photo.isCover),
          globalIndex: flatList.length,
        };

        groups[category].push(normalizedItem);
        flatList.push(normalizedItem);
      });

      // Build sections according to STANDARD_CATEGORIES order
      const sections = [];
      STANDARD_CATEGORIES.forEach((cat) => {
        if (groups[cat] && groups[cat].length > 0) {
          sections.push({
            id: cat,
            title: cat,
            photos: groups[cat],
          });
          delete groups[cat];
        }
      });

      // Add any remaining categories
      Object.keys(groups).forEach((cat) => {
        if (groups[cat].length > 0) {
          sections.push({
            id: cat,
            title: cat,
            photos: groups[cat],
          });
        }
      });

      return {
        categorizedSections: sections,
        allFlattenedPhotos: flatList,
      };
    }

    // 2. Otherwise: we have plain image URLs or property object with general images
    const rawUrls = (
      Array.isArray(photos) && photos.length > 0
        ? photos.map((p) => (typeof p === "string" ? p : p?.url)).filter(Boolean)
        : property?.images || (property?.image ? [property.image] : [])
    ).filter(Boolean);

    const groups = {};
    const flatList = [];

    // Map provided property images into logical categories
    // Index 0 is Exterior cover
    // Index 1 is Living Room
    // Index 2 is Bedroom
    // Index 3 is Kitchen / Balcony
    const fallbackCategorySequence = [
      "Exterior",
      "Living Room",
      "Bedroom",
      "Kitchen",
      "Bathroom",
      "Balcony",
    ];

    rawUrls.forEach((url, idx) => {
      const cat =
        fallbackCategorySequence[idx % fallbackCategorySequence.length];
      if (!groups[cat]) groups[cat] = [];
      const item = {
        id: `prop-img-${idx}`,
        url,
        category: cat,
        isCover: idx === 0,
        globalIndex: flatList.length,
      };
      groups[cat].push(item);
      flatList.push(item);
    });

    // Supplement with rich room samples so tabs like Living Room, Bedroom, Kitchen, etc.
    // are fully populated with photos!
    STANDARD_CATEGORIES.forEach((cat) => {
      if (!groups[cat] || groups[cat].length === 0) {
        const samples = CURATED_ROOM_SAMPLES[cat] || [];
        groups[cat] = [];
        samples.forEach((url, sampleIdx) => {
          const item = {
            id: `sample-${cat}-${sampleIdx}`,
            url,
            category: cat,
            isSample: true,
            globalIndex: flatList.length,
          };
          groups[cat].push(item);
          flatList.push(item);
        });
      }
    });

    // Order sections nicely: Living Room first, then Bedroom, Kitchen, Bathroom, Balcony, Exterior, Floor Plan
    const preferredOrder = [
      "Living Room",
      "Bedroom",
      "Kitchen",
      "Bathroom",
      "Balcony",
      "Exterior",
      "Floor Plan",
    ];

    const sections = [];
    preferredOrder.forEach((cat) => {
      if (groups[cat] && groups[cat].length > 0) {
        sections.push({
          id: cat,
          title: cat,
          photos: groups[cat],
        });
      }
    });

    return {
      categorizedSections: sections,
      allFlattenedPhotos: flatList,
    };
  }, [photos, property]);

  // Tab list includes "All" + each available category section
  const tabs = useMemo(() => {
    const list = [
      { id: "all", label: "All", count: allFlattenedPhotos.length },
    ];
    categorizedSections.forEach((sec) => {
      list.push({
        id: sec.id,
        label: sec.title,
        count: sec.photos.length,
      });
    });
    return list;
  }, [categorizedSections, allFlattenedPhotos]);

  // Scroll to selected category section
  const scrollToCategory = (tabId) => {
    setActiveTab(tabId);
    isProgrammaticScroll.current = true;

    // Center tab in horizontal bar
    const tabPos = tabLayoutMap.current[tabId];
    if (tabPos && tabScrollViewRef.current) {
      tabScrollViewRef.current.scrollTo({
        x: Math.max(0, tabPos.x - SCREEN_WIDTH / 2 + tabPos.width / 2),
        animated: true,
      });
    }

    if (tabId === "all") {
      mainScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      const targetY = sectionYMap.current[tabId];
      if (targetY !== undefined && mainScrollViewRef.current) {
        mainScrollViewRef.current.scrollTo({
          y: Math.max(0, targetY - 10),
          animated: true,
        });
      }
    }

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 450);
  };

  // On vertical scroll: detect current visible section and update active tab
  const handleScroll = (event) => {
    if (isProgrammaticScroll.current) return;
    const scrollY = event.nativeEvent.contentOffset.y;

    if (scrollY < 40) {
      if (activeTab !== "all") {
        setActiveTab("all");
        scrollTabBarToActive("all");
      }
      return;
    }

    let detectedCat = activeTab;
    for (let i = categorizedSections.length - 1; i >= 0; i--) {
      const sec = categorizedSections[i];
      const yPos = sectionYMap.current[sec.id];
      if (yPos !== undefined && scrollY >= yPos - 80) {
        detectedCat = sec.id;
        break;
      }
    }

    if (detectedCat !== activeTab) {
      setActiveTab(detectedCat);
      scrollTabBarToActive(detectedCat);
    }
  };

  const scrollTabBarToActive = (tabId) => {
    const tabPos = tabLayoutMap.current[tabId];
    if (tabPos && tabScrollViewRef.current) {
      tabScrollViewRef.current.scrollTo({
        x: Math.max(0, tabPos.x - SCREEN_WIDTH / 2 + tabPos.width / 2),
        animated: true,
      });
    }
  };

  // Native share handler
  const handleShare = async () => {
    try {
      const activePhoto =
        lightboxIndex !== null
          ? allFlattenedPhotos[lightboxIndex]?.url
          : property?.image || allFlattenedPhotos[0]?.url;
      await Share.share({
        title: property?.title || "Property Gallery",
        message: `Take a look at the photos for ${property?.title || "this property"} on Restamp: ${activePhoto || ""}`,
      });
    } catch (e) {}
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* 1. TOP HEADER BAR */}
        <SafeAreaView edges={["top"]} style={styles.safeHeaderArea}>
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {property?.title || "Property Gallery"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {allFlattenedPhotos.length} photos · {categorizedSections.length} sections
              </Text>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleShare}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Share2 size={20} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerIconBtn, { marginLeft: 4 }]}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* 2. STICKY CATEGORY TAB BAR (Follows Property Page Tab Design Language) */}
        <View style={styles.tabBarContainer}>
          <ScrollView
            ref={tabScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScroll}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onLayout={(e) => {
                    tabLayoutMap.current[tab.id] = {
                      x: e.nativeEvent.layout.x,
                      width: e.nativeEvent.layout.width,
                    };
                  }}
                  onPress={() => scrollToCategory(tab.id)}
                  style={styles.tabItem}
                >
                  <Text
                    style={[
                      styles.tabLabelText,
                      isActive && styles.tabLabelTextActive,
                    ]}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <Text
                        style={[
                          styles.tabCountPill,
                          isActive && styles.tabCountPillActive,
                        ]}
                      >
                        {` (${tab.count})`}
                      </Text>
                    )}
                  </Text>
                  {isActive && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. SCROLLABLE GALLERY BODY WITH CATEGORY SECTIONS */}
        <ScrollView
          ref={mainScrollViewRef}
          style={styles.mainScrollView}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {categorizedSections.map((section) => {
            const sectionPhotos = section.photos;
            if (sectionPhotos.length === 0) return null;

            return (
              <View
                key={section.id}
                style={styles.sectionContainer}
                onLayout={(e) => {
                  sectionYMap.current[section.id] = e.nativeEvent.layout.y;
                }}
              >
                {/* Category Section Header */}
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleWrap}>
                    <Text style={styles.sectionTitleText}>{section.title}</Text>
                    <View style={styles.sectionCountBadge}>
                      <Camera size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.sectionCountBadgeText}>
                        {sectionPhotos.length} {sectionPhotos.length === 1 ? "photo" : "photos"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section Photos Layout */}
                {/* 1st Photo: Full-width Hero Card */}
                {sectionPhotos.length > 0 && (
                  <TouchableOpacity
                    style={styles.heroPhotoCard}
                    activeOpacity={0.92}
                    onPress={() => setLightboxIndex(sectionPhotos[0].globalIndex)}
                  >
                    <SafeImage
                      source={{ uri: sectionPhotos[0].url }}
                      style={styles.heroPhotoImg}
                      resizeMode="cover"
                    />
                    <View style={styles.photoOverlayBadge}>
                      <Text style={styles.photoOverlayText}>
                        {section.title} · 1 of {sectionPhotos.length}
                      </Text>
                    </View>
                    <View style={styles.expandIconPill}>
                      <Maximize2 size={14} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Remaining Photos in 2-Column Grid */}
                {sectionPhotos.length > 1 && (
                  <View style={styles.photosGrid}>
                    {sectionPhotos.slice(1).map((photo, subIdx) => (
                      <TouchableOpacity
                        key={photo.id || subIdx}
                        style={styles.gridPhotoCard}
                        activeOpacity={0.9}
                        onPress={() => setLightboxIndex(photo.globalIndex)}
                      >
                        <SafeImage
                          source={{ uri: photo.url }}
                          style={styles.gridPhotoImg}
                          resizeMode="cover"
                        />
                        <View style={styles.gridOverlayBadge}>
                          <Text style={styles.gridOverlayText}>
                            {subIdx + 2} of {sectionPhotos.length}
                          </Text>
                        </View>
                        <View style={styles.smallExpandPill}>
                          <Maximize2 size={12} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* 4. FULLSCREEN LIGHTBOX VIEWER */}
        {lightboxIndex !== null && (
          <Modal
            visible={true}
            transparent={false}
            animationType="fade"
            onRequestClose={() => setLightboxIndex(null)}
          >
            <View style={styles.lightboxContainer}>
              <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

              {/* Lightbox Top Controls */}
              <SafeAreaView edges={["top"]} style={styles.lightboxSafeTop}>
                <View style={styles.lightboxHeader}>
                  <TouchableOpacity
                    style={styles.lightboxCircleBtn}
                    onPress={() => setLightboxIndex(null)}
                    activeOpacity={0.8}
                  >
                    <X size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.lightboxCounterBadge}>
                    <Text style={styles.lightboxCounterText}>
                      {allFlattenedPhotos[lightboxIndex]?.category || "Photo"} ·{" "}
                      {lightboxIndex + 1} of {allFlattenedPhotos.length}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.lightboxCircleBtn}
                    onPress={handleShare}
                    activeOpacity={0.8}
                  >
                    <Share2 size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>

              {/* Lightbox Center Image with Prev / Next Tap Zones */}
              <View style={styles.lightboxCenter}>
                <SafeImage
                  source={{ uri: allFlattenedPhotos[lightboxIndex]?.url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />

                {/* Left Arrow Button */}
                {lightboxIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.arrowLeft]}
                    activeOpacity={0.8}
                    onPress={() => setLightboxIndex(lightboxIndex - 1)}
                  >
                    <ChevronLeft size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {/* Right Arrow Button */}
                {lightboxIndex < allFlattenedPhotos.length - 1 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.arrowRight]}
                    activeOpacity={0.8}
                    onPress={() => setLightboxIndex(lightboxIndex + 1)}
                  >
                    <ChevronRight size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Lightbox Bottom Thumbnail Strip */}
              <SafeAreaView edges={["bottom"]} style={styles.lightboxBottomBar}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.lightboxThumbScroll}
                >
                  {allFlattenedPhotos.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id || idx}
                      onPress={() => setLightboxIndex(idx)}
                      activeOpacity={0.8}
                      style={[
                        styles.lightboxThumbWrap,
                        lightboxIndex === idx && styles.lightboxThumbActive,
                      ]}
                    >
                      <SafeImage
                        source={{ uri: item.url }}
                        style={styles.lightboxThumbImg}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </SafeAreaView>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeHeaderArea: {
    backgroundColor: "#FFFFFF",
  },
  headerBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* SECTION NAVIGATION TAB BAR (MATCHING PROPERTY DETAIL PAGE) */
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  tabBarScroll: {
    paddingHorizontal: 12,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabLabelText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  tabLabelTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  tabCountPill: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "400",
  },
  tabCountPillActive: {
    color: COLORS.primary,
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

  /* MAIN GALLERY SCROLLABLE CONTENT */
  mainScrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mainScrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 10,
  },
  sectionCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sectionCountBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },

  /* HERO PHOTO CARD (1st photo in category) */
  heroPhotoCard: {
    width: "100%",
    height: 230,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
    marginBottom: 10,
  },
  heroPhotoImg: {
    width: "100%",
    height: "100%",
  },
  photoOverlayBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoOverlayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  expandIconPill: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  /* 2-COLUMN GRID OF REMAINING PHOTOS */
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridPhotoCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    height: 130,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
    marginBottom: 10,
  },
  gridPhotoImg: {
    width: "100%",
    height: "100%",
  },
  gridOverlayBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridOverlayText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  smallExpandPill: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomSpacer: {
    height: 30,
  },

  /* LIGHTBOX VIEWER STYLES */
  lightboxContainer: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  lightboxSafeTop: {
    backgroundColor: "#0B0F19",
  },
  lightboxHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  lightboxCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCounterBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lightboxCounterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  lightboxCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  arrowButton: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: {
    left: 16,
  },
  arrowRight: {
    right: 16,
  },
  lightboxBottomBar: {
    backgroundColor: "#0B0F19",
    paddingVertical: 12,
  },
  lightboxThumbScroll: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  lightboxThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.6,
  },
  lightboxThumbActive: {
    borderColor: COLORS.primary,
    opacity: 1,
  },
  lightboxThumbImg: {
    width: "100%",
    height: "100%",
  },
});

export default memo(PropertyGalleryModal);
