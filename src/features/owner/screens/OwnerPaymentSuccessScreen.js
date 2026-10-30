import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MoreVertical,
  Check,
  ShieldCheck,
  Zap,
  AlertCircle,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";

export default function OwnerPaymentSuccessScreen({ route, navigation }) {
  const planName = route?.params?.planName || "Owner Pro Plan";
  const planValidity = route?.params?.planValidity || "3 Months";
  const listingLimit = route?.params?.listingLimit || "Up to 5 Active Listings";
  const amountPaid = route?.params?.amountPaid || "₹2,999";

  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const redirectTimerRef = useRef(null);

  const handleGoToDashboard = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    // Navigate strictly to OwnerNavigator, never to Buyer Home!
    navigation.reset({
      index: 0,
      routes: [{ name: "OwnerNavigator" }],
    });
  };

  const handleGoToProfile = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs", params: { screen: "Profile" } }],
    });
  };

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 65,
      useNativeDriver: Platform.OS !== "web",
    }).start();

    // Auto-redirect to Owner Dashboard after ~3 seconds
    redirectTimerRef.current = setTimeout(() => {
      handleGoToDashboard();
    }, 3200);

    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER: Circular Back Button | Centered Title | Circular More Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleGoToDashboard}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111111" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Payment Successful</Text>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() =>
            Alert.alert(
              "Owner Plan",
              "Owner plan payments are not yet available. No payment was processed and no invoice or transaction was issued."
            )
          }
          activeOpacity={0.7}
        >
          <MoreVertical size={20} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: PAYMENT NOT AVAILABLE */}
        <View style={styles.successCard}>
          <AlertCircle size={28} color="#D97706" />
          <Text style={styles.statusTitle}>Payments Not Available</Text>
          <Text style={styles.statusSubtitle}>
            Owner plan payments are not yet available. No payment was processed, no invoice was issued, and no plan was activated.
          </Text>
        </View>

        {/* CARD 2: SUBSCRIPTION STATUS */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Subscription Status</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Plan</Text>
            <Text style={styles.summaryVal}>{planName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Status</Text>
            <Text style={styles.summaryVal}>Not activated</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Transaction</Text>
            <Text style={styles.summaryVal}>None</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Invoice</Text>
            <Text style={styles.summaryVal}>None</Text>
          </View>
        </View>

        {/* Redirect Notice Card */}
        <View style={styles.redirectNoticeBox}>
          <Zap size={14} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={styles.redirectNoticeText}>
            Redirecting to Owner Dashboard in 3 seconds...
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* BOTTOM FIXED CTA: Go to Dashboard + View Details in Profile */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleGoToDashboard}
          activeOpacity={0.88}
        >
          <Text style={styles.ctaButtonText}>Go to Owner Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryProfileBtn}
          onPress={handleGoToProfile}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryProfileBtnText}>View Details in Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.3,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  badgeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  innerBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#111111",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  txnBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  txnBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#15803D",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: "#111111",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryKey: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111111",
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111111",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "500",
    color: "#111111",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0F172A",
  },
  redirectNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFBEB",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  redirectNoticeText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "400",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  ctaButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  secondaryProfileBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryProfileBtnText: {
    color: "#334155",
    fontSize: 14.5,
    fontWeight: "600",
  },
});
