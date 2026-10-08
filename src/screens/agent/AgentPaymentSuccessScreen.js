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
  Check,
  ShieldCheck,
  Zap,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react-native";
import COLORS from "../../constants/colors";

export default function AgentPaymentSuccessScreen({ route, navigation }) {
  const planName = route?.params?.planName || "Agent Pro Plan";
  const locationLimit = route?.params?.locationLimit || "10 Locations";
  const selectedLocalities = route?.params?.selectedLocalities || [
    "Anna Nagar",
    "Kilpauk",
    "Mogappair",
    "Adyar",
  ];
  const planValidity = route?.params?.planValidity || "30 Days";
  const amountPaid = route?.params?.amountPaid || "₹6,999";

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

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 65,
      useNativeDriver: true,
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleGoToDashboard}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activation Successful</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Success Badge & Headline */}
        <View style={styles.successCard}>
          <Animated.View style={[styles.badgeCircle, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.innerBadgeCircle}>
              <Check size={32} color="#FFFFFF" strokeWidth={3.2} />
            </View>
          </Animated.View>

          <Text style={styles.statusTitle}>Agent Plan Activated</Text>
          <Text style={styles.statusSubtitle}>
            Your agent access is now active. You have full listing & lead access for your selected Chennai locations.
          </Text>

          <View style={styles.autoRedirectNotice}>
            <Text style={styles.autoRedirectText}>
              Redirecting to Agent Dashboard in a moment...
            </Text>
          </View>
        </View>

        {/* Plan Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsHeader}>Subscription Summary</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan Name</Text>
            <View style={styles.planTag}>
              <Text style={styles.planTagText}>{planName}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location Limit</Text>
            <Text style={styles.detailValueBold}>{locationLimit}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan Validity</Text>
            <Text style={styles.detailValue}>{planValidity}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailPrice}>{amountPaid}</Text>
          </View>

          <View style={styles.divider} />

          {/* Selected Localities */}
          <Text style={styles.localitiesHeader}>Covered Localities ({selectedLocalities.length})</Text>
          <View style={styles.localitiesWrap}>
            {selectedLocalities.map((loc) => (
              <View key={loc} style={styles.localityPill}>
                <MapPin size={11} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.localityPillText}>{loc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Next Steps Card */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What You Can Do Now</Text>
          <View style={styles.stepItem}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>
              Browse owner-posted properties in your chosen localities
            </Text>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>
              Contact high-intent verified buyer leads and schedule site visits
            </Text>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>
              Coordinate negotiations and close deals directly on RESTAMP
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={handleGoToDashboard}
          activeOpacity={0.88}
        >
          <Text style={styles.dashboardBtnText}>Go to Agent Dashboard</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  badgeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  innerBadgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  statusSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  autoRedirectNotice: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  autoRedirectText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  detailsHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  detailValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },
  planTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  localitiesHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
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
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  localityPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
  },
  nextStepsCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
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
    backgroundColor: "#16A34A",
    marginTop: 6,
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: "#15803D",
    lineHeight: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  dashboardBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
