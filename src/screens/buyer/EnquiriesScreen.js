import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  Modal,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Phone,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Eye,
  Calendar,
  Search,
  X,
  Copy,
  Building,
  ArrowLeft,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import ALL_PROPERTIES from "../../data/properties";
import { useWishlist } from "../../context/WishlistContext";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import { fetchMyEnquiries } from "../../api/enquiries";
import { getAuthTokenSync } from "../../api/client";

// Paise integer -> short display string (mirrors backend price_display).
function formatPaise(paise, period) {
  const rupees = Math.floor((paise || 0) / 100);
  const main =
    rupees >= 10000000
      ? `₹${(rupees / 10000000).toFixed(2)} Cr`
      : rupees >= 100000
      ? `₹${(rupees / 100000).toFixed(2)} L`
      : `₹${rupees.toLocaleString("en-IN")}`;
  return period === "MONTHLY" ? `${main}/mo` : main;
}

// Backend enquiry -> the card shape this screen already renders.
// Fields with no backend source stay undefined and existing fallbacks apply.
function toRow(e) {
  return {
    id: e.id,
    propertyId: e.property_listing_id,
    agentName: undefined,
    agency: undefined,
    phone: undefined,
    avatar: undefined,
    propertyTitle: e.listing ? e.listing.title : "",
    propertyPrice: e.listing ? formatPaise(e.listing.price_paise, e.listing.price_period) : "",
    propertyLocation: "",
    propertyImage: undefined,
    lastMessage: e.message || "",
    time: undefined,
    unread: false,
    category: undefined,
    status: e.status,
    scheduledVisit: undefined,
  };
}

const INITIAL_ENQUIRIES = [
  {
    id: "enq-1",
    propertyId: "rec-omr-1",
    agentName: "Arun Kumar",
    agency: "OMR Tech Realty",
    phone: "+91 98840 55667",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    propertyTitle: "2 BHK Luxury Apartment in Anna Nagar",
    propertyPrice: "₹20K – ₹30K",
    propertyLocation: "Anna Nagar, Chennai",
    propertyImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80",
    lastMessage: "Scheduled site visit enquiry. Owner confirmed inspection for tomorrow.",
    time: "Today • 10:35 AM",
    unread: true,
    category: "Site Visits",
    status: "Direct Enquiry",
    scheduledVisit: "Sat, 3:30 PM",
  },
  {
    id: "enq-2",
    propertyId: "chennai-1",
    agentName: "Priya Sundaram",
    agency: "Anna Nagar Elite Homes",
    phone: "+91 98401 22334",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    propertyTitle: "3 BHK Premium Sea-View Villa in ECR",
    propertyPrice: "₹2.2 Cr – ₹2.5 Cr",
    propertyLocation: "ECR, Chennai",
    propertyImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80",
    lastMessage: "Scheduled site visit enquiry. Legal documentation verified with bank loan assistance.",
    time: "Yesterday • 4:15 PM",
    unread: false,
    category: "Site Visits",
    status: "Visit Scheduled",
    scheduledVisit: "Tomorrow, 4:00 PM",
  },
  {
    id: "enq-3",
    propertyId: "rec-omr-2",
    agentName: "Karthik Raman",
    agency: "Chennai Prime Realty",
    phone: "+91 97909 33445",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    propertyTitle: "Commercial Office Floor in Guindy",
    propertyPrice: "₹80K – ₹90K",
    propertyLocation: "Guindy, Chennai",
    propertyImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=400&q=80",
    lastMessage: "Scheduled site visit enquiry. Available for immediate IT/Commercial fit-outs.",
    time: "2 days ago",
    unread: false,
    category: "Active",
    status: "Direct Enquiry",
    scheduledVisit: null,
  },
  {
    id: "enq-4",
    propertyId: "chennai-2",
    agentName: "Ramesh Kumar",
    agency: "Prime Corridor Estates",
    phone: "+91 98410 77889",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
    propertyTitle: "Shanthi Colony Gated House",
    propertyPrice: "₹3.10 Cr",
    propertyLocation: "Shanthi Colony, Anna Nagar",
    propertyImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
    lastMessage: "Advance token verified and registration draft submitted with the legal team. Deal closed!",
    time: "5 days ago",
    unread: false,
    category: "Closed",
    status: "Closed",
    scheduledVisit: null,
  },
];

