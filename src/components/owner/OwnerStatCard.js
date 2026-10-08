import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import COLORS from "../../constants/colors";

export default function OwnerStatCard({
  label,
  count,
  icon: Icon,
  variant = "neutral", // positive | warning | neutral | primary | info
  onPress,
  style,
}) {
  let indicatorColor = "#64748B";
  let iconBg = "#F1F5F9";
  let iconColor = "#475569";

  if (variant === "positive") {
    indicatorColor = COLORS.success;
    iconBg = "#ECFDF5";
    iconColor = "#059669";
  } else if (variant === "warning") {
    indicatorColor = "#D97706";
    iconBg = "#FFFBEB";
    iconColor = "#D97706";
  } else if (variant === "primary" || variant === "info") {
    indicatorColor = COLORS.primary;
    iconBg = "#EFF6FF";
    iconColor = COLORS.primary;
  }

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        {Icon && (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Icon size={16} color={iconColor} strokeWidth={2.2} />
          </View>
        )}
        <View style={[styles.dotIndicator, { backgroundColor: indicatorColor }]} />
      </View>

      <Text style={styles.countText}>{count}</Text>
      <Text style={styles.labelText}>{label}</Text>
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    minWidth: 96,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countText: {
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
