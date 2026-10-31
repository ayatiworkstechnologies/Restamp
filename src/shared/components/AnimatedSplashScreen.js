import React, { useEffect, useRef, useState } from "react";
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
import { useFonts, KaushanScript_400Regular } from "@expo-google-fonts/kaushan-script";
import COLORS from "../constants/colors.js";

const BRAND = COLORS.primary || "#2563EB";
const SPLASH_DURATION = 2000;

// Handwritten wordmark: brush-script "Res" in ink, "tamp" in brand blue,
// revealed left to right behind a pen tip as if being written.
const WRITE_START = 200;
const WRITE_DURATION = 1050;

export default function AnimatedSplashScreen({ onAnimationComplete }) {
  const useNative = Platform.OS !== "web";

  // Wordmark is "written" by widening a clipping box over the full word.
  const [fontsLoaded] = useFonts({ KaushanScript_400Regular });
  const [wordWidth, setWordWidth] = useState(0);
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
        useNativeDriver: false,
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
          {/* Wordmark (handwritten). The full word is laid out invisibly to
              size the row; a clipping box widens over a copy of it. */}
          <View style={styles.wordmarkRow}>
            <Text
              style={[styles.scriptWord, fontsLoaded && styles.scriptFont, styles.wordGhost]}
              onLayout={(e) => {
                // Measure only once the script font is in, so the clip
                // matches the final glyph widths.
                if (fontsLoaded) setWordWidth(Math.ceil(e.nativeEvent.layout.width) + 2);
              }}
              key={fontsLoaded ? "script" : "fallback"}
            >
              Res<Text style={styles.brandTitleAccent}>tamp</Text>
            </Text>
            {wordWidth > 0 ? (
              <>
                <Animated.View
                  style={[
                    styles.writeClip,
                    { width: write.interpolate({ inputRange: [0, 1], outputRange: [0, wordWidth] }) },
                  ]}
                >
                  <Text style={[styles.scriptWord, fontsLoaded && styles.scriptFont, { width: wordWidth }]}>
                    Res<Text style={styles.brandTitleAccent}>tamp</Text>
                  </Text>
                </Animated.View>
                {/* Pen tip riding the writing edge */}
                <Animated.View
                  style={[
                    styles.penTip,
                    {
                      opacity: write.interpolate({ inputRange: [0, 0.02, 0.96, 1], outputRange: [0, 1, 1, 0] }),
                      transform: [
                        { translateX: write.interpolate({ inputRange: [0, 1], outputRange: [0, wordWidth] }) },
                        {
                          translateY: write.interpolate({
                            inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
                            outputRange: [6, -10, 4, -6, 8, -8, 2, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </>
            ) : null}
          </View>
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
  writeClip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  penTip: {
    position: "absolute",
    left: -4,
    top: 39,
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
