import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import { X, Sparkles } from "../../components/common/HugeIcon";
import COLORS from "../../constants/colors";
import PrimaryButton from "../../components/owner/PrimaryButton";

/**
 * The four closing outcomes accepted by PATCH /owner/leads/{id} (contract
 * §G). closing_reason must be exactly one of these values; anything else the
 * backend answers with 422. Nothing here touches a listing's status.
 */
const OUTCOMES = [
  { id: "Rented", label: "🏠 Rented", desc: "Agreement finalized with tenant", isSuccess: true },
  { id: "Sold", label: "💰 Sold", desc: "Sale deed executed and closed", isSuccess: true },
  { id: "Leased", label: "🔑 Leased", desc: "Long term lease signed", isSuccess: true },
  { id: "Not Converted", label: "❌ Not Converted", desc: "Customer moved on or deal dropped", isSuccess: false },
];

export default function OwnerCloseLeadModal({
  visible,
  lead,
  onClose,
  onCloseLeadWithOutcome,
}) {
  const [selectedOutcome, setSelectedOutcome] = useState("Rented");
  const [isSuccessView, setIsSuccessView] = useState(false);
  // Drives the single-submit rule: while a close request is in flight the
  // confirm buttons are disabled, so a second tap can never send another
  // PATCH (no double submit).
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const handleConfirmClose = async () => {
    if (saving) return;
    if (typeof onCloseLeadWithOutcome !== "function") return;
    setSaving(true);
    try {
      // The screen performs PATCH /owner/leads/{id} and refetches (§G). The
      // success view is shown only after the server accepted the outcome —
      // on failure the sheet stays open with an honest error, never "closed".
      await onCloseLeadWithOutcome(lead.id, selectedOutcome);
      setIsSuccessView(true);
    } catch (error) {
      Alert.alert(
        "Couldn't close lead",
        (error && error.detail) || "Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    setIsSuccessView(false);
    setSelectedOutcome("Rented");
    onClose();
  };

  // Every dismissal of the success view resets it; otherwise the next lead
  // opened in this (still mounted) sheet would show "Deal Closed" for a lead
  // that was never closed. Dismissal is blocked while the PATCH is in flight.
  const handleDismiss = () => {
    if (saving) return;
    if (isSuccessView) handleDone();
    else onClose();
  };

  const isPositiveDeal = selectedOutcome !== "Not Converted";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          {isSuccessView ? (
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Sparkles size={38} color="#D97706" />
              </View>
              <Text style={styles.successTitle}>
                {isPositiveDeal ? "Deal Closed Successfully! 🎉" : "Lead Closed"}
              </Text>
                <Text style={styles.successSub}>
                  {isPositiveDeal
                    ? `Congratulations on closing the deal with ${lead.customerName}.`
                    : `Lead record updated for ${lead.customerName}.`}
                </Text>

              <PrimaryButton
                title="Done"
                onPress={handleDone}
                style={{ width: "100%", marginTop: 14 }}
              />
            </View>
          ) : (
            <View>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>Close Lead</Text>
                  <Text style={styles.subtitle}>Outcome for {lead.customerName}</Text>
                </View>
                <TouchableOpacity onPress={handleDismiss} activeOpacity={0.7} disabled={saving}>
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Select Final Outcome</Text>

              <View style={styles.outcomesList}>
                {OUTCOMES.map((item) => {
                  const isSelected = selectedOutcome === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.outcomeCard,
                        isSelected && styles.outcomeCardSelected,
                      ]}
                      onPress={() => setSelectedOutcome(item.id)}
                      activeOpacity={0.8}
                      disabled={saving}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.outcomeLabel,
                            isSelected && styles.outcomeLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text style={styles.outcomeDesc}>{item.desc}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Closing a lead never modifies the listing (§G): only the
                  outcome above is sent to the lead endpoint. */}

              <PrimaryButton
                title="Save & Close Deal"
                onPress={handleConfirmClose}
                disabled={saving}
                loading={saving}
                style={{ width: "100%", marginTop: 16 }}
              />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textDark,
    marginBottom: 10,
  },
  outcomesList: {
    gap: 10,
    marginBottom: 14,
  },
  outcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
  },
  outcomeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  outcomeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  outcomeLabelSelected: {
    color: COLORS.primary,
  },
  outcomeDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  togglePropertyClose: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: "400",
    flex: 1,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 14,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "400",
    marginBottom: 14,
  },
});
