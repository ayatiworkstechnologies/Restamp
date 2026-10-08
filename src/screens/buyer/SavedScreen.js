import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Linking,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Heart,
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Check,
  X,
  ArrowRight,
  Copy,
  Building,
  Eye,
  Clock,
  Pencil,
  CheckCircle2,
  Calendar,
  Trash2,
  ExternalLink,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useWishlist } from "../../context/WishlistContext";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import AppBrandHeader from "../../components/AppBrandHeader";
import ALL_PROPERTIES from "../../data/properties";
import SafeImage from "../../components/common/SafeImage";

const INITIAL_VIEWED_PROPERTIES = [
  {
    ...ALL_PROPERTIES[0],
    viewedTime: "Viewed 20m ago",
  },
  {
    ...ALL_PROPERTIES[1],
    viewedTime: "Viewed 2h ago",
  },
  {
    ...ALL_PROPERTIES[2],
    viewedTime: "Viewed Yesterday",
  },
  {
    ...ALL_PROPERTIES[3],
    viewedTime: "Viewed 3 days ago",
  },
];

const INITIAL_CALL_HISTORY = [
  {
    id: "call-1",
    property: ALL_PROPERTIES[0],
    agentName: ALL_PROPERTIES[0]?.agent?.name || "Ramesh Kumar",
    agentPhone: ALL_PROPERTIES[0]?.agent?.phone || "+91 98765 43210",
    agency: ALL_PROPERTIES[0]?.agent?.agency || "Chennai Prime Realty",
    callTime: "Today, 11:20 AM",
    duration: "Connected (2m 45s)",
    status: "Outgoing Call",
    type: "connected",
  },
  {
    id: "call-2",
    property: ALL_PROPERTIES[1],
    agentName: ALL_PROPERTIES[1]?.agent?.name || "Kavitha Sundar",
    agentPhone: ALL_PROPERTIES[1]?.agent?.phone || "+91 98401 22334",
    agency: ALL_PROPERTIES[1]?.agent?.agency || "Anna Nagar Elite Homes",
    callTime: "Yesterday, 4:15 PM",
    duration: "Site Visit Scheduled",
    status: "Site Visit Confirmed",
    type: "visit",
  },
  {
    id: "call-3",
    property: ALL_PROPERTIES[2],
    agentName: ALL_PROPERTIES[2]?.agent?.name || "Suresh Menon",
    agentPhone: ALL_PROPERTIES[2]?.agent?.phone || "+91 98402 33445",
    agency: ALL_PROPERTIES[2]?.agent?.agency || "OMR Property Advisors",
    callTime: "3 days ago",
    duration: "Connected (1m 18s)",
    status: "Outgoing Call",
    type: "connected",
  },
];

