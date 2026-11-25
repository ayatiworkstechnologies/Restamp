// Shared header for every RESTAMP plan / checkout / payment-result screen:
// circular back button | centered title | optional circular action button.
// (Extracted from the Owner & Agent checkout screens, which already shared
// this exact design.)
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ArrowLeft, MoreVertical } from "./HugeIcon.js";

export default function PaymentHeader({
  title,
  onBack,
  onRightPress,
  rightIcon: RightIcon = MoreVertical,
  rightLabel = "More",
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.circleBtn}
        onPress={onBack}
        activeOpacity={0.7}
        accessibilityLabel="Back"
      >
        <ArrowLeft size={20} color="#111111" strokeWidth={2.2} />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {onRightPress ? (
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={onRightPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={rightLabel}
        >
          <RightIcon size={20} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.3,
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
