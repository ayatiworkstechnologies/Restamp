import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, AccessibilityInfo, View, StyleSheet, Platform } from "react-native";

export const NATIVE_DRIVER = Platform.OS !== "web";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub?.remove?.();
  }, []);
  return reduced;
}

/** Soft expanding ring behind the round FAB. */
export function PulseRing({ size = 58, color = "#2563EB" }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        Animated.delay(1400),
      ])
    );
    v.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [reduced, v]);
  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
      }}
    />
  );
}

/** Fades + slides a chat message in once, when it mounts. */
export function MessageIn({ children, fromRight = false, style }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: reduced ? 150 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [reduced, v]);
  const transform = reduced
    ? []
    : [
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [fromRight ? 12 : -12, 0] }) },
      ];
  return <Animated.View style={[style, { opacity: v, transform }]}>{children}</Animated.View>;
}

/** Three bouncing dots for "Reva is thinking". */
export function TypingDots({ color = "#2563EB" }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(d, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(d, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
          Animated.delay((2 - i) * 140 + 200),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={styles.dotsRow}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 4, height: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
