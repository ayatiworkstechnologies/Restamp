import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { ScrollView } from "../../../shared/components/KeyboardSafe.js";
import { SafeAreaView } from "react-native-safe-area-context";
import PaymentHeader from "../../../shared/components/PaymentHeader.js";
import PaymentFooter from "../../../shared/components/PaymentFooter.js";
import {
  Plus,
  Check,
  CreditCard,
  Smartphone,
  Building,
  X,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import StatusSheet from "../../../shared/components/StatusSheet.js";
import { useOwner } from "../context/OwnerContext.js";
import { useAgent } from "../../dealerArea/context/DealerAreaContext.js";
import { fetchAgentPlan } from "../../../shared/api/dealerAreaPlans.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";
import { isPosterTypeConflict, posterTypeConflictMessage } from "../../../shared/api/subscriptions.js";
import { subscribeOwnerPlan, subscribeDealerPlan } from "../../../shared/api/ownerPlans.js";

export default function OwnerPaymentScreen({ route, navigation }) {
  const auth = useAuth();
  const { activateSubscription, activateDealerSubscription, refreshPlans } = useOwner();
  const { applyServerPlan } = useAgent();
  const plan = route?.params?.plan || {
    id: "owner-super",
    name: "Super Plan",
    price: "₹999",
    validity: "45 Days",
    listingLimit: 3,
  };
  const totalAmount = route?.params?.totalAmount || 999;
  const formattedAmount = route?.params?.formattedAmount || `₹${totalAmount.toLocaleString("en-IN")}`;
  // Order summary from the confirmed plan (price before coupon, coupon discount).
  const orderAmount = route?.params?.basePrice ?? plan.priceNumeric ?? totalAmount;
  const promoDiscount = route?.params?.discount ?? 0;
  const inr = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [selectedMethodId, setSelectedMethodId] = useState("card_1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetStatus, setSheetStatus] = useState(null); // "processing" | "success" | null
  const pendingSuccess = useRef(null);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");

  // Card details state
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 8463");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardCvv, setCardCvv] = useState("•••");

  // UPI state
  const [upiId, setUpiId] = useState("raj.kumar@okhdfcbank");

  // Net banking state
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");

  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: "card_1",
      type: "card",
      title: "Card Details",
      subtitle: "Credit or Debit Card • Visa, Master, RuPay",
    },
    {
      id: "upi_1",
      type: "upi",
      title: "Google Pay / UPI",
      subtitle: "raj.kumar@okhdfcbank",
    },
    {
      id: "netbanking_1",
      type: "netbanking",
      title: "Net Banking",
      subtitle: "All Indian Banks (HDFC, SBI, ICICI, Axis)",
    },
  ]);

  // Simulated payment (no gateway connected yet), same as the agent flow.

  // Expired session (401): the stale session has been cleared app-wide; offer
  // Log in, then retry this payment once the user is back.
  const requireAuth = useRequireAuth(navigation);
  const promptRelogin = () =>
    Alert.alert("Session expired", "Your login has expired. Log in again to complete your purchase.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log in", onPress: () => requireAuth(() => handlePay(true)) },
    ]);

  const handlePay = (shouldSucceed = true) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSheetStatus("processing");
    setTimeout(() => {
      setIsProcessing(false);
      if (!shouldSucceed) {
        setSheetStatus(null);
        Alert.alert("Payment Failed", "The payment could not be completed. Please try again.");
        return;
      }
      const txnId = `SIM-${Date.now().toString().slice(-8)}`;
      const isDealer = plan?.kind === "dealer";
      // Activate on the server FIRST (payment bypass, no money charged) and
      // show success only once it confirms. activatePlan switches the app
      // mode to OWNER / BROKER as the backend requires.
      const save = isDealer
        ? subscribeDealerPlan(plan.id, plan.localities || []).then(async () => {
            activateDealerSubscription({ ...plan, amountPaid: formattedAmount, txnId });
            const server = await fetchAgentPlan();
            if (server) applyServerPlan?.(server);
          })
        : subscribeOwnerPlan(plan.id).then(() => {
            activateSubscription({ ...plan, amountPaid: formattedAmount, txnId });
          });
      save
        .then(() => {
          auth?.refreshMe?.().catch?.(() => {});
          refreshPlans?.();
          const areaCount = (plan.localities || []).length;
          pendingSuccess.current = ["OwnerPaymentSuccess", {
            kind: isDealer ? "dealer" : "owner",
            returnTo: plan.returnTo,
            planName: plan.name,
            planValidity: plan.validity || "30 Days",
            listingLimit: isDealer
              ? `Sales Hub · ${areaCount} area${areaCount === 1 ? "" : "s"}`
              : `Up to ${plan.listingLimit || 1} Active Listing${(plan.listingLimit || 1) > 1 ? "s" : ""}`,
            amountPaid: formattedAmount,
            txnId,
          }];
          setSheetStatus("success");
        })
        .catch((e) => {
          setSheetStatus(null);
          if (isPosterTypeConflict(e)) {
            Alert.alert("Plan not available on this account", posterTypeConflictMessage(e));
          } else if (e?.status === 401 || e?.kind === "login") {
            promptRelogin();
          } else {
            const msg = typeof e?.detail === "string" ? e.detail : e?.data?.message;
            Alert.alert("Couldn't activate plan", msg || "The plan could not be activated. Please try again.");
          }
        });
    }, 1200);
  };

  const handleAddNewMethod = () => {
    if (newUpiId.trim()) {
      const newMethod = {
        id: `upi_${Date.now()}`,
        type: "upi",
        title: "Custom UPI",
        subtitle: newUpiId.trim(),
      };
      setPaymentMethods([...paymentMethods, newMethod]);
      setSelectedMethodId(newMethod.id);
      setUpiId(newUpiId.trim());
      setNewUpiId("");
      setShowAddMethodModal(false);
    }
  };

  const renderMethodIcon = (type) => {
    if (type === "card") {
      return (
        <View style={styles.cardIconBox}>
          <CreditCard size={22} color={COLORS.primary} strokeWidth={1.9} />
        </View>
      );
    }
    if (type === "upi") {
      return (
        <View style={styles.upiIconBox}>
          <Smartphone size={20} color={COLORS.primary} strokeWidth={2} />
        </View>
      );
    }
    return (
      <View style={styles.bankIconBox}>
        <Building size={20} color={COLORS.primary} strokeWidth={2} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <PaymentHeader
        title="Payment Method"
        onBack={() => navigation.goBack()}
        onRightPress={() => handlePay(false)}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PAYMENT METHODS CONTAINER */}
        <View style={styles.methodsCard}>
          {paymentMethods.map((method, index) => {
            const isSelected = selectedMethodId === method.id;
            const isLast = index === paymentMethods.length - 1;

            return (
              <View key={method.id} style={[styles.methodCardItem, isSelected && styles.methodCardItemActive]}>
                <TouchableOpacity
                  style={styles.methodRow}
                  onPress={() => setSelectedMethodId(method.id)}
                  activeOpacity={0.8}
                >
                  {/* Left Method Icon Box */}
                  <View style={styles.methodIconWrapper}>
                    {renderMethodIcon(method.type)}
                  </View>

                  {/* Method Title & Subtitle */}
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>{method.title}</Text>
                    <Text style={styles.methodSubtitle}>
                      {method.id === "upi_1" ? upiId : method.subtitle}
                    </Text>
                  </View>

                  {/* Right Radio / Check Circle */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected ? styles.radioCircleSelected : styles.radioCircleUnselected,
                    ]}
                  >
                    {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {/* INLINE DETAILS: Expandable fields based on selection */}
                {isSelected && method.id === "card_1" && (
                  <View style={styles.inlineFieldsBox}>
                    <Text style={styles.inlineLabel}>Card Number</Text>
                    <TextInput
                      style={styles.inlineInput}
                      value={cardNumber}
                      onChangeText={setCardNumber}
                      placeholder="4242 4242 4242 8463"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      underlineColorAndroid="transparent"
                    />

                    <View style={styles.inlineRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.inlineLabel}>Expiry Date</Text>
                        <TextInput
                          style={styles.inlineInput}
                          value={cardExpiry}
                          onChangeText={setCardExpiry}
                          placeholder="MM/YY"
                          placeholderTextColor="#94A3B8"
                          underlineColorAndroid="transparent"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inlineLabel}>CVV</Text>
                        <TextInput
                          style={styles.inlineInput}
                          value={cardCvv}
                          onChangeText={setCardCvv}
                          secureTextEntry
                          placeholder="123"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          underlineColorAndroid="transparent"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {isSelected && method.id === "upi_1" && (
                  <View style={styles.inlineFieldsBox}>
                    <Text style={styles.inlineLabel}>Enter UPI ID / VPA</Text>
                    <TextInput
                      style={styles.inlineInput}
                      value={upiId}
                      onChangeText={setUpiId}
                      placeholder="yourname@okhdfcbank"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                )}

                {isSelected && method.id === "netbanking_1" && (
                  <View style={styles.inlineFieldsBox}>
                    <Text style={styles.inlineLabel}>Choose Your Bank</Text>
                    <View style={styles.bankChipsWrap}>
                      {["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak", "Other Banks"].map((bank) => (
                        <TouchableOpacity
                          key={bank}
                          style={[
                            styles.bankChip,
                            selectedBank === bank && styles.bankChipActive,
                          ]}
                          onPress={() => setSelectedBank(bank)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.bankChipText,
                              selectedBank === bank && styles.bankChipTextActive,
                            ]}
                          >
                            {bank}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* + Add Payment Method Button */}
          <TouchableOpacity
            style={styles.addMethodBtn}
            onPress={() => setShowAddMethodModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} color={COLORS.primary} strokeWidth={2.4} style={{ marginRight: 6 }} />
            <Text style={styles.addMethodBtnText}>Add Payment Method</Text>
          </TouchableOpacity>
        </View>

        {/* ORDER SUMMARY */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Order Amount</Text>
            <Text style={styles.summaryVal}>{inr(orderAmount)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Promo-code</Text>
            <Text style={[styles.summaryVal, { color: "#16A34A" }]}>
              {promoDiscount > 0 ? `-${inr(promoDiscount)}` : inr(0)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Listing Limit</Text>
            <Text style={styles.summaryVal}>Up to 5 Properties</Text>
          </View>

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
              {totalAmount === 2999 ? "2,699.00" : formattedAmount.replace("₹", "")}
            </Text>
          </View>
        </View>

        {/* Simulation Notice for Verification */}
        <TouchableOpacity
          style={styles.simulateFailLink}
          onPress={() => handlePay(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.simulateFailText}>Simulate Payment Failure</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      <PaymentFooter primaryLabel="Pay Now" onPrimary={() => handlePay(true)} loading={isProcessing} />

      <StatusSheet
        visible={sheetStatus !== null}
        status={sheetStatus || "processing"}
        subtitle={sheetStatus === "success" ? "Your plan is now active" : "Your payment is processing"}
        buttonText="Continue"
        onButtonPress={() => {
          const args = pendingSuccess.current;
          setSheetStatus(null);
          pendingSuccess.current = null;
          if (args) navigation.navigate(...args);
        }}
      />

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddMethodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMethodModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAddMethodModal(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add UPI ID</Text>
              <TouchableOpacity onPress={() => setShowAddMethodModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inlineLabel}>Enter UPI ID / VPA</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. mobile@okhdfcbank"
              placeholderTextColor="#94A3B8"
              value={newUpiId}
              onChangeText={setNewUpiId}
              autoCapitalize="none"
              underlineColorAndroid="transparent"
            />

            <TouchableOpacity
              style={styles.modalAddBtn}
              onPress={handleAddNewMethod}
              activeOpacity={0.8}
            >
              <Text style={styles.modalAddBtnText}>Save Payment Method</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  methodCardItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
  },
  methodCardItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#F8FBFF",
  },
  methodsCard: {
    gap: 12,
    marginBottom: 20,
  },
  methodItemContainerBorder: {
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  methodIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 100,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardIconBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  upiIconBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  bankIconBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  methodSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  radioCircleUnselected: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  inlineFieldsBox: {
    marginHorizontal: 14,
    marginBottom: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
  },
  inlineLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  inlineInput: {
    height: 48,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 12,
  },
  inlineRow: {
    flexDirection: "row",
  },
  bankChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bankChip: {
    paddingHorizontal: 14,
    height: 36,
    justifyContent: "center",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  bankChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  bankChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  bankChipTextActive: {
    color: "#FFFFFF",
  },
  addMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 100,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
  },
  addMethodBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
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
  simulateFailLink: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  simulateFailText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#94A3B8",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111111",
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111111",
    marginBottom: 16,
    outlineStyle: "none",
    outlineWidth: 0,
  },
  modalAddBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  modalAddBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
});
