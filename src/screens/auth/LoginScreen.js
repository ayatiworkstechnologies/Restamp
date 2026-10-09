import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  FlatList,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// 6 boxes with 5 gaps of 8px (total gaps 40px) and container padding 44px
const OTP_BOX_WIDTH = Math.min(48, Math.max(38, Math.floor((SCREEN_WIDTH - 84) / 6)));
const OTP_BOX_HEIGHT = Math.round(OTP_BOX_WIDTH * 1.18);
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  RotateCcw,
  Lock,
  Check,
  X,
  Sparkles,
  Zap,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";
import { requestOtp, verifyOtp } from "../../api/auth";

const COUNTRY_CODES = [
  { flag: "🇮🇳", code: "+91", name: "India" },
  { flag: "🇺🇸", code: "+1", name: "United States" },
  { flag: "🇬🇧", code: "+44", name: "United Kingdom" },
  { flag: "🇦🇪", code: "+971", name: "United Arab Emirates" },
  { flag: "🇸🇬", code: "+65", name: "Singapore" },
  { flag: "🇨🇦", code: "+1", name: "Canada" },
  { flag: "🇦🇺", code: "+61", name: "Australia" },
];

const VALID_DEMO_CODES = [
  "297569",
  "109745",
  "583214",
  "741806",
  "426391",
  "835027",
  "614958",
  "372640",
  "958163",
  "205874",
];

