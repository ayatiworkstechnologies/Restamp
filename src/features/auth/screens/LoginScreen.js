import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Pressable,
  TextInput,
  Platform,
  Modal,
  FlatList,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Keyboard,
} from "react-native";
import { ScrollView, KeyboardAvoidingView } from "../../../shared/components/KeyboardSafe.js";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  ChevronLeft,
  RotateCcw,
  Lock,
  Check,
  X,
  Smartphone,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import TYPOGRAPHY from "../../../shared/constants/typography.js";
import { useAuth } from "../context/AuthContext.js";
import {
  requestOtp,
  verifyOtp,
} from "../api/auth.js";
import {
  sanitizePhoneInput,
  isPhoneValidForCountry,
  phoneValidationMessage,
  maxPhoneDigits,
} from "../phone.js";
import { planLoginResume } from "../requireAuth.js";
import { fetchAgentPlan } from "../../../shared/api/agentPlans.js";
import { AGENT_MODULE_ENABLED } from "../../../shared/constants/features.js";
import { AGENT_UPGRADE_ROUTE, AGENT_UPGRADE_PARAMS } from "../../agent/utils/agentUpgrade.js";
import RestampLoginLogo from "../../../shared/components/RestampLoginLogo.js";

// Development OTP code chip: appears only when the backend returned a code
// (the backend's fixed testing OTP "349086", returned in local/staging;
// production never returns one). Set false to hide it even then.
const SHOW_OTP_CODE_CHIP = true;
// When the backend returns its test code (local/staging only — production
// never does), verify it automatically and skip the "Enter the code" screen.
// Production always shows the code screen. Set false to always show it.
const AUTO_VERIFY_TEST_CODE = false;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_MAX_WIDTH = 480;
const ACTUAL_WIDTH = Math.min(SCREEN_WIDTH, CARD_MAX_WIDTH);
// 6 OTP boxes spaced cleanly
const OTP_BOX_WIDTH = Math.min(46, Math.max(38, Math.floor((ACTUAL_WIDTH - 84) / 6)));
// Login OTP boxes: six across the 24px-gutter column with 10px gaps.
const OTP_BOX_SIZE = Math.min(56, Math.floor((ACTUAL_WIDTH - 48 - 50) / 6));
// Welcome slides (shown before the mobile number step when the app opens
// on Login). Copy describes the three real RESTAMP journeys.
const GET_STARTED_IMAGE = require("../../../../assets/get-started-building.jpg");
const WELCOME_SLIDES = [
  {
    key: "buyer",
    image: require("../../../../assets/login-hero-house.jpg"),
    title: "Welcome to RESTAMP",
    body: "Find plots, villas and apartments to buy, rent or lease.",
  },
  {
    key: "owner",
    image: require("../../../../assets/welcome-list-property.jpg"),
    title: "List your property",
    body: "Post your property and connect with interested buyers.",
  },
  {
    key: "agent",
    image: require("../../../../assets/welcome-agent.jpg"),
    title: "Work as an agent",
    body: "Access properties in your chosen areas and manage your leads.",
  },
];

const OTP_BOX_HEIGHT = Math.round(OTP_BOX_WIDTH * 1.18);

// react-native-web's Alert.alert is a no-op, so OTP-flow errors would be
// invisible in the browser; fall back to window.alert there.
function showAlert(title, message) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

const COUNTRY_CODES = [
  { flag: "🇮🇳", code: "+91", name: "India" },
  { flag: "🇺🇸", code: "+1", name: "United States" },
  { flag: "🇬🇧", code: "+44", name: "United Kingdom" },
  { flag: "🇦🇪", code: "+971", name: "United Arab Emirates" },
  { flag: "🇸🇬", code: "+65", name: "Singapore" },
  { flag: "🇨🇦", code: "+1", name: "Canada" },
  { flag: "🇦🇺", code: "+61", name: "Australia" },
];

