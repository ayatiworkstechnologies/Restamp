// Shared bottom action bar for plan / checkout / payment-result screens:
// one primary CTA (+ optional secondary pill), with loading and disabled
// states. Extracted from the Owner payment-success screen.
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import COLORS from "../constants/colors.js";

export default function PaymentFooter({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  loading = false,
  disabled = false,
  note, // small line above the buttons, e.g. "Simulated payment — …"
  style,
}) {
  const blocked = disabled || loading;
  return (
    <View style={[styles.bar, style]}>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <TouchableOpacity
        style={[styles.primary, blocked && styles.primaryBlocked]}
        onPress={onPrimary}
        disabled={blocked}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        )}
      </TouchableOpacity>

      {secondaryLabel ? (
        <TouchableOpacity
          style={styles.secondary}
          onPress={onSecondary}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  note: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
  },
  primary: {
    height: 54,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBlocked: {
    opacity: 0.7,
  },
  primaryText: {
    color: COLORS.white,
    fontSize: 15.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  secondary: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryText: {
    color: "#334155",
    fontSize: 14.5,
    fontWeight: "600",
  },
});
