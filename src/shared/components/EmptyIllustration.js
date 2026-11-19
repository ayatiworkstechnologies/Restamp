// Shared empty-state illustration: the screen's own icon, large, on a tilted
// white tile over soft layered circles with a few floating accent dots.
// Usage: <EmptyIllustration><Phone size={44} color={COLORS.primary} /></EmptyIllustration>
import React from "react";
import { View, StyleSheet } from "react-native";

export default function EmptyIllustration({ children, tone = "default", style }) {
  const err = tone === "error";
  return (
    <View style={[styles.art, style]}>
      <View style={[styles.halo, err && styles.haloError]} />
      <View style={[styles.ring, err && styles.ringError]} />
      <View style={styles.core}>{children}</View>
      <View style={[styles.dot, styles.dotA, err && styles.dotError]} />
      <View style={[styles.dot, styles.dotB, err && styles.dotError]} />
      <View style={[styles.dot, styles.dotC, err && styles.dotError]} />
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    width: 180,
    height: 150,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "#E8EDFB",
  },
  haloError: { backgroundColor: "#FDECEC" },
  ring: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#DCE4FA",
  },
  ringError: { backgroundColor: "#FBDADA" },
  core: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dot: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#B9C7F5",
  },
  dotError: { backgroundColor: "#F5B5B5" },
  dotA: { width: 12, height: 12, top: 10, right: 22 },
  dotB: { width: 8, height: 8, bottom: 18, left: 20 },
  dotC: { width: 6, height: 6, top: 34, left: 12 },
});
