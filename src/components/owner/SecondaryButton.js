import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import COLORS from "../../constants/colors";

export default function SecondaryButton({
  title,
  onPress,
  disabled = false,
  icon: Icon,
  style,
  textStyle,
  variant = "outline", // outline | subtle
}) {
  const isSubtle = variant === "subtle";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSubtle ? styles.buttonSubtle : styles.buttonOutline,
        disabled && styles.buttonDisabled,
        style,
      ]}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.content}>
        {Icon && (
          <Icon
            size={18}
            color={isSubtle ? COLORS.textDark : COLORS.primary}
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.text,
            isSubtle ? styles.textSubtle : styles.textOutline,
            textStyle,
          ]}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  buttonOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  buttonSubtle: {
    backgroundColor: "#F1F5F9",
  },
  buttonDisabled: {
    borderColor: "#E2E8F0",
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
  },
  textOutline: {
    color: COLORS.primary,
  },
  textSubtle: {
    color: COLORS.textDark,
  },
});
