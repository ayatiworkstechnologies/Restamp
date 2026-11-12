import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Pressable,
  Animated,
} from "react-native";
import { KeyboardAvoidingView } from "../../../shared/components/KeyboardSafe.js";
import * as Speech from "expo-speech";
import { SpeechModule, useSpeechEvent, speechAvailable } from "../services/speechRecognition.js";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import {
  Sparkles,
  X,
  Send,
  ArrowRight,
  Globe,
  Search,
  Building2,
  Mic,
  Square,
  Volume2,
  VolumeX,
} from "../../../shared/components/HugeIcon.js";
import { REVA_THEME } from "../theme.js";
import RevaOrb from "./RevaOrb.js";
import RevaLogo from "./RevaLogo.js";
import { PulseRing, MessageIn, TypingDots, NATIVE_DRIVER } from "./RevaAnimations.js";
import { COPY, LANGUAGES } from "../i18n.js";
import {
  QUICK_ACTIONS,
  sendRevaChat,
  transcribeVoice,
  getResolvedChatUrl,
} from "../services/chatService.js";
import { useReva } from "../context/RevaContext.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { navigationRef } from "../../../shared/navigation/navRef.js";
import { enterOwnerFlow } from "../../../shared/api/users.js";

// Screens where the Reva button and chat must not appear.
const HIDDEN_ROUTES = new Set(["Login"]);

const LANG_PROMPT = {
  id: "lang-prompt",
  from: "assistant",
  text: "Hi! 👋 I'm Reva AI. Which language would you like to chat in?\nஎந்த மொழியில் பேச விரும்புகிறீர்கள்?",
  langChoice: true,
};

const buildWelcome = (role, language, userName) => ({
  id: `welcome-${language}-${role}`,
  from: "assistant",
  text: COPY[language].welcome(REVA_THEME.assistantName, role, userName),
  chips: (QUICK_ACTIONS[language] && QUICK_ACTIONS[language][role]) || QUICK_ACTIONS.en.Buyer,
});