// SVG Icons for Welcome screen buttons
function MobileIcon({ size = 20, color = "#FFFFFF" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="6"
        y="2"
        width="12"
        height="20"
        rx="3"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M10 18h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  // Lift the pinned footer (Sign in / Help? / Resend OTP) clear of the
  // keyboard. Android edge-to-edge needs the nav-bar inset added too,
  // otherwise the keyboard covers the bottom text in release APKs.
  const keyboardVerticalOffset =
    insets.bottom > 0 ? insets.bottom + 16 : 20;
  const {
    loginWithToken,
    saveProfileName,
    saveProfileEmail,
    consumePendingAction,
    clearPendingAction,
  } = useAuth();

  // Multi-step flow:
  // 0 = Welcome / Landing (Design 3)
  // 1 = Phone Number input with Keypad (Design 2)
  // 2 = OTP Verification with Keypad (Design 1)
  // 3 = Profile Name completion
  // -1 = Welcome slides. Shown only when Login is the app's entry screen;
  // opened from inside the app (Login pill, protected action) it starts on
  // the mobile number step.
  const [step, setStep] = useState(() =>
    navigation?.canGoBack && navigation.canGoBack() ? 0 : -1
  );
  const [slide, setSlide] = useState(0);
  const slidesRef = useRef(null);
  const [slideWidth, setSlideWidth] = useState(ACTUAL_WIDTH);

  // Form states
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  // Single "Full name" field (split into first / last for the profile API).
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  // Intended journey for a new account — only decides the next screen; it
  // never removes or replaces another role on the account.
  const [intendedRole, setIntendedRole] = useState("buyer");

  // Timer for resend OTP
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [busy, setBusy] = useState(false);

  // Backend code from the backend's fixed testing OTP.
  // Non-null ONLY when the backend actually returned debug_code (production
  // responses never contain it). The app never fabricates a code locally.
  const [devCode, setDevCode] = useState(null);

  // Input refs
  const phoneInputRef = useRef(null);
  const phoneScrollRef = useRef(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  // Keep "Get OTP" visible above the keyboard on the mobile number step:
  // tighten the top spacing and scroll the form to the bottom when it opens.
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = () => {
      setKeyboardUp(true);
      setTimeout(() => phoneScrollRef.current?.scrollToEnd?.({ animated: true }), 120);
    };
    const onHide = () => setKeyboardUp(false);
    const a = Keyboard.addListener(showEvt, onShow);
    const b = Keyboard.addListener(hideEvt, onHide);
    return () => { a.remove(); b.remove(); };
  }, []);
  const otpInputRefs = useRef([]);
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);

  const fullPhone = () =>
    `${selectedCountry.code}${phoneNumber.replace(/[^0-9]/g, "")}`;

  const [phoneTouched, setPhoneTouched] = useState(false);
  const handlePhoneChange = (text) => {
    if (phoneTouched) setPhoneTouched(false);
    setPhoneNumber(sanitizePhoneInput(text, selectedCountry.code));
  };
  const isPhoneValid = isPhoneValidForCountry(phoneNumber, selectedCountry.code);
  const showPhoneError = phoneTouched && !isPhoneValid;

  const loginSucceededRef = useRef(false);
  useEffect(() => {
    return () => {
      if (!loginSucceededRef.current) {
        try {
          clearPendingAction();
        } catch {
          // ignore
        }
      }
    };
  }, [clearPendingAction]);

  // Auto-focus inputs on step transition
  useEffect(() => {
    if (step === 0) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 120);
    } else if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 120);
    }
  }, [step]);

  // Server role of the account that just signed in. OWNER means the account
  // was last used in owner mode (e.g. after the owner plan flow), so it lands
  // on the Owner dashboard instead of buyer Home.
  const loginRoleRef = useRef(null);
  // True when the account has an active, server-saved agent plan: it then
  // lands on the Agent dashboard (checked after every successful login).
  const hasAgentPlanRef = useRef(false);
  const loadAgentPlanFlag = async () => {
    hasAgentPlanRef.current = false;
    if (!AGENT_MODULE_ENABLED) return;
    const plan = await fetchAgentPlan();
    hasAgentPlanRef.current = !!plan;
  };

  const enterAfterLogin = () => {
    loginSucceededRef.current = true;
    let continuation = null;
    try {
      continuation = consumePendingAction();
    } catch {
      continuation = null;
    }
    const plan = planLoginResume({
      continuation,
      canGoBack: !!(navigation?.canGoBack && navigation.canGoBack()),
      loginSucceeded: true,
    });
    if (plan.mode === "resume-back") {
      navigation.goBack();
      plan.action();
      return;
    }
    if (plan.mode === "resume-reset") {
      if (navigation?.reset) {
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      } else {
        navigation?.navigate("MainTabs");
      }
      plan.action();
      return;
    }
    if (hasAgentPlanRef.current) {
      // Buyer tabs stay underneath so leaving agent mode still works.
      if (navigation?.reset) {
        navigation.reset({
          index: 1,
          routes: [{ name: "MainTabs" }, { name: "AgentNavigator", params: { screen: "Dashboard" } }],
        });
      } else {
        navigation?.navigate("AgentNavigator", { screen: "Dashboard" });
      }
      return;
    }
    if (loginRoleRef.current === "OWNER") {
      // Buyer tabs stay underneath so leaving owner mode still works.
      if (navigation?.reset) {
        navigation.reset({
          index: 1,
          routes: [{ name: "MainTabs" }, { name: "OwnerNavigator", params: { screen: "Dashboard" } }],
        });
      } else {
        navigation?.navigate("OwnerNavigator", { screen: "Dashboard" });
      }
      return;
    }
    if (navigation?.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } else {
      navigation?.navigate("MainTabs");
    }
  };

  const otpErrorMessage = (e) => {
    if (!e) return "Something went wrong. Please try again.";
    if (e.kind === "validation")
      return "Enter a valid phone number with country code.";
    if (e.status === 429 || e.kind === "retry_later")
      return "Too many attempts. Please wait a while and try again.";
    if (e.kind === "timeout")
      return "The request timed out. Please check your connection and try again.";
    if (e.kind === "offline")
      return "No connection. Check your internet and try again.";
    // Disabled SMS / provider outage: the request DID reach the server, so
    // do not say "could not reach" — make the real state actionable.
    if (e.status === 503)
      return "The code service is temporarily unavailable. Please try again in a moment.";
    if (e.status && e.status >= 500)
      return `The server had a problem (HTTP ${e.status}). Please try again.`;
    return "Could not reach the server. Please try again.";
  };

  // OTP Timer countdown
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Handle phone submit -> calls API and moves to OTP step
  const handlePhoneSubmit = async () => {
    if (busy) return;
    if (!isPhoneValid) {
      setPhoneTouched(true);
      return;
    }
    setBusy(true);
    try {
      const resp = await requestOtp(fullPhone());
      // The backend includes the code in the response ONLY in local/staging
      // (its fixed testing OTP "349086"); in production the request fails
      // closed with a 503 and the response never carries a code. What is
      // shown is always the code the backend itself returned.
      const serverCode =
        resp && resp.debug_code ? String(resp.debug_code) : null;
      setDevCode(serverCode);
      setOtp(["", "", "", "", "", ""]);
      if (serverCode && AUTO_VERIFY_TEST_CODE) {
        // Local/staging only: verify the backend's own test code right away
        // so Get OTP goes straight to the details step. This is a real
        // verify call (no bypass); if it fails, fall back to the code screen.
        setBusy(false);
        const ok = await verifyCode(serverCode);
        if (ok) return;
      }
      setStep(2);
      setTimer(30);
      setCanResend(false);
      setFocusedOtpIndex(0);
    } catch (e) {
      // OTP request failed — normally the production fail-closed 503
      // (no OTP is issued there), or offline/throttles/outages.
      // Stay on the phone step: the OTP screen claims a code was sent.
      setDevCode(null);
      showAlert("Sign-in Failed", otpErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Direct OTP verify call
  const verifyCode = async (codeToVerify) => {
    const code = codeToVerify || otp.join("");
    if (code.length < 6 || busy) {
      if (code.length < 6) {
        showAlert(
          "Incomplete Code",
          "Please enter the 6-digit code we sent you."
        );
      }
      return;
    }
    setBusy(true);
    try {
      const tokenResp = await verifyOtp(fullPhone(), code);
      const userObj = await loginWithToken(tokenResp.access_token, {
        phone: fullPhone(),
        countryCode: selectedCountry.code,
      });
      loginRoleRef.current = userObj?.role ?? null;
      await loadAgentPlanFlag();
      if (userObj && userObj.isProfileComplete) {
        enterAfterLogin();
      } else {
        setFullName([userObj?.firstName, userObj?.lastName].filter(Boolean).join(" "));
        if (userObj?.email) setEmail(userObj.email);
        setStep(3);
      }
      return true;
    } catch (e) {
      if (e && (e.status === 401 || e.kind === "login")) {
        showAlert(
          "Invalid Code",
          "That code is incorrect or expired. Please try again."
        );
      } else {
        showAlert("Verification Failed", otpErrorMessage(e));
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleOtpSubmit = () => {
    verifyCode(otp.join(""));
  };

  const handleOtpChange = (text, index) => {
    const cleanDigits = text.replace(/[^0-9]/g, "");
    if (cleanDigits.length > 1) {
      // Pasted multi-digit OTP
      const pasted = cleanDigits.slice(0, 6).split("");
      const newOtp = [...otp];
      pasted.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(5, pasted.length - 1);
      otpInputRefs.current[nextIdx]?.focus();
      setFocusedOtpIndex(nextIdx);
      if (pasted.length === 6) {
        setTimeout(() => verifyCode(pasted.join("")), 150);
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanDigits.slice(-1);
    setOtp(newOtp);

    // Auto advance focus
    if (cleanDigits && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      setFocusedOtpIndex(index + 1);
    }

    // Auto verify if all 6 filled
    const fullCode = newOtp.join("");
    if (fullCode.length === 6 && cleanDigits) {
      setTimeout(() => verifyCode(fullCode), 150);
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!otp[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
        setFocusedOtpIndex(index - 1);
      }
    }
  };

  // Tap-to-fill the code the backend actually issued (the chip is rendered
  // only when the backend returned a code: local/staging testing OTP).
  const handleAutoFill = (codeToFill) => {
    const targetCode = codeToFill || devCode;
    if (!targetCode) return;
    const digits = String(targetCode)
      .replace(/[^0-9]/g, "")
      .slice(0, 6)
      .split("");
    const newOtp = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    const nextIdx = Math.min(5, digits.length - 1);
    setFocusedOtpIndex(nextIdx);
    otpInputRefs.current[nextIdx]?.focus();
    if (digits.length === 6) {
      setTimeout(() => verifyCode(digits.join("")), 150);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || busy) return;
    setBusy(true);
    try {
      const resp = await requestOtp(fullPhone());
      setTimer(30);
      setCanResend(false);
      // Same backend-driven rule as the initial request: whatever is shown
      // is the code the backend just returned; a code-less response clears
      // the chip (production never returns a code).
      const newCode =
        resp && resp.debug_code ? String(resp.debug_code) : null;
      setDevCode(newCode);
      setOtp(["", "", "", "", "", ""]);
      setFocusedOtpIndex(0);
      otpInputRefs.current[0]?.focus();
      showAlert("Code Sent", "A new verification code has been sent.");
    } catch (e) {
      setDevCode(null);
      showAlert("Resend Failed", otpErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // After the name: Buyer enters the app; Owner / Agent open their existing
  // plan screens with Buyer Home underneath (no access is granted here).
  const enterIntendedRole = () => {
    if (intendedRole === "dealer") {
      // Dealer: open the Menu's Dealer Plan tab (no access is granted here).
      loginSucceededRef.current = true;
      try {
        clearPendingAction();
      } catch {
        // ignore
      }
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "Menu", params: { initialTab: "dealer" } } }],
      });
      return;
    }
    if (intendedRole === "owner" || (intendedRole === "agent" && AGENT_MODULE_ENABLED)) {
      loginSucceededRef.current = true;
      try {
        clearPendingAction();
      } catch {
        // ignore
      }
      const planRoute =
        intendedRole === "owner"
          ? { name: "OwnerPlans" }
          : { name: AGENT_UPGRADE_ROUTE, params: AGENT_UPGRADE_PARAMS };
      navigation.reset({ index: 1, routes: [{ name: "MainTabs" }, planRoute] });
      return;
    }
    enterAfterLogin();
  };

  const handleNameSubmit = async () => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      Alert.alert("Name Required", "Please enter your name.");
      return;
    }
    const trimmedFirst = parts[0];
    const trimmedLast = parts.slice(1).join(" ");
    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setEmailTouched(true);
      return;
    }
    setBusy(true);
    try {
      await saveProfileName(trimmedFirst, trimmedLast);
      if (trimmedEmail) {
        try {
          await saveProfileEmail(trimmedEmail);
        } catch (e) {
          // Name is saved; email is optional — tell the user, don't block.
          Alert.alert(
            "Email Not Saved",
            e && e.status === 409
              ? "That email is already used by another account. You can add a different one later in Profile."
              : "We couldn't save your email. You can add it later in Profile."
          );
        }
      }
      enterIntendedRole();
    } catch (e) {
      Alert.alert(
        "Could Not Save Profile",
        "Failed to save your profile name. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // Skip the name for now (the session is already valid); it is asked
  // again on the next login until a name is saved.
  const handleNameSkip = () => {
    enterIntendedRole();
  };

  const handleSkip = () => {
    try {
      clearPendingAction();
    } catch {
      // ignore
    }
    if (navigation?.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } else {
      navigation?.navigate("MainTabs");
    }
  };

  const isOtpComplete = otp.every((d) => d !== "");
  const isNameValid = fullName.trim().length > 0;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: "#FFFFFF" },
      ]}
      edges={step === -1 || (step === 0 && !keyboardUp) ? ["bottom"] : ["top", "bottom"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <View
        style={[
          styles.wrapper,
          { backgroundColor: "#FFFFFF" },
        ]}
      >
        {/* ======================================================== */}
        {/* STEP -1: WELCOME SLIDES                                  */}
        {/* ======================================================== */}
        {step === -1 && (
          <View
            style={styles.wcContainer}
            onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width || ACTUAL_WIDTH)}
          >
            <ScrollView
              ref={slidesRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) =>
                setSlide(Math.round(e.nativeEvent.contentOffset.x / slideWidth))
              }
              onScroll={
                Platform.OS === "web"
                  ? (e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / slideWidth))
                  : undefined
              }
              style={{ flex: 1 }}
            >
              {WELCOME_SLIDES.map((sl) => (
                <View key={sl.key} style={{ width: slideWidth, flex: 1 }}>
                  <View style={styles.wcImageWrap}>
                    <Image source={sl.image} style={styles.wcImage} resizeMode="cover" />
                    {/* Bottom fade: photo dissolves into the white page */}
                    <Svg style={styles.wcFade} preserveAspectRatio="none" pointerEvents="none">
                      <Defs>
                        <LinearGradient id={`wcFade-${sl.key}`} x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
                        </LinearGradient>
                      </Defs>
                      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#wcFade-${sl.key})`} />
                    </Svg>
                  </View>
                  <View style={styles.wcTextBlock}>
                    <Text style={styles.wcTitle}>{sl.title}</Text>
                    <Text style={styles.wcBody}>{sl.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.wcDots} accessibilityLabel={`Slide ${slide + 1} of ${WELCOME_SLIDES.length}`}>
              {WELCOME_SLIDES.map((sl, i) => (
                <TouchableOpacity
                  key={sl.key}
                  onPress={() => {
                    slidesRef.current?.scrollTo({ x: i * slideWidth, animated: true });
                    setSlide(i);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <View style={[styles.wcDot, i === slide && styles.wcDotOn]} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.wcFooter}>
              <TouchableOpacity
                style={[styles.lgPrimaryBtn, styles.wcCta]}
                onPress={() => setStep(0)}
                activeOpacity={0.88}
              >
                <Text style={styles.lgPrimaryBtnText}>Get started</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 0: MOBILE NUMBER                                    */}
        {/* ======================================================== */}
        {step === 0 && (
          <KeyboardAvoidingView
            style={styles.flowContainer}
            behavior="padding"
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            <ScrollView
              ref={phoneScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {/* Hero photo fading into the page (hidden behind the keyboard) */}
              <View style={[styles.gsHero, keyboardUp && styles.gsHeroCompact]}>
                <Image source={GET_STARTED_IMAGE} style={styles.wcImage} resizeMode="cover" />
                <Svg style={styles.wcFade} preserveAspectRatio="none" pointerEvents="none">
                  <Defs>
                    <LinearGradient id="gsFade" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                      <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill="url(#gsFade)" />
                </Svg>
              </View>

              <View style={styles.gsBody}>
              <Text style={styles.gsTitle}>Get started</Text>

              <Text style={styles.lgLabel}>Mobile number</Text>
              <Pressable
                style={[
                  styles.lgPhoneField,
                  (isPhoneFocused || phoneNumber.length > 0) && styles.lgFieldFocused,
                  showPhoneError && styles.lgFieldError,
                ]}
                onPress={() => phoneInputRef.current?.focus()}
              >
                <TouchableOpacity
                  style={styles.lgCountry}
                  onPress={() => setShowCountryModal(true)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Country code ${selectedCountry.code}`}
                >
                  <Text style={styles.lgCountryText}>{selectedCountry.code}</Text>
                </TouchableOpacity>
                <View style={styles.lgDivider} />
                <TextInput
                  ref={phoneInputRef}
                  style={styles.lgPhoneInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#94A3B8"
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  onSubmitEditing={handlePhoneSubmit}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  maxLength={maxPhoneDigits(selectedCountry.code)}
                  underlineColorAndroid="transparent"
                />
              </Pressable>
              {showPhoneError ? (
                <Text style={styles.lgErrorText}>
                  {phoneValidationMessage(phoneNumber, selectedCountry.code)}
                </Text>
              ) : (
                <Text style={styles.lgHelper}>We'll send a one-time code by SMS.</Text>
              )}

              <TouchableOpacity
                style={[styles.lgPrimaryBtn, styles.wcCta, { marginTop: 28 }, busy && styles.lgPrimaryBtnDisabled]}
                onPress={handlePhoneSubmit}
                disabled={busy}
                activeOpacity={0.88}
              >
                <Text style={styles.lgPrimaryBtnText}>
                  {busy ? "Sending OTP..." : "Get OTP"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSkip}
                activeOpacity={0.7}
                style={styles.lgGuestBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.lgGuestText}>Skip and browse as guest</Text>
              </TouchableOpacity>
              <Text style={styles.lgTerms}>
                By continuing you agree to the{" "}
                <Text style={styles.lgTermsLink}>Terms</Text> and{" "}
                <Text style={styles.lgTermsLink}>Privacy Policy</Text>.
              </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ======================================================== */}
        {/* STEP 2: ENTER THE CODE                                   */}
        {/* ======================================================== */}
        {step === 2 && (
          <KeyboardAvoidingView
            style={styles.flowContainer}
            behavior="padding"
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            <View style={styles.flowTopBar}>
              <TouchableOpacity
                onPress={() => setStep(0)}
                style={styles.backButton}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={26} color="#0F172A" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.lgFlowBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.lgTitle}>Enter the code</Text>
              <Text style={styles.lgSub}>
                Enter the 6-digit code sent to you at{" "}
                <Text style={styles.lgSubBold}>
                  {selectedCountry.code} {phoneNumber}
                </Text>
                .{" "}
                <Text style={styles.lgInlineLink} onPress={() => setStep(0)}>
                  Did you enter the correct number?
                </Text>
              </Text>

              <Text style={[styles.lgLabel, { marginTop: 28 }]}>One-time code</Text>
              <View style={[styles.otpDigitsRow, { marginTop: 0, paddingHorizontal: 0 }]}>
                {otp.map((digit, idx) => {
                  const isFocused = focusedOtpIndex === idx;
                  return (
                    <Pressable
                      key={idx}
                      style={[styles.lgOtpBox, isFocused && styles.lgOtpBoxFocused]}
                      onPress={() => otpInputRefs.current[idx]?.focus()}
                    >
                      <TextInput
                        ref={(ref) => (otpInputRefs.current[idx] = ref)}
                        style={styles.lgOtpInput}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, idx)}
                        onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                        onFocus={() => setFocusedOtpIndex(idx)}
                        keyboardType="number-pad"
                        textContentType={idx === 0 ? "oneTimeCode" : "none"}
                        autoComplete={idx === 0 ? "sms-otp" : "off"}
                        maxLength={idx === 0 ? 6 : 1}
                        selectTextOnFocus
                        caretHidden
                        selectionColor={COLORS.primary}
                        underlineColorAndroid="transparent"
                        autoFocus={idx === 0}
                        accessibilityLabel={`Digit ${idx + 1}`}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {/* Development code chip — only when the backend returned a
                  code (local/staging testing OTP; never in production). */}
              {SHOW_OTP_CODE_CHIP && devCode ? (
                <TouchableOpacity
                  style={styles.devCodeNotice}
                  onPress={() => handleAutoFill(devCode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.devCodeNoticeText}>
                    Code: <Text style={styles.devCodeBold}>{devCode}</Text>
                    <Text style={styles.devCodeHint}> • Tap to auto-fill</Text>
                  </Text>
                </TouchableOpacity>
              ) : null}
              <View style={styles.lgResendRow}>
                <Text style={styles.lgResendMuted}>Didn't get it?</Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} disabled={busy} activeOpacity={0.7}>
                    <Text style={styles.lgResendLink}>Resend code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.lgResendWait}>
                    Resend in 0:{String(timer).padStart(2, "0")}
                  </Text>
                )}
              </View>

            </ScrollView>

            <View style={styles.lgFooter}>
              <TouchableOpacity
                style={[
                  styles.lgPrimaryBtn,
                  (!isOtpComplete || busy) && styles.lgPrimaryBtnDisabled,
                ]}
                onPress={handleOtpSubmit}
                disabled={!isOtpComplete || busy}
                activeOpacity={0.88}
              >
                <Text style={styles.lgPrimaryBtnText}>
                  {busy ? "Verifying..." : "Verify and continue"}
                </Text>
              </TouchableOpacity>
              {!keyboardUp && (
                <Text style={styles.lgFootNote}>
                  Returning users skip the name step and go straight in.
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ======================================================== */}
        {/* STEP 3: NAME + WHAT BRINGS YOU (NEW PROFILES ONLY)       */}
        {/* ======================================================== */}
        {step === 3 && (
          <KeyboardAvoidingView
            style={styles.flowContainer}
            behavior="padding"
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            <View style={styles.flowTopBar}>
              <TouchableOpacity
                onPress={() => setStep(2)}
                style={styles.backButton}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={26} color="#0F172A" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={handleNameSkip}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.lgSkipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.lgFlowBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.lgTitle}>What's your Details</Text>
              <Text style={styles.lgSub}>
                This is how owners, buyers and agents will see you.
              </Text>

              <Text style={[styles.lgLabel, { marginTop: 28 }]}>Full name</Text>
              <TextInput
                ref={firstNameInputRef}
                style={[styles.lgTextField, firstNameFocused && styles.lgFieldFocused]}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFirstNameFocused(true)}
                onBlur={() => setFirstNameFocused(false)}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
                returnKeyType="next"
                autoFocus
              />

              <Text style={[styles.lgLabel, { marginTop: 22 }]}>
                Email <Text style={styles.lgOptional}>(optional)</Text>
              </Text>
              <TextInput
                style={[
                  styles.lgTextField,
                  emailFocused && styles.lgFieldFocused,
                  emailTouched && email.trim() && !EMAIL_RE.test(email.trim()) && styles.lgFieldError,
                ]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailTouched) setEmailTouched(false);
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => {
                  setEmailFocused(false);
                  if (email.trim()) setEmailTouched(true);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="done"
                accessibilityLabel="Email, optional"
              />
              {emailTouched && email.trim() && !EMAIL_RE.test(email.trim()) ? (
                <Text style={styles.lgErrorText}>Enter a valid email address.</Text>
              ) : null}

              <Text style={[styles.lgLabel, { marginTop: 26 }]}>What brings you to RESTAMP?</Text>
              {[
                { key: "buyer", title: "Buyer", sub: "Find a property · free" },
                { key: "owner", title: "Owner", sub: "List my property · needs Owner Plan" },
                ...(AGENT_MODULE_ENABLED
                  ? [{ key: "agent", title: "Agent", sub: "Broker properties · needs Agent Plan, 1 area free" }]
                  : []),
                { key: "dealer", title: "Dealer", sub: "Post and manage properties · needs Dealer Plan" },
              ].map((r) => {
                const on = intendedRole === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.lgRoleCard, on && styles.lgRoleCardOn]}
                    onPress={() => setIntendedRole(r.key)}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={[styles.lgRadio, on && styles.lgRadioOn]}>
                      {on ? <View style={styles.lgRadioDot} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lgRoleTitle}>{r.title}</Text>
                      <Text style={styles.lgRoleSub}>{r.sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.lgHelper}>
                You can switch roles anytime from Home or Profile.
              </Text>
            </ScrollView>

            <View style={styles.lgFooter}>
              <TouchableOpacity
                style={[styles.lgPrimaryBtn, (!isNameValid || busy) && styles.lgPrimaryBtnDisabled]}
                onPress={handleNameSubmit}
                disabled={!isNameValid || busy}
                activeOpacity={0.88}
              >
                <Text style={styles.lgPrimaryBtnText}>{busy ? "Saving..." : "Continue"}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      {/* ======================================================== */}
      {/* COUNTRY CODE MODAL SHEET                                 */}
      {/* ======================================================== */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                onPress={() => setShowCountryModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.name + item.code}
              renderItem={({ item }) => {
                const isSelected = selectedCountry.code === item.code;
                return (
                  <TouchableOpacity
                    style={[
                      styles.countryListItem,
                      isSelected && styles.countryListItemActive,
                    ]}
                    onPress={() => {
                      setSelectedCountry(item);
                      setPhoneTouched(false);
                      setPhoneNumber((prev) =>
                        sanitizePhoneInput(prev, item.code)
                      );
                      setShowCountryModal(false);
                      setTimeout(() => {
                        phoneInputRef.current?.focus();
                      }, 100);
                    }}
                  >
                    <Text style={styles.countryListFlag}>{item.flag}</Text>
                    <Text style={styles.countryListName}>{item.name}</Text>
                    <Text style={styles.countryListCode}>{item.code}</Text>
                    {isSelected ? (
                      <View style={styles.countryCheckmark}>
                        <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ================= WELCOME SLIDES ================= */
  wcContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  wcImageWrap: { height: "68%", backgroundColor: "#FFFFFF", overflow: "hidden" },
  wcImage: { width: "100%", height: "100%" },
  wcFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "22%" },
  wcTextBlock: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 40, paddingBottom: 4 },
  wcTitle: { fontSize: 28, fontWeight: "700", color: "#111827", letterSpacing: -0.6, textAlign: "center" },
  wcBody: { fontSize: 17, lineHeight: 25, color: "#6B7280", textAlign: "center", marginTop: 10 },
  wcDots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 30, paddingBottom: 76 },
  wcDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D1D5DB" },
  wcDotOn: { backgroundColor: COLORS.primary },
  wcCta: { marginTop: 0, height: 54, borderRadius: 999 },
  wcFooter: { paddingHorizontal: 16, paddingBottom: 14 },

  /* ================= LOGIN FLOW (mobile → code → name) ================= */
  lgBody: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32 },
  lgFlowBody: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },
  lgLogo: { alignItems: "flex-start", marginBottom: 88 },
  lgLogoCompact: { marginBottom: 28 },
  gsHero: { height: Math.round(SCREEN_HEIGHT * 0.5), backgroundColor: "#FFFFFF", overflow: "hidden" },
  gsHeroCompact: { height: 0 },
  gsBody: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  gsTitle: { fontSize: 30, fontWeight: "700", color: "#111827", letterSpacing: -0.6, marginBottom: 24 },
  lgHero: { fontSize: 31, lineHeight: 37, fontWeight: "700", color: "#0F172A", letterSpacing: -0.6, marginBottom: 36 },
  lgTitle: { fontSize: 31, lineHeight: 38, fontWeight: "700", color: "#0F172A", letterSpacing: -0.6 },
  lgSub: { fontSize: 15.5, lineHeight: 22, color: "#475569", marginTop: 10 },
  lgSubBold: { fontWeight: "700", color: "#0F172A" },
  lgInlineLink: { color: COLORS.primary, fontWeight: "600" },
  lgLabel: { fontSize: 14, fontWeight: "600", color: "#0F172A", marginBottom: 10 },
  lgPhoneField: {
    height: 54, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, backgroundColor: "#FFFFFF", paddingHorizontal: 16,
  },
  lgFieldFocused: { borderColor: COLORS.primary },
  lgOptional: { fontWeight: "400", color: "#94A3B8" },
  lgFieldError: { borderColor: "#DC2626" },
  lgCountry: { paddingRight: 12, height: "100%", justifyContent: "center" },
  lgCountryText: { fontSize: 16.5, fontWeight: "500", color: "#0F172A" },
  lgDivider: { width: 1, height: 30, backgroundColor: "#E2E8F0", marginRight: 14 },
  lgPhoneInput: {
    flex: 1, fontSize: 16.5, color: "#0F172A", height: "100%",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  lgTextField: {
    height: 54, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 16,
    fontSize: 16.5, color: "#0F172A", backgroundColor: "#FFFFFF",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  lgHelper: { fontSize: 13.5, color: "#475569", marginTop: 10, lineHeight: 19 },
  lgErrorText: { fontSize: 13.5, color: "#DC2626", marginTop: 10 },
  lgPrimaryBtn: {
    height: 54, borderRadius: 100, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", marginTop: 24,
  },
  lgPrimaryBtnDisabled: { opacity: 0.45 },
  lgPrimaryBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  lgGuestBtn: { alignSelf: "center", marginTop: 36 },
  lgGuestText: { color: COLORS.primary, fontSize: 16, fontWeight: "500" },
  lgTerms: { textAlign: "center", fontSize: 12.5, color: "#475569", marginTop: 6, lineHeight: 18 },
  lgTermsLink: { color: COLORS.primary, textDecorationLine: "underline" },
  lgOtpBox: {
    width: OTP_BOX_SIZE, height: Math.round(OTP_BOX_SIZE * 1.22), borderRadius: 12,
    borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  lgOtpBoxFocused: { borderColor: COLORS.primary, borderWidth: 1.5 },
  lgOtpInput: {
    width: "100%", height: "100%", textAlign: "center", fontSize: 22, fontWeight: "700", color: "#0F172A",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  lgResendRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 8 },
  lgResendMuted: { fontSize: 15, color: "#475569" },
  lgResendLink: { fontSize: 15, fontWeight: "600", color: COLORS.primary },
  lgResendWait: { fontSize: 15, fontWeight: "500", color: "#94A3B8" },
  lgFooter: { paddingHorizontal: 24, paddingBottom: 14 },
  lgFootNote: { textAlign: "center", fontSize: 13, color: "#475569", marginTop: 14 },
  lgSkipText: { fontSize: 16, fontWeight: "500", color: COLORS.primary },
  lgRoleCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 12, backgroundColor: "#FFFFFF",
  },
  lgRoleCardOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  lgRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#94A3B8", alignItems: "center", justifyContent: "center" },
  lgRadioOn: { borderColor: COLORS.primary },
  lgRadioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.primary },
  lgRoleTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  lgRoleSub: { fontSize: 13.5, color: "#475569", marginTop: 2 },

  safeArea: {
    flex: 1,
    backgroundColor: "#111317",
  },
  wrapper: {
    flex: 1,
    maxWidth: CARD_MAX_WIDTH,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#111317",
  },

  /* ================= STEP 0: WELCOME SCREEN (PERPLEXITY DESIGN) ================= */
  perplexityContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  perplexityHeroWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "web" ? 440 : Math.round(SCREEN_HEIGHT * 0.52),
  },
  perplexityHeroImage: {
    width: "100%",
    height: "100%",
  },
  perplexityTopRow: {
    position: "absolute",
    right: 22,
    zIndex: 30,
  },
  perplexitySkipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  perplexitySkipText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  perplexityContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    zIndex: 10,
  },
  perplexityBrandContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  perplexityBrandText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    marginTop: 10,
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  perplexityButtonsStack: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  perplexityWhiteBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  perplexityWhiteBtnText: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  perplexityPrimaryBtn: {
    height: 52,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
        cursor: "pointer",
      },
    }),
  },
  perplexityPrimaryBtnText: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  perplexityFooter: {
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  perplexityPolicyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  perplexityPolicyLink: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  perplexityPolicySpacer: {
    fontSize: 13,
    color: "#94A3B8",
  },
  perplexitySignUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  perplexitySignUpMuted: {
    fontSize: 13,
    color: "#64748B",
  },
  perplexitySignUpLink: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* ================= FLOW SCREENS (STEP 1 & 2) ================= */
  flowContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
  },
  flowTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    height: 52,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  skipHereBtn: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  skipHereText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#6B7280",
  },
  flowBody: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  flowBottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 16,
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  flowHeading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0A0A0A",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  flowSubheading: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 20,
  },
  flowSubheadingBold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  didYouEnterNumberLink: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  /* Step 1: Clean Phone Input Card */
  phoneInputCard: {
    height: 62,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  phoneInputCardFocused: {
    borderColor: COLORS.primary,
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.12)",
      },
    }),
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
    paddingRight: 10,
  },
  countryFlagText: {
    fontSize: 26,
    lineHeight: 30,
  },
  countryCodeBadgeText: {
    fontSize: 17,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  phoneTextInput: {
    flex: 1,
    height: 40,
    fontSize: 17,
    fontWeight: "400",
    color: "#111111",
    letterSpacing: 0.4,
    paddingVertical: 0,
    paddingHorizontal: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
      },
    }),
  },
  phoneErrorText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.danger,
    marginTop: 8,
    marginLeft: 2,
  },

  /* Step 2: Individual Modern Tactile OTP Card Boxes */
  otpDigitsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 4,
    marginTop: 20,
    marginBottom: 28,
  },
  otpBox: {
    width: OTP_BOX_WIDTH,
    height: OTP_BOX_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E5E7EB",
  },
  otpBoxFilled: {
    borderBottomColor: "#CBD5E1",
  },
  otpBoxFocused: {
    borderBottomColor: COLORS.primary,
    borderBottomWidth: 2,
  },
  otpBoxInput: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 26,
    fontWeight: "600",
    color: "#0F172A",
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
      },
    }),
  },
  otpCursorIndicator: {
    width: 2,
    height: 26,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
    position: "absolute",
  },
  iDontReceiveCodeContainer: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  iDontReceiveCodeText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  devCodeNotice: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 16,
    alignSelf: "flex-start",
  },
  devCodeNoticeText: {
    fontSize: 12.5,
    color: "#1E40AF",
  },
  devCodeBold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  devCodeHint: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },

  /* Action Buttons */
  primaryActionButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
        cursor: "pointer",
      },
    }),
  },
  primaryActionButtonDisabled: {
    backgroundColor: "#93C5FD",
    opacity: 0.7,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      web: {
        boxShadow: "none",
        cursor: "not-allowed",
      },
    }),
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  helpLinkContainer: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  helpLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },

  /* Step 3: Name Setup */
  nameScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
  },
  nameInputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
      },
    }),
  },
  nameInputCardFocused: {
    borderColor: COLORS.primary,
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.12)",
      },
    }),
  },
  nameInputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 3,
  },
  nameTextInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    paddingVertical: 2,
    height: 32,
    width: "100%",
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
      },
    }),
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 2,
  },
  privacyIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1EBE6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  privacyText: {
    fontSize: 12.5,
    color: "#6B7280",
    flex: 1,
    lineHeight: 18,
  },

  /* Country Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
    maxHeight: "70%",
    maxWidth: CARD_MAX_WIDTH,
    width: "100%",
    alignSelf: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: "0 -6px 24px rgba(0, 0, 0, 0.14)",
      },
    }),
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  countryListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  countryListItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  countryListFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryListName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  countryListCode: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginRight: 8,
  },
  countryCheckmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
