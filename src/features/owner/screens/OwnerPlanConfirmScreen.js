import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ScrollView } from "../../../shared/components/KeyboardSafe.js";
import { SafeAreaView } from "react-native-safe-area-context";
import PaymentHeader from "../../../shared/components/PaymentHeader.js";
import PaymentFooter from "../../../shared/components/PaymentFooter.js";
import {
  Crown,
  Check,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";
import { formatListingLimit } from "../data/ownerPlans.js";

export default function OwnerPlanConfirmScreen({ route, navigation }) {
  const plan = route?.params?.plan || {
    id: "owner-super",
    name: "Super Plan",
    price: "₹999",
    priceNumeric: 999,
    validity: "45 Days",
    listingLimit: 3,
    features: [
      "Unlimited Leads",
      "City Limit Reach",
    ],
  };

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  const isDealer = plan.kind === "dealer";
  const basePrice = plan.priceNumeric || 999;
  // Dealer totals are rate × pincodes and are charged as-is (no coupon).
  const totalAmount = Math.max(0, basePrice - (isDealer ? 0 : discount));

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "RESTAMP" || code === "OWNER10" || code === "PROMO") {
      setDiscount(300);
      setCouponApplied(true);
    } else {
      setDiscount(0);
      setCouponApplied(false);
      Alert.alert("Invalid Code", "Please enter a valid coupon code like RESTAMP or OWNER10.");
    }
  };

  const requireAuth = useRequireAuth(navigation);

  const handleProceedToPayment = () => {
    requireAuth(() => {
      navigation.navigate("OwnerPayment", {
        plan,
        basePrice,
        discount: isDealer ? 0 : discount,
        totalAmount,
        formattedAmount: `₹${totalAmount.toLocaleString("en-IN")}`,
      });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <PaymentHeader
        title="Confirm Plan"
        onBack={() => navigation.goBack()}
        onRightPress={() =>
            Alert.alert(
              "Plan Information",
              `${plan.name} gives you up to ${formatListingLimit(plan.listingLimit)} active listings with 0% brokerage assurance.`
            )
          }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: SELECTED PLAN CONTAINER */}
        <View style={styles.planCard}>
          <View style={styles.planMainRow}>
            {/* Left Crown / Star Badge */}
            <View style={styles.planIconWrapper}>
              <Crown size={22} color="#2563EB" strokeWidth={2.2} />
            </View>

            {/* Plan Info */}
            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>{plan.name}</Text>
              <Text style={styles.planSubtitle}>
                {isDealer
                  ? `${plan.validity} • ${plan.pincodes?.length || 0} pincode${(plan.pincodes?.length || 0) === 1 ? "" : "s"}`
                  : `${plan.validity} • Up to ${formatListingLimit(plan.listingLimit)} Listings`}
              </Text>
              {isDealer && !!plan.pincodes?.length && (
                <Text style={styles.planSubtitle} numberOfLines={3}>
                  {plan.pincodes.join(", ")}
                </Text>
              )}
            </View>

            {/* Right Selected Circle Badge */}
            <View style={styles.selectedCheckCircle}>
              <Check size={13} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>

          {/* Benefits Checklist */}
          <View style={styles.benefitsDivider} />
          <View style={styles.benefitsList}>
            {(plan.features && plan.features.length > 0 ? plan.features : [
              "0% Brokerage & direct buyer inquiries",
              "Verified Owner badge on search results",
              "Site visit scheduling & priority placement",
            ]).map((feat, fIdx) => (
              <View key={fIdx} style={styles.benefitItem}>
                <CheckCircle2 size={13} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.benefitText}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CARD 2: PROMO CODE ENTRY (owner plans only) */}
        {!isDealer && (
        <View style={styles.promoCard}>
          <View style={styles.promoInputRow}>
            <Tag size={18} color="#64748B" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.promoInput}
              placeholder="Enter Promo Code (e.g. RESTAMP)"
              placeholderTextColor="#94A3B8"
              value={couponCode}
              onChangeText={(text) => {
                setCouponCode(text);
                if (couponApplied) setCouponApplied(false);
              }}
              autoCapitalize="characters"
              underlineColorAndroid="transparent"
            />
            <TouchableOpacity
              style={[styles.applyPillBtn, couponApplied && styles.applyPillBtnActive]}
              onPress={handleApplyCoupon}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.applyPillBtnText,
                  couponApplied && styles.applyPillBtnTextActive,
                ]}
              >
                {couponApplied ? "Applied" : "Apply"}
              </Text>
            </TouchableOpacity>
          </View>
          {couponApplied && (
            <Text style={styles.promoSuccessText}>
              Promo code applied successfully! ₹{discount}.00 saved.
            </Text>
          )}
        </View>
        )}

        {/* CARD 3: ORDER SUMMARY */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Order Amount</Text>
            <Text style={styles.summaryVal}>₹{basePrice.toFixed(2)}</Text>
          </View>

          {isDealer && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Rate</Text>
              <Text style={styles.summaryVal}>
                ₹{plan.ratePerPincode} × {plan.pincodes?.length || 0} pincode{(plan.pincodes?.length || 0) === 1 ? "" : "s"}
              </Text>
            </View>
          )}

          {!isDealer && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Promo-code</Text>
            <Text style={[styles.summaryVal, { color: discount > 0 ? "#16A34A" : "#111111" }]}>
              {discount > 0 ? `-₹${discount.toFixed(2)}` : "₹0.00"}
            </Text>
          </View>
          )}

          {!isDealer && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Listing Limit</Text>
            <Text style={styles.summaryVal}>Up to {formatListingLimit(plan.listingLimit)} Properties</Text>
          </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Tax (18% GST)</Text>
            <Text style={styles.summaryVal}>Included</Text>
          </View>

          {/* Dashed Separator */}
          <View style={styles.dashedDivider} />

          {/* Total Amount Row with highlight */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              <Text style={styles.currencySymbol}>₹ </Text>
              {totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Assurance Box */}
        <View style={styles.assuranceBox}>
          <ShieldCheck size={16} color="#16A34A" style={{ marginRight: 8 }} />
          <Text style={styles.assuranceText}>
            100% money-back guarantee if you don't receive buyer inquiries in 30 days.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <PaymentFooter primaryLabel="Proceed to Payment" onPrimary={handleProceedToPayment} />
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
    paddingBottom: 24,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  planMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111111",
  },
  planSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "400",
  },
  selectedCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  benefitsDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 14,
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  benefitText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "400",
  },
  promoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  promoInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  promoInput: {
    flex: 1,
    fontSize: 13,
    color: "#111111",
    fontWeight: "500",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  applyPillBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  applyPillBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  applyPillBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111111",
  },
  applyPillBtnTextActive: {
    color: "#FFFFFF",
  },
  promoSuccessText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "500",
    marginTop: 8,
    marginLeft: 28,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
  assuranceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  assuranceText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "400",
    flex: 1,
  },
});
