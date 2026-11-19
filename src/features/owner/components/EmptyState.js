import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Building2, Plus } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import PrimaryButton from "./PrimaryButton.js";

export default function EmptyState({
  icon: Icon = Building2,
  title = "No Properties Yet",
  description = "Start by adding your first property.",
  buttonTitle = "Add Property",
  onButtonPress,
  tone = "default",
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.art}>
        <View style={[styles.halo, tone === "error" && styles.haloError]} />
        <View style={[styles.ring, tone === "error" && styles.ringError]} />
        <View style={styles.core}>
        <Icon size={44} color={tone === "error" ? "#EF4444" : COLORS.primary} strokeWidth={1.6} />
        </View>
        <View style={[styles.dot, styles.dotA, tone === "error" && styles.dotError]} />
        <View style={[styles.dot, styles.dotB, tone === "error" && styles.dotError]} />
        <View style={[styles.dot, styles.dotC, tone === "error" && styles.dotError]} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {buttonTitle && onButtonPress && (
        <PrimaryButton
          title={buttonTitle}
          onPress={onButtonPress}
          icon={Plus}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E9F0",
    marginTop: 6,
  },
  // Empty-state illustration (icon on tilted tile over soft circles)
  art: { width: 180, height: 150, marginBottom: 20, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 148, height: 148, borderRadius: 74, backgroundColor: "#E8EDFB" },
  haloError: { backgroundColor: "#FDECEC" },
  ring: { position: "absolute", width: 112, height: 112, borderRadius: 56, backgroundColor: "#DCE4FA" },
  ringError: { backgroundColor: "#FBDADA" },
  core: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
    shadowColor: COLORS.textDark,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dot: { position: "absolute", borderRadius: 999, backgroundColor: "#B9C7F5" },
  dotError: { backgroundColor: "#F5B5B5" },
  dotA: { width: 12, height: 12, top: 10, right: 22 },
  dotB: { width: 8, height: 8, bottom: 18, left: 20 },
  dotC: { width: 6, height: 6, top: 34, left: 12 },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 280,
    fontWeight: "400",
  },
  button: {
    minWidth: 160,
  },
});
