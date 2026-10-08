import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { CheckCircle2, X, Sparkles, Building2 } from "lucide-react-native";
import COLORS from "../../constants/colors";
import PrimaryButton from "../../components/owner/PrimaryButton";
import SecondaryButton from "../../components/owner/SecondaryButton";

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
  const [closePropertyToo, setClosePropertyToo] = useState(true);
  const [isSuccessView, setIsSuccessView] = useState(false);

  if (!lead) return null;

  const handleConfirmClose = () => {
    onCloseLeadWithOutcome?.(lead.id, selectedOutcome, closePropertyToo, lead.propertyId);
    setIsSuccessView(true);
  };

  const handleDone = () => {
    setIsSuccessView(false);
    onClose();
  };

  const isPositiveDeal = selectedOutcome !== "Not Converted";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
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
                  ? `Congratulations on closing the deal with ${lead.customerName}. Your property listing status has been updated.`
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
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
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

              {/* Option to close associated property listing */}
              {isPositiveDeal && (
                <TouchableOpacity
                  style={styles.togglePropertyClose}
                  onPress={() => setClosePropertyToo(!closePropertyToo)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      closePropertyToo && styles.checkboxActive,
                    ]}
                  >
                    {closePropertyToo && <CheckCircle2 size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.toggleText}>
                    Also mark "{lead.propertyTitle}" as Closed listing
                  </Text>
                </TouchableOpacity>
              )}

              <PrimaryButton
                title="Save & Close Deal"
                onPress={handleConfirmClose}
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
