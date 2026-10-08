
import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import LottieView from "lottie-react-native";

const logoAnimation = require("../../assets/animations/restamp-logo.json");
const { width, height } = Dimensions.get("window");

export default function AnimatedSplashScreen({ onAnimationComplete }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef(null);
  const completedRef = useRef(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 350,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(() => {
      onAnimationComplete?.();
    });
  };

  useEffect(() => {
    // Safety fallback timeout to ensure splash screen dismisses gracefully
    const fallbackTimer = setTimeout(() => {
      handleFinish();
    }, 2400);

    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable style={styles.pressable} onPress={handleFinish}>
        <LottieView
          ref={animationRef}
          source={logoAnimation}
          autoPlay
          loop={false}
          speed={1}
          resizeMode="contain"
          onAnimationFinish={handleFinish}
          style={styles.animation}
          webStyle={{
            width: "100%",
            height: "100%",
            maxWidth: 440,
            maxHeight: 880,
            objectFit: "contain",
          }}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E2840B",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  pressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  animation: {
    width: Math.min(width, 420),
    height: Math.min(height, 840),
  },
});
