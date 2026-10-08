import React from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

export default function StatusBadge({ status, style, textStyle }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  let bg = "#F1F5F9";
  let textColor = "#475569";
  let label = status.toUpperCase();

  switch (normalized) {
    case "active":
      bg = "#F0FDF4";
      textColor = "#16A34A";
      label = "ACTIVE";
      break;
    case "pending":
    case "pending verification":
      bg = "#FFFBEB";
      textColor = "#D97706";
      label = "PENDING VERIFICATION";
      break;
    case "rejected":
      bg = "#FEF2F2";
      textColor = "#DC2626";
      label = "REJECTED";
      break;
    case "expired":
      bg = "#F8FAFC";
      textColor = "#64748B";
      label = "EXPIRED";
      break;
    case "closed":
      bg = "#F1F5F9";
      textColor = "#475569";
      label = "CLOSED";
      break;
    case "draft":
      bg = "#F1F5F9";
      textColor = "#64748B";
      label = "DRAFT";
      break;
    // Leads Statuses
    case "new":
    case "new lead":
      bg = "#EFF6FF";
      textColor = COLORS.primary;
      label = "NEW LEAD";
      break;
    case "contacted":
      bg = "#EEF2FF";
      textColor = "#4F46E5";
      label = "CONTACTED";
      break;
    case "visit_scheduled":
    case "visit scheduled":
      bg = "#FAF5FF";
      textColor = "#9333EA";
      label = "VISIT SCHEDULED";
      break;
    case "visited":
      bg = "#F0FDF4";
      textColor = "#16A34A";
      label = "VISITED";
      break;
    case "negotiating":
      bg = "#ECFEFF";
      textColor = "#0891B2";
      label = "NEGOTIATING";
      break;
    case "rented":
      bg = "#F0FDF4";
      textColor = "#16A34A";
      label = "RENTED";
      break;
    case "sold":
      bg = "#F0FDF4";
      textColor = "#16A34A";
      label = "SOLD";
      break;
    case "leased":
      bg = "#F0FDF4";
      textColor = "#16A34A";
      label = "LEASED";
      break;
    case "lost":
    case "lost / not interested":
      bg = "#FEF2F2";
      textColor = "#DC2626";
      label = "LOST";
      break;
    default:
      label = status.toUpperCase();
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color: textColor }, textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.4,
  },
});
