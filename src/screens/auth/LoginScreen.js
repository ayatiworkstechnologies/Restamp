import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import {
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  Lock,
  Check,
  X,
} from "../../components/common/HugeIcon";
import COLORS from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import { requestOtp, verifyOtp, googleSignIn } from "../../api/auth";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import {
  sanitizePhoneInput,
  isPhoneValidForCountry,
  phoneValidationMessage,
  maxPhoneDigits,
} from "../../auth/phone";
import { planLoginResume } from "../../auth/requireAuth";
import NumericKeypad from "../../components/common/NumericKeypad";
import RestampLogo from "../../components/RestampLogo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MAX_WIDTH = 480;
const ACTUAL_WIDTH = Math.min(SCREEN_WIDTH, CARD_MAX_WIDTH);
// 6 OTP boxes spaced cleanly
const OTP_BOX_WIDTH = Math.min(46, Math.max(38, Math.floor((ACTUAL_WIDTH - 84) / 6)));
const OTP_BOX_HEIGHT = Math.round(OTP_BOX_WIDTH * 1.18);

const COUNTRY_CODES = [
  { flag: "🇮🇳", code: "+91", name: "India" },
  { flag: "🇺🇸", code: "+1", name: "United States" },
  { flag: "🇬🇧", code: "+44", name: "United Kingdom" },
  { flag: "🇦🇪", code: "+971", name: "United Arab Emirates" },
  { flag: "🇸🇬", code: "+65", name: "Singapore" },
  { flag: "🇨🇦", code: "+1", name: "Canada" },
  { flag: "🇦🇺", code: "+61", name: "Australia" },
];

const SHOW_DEBUG_OTP = process.env.EXPO_PUBLIC_OTP_DEMO_MODE === "1";
// The backend returns debug_code ONLY in the explicitly configured demo
// environment (RESTAMP_ENV=demo + RESTAMP_OTP_DEMO_MODE=1) or in local
// OTP-debug mode. The bundle flag above mirrors the backend demo switch, so
// the app shows that backend-SELECTED code (for tap-to-auto-fill) ONLY when
// the flag is explicitly "1". In production the field never appears in the
// response AND this guard keeps a misconfigured build from displaying any
// code. There are no demo codes in this bundle; the frontend never chooses
// which code is accepted — the backend does.

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

function FacebookIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </Svg>
  );
}

