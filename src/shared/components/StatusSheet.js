// Full-screen payment status: "processing" (quiet spinner) and "success"
// (check mark). Minimal motion: a short fade between states, nothing loops
// except the platform spinner. Same props as the old bottom sheet, so the
// payment screens use it unchanged.
import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, Platform } from "react-native";
import Svg, { Path } from "react-native-svg";
import COLORS from "../constants/colors.js";

const BLUE = COLORS.primary || "#2563EB";

function CheckMark({ size = 72 }) {
  return (
    <View style={[styles.checkCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24">
        <Path d="M5 12.5 L10 17.5 L19 7.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
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
  const fade = useRef(new Animated.Value(0)).current;
  const isSuccess = status === "success";

  // One gentle fade-in each time the state changes.
  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: useNative }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, status]);

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.screen}>
        <Animated.View style={[styles.center, { opacity: fade }]}>
          <View style={styles.iconBox}>
            {isSuccess ? <CheckMark /> : <ActivityIndicator size="large" color={BLUE} />}
          </View>
          <Text style={styles.title}>{title || (isSuccess ? "Success!" : "Processing...")}</Text>
          <Text style={styles.subtitle}>
            {subtitle || (isSuccess ? "Your payment was successful" : "Your payment is processing")}
          </Text>
        </Animated.View>
        {isSuccess && onButtonPress ? (
          <Animated.View style={[styles.footer, { opacity: fade }]}>
            <TouchableOpacity style={styles.btn} onPress={onButtonPress} activeOpacity={0.85}>
              <Text style={styles.btnText}>{buttonText}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconBox: { height: 88, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  checkCircle: { backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A", letterSpacing: -0.3, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 6, textAlign: "center", lineHeight: 20 },
  footer: { paddingBottom: Platform.OS === "ios" ? 44 : 28 },
  btn: {
    height: 52,
    borderRadius: 100,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
