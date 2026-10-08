import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { WifiOff, RefreshCw, AlertCircle } from "lucide-react-native";
import COLORS from "../../constants/colors";

const { width } = Dimensions.get("window");

/**
 * Animated Shimmering Skeleton Block
 */
export function SkeletonItem({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}) {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton Circle for Avatars and Icons
 */
export function SkeletonCircle({ size = 44, style }) {
  return (
    <SkeletonItem
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

/**
 * Skeleton Card for Properties (matching Restamp UI)
 */
export function SkeletonPropertyCard({ count = 2 }) {
  return (
    <View style={styles.cardContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.propertyCard}>
          {/* Property Image Placeholder */}
          <SkeletonItem height={165} borderRadius={16} />

          {/* Property Content */}
          <View style={styles.propertyCardBody}>
            <View style={styles.rowBetween}>
              <SkeletonItem width={90} height={20} borderRadius={6} />
              <SkeletonItem width={50} height={16} borderRadius={4} />
            </View>

            <View style={{ marginTop: 10 }}>
              <SkeletonItem width="80%" height={18} borderRadius={6} />
            </View>

            <View style={{ marginTop: 8 }}>
              <SkeletonItem width="55%" height={14} borderRadius={4} />
            </View>

            {/* Chips row */}
            <View style={styles.chipsRow}>
              <SkeletonItem width={60} height={22} borderRadius={6} />
              <SkeletonItem width={70} height={22} borderRadius={6} />
              <SkeletonItem width={65} height={22} borderRadius={6} />
            </View>

            {/* Price & CTA row */}
            <View style={[styles.rowBetween, { marginTop: 14 }]}>
              <SkeletonItem width={100} height={24} borderRadius={6} />
              <SkeletonItem width={80} height={32} borderRadius={8} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton Metric Stat Card (for Agent & Owner Dashboards)
 */
export function SkeletonStatCard({ count = 4 }) {
  return (
    <View style={styles.statsGrid}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.statCard}>
          <View style={styles.rowBetween}>
            <SkeletonCircle size={32} />
            <SkeletonItem width={40} height={16} borderRadius={4} />
          </View>
          <View style={{ marginTop: 12 }}>
            <SkeletonItem width={65} height={26} borderRadius={6} />
          </View>
          <View style={{ marginTop: 6 }}>
            <SkeletonItem width={85} height={13} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton Lead Card (for Agent Dashboard)
 */
export function SkeletonLeadCard({ count = 3 }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.leadCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <SkeletonCircle size={46} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonItem width="60%" height={16} borderRadius={5} />
              <SkeletonItem width="40%" height={13} borderRadius={4} />
            </View>
            <SkeletonItem width={65} height={22} borderRadius={6} />
          </View>

          <View style={styles.leadRequirement}>
            <SkeletonItem width="85%" height={13} borderRadius={4} />
          </View>

          <View style={styles.rowBetween}>
            <SkeletonItem width={90} height={15} borderRadius={4} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SkeletonItem width={36} height={36} borderRadius={18} />
              <SkeletonItem width={36} height={36} borderRadius={18} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Complete Full Dashboard Skeleton
 */
export function SkeletonDashboard() {
  return (
    <View style={styles.dashboardContainer}>
      {/* Top Banner Skeleton */}
      <View style={styles.bannerSkeleton}>
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonItem width={110} height={14} borderRadius={4} />
          <SkeletonItem width={180} height={22} borderRadius={6} />
          <SkeletonItem width={140} height={13} borderRadius={4} />
        </View>
        <SkeletonItem width={85} height={85} borderRadius={16} />
      </View>

      {/* Stats Section Header */}
      <View style={[styles.rowBetween, { marginTop: 20, marginBottom: 10 }]}>
        <SkeletonItem width={130} height={18} borderRadius={5} />
        <SkeletonItem width={60} height={14} borderRadius={4} />
      </View>

      {/* 4 Stats Cards */}
      <SkeletonStatCard count={4} />

      {/* Quick Action / Filter Bar */}
      <View style={{ marginTop: 22, marginBottom: 12 }}>
        <SkeletonItem width="100%" height={44} borderRadius={12} />
      </View>

      {/* Leads / Activities Header */}
      <View style={[styles.rowBetween, { marginTop: 14, marginBottom: 12 }]}>
        <SkeletonItem width={120} height={18} borderRadius={5} />
        <SkeletonItem width={50} height={14} borderRadius={4} />
      </View>

      {/* Lead Cards */}
      <SkeletonLeadCard count={3} />
    </View>
  );
}

/**
 * Clean Offline State Component with Retry
 */
export function NoNetworkState({ onRetry, isChecking = false }) {
  return (
    <View style={styles.offlineBox}>
      <View style={styles.offlineIconBg}>
        <WifiOff size={34} color="#DC2626" strokeWidth={1.8} />
      </View>
      <Text style={styles.offlineTitle}>No Internet Connection</Text>
      <Text style={styles.offlineSubtitle}>
        You appear to be offline. Please check your Wi-Fi or mobile data and try again.
      </Text>

      {onRetry && (
        <TouchableOpacity
          style={styles.offlineRetryBtn}
          onPress={onRetry}
          activeOpacity={0.8}
          disabled={isChecking}
        >
          <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.offlineRetryText}>
            {isChecking ? "Reconnecting..." : "Check Connection"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: "#E2E8F0",
  },
  cardContainer: {
    padding: 16,
    gap: 16,
  },
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  propertyCardBody: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: (width - 32 - 10) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  leadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    gap: 10,
  },
  leadRequirement: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
  },
  dashboardContainer: {
    padding: 16,
  },
  bannerSkeleton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    flexDirection: "row",
    alignItems: "center",
  },
  offlineBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  offlineIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  offlineSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 270,
    marginBottom: 20,
  },
  offlineRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary || "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  offlineRetryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