export default function LoginScreen({ navigation }) {
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

  // Timer for resend OTP
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState(null);

  // Input refs
  const phoneInputRef = useRef(null);
  const otpInputRefs = useRef([]);
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);

  const fullPhone = () =>
    `${selectedCountry.code}${phoneNumber.replace(/[^0-9]/g, "")}`;

  const [phoneTouched, setPhoneTouched] = useState(false);
  const handlePhoneChange = (text) => {
    setPhoneTouched(true);
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
      // Backend-selected code: shown ONLY in the demo configuration. In
      // production there is no debug_code and the flag is off, so nothing
      // is ever displayed or auto-filled.
      const serverCode =
        SHOW_DEBUG_OTP && resp && resp.debug_code
          ? String(resp.debug_code)
          : null;
      setDevCode(serverCode);
      setOtp(["", "", "", "", "", ""]);
      setStep(2);
      setTimer(30);
      setCanResend(false);
      setFocusedOtpIndex(0);
    } catch (e) {
      // NEVER advance to the OTP step when the request fails — the user
      // would have nothing to enter or verify. Stay on step 1 and surface
      // the real API error (disabled SMS 503, throttles, network errors).
      Alert.alert("Could Not Send Code", otpErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

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

  // Direct OTP verify call
  const verifyCode = async (codeToVerify) => {
    const code = codeToVerify || otp.join("");
    if (code.length < 6 || busy) {
      if (code.length < 6) {
        Alert.alert(
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
        Alert.alert(
          "Invalid Code",
          "That code is incorrect or expired. Please try again."
        );
      } else {
        Alert.alert("Verification Failed", otpErrorMessage(e));
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

  const handleResendOtp = async () => {
    if (!canResend || busy) return;
    setBusy(true);
    try {
      const resp = await requestOtp(fullPhone());
      setTimer(30);
      setCanResend(false);
      // Same only-inside-demo rule as the initial request: the displayed
      // code is always the backend-SELECTED one, and only with the flag on.
      const newCode =
        SHOW_DEBUG_OTP && resp && resp.debug_code
          ? String(resp.debug_code)
          : null;
      setDevCode(newCode);
      setOtp(["", "", "", "", "", ""]);
      setFocusedOtpIndex(0);
      otpInputRefs.current[0]?.focus();
      Alert.alert("Code Sent", "A new verification code has been sent.");
    } catch (e) {
      Alert.alert("Could Not Resend", otpErrorMessage(e));
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

  // Central Keypad handler (also syncs with active input field)
  const handleKeypadPress = useCallback(
    (key) => {
      if (step === 1) {
        setPhoneTouched(true);
        if (key === "backspace") {
          setPhoneNumber((prev) => prev.slice(0, -1));
        } else if (/^[0-9]$/.test(key)) {
          setPhoneNumber((prev) => {
            const next = prev + key;
            return sanitizePhoneInput(next, selectedCountry.code);
          });
        }
        phoneInputRef.current?.focus();
      } else if (step === 2) {
        if (key === "backspace") {
          setOtp((prev) => {
            const newOtp = [...prev];
            let idxToClear = focusedOtpIndex;
            if (newOtp[idxToClear] === "" && idxToClear > 0) {
              idxToClear -= 1;
            }
            newOtp[idxToClear] = "";
            setFocusedOtpIndex(Math.max(0, idxToClear));
            otpInputRefs.current[Math.max(0, idxToClear)]?.focus();
            return newOtp;
          });
        } else if (/^[0-9]$/.test(key)) {
          setOtp((prev) => {
            const newOtp = [...prev];
            const currIdx = focusedOtpIndex;
            if (currIdx < 6) {
              newOtp[currIdx] = key;
              const nextIdx = Math.min(5, currIdx + 1);
              setFocusedOtpIndex(nextIdx);
              otpInputRefs.current[nextIdx]?.focus();

              const finalCode = newOtp.join("");
              if (finalCode.length === 6) {
                setTimeout(() => verifyCode(finalCode), 150);
              }
            }
            return newOtp;
          });
        }
      }
    },
    [step, selectedCountry.code, focusedOtpIndex, otp]
  );

  const isOtpComplete = otp.every((d) => d !== "");
  const isNameValid = firstName.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={step === 0 ? "light-content" : "dark-content"}
        backgroundColor={step === 0 ? "transparent" : "#FFFFFF"}
        translucent={step === 0}
      />

      <View style={styles.wrapper}>
        {/* ======================================================== */}
        {/* STEP 0: WELCOME / LANDING SCREEN (DESIGN 3)              */}
        {/* ======================================================== */}
        {step === 0 && (
          <View style={styles.step0Container}>
            {/* Top Half: Modern house architectural hero with sky overlay */}
            <ImageBackground
              source={require("../../../assets/login-hero-house.jpg")}
              style={styles.step0HeroImage}
              resizeMode="cover"
            >
              <View style={styles.step0HeroOverlay}>
                {/* Top Status & Guest Skip */}
                <View style={styles.step0TopRow}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={handleSkip}
                    style={styles.step0SkipBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.step0SkipText}>Skip</Text>
                  </TouchableOpacity>
                </View>

                {/* Centered Brand Title & Tagline in sky area */}
                <View style={styles.step0BrandingContainer}>
                  <View style={styles.step0LogoRow}>
                    <RestampLogo size={42} />
                    <Text style={styles.step0BrandTitle}>RESTAMP</Text>
                  </View>
                  <Text style={styles.step0Tagline}>
                    The best place to find millions of home, apartment, and
                    rental listings.
                  </Text>
                </View>
              </View>
            </ImageBackground>

            {/* Bottom Half: Curved White Card with Action Buttons */}
            <View style={styles.step0BottomCard}>
              {/* Button 1: Continue with Mobile Number (Application primary theme) */}
              <TouchableOpacity
                style={styles.step0MobileBtn}
                onPress={() => setStep(1)}
                activeOpacity={0.85}
              >
                <MobileIcon size={20} color="#FFFFFF" />
                <Text style={styles.step0MobileBtnText}>
                  Continue with Mobile Number
                </Text>
              </TouchableOpacity>

              {/* Button 2: Login with Google */}
              <TouchableOpacity
                style={styles.step0SocialBtn}
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
                activeOpacity={0.8}
              >
                <GoogleIcon size={20} />
                <Text style={styles.step0SocialBtnText}>Login with Google</Text>
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

              {/* Button 3: Login with Facebook */}
              <TouchableOpacity
                style={styles.step0SocialBtn}
                onPress={() => {
                  Alert.alert(
                    "Facebook Login",
                    "Facebook login is coming soon. Please continue with your mobile number."
                  );
                }}
                activeOpacity={0.8}
              >
                <FacebookIcon size={20} />
                <Text style={styles.step0SocialBtnText}>Login with Facebook</Text>
              </TouchableOpacity>

              {/* Footer: Sign up / terms */}
              <View style={styles.step0FooterRow}>
                <Text style={styles.step0FooterText}>
                  Don’t have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.step0SignUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 1: PHONE NUMBER INPUT SCREEN (DESIGN 2)             */}
        {/* ======================================================== */}
        {step === 1 && (
          <View style={styles.flowContainer}>
            {/* Top Navigation Bar: Back arrow and Skip Here */}
            <View style={styles.flowTopBar}>
              <TouchableOpacity
                onPress={() => setStep(0)}
                style={styles.backButton}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={26} color="#0F172A" />
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
            <View style={styles.flowBody}>
              <Text style={styles.flowHeading}>Welcome back!</Text>
              <Text style={styles.flowSubheading}>
                Enter your registered phone number to log in
              </Text>

              {/* Phone Input Card (Flag + Code + Dropdown + Real Interactive TextInput) */}
              <Pressable
                style={styles.phoneInputCard}
                onPress={() => phoneInputRef.current?.focus()}
              >
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
                  <ChevronDown size={14} color="#64748B" style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                {/* Subtle vertical separator */}
                <View style={styles.phoneInputDivider} />

                {/* Real interactive TextInput */}
                <TextInput
                  ref={phoneInputRef}
                  style={styles.phoneTextInput}
                  placeholder="00 000 000 00"
                  placeholderTextColor="#94A3B8"
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  autoFocus
                  maxLength={maxPhoneDigits(selectedCountry.code)}
                  underlineColorAndroid="transparent"
                />
              </Pressable>

              {/* Inline Validation Error */}
              {showPhoneError ? (
                <Text style={styles.phoneErrorText}>
                  {phoneValidationMessage(phoneNumber, selectedCountry.code)}
                </Text>
              ) : null}

              {/* Sign in Button (Application Primary Theme Color #2563EB) */}
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

              {/* Help? Link (Colored in application theme color) */}
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

            {/* Custom On-screen Numeric Keypad */}
            <NumericKeypad onKeyPress={handleKeypadPress} />
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 2: OTP VERIFICATION SCREEN (DESIGN 1)               */}
        {/* ======================================================== */}
        {step === 2 && (
          <View style={styles.flowContainer}>
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
            <View style={styles.flowBody}>
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

              {/* Floating OTP Digits with Sleek Unified Underlines */}
              <View style={styles.otpDigitsRow}>
                {otp.map((digit, idx) => {
                  const isFocused = focusedOtpIndex === idx;
                  const isFilled = Boolean(digit);
                  return (
                    <Pressable
                      key={idx}
                      style={styles.otpSlot}
                      onPress={() => otpInputRefs.current[idx]?.focus()}
                    >
                      <TextInput
                        ref={(ref) => (otpInputRefs.current[idx] = ref)}
                        style={styles.otpSlotInput}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, idx)}
                        onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                        onFocus={() => setFocusedOtpIndex(idx)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        selectionColor={COLORS.primary}
                        underlineColorAndroid="transparent"
                        autoFocus={idx === 0}
                      />
                      <View
                        style={[
                          styles.otpSlotUnderline,
                          isFilled && styles.otpSlotUnderlineFilled,
                          isFocused && styles.otpSlotUnderlineFocused,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {/* Dev / Demo Code Auto-fill Chip */}
              {devCode ? (
                <TouchableOpacity
                  style={styles.devCodeNotice}
                  onPress={() => handleAutoFill(devCode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.devCodeNoticeText}>
                    Testing code:{" "}
                    <Text style={styles.devCodeBold}>{devCode}</Text>
                    <Text style={styles.devCodeHint}> • Tap to auto-fill</Text>
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Action Button: Styled in application color theme (#2563EB) */}
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

              {/* "I don’t receive code" Link (Left-aligned under button, matching mockup) */}
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

            {/* Custom On-screen Numeric Keypad */}
            <NumericKeypad onKeyPress={handleKeypadPress} />
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 3: USER NAME SETUP (FOR NEW PROFILES)               */}
        {/* ======================================================== */}
        {step === 3 && (
          <View style={styles.flowContainer}>
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
              contentContainerStyle={styles.nameScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.flowHeading}>What’s your name?</Text>
              <Text style={styles.flowSubheading}>
                Enter your details to complete your RESTAMP profile
              </Text>

              {/* First Name Card */}
              <Pressable
                style={styles.nameInputCard}
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
                  autoCapitalize="words"
                  autoFocus
                />
              </Pressable>

              {/* Last Name Card */}
              <Pressable
                style={styles.nameInputCard}
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
                  autoCapitalize="words"
                />
              </Pressable>

              {/* Privacy Guarantee Note */}
              <View style={styles.privacyRow}>
                <Lock size={14} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.privacyText}>
                  We'll only show this information to people you connect with on
                  RESTAMP.
                </Text>
              </View>

              {/* Complete & Continue Button */}
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  { marginTop: 32 },
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
            </ScrollView>
          </View>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryListItem,
                    selectedCountry.code === item.code &&
                      styles.countryListItemActive,
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
                </TouchableOpacity>
              )}
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
    backgroundColor: "#FFFFFF",
  },
  wrapper: {
    flex: 1,
    maxWidth: CARD_MAX_WIDTH,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
  },

  /* ================= STEP 0: WELCOME SCREEN ================= */
  step0Container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  step0HeroImage: {
    flex: 1.15,
    width: "100%",
  },
  step0HeroOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 12 : 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  step0TopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  step0SkipBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backdropFilter: "blur(6px)",
  },
  step0SkipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  step0BrandingContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  step0LogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  step0BrandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.8,
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  step0Tagline: {
    fontSize: 14.5,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    lineHeight: 21,
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  step0BottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
    marginTop: -28,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
      },
    }),
  },
  step0MobileBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary, // Follow application theme color
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
      },
    }),
  },
  step0MobileBtnText: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  step0SocialBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  step0SocialBtnText: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  gisWrapper: {
    display: "none",
  },
  step0FooterRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    paddingBottom: 4,
  },
  step0FooterText: {
    fontSize: 13.5,
    color: "#64748B",
  },
  step0SignUpLink: {
    fontSize: 13.5,
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
    paddingTop: 8,
    paddingBottom: 8,
    height: 48,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
  skipHereBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  skipHereText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  flowBody: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  flowHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  flowSubheading: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 26,
  },
  flowSubheadingBold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  didYouEnterNumberLink: {
    color: "#DC2626",
    fontWeight: "600",
  },

  /* Step 1: Real Interactive Phone Card */
  phoneInputCard: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
  },
  countryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingRight: 6,
  },
  countryFlagText: {
    fontSize: 20,
  },
  countryCodeBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  phoneInputDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },
  phoneTextInput: {
    flex: 1,
    height: "100%",
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: 0.5,
    paddingVertical: 0,
    paddingHorizontal: 4,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
      },
    }),
  },
  phoneErrorText: {
    fontSize: 12.5,
    color: COLORS.danger,
    marginTop: 6,
    marginLeft: 4,
  },

  /* Step 2: Floating OTP Digits with Sleek Unified Underlines */
  otpDigitsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
    marginTop: 28,
    marginBottom: 32,
  },
  otpSlot: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  otpSlotInput: {
    width: 44,
    height: 44,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
      },
    }),
  },
  otpSlotUnderline: {
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginTop: 2,
  },
  otpSlotUnderlineFocused: {
    backgroundColor: COLORS.primary,
    width: 20,
    height: 2.5,
  },
  otpSlotUnderlineFilled: {
    backgroundColor: "#94A3B8",
    width: 20,
    height: 2.5,
  },
  iDontReceiveCodeContainer: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  iDontReceiveCodeText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#DC2626", // Red/coral link matching mockup
  },
  devCodeNotice: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
    alignSelf: "flex-start",
  },
  devCodeNoticeText: {
    fontSize: 12.5,
    color: "#1E40AF",
  },
  devCodeBold: {
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  devCodeHint: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },

  /* Action Buttons */
  primaryActionButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary, // Follow application theme color
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
      },
    }),
  },
  primaryActionButtonDisabled: {
    backgroundColor: "#93C5FD",
    ...Platform.select({
      web: {
        boxShadow: "none",
      },
    }),
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  helpLinkContainer: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  helpLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary, // Follow application theme
  },

  /* Step 3: Name Setup */
  nameScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
  },
  nameInputCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
  },
  nameInputLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  nameTextInput: {
    fontSize: 16.5,
    fontWeight: "600",
    color: "#0F172A",
    paddingVertical: 4,
    height: 36,
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
    marginTop: 4,
    paddingHorizontal: 2,
  },
  privacyText: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
    lineHeight: 17,
  },

  /* Country Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: "70%",
    maxWidth: CARD_MAX_WIDTH,
    width: "100%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 6,
  },
  countryListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  countryListItemActive: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  countryListFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryListName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#0F172A",
  },
  countryListCode: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
