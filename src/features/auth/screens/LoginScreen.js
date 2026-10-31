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
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
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
  googleSignIn,
} from "../api/auth.js";
import GoogleSignInButton from "../components/GoogleSignInButton.js";
import {
  sanitizePhoneInput,
  isPhoneValidForCountry,
  phoneValidationMessage,
  maxPhoneDigits,
} from "../phone.js";
import { planLoginResume } from "../requireAuth.js";
import RestampLogo from "../../../shared/components/RestampLogo.js";

// Internal-testing OTP code chip (only appears when the backend's test display
// mode returns a code). Hidden per design; set true to show it again.
const SHOW_OTP_CODE_CHIP = true;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_MAX_WIDTH = 480;
const ACTUAL_WIDTH = Math.min(SCREEN_WIDTH, CARD_MAX_WIDTH);
// 6 OTP boxes spaced cleanly
const OTP_BOX_WIDTH = Math.min(46, Math.max(38, Math.floor((ACTUAL_WIDTH - 84) / 6)));
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

function GoogleIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleIcon({ size = 20, color = "#FFFFFF" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </Svg>
  );
}

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset =
    Platform.OS === "ios" ? (insets.bottom > 0 ? insets.bottom + 16 : 20) : 0;
  const {
    loginWithToken,
    saveProfileName,
    consumePendingAction,
    clearPendingAction,
  } = useAuth();

  // Multi-step flow:
  // 0 = Welcome / Landing (Design 3)
  // 1 = Phone Number input with Keypad (Design 2)
  // 2 = OTP Verification with Keypad (Design 1)
  // 3 = Profile Name completion
  const [step, setStep] = useState(0);

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

  // Timer for resend OTP
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [busy, setBusy] = useState(false);

  // Backend-selected code for the restricted internal-testing display mode.
  // Non-null ONLY when the backend actually returned debug_code (production
  // responses never contain it). The app never fabricates a code locally.
  const [devCode, setDevCode] = useState(null);

  // Restricted demo login (visible demo-mode panel on the OTP screen,
  // rendered ONLY when the OTP request itself failed — e.g. the production
  // fail-closed 503 while SMS delivery is not connected). The demo code is
  // the LAST SIX DIGITS of the phone entered on the same screen, typed by
  // the authorized presenter at runtime ONLY: never hardcoded, never read
  // from EXPO_PUBLIC_* or any bundle/env value, and never persisted
  // anywhere — it lives solely in React state (digits as a string, so
  // leading zeros are preserved) and is cleared the moment the request
  // completes. Responses reuse the existing token contract; no fake
  // success is ever simulated.
  // Input refs
  const phoneInputRef = useRef(null);
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
    if (step === 1) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 120);
    } else if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 120);
    }
  }, [step]);

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
      // The backend includes the code in the response ONLY in the explicitly
      // restricted internal-testing display mode (non-production, flag-set);
      // in every shipped configuration — ALWAYS in production — the response
      // carries no code and nothing is displayed or auto-filled. What is
      // shown is always the backend-SELECTED code taken from the response.
      const serverCode =
        resp && resp.debug_code ? String(resp.debug_code) : null;
      setDevCode(serverCode);
      setOtp(["", "", "", "", "", ""]);
      setStep(2);
      setTimer(30);
      setCanResend(false);
      setFocusedOtpIndex(0);
    } catch (e) {
      // OTP request failed — normally the production fail-closed 503
      // while SMS delivery is not connected, or offline/throttles/outages.
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
      if (userObj && userObj.isProfileComplete) {
        enterAfterLogin();
      } else {
        if (userObj?.firstName) setFirstName(userObj.firstName);
        if (userObj?.lastName) setLastName(userObj.lastName);
        setStep(3);
      }
    } catch (e) {
      if (e && (e.status === 401 || e.kind === "login")) {
        showAlert(
          "Invalid Code",
          "That code is incorrect or expired. Please try again."
        );
      } else {
        showAlert("Verification Failed", otpErrorMessage(e));
      }
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
  // only when the backend returned a code in an internal-testing run).
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
      // is the code the backend just selected; a code-less response clears
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

  const handleNameSubmit = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst) {
      Alert.alert("Name Required", "Please enter your first name.");
      return;
    }
    setBusy(true);
    try {
      await saveProfileName(trimmedFirst, trimmedLast);
      enterAfterLogin();
    } catch (e) {
      Alert.alert(
        "Could Not Save Profile",
        "Failed to save your profile name. Please try again."
      );
    } finally {
      setBusy(false);
    }
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

  const handleGoogleCredential = async (idToken) => {
    if (busy) return;
    setBusy(true);
    try {
      const tokenResp = await googleSignIn(idToken);
      const userObj = await loginWithToken(tokenResp.access_token);
      if (userObj && userObj.isProfileComplete) {
        enterAfterLogin();
      } else {
        if (userObj?.firstName) setFirstName(userObj.firstName);
        if (userObj?.lastName) setLastName(userObj.lastName);
        setStep(3);
      }
    } catch (e) {
      if (e && (e.status === 404 || e.detail === "GOOGLE_UNKNOWN")) {
        Alert.alert(
          "Google Account Not Linked",
          "Your Google account is not linked to a RESTAMP account yet. Please sign in with your phone first."
        );
      } else {
        Alert.alert(
          "Google Sign-In Failed",
          "Could not sign you in with Google. Please try again or use phone login."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const isOtpComplete = otp.every((d) => d !== "");
  const isNameValid = firstName.trim().length > 0;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: step === 0 ? "#111317" : "#FFFFFF" },
      ]}
      edges={step === 0 ? [] : ["top", "bottom"]}
    >
      <StatusBar
        barStyle={step === 0 ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />

      <View
        style={[
          styles.wrapper,
          { backgroundColor: step === 0 ? "#111317" : "#FFFFFF" },
        ]}
      >
        {/* ======================================================== */}
        {/* STEP 0: WELCOME / LANDING SCREEN (PERPLEXITY FULLSCREEN) */}
        {/* ======================================================== */}
        {step === 0 && (
          <View style={styles.perplexityContainer}>
            {/* Top Architectural Hero with Fade Gradient (Fullscreen Absolute Background) */}
            <View style={styles.perplexityHeroWrapper} pointerEvents="none">
              <ImageBackground
                source={require("../../../../assets/login-screen-img.jpg")}
                style={styles.perplexityHeroImage}
                resizeMode="cover"
              >
                {/* SVG Gradient smoothly fading the image down into dark background #111317 */}
                <Svg
                  height="100%"
                  width="100%"
                  style={StyleSheet.absoluteFillObject}
                >
                  <Defs>
                    <LinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#111317" stopOpacity="0" />
                      <Stop offset="0.45" stopColor="#111317" stopOpacity="0.08" />
                      <Stop offset="0.75" stopColor="#111317" stopOpacity="0.75" />
                      <Stop offset="1" stopColor="#111317" stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="url(#heroFade)"
                  />
                </Svg>
              </ImageBackground>
            </View>

            {/* Minimalist Top Right 'Skip' Link (Pinned to absolute top-right below status bar) */}
            <View
              style={[
                styles.perplexityTopRow,
                { top: insets.top > 0 ? insets.top + 8 : (Platform.OS === "ios" ? 16 : 20) },
              ]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.perplexitySkipBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityLabel="Skip to browse"
              >
                <Text style={styles.perplexitySkipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Content Area: Logo + Wordmark + Pill Buttons + Links */}
            <View
              style={[
                styles.perplexityContent,
                { paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 28 : 22) },
              ]}
            >
              {/* Centered Brand Mark + Wordmark */}
              <View style={styles.perplexityBrandContainer}>
                <RestampLogo size={46} color="#FFFFFF" />
                <Text style={styles.perplexityBrandText}>restamp</Text>
              </View>

              {/* Action Buttons Stack (Perplexity style) */}
              <View style={styles.perplexityButtonsStack}>
                {/* Button 1: Continue with Mobile (Brand Blue Pill) */}
                <TouchableOpacity
                  style={styles.perplexityPrimaryBtn}
                  onPress={() => setStep(1)}
                  activeOpacity={0.88}
                >
                  <Smartphone size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.perplexityPrimaryBtnText}>
                    Continue with mobile
                  </Text>
                </TouchableOpacity>

                {/* Button 2: Continue with Apple (White Pill with Centered Icon + Text) */}
                <TouchableOpacity
                  style={styles.perplexityWhiteBtn}
                  onPress={() => {
                    Alert.alert(
                      "Apple Sign-In",
                      "Apple Sign-In is coming soon. Please continue with your mobile number."
                    );
                  }}
                  activeOpacity={0.88}
                >
                  <AppleIcon size={19} color="#000000" />
                  <Text style={styles.perplexityWhiteBtnText}>
                    Continue with Apple
                  </Text>
                </TouchableOpacity>

                {/* Button 3: Continue with Google (White Pill with Centered Icon + Text) */}
                <TouchableOpacity
                  style={styles.perplexityWhiteBtn}
                  onPress={() => {
                    if (Platform.OS === "web") {
                      Alert.alert(
                        "Google Sign-In",
                        "Please use Mobile Number or click below if Google button appears."
                      );
                    } else {
                      Alert.alert(
                        "Google Sign-In",
                        "Google Sign-In is enabled for web. Please sign in with your mobile number."
                      );
                    }
                  }}
                  activeOpacity={0.88}
                >
                  <GoogleIcon size={20} />
                  <Text style={styles.perplexityWhiteBtnText}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Web-only GIS invisible/native embed if configured */}
                {Platform.OS === "web" ? (
                  <View style={styles.gisWrapper}>
                    <GoogleSignInButton
                      onCredential={handleGoogleCredential}
                      onError={() =>
                        Alert.alert(
                          "Google Sign-In Failed",
                          "Could not sign in with Google. Please use mobile number."
                        )
                      }
                    />
                  </View>
                ) : null}

              </View>

              {/* Footer: Privacy policy • Terms of service & Sign Up */}
              <View style={styles.perplexityFooter}>
                <View style={styles.perplexityPolicyRow}>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.perplexityPolicyLink}>
                      Privacy policy
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.perplexityPolicySpacer}>   </Text>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.perplexityPolicyLink}>
                      Terms of service
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.perplexitySignUpRow}>
                  <Text style={styles.perplexitySignUpMuted}>
                    Don’t have an account?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.perplexitySignUpLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 1: PHONE NUMBER INPUT SCREEN (CLEAN BRAND STYLE)    */}
        {/* ======================================================== */}
        {step === 1 && (
          <KeyboardAvoidingView
            style={styles.flowContainer}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            {/* Top Navigation Bar: Back arrow and Skip Here */}
            <View style={styles.flowTopBar}>
              <TouchableOpacity
                onPress={() => setStep(0)}
                style={styles.backButton}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={24} color="#0F172A" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipHereBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.skipHereText}>Skip Here</Text>
              </TouchableOpacity>
            </View>

            {/* Content Area */}
            {/* Scrolls so the action button and links stay reachable above the keyboard */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.flowBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.flowHeading}>Welcome back!</Text>
              <Text style={styles.flowSubheading}>
                Enter your registered phone number to log in
              </Text>

              {/* Phone Input Card (clean rounded card without Mobile number label) */}
              <Pressable
                style={[
                  styles.phoneInputCard,
                  isPhoneFocused && styles.phoneInputCardFocused,
                ]}
                onPress={() => phoneInputRef.current?.focus()}
              >
                <View style={styles.phoneInputRow}>
                  {/* Flag + Country Code trigger */}
                  <TouchableOpacity
                    style={styles.countryBadge}
                    onPress={() => setShowCountryModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryFlagText}>
                      {selectedCountry.flag}
                    </Text>
                    <Text style={styles.countryCodeBadgeText}>
                      {selectedCountry.code}
                    </Text>
                  </TouchableOpacity>

                  {/* Real interactive TextInput */}
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.phoneTextInput}
                    placeholder="00 000 000 00"
                    placeholderTextColor="#94A3B8"
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                    keyboardType="phone-pad"
                    autoFocus
                    maxLength={maxPhoneDigits(selectedCountry.code)}
                    underlineColorAndroid="transparent"
                  />
                  <Smartphone size={22} color="#9CA3AF" strokeWidth={1.4} />
                </View>
              </Pressable>

              {/* Inline Validation Error */}
              {showPhoneError ? (
                <Text style={styles.phoneErrorText}>
                  {phoneValidationMessage(phoneNumber, selectedCountry.code)}
                </Text>
              ) : null}
            </ScrollView>

            {/* Pinned Bottom Action Footer (Above Keyboard) */}
            <View style={styles.flowBottomContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (!isPhoneValid || busy) &&
                    styles.primaryActionButtonDisabled,
                ]}
                onPress={handlePhoneSubmit}
                disabled={!isPhoneValid || busy}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionButtonText}>
                  {busy ? "Sending Code..." : "Sign in"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.helpLinkContainer}
                onPress={() =>
                  Alert.alert(
                    "Need Help?",
                    "Please enter your 10-digit mobile number. For support, contact support@restamp.in"
                  )
                }
                activeOpacity={0.7}
              >
                <Text style={styles.helpLinkText}>Help?</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ======================================================== */}
        {/* STEP 2: OTP VERIFICATION SCREEN (DESIGN 1)               */}
        {/* ======================================================== */}
        {step === 2 && (
          <KeyboardAvoidingView
            style={styles.flowContainer}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            {/* Top Navigation Bar: Back Arrow */}
            <View style={styles.flowTopBar}>
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.backButton}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={26} color="#0F172A" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            {/* Content Area */}
            {/* Scrolls so the action button and links stay reachable above the keyboard */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.flowBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.flowHeading}>OTP Sent!</Text>
              <Text style={styles.flowSubheading}>
                Enter the 6-digit code sent to you at{" "}
                <Text style={styles.flowSubheadingBold}>
                  {selectedCountry.code} {phoneNumber}.
                </Text>{" "}
                <Text
                  style={styles.didYouEnterNumberLink}
                  onPress={() => setStep(1)}
                >
                  Did you enter the correct number?
                </Text>
              </Text>

              {/* Modern Tactile OTP Card Boxes */}
              <View style={styles.otpDigitsRow}>
                {otp.map((digit, idx) => {
                  const isFocused = focusedOtpIndex === idx;
                  const isFilled = Boolean(digit);
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.otpBox,
                        isFilled && styles.otpBoxFilled,
                        isFocused && styles.otpBoxFocused,
                      ]}
                      onPress={() => otpInputRefs.current[idx]?.focus()}
                    >
                      <TextInput
                        ref={(ref) => (otpInputRefs.current[idx] = ref)}
                        style={styles.otpBoxInput}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, idx)}
                        onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                        onFocus={() => setFocusedOtpIndex(idx)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        caretHidden
                        selectionColor={COLORS.primary}
                        underlineColorAndroid="transparent"
                        autoFocus={idx === 0}
                      />
                      {isFocused && !digit ? (
                        <View style={styles.otpCursorIndicator} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Internal-Testing Code Auto-fill Chip — rendered ONLY when the
                  backend actually returned a code (restricted internal-testing
                  display mode; never in production responses) */}
              {SHOW_OTP_CODE_CHIP && devCode ? (
                <TouchableOpacity
                  style={styles.devCodeNotice}
                  onPress={() => handleAutoFill(devCode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.devCodeNoticeText}>
                    Code:{" "}
                    <Text style={styles.devCodeBold}>{devCode}</Text>
                    <Text style={styles.devCodeHint}> • Tap to auto-fill</Text>
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            {/* Pinned Bottom Action Footer (Above Keyboard) */}
            <View style={styles.flowBottomContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  !isOtpComplete && !canResend && styles.primaryActionButtonDisabled,
                ]}
                onPress={() => {
                  if (isOtpComplete) {
                    handleOtpSubmit();
                  } else if (canResend) {
                    handleResendOtp();
                  }
                }}
                disabled={!isOtpComplete && !canResend}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionButtonText}>
                  {busy
                    ? "Verifying..."
                    : isOtpComplete
                    ? "Verify OTP"
                    : canResend
                    ? "Resend OTP"
                    : `Resend OTP in ${timer}s`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iDontReceiveCodeContainer}
                onPress={() => {
                  if (canResend) {
                    handleResendOtp();
                  } else {
                    Alert.alert(
                      "Code Not Received?",
                      `Please wait ${timer}s to request a new code. Ensure your network has SMS coverage or contact support@restamp.in.`
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.iDontReceiveCodeText}>
                  I don’t receive code
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ======================================================== */}
        {/* STEP 3: USER NAME SETUP (FOR NEW PROFILES)               */}
        {/* ======================================================== */}
        {step === 3 && (
          <KeyboardAvoidingView
            style={styles.flowContainer}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={keyboardVerticalOffset}
          >
            {/* Top Navigation Bar: Back Arrow */}
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
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.nameScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.flowHeading}>What’s your name?</Text>
              <Text style={styles.flowSubheading}>
                Enter your details to complete your RESTAMP profile
              </Text>

              {/* First Name Card */}
              <Pressable
                style={[
                  styles.nameInputCard,
                  firstNameFocused && styles.nameInputCardFocused,
                ]}
                onPress={() => firstNameInputRef.current?.focus()}
              >
                <Text style={styles.nameInputLabel}>First Name</Text>
                <TextInput
                  ref={firstNameInputRef}
                  style={styles.nameTextInput}
                  placeholder="Enter first name"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFirstNameFocused(true)}
                  onBlur={() => setFirstNameFocused(false)}
                  autoCapitalize="words"
                  autoFocus
                />
              </Pressable>

              {/* Last Name Card */}
              <Pressable
                style={[
                  styles.nameInputCard,
                  lastNameFocused && styles.nameInputCardFocused,
                ]}
                onPress={() => lastNameInputRef.current?.focus()}
              >
                <Text style={styles.nameInputLabel}>Last Name</Text>
                <TextInput
                  ref={lastNameInputRef}
                  style={styles.nameTextInput}
                  placeholder="Enter last name"
                  placeholderTextColor="#94A3B8"
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setLastNameFocused(true)}
                  onBlur={() => setLastNameFocused(false)}
                  autoCapitalize="words"
                />
              </Pressable>

              {/* Privacy Guarantee Note */}
              <View style={styles.privacyRow}>
                <View style={styles.privacyIconBadge}>
                  <Lock size={13} color="#475569" />
                </View>
                <Text style={styles.privacyText}>
                  We'll only show this information to people you connect with on
                  RESTAMP.
                </Text>
              </View>
            </ScrollView>

            {/* Pinned Bottom Action Footer (Above Keyboard) */}
            <View style={styles.flowBottomContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (!isNameValid || busy) &&
                    styles.primaryActionButtonDisabled,
                ]}
                onPress={handleNameSubmit}
                disabled={!isNameValid || busy}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionButtonText}>
                  {busy ? "Saving..." : "Complete & Continue"}
                </Text>
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
    backgroundColor: "#111317",
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
    color: "#FFFFFF",
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
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
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        cursor: "pointer",
      },
    }),
  },
  perplexityWhiteBtnText: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  gisWrapper: {
    display: "none",
  },
  perplexityPrimaryBtn: {
    height: 52,
    borderRadius: 26,
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
    color: "#FFFFFF",
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
    paddingVertical: 7,
    marginBottom: 20,
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
    borderRadius: 26,
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
