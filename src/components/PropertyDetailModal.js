import React, { useState, useRef, useEffect, memo } from "react";
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
  Linking,
  ActivityIndicator,
  StatusBar,
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
  Armchair,
  Tag,
  Compass,
  Maximize2,
  Car,
} from "./common/HugeIcon";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "../constants/colors";
import TYPOGRAPHY from "../constants/typography";
import { fetchListingDetail, fetchSimilar } from "../api/listings";
import {
  createBuyerVisit,
  fetchBuyerVisits,
  toUiVisit,
  toVisitPayload,
  updateBuyerVisit,
} from "../api/visits";
import SafeImage from "./common/SafeImage";
import PropertyGalleryModal from "./PropertyGalleryModal";
import ScheduleVisitModal from "./ScheduleVisitModal";
import { createEnquiry } from "../api/enquiries";
import { revealContactPhone } from "../api/contact";
import { recordViewed } from "../api/viewed";
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
];

const getFurnishingDetails = (val) => {
  const raw = (val || "Semi-Furnished").toString().toLowerCase();
  if (raw.includes("unfurnish")) {
    return {
      title: "Unfurnished",
      subtitle: "Blank canvas ready for personalized design & interior decoration",
      tag: "Bare Shell",
      inclusions: [
        "Basic Electrical Points",
        "Sanitary Ware & CP Fittings",
        "Standard Flooring",
        "Main Door Security Locks",
      ],
    };
  }
  if (raw.includes("full") || raw === "furnished") {
    return {
      title: "Fully Furnished",
      subtitle: "100% Move-in ready with complete furniture and appliances",
      tag: "Full Setup",
      inclusions: [
        "Modular Kitchen",
        "Living Room Sofa Set",
        "Beds & Mattresses",
        "Air Conditioning",
        "Built-in Wardrobes",
        "Designer Lighting",
      ],
    };
  }
  return {
    title: "Semi-Furnished",
    subtitle: "Equipped with essential woodwork, modular fittings & cabinetry",
    tag: "Move-in Ready",
    inclusions: [
      "Modular Kitchen",
      "Built-in Wardrobes",
      "Designer Light Fittings",
      "Ceiling Fans & Exhaust",
    ],
  };
};

