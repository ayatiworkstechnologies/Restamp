import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { WifiOff, AlertCircle, RefreshCw } from "lucide-react-native";
import COLORS from "../../constants/colors";
import EmptyState from "./EmptyState";
import PrimaryButton from "./PrimaryButton";

export function SkeletonLoader({ count = 3, type = "card" }) {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
            <View style={styles.skeletonMetaRow}>
              <View style={styles.skeletonPill} />
              <View style={styles.skeletonPill} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load the information. Please check your connection and try again.",
  onRetry,
  isOffline = false,
}) {
  const Icon = isOffline ? WifiOff : AlertCircle;

  return (
    <View style={styles.errorContainer}>
      <View style={[styles.errorIconCircle, isOffline && { backgroundColor: "#FEF2F2" }]}>
        <Icon size={36} color={isOffline ? COLORS.danger : "#D97706"} strokeWidth={1.8} />
      </View>
      <Text style={styles.errorTitle}>{isOffline ? "You are Offline" : title}</Text>
      <Text style={styles.errorMessage}>
        {isOffline
          ? "No internet connection detected. Please reconnect to continue."
          : message}
      </Text>

      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    padding: 16,
    gap: 16,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  skeletonImage: {
    height: 140,
    backgroundColor: "#E2E8F0",
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonTitle: {
    width: "70%",
    height: 18,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
    marginBottom: 10,
  },
  skeletonSubtitle: {
    width: "45%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    marginBottom: 14,
  },
  skeletonMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonPill: {
    width: 60,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  errorIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 20,
    fontWeight: "400",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
});