export default function SavedScreen({ navigation, route }) {
  const { wishlist, removeFromWishlist, isWishlisted, toggleWishlist, refreshWishlist } = useWishlist();

  // Pull the server wishlist when authenticated; logged-out users keep
  // the existing local mock behavior untouched. Refreshed on mount and
  // whenever the screen regains focus (e.g. after a save elsewhere).
  useEffect(() => {
    refreshWishlist().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(
    useCallback(() => {
      refreshWishlist().catch(() => {});
    }, [refreshWishlist])
  );

  // Active tab state: "wishlist" | "viewed" | "call"
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || "wishlist");

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route?.params?.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Selected property modal
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [viewedNumberProperty, setViewedNumberProperty] = useState(null);

  // Viewed properties state
  const [viewedProperties, setViewedProperties] = useState(INITIAL_VIEWED_PROPERTIES);

  // Call history state
  const [callHistory, setCallHistory] = useState(INITIAL_CALL_HISTORY);

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: "Jessica Taylor",
    email: "jessica.taylor@example.com",
    phone: "+91 98765 43210",
    city: "Chennai, Tamil Nadu",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    badge: "Verified Buyer",
  });

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editPhone, setEditPhone] = useState(userProfile.phone);

  const openEditModal = () => {
    setEditName(userProfile.name);
    setEditPhone(userProfile.phone);
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    setUserProfile((prev) => ({
      ...prev,
      name: editName.trim(),
      phone: editPhone.trim(),
    }));
    setIsEditModalVisible(false);
    Alert.alert("Profile Updated", "Your profile details have been saved.");
  };

  // Helper calculations for cards
  const getCardSpecs = (property) => {
    const sqftNum = parseInt(String(property.sqft || 1500).replace(/,/g, "")) || 1500;
    const perSqft =
      property.rawPrice && sqftNum
        ? `₹${Math.round(property.rawPrice / sqftNum).toLocaleString("en-IN")}/sqft`
        : "₹6,800/sqft";
    const statusText =
      property.constructionStatus ||
      (property.badge === "Just Added" ? "New Launch" : "Ready to move");

    return { perSqft, statusText };
  };

  // Contact Handlers
  const handleWhatsApp = (property) => {
    const rawPhone = property?.agent?.phone || "+919876543210";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Hello! I am interested in ${property?.title || "your property"} (${property?.price || ""}) in ${property?.location || "Chennai"}.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
      Alert.alert("WhatsApp Not Available", `Please contact ${property?.agent?.name || "Agent"} at ${rawPhone}`);
    });
  };

  const handleCall = (phone, name = "Agent") => {
    const cleanPhone = String(phone || "+919876543210").replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Agent", `${name}: ${phone}`);
    });
  };

  const handleClearViewed = () => {
    Alert.alert("Clear History", "Do you want to clear your recently viewed properties?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => setViewedProperties([]) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER (Matching Buyer Home) */}
      <AppBrandHeader currentRole="buyer" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= 1. USER PROFILE SECTION WITH EDIT ICON ================= */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userProfile.name}
            </Text>
            <Text style={styles.profilePhone} numberOfLines={1}>
              {userProfile.phone}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.8}
            onPress={openEditModal}
          >
            <Pencil size={16} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* ================= 2. ACTIVITY UNDERLINE TABS (Airbnb Style with Generous Breathing Space) ================= */}
        <View style={styles.tabBarWrapper}>
          <View style={styles.tabBar}>
            {/* Wishlist Tab */}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "wishlist" && styles.tabButtonActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab("wishlist")}
            >
              <Text style={[styles.tabButtonText, activeTab === "wishlist" && styles.tabButtonTextActive]}>
                Wishlist
              </Text>
              <View style={[styles.tabCountBadge, activeTab === "wishlist" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "wishlist" && styles.tabCountTextActive]}>
                  {wishlist.length}
                </Text>
              </View>
              {activeTab === "wishlist" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            {/* Viewed Tab */}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "viewed" && styles.tabButtonActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab("viewed")}
            >
              <Text style={[styles.tabButtonText, activeTab === "viewed" && styles.tabButtonTextActive]}>
                Viewed
              </Text>
              <View style={[styles.tabCountBadge, activeTab === "viewed" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "viewed" && styles.tabCountTextActive]}>
                  {viewedProperties.length}
                </Text>
              </View>
              {activeTab === "viewed" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            {/* Call Tab */}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "call" && styles.tabButtonActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab("call")}
            >
              <Text style={[styles.tabButtonText, activeTab === "call" && styles.tabButtonTextActive]}>
                Call
              </Text>
              <View style={[styles.tabCountBadge, activeTab === "call" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "call" && styles.tabCountTextActive]}>
                  {callHistory.length}
                </Text>
              </View>
              {activeTab === "call" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 3. TAB CONTENT ================= */}

        {/* TAB 1: WISHLIST */}
        {activeTab === "wishlist" && (
          <View style={styles.tabContentArea}>
            {wishlist.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Heart size={32} color="#CBD5E1" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                <Text style={styles.emptyText}>
                  Tap the heart icon on any property card to save it here for quick access.
                </Text>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("Home")}
                >
                  <Text style={styles.exploreBtnText}>Explore Properties</Text>
                  <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {wishlist.map((property) => {
                  const { perSqft, statusText } = getCardSpecs(property);

                  return (
                    <TouchableOpacity
                      key={property.id}
                      style={styles.propertyCard}
                      activeOpacity={0.92}
                      onPress={() => setSelectedProperty(property)}
                    >
                      {/* 1. Large Hero Photo with Rounded Corners (Airbnb 4:3 / 220px) */}
                      <View style={styles.imageWrap}>
                        <SafeImage source={{ uri: property.image }} style={styles.cardImage} />

                        {/* Top-Left: Clean Frosted Status Pill */}
                        {statusText ? (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>{statusText}</Text>
                          </View>
                        ) : null}

                        {/* Top-Right: Floating Heart Button */}
                        <TouchableOpacity
                          style={styles.heartBtn}
                          activeOpacity={0.85}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={(e) => {
                            e.stopPropagation();
                            removeFromWishlist(property.id);
                          }}
                        >
                          <Heart size={18} color="#FF385C" fill="#FF385C" strokeWidth={2} />
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
                              setViewedNumberProperty(property);
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
            )}
          </View>
        )}

        {/* TAB 2: VIEWED */}
        {activeTab === "viewed" && (
          <View style={styles.tabContentArea}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listSectionTitle}>
                Recently Viewed ({viewedProperties.length})
              </Text>
              {viewedProperties.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  activeOpacity={0.7}
                  onPress={handleClearViewed}
                >
                  <Trash2 size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {viewedProperties.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Eye size={32} color="#CBD5E1" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No recently viewed properties</Text>
                <Text style={styles.emptyText}>
                  Properties you inspect will automatically appear here for easy comparison.
                </Text>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("Home")}
                >
                  <Text style={styles.exploreBtnText}>Browse Properties</Text>
                  <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {viewedProperties.map((property) => {
                  const { perSqft } = getCardSpecs(property);
                  const isSaved = isWishlisted(property.id);

                  return (
                    <TouchableOpacity
                      key={property.id}
                      style={styles.propertyCard}
                      activeOpacity={0.92}
                      onPress={() => setSelectedProperty(property)}
                    >
                      {/* 1. Large Hero Photo with Rounded Corners */}
                      <View style={styles.imageWrap}>
                        <SafeImage source={{ uri: property.image }} style={styles.cardImage} />

                        {/* Top-Left: Clean Frosted Viewed Time Pill */}
                        <View style={styles.statusBadge}>
                          <Clock size={11} color="#0F172A" style={{ marginRight: 4 }} />
                          <Text style={styles.statusBadgeText}>
                            {property.viewedTime || "Viewed recently"}
                          </Text>
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
                            color={isSaved ? "#FF385C" : "#0F172A"}
                            fill={isSaved ? "#FF385C" : "none"}
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
                              setViewedNumberProperty(property);
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
            )}
          </View>
        )}

        {/* TAB 3: CALL */}
        {activeTab === "call" && (
          <View style={styles.tabContentArea}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listSectionTitle}>
                Call & Contact Activity ({callHistory.length})
              </Text>
            </View>

            {callHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Phone size={32} color="#CBD5E1" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No call activity yet</Text>
                <Text style={styles.emptyText}>
                  Direct calls and WhatsApp enquiries made to owners and agents will show here.
                </Text>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("Home")}
                >
                  <Text style={styles.exploreBtnText}>Find Properties to Call</Text>
                  <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.callList}>
                {callHistory.map((item) => (
                  <View key={item.id} style={styles.callCard}>
                    {/* Call Header */}
                    <View style={styles.callHeaderRow}>
                      <View style={styles.callAgentInfo}>
                        <View style={styles.callIconBox}>
                          <Phone size={15} color="#0F172A" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.callAgentName} numberOfLines={1}>
                            {item.agentName}
                          </Text>
                          <Text style={styles.callAgencyName} numberOfLines={1}>
                            {item.agency}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.callTimeText}>{item.callTime}</Text>
                    </View>

                    {/* Associated Property Snippet (Minimalist & borderless row) */}
                    <TouchableOpacity
                      style={styles.callPropertyRow}
                      activeOpacity={0.8}
                      onPress={() => setSelectedProperty(item.property)}
                    >
                      <SafeImage
                        source={{ uri: item.property?.image }}
                        style={styles.callPropertyThumb}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.callPropertyTitle} numberOfLines={1}>
                          {item.property?.title}
                        </Text>
                        <Text style={styles.callPropertyPrice} numberOfLines={1}>
                          {item.property?.price} • {item.property?.location}
                        </Text>
                      </View>
                      <ArrowRight size={14} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Call Footer Actions (Sleek, minimal buttons) */}
                    <View style={styles.callFooterRow}>
                      <TouchableOpacity
                        style={styles.callActionBtnDark}
                        activeOpacity={0.85}
                        onPress={() => handleCall(item.agentPhone, item.agentName)}
                      >
                        <Phone size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.callActionTextDark}>Call Again</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.callActionBtnLight}
                        activeOpacity={0.85}
                        onPress={() => handleWhatsApp(item.property)}
                      >
                        <MessageCircle size={14} color="#0F172A" style={{ marginRight: 6 }} />
                        <Text style={styles.callActionTextLight}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= EDIT PROFILE MODAL ================= */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEditModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.editProfileSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Edit Profile</Text>
                <Text style={styles.sheetSub}>Update your activity and contact credentials</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Input: Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
                underlineColorAndroid="transparent"
              />
            </View>

            {/* Input: Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                underlineColorAndroid="transparent"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.editModalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                activeOpacity={0.8}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                activeOpacity={0.85}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveModalBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ================= CONTACT BOTTOM SHEET ================= */}
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
            style={styles.bottomSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {viewedNumberProperty?.agent?.name || "Verified Agent"}
                </Text>
                <Text style={styles.sheetSub}>
                  {viewedNumberProperty?.agent?.agency || "Chennai Prime Realty"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setViewedNumberProperty(null)}
              >
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Context */}
            <View style={styles.sheetContextBar}>
              <Building size={13} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.sheetContextText} numberOfLines={1}>
                {viewedNumberProperty?.title} ({viewedNumberProperty?.price})
              </Text>
            </View>

            {/* Phone Display */}
            <TouchableOpacity
              style={styles.phoneBox}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  "Copied!",
                  `${viewedNumberProperty?.agent?.phone || "+91 98401 22334"} copied to clipboard.`
                );
              }}
            >
              <View style={styles.phoneIconCircle}>
                <Phone size={14} color="#0F172A" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.phoneLabel}>PHONE NUMBER</Text>
                <Text style={styles.phoneNumber}>
                  {viewedNumberProperty?.agent?.phone || "+91 98401 22334"}
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
                  handleCall(viewedNumberProperty?.agent?.phone, viewedNumberProperty?.agent?.name);
                  setViewedNumberProperty(null);
                }}
              >
                <Phone size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sheetCallText}>Call Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetWhatsappBtn}
                activeOpacity={0.85}
                onPress={() => {
                  handleWhatsApp(viewedNumberProperty);
                  setViewedNumberProperty(null);
                }}
              >
                <MessageCircle size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sheetWhatsappText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ================= PROPERTY DETAIL MODAL ================= */}
      <PropertyDetailModal
        visible={!!selectedProperty}
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onSelectProperty={(p) => setSelectedProperty(p)}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
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
    marginTop: 2,
    fontWeight: "400",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* 1. User Profile Section */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  avatarWrap: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileMeta: {
    flex: 1,
    marginRight: 8,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  profilePhone: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
    marginTop: 3,
  },
  editProfileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },

  /* 2. Activity Underline Tabs (Airbnb Minimalist Style) */
  tabBarWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    position: "relative",
    gap: 8,
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748B",
    letterSpacing: -0.2,
  },
  tabButtonTextActive: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  tabCountBadge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountBadgeActive: {
    backgroundColor: "#0F172A",
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 14,
  },
  tabCountTextActive: {
    color: "#FFFFFF",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 4,
    right: 4,
    height: 2.5,
    backgroundColor: "#0F172A",
    borderRadius: 2,
  },

  /* 3. Tab Content Area */
  tabContentArea: {
    paddingHorizontal: 16,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },

  /* Cards List (Airbnb Full-Width Minimalist Style) */
  cardsList: {
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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

  /* Call Tab Styles (Minimalist Aesthetic) */
  callList: {
    gap: 16,
    paddingBottom: 24,
  },
  callCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  callHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  callAgentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  callIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  callAgentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  callAgencyName: {
    fontSize: 13,
    fontWeight: "400",
    color: "#64748B",
    marginTop: 1,
  },
  callTimeText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },
  callPropertyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    gap: 10,
  },
  callPropertyThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  callPropertyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  callPropertyPrice: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
    marginTop: 2,
  },
  callFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  callActionBtnDark: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
  },
  callActionTextDark: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  callActionBtnLight: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },
  callActionTextLight: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },

  /* Empty State */
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Edit Profile Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  editProfileSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
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
    marginBottom: 16,
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
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "400",
    color: "#0F172A",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  editModalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  saveModalBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveModalBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  /* Contact Bottom Sheet */
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 22,
    width: "100%",
  },
  sheetContextBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  phoneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
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
    paddingVertical: 4,
    borderRadius: 6,
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
