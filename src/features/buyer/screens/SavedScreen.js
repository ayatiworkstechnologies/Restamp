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
  MessageSquare,
  Check,
  X,
  ArrowRight,
  Copy,
  Building,
  Building2,
  Eye,
  Clock,
  Pencil,
  CheckCircle2,
  Calendar,
  Trash2,
  ExternalLink,
  User,
  RotateCcw,
  XCircle,
  ShieldCheck,
  Award,
  Briefcase,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useWishlist } from "../context/WishlistContext.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";
import PropertyDetailModal from "../components/PropertyDetailModal.js";
import ScheduleVisitModal from "../components/ScheduleVisitModal.js";
import AppBrandHeader from "../../../shared/components/AppBrandHeader.js";
import SafeImage from "../../../shared/components/SafeImage.js";
import {
  fetchBuyerVisits,
  toUiVisit,
  toVisitPayload,
  updateBuyerVisit,
} from "../../../shared/api/visits.js";
import {
  fetchMyEnquiries,
  createEnquiry,
  toUiEnquiry,
} from "../api/enquiries.js";
import {
  fetchViewed,
  toUiViewed,
} from "../api/viewed.js";
import { revealContactPhone } from "../../../shared/api/contact.js";
import { getAuthTokenSync } from "../../../shared/api/client.js";

// P2 honesty: no fabricated history. Viewed properties and call records have
// no backend source or local persistence, so both start empty and stay empty
// until genuine product-backed tracking lands. Existing empty states below
// cover the honest zero cases.

// Returns digits-only phone or null when no valid number is available.
// Callers show an honest unavailable message instead of a sample number.
function cleanPhoneOrNull(raw) {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  return digits.length > 0 ? digits : null;
}


// No backend agent directory exists: the Agents tab starts empty and
// shows the honest empty state below. Fabricated agent entries were removed.
const INITIAL_AGENTS = [];

