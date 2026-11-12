// Bottom-sheet status popup: "processing" (flying paper plane) and
// "success" (scalloped check badge). Brand blue, white sheet, pill button.
import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import COLORS from "../constants/colors.js";

const BLUE = COLORS.primary || "#2563EB";
const BLUE_DARK = "#1E40AF";

function PlaneIcon({ size = 96 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* speed lines */}
      <Path d="M8 52 L26 44" stroke={BLUE} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M14 66 L28 58" stroke="#0F172A" strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M30 72 L40 64" stroke={BLUE} strokeWidth={3.5} strokeLinecap="round" />
      {/* plane */}
      <Path d="M22 40 L92 18 L60 66 Z" fill={BLUE} />
      <Path d="M44 46 L92 18 L48 64 Z" fill={BLUE_DARK} />
      <Path d="M44 46 L48 64 L40 70 Z" fill="#0F172A" />
    </Svg>
  );
}

function SuccessBadge({ size = 96 }) {
  const bumps = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 30, y: 50 + Math.sin(a) * 30 };
  });
  const Scallop = ({ dx = 0, dy = 0, fill }) => (
    <G>
      <Circle cx={50 + dx} cy={50 + dy} r={32} fill={fill} />
      {bumps.map((b, i) => (
        <Circle key={i} cx={b.x + dx} cy={b.y + dy} r={11} fill={fill} />
      ))}
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Scallop dx={2.5} dy={3.5} fill="#0F172A" />
      <Scallop fill={BLUE} />
      <Path
        d="M36 51 L46 61 L65 41"
        stroke="#FFFFFF"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * <StatusSheet visible status="processing" | "success"
 *   title subtitle buttonText onButtonPress />
 */
export default function StatusSheet({
  visible,
  status = "processing",
  title,
  subtitle,
  buttonText = "Continue",
  onButtonPress,
}) {
  const useNative = Platform.OS !== "web";
  const float = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || status !== "processing") return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(float, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, status]);

  useEffect(() => {
    if (visible && status === "success") {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: useNative }).start();
    }
  }, [visible, status]);

  const isSuccess = status === "success";

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.iconBox}>
            {isSuccess ? (
              <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], opacity: pop }}>
                <SuccessBadge />
              </Animated.View>
            ) : (
              <Animated.View
                style={{
                  transform: [
                    { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [4, -6] }) },
                    { translateX: float.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] }) },
                  ],
                }}
              >
                <PlaneIcon />
              </Animated.View>
            )}
          </View>
          <Text style={styles.title}>{title || (isSuccess ? "Success!" : "Processing...")}</Text>
          <Text style={styles.subtitle}>
            {subtitle || (isSuccess ? "Your payment was successful" : "Your payment is processing")}
          </Text>
          {isSuccess && onButtonPress ? (
            <TouchableOpacity style={styles.btn} onPress={onButtonPress} activeOpacity={0.85}>
              <Text style={styles.btnText}>{buttonText}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 8 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 32,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 100,
    backgroundColor: "#E2E8F0",
    marginBottom: 28,
  },
  iconBox: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
  },
  btn: {
    marginTop: 24,
    height: 48,
    paddingHorizontal: 36,
    borderRadius: 100,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