export default function LoginScreen({ navigation }) {
  const { loginWithToken, saveProfileName, setLocalProfileName } = useAuth();

  // Multi-step: 1 = Phone, 2 = OTP, 3 = Name
  const [step, setStep] = useState(1);

  // Form states
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("9876543210");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState(0);
  const [firstName, setFirstName] = useState("Alex");
  const [lastName, setLastName] = useState("Smith");

  // Timer for resend OTP
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [busy, setBusy] = useState(false);
  // Testing helper: uses verified backend code or accepted demo code
  const [devCode, setDevCode] = useState("297569");

  const fullPhone = () => `${selectedCountry.code}${phoneNumber.replace(/[^0-9]/g, "")}`;

  const otpErrorMessage = (e) => {
    if (!e) return "Something went wrong. Please try again.";
    if (e.kind === "validation") return "Enter a valid phone number with country code.";
    if (e.status === 429 || e.kind === "retry_later")
      return "Too many attempts. Please wait a while and try again.";
    if (e.kind === "offline") return "No connection. Check your internet and try again.";
    return "Could not reach the server. Please try again.";
  };

  // Refs for inputs
  const otpInputRefs = useRef([]);
  const phoneInputRef = useRef(null);
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);

  // Dismiss the keyboard only for taps on non-editable background areas.
  // (React Native Web routes native clicks to the nearest press responder
  // without excluding <input>/<textarea> targets, so an unconditional dismiss
  // would blur a TextInput on the same tap that focused it.)
  const dismissKeyboardIfBackground = (e) => {
    const target = e && e.nativeEvent ? e.nativeEvent.target : null;
    const tag =
      target && typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || (target && target.isContentEditable)) {
      return;
    }
    Keyboard.dismiss();
  };

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

  const handlePhoneSubmit = async () => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, "");
    if (cleaned.length < 8 || busy) {
      if (cleaned.length < 8) {
        Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      }
      return;
    }
    setBusy(true);
    try {
      const resp = await requestOtp(fullPhone());
      const codeFromBackend = resp && resp.debug_code ? String(resp.debug_code) : null;
      setDevCode(codeFromBackend || VALID_DEMO_CODES[0]);
      setOtp(["", "", "", "", "", ""]);
      setStep(2);
      setTimer(30);
      setCanResend(false);
      setFocusedOtpIndex(0);
    } catch (e) {
      // Fallback for seamless testing
      setDevCode(VALID_DEMO_CODES[0]);
      setOtp(["", "", "", "", "", ""]);
      setStep(2);
      setTimer(30);
      setCanResend(false);
      setFocusedOtpIndex(0);
    } finally {
      setBusy(false);
    }
  };

  const handleAutoFill = (codeToFill) => {
    const targetCode = codeToFill || devCode;
    if (!targetCode) return;
    const digits = String(targetCode).replace(/[^0-9]/g, "").slice(0, 6).split("");
    const newOtp = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    const nextIdx = Math.min(5, digits.length - 1);
    setFocusedOtpIndex(nextIdx);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handleOtpChange = (text, index) => {
    const cleanDigits = text.replace(/[^0-9]/g, "");
    if (cleanDigits.length > 1) {
      const pasted = cleanDigits.slice(0, 6).split("");
      const newOtp = [...otp];
      pasted.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(5, pasted.length - 1);
      otpInputRefs.current[nextIdx]?.focus();
      setFocusedOtpIndex(nextIdx);
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = cleanDigits.slice(-1);
    setOtp(newOtp);

    // Auto advance
    if (cleanDigits && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      setFocusedOtpIndex(index + 1);
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

  const handleOtpSubmit = async () => {
    const code = otp.join("");
    if (code.length < 6 || busy) {
      if (code.length < 6) {
        Alert.alert("Incomplete Code", "Please enter the 6-digit code we sent you.");
      }
      return;
    }
    setBusy(true);
    try {
      let tokenResp;
      try {
        tokenResp = await verifyOtp(fullPhone(), code);
      } catch (err) {
        // Testing fallback for demo code or local testing
        if (code === devCode || code === "123456" || code === "297569") {
          tokenResp = {
            access_token: "test-token-" + Date.now(),
            user_id: 1,
            role: "BUYER",
          };
        } else {
          throw err;
        }
      }
      const userObj = await loginWithToken(tokenResp.access_token, {
        phone: fullPhone(),
        countryCode: selectedCountry.code,
      });
      // Returning user whose profile was already completed -> skip Name screen to Common Home
      if (userObj && userObj.isProfileComplete) {
        if (navigation?.reset) {
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
        } else {
          navigation?.navigate("MainTabs");
        }
      } else {
        // New user or incomplete profile -> Name screen
        if (userObj?.firstName) setFirstName(userObj.firstName);
        if (userObj?.lastName) setLastName(userObj.lastName);
        setStep(3);
      }
    } catch (e) {
      if (e && (e.status === 401 || e.kind === "login")) {
        Alert.alert("Invalid Code", "That code is incorrect or expired. Please try again.");
      } else {
        Alert.alert("Verification Failed", otpErrorMessage(e));
      }
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
      // Persist to MySQL via PATCH /users/me
      await saveProfileName(trimmedFirst, trimmedLast);

      // Enter the app
      if (navigation?.reset) {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      } else {
        navigation?.navigate("MainTabs");
      }
    } catch (e) {
      Alert.alert("Could Not Save Profile", "Failed to save your profile name. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    if (navigation?.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } else {
      navigation?.navigate("MainTabs");
    }
  };

  const isPhoneValid = phoneNumber.replace(/[^0-9]/g, "").length >= 8;
  const isOtpValid = otp.join("").length === 6 || otp.some((d) => d.length > 0);
  const isNameValid = firstName.trim().length > 0;

  // Progress Bar width calculation: Step 1 = 33%, Step 2 = 66%, Step 3 = 100%
  const progressPercent = step === 1 ? "33%" : step === 2 ? "66%" : "100%";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP PROGRESS BAR */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: progressPercent }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboardIfBackground}>
          <View style={styles.container}>
            {/* TOP BAR / SKIP BUTTON */}
            <View style={styles.topBar}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>

          {/* ================= STEP 1: PHONE NUMBER ================= */}
          {step === 1 && (
            <View style={styles.content}>
              <Text style={styles.heading}>What’s your phone number?</Text>

                <View style={styles.phoneInputRow}>
                  {/* Country Selector Card */}
                  <TouchableOpacity
                    style={styles.countryCard}
                    onPress={() => setShowCountryModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryCodeText}>
                      {selectedCountry.code}
                    </Text>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>

                  {/* Phone Input Card */}
                  <Pressable
                    style={styles.phoneInputCard}
                    onPress={() => phoneInputRef.current?.focus()}
                  >
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.phoneTextInput}
                      placeholder="Phone number"
                      placeholderTextColor="#A8A29E"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      underlineColorAndroid="transparent"
                      autoFocus
                    />
                  </Pressable>
                </View>

                <Text style={styles.disclaimerText}>
                  By continuing, you agree to receive{" "}
                  <Text style={styles.boldText}>SMS</Text> messages from RESTAMP
                  for phone verification.
                </Text>
              </View>
            )}

            {/* ================= STEP 2: OTP VERIFICATION ================= */}
            {step === 2 && (
              <View style={styles.content}>
                <Text style={styles.heading}>
                  We just texted you, what’s the code?
                </Text>

                {/* 6 OTP Boxes */}
                <View style={styles.otpBoxesRow}>
                  {otp.map((digit, idx) => {
                    const isFocused = focusedOtpIndex === idx;
                    const isFilled = Boolean(digit);
                    return (
                      <TextInput
                        key={idx}
                        ref={(ref) => (otpInputRefs.current[idx] = ref)}
                        style={[
                          styles.otpBox,
                          isFilled ? styles.otpBoxFilled : null,
                          isFocused ? styles.otpBoxFocused : null,
                        ]}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, idx)}
                        onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                        onFocus={() => setFocusedOtpIndex(idx)}
                        onBlur={() => {
                          if (focusedOtpIndex === idx) setFocusedOtpIndex(-1);
                        }}
                        keyboardType="number-pad"
                        maxLength={1}
                        caretHidden={true}
                        selectTextOnFocus={true}
                        selectionColor="#2563EB"
                        underlineColorAndroid="transparent"
                        autoFocus={idx === 0}
                      />
                    );
                  })}
                </View>

                {/* Phone Notice & Change Link */}
                <View style={styles.phoneNoticeContainer}>
                  <Text style={styles.subtextNotice}>
                    We've sent a <Text style={styles.boldText}>WhatsApp / SMS</Text>{" "}
                    verification code to{" "}
                    <Text style={styles.boldText}>
                      {selectedCountry.code} {phoneNumber}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.changePhoneBtn}
                    onPress={() => setStep(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changePhoneText}>Edit phone number</Text>
                  </TouchableOpacity>
                </View>

                {/* Testing Time OTP Preview & Instant Auto-Fill Banner (Always shown right after mobile no) */}
                <View style={styles.otpPreviewContainer}>
                  <View style={styles.otpPreviewTopRow}>
                    <View style={styles.otpPreviewBadge}>
                      <Sparkles size={13} color="#2563EB" />
                      <Text style={styles.otpPreviewBadgeText}>Testing OTP Code</Text>
                    </View>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveIndicatorText}>Ready to use</Text>
                    </View>
                  </View>

                  <View style={styles.otpPreviewCardBody}>
                    <TouchableOpacity
                      style={styles.otpPreviewDigits}
                      onPress={() => handleAutoFill(devCode || "123456")}
                      activeOpacity={0.7}
                    >
                      {(devCode || "123456").split("").map((digit, i) => (
                        <View key={i} style={styles.otpPreviewDigitCell}>
                          <Text style={styles.otpPreviewDigitValue}>{digit}</Text>
                        </View>
                      ))}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.autoFillButton}
                      onPress={() => handleAutoFill(devCode || "123456")}
                      activeOpacity={0.8}
                    >
                      <Zap size={14} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.autoFillButtonText}>Auto-Fill</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Resend Code / Update Now Button */}
                <View style={styles.resendSection}>
                  <TouchableOpacity
                    style={[
                      styles.resendPillBtn,
                      canResend ? styles.resendPillBtnActive : styles.resendPillBtnDisabled,
                    ]}
                    onPress={() => {
                      if (canResend && !busy) {
                        setBusy(true);
                        requestOtp(fullPhone()).then(
                          (resp) => {
                            setBusy(false);
                            setTimer(30);
                            setCanResend(false);
                            const newCode =
                              resp && resp.debug_code
                                ? String(resp.debug_code)
                                : VALID_DEMO_CODES[
                                    Math.floor(Math.random() * VALID_DEMO_CODES.length)
                                  ];
                            setDevCode(newCode);
                            setOtp(["", "", "", "", "", ""]);
                            setFocusedOtpIndex(0);
                            Alert.alert(
                              "Code Updated",
                              `New testing OTP: ${newCode}. Preview and Auto-fill updated.`
                            );
                          },
                          () => {
                            setBusy(false);
                            const fallbackNewCode =
                              VALID_DEMO_CODES[
                                Math.floor(Math.random() * VALID_DEMO_CODES.length)
                              ];
                            setDevCode(fallbackNewCode);
                            setTimer(30);
                            setCanResend(false);
                            setOtp(["", "", "", "", "", ""]);
                            setFocusedOtpIndex(0);
                            Alert.alert(
                              "Code Updated",
                              `New testing OTP: ${fallbackNewCode}. Preview and Auto-fill updated.`
                            );
                          }
                        );
                      }
                    }}
                    activeOpacity={canResend ? 0.75 : 1}
                  >
                    <RotateCcw
                      size={14}
                      color={canResend ? "#FFFFFF" : "#94A3B8"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.resendPillText,
                        canResend ? styles.resendPillTextActive : styles.resendPillTextDisabled,
                      ]}
                    >
                      {canResend ? "Update now (Resend code)" : `Resend code in ${timer}s`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          {/* ================= STEP 3: USER NAME ================= */}
          {step === 3 && (
            <View style={styles.content}>
              <Text style={styles.heading}>What’s your name?</Text>

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
                  placeholderTextColor="#A8A29E"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  underlineColorAndroid="transparent"
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
                  placeholderTextColor="#A8A29E"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  underlineColorAndroid="transparent"
                />
              </Pressable>

              {/* Privacy Guarantee */}
              <View style={styles.privacyRow}>
                <Lock size={13} color="#78716C" style={{ marginRight: 6 }} />
                <Text style={styles.privacyText}>
                  We'll only show this information to people you connect with
                  on RESTAMP
                </Text>
              </View>
            </View>
          )}

            {/* ================= BOTTOM BAR ================= */}
            <View style={styles.bottomBar}>
              {/* Back Button (visible on step 2 & 3) */}
              {step > 1 ? (
                <TouchableOpacity
                  style={styles.circleBackBtn}
                  onPress={() => setStep((prev) => prev - 1)}
                  activeOpacity={0.8}
                >
                  <ArrowLeft size={22} color="#1E293B" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 54 }} />
              )}

              {/* Support / Help link */}
              <View style={styles.supportContainer}>
                <Text style={styles.supportLabel}>
                  Experiencing issues? Email our team:
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Support",
                      "Contact our team at support@restamp.in"
                    )
                  }
                >
                  <Text style={styles.supportEmail}>support@restamp.in</Text>
                </TouchableOpacity>
              </View>

              {/* Next Circular Button (App Primary Color #2563EB) */}
              <TouchableOpacity
                style={[
                  styles.circleNextBtn,
                  busy && styles.circleNextBtnDisabled,
                  step === 1 && !isPhoneValid && styles.circleNextBtnDisabled,
                  step === 2 && !isOtpValid && styles.circleNextBtnDisabled,
                  step === 3 && !isNameValid && styles.circleNextBtnDisabled,
                ]}
                onPress={() => {
                  if (step === 1) handlePhoneSubmit();
                  else if (step === 2) handleOtpSubmit();
                  else if (step === 3) handleNameSubmit();
                }}
                activeOpacity={0.85}
              >
                {step === 3 ? (
                  <Check size={24} color="#FFFFFF" strokeWidth={2.6} />
                ) : (
                  <ArrowRight size={24} color="#FFFFFF" strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* ================= COUNTRY CODE MODAL ================= */}
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
                    setShowCountryModal(false);
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
  progressBarTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "#F1F5F9",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB", // Follow app primary color
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  heading: {
    fontSize: 29,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: 28,
  },

  /* STEP 1: PHONE */
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  countryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    height: 58,
    gap: 6,
  },
  flagText: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  phoneInputCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 58,
    justifyContent: "center",
  },
  phoneTextInput: {
    flex: 1,
    height: "100%",
    fontSize: 17,
    fontWeight: "600",
    color: "#111111",
    paddingVertical: 0,
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  disclaimerText: {
    fontSize: 12.5,
    color: "#78716C",
    lineHeight: 18,
    marginTop: 4,
  },
  boldText: {
    fontWeight: "700",
    color: "#1C1917",
  },

  /* STEP 2: OTP */
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  otpBox: {
    width: OTP_BOX_WIDTH,
    height: OTP_BOX_HEIGHT,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    textAlignVertical: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  otpBoxFilled: {
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  otpBoxFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },
  phoneNoticeContainer: {
    marginBottom: 16,
  },
  subtextNotice: {
    fontSize: 13,
    color: "#78716C",
    lineHeight: 20,
  },
  changePhoneBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
  },
  changePhoneText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#2563EB",
    textDecorationLine: "underline",
  },
  otpPreviewContainer: {
    backgroundColor: "#F0F7FF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: 12,
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  otpPreviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  otpPreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  otpPreviewBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1D4ED8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  liveIndicatorText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#16A34A",
  },
  otpPreviewCardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  otpPreviewDigits: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  otpPreviewDigitCell: {
    width: 28,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    alignItems: "center",
    justifyContent: "center",
  },
  otpPreviewDigitValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  autoFillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  autoFillButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resendSection: {
    marginTop: 2,
    marginBottom: 8,
  },
  resendPillBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  resendPillBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  resendPillBtnDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  resendPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  resendPillTextActive: {
    color: "#FFFFFF",
  },
  resendPillTextDisabled: {
    color: "#94A3B8",
  },

  /* STEP 3: NAME */
  nameInputCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
  },
  nameInputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#78716C",
    marginBottom: 2,
  },
  nameTextInput: {
    fontSize: 16.5,
    fontWeight: "600",
    color: "#111111",
    paddingVertical: 4,
    height: 36,
    width: "100%",
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  privacyText: {
    fontSize: 12,
    color: "#78716C",
    flex: 1,
    lineHeight: 17,
  },

  /* BOTTOM BAR */
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Platform.OS === "ios" ? 20 : 28,
    paddingTop: 12,
  },
  circleBackBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E5E4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  supportContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  supportLabel: {
    fontSize: 11,
    color: "#78716C",
    textAlign: "center",
  },
  supportEmail: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#111111",
    textDecorationLine: "underline",
    marginTop: 2,
  },
  circleNextBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563EB", // Follow app primary color
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  circleNextBtnDisabled: {
    backgroundColor: "#93C5FD",
    shadowOpacity: 0.1,
  },

  /* MODAL */
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
    color: "#2563EB",
  },
});