function PropertyDetailModal({
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
  // Optional: called when an action needs authentication (e.g. logged-out
  // enquiry). Callers wire this to the existing Login route; auth logic
  // itself is never changed here.
  onLoginRequired,
  // Optional: called after this sheet has recorded a view (e.g. so a
  // screen showing viewed history can refresh). The sheet is the ONLY
  // place that records views, so callers never post their own.
  onViewRecorded,
}) {
  const insets = useSafeAreaInsets();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [questionText, setQuestionText] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);
  // Guards duplicate taps while an enquiry request is in flight.
  const [enquirySending, setEnquirySending] = useState(false);
  const [customAddress, setCustomAddress] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [customInputAddress, setCustomInputAddress] = useState("");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [scheduledVisit, setScheduledVisit] = useState(null);
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquiryTopic, setEnquiryTopic] = useState("Interested in buying");
  const [enquiryMessage, setEnquiryMessage] = useState(
    "Hello, I am interested in this property. Please share further details."
  );
  const furnishingData = getFurnishingDetails(property?.furnishing);

  useEffect(() => {
    if (property) {
      setEnquirySent(false);
      setEnquiryTopic("Interested in buying");
      setEnquiryMessage(
        `Hello, I am interested in ${property.title}. Please share further details.`
      );
    }
    // Existing server visit for this listing (authenticated buyers only).
    // Guests and mock-sourced cards keep no local visit: nothing is
    // scheduled until the backend confirms it.
    setScheduledVisit(null);
    const backendId = property && property.backendId;
    if (typeof backendId !== "number" || !getAuthTokenSync()) return;
    let cancelled = false;
    fetchBuyerVisits({ page: 1, pageSize: 50 }).then(
      (resp) => {
        if (cancelled) return;
        const match = (resp?.items || [])
          .map(toUiVisit)
          .find(
            (v) =>
              v.property_listing_id === backendId &&
              (v.serverStatus === "REQUESTED" ||
                v.serverStatus === "PROPOSED" ||
                v.serverStatus === "CONFIRMED")
          );
        if (!cancelled) setScheduledVisit(match || null);
      },
      () => {
        if (!cancelled) setScheduledVisit(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [property]);

  // Viewed history: record that this real listing was opened (Home, Search,
  // Explore, Saved…) — once per opening, from this sheet only. Fire-and-
  // forget: recordViewed never throws, never blocks the sheet, and never
  // switches the account's role. The callback is read through a ref so a
  // new function identity on re-render never records again.
  const onViewRecordedRef = useRef(onViewRecorded);
  onViewRecordedRef.current = onViewRecorded;
  useEffect(() => {
    const backendId = property && property.backendId;
    if (!visible || typeof backendId !== "number") return;
    recordViewed(backendId).then((recorded) => {
      if (recorded && onViewRecordedRef.current) onViewRecordedRef.current(recorded);
    });
  }, [visible, property && property.backendId]);

  // Live similar-properties state (Phase 4). Declared with the other hooks,
  // before any early return, to preserve hook order on every render.
  // Mock-sourced properties (no numeric backendId) skip fetching entirely.
  const [liveSimilar, setLiveSimilar] = useState(undefined);
  // Real gallery for backend-backed cards opened without one (e.g. from Home
  // cards, which carry only the cover). Prevents mixing sample Unsplash
  // photos into a real listing's gallery. Mock flows keep existing fallback.
  const [liveGallery, setLiveGallery] = useState(undefined);
  useEffect(() => {
    setLiveSimilar(undefined);
    setLiveGallery(undefined);
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
    if (!property.gallery || property.gallery.length === 0) {
      fetchListingDetail(backendId).then(
        (detail) => {
          if (!cancelled) setLiveGallery(detail.gallery || []);
        },
        () => {
          if (!cancelled) setLiveGallery(null);
        }
      );
    }
    return () => {
      cancelled = true;
    };
  }, [property && property.backendId]);

  const mainScrollViewRef = useRef(null);
  const sectionYMap = useRef({});
  const isProgrammaticScroll = useRef(false);
  const TAB_BAR_HEIGHT = 54;

  const scrollToSection = (tabId) => {
    setActiveTab(tabId);
    isProgrammaticScroll.current = true;
    const yPos = sectionYMap.current[tabId];
    if (yPos !== undefined && mainScrollViewRef.current) {
      mainScrollViewRef.current.scrollTo({
        y: Math.max(0, yPos - TAB_BAR_HEIGHT - 12),
        animated: true,
      });
    }
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 450);
  };

  const handleMainScroll = (e) => {
    if (isProgrammaticScroll.current) return;
    const scrollY = e.nativeEvent.contentOffset.y;
    const tabOrder = ["overview", "highlights", "details", "amenities", "location"];
    let detectedTab = "overview";
    for (const tabId of tabOrder) {
      const yPos = sectionYMap.current[tabId];
      if (yPos !== undefined && scrollY >= yPos - TAB_BAR_HEIGHT - 35) {
        detectedTab = tabId;
      }
    }
    if (detectedTab !== activeTab) {
      setActiveTab(detectedTab);
    }
  };

  if (!visible || !property) return null;

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

  // Only real stored photos are shown. A live detail fetch may supply the
  // gallery when the opening card carried only its cover; failures stay empty.
  const effectiveGallery =
    property.gallery && property.gallery.length > 0
      ? property.gallery
      : Array.isArray(liveGallery) && liveGallery.length > 0
        ? liveGallery
        : null;
  const displayImages =
    effectiveGallery && effectiveGallery.length > 0
      ? [...effectiveGallery]
      : [property.image].filter(Boolean);
  const morePhotosCount = Math.max(0, displayImages.length - 5);

  // Live similar results only; failures render an honest empty state.
  const similarProps = Array.isArray(liveSimilar) ? liveSimilar : [];

  const handleSendQuestion = () => {
    if (!questionText.trim()) {
      Alert.alert(
        "Please enter your question",
        "Type your query before sending.",
      );
      return;
    }
    // Questions persist as enquiries: server-confirmed only, never claimed
    // on failure. Guests log in first with resume (same continuation
    // contract as Send Enquiry).
    const backendId = property && property.backendId;
    const question = questionText.trim();
    if (typeof backendId !== "number" || !getAuthTokenSync()) {
      handleLoginRequired(
        "Log in to send your question for this property. It is only shared after a successful submission.",
        () => handleSendQuestion()
      );
      return;
    }
    createEnquiry(backendId, question).then(
      () => {
        setEnquirySent(true);
        Alert.alert(
          "Question Sent to Seller! 🚀",
          `Your question: "${question}" has been sent to the property seller. You will receive a response shortly.`,
          [{ text: "OK", onPress: () => setQuestionText("") }]
        );
      },
      (e) => {
        if (e && e.status === 404) {
          Alert.alert(
            "No Longer Available",
            "This property is no longer available, so the question was not sent.",
            [{ text: "OK" }]
          );
          return;
        }
        if (e && (e.status === 401 || e.kind === "login")) {
          handleLoginRequired(
            "Your session has expired. Log in again to send your question for this property.",
            () => handleSendQuestion()
          );
          return;
        }
        if (e && (e.status === 403 || e.kind === "denied")) {
          // The request already tried to put the account in Buyer mode
          // (src/api/buyerMode.js) and the server still refused it, so the
          // question was NOT sent. Say so instead of implying a partial send.
          Alert.alert(
            "Question Not Sent",
            "Your account could not be switched to Buyer mode, so the question was not sent. Please switch to Buyer mode and try again.",
            [{ text: "OK" }]
          );
          return;
        }
        Alert.alert(
          "Couldn't send question",
          "Please check your connection and try again.",
          [{ text: "OK" }]
        );
      }
    );
  };

  const handleRequestSiteVisit = () => {
    if (scheduledVisit) {
      const visitState =
        scheduledVisit.status === "CONFIRMED"
          ? "confirmed"
          : scheduledVisit.status === "PROPOSED"
            ? "proposed"
            : "requested";
      Alert.alert(
        "Site Visit",
        `Your site visit for "${property.title}" is ${visitState} for ${scheduledVisit.date} at ${scheduledVisit.time}.\n\nWould you like to reschedule or cancel?`,
        [
          {
            text: "Cancel Visit",
            style: "destructive",
            onPress: () => {
              cancelScheduledVisit();
            },
          },
          {
            text: "Reschedule",
            onPress: () => setIsScheduleVisitOpen(true),
          },
          { text: "Keep Visit", style: "cancel" },
        ]
      );
      return;
    }
    const backendId = property && property.backendId;
    if (typeof backendId !== "number") {
      Alert.alert(
        "Site Visits Not Supported Yet",
        `Visits for "${property.title}" can't be booked yet. Please use Send Enquiry and the seller will contact you.`,
        [{ text: "OK" }]
      );
      return;
    }
    if (!getAuthTokenSync()) {
      handleLoginRequired(
        "Log in to schedule a site visit for this property. It is only booked after a successful submission.",
        () => handleRequestSiteVisit()
      );
      return;
    }
    setIsScheduleVisitOpen(true);
  };

  const cancelScheduledVisit = () => {
    const visitId = scheduledVisit && scheduledVisit.id;
    if (typeof visitId !== "number") {
      setScheduledVisit(null);
      return;
    }
    updateBuyerVisit(visitId, { status: "CANCELLED" }).then(
      () => {
        setScheduledVisit(null);
        Alert.alert("Visit Cancelled", "Your scheduled visit has been cancelled.");
      },
      (e) => {
        if (e && (e.status === 401 || e.kind === "login")) {
          handleLoginRequired(
            "Your session has expired. Log in again to manage your visit.",
            () => cancelScheduledVisit()
          );
          return;
        }
        Alert.alert(
          "Couldn't cancel visit",
          "Please check your connection and try again."
        );
      }
    );
  };

  const handleConfirmVisit = (visitData) => {
    // Real backend scheduling only: guests log in first (resume re-opens
    // this same confirmation), then POST or PATCH /buyer/visits. Nothing is
    // shown as scheduled until the server confirms it — no local ids, no
    // invented agent details, no free-slot claims.
    const backendId = property && property.backendId;
    if (typeof backendId !== "number" || !getAuthTokenSync()) {
      setIsScheduleVisitOpen(false);
      handleLoginRequired(
        "Log in to schedule a site visit for this property. It is only booked after a successful submission.",
        () => {
          setIsScheduleVisitOpen(true);
        }
      );
      return;
    }
    let payload;
    try {
      payload = toVisitPayload({
        date: visitData.date || visitData.dateString,
        time: visitData.time,
        note: visitData.notes || "Requested via Property Details page.",
      });
    } catch (e) {
      Alert.alert("Invalid Date/Time", e?.message || "Please choose a future date and time.");
      return;
    }
    const existingId = scheduledVisit && scheduledVisit.id;
    const request =
      typeof existingId === "number"
        ? updateBuyerVisit(existingId, { scheduledAtISO: payload.scheduled_at })
        : createBuyerVisit({
            listingId: backendId,
            scheduledAtISO: payload.scheduled_at,
            note: payload.note,
          });
    request.then(
      (row) => {
        setIsScheduleVisitOpen(false);
        const ui = toUiVisit(row);
        setScheduledVisit(ui);
        const confirmed = row.status === "CONFIRMED";
        const proposed = row.status === "PROPOSED";
        Alert.alert(
          confirmed
            ? "Site Visit Confirmed"
            : proposed
              ? "Visit Proposal Sent"
              : "Site Visit Requested",
          confirmed
            ? `Your site visit for "${property.title}" is confirmed for ${ui.date} at ${ui.time}. You can manage it under Saved > Visits.`
            : proposed
              ? `The owner proposed ${ui.date} at ${ui.time} for "${property.title}". Review and confirm it under Saved > Visits.`
              : `Your visit request for "${property.title}" is recorded for ${ui.date} at ${ui.time}. The owner can confirm it or propose another time under Saved > Visits.`,
          [{ text: "OK" }]
        );
      },
      (e) => {
        if (e && e.status === 404) {
          setIsScheduleVisitOpen(false);
          setScheduledVisit(null);
          Alert.alert(
            "No Longer Available",
            "This property is no longer available for visits.",
            [{ text: "OK" }]
          );
          return;
        }
        if (e && (e.status === 401 || e.kind === "login")) {
          handleLoginRequired(
            "Your session has expired. Log in again to schedule this visit.",
            () => handleConfirmVisit(visitData)
          );
          return;
        }
        if (e && (e.status === 403 || e.kind === "denied")) {
          // The request already tried to put the account in Buyer mode
          // (src/api/buyerMode.js) and the server still refused it, so no
          // visit was booked.
          setIsScheduleVisitOpen(false);
          Alert.alert(
            "Visit Not Scheduled",
            "Your account could not be switched to Buyer mode, so the visit was not scheduled. Please switch to Buyer mode and try again.",
            [{ text: "OK" }]
          );
          return;
        }
        Alert.alert(
          "Couldn't schedule visit",
          "Please check your connection and try again."
        );
      }
    );
  };

  const handleLoginRequired = (contextMessage, resume) => {
    Alert.alert("Log In Required", contextMessage, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log In",
        onPress: () => {
          if (onLoginRequired) onLoginRequired(resume);
        },
      },
    ]);
  };

  // Secure call flow: guests see the owner name but never the number. A tap
  // sends guests to login (resuming here afterwards); after login the number
  // is fetched through the authorized reveal endpoint and handed to the
  // device dialler. The dialler opens only on user tap with a server-issued
  // number — never automatically, never from mock data.
  const handleCallOwner = () => {
    const backendId = property && property.backendId;
    if (typeof backendId !== "number" || !getAuthTokenSync()) {
      handleLoginRequired(
        "Log in to call the owner of this property. The number is only shared after a successful login.",
        () => handleCallOwner()
      );
      return;
    }
    revealContactPhone(backendId).then(
      (phone) => {
        if (!phone) {
          Alert.alert(
            "Contact Number Unavailable",
            "The owner's contact number is not available for this property."
          );
          return;
        }
        Linking.openURL(`tel:${phone}`).catch(() => {
          Alert.alert("Call Unavailable", "Could not place this call.");
        });
      },
      (e) => {
        if (e && e.status === 404) {
          Alert.alert(
            "Contact Number Unavailable",
            "The owner's contact number is not available for this property."
          );
          return;
        }
        if (e && (e.status === 401 || e.kind === "login")) {
          handleLoginRequired(
            "Your session has expired. Log in again to call the owner.",
            () => handleCallOwner()
          );
          return;
        }
        if (e && (e.status === 403 || e.kind === "denied")) {
          Alert.alert(
            "Buyer Mode Required",
            "Your account is currently in Owner/Agent mode. Switch back to Buyer mode to call the owner.",
            [{ text: "OK" }]
          );
          return;
        }
        Alert.alert(
          "Couldn't fetch number",
          "Please check your connection and try again."
        );
      }
    );
  };

  const handleOpenEnquiryModal = () => {
    if (enquirySent) {
      Alert.alert(
        "Enquiry Already Sent ✓",
        `You have already submitted an enquiry for "${property.title}". The seller will contact you shortly.\n\nWould you like to send another message?`,
        [
          { text: "No", style: "cancel" },
          { text: "Send Message", onPress: () => setIsEnquiryModalOpen(true) },
        ]
      );
      return;
    }
    setIsEnquiryModalOpen(true);
  };

  const handleSubmitEnquiry = () => {
    if (enquirySending) return;
    const msgToSend = enquiryMessage.trim() || `I am interested in ${property.title}.`;
    const backendId = property && property.backendId;

    if (typeof backendId !== "number") {
      Alert.alert(
        "Enquiries Not Supported Yet",
        "This listing has no live backend record, so an enquiry cannot be sent.",
        [{ text: "OK" }]
      );
      return;
    }
    if (!getAuthTokenSync()) {
      handleLoginRequired(
        "Log in to send an enquiry for this property. It is only sent after a successful submission.",
        () => handleSubmitEnquiry()
      );
      return;
    }

    setEnquirySending(true);
    createEnquiry(backendId, msgToSend)
      .then(() => {
        setEnquirySent(true);
        setIsEnquiryModalOpen(false);
        Alert.alert(
          "Enquiry Sent Successfully! 🚀",
          `Your enquiry for "${property.title}" (${property.price}) has been sent to the property seller. They will contact you shortly.`,
          [{ text: "Done" }]
        );
      })
      .catch((e) => {
        if (e && e.status === 404) {
          Alert.alert("No Longer Available", "This property is no longer active.");
          return;
        }
        if (e && (e.status === 401 || e.kind === "login")) {
          // Expired/invalid session despite a cached token: re-login, then
          // resume this exact enquiry (same login-continuation contract as
          // the logged-out path).
          handleLoginRequired(
            "Your session has expired. Log in again to send the enquiry for this property.",
            () => handleSubmitEnquiry()
          );
          return;
        }
        if (e && (e.status === 403 || e.kind === "denied")) {
          // Authenticated but the server still refused the buyer action. The
          // request already asked the backend to switch the account into
          // Buyer mode (src/api/buyerMode.js) and it did not take effect, so
          // the enquiry was NOT sent. Report that honestly.
          Alert.alert(
            "Enquiry Not Sent",
            "Your account could not be switched to Buyer mode, so the enquiry was not sent. Please switch to Buyer mode and try again.",
            [{ text: "OK" }]
          );
          return;
        }
        Alert.alert(
          "Couldn't send enquiry",
          "Please check your connection and try again.",
          [{ text: "OK" }]
        );
      })
      .finally(() => {
        setEnquirySending(false);
      });
  };

  const quickQuestions = [
    "Is the price negotiable?",
    "Are home loans approved?",
    "Can I schedule a visit today?",
    "What is the maintenance fee?",
  ];

  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 44
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={[styles.modalRootContainer, { paddingTop: topSafePadding }]}>
        {/* ================= SCROLLABLE CONTENT ================= */}
        <ScrollView
          ref={mainScrollViewRef}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          onScroll={handleMainScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + Math.max(insets.bottom, 0) },
          ]}
        >
          {/* CHILD 0: HERO GALLERY & MAIN INFO */}
          <View style={{ backgroundColor: "#FFFFFF" }}>
            {/* HERO CONTAINER WITH FLOATING CIRCLE BUTTONS & THUMBNAIL CARD STRIP */}
            <View style={styles.heroContainer}>
              <TouchableOpacity
                activeOpacity={0.96}
                onPress={() => setIsGalleryOpen(true)}
                style={styles.heroImageTouchable}
              >
                <SafeImage
                  source={{ uri: displayImages[activeImageIndex] || property.image }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>

              {/* Floating Top Header Bar */}
              <View
                style={[
                  styles.floatingHeaderBar,
                  { top: 14 },
                ]}
              >
                {/* Top-Left Back Button */}
                <TouchableOpacity
                  style={styles.floatingCircleBtn}
                  onPress={onClose}
                  activeOpacity={0.85}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
                </TouchableOpacity>

                {/* Top-Right Action Buttons: Share & Favorite */}
                <View style={styles.floatingRightActions}>
                  <TouchableOpacity
                    style={styles.floatingCircleBtn}
                    onPress={async () => {
                      try {
                        await Share.share({
                          message: `Check out ${property.title} in ${property.location} on RESTAMP for ${property.price}!`,
                        });
                      } catch (e) {}
                    }}
                    activeOpacity={0.85}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Share2 size={19} color="#0F172A" strokeWidth={2.2} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.floatingCircleBtn}
                    onPress={() => onToggleWishlist && onToggleWishlist(property)}
                    activeOpacity={0.85}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Heart
                      size={20}
                      color={saved ? "#DC2626" : "#0F172A"}
                      fill={saved ? "#DC2626" : "transparent"}
                      strokeWidth={2.2}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Live-detail loading overlay */}
              {detailLoading && (
                <View style={styles.heroLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}

              {/* Floating bottom thumbnails (only when real photos exist) */}
              {displayImages.length > 1 ? (
              <View style={styles.floatingThumbCard}>
                {displayImages.slice(0, 5).map((imgUri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.85}
                    onPress={() => setActiveImageIndex(idx)}
                    style={[
                      styles.thumbCardSlot,
                      activeImageIndex === idx && styles.thumbCardSlotActive,
                    ]}
                  >
                    <SafeImage
                      source={{ uri: imgUri }}
                      style={styles.thumbCardImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}

                {/* Final slot opens the full real gallery */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setIsGalleryOpen(true)}
                  style={styles.thumbCardSlot}
                >
                  <SafeImage
                    source={{ uri: displayImages[5] || displayImages[0] }}
                    style={styles.thumbCardImg}
                    resizeMode="cover"
                  />
                  {morePhotosCount > 0 ? (
                    <View style={styles.thumbOverlay}>
                      <Text style={styles.thumbOverlayText}>+{morePhotosCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
              ) : null}
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
                <View style={styles.detailValueRow}>
                  <Home size={18} color="#0F172A" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  <Text style={styles.detailValueText} numberOfLines={1}>
                    {property.type || "Apartment"}
                  </Text>
                </View>
                <Text style={styles.detailLabelText} numberOfLines={1}>
                  Property Type
                </Text>
              </View>

              <View style={styles.detailGridCell}>
                <View style={styles.detailValueRow}>
                  <Tag size={18} color="#0F172A" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  <Text style={styles.detailValueText} numberOfLines={1}>
                    {property.badge || "Verified"}
                  </Text>
                </View>
                <Text style={styles.detailLabelText} numberOfLines={1}>
                  Listing Status
                </Text>
              </View>

              <View style={styles.detailGridCell}>
                <View style={styles.detailValueRow}>
                  <Maximize2 size={18} color="#0F172A" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  <Text style={styles.detailValueText} numberOfLines={1}>
                    {property.sqft ? `${property.sqft} sqft` : "1,500 sqft"}
                  </Text>
                </View>
                <Text style={styles.detailLabelText} numberOfLines={1}>
                  Super Built-up
                </Text>
              </View>

              <View style={styles.detailGridCell}>
                <View style={styles.detailValueRow}>
                  <Armchair size={18} color="#0F172A" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  <Text style={styles.detailValueText} numberOfLines={1}>
                    {furnishingData.title}
                  </Text>
                </View>
                <Text style={styles.detailLabelText} numberOfLines={1}>
                  Furnishing
                </Text>
              </View>

              <View style={styles.detailGridCell}>
                <View style={styles.detailValueRow}>
                  <Compass size={18} color="#0F172A" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  <Text style={styles.detailValueText} numberOfLines={1}>
                    {property.facing || "East / North"}
                  </Text>
                </View>
                <Text style={styles.detailLabelText} numberOfLines={1}>
                  Facing Direction
                </Text>
              </View>

              <View style={styles.detailGridCell}>
                <View style={styles.detailValueRow}>
                  <Layers size={18} color="#0F172A" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  <Text style={styles.detailValueText} numberOfLines={1}>
                    {property.floor || "3rd of 5"}
                  </Text>
                </View>
                <Text style={styles.detailLabelText} numberOfLines={1}>
                  Floor Level
                </Text>
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
            <View style={styles.amenitiesGrid}>
              <View style={styles.amenityGridItem}>
                <Droplet size={18} color="#475569" strokeWidth={1.8} style={{ marginRight: 8 }} />
                <Text style={styles.amenityItemText} numberOfLines={1}>
                  Swimming Pool
                </Text>
              </View>
              <View style={styles.amenityGridItem}>
                <Activity size={18} color="#475569" strokeWidth={1.8} style={{ marginRight: 8 }} />
                <Text style={styles.amenityItemText} numberOfLines={1}>
                  Gymnasium
                </Text>
              </View>
              <View style={styles.amenityGridItem}>
                <Shield size={18} color="#475569" strokeWidth={1.8} style={{ marginRight: 8 }} />
                <Text style={styles.amenityItemText} numberOfLines={1}>
                  24/7 Security
                </Text>
              </View>
              <View style={styles.amenityGridItem}>
                <Zap size={18} color="#475569" strokeWidth={1.8} style={{ marginRight: 8 }} />
                <Text style={styles.amenityItemText} numberOfLines={1}>
                  Power Backup
                </Text>
              </View>
              <View style={styles.amenityGridItem}>
                <Layers size={18} color="#475569" strokeWidth={1.8} style={{ marginRight: 8 }} />
                <Text style={styles.amenityItemText} numberOfLines={1}>
                  Elevator
                </Text>
              </View>
              <View style={styles.amenityGridItem}>
                <Car size={18} color="#475569" strokeWidth={1.8} style={{ marginRight: 8 }} />
                <Text style={styles.amenityItemText} numberOfLines={1}>
                  Car Parking
                </Text>
              </View>
            </View>
          </View>

          {/* 8. FURNISHING STATUS */}
          <View style={styles.sectionContainer}>
            <Text style={styles.subSectionTitle}>Furnishing</Text>
            <View style={styles.furnishingCard}>
              <View style={styles.furnishingHeader}>
                <View style={styles.furnishingIconWrapper}>
                  <Armchair size={22} color={COLORS.primary} strokeWidth={2} />
                </View>
                <View style={styles.furnishingHeaderContent}>
                  <View style={styles.furnishingTitleRow}>
                    <Text style={styles.furnishingTitle}>{furnishingData.title}</Text>
                    <View style={styles.furnishingTag}>
                      <CheckCircle2 size={12} color="#16A34A" style={{ marginRight: 5 }} />
                      <Text style={styles.furnishingTagText}>{furnishingData.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.furnishingSubText}>
                    {furnishingData.subtitle}
                  </Text>
                </View>
              </View>

              <View style={styles.furnishingDivider} />

              <View style={styles.furnishingInclusionsSection}>
                <Text style={styles.furnishingInclusionsHeading}>
                  INCLUDED FIXTURES & APPLIANCES
                </Text>
                <View style={styles.furnishingChipsGrid}>
                  {furnishingData.inclusions.map((item, idx) => (
                    <View key={idx} style={styles.furnishingChip}>
                      <Check size={14} color="#16A34A" strokeWidth={2.2} style={{ marginRight: 8 }} />
                      <Text style={styles.furnishingChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>


          {/* 9. LISTED BY / PROPERTY OWNER (honest: no invented identity;
              the genuine contact number is only available through the
              authorized reveal on Search) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.subSectionTitle}>Listed By</Text>
            <View style={styles.ownerCard}>
              {property.agent?.avatar ? (
                <Image
                  source={{ uri: property.agent.avatar }}
                  style={styles.ownerAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.ownerAvatar,
                    { alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
                  ]}
                >
                  <Users size={20} color="#64748B" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.ownerName}>
                  {property.ownerName || property.agent?.name || "Property Owner"}
                </Text>
                {property.agent?.agency ? (
                  <Text style={styles.ownerRole}>
                    {property.agent.agency}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.ownerCallBtn}
                onPress={() => handleCallOwner()}
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
                        <CheckCircle2 size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.verifiedGreenBadgeText}>
                          Verified
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
                          color={isSimSaved ? "#DC2626" : "#FFFFFF"}
                          fill={isSimSaved ? "#DC2626" : "rgba(0,0,0,0.3)"}
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
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              height: 72 + Math.max(insets.bottom, 0),
            },
          ]}
        >
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
                  scheduledVisit && styles.siteVisitBtnActive,
                ]}
                activeOpacity={0.85}
                onPress={handleRequestSiteVisit}
              >
                {scheduledVisit ? (
                  <CheckCircle2
                    size={17}
                    color="#16A34A"
                    style={{ marginRight: 6 }}
                  />
                ) : (
                  <Calendar
                    size={18}
                    color={COLORS.primary}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={[
                    styles.siteVisitBtnText,
                    scheduledVisit && styles.siteVisitBtnTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {scheduledVisit ? `Visit: ${scheduledVisit.date}` : "Request Site Visit"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendEnquiryBtn,
                  enquirySent && styles.sendEnquiryBtnActive,
                  enquirySending && { opacity: 0.6 },
                ]}
                activeOpacity={0.85}
                onPress={handleOpenEnquiryModal}
                disabled={enquirySending}
              >
                {enquirySent ? (
                  <CheckCircle2
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                ) : (
                  <MessageSquare
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text style={styles.sendEnquiryBtnText}>
                  {enquirySending
                    ? "Sending…"
                    : enquirySent
                      ? "Enquiry Sent ✓"
                      : "Send Enquiry"}
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

        {/* Full Property Gallery Modal with Category Tabs (Living Room, Bedroom, etc.) */}
        <PropertyGalleryModal
          visible={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          photos={property.photos || displayImages}
          property={property}
        />

        {/* ================= SCHEDULE SITE VISIT MODAL ================= */}
        <ScheduleVisitModal
          visible={isScheduleVisitOpen}
          onClose={() => setIsScheduleVisitOpen(false)}
          property={property}
          title="Schedule Site Visit"
          onConfirm={handleConfirmVisit}
        />

        {/* ================= SEND ENQUIRY MODAL ================= */}
        <Modal
          visible={isEnquiryModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsEnquiryModalOpen(false)}
        >
          <View style={styles.enquiryModalOverlay}>
            <TouchableOpacity
              style={styles.backdropPressable}
              activeOpacity={1}
              onPress={() => setIsEnquiryModalOpen(false)}
            />

            <View style={styles.enquiryModalContainer}>
              <View style={styles.dragPill} />
              <View style={styles.enquiryModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.enquiryModalTitle}>Send Enquiry</Text>
                  <Text style={styles.enquiryModalSubtitle}>
                    Contact the seller directly with your queries
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setIsEnquiryModalOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.enquiryModalScroll}
              >
                {/* Property Preview Card */}
                <View style={styles.enquiryPropertyCard}>
                  <SafeImage
                    source={{ uri: property?.image }}
                    style={styles.enquiryPropertyThumb}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.enquiryPropTitle} numberOfLines={1}>
                      {property?.title}
                    </Text>
                    <Text style={styles.enquiryPropPrice}>
                      {property?.price}
                      {property?.pricePeriod || ""}
                    </Text>
                    <View style={styles.enquiryPropLocRow}>
                      <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.enquiryPropLoc} numberOfLines={1}>
                        {property?.location || "Chennai"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Topic Chips */}
                <Text style={styles.enquirySectionLabel}>Select Inquiry Topic</Text>
                <View style={styles.enquiryChipsRow}>
                  {[
                    "Interested in buying",
                    "Is price negotiable?",
                    "Share floor plan & brochure",
                    "Request a callback",
                  ].map((topic) => {
                    const isSelected = enquiryTopic === topic;
                    return (
                      <TouchableOpacity
                        key={topic}
                        style={[
                          styles.enquiryTopicChip,
                          isSelected && styles.enquiryTopicChipActive,
                        ]}
                        onPress={() => {
                          setEnquiryTopic(topic);
                          setEnquiryMessage(
                            topic === "Interested in buying"
                              ? `Hello, I am interested in ${property?.title || "this property"}. Please share further details.`
                              : topic === "Is price negotiable?"
                              ? `Hi, I am interested in ${property?.title || "this property"}. Is the listed price negotiable?`
                              : topic === "Share floor plan & brochure"
                              ? `Could you please share the brochure, layout plan, and approved documents for ${property?.title || "this property"}?`
                              : `Hello, I'd like to discuss ${property?.title || "this property"}. Please call me back at your earliest convenience.`
                          );
                        }}
                      >
                        <Text
                          style={[
                            styles.enquiryTopicChipText,
                            isSelected && styles.enquiryTopicChipTextActive,
                          ]}
                        >
                          {topic}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Message Input */}
                <Text style={styles.enquirySectionLabel}>Your Message</Text>
                <TextInput
                  style={styles.enquiryMessageInput}
                  multiline
                  numberOfLines={4}
                  value={enquiryMessage}
                  onChangeText={setEnquiryMessage}
                  placeholder="Type your question or requirement..."
                  placeholderTextColor="#94A3B8"
                />

                {/* Seller assurance badge */}
                <View style={styles.enquiryAssuranceBox}>
                  <Shield size={16} color="#16A34A" style={{ marginRight: 8 }} />
                  <Text style={styles.enquiryAssuranceText}>
                    Your enquiry goes directly to the verified seller. No spam guarantee.
                  </Text>
                </View>
              </ScrollView>

              {/* Submit CTA */}
              <View style={styles.enquiryModalFooter}>
                <TouchableOpacity
                  style={[
                    styles.enquirySubmitBtn,
                    enquirySending && { opacity: 0.7 },
                  ]}
                  onPress={handleSubmitEnquiry}
                  disabled={enquirySending}
                >
                  <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.enquirySubmitBtnText}>
                    {enquirySending ? "Submitting Enquiry..." : "Send Enquiry Now"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRootContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  heroContainer: {
    width: "100%",
    height: 350,
    position: "relative",
    backgroundColor: "#0F172A",
  },
  heroImageTouchable: {
    width: "100%",
    height: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  floatingHeaderBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  floatingRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  floatingCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  heroLoadingOverlay: {
    position: "absolute",
    top: 70,
    left: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },
  floatingThumbCard: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 14,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  thumbCardSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    marginHorizontal: 3,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  thumbCardSlotActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  thumbCardImg: {
    width: "100%",
    height: "100%",
  },
  thumbOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbOverlayText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 100,
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
    backgroundColor: "#EFF6FF",
  },
  modalCategoryPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563EB",
  },

  /* 2. MAIN INFO (Plain White Background, No Card Border) */
  mainInfoCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    backgroundColor: "#EFF6FF",
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
    marginTop: 0,
    zIndex: 100,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
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
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
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
    height: 0,
    backgroundColor: "transparent",
  },

  /* SECTIONS (PLAIN WHITE BACKGROUND, NO CARD, NO BORDER STROKE) */
  sectionContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 23,
    fontWeight: "400",
  },

  /* DETAILS GRID (2-COLUMN ICON + VALUE / LABEL LAYOUT) */
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
    marginTop: 6,
  },
  detailGridCell: {
    width: "50%",
    paddingRight: 10,
  },
  detailValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailValueText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },
  detailLabelText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "400",
  },

  /* AMENITIES (2-COLUMN ICON + LABEL GRID) */
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
    marginTop: 8,
  },
  amenityGridItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  amenityItemText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
    flexShrink: 1,
  },
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
  furnishingCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
  },
  furnishingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  furnishingIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  furnishingHeaderContent: {
    flex: 1,
  },
  furnishingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  furnishingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: 0.1,
  },
  furnishingTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  furnishingTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#16A34A",
    letterSpacing: 0.2,
  },
  furnishingSubText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
    lineHeight: 18,
  },
  furnishingDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  furnishingInclusionsSection: {
    marginTop: 2,
  },
  furnishingInclusionsHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  furnishingChipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  furnishingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  furnishingChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1E293B",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedGreenBadgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.2,
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
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  siteVisitBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  siteVisitBtnTextActive: {
    color: "#16A34A",
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
    backgroundColor: "#16A34A",
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
    backgroundColor: "#EFF6FF",
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

  /* ENQUIRY MODAL STYLES */
  enquiryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  enquiryModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    paddingTop: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 8,
  },
  enquiryModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  enquiryModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  enquiryModalSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  enquiryModalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  enquiryPropertyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginBottom: 16,
  },
  enquiryPropertyThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  enquiryPropTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  enquiryPropPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
  },
  enquiryPropLocRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  enquiryPropLoc: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  enquirySectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  enquiryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  enquiryTopicChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  enquiryTopicChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: COLORS.primary,
  },
  enquiryTopicChipText: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "500",
  },
  enquiryTopicChipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  enquiryMessageInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 88,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  enquiryAssuranceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  enquiryAssuranceText: {
    fontSize: 12,
    color: "#166534",
    flex: 1,
    lineHeight: 16,
  },
  enquiryModalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  enquirySubmitBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  enquirySubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export default memo(PropertyDetailModal);
