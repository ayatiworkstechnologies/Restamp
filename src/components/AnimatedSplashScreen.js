import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import RestampLogo from "./RestampLogo";
import COLORS from "../constants/colors";

const { width } = Dimensions.get("window");

export default function AnimatedSplashScreen({ onAnimationComplete }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(14)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale = useRef(new Animated.Value(1)).current;

  const hasExited = useRef(false);

  const triggerExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(screenScale, {
        toValue: 1.04,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete?.();
    });
  };

  useEffect(() => {
    // 1. Logo entrance (scale + fade-in spring)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Text entrance shortly after logo
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }, 250);

    // 3. Smooth exit transition to main app
    const exitTimer = setTimeout(() => {
      triggerExit();
    }, 1800);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
    };
  }, []);

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Pressable style={styles.pressableArea} onPress={triggerExit}>
        {/* Animated Restamp Brand Emblem */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoCard}>
            <RestampLogo size={88} />
          </View>
        </Animated.View>

        {/* Animated Brand Wordmark & Subtitle */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>
            Res<Text style={styles.brandTitleAccent}>tamp</Text>
          </Text>
          <View style={styles.taglineBadge}>
            <Text style={styles.brandTagline}>INDIA'S VERIFIED PROPERTY PLATFORM</Text>
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
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoCard: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  brandTitleAccent: {
    color: COLORS.primary || "#2563EB",
    fontWeight: "800",
  },
  taglineBadge: {
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  brandTagline: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1.2,
  },
});