export default function RevaChatbot() {
  const {
    isOpen,
    closeReva,
    openReva,
    activeRole,
    setActiveRole,
    initialPrompt,
    setInitialPrompt,
  } = useReva();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 0);

  // Track the current screen so Reva can stay hidden on the login screen.
  const [routeName, setRouteName] = useState(() =>
    navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name ?? null : null
  );
  useEffect(() => {
    const update = () => setRouteName(navigationRef.getCurrentRoute()?.name ?? null);
    if (navigationRef.isReady()) update();
    const unsub = navigationRef.addListener("state", update);
    return unsub;
  }, []);
  const userName = auth?.user?.firstName || auth?.user?.name || "";

  const [language, setLanguage] = useState("en");
  const t = COPY[language] || COPY.en;
  const [langChosen, setLangChosen] = useState(false);

  const [messages, setMessages] = useState([LANG_PROMPT]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const listRef = useRef(null);
  const nextId = useRef(1);
  const activeAbort = useRef(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  const webMediaRecorder = useRef(null);
  const webAudioChunks = useRef([]);

  // Native audio recorder hook (safe on iOS/Android; ignored on web)
  let nativeRecorder = null;
  try {
    nativeRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  } catch {
    // web or unsupported fallback
  }

  // Text-to-speech helper (works across iOS, Android, and Web)
  const speakWords = useCallback(
    async (text, spokenLanguage = language) => {
      if (!text || typeof text !== "string") return;
      const targetLang = spokenLanguage === "ta" ? "ta-IN" : "en-IN";

      try {
        if (Platform.OS === "web") {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new window.SpeechSynthesisUtterance(text);
            utterance.lang = targetLang;
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
          }
        } else {
          await Speech.stop();
          Speech.speak(text, {
            language: targetLang,
            rate: 0.94,
            onError: () => setError(t.speakingError),
          });
        }
      } catch {
        setError(t.speakingError);
      }
    },
    [language, t.speakingError]
  );

  const stopSpeech = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } else {
        await Speech.stop();
      }
    } catch {
      // silent
    }
  }, []);

  // Cleanup on close
  const handleClose = useCallback(() => {
    closeReva();
    stopSpeech();
    if (recording) {
      voiceCancelled.current = true;
      try {
        SpeechModule?.abort();
      } catch {}
      setRecording(false);
    }
  }, [closeReva, stopSpeech, recording]);

  // Restart conversation when role or language changes
  const startFresh = useCallback(
    (newRole, newLanguage) => {
      activeAbort.current?.abort?.();
      activeAbort.current = null;
      setBusy(false);
      setError("");
      setVoiceNotice("");
      setDraft("");
      stopSpeech();
      const picked = LANGUAGES.find((l) => l.code === newLanguage);
      setMessages([
        LANG_PROMPT,
        { id: `pick-${newLanguage}`, from: "user", text: picked ? picked.label : newLanguage },
        buildWelcome(newRole, newLanguage, userName),
      ]);
    },
    [stopSpeech, userName]
  );

  useEffect(() => {
    if (!langChosen) {
      activeAbort.current?.abort?.();
      activeAbort.current = null;
      setBusy(false);
      setDraft("");
      setMessages([LANG_PROMPT]);
      return;
    }
    startFresh(activeRole, language);
  }, [activeRole, language, langChosen, startFresh]);

  // Handle external open with prompt
  useEffect(() => {
    if (isOpen && initialPrompt) {
      submit(initialPrompt);
      setInitialPrompt(null);
    }
  }, [isOpen, initialPrompt]);

  // On-device speech recognition (phone / browser). Interim words fill the
  // input live; when speech ends the question is sent and the reply spoken.
  const voiceTranscript = useRef("");
  const voiceCancelled = useRef(false);
  const submitRef = useRef(null);

  useSpeechEvent("result", (event) => {
    const text = event.results?.[0]?.transcript || "";
    voiceTranscript.current = text;
    setDraft(text.slice(0, 500));
  });

  useSpeechEvent("end", () => {
    setRecording(false);
    const text = voiceTranscript.current.trim();
    voiceTranscript.current = "";
    if (voiceCancelled.current) {
      voiceCancelled.current = false;
      return;
    }
    if (text) {
      submitRef.current?.(text.slice(0, 500), { voice: true });
    }
  });

  useSpeechEvent("error", (event) => {
    setRecording(false);
    if (event.error === "aborted") return;
    voiceCancelled.current = true;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") setError(t.micDenied);
    else if (event.error === "no-speech" || event.error === "speech-timeout") setError(t.voiceEmpty);
    else setError(t.voiceError);
  });

  const toggleMicrophone = useCallback(async () => {
    if (busy || !langChosen) return;
    setError("");
    setVoiceNotice("");

    if (recording) {
      try {
        SpeechModule?.stop();
      } catch {
        setRecording(false);
      }
      return;
    }

    stopSpeech();
    try {
      if (!speechAvailable()) {
        setError(t.voiceUnsupported || t.voiceError);
        return;
      }
      const perm = await SpeechModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError(t.micDenied);
        return;
      }
      voiceTranscript.current = "";
      voiceCancelled.current = false;
      setDraft("");
      SpeechModule.start({
        lang: language === "ta" ? "ta-IN" : "en-IN",
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
      setRecording(true);
    } catch {
      setRecording(false);
      setError(t.voiceUnsupported || t.voiceError);
    }
  }, [busy, langChosen, recording, stopSpeech, language, t]);

  const submit = useCallback(
    async (text, opts) => {
      const viaVoice = !!opts?.voice;
      const question = String(text ?? draft).trim();
      if (!question || busy || (!viaVoice && (recording || transcribing))) return;
      setVoiceNotice("");

      if (question.length > 500) {
        setError(t.tooLong);
        return;
      }

      setBusy(true);
      setError("");
      setVoiceNotice("");
      setDraft("");

      const userMsg = {
        id: `msg-${++nextId.current}`,
        from: "user",
        text: question,
      };

      const prev = messages;
      setMessages((items) => [...items, userMsg]);

      const controller = new AbortController();
      activeAbort.current = controller;

      try {
        const result = await sendRevaChat({
          question,
          role: activeRole,
          language,
          history: prev,
          signal: controller.signal,
          accessToken: auth?.token,
        });

        if (controller.signal.aborted) return;

        setMessages((items) => [
          ...items,
          {
            id: `msg-${++nextId.current}`,
            from: "assistant",
            text: result.text,
            action: result.action,
            language: result.language || language,
          },
        ]);

        if (autoSpeak || viaVoice) {
          speakWords(result.text, result.language || language);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(t.networkError);
        }
      } finally {
        if (activeAbort.current === controller) {
          activeAbort.current = null;
          setBusy(false);
        }
      }
    },
    [draft, busy, recording, transcribing, messages, activeRole, language, autoSpeak, speakWords, auth?.token, t]
  );
  submitRef.current = submit;

  const handleActionClick = (action) => {
    if (!action || !action.route) return;
    handleClose();

    if (navigationRef.isReady()) {
      if (action.route === "Search") {
        navigationRef.navigate("MainTabs", { screen: "Search" });
      } else if (action.route === "OwnerAdd") {
        enterOwnerFlow(navigationRef, auth, "Add");
      } else if (action.route === "OwnerDashboard") {
        enterOwnerFlow(navigationRef, auth, "Dashboard");
      } else if (action.route === "OwnerPlans") {
        navigationRef.navigate("OwnerPlans");
      } else if (action.route === "Activity") {
        navigationRef.navigate("MainTabs", { screen: "Activity" });
      } else if (action.route === "AgentPlans") {
        navigationRef.navigate("Menu", { initialTab: "agent" });
      } else {
        navigationRef.navigate(action.route, action.params);
      }
    }
  };

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.92,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  if (HIDDEN_ROUTES.has(routeName)) return null;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <Animated.View style={[styles.fabWrap, { bottom: 76 + bottomInset, transform: [{ scale: fabScale }] }]}>
          <PulseRing size={58} color={REVA_THEME.primary} />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => openReva()}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={0.9}
            accessibilityLabel="Open Reva AI Voice & Text chat"
          >
            <View style={styles.fabIconWrap}>
              <RevaOrb size={58} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Reva Modal Sheet */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdropPressable} onPress={handleClose} />

          <KeyboardAvoidingView
            behavior="padding"
            style={styles.sheetWrap}
          >
            <SafeAreaView style={styles.sheetContainer}>
              {/* Sheet Drag Handle */}
              <View style={styles.dragHandleBox}>
                <View style={styles.dragHandle} />
              </View>

              {/* Chat Header */}
              <View style={styles.header}>
                <RevaOrb size={42} />

                <View style={styles.headerTitleBox}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {REVA_THEME.assistantName}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.headerSub} numberOfLines={1}>
                      {recording ? t.listening || t.recording : busy ? t.thinking : "Online · Voice & Text"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.iconBtn, autoSpeak && styles.iconBtnActive]}
                  onPress={() => {
                    setAutoSpeak((prev) => !prev);
                    stopSpeech();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityLabel={autoSpeak ? t.autoSpeakOn : t.autoSpeakOff}
                >
                  {autoSpeak ? (
                    <Volume2 size={17} color={REVA_THEME.primary} strokeWidth={2.2} />
                  ) : (
                    <VolumeX size={17} color="#64748B" strokeWidth={2.2} />
                  )}
                </TouchableOpacity>

                {langChosen && (
                  <TouchableOpacity
                    style={styles.langSwitchBtn}
                    onPress={() => setLangChosen(false)}
                    disabled={recording || busy}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    accessibilityLabel={t.languageLabel}
                  >
                    <Globe size={15} color={REVA_THEME.primary} strokeWidth={2.2} />
                    <Text style={styles.langSwitchText}>{language === "ta" ? "தமிழ்" : "EN"}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={handleClose}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityLabel={t.close}
                >
                  <X size={18} color="#475569" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* Message Thread */}
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.thread}
                contentContainerStyle={styles.threadContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const isUser = item.from === "user";
                  if (isUser) {
                    return (
                      <MessageIn fromRight style={[styles.msgRow, styles.msgRowUser]}>
                        <View style={[styles.bubble, styles.bubbleUser]}>
                          <Text style={[styles.msgText, styles.msgTextUser]}>{item.text}</Text>
                        </View>
                      </MessageIn>
                    );
                  }
                  const showLang = item.langChoice && !langChosen;
                  const showChips = item.chips && item.chips.length > 0;
                  return (
                    <MessageIn style={[styles.msgRow, styles.msgRowBot]}>
                      <View style={styles.botIconWrap}>
                        <RevaLogo size={16} color="#FFFFFF" eyeColor={REVA_THEME.primary} />
                      </View>

                      <View style={styles.botColumn}>
                        <View style={[styles.bubble, styles.bubbleBot]}>
                          <Text style={[styles.msgText, styles.msgTextBot]}>{item.text}</Text>

                          {item.action && (
                            <TouchableOpacity
                              style={styles.actionCtaBtn}
                              onPress={() => handleActionClick(item.action)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.actionCtaText}>{item.action.label}</Text>
                              <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.4} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.listenBtn}
                          onPress={() => speakWords(item.text, item.language || language)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityLabel={t.speak}
                        >
                          <Volume2 size={13} color="#64748B" strokeWidth={2.2} />
                          <Text style={styles.listenText}>{t.speak}</Text>
                        </TouchableOpacity>

                        {showLang && (
                          <View style={styles.chipsContainer}>
                            {LANGUAGES.map((l) => (
                              <TouchableOpacity
                                key={l.code}
                                style={styles.langChip}
                                onPress={() => {
                                  setLanguage(l.code);
                                  setLangChosen(true);
                                }}
                                activeOpacity={0.8}
                                accessibilityLabel={l.label}
                              >
                                <Text style={styles.langChipText}>{l.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {showChips && (
                          <View style={styles.chipsContainer}>
                            {item.chips.map((chip, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={styles.chipBtn}
                                onPress={() => submit(chip.question)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.chipText}>{chip.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    </MessageIn>
                  );
                }}
                ListFooterComponent={
                  busy ? (
                    <View style={[styles.msgRow, styles.msgRowBot]}>
                      <View style={styles.botIconWrap}>
                        <RevaLogo size={16} color="#FFFFFF" eyeColor={REVA_THEME.primary} />
                      </View>
                      <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                        <TypingDots color={REVA_THEME.primary} />
                      </View>
                    </View>
                  ) : null
                }
              />

              {/* Composer */}
              <View style={[styles.bottomArea, { paddingBottom: 12 + insets.bottom }]}>
                {!!error && <Text style={styles.errorText}>{error}</Text>}
                {!!voiceNotice && <Text style={styles.voiceNoticeText}>{voiceNotice}</Text>}

                {recording && (
                  <View style={styles.audioStatusBar}>
                    <View style={styles.recordingPulseDot} />
                    <Text style={styles.audioStatusLabel}>{t.listening || t.recording}</Text>
                  </View>
                )}

                <View style={styles.composerRow}>
                  <View style={[styles.inputPill, recording && styles.inputPillRecording]}>
                    <TextInput
                      style={styles.input}
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={langChosen ? t.placeholder : "Choose a language above…"}
                      placeholderTextColor="#94A3B8"
                      multiline
                      maxLength={500}
                      editable={langChosen && !busy && !recording}
                      returnKeyType="send"
                      onSubmitEditing={() => submit(draft)}
                    />

                    <TouchableOpacity
                      style={[
                        styles.micBtn,
                        recording && styles.micBtnRecording,
                        (busy || !langChosen) && styles.btnDisabled,
                      ]}
                      onPress={toggleMicrophone}
                      disabled={busy || !langChosen}
                      activeOpacity={0.8}
                      accessibilityLabel={recording ? t.stopRecording : t.startRecording}
                    >
                      {recording ? (
                        <Square size={14} color="#FFFFFF" strokeWidth={2.6} />
                      ) : (
                        <Mic size={18} color={REVA_THEME.primary} strokeWidth={2.2} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.sendBtn, (!draft.trim() || busy || recording) && styles.sendBtnDisabled]}
                    onPress={() => submit(draft)}
                    disabled={!draft.trim() || busy || recording}
                    activeOpacity={0.8}
                    accessibilityLabel={t.send}
                  >
                    <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.disclaimerText}>{t.disclaimer}</Text>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "ios" ? 96 : 76,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#4D63EA",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  onlineBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    position: "absolute",
    top: 6,
    right: 6,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
  },
  sheetWrap: {
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    height: "88%",
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  dragHandleBox: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: "#FFFFFF",
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: REVA_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 4,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 5,
  },
  headerSub: {
    flexShrink: 1,
    fontSize: 12,
    color: "#64748B",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    backgroundColor: "#EFF6FF",
  },
  langSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    paddingHorizontal: 11,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
  },
  langSwitchText: {
    fontSize: 13,
    fontWeight: "700",
    color: REVA_THEME.primary,
  },
  thread: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  threadContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowBot: {
    justifyContent: "flex-start",
  },
  botIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: REVA_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  botColumn: {
    flex: 1,
    alignItems: "flex-start",
    paddingRight: 28,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    maxWidth: "80%",
    backgroundColor: REVA_THEME.primary,
    borderTopRightRadius: 6,
  },
  bubbleBot: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 6,
  },
  typingBubble: {
    paddingVertical: 14,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  msgTextUser: {
    color: "#FFFFFF",
  },
  msgTextBot: {
    color: "#0F172A",
  },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    marginLeft: 4,
  },
  listenText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  actionCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: REVA_THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 10,
  },
  actionCtaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chipBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  langChip: {
    minWidth: 96,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: REVA_THEME.primary,
  },
  langChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginBottom: 8,
    marginLeft: 4,
  },
  voiceNoticeText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  audioStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  recordingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    marginRight: 6,
  },
  audioStatusLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 48,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 5,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputPillRecording: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF7F7",
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: "#0F172A",
    maxHeight: 100,
    paddingTop: 9,
    paddingBottom: 9,
    paddingRight: 8,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnRecording: {
    backgroundColor: "#DC2626",
  },
  btnDisabled: {
    opacity: 0.45,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: REVA_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  disclaimerText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
  },
});