const FILTER_TABS = ["All", "Site Visits", "Negotiating", "Closed"];

export default function EnquiriesScreen({ navigation, route }) {
  const { wishlist, isWishlisted, toggleWishlist } = useWishlist();
  // null = not loaded from server (logged out or not yet fetched) -> existing mock list.
  const [serverEnquiries, setServerEnquiries] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const enquiries = serverEnquiries ?? INITIAL_ENQUIRIES;
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || "All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route?.params?.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Pull the authenticated buyer's real enquiries whenever the screen gains
  // focus. Logged-out users keep the existing local mock behavior untouched.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!getAuthTokenSync()) {
        return undefined;
      }
      setListLoading(true);
      fetchMyEnquiries(1, 100).then(
        (data) => {
          if (!cancelled) {
            setServerEnquiries((data.items || []).map(toRow));
            setListLoading(false);
          }
        },
        () => {
          if (!cancelled) {
            setListLoading(false);
          }
        }
      );
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Modals
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [contactSheetEnquiry, setContactSheetEnquiry] = useState(null);

  // Filter
  const filteredEnquiries = enquiries.filter((item) => {
    const matchesTab =
      activeTab === "All"
        ? true
        : activeTab === "Site Visits"
        ? item.category === "Site Visits" || !!item.scheduledVisit
        : activeTab === "Negotiating"
        ? item.category === "Negotiating" || item.status.includes("Negotiat")
        : activeTab === "Closed"
        ? item.category === "Closed" || item.status.includes("Closed")
        : true;

    const matchesSearch =
      searchQuery.trim() === "" ||
      (item.propertyTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.agentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.propertyLocation || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.agency || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Contact Handlers
  const handleWhatsApp = (item) => {
    const rawPhone = item.phone || "+919876543210";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Hello ${item.agentName}! I am following up on my enquiry for ${item.propertyTitle} (${item.propertyPrice}) in ${item.propertyLocation} on RESTAMP.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
      Alert.alert("WhatsApp Not Available", `Please contact ${item.agentName} at ${rawPhone}`);
    });
  };

  const handleCall = (item) => {
    const rawPhone = item.phone || "+919876543210";
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Contact", `${item.agentName}: ${rawPhone}`);
    });
  };

  const handleOpenProperty = (item) => {
    const found = ALL_PROPERTIES.find((p) => p.id === item.propertyId);
    if (found) {
      setSelectedProperty(found);
    } else {
      setSelectedProperty({
        id: item.propertyId,
        title: item.propertyTitle,
        price: item.propertyPrice,
        location: item.propertyLocation,
        image: item.propertyImage,
        agent: {
          name: item.agentName,
          agency: item.agency,
          phone: item.phone,
          avatar: item.avatar,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER: Title | More Button | Add Button (Matching Screenshot) */}
      <View style={styles.topHeader}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 10, padding: 4 }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#0F172A" />
            </TouchableOpacity>
          )}
          <Text style={styles.screenTitle}>
            {activeTab === "Site Visits" ? "Site Visits" : "Enquiries"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.moreIconBtn}
            onPress={() =>
              Alert.alert(
                "Filter Options",
                "Choose filter mode:",
                FILTER_TABS.map((tab) => ({
                  text: tab,
                  onPress: () => setActiveTab(tab),
                }))
              )
            }
            activeOpacity={0.7}
          >
            <MoreHorizontal size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.blackAddBtn}
            onPress={() => navigation.navigate("Search")}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.8} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimal Search Bar */}
        <View style={styles.searchBar}>
          <Search size={15} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by property or contact..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Minimal Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Enquiries List (Cards Matching Screenshot Layout) */}
        {listLoading && serverEnquiries === null ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : filteredEnquiries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={36} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No enquiries</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "No matching conversations found."
                : "You have no enquiries in this section."}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredEnquiries.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.enquiryCard}
                onPress={() => handleOpenProperty(item)}
                activeOpacity={0.88}
              >
                {/* 1. Header: Avatar | Name & Role | Action Icons */}
                <View style={styles.cardTopRow}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarFallbackText}>
                        {(item.propertyTitle || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoCol}>
                    <Text style={styles.contactName} numberOfLines={1}>
                      {item.agentName}
                    </Text>
                    <Text style={styles.contactSub} numberOfLines={1}>
                      {item.category === "Site Visits"
                        ? "New Enquiry"
                        : "Verified Buyer"}{" "}
                      • {item.propertyPrice}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.miniActionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleWhatsApp(item);
                      }}
                    >
                      <MessageCircle size={16} color="#64748B" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.miniActionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleCall(item);
                      }}
                    >
                      <Phone size={16} color="#64748B" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.miniActionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setContactSheetEnquiry(item);
                      }}
                    >
                      <MoreHorizontal size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Message / Interest Snippet */}
                <Text style={styles.snippetText} numberOfLines={2}>
                  Interested in {item.propertyTitle}
                  {item.propertyLocation ? ` in ${item.propertyLocation}` : ""}.{" "}
                  {item.lastMessage}
                </Text>

                {/* 3. Footer Meta Row (Date & Status) */}
                <View style={styles.cardFooter}>
                  {item.time ? (
                    <View style={styles.metaItem}>
                      <Calendar
                        size={13}
                        color="#94A3B8"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.metaText}>
                        Received {item.time}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.metaItem}>
                    <Eye size={13} color="#94A3B8" style={{ marginRight: 5 }} />
                    <Text style={styles.metaText}>{item.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ================= AGENT / CONTACT BOTTOM SHEET ================= */}
      <Modal
        visible={!!contactSheetEnquiry}
        transparent
        animationType="slide"
        onRequestClose={() => setContactSheetEnquiry(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContactSheetEnquiry(null)}
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
                  {contactSheetEnquiry?.agentName}
                </Text>
                <Text style={styles.sheetSub}>
                  {contactSheetEnquiry?.agency}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setContactSheetEnquiry(null)}
              >
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Context */}
            <View style={styles.sheetContextBar}>
              <Building
                size={13}
                color="#0F172A"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.sheetContextText} numberOfLines={1}>
                {contactSheetEnquiry?.propertyTitle} (
                {contactSheetEnquiry?.propertyPrice})
              </Text>
            </View>

            {/* Phone Display */}
            <TouchableOpacity
              style={styles.phoneBox}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  "Copied!",
                  `${contactSheetEnquiry?.phone} copied to clipboard.`
                );
              }}
            >
              <View style={styles.phoneIconCircle}>
                <Phone size={15} color="#0F172A" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.phoneLabel}>PHONE NUMBER</Text>
                <Text style={styles.phoneNumber}>
                  {contactSheetEnquiry?.phone}
                </Text>
              </View>
              <View style={styles.copyPill}>
                <Copy size={12} color="#0F172A" style={{ marginRight: 4 }} />
                <Text style={styles.copyText}>Copy</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.sheetActionsRow}>
              <TouchableOpacity
                style={styles.sheetCallBtn}
                activeOpacity={0.85}
                onPress={() => {
                  handleCall(contactSheetEnquiry);
                  setContactSheetEnquiry(null);
                }}
              >
                <Phone size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sheetCallText}>Call Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetWhatsappBtn}
                activeOpacity={0.85}
                onPress={() => {
                  handleWhatsApp(contactSheetEnquiry);
                  setContactSheetEnquiry(null);
                }}
              >
                <MessageCircle
                  size={15}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
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
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moreIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  blackAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
    outlineStyle: "none",
    outlineWidth: 0,
  },
  tabsRow: {
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  listContainer: {
    gap: 14,
  },

  /* Reference Card System */
  enquiryCard: {
    backgroundColor: "#ffffffff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  infoCol: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  contactSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniActionBtn: {
    padding: 4,
  },
  snippetText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
    paddingTop: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  /* Empty State */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
  },

  /* Bottom Sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  sheetSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetContextBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  sheetContextText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  phoneBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  phoneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  phoneLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  phoneNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  copyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  copyText: {
    fontSize: 11,
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
    borderRadius: 24,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCallText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetWhatsappBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetWhatsappText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
