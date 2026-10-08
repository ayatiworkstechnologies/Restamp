import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Crown, Sparkles, ChevronRight } from "lucide-react-native";
import COLORS from "../../constants/colors";
import StatusBadge from "./StatusBadge";

export default function SubscriptionCard({
  subscription,
  onManagePlan,
  style,
}) {
  const planName = subscription?.planName || subscription?.name || "Owner Pro Plan";
  const daysRemaining = subscription?.daysRemaining ?? 24;
  const usedListings = subscription?.usedListings ?? 3;
  const listingLimit = subscription?.listingLimit ?? 5;
  const progressPercent = Math.min(Math.round((usedListings / listingLimit) * 100), 100);

  return (
    <View style={[styles.card, style]}>
      {/* Background Accent Gradient Effect */}
      <View style={styles.topRow}>
        <View style={styles.planHeaderLeft}>
          <View style={styles.crownWrap}>
            <Crown size={18} color="#D97706" />
          </View>
          <View>
            <Text style={styles.planName}>{planName}</Text>
            <Text style={styles.validityText}>{daysRemaining} Days Remaining</Text>
          </View>
        </View>

        <StatusBadge status={subscription?.status || "Active"} />
      </View>

      {/* Usage Progress Section */}
      <View style={styles.usageSection}>
        <View style={styles.usageLabelRow}>
          <Text style={styles.usageLabel}>Active Listing Quota</Text>
          <Text style={styles.usageCount}>
            {usedListings} / {listingLimit} Listings Used
          </Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
              progressPercent >= 100 && { backgroundColor: COLORS.danger },
            ]}
          />
        </View>
      </View>

      {/* Manage Plan Button */}
      <TouchableOpacity
        style={styles.manageBtn}
        onPress={onManagePlan}
        activeOpacity={0.8}
      >
        <Sparkles size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
        <Text style={styles.manageBtnText}>Manage Plan</Text>
        <ChevronRight size={15} color={COLORS.primary} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  planHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  crownWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  validityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  usageSection: {
    marginBottom: 16,
  },
  usageLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  usageCount: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  manageBtn: {
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.primary,
  },
});
