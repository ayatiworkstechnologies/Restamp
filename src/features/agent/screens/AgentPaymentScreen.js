import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { ScrollView } from "../../../shared/components/KeyboardSafe.js";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MoreVertical,
  Plus,
  Check,
  CreditCard,
  Smartphone,
  Building,
  X,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import StatusSheet from "../../../shared/components/StatusSheet.js";
import { useAgent } from "../context/AgentContext.js";
import { subscribeAgentPlan } from "../../../shared/api/agentPlans.js";

export default function AgentPaymentScreen({ route, navigation }) {
  const { applyServerPlan } = useAgent();

  const plan = route?.params?.plan || {
    id: "agent-pro",
    name: "Agent Pro Plan",
    locationLimit: 10,
    price: "₹6,999",
    priceNumeric: 6999,
    validity: "30 Days",
  };

  const selectedLocalities = route?.params?.selectedLocalities || [
    "Anna Nagar",
    "Kilpauk",
    "Mogappair",
    "Adyar",
  ];

  const totalAmount = route?.params?.totalAmount || 6999;
  const formattedAmount =
    route?.params?.formattedAmount || `₹${totalAmount.toLocaleString("en-IN")}`;

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
  const [upiId, setUpiId] = useState("agent.restamp@okhdfcbank");

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
      subtitle: "agent.restamp@okhdfcbank",
    },
    {
      id: "netbanking_1",
      type: "netbanking",
      title: "Net Banking",
      subtitle: "All Indian Banks (HDFC, SBI, ICICI, Axis)",
    },
  ]);

  // The purchase is saved on the server (POST /broker/plans/{id}/subscribe):
  // it grants the chosen localities and makes this account an agent, so the
  // plan is still there after a reload or the next login. PAYMENT IS
  // SIMULATED server-side — no money is charged.
  const handlePay = (shouldSucceed = true) => {
    if (isProcessing) return;
    if (!shouldSucceed) {
      navigation.goBack();
      return;
    }
    setIsProcessing(true);
    setSheetStatus("processing");
    subscribeAgentPlan(plan.id, selectedLocalities)
      .then((server) => {
        applyServerPlan(server);
        const unmatched = Array.isArray(server?.unmatched_localities) ? server.unmatched_localities : [];
        pendingSuccess.current = ["AgentPaymentSuccess", {
          planName: server?.plan_name || plan.name,
          locationLimit: `${(server?.localities || selectedLocalities).length} Localities (${server?.locality_limit || plan.locationLimit || 10} Limit)`,
          selectedLocalities: server?.localities || selectedLocalities,
          planValidity: plan.validity || "30 Days",
          amountPaid: formattedAmount,
        }];
        setSheetStatus("success");
        if (unmatched.length > 0) {
          Alert.alert(
            "Some localities aren't served yet",
            `${unmatched.join(", ")} ${unmatched.length === 1 ? "isn't" : "aren't"} available yet, so ${unmatched.length === 1 ? "it was" : "they were"} not added to your plan.`
          );
        }
      })
      .catch((e) => {
        setSheetStatus(null);
        const status = e?.status;
        const detail = typeof e?.detail === "string" ? e.detail : null;
        if (status === 401 || e?.kind === "login") {
          Alert.alert("Log In Required", "Please log in again to complete your purchase.");
        } else if (status === 422 && detail) {
          Alert.alert("Couldn't activate plan", detail);
        } else {
          Alert.alert("Payment Failed", "We couldn't activate your plan. Please check your connection and try again.");
        }
      })
      .finally(() => setIsProcessing(false));
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

  const basePriceNum = totalAmount + 500;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER: Circular Back Button | Centered Title | Circular More Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111111" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Payment Method</Text>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => handlePay(false)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={20} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
      </View>

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
            <Text style={styles.summaryKey}>Plan Name</Text>
            <Text style={styles.summaryVal}>{plan.name}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Selected Localities</Text>
            <Text style={styles.summaryVal}>
              {selectedLocalities.length} Areas (Max {plan.locationLimit || 10})
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Plan Validity</Text>
            <Text style={styles.summaryVal}>{plan.validity || "30 Days"}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Base Price</Text>
            <Text style={styles.summaryVal}>₹{basePriceNum.toLocaleString("en-IN")}.00</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Early Partner Discount</Text>
            <Text style={[styles.summaryVal, { color: "#111111" }]}>-₹500.00</Text>
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
              {formattedAmount.replace("₹", "")}.00
            </Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* BOTTOM FIXED CTA: Sleek Rounded Pill "Pay Now" */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.payNowBtn}
          onPress={() => handlePay(true)}
          disabled={isProcessing}
          activeOpacity={0.88}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.payNowBtnText}>Pay Now</Text>
          )}
        </TouchableOpacity>
      </View>

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
              placeholder="e.g. agent@okhdfcbank"
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
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: "#FFFFFF",
  },
  payNowBtn: {
    height: 54,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  payNowBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.2,
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
