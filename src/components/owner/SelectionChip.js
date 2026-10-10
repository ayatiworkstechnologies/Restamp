import React, { memo } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import COLORS from "../../constants/colors";

function SelectionChip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  variant = "chip", // chip | card | segmented
  style,
  textStyle,
}) {
  const isCard = variant === "card";
  const isSegmented = variant === "segmented";

  let containerStyle = styles.chipBase;
  if (isSegmented) {
    containerStyle = selected ? styles.segmentedSelected : styles.segmentedBase;
  } else if (isCard) {
    containerStyle = selected ? [styles.cardBase, styles.cardSelected] : styles.cardBase;
  } else {
    containerStyle = selected ? [styles.chipBase, styles.chipSelected] : styles.chipBase;
  }

  const iconColor = selected
    ? (isSegmented ? COLORS.primary : "#FFFFFF")
    : "#64748B";

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.innerRow}>
        {Icon && (
          <Icon
            size={isCard ? 18 : 14}
            color={iconColor}
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.text,
            isSegmented && (selected ? styles.segmentedTextSelected : styles.segmentedText),
            isCard && (selected ? styles.cardTextSelected : styles.cardText),
            !isSegmented && !isCard && (selected ? styles.chipTextSelected : styles.chipText),
            textStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 13,
  },

  // 1. Standard Minimal Pill Chip (using brand COLORS.primary)
  chipBase: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  chipTextSelected: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // 2. Segmented Pill Control (Apple iOS 18 style with COLORS.primary)
  segmentedBase: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedSelected: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedText: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "#64748B",
  },
  segmentedTextSelected: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // 3. Card Selection
  cardBase: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
    marginBottom: 8,
  },
  cardSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  cardText: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "#475569",
  },
  cardTextSelected: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
});

export default memo(SelectionChip);
