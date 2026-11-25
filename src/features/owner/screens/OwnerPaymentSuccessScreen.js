import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PaymentHeader from "../../../shared/components/PaymentHeader.js";
import PaymentInvoice from "../../../shared/components/PaymentInvoice.js";
import PaymentFooter from "../../../shared/components/PaymentFooter.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { ensureRole } from "../../../shared/api/users.js";

export default function OwnerPaymentSuccessScreen({ route, navigation }) {
  const auth = useAuth();
  const isDealer = route?.params?.kind === "dealer";
  // A dealer buying an owner plan (to post properties) returns to the Dealer
  // page, where My Properties is now unlocked.
  const toDealerPage = isDealer || route?.params?.returnTo === "dealer";
  const planName = route?.params?.planName || "Plan";
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
    // Dealer purchases land on the Dealer page (BROKER mode); owner purchases
    // on Owner (OWNER mode). The backend refuses the other poster type.
    ensureRole(auth, toDealerPage ? "BROKER" : "OWNER").catch(() => {});
    navigation.reset({
      index: 0,
      routes: [{ name: toDealerPage ? "DealerNavigator" : "OwnerNavigator" }],
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

      <PaymentHeader
        title="Invoice"
        onBack={handleGoToDashboard}
        onRightPress={() =>
            Alert.alert(
              "Owner Plan",
              "This is a simulated in-app payment: your plan is active in the app, but no real money was charged and no tax invoice was issued."
            )
          }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <PaymentInvoice
            invoiceNo={txnId}
            date={invoiceDate}
            billedName={billedName}
            billedPhone={billedPhone}
            itemTitle={planName}
            itemSub={`Owner plan · ${planValidity} · ${listingLimit}`}
            amount={amountPaid}
          />
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <PaymentFooter
        primaryLabel={toDealerPage ? "Go to Dealer Dashboard" : "Go to Owner Dashboard"}
        onPrimary={handleGoToDashboard}
        secondaryLabel="View Details in Profile"
        onSecondary={handleGoToProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
});
