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
  CheckCircle2,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import RestampWordmark from "../../../shared/components/RestampWordmark.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { ensureOwnerRole } from "../../../shared/api/users.js";

export default function OwnerPaymentSuccessScreen({ route, navigation }) {
  const auth = useAuth();
  const planName = route?.params?.planName || "Startup Plan";
  const planValidity = route?.params?.planValidity || "30 Days";
  const listingLimit = route?.params?.listingLimit || "Up to 1 Active Listing";
  const amountPaid = route?.params?.amountPaid || "₹499";
  const txnId = route?.params?.txnId || "—";

  const billedName = auth?.user?.name || auth?.user?.full_name || "Restamp Owner";
  const billedPhone = auth?.user?.phone || auth?.user?.phone_number || "";
  const invoiceDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const redirectTimerRef = useRef(null);

  const handleGoToDashboard = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    ensureOwnerRole(auth).catch(() => {});
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

        <Text style={styles.headerTitle}>Invoice</Text>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() =>
            Alert.alert(
              "Owner Plan",
              "This is a simulated in-app payment: your plan is active in the app, but no real money was charged and no tax invoice was issued."
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
        {/* INVOICE (one page) */}
        <Animated.View style={[styles.invoice, { transform: [{ scale: scaleAnim }] }]}>
          {/* Brand + paid status */}
          <View style={styles.invTop}>
            <RestampWordmark height={16} />
            <View style={styles.paidPill}>
              <Check size={12} color="#16A34A" strokeWidth={3} />
              <Text style={styles.paidPillText}>PAID</Text>
            </View>
          </View>

          <Text style={styles.invHeading}>Invoice</Text>
          <View style={styles.invMetaRow}>
            <View>
              <Text style={styles.invMetaLabel}>Invoice No.</Text>
              <Text style={styles.invMetaVal}>{txnId}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.invMetaLabel}>Date</Text>
              <Text style={styles.invMetaVal}>{invoiceDate}</Text>
            </View>
          </View>

          <View style={styles.invBilled}>
            <Text style={styles.invMetaLabel}>Billed to</Text>
            <Text style={styles.invMetaVal}>{billedName}</Text>
            {billedPhone ? <Text style={styles.invMetaSub}>{billedPhone}</Text> : null}
          </View>

          <View style={styles.invDashed} />

          {/* Line item */}
          <View style={styles.invItemRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.invItemTitle}>{planName}</Text>
              <Text style={styles.invItemSub}>
                Owner plan · {planValidity} · {listingLimit}
              </Text>
            </View>
            <Text style={styles.invItemAmt}>{amountPaid}</Text>
          </View>

          <View style={styles.invDashed} />

          <View style={styles.invSumRow}>
            <Text style={styles.invSumKey}>Subtotal</Text>
            <Text style={styles.invSumVal}>{amountPaid}</Text>
          </View>
          <View style={styles.invSumRow}>
            <Text style={styles.invSumKey}>Payment</Text>
            <Text style={styles.invSumVal}>Successful</Text>
          </View>

          <View style={styles.invTotalRow}>
            <Text style={styles.invTotalKey}>Total Paid</Text>
            <Text style={styles.invTotalVal}>{amountPaid}</Text>
          </View>

          <Text style={styles.invNote}>
            Simulated payment — no real money was charged. This is not a tax invoice.
          </Text>
        </Animated.View>

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
  invoice: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
  },
  invTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paidPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 100,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  paidPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: 0.6,
  },
  invHeading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginTop: 20,
    marginBottom: 14,
  },
  invMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invMetaLabel: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "500",
  },
  invMetaVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 3,
  },
  invMetaSub: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  invBilled: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  invDashed: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    marginVertical: 16,
  },
  invItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  invItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  invItemSub: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 18,
  },
  invItemAmt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  invSumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  invSumKey: {
    fontSize: 13,
    color: "#64748B",
  },
  invSumVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  invTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
  },
  invTotalKey: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  invTotalVal: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },
  invNote: {
    fontSize: 11.5,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
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
    borderRadius: 10,
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
