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
import { MapPin } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import PaymentHeader from "../../../shared/components/PaymentHeader.js";
import PaymentInvoice from "../../../shared/components/PaymentInvoice.js";
import PaymentFooter from "../../../shared/components/PaymentFooter.js";
import { useAuth } from "../../auth/context/AuthContext.js";

export default function AgentPaymentSuccessScreen({ route, navigation }) {
  const auth = useAuth();
  const planName = route?.params?.planName || "Dealer Pro Plan";
  const locationLimit = route?.params?.locationLimit || "10 Locations";
  const selectedLocalities = route?.params?.selectedLocalities || [];
  const planValidity = route?.params?.planValidity || "30 Days";
  const amountPaid = route?.params?.amountPaid || "₹6,999";
  const txnId = route?.params?.txnId || "—";
  const billedName = auth?.user?.name || auth?.user?.full_name || "Restamp Dealer";
  const billedPhone = auth?.user?.phone || auth?.user?.phone_number || "";
  const invoiceDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const redirectTimerRef = useRef(null);

  const handleGoToDashboard = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    // Navigate strictly to AgentNavigator, never to Buyer Home or Owner Dashboard!
    navigation.reset({
      index: 0,
      routes: [{ name: "AgentNavigator" }],
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

  // The plan was saved on the server by the payment screen and applied to
  // AgentContext there; nothing is activated locally here.
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 65,
      useNativeDriver: Platform.OS !== "web",
    }).start();

    // Auto-redirect to Agent Dashboard after ~2.8 seconds
    redirectTimerRef.current = setTimeout(() => {
      handleGoToDashboard();
    }, 2800);

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
            "Dealer Plan",
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
            itemSub={`Dealer plan · ${planValidity} · ${locationLimit}`}
            amount={amountPaid}
          />
        </Animated.View>

        <Text style={styles.redirectText}>Redirecting to Dealer Dashboard in a moment...</Text>

        {/* Agent-specific: covered localities */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Covered Localities ({selectedLocalities.length})</Text>
          <View style={styles.localitiesWrap}>
            {selectedLocalities.map((loc) => (
              <View key={loc} style={styles.localityPill}>
                <MapPin size={11} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.localityPillText}>{loc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Agent-specific: next steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What You Can Do Now</Text>
          {[
            "Browse owner-posted properties in your chosen localities",
            "Contact high-intent verified buyer leads and schedule site visits",
            "Coordinate negotiations and close deals directly on RESTAMP",
          ].map((step) => (
            <View key={step} style={styles.stepItem}>
              <View style={styles.stepDot} />
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <PaymentFooter
        primaryLabel="Go to Dealer Dashboard"
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
    gap: 14,
  },
  redirectText: {
    fontSize: 11.5,
    color: COLORS.lightText,
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  localitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  localityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.pageBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  localityPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
  },
  nextStepsCard: {
    backgroundColor: COLORS.successBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  nextStepsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginTop: 6,
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: "#15803D",
    lineHeight: 18,
  },
});