export default function SavedScreen({ navigation, route }) {
  const { wishlist, removeFromWishlist, isWishlisted, toggleWishlist, refreshWishlist } = useWishlist();
  // Protected modal actions resume here after a guest logs in (Change 2).
  const requireAuth = useRequireAuth(navigation);

  useEffect(() => {
    refreshWishlist().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(
    useCallback(() => {
      refreshWishlist().catch(() => {});
    }, [refreshWishlist])
  );

  // Active tab state: "wishlist" | "call" | "messages" | "visits" | "agents" | "viewed"
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || "wishlist");

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route?.params?.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Selected property modal
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [viewedNumberProperty, setViewedNumberProperty] = useState(null);

  // Viewed properties state (server-backed: GET /buyer/viewed)
  const [viewedProperties, setViewedProperties] = useState([]);
  const [viewedLoading, setViewedLoading] = useState(false);
  const [viewedError, setViewedError] = useState(null);

  // Call history state with both Call and WhatsApp actions
  // No backend call-log API exists: the Calls tab starts empty and
  // shows the honest empty state below. Nothing here is seeded.
  const [callHistory, setCallHistory] = useState([]);

  // Messages/enquiries state (server-backed: GET /buyer/enquiries)
  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [enquiriesError, setEnquiriesError] = useState(null);

  // Site visits are server-backed (GET /buyer/visits) for authenticated
  // buyers; guests and logged-out users see the honest empty state. The
  // local mock store is no longer a source — no seeded visits, no invented
  // agent details.
  const [siteVisits, setSiteVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitFilter, setVisitFilter] = useState("upcoming");
  const [selectedVisitForDetails, setSelectedVisitForDetails] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const loadServerVisits = useCallback(() => {
    if (!getAuthTokenSync()) {
      setSiteVisits([]);
      return Promise.resolve([]);
    }
    setVisitsLoading(true);
    return fetchBuyerVisits({ page: 1, pageSize: 50 }).then(
      (resp) => {
        const mapped = (resp?.items || []).map(toUiVisit);
        setSiteVisits(mapped);
        setVisitsLoading(false);
        return mapped;
      },
      () => {
        setVisitsLoading(false);
        return [];
      }
    );
  }, []);

  // Load enquiries (messages) from the backend
  const loadEnquiries = useCallback(() => {
    if (!getAuthTokenSync()) {
      setEnquiries([]);
      setEnquiriesError(null);
      return Promise.resolve([]);
    }
    setEnquiriesLoading(true);
    setEnquiriesError(null);
    return fetchMyEnquiries({ page: 1, pageSize: 50 }).then(
      (resp) => {
        const items = Array.isArray(resp?.items) ? resp.items : [];
        setEnquiries(items);
        setEnquiriesLoading(false);
        return items;
      },
      (err) => {
        setEnquiriesLoading(false);
        setEnquiriesError(err);
        return [];
      }
    );
  }, []);

  // Load viewed properties from the backend
  const loadViewedProperties = useCallback(() => {
    if (!getAuthTokenSync()) {
      setViewedProperties([]);
      setViewedError(null);
      return Promise.resolve([]);
    }
    setViewedLoading(true);
    setViewedError(null);
    return fetchViewed({ page: 1, pageSize: 50 }).then(
      (resp) => {
        // Rows without a listing card map to null and are dropped.
        const mapped = (resp?.items || []).map(toUiViewed).filter(Boolean);
        setViewedProperties(mapped);
        setViewedLoading(false);
        return mapped;
      },
      (err) => {
        setViewedLoading(false);
        setViewedError(err);
        return [];
      }
    );
  }, []);

  // Views are recorded by PropertyDetailModal itself (once per opening, for
  // every entry point); this screen only refreshes its Viewed list after.
  const handleViewRecorded = useCallback(() => {
    loadViewedProperties().catch(() => {});
  }, [loadViewedProperties]);

  useFocusEffect(
    useCallback(() => {
      refreshWishlist().catch(() => {});
      loadServerVisits().catch(() => {});
      loadEnquiries().catch(() => {});
      loadViewedProperties().catch(() => {});
    }, [refreshWishlist, loadServerVisits, loadEnquiries, loadViewedProperties])
  );

  // Agents state (Agent Page Detail Tab)
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [selectedAgentForModal, setSelectedAgentForModal] = useState(null);

  const handleCallAgent = (agent) => {
    handleCall(agent?.phone, agent?.name || "Agent");
  };

  const handleWhatsAppAgent = (agent) => {
    const clean = cleanPhoneOrNull(agent?.phone);
    if (!clean) {
      Alert.alert(
        "Phone Number Unavailable",
        "The contact number for this agent is not available."
      );
      return;
    }
    const text = encodeURIComponent(
      `Hello ${agent?.name}! I found your profile on RESTAMP. I am looking for property assistance in ${agent?.localities ? agent.localities.join(", ") : "Chennai"}.`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${text}`).catch(() => {
      Alert.alert("WhatsApp Agent", `Chat with ${agent?.name} at ${agent?.phone}`);
    });
  };

  const findAgentByName = (name) => {
    return (
      agents.find((a) => (a.name || "").toLowerCase() === (name || "").toLowerCase()) ||
      agents[0]
    );
  };

  // Real authenticated identity only (GET /auth/me via AuthContext).
  // Never sample data: no mock name, phone, email, or avatar. The backend
  // exposes display_name/role/providers only, so phone shows only when known
  // from login, and the avatar falls back to a name initial.
  const { user: authUser, isAuthenticated, saveProfileName } = useAuth();
  const profileName = isAuthenticated
    ? (authUser?.name && authUser.name !== "User" ? authUser.name : (authUser?.phone || "My Account"))
    : "Guest";
  const profilePhone = isAuthenticated ? (authUser?.phone || "") : "";
  const profileSub = profilePhone
    || (isAuthenticated ? (authUser?.verified ? "Verified Buyer" : "Buyer Account") : "Log in to sync your wishlist");
  const profileAvatar = authUser?.avatar || null;
  const profileInitial = ((profileName || "?").trim().charAt(0) || "?").toUpperCase();

  // Edit Profile Modal State (name only — persisted via PATCH /users/me).
  // Phone numbers are OTP-bound identities with no update endpoint, so the
  // number is shown read-only and never edited here.
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");

  const openEditModal = () => {
    if (!isAuthenticated) {
      // Guest profile edit: log in first, then reopen this editor on return.
      requireAuth(() => setIsEditModalVisible(true));
      return;
    }
    setEditName(profileName === "My Account" ? "" : profileName);
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    try {
      const parts = trimmed.split(/\s+/);
      await saveProfileName(parts[0], parts.slice(1).join(" "));
      setIsEditModalVisible(false);
    } catch (e) {
      Alert.alert("Could Not Save", "Your session may have expired. Please log in again.");
    }
  };

  // Card specs from genuine fields only: unknown bedroom counts, prices,
  // areas, and construction statuses render as absent — never as invented
  // "3 BHK" / per-sqft / "Ready to move" fallbacks.
  const getCardSpecs = (property) => {
    const sqftNum = parseInt(String(property.sqft || "").replace(/,/g, "")) || null;
    const perSqft =
      property.rawPrice && sqftNum
        ? `₹${Math.round(property.rawPrice / sqftNum).toLocaleString("en-IN")}/sqft`
        : null;
    const statusText =
      property.constructionStatus ||
      (property.badge === "Just Added" ? "New Launch" : null);
    const specParts = [];
    if (property.beds > 0) specParts.push(`${property.beds} BHK`);
    if (property.sqft) specParts.push(`${property.sqft} sq ft`);

    return { perSqft, statusText, specsText: specParts.join(" • ") || null };
  };

  // Contact Handlers (P2 honesty: only dial/message a genuine number; never
  // fall back to a sample number. Missing numbers show an honest message.)
  const handleWhatsApp = (property) => {
    const cleanPhone = cleanPhoneOrNull(property?.agent?.phone);
    if (!cleanPhone) {
      Alert.alert(
        "Phone Number Unavailable",
        "The contact number for this property is not available."
      );
      return;
    }
    const text = encodeURIComponent(
      `Hello! I am interested in ${property?.title || "your property"} (${property?.price || ""}) in ${property?.location || "Chennai"}.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
      Alert.alert("WhatsApp Not Available", "Could not open WhatsApp for this contact.");
    });
  };

  const handleCall = (phone, name = "Agent") => {
    const digits = cleanPhoneOrNull(phone);
    if (!digits) {
      Alert.alert(
        "Phone Number Unavailable",
        `The contact number${name && name !== "Agent" ? ` for ${name}` : ""} is not available.`
      );
      return;
    }
    Linking.openURL(`tel:+${digits}`).catch(() => {
      Alert.alert("Call Unavailable", "Could not place this call.");
    });
  };

  // Visit contact goes through the authorized reveal endpoint only: the
  // server stores no agent phones on visits, so there is never a number to
  // fall back to. Failures show an honest message instead of a sample number.
  const handleVisitCall = (visit) => {
    const listingId = visit?.property_listing_id;
    if (typeof listingId !== "number") {
      Alert.alert(
        "Phone Number Unavailable",
        "The contact number for this visit is not available."
      );
      return;
    }
    revealContactPhone(listingId).then(
      (phone) => {
        if (!phone) {
          Alert.alert(
            "Phone Number Unavailable",
            "The contact number for this visit is not available."
          );
          return;
        }
        handleCall(phone, "Property Owner");
      },
      (e) => {
        if (e && (e.status === 401 || e.kind === "login")) {
          requireAuth(() => handleVisitCall(visit));
          return;
        }
        Alert.alert(
          "Phone Number Unavailable",
          "The contact number for this visit is not available."
        );
      }
    );
  };

  const handleWhatsAppVisit = (visit) => {
    const listingId = visit?.property_listing_id;
    if (typeof listingId !== "number") {
      Alert.alert(
        "Phone Number Unavailable",
        "The contact number for this visit is not available."
      );
      return;
    }
    revealContactPhone(listingId).then(
      (phone) => {
        const digits = cleanPhoneOrNull(phone);
        if (!digits) {
          Alert.alert(
            "Phone Number Unavailable",
            "The contact number for this visit is not available."
          );
          return;
        }
        const text = encodeURIComponent(
          `Hello! I am contacting you regarding our scheduled site visit for "${visit.propertyTitle}" on ${visit.date} at ${visit.time}.`
        );
        Linking.openURL(`https://wa.me/${digits}?text=${text}`).catch(() => {
          Alert.alert("WhatsApp Unavailable", "Could not open WhatsApp for this visit.");
        });
      },
      () => {
        Alert.alert(
          "Phone Number Unavailable",
          "The contact number for this visit is not available."
        );
      }
    );
  };

  const handleWhatsAppEnquiry = (msg) => {
    const digits = cleanPhoneOrNull(msg.recipientPhone);
    if (!digits) {
      Alert.alert(
        "Phone Number Unavailable",
        "The contact number for this enquiry is not available."
      );
      return;
    }
    const text = encodeURIComponent(
      `Hello ${msg.recipientName}! I am following up on my enquiry for "${msg.propertyTitle}".`
    );
    Linking.openURL(`https://wa.me/${digits}?text=${text}`).catch(() => {
      Alert.alert("WhatsApp Unavailable", `Could not open WhatsApp for ${msg.recipientName}.`);
    });
  };

  const refreshVisitsQuietly = () => {
    loadServerVisits().catch(() => {});
  };

  // Buyers cannot mark visits completed (owner-only transition): the button
  // is gone and this handler is removed. Cancel + reschedule below hit the
  // real PATCH /buyer/visits/{id} endpoint with honest failure states.

  const handleCancelVisit = (visit) => {
    if (typeof visit?.id !== "number") return;
    updateBuyerVisit(visit.id, { status: "CANCELLED" }).then(
      () => {
        setSelectedVisitForDetails(null);
        refreshVisitsQuietly();
        Alert.alert("Visit Cancelled", "The site visit has been cancelled.");
      },
      (e) => {
        if (e && (e.status === 401 || e.kind === "login")) {
          requireAuth(() => handleCancelVisit(visit));
          return;
        }
        Alert.alert(
          "Couldn't cancel visit",
          "Please check your connection and try again."
        );
      }
    );
  };

  const submitBuyerVisitStatus = (visit, status) => {
    if (typeof visit?.id !== "number") return;
    updateBuyerVisit(visit.id, { status }).then(
      () => {
        setSelectedVisitForDetails(null);
        refreshVisitsQuietly();
        Alert.alert(
          status === "CONFIRMED" ? "Visit Confirmed" : "Visit Declined",
          status === "CONFIRMED"
            ? "The site visit is confirmed for the proposed time."
            : "The proposed site visit has been declined."
        );
      },
      (e) => {
        if (e && (e.status === 401 || e.kind === "login")) {
          requireAuth(() => submitBuyerVisitStatus(visit, status));
          return;
        }
        if (e && (e.status === 403 || e.kind === "denied")) {
          Alert.alert(
            "Buyer Mode Required",
            "Your account is currently in Owner/Agent mode. Switch back to Buyer mode and try again.",
            [{ text: "OK" }]
          );
          return;
        }
        Alert.alert(
          status === "CONFIRMED" ? "Couldn't confirm visit" : "Couldn't decline visit",
          "The visit may have changed. Refresh and try again."
        );
      }
    );
  };

  const handleConfirmProposal = (visit) => {
    Alert.alert(
      "Confirm Site Visit",
      `Confirm the visit on ${visit.date} at ${visit.time}?`,
      [
        { text: "Not Now", style: "cancel" },
        { text: "Confirm", onPress: () => submitBuyerVisitStatus(visit, "CONFIRMED") },
      ]
    );
  };

  const handleDeclineProposal = (visit) => {
    Alert.alert(
      "Decline Site Visit",
      "Decline this proposed visit? You can still request another time later.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => submitBuyerVisitStatus(visit, "DECLINED"),
        },
      ]
    );
  };

  const handleConfirmReschedule = (visit, reschedData) => {
    if (typeof visit?.id !== "number") return;
    let scheduledAtISO;
    try {
      scheduledAtISO = toVisitPayload({
        date: reschedData?.date,
        time: reschedData?.time,
      }).scheduled_at;
    } catch (e) {
      Alert.alert("Invalid Date/Time", e?.message || "Please choose a future date and time.");
      return;
    }
    updateBuyerVisit(visit.id, { scheduledAtISO }).then(
      () => {
        setIsRescheduling(false);
        setSelectedVisitForDetails(null);
        refreshVisitsQuietly();
        Alert.alert(
          "Visit Rescheduled! 📅",
          `Site visit rescheduled to ${reschedData?.date} at ${reschedData?.time}.`
        );
      },
      (e) => {
        if (e && (e.status === 401 || e.kind === "login")) {
          requireAuth(() => handleConfirmReschedule(visit, reschedData));
          return;
        }
        if (e && (e.status === 403 || e.kind === "denied")) {
          Alert.alert(
            "Buyer Mode Required",
            "Your account is currently in Owner/Agent mode. Switch back to Buyer mode and try again.",
            [{ text: "OK" }]
          );
          return;
        }
        Alert.alert(
          "Couldn't reschedule visit",
          "Please check your connection and try again."
        );
      }
    );
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
            {profileAvatar ? (
              <Image source={{ uri: profileAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{profileInitial}</Text>
              </View>
            )}
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profileName}
            </Text>
            <Text style={styles.profilePhone} numberOfLines={1}>
              {profileSub}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScroll}
          >
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

            {/* Call Tab */}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "call" && styles.tabButtonActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab("call")}
            >
              <Text style={[styles.tabButtonText, activeTab === "call" && styles.tabButtonTextActive]}>
                Calls
              </Text>
              <View style={[styles.tabCountBadge, activeTab === "call" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "call" && styles.tabCountTextActive]}>
                  {callHistory.length}
                </Text>
              </View>
              {activeTab === "call" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            {/* Messages / Enquiries Tab */}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "messages" && styles.tabButtonActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab("messages")}
            >
              <Text style={[styles.tabButtonText, activeTab === "messages" && styles.tabButtonTextActive]}>
                Messages
              </Text>
              <View style={[styles.tabCountBadge, activeTab === "messages" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "messages" && styles.tabCountTextActive]}>
                  {enquiries.length}
                </Text>
              </View>
              {activeTab === "messages" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            {/* Site Visits Tab */}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "visits" && styles.tabButtonActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab("visits")}
            >
              <Text style={[styles.tabButtonText, activeTab === "visits" && styles.tabButtonTextActive]}>
                Site Visits
              </Text>
              <View style={[styles.tabCountBadge, activeTab === "visits" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "visits" && styles.tabCountTextActive]}>
                  {siteVisits.length}
                </Text>
              </View>
              {activeTab === "visits" && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            {/* Agents Tab (Agent Page Detail Tab) */}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "agents" && styles.tabButtonActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab("agents")}
            >
              <Text style={[styles.tabButtonText, activeTab === "agents" && styles.tabButtonTextActive]}>
                Agents
              </Text>
              <View style={[styles.tabCountBadge, activeTab === "agents" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "agents" && styles.tabCountTextActive]}>
                  {agents.length}
                </Text>
              </View>
              {activeTab === "agents" && <View style={styles.activeTabIndicator} />}
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
          </ScrollView>
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
                  const { perSqft, statusText, specsText } = getCardSpecs(property);

                  return (
                    <TouchableOpacity
                      key={property.id}
                      style={styles.propertyCard}
                      activeOpacity={0.92}
                      onPress={() => {
                        setSelectedProperty(property);
                      }}
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
                          <Heart size={18} color="#DC2626" fill="#DC2626" strokeWidth={2} />
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
                        {specsText ? (
                          <Text style={styles.specsText} numberOfLines={1}>
                            {specsText}
                          </Text>
                        ) : null}

                        {/* Price & Contact Row */}
                        <View style={styles.priceRow}>
                          <Text style={styles.propertyPrice}>
                            {property.price}
                            {perSqft ? <Text style={styles.propertyPriceSub}> • {perSqft}</Text> : null}
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
                  const { perSqft, specsText } = getCardSpecs(property);
                  const isSaved = isWishlisted(property.id);

                  return (
                    <TouchableOpacity
                      key={property.id}
                      style={styles.propertyCard}
                      activeOpacity={0.92}
                      onPress={() => {
                        setSelectedProperty(property);
                      }}
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
                            color={isSaved ? "#DC2626" : "#0F172A"}
                            fill={isSaved ? "#DC2626" : "none"}
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
                        {specsText ? (
                          <Text style={styles.specsText} numberOfLines={1}>
                            {specsText}
                          </Text>
                        ) : null}

                        {/* Price & Contact Row (Both Call & WhatsApp buttons) */}
                        <View style={styles.priceRow}>
                          <Text style={styles.propertyPrice}>
                            {property.price}
                            {perSqft ? <Text style={styles.propertyPriceSub}> • {perSqft}</Text> : null}
                          </Text>

                          <View style={styles.cardActionsInline}>
                            <TouchableOpacity
                              style={styles.contactBtnCall}
                              activeOpacity={0.8}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleCall(property?.agent?.phone || property?.ownerPhone, property?.agent?.name || "Owner");
                              }}
                            >
                              <Phone size={12} color="#0F172A" style={{ marginRight: 4 }} />
                              <Text style={styles.contactBtnCallText}>Call</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.contactBtnWhatsApp}
                              activeOpacity={0.8}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleWhatsApp(property);
                              }}
                            >
                              <MessageCircle size={13} color="#16A34A" style={{ marginRight: 4 }} />
                              <Text style={styles.contactBtnWhatsAppText}>WhatsApp</Text>
                            </TouchableOpacity>
                          </View>
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

                    {/* Call Footer Actions: Call, WhatsApp, Agent Details */}
                    <View style={styles.callFooterRow}>
                      <TouchableOpacity
                        style={styles.callActionBtnDark}
                        activeOpacity={0.85}
                        onPress={() => handleCall(item.agentPhone, item.agentName)}
                      >
                        <Phone size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text style={styles.callActionTextDark}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.callActionBtnLight}
                        activeOpacity={0.85}
                        onPress={() => handleWhatsApp(item.property)}
                      >
                        <MessageCircle size={13} color="#0F172A" style={{ marginRight: 5 }} />
                        <Text style={styles.callActionTextLight}>WhatsApp</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.callActionBtnAgent}
                        activeOpacity={0.85}
                        onPress={() => setSelectedAgentForModal(findAgentByName(item.agentName))}
                      >
                        <User size={13} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={styles.callActionTextAgent}>Agent Info</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 4: MESSAGES / ENQUIRIES */}        {activeTab === "messages" && (          <View style={styles.tabContentArea}>            <View style={styles.listHeaderRow}>              <Text style={styles.listSectionTitle}>                Messages & Enquiries ({enquiries.length})              </Text>            </View>            {enquiries.length === 0 ? (              <View style={styles.emptyContainer}>                <View style={styles.emptyIconCircle}>                  <MessageSquare size={32} color="#CBD5E1" strokeWidth={1.5} />                </View>                <Text style={styles.emptyTitle}>No messages yet</Text>                <Text style={styles.emptyText}>                  Direct enquiries sent to property owners and verified agents will appear here.                </Text>                <TouchableOpacity                  style={styles.exploreBtn}                  activeOpacity={0.85}                  onPress={() => navigation.navigate("Home")}                >                  <Text style={styles.exploreBtnText}>Find Properties to Enquire</Text>                  <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />                </TouchableOpacity>              </View>            ) : (              <View style={styles.messagesList}>                {enquiries.map((row) => {                  const item = toUiEnquiry(row);                  return (                    <View key={item.id} style={styles.messageCard}>                      {/* Header: Recipient Name, Role & Status */}                      <View style={styles.messageHeaderRow}>                        <View style={styles.messageRecipientCol}>                          <View style={styles.msgIconBox}>                            <User size={16} color="#2563EB" />                          </View>                          <View>                            <Text style={styles.msgRecipientName}>{item.recipientName}</Text>                            <Text style={styles.msgRecipientRole}>{item.recipientRole}</Text>                          </View>                        </View>                        <View style={styles.msgStatusCol}>                          <View style={styles.msgStatusBadge}>                            <Text style={styles.msgStatusText}>{item.status}</Text>                          </View>                          <Text style={styles.msgTimeText}>{item.timestamp}</Text>                        </View>                      </View>                      {/* Associated Property Snippet */}                      <View style={styles.msgPropertyRow}>                        <SafeImage                          source={{ uri: item.propertyImage }}                          style={styles.msgPropertyThumb} />                        <View style={{ flex: 1 }}>                          <Text style={styles.msgPropertyTitle} numberOfLines={1}>                            {item.propertyTitle}                          </Text>                          <Text style={styles.msgPropertyLoc} numberOfLines={1}>                            {item.propertyPrice} • {item.propertyLocation}                          </Text>                        </View>                      </View>                      {/* Message Preview Quote */}                      <View style={styles.msgBubble}>                        <Text style={styles.msgBubbleText} numberOfLines={2}>                          "{item.lastMessage}"                        </Text>                      </View>                      {/* Divider */}                      <View style={styles.cardDivider} />                      {/* Action Buttons: Call, WhatsApp, Agent Details */}                      <View style={styles.cardActionsInline}>                        <TouchableOpacity                          style={styles.callCustomerBtn}                          onPress={() => handleCall(item.recipientPhone, item.recipientName)}                          activeOpacity={0.8}>                          <Phone size={13} color="#0F172A" style={{ marginRight: 5 }} />                          <Text style={styles.callCustomerBtnText}>Call</Text>                        </TouchableOpacity>                        <TouchableOpacity                          style={styles.whatsappActionBtn}                          onPress={() => handleWhatsAppEnquiry(item)}                          activeOpacity={0.8}>                          <MessageCircle size={13} color="#16A34A" style={{ marginRight: 5 }} />                          <Text style={styles.whatsappActionBtnText}>WhatsApp</Text>                        </TouchableOpacity>                        <TouchableOpacity                          style={styles.msgAgentDetailBtn}                          onPress={() => setSelectedAgentForModal(findAgentByName(item.recipientName))}                          activeOpacity={0.8}>                          <User size={13} color="#2563EB" style={{ marginRight: 4 }} />                          <Text style={styles.msgAgentDetailBtnText}>Agent Info</Text>                        </TouchableOpacity>                      </View>                    </View>                  );                })}              </View>            )}          </View>        )}        {/* TAB 5: SITE VISITS (Matching Agent/Owner Reference Design) */}
        {activeTab === "visits" && (
          <View style={styles.tabContentArea}>
            <View style={styles.visitScreenHeader}>
              <Text style={styles.visitHeaderTitle}>Site Visits</Text>
              <Text style={styles.visitHeaderSubtitle}>
                Track your property visits and respond to owner-proposed times
              </Text>
            </View>

            {/* Filter Pills: Upcoming (2), Completed (2), Cancelled (0) */}
            <View style={styles.visitFilterRow}>
              {[
                { id: "upcoming", label: "Upcoming" },
                { id: "completed", label: "Completed" },
                { id: "cancelled", label: "Cancelled" },
              ].map((tab) => {
                const isActive = visitFilter === tab.id;
                const count = siteVisits.filter((v) => v.status === tab.id).length;

                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.visitFilterBtn, isActive && styles.visitFilterBtnActive]}
                    onPress={() => setVisitFilter(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.visitFilterBtnText,
                        isActive && styles.visitFilterBtnTextActive,
                      ]}
                    >
                      {tab.label} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Visits List */}
            {siteVisits.filter((v) => v.status === visitFilter).length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Calendar size={32} color="#CBD5E1" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No {visitFilter} site visits</Text>
                <Text style={styles.emptyText}>
                  Site visits you request or receive from an owner will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.visitsList}>
                {siteVisits
                  .filter((v) => v.status === visitFilter)
                  .map((item) => (
                    <View key={item.id} style={styles.visitCard}>
                      {/* Card Header: Person Name & Status Pill */}
                      <View style={styles.visitCardHeader}>
                        <View style={styles.visitPersonRow}>
                          <User size={15} color="#2563EB" style={{ marginRight: 6 }} />
                          <Text style={styles.visitPersonName}>Visit #{item.id}</Text>
                          {item.serverStatus ? (
                            <Text style={styles.visitPersonRole}> • {item.serverStatus}</Text>
                          ) : null}
                        </View>

                        <View
                          style={[
                            styles.statusPill,
                            item.status === "completed" && styles.statusPillCompleted,
                            item.status === "cancelled" && styles.statusPillCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              item.status === "completed" && styles.statusPillTextCompleted,
                              item.status === "cancelled" && styles.statusPillTextCancelled,
                            ]}
                          >
                            {item.status === "upcoming"
                              ? "Upcoming"
                              : item.status === "completed"
                              ? "Completed"
                              : "Cancelled"}
                          </Text>
                        </View>
                      </View>

                      {/* Visit Body: Property & Location */}
                      <View style={styles.visitBody}>
                        <View style={styles.bodyField}>
                          <Text style={styles.fieldLabel}>Property:</Text>
                          <Text style={styles.fieldValueBold}>
                            {item.propertyTitle}
                          </Text>
                        </View>

                        <View style={styles.dateTimeRow}>
                          <View style={styles.dateTimeBadge}>
                            <Calendar size={13} color="#2563EB" style={{ marginRight: 5 }} />
                            <Text style={styles.dateTimeText}>Visit Date: {item.date}</Text>
                          </View>

                          <View style={styles.dateTimeBadge}>
                            <Clock size={13} color="#2563EB" style={{ marginRight: 5 }} />
                            <Text style={styles.dateTimeText}>Time: {item.time}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Divider */}
                      <View style={styles.cardDivider} />

                      {/* Actions: Call, WhatsApp, Agent Info, View Details */}
                      <View style={styles.visitCardActionsRow}>
                        <TouchableOpacity
                          style={styles.visitCallBtn}
                          onPress={() => handleVisitCall(item)}
                          activeOpacity={0.8}
                        >
                          <Phone size={13} color="#0F172A" style={{ marginRight: 4 }} />
                          <Text style={styles.visitCallBtnText}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.visitWhatsAppBtn}
                          onPress={() => handleWhatsAppVisit(item)}
                          activeOpacity={0.8}
                        >
                          <MessageCircle size={13} color="#16A34A" style={{ marginRight: 4 }} />
                          <Text style={styles.visitWhatsAppBtnText}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.visitDetailsBtn}
                          onPress={() => setSelectedVisitForDetails(item)}
                          activeOpacity={0.8}
                        >
                          <Eye size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.visitDetailsBtnText}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 6: AGENTS (Agent Page Detail Tab) */}
        {activeTab === "agents" && (
          <View style={styles.tabContentArea}>
            <View style={styles.visitScreenHeader}>
              <Text style={styles.visitHeaderTitle}>Verified Local Agents ({agents.length})</Text>
              <Text style={styles.visitHeaderSubtitle}>
                Dedicated RESTAMP partner brokers to guide your site visits, property inspections & deal closing
              </Text>
            </View>

            {/* No backend agent directory exists: show the honest empty
                state instead of fabricated agent profiles. */}
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <User size={32} color="#CBD5E1" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No agents yet</Text>
              <Text style={styles.emptyText}>
                Verified partner profiles will appear here once the agent directory is available.
              </Text>
            </View>
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

            {/* Mobile Number (read-only: OTP-bound identity, no update API) */}
            {profilePhone ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[styles.textInput, { justifyContent: "center" }]}>
                  <Text style={{ fontSize: 16, color: "#0F172A" }}>{profilePhone}</Text>
                </View>
              </View>
            ) : null}

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
                  {viewedNumberProperty?.agent?.name || "Property contact"}
                </Text>
                <Text style={styles.sheetSub}>
                  {viewedNumberProperty?.agent?.agency || "Contact details"}
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
                if (!viewedNumberProperty?.agent?.phone) {
                  Alert.alert(
                    "Phone Number Unavailable",
                    "The contact number for this property is not available."
                  );
                  return;
                }
                Alert.alert(
                  "Copied!",
                  `${viewedNumberProperty?.agent?.phone} copied to clipboard.`
                );
              }}
            >
              <View style={styles.phoneIconCircle}>
                <Phone size={14} color="#0F172A" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.phoneLabel}>PHONE NUMBER</Text>
                <Text style={styles.phoneNumber}>
                  {viewedNumberProperty?.agent?.phone || "Not available"}
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
        onLoginRequired={(resume) => requireAuth(resume)}
        isWishlisted={isWishlisted}
        onToggleWishlist={toggleWishlist}
        onViewRecorded={handleViewRecorded}
      />

      {/* ================= SITE VISIT DETAILS MODAL ================= */}
      <Modal
        visible={!!selectedVisitForDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVisitForDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Site Visit Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedVisitForDetails(null)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {selectedVisitForDetails && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Booking</Text>
                    <Text style={styles.detailValueBold}>
                      Visit #{selectedVisitForDetails.id}
                      {selectedVisitForDetails.serverStatus
                        ? ` · ${selectedVisitForDetails.serverStatus}`
                        : ""}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Property</Text>
                    <Text style={styles.detailValueBold}>
                      {selectedVisitForDetails.propertyTitle}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.date}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.time}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitForDetails.note || "No notes added."}
                    </Text>
                  </View>
                </View>

                {/* Contact Box — numbers come only from the authorized
                    reveal endpoint (see Call/WhatsApp buttons); the server
                    stores no agent identity on visits. */}
                <View style={styles.modalAgentBox}>
                  <View style={styles.modalAgentHeader}>
                    <View style={styles.modalAgentAvatarCircle}>
                      <User size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalAgentName} numberOfLines={1}>
                        {selectedVisitForDetails.propertyTitle || "Property visit"}
                      </Text>
                      <Text style={styles.modalAgentAgency}>
                        {selectedVisitForDetails.date} · {selectedVisitForDetails.time}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalAgentActionsRow}>
                    <TouchableOpacity
                      style={styles.modalAgentCallBtn}
                      onPress={() => handleVisitCall(selectedVisitForDetails)}
                      activeOpacity={0.8}
                    >
                      <Phone size={12} color="#0F172A" style={{ marginRight: 4 }} />
                      <Text style={styles.modalAgentCallBtnText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalAgentMsgBtn}
                      onPress={() => handleWhatsAppVisit(selectedVisitForDetails)}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={12} color="#16A34A" style={{ marginRight: 4 }} />
                      <Text style={styles.modalAgentMsgBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Modal Action Buttons — buyers may reschedule open visits
                    and cancel; completion is owner-only on the backend, so no
                    Mark Completed action exists here. */}
                <View style={styles.detailsModalActions}>
                  {selectedVisitForDetails.serverStatus === "PROPOSED" && (
                    <>
                      <TouchableOpacity
                        style={styles.btnReschedule}
                        onPress={() => handleConfirmProposal(selectedVisitForDetails)}
                        activeOpacity={0.8}
                      >
                        <CheckCircle2 size={14} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={styles.btnRescheduleText}>Confirm Visit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnCancel}
                        onPress={() => handleDeclineProposal(selectedVisitForDetails)}
                        activeOpacity={0.8}
                      >
                        <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={styles.btnCancelText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {(selectedVisitForDetails.serverStatus === "REQUESTED" ||
                    selectedVisitForDetails.serverStatus === "CONFIRMED") && (
                    <>
                      <TouchableOpacity
                        style={styles.btnReschedule}
                        onPress={() => setIsRescheduling(true)}
                        activeOpacity={0.8}
                      >
                        <RotateCcw size={14} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={styles.btnRescheduleText}>Reschedule</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnCancel}
                        onPress={() => handleCancelVisit(selectedVisitForDetails)}
                        activeOpacity={0.8}
                      >
                        <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={styles.btnCancelText}>Cancel Visit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= RESCHEDULE VISIT MODAL ================= */}
      <ScheduleVisitModal
        key={selectedVisitForDetails ? `visit-${selectedVisitForDetails.id}-${selectedVisitForDetails.scheduledAt}` : "none"}
        visible={isRescheduling && !!selectedVisitForDetails}
        onClose={() => setIsRescheduling(false)}
        title="Reschedule Visit"
        lead={{ customerName: selectedVisitForDetails?.propertyTitle }}
        property={{
          title: selectedVisitForDetails?.propertyTitle,
          location: "",
        }}
        initialTime={selectedVisitForDetails?.time || "10:00 am"}
        onConfirm={(reschedData) => {
          handleConfirmReschedule(selectedVisitForDetails, reschedData);
        }}
      />

      {/* ================= AGENT PAGE DETAIL MODAL ================= */}
      <Modal
        visible={!!selectedAgentForModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAgentForModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.agentDetailModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agent Profile & Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedAgentForModal(null)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {selectedAgentForModal && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Agent Header */}
                <View style={styles.modalAgentProfileHeader}>
                  <Image
                    source={{ uri: selectedAgentForModal.avatar }}
                    style={styles.modalAgentBigAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalAgentBigName}>{selectedAgentForModal.name}</Text>
                    <Text style={styles.modalAgentBigAgency}>{selectedAgentForModal.agency}</Text>
                    <View style={styles.modalReraPill}>
                      <ShieldCheck size={11} color="#16A34A" style={{ marginRight: 4 }} />
                      <Text style={styles.modalReraPillText}>{selectedAgentForModal.reraNumber}</Text>
                    </View>
                  </View>
                </View>

                {/* Rating & Stats */}
                <View style={styles.modalAgentStatsBox}>
                  <View style={styles.modalStatCol}>
                    <Text style={styles.modalStatVal}>⭐ {selectedAgentForModal.rating}</Text>
                    <Text style={styles.modalStatSub}>{selectedAgentForModal.reviewsCount} Reviews</Text>
                  </View>
                  <View style={[styles.modalStatCol, styles.modalStatColBorder]}>
                    <Text style={styles.modalStatVal}>{selectedAgentForModal.dealsClosed}+</Text>
                    <Text style={styles.modalStatSub}>Closed Deals</Text>
                  </View>
                  <View style={styles.modalStatCol}>
                    <Text style={styles.modalStatVal}>{selectedAgentForModal.experience}</Text>
                    <Text style={styles.modalStatSub}>Experience</Text>
                  </View>
                </View>

                {/* Bio / About */}
                <View style={styles.modalSectionBox}>
                  <Text style={styles.modalSectionTitle}>About Agent</Text>
                  <Text style={styles.modalSectionBody}>{selectedAgentForModal.bio}</Text>
                </View>

                {/* Contact Information */}
                <View style={styles.modalSectionBox}>
                  <Text style={styles.modalSectionTitle}>Direct Contact</Text>
                  <View style={styles.modalContactItem}>
                    <Phone size={14} color="#2563EB" style={{ marginRight: 8 }} />
                    <Text style={styles.modalContactText}>{selectedAgentForModal.phone}</Text>
                  </View>
                  <View style={styles.modalContactItem}>
                    <MapPin size={14} color="#2563EB" style={{ marginRight: 8 }} />
                    <Text style={styles.modalContactText}>{selectedAgentForModal.officeAddress}</Text>
                  </View>
                </View>

                {/* Specialties & Localities */}
                <View style={styles.modalSectionBox}>
                  <Text style={styles.modalSectionTitle}>Localities & Focus</Text>
                  <View style={styles.modalLocChipsWrap}>
                    {selectedAgentForModal.localities.map((loc, idx) => (
                      <View key={idx} style={styles.agentLocChip}>
                        <Text style={styles.agentLocChipText}>{loc}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Fixed CTA Buttons inside Modal */}
                <View style={styles.modalAgentCtaRow}>
                  <TouchableOpacity
                    style={styles.modalAgentCallCta}
                    onPress={() => handleCallAgent(selectedAgentForModal)}
                    activeOpacity={0.85}
                  >
                    <Phone size={14} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.modalAgentCallCtaText}>Call Agent</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalAgentMsgCta}
                    onPress={() => handleWhatsAppAgent(selectedAgentForModal)}
                    activeOpacity={0.85}
                  >
                    <MessageCircle size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalAgentMsgCtaText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
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
  avatarFallback: {
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
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
    fontWeight: "700",
    color: "#2563EB",
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
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 14,
  },
  tabCountTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 4,
    right: 4,
    height: 2.5,
    backgroundColor: "#2563EB",
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

  /* Tab Bar Scroll */
  tabBarScroll: {
    paddingHorizontal: 12,
    gap: 4,
  },

  /* Card Actions Inline (Call & WhatsApp) */
  cardActionsInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactBtnCall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  contactBtnCallText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  contactBtnWhatsApp: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  contactBtnWhatsAppText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },

  /* Messages Tab Styles */
  messagesList: {
    gap: 14,
    paddingBottom: 24,
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  messageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  messageRecipientCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  msgIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  msgRecipientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  msgRecipientRole: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  msgStatusCol: {
    alignItems: "flex-end",
  },
  msgStatusBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  msgStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  msgTimeText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },
  msgPropertyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
    gap: 10,
  },
  msgPropertyThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  msgPropertyTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  msgPropertyLoc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  msgBubble: {
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  msgBubbleText: {
    fontSize: 12.5,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 18,
  },
  callCustomerBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  callCustomerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  whatsappActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
  },

  /* Site Visits Tab Styles (Matching Screenshot) */
  visitScreenHeader: {
    marginBottom: 12,
  },
  visitHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  visitHeaderSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  visitFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  visitFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  visitFilterBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  visitFilterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  visitFilterBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  visitsList: {
    gap: 14,
    paddingBottom: 24,
  },
  visitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  visitCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  visitPersonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitPersonName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  visitPersonRole: {
    fontSize: 12,
    color: "#64748B",
  },
  statusPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillCompleted: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  statusPillCancelled: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  statusPillTextCompleted: {
    color: "#16A34A",
  },
  statusPillTextCancelled: {
    color: "#DC2626",
  },
  visitBody: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  bodyField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  fieldValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1E293B",
  },
  fieldValueBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  dateTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateTimeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  visitCardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  visitCallBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  visitCallBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  visitWhatsAppBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  visitWhatsAppBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  visitDetailsBtn: {
    flex: 1.2,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  visitDetailsBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Details Modal Styles */
  detailsModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    width: 80,
  },
  detailValue: {
    flex: 1,
    fontSize: 12.5,
    color: "#1E293B",
    textAlign: "right",
  },
  detailValueBold: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  detailsModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnReschedule: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRescheduleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  btnComplete: {
    flex: 1.2,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCompleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnCancel: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  /* Card Action Extensions: Agent Info Buttons */
  callActionBtnAgent: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  callActionTextAgent: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  msgAgentDetailBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  msgAgentDetailBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  visitAgentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  visitAgentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* TAB 6: AGENTS LIST STYLES */
  agentsList: {
    gap: 16,
    paddingBottom: 24,
  },
  agentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  agentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  agentAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 14,
    backgroundColor: "#E2E8F0",
  },
  agentHeaderInfo: {
    flex: 1,
  },
  agentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  agentNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  agentVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  agentVerifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  agentAgencyText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 2,
  },
  agentRoleText: {
    fontSize: 11.5,
    color: "#64748B",
    marginBottom: 4,
  },
  agentRatingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  agentRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 4,
  },
  agentReviewsText: {
    fontSize: 11.5,
    color: "#64748B",
  },
  agentStatsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  agentStatItem: {
    flex: 1,
    alignItems: "center",
  },
  agentStatItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
  },
  agentStatNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  agentStatLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "#64748B",
  },
  agentLocalitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 4,
  },
  agentLocalitiesLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
    marginRight: 4,
  },
  agentLocalitiesChips: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  agentLocChip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  agentLocChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  agentSpecialtyText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 12,
  },
  agentCardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  agentCallBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  agentCallBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  agentMsgBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  agentMsgBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  agentDetailBtn: {
    flex: 1.2,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  agentDetailBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* ASSIGNED AGENT BOX INSIDE VISIT DETAILS MODAL */
  modalAgentBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 16,
  },
  modalAgentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  modalAgentAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalAgentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalAgentAgency: {
    fontSize: 11.5,
    color: "#2563EB",
    marginTop: 1,
  },
  modalAgentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalAgentCallBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAgentCallBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalAgentMsgBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAgentMsgBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  modalAgentProfileBtn: {
    flex: 1.1,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAgentProfileBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* AGENT DETAIL MODAL */
  agentDetailModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  modalAgentProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 14,
  },
  modalAgentBigAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 14,
    backgroundColor: "#E2E8F0",
  },
  modalAgentBigName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 3,
  },
  modalAgentBigAgency: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 6,
  },
  modalReraPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    alignSelf: "flex-start",
  },
  modalReraPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  modalAgentStatsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  modalStatCol: {
    flex: 1,
    alignItems: "center",
  },
  modalStatColBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalStatVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  modalStatSub: {
    fontSize: 11,
    color: "#64748B",
  },
  modalSectionBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  modalSectionBody: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
  modalContactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  modalContactText: {
    fontSize: 12.5,
    color: "#334155",
    fontWeight: "500",
  },
  modalLocChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  modalAgentCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  modalAgentCallCta: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAgentCallCtaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalAgentMsgCta: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAgentMsgCtaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
