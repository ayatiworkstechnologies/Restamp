import React from "react";
import { Modal, View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import COLORS from "../../constants/colors";

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "primary", // primary | danger
  icon: Icon,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {Icon && (
            <View
              style={[
                styles.iconWrap,
                variant === "danger" && styles.iconWrapDanger,
              ]}
            >
              <Icon
                size={26}
                color={variant === "danger" ? COLORS.danger : COLORS.primary}
                strokeWidth={2}
              />
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelBtnText} numberOfLines={1}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                variant === "danger" && styles.confirmBtnDanger,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText} numberOfLines={1}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  iconWrapDanger: {
    backgroundColor: "#FEE2E2",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    alignItems: "center",
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  confirmBtnDanger: {
    backgroundColor: COLORS.danger,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
