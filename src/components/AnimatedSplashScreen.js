import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Platform,
} from "react-native";
import { useFonts } from "expo-font";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");
const FULL_TEXT = "Restamp";
const FONT_SIZE = Math.min(68, Math.max(48, Math.floor(width * 0.14)));

export default function AnimatedSplashScreen({ onAnimationComplete }) {
  const [fontsLoaded] = useFonts({
    "DancingScript-Bold": require("../../assets/fonts/DancingScript_700Bold.ttf"),
  });

  const [displayedText, setDisplayedText] = useState("");
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const penPressure = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale = useRef(new Animated.Value(1)).current;
  const textScale = useRef(new Animated.Value(0.96)).current;

  const hasExited = useRef(false);

  const triggerExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(screenScale, {
        toValue: 1.05,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete?.();
    });
  };

  useEffect(() => {
    // 1. Slow, rhythmic blinking cursor loop
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0.15,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ])
    );
    blinkAnimation.start();

    // 2. Slow, graceful handwriting calligraphy animation
    let charIndex = 0;
    const initialDelay = 350; // Pause before writing starts
    const writeSpeed = 280;   // Slow, deliberate handwriting pace per letter

    let typeInterval = null;
    let finishTimer = null;

    const startTimer = setTimeout(() => {
      typeInterval = setInterval(() => {
        charIndex += 1;
        setDisplayedText(FULL_TEXT.slice(0, charIndex));

        // Pen pressure stroke effect on each letter
        penPressure.setValue(1.22);
        Animated.spring(penPressure, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }).start();

        if (charIndex >= FULL_TEXT.length) {
          clearInterval(typeInterval);

          // Gentle spring bloom when the calligraphy completes
          Animated.spring(textScale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();

          // Fade cursor out after final letter flourish
          setTimeout(() => {
            Animated.timing(cursorOpacity, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }).start();
          }, 600);

          // 3. Savor the finished calligraphy, then dissolve into the app
          finishTimer = setTimeout(() => {
            triggerExit();
          }, 1200);
        }
      }, writeSpeed);
    }, initialDelay);

    return () => {
      clearTimeout(startTimer);
      if (typeInterval) clearInterval(typeInterval);
      if (finishTimer) clearTimeout(finishTimer);
      blinkAnimation.stop();
    };
  }, []);

  // Scripted cursive font styling with multiple fallbacks
  const scriptFontFamily = fontsLoaded
    ? "DancingScript-Bold"
    : Platform.select({
        ios: "Snell Roundhand",
        web: "'Dancing Script', 'Snell Roundhand', 'Brush Script MT', cursive",
        default: "cursive",
      });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: screenOpacity,
          transform: [{ scale: screenScale }],
        },
      ]}
    >
      <Pressable style={styles.pressableArea} onPress={triggerExit}>
        <Animated.View
          style={[
            styles.textRow,
            {
              transform: [{ scale: textScale }],
            },
          ]}
        >
          <Text
            style={[
              styles.brandTitle,
              {
                fontFamily: scriptFontFamily,
              },
            ]}
          >
            {displayedText}
          </Text>
          <Animated.View
            style={[
              styles.cursor,
              {
                opacity: cursorOpacity,
                transform: [{ scaleY: penPressure }],
              },
            ]}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
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
  },

  textRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  brandTitle: {
    fontSize: FONT_SIZE,
    color: "#0F172A",
    letterSpacing: 0.5,
    includeFontPadding: false,
  },

  cursor: {
    width: 3.5,
    height: FONT_SIZE * 0.74,
    borderRadius: 2,
    backgroundColor: COLORS.primary || "#2563EB",
    marginLeft: 4,
    marginBottom: 4,
  },
});
