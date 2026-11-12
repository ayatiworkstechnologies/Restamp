import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import RestampWordmark from "./RestampWordmark.js";
import COLORS from "../constants/colors.js";

const BRAND = COLORS.primary || "#2563EB";
const SPLASH_DURATION = 2000;

// RESTAMP wordmark (same artwork as the app header), revealed left to right.
const WORD_H = 32;
const WORD_W = Math.round((WORD_H * 93) / 11);
const WRITE_START = 200;
const WRITE_DURATION = 1050;

export default function AnimatedSplashScreen({ onAnimationComplete }) {
  const useNative = Platform.OS !== "web";

  const write = useRef(new Animated.Value(0)).current;
  // Exit: content first, then the backdrop, so nothing ghosts over the app.
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const hasExited = useRef(false);

  const triggerExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;
    Animated.sequence([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: useNative,
      }),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: useNative,
      }),
    ]).start(() => onAnimationComplete?.());
  };

  useEffect(() => {
    // The word is written left to right.
    Animated.sequence([
      Animated.delay(WRITE_START),
      Animated.timing(write, {
        toValue: 1,
        duration: WRITE_DURATION,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: useNative,
      }),
    ]).start();

    const exitTimer = setTimeout(triggerExit, SPLASH_DURATION);
    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Pressable style={styles.pressableArea} onPress={triggerExit}>
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          {/* RESTAMP wordmark, revealed left to right as a white cover slides off. */}
          <View style={{ width: WORD_W, height: WORD_H, overflow: "hidden" }}>
            <RestampWordmark height={WORD_H} />
            {/* White cover slides right to uncover the word (native driver). */}
            <Animated.View
              style={[
                styles.cover,
                {
                  transform: [
                    { translateX: write.interpolate({ inputRange: [0, 1], outputRange: [0, WORD_W + 8] }) },
                  ],
                },
              ]}
            />
            {/* Light tip riding the reveal edge */}
            <Animated.View
              style={[
                styles.penTip,
                {
                  opacity: write.interpolate({ inputRange: [0, 0.02, 0.96, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: write.interpolate({ inputRange: [0, 1], outputRange: [0, WORD_W] }) },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pressableArea: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
  },
  wordmarkRow: {
    justifyContent: "center",
  },
  scriptWord: {
    fontSize: 62,
    lineHeight: 86,
    color: "#0F172A",
    paddingHorizontal: 8,
  },
  scriptFont: {
    fontFamily: "KaushanScript_400Regular",
  },
  wordGhost: {
    opacity: 0,
  },
  cover: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: WORD_W + 8,
    backgroundColor: "#FFFFFF",
  },
  writeClip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  penTip: {
    position: "absolute",
    left: 0,
    top: WORD_H / 2 - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  brandTitleAccent: {
    color: BRAND,
  },
});
