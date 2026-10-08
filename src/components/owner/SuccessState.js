import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import COLORS from "../../constants/colors";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";

export default function SuccessState({
  title = "Success",
  subtitle,
  icon: Icon = CheckCircle2,
  primaryBtnTitle,
  onPrimaryPress,
  secondaryBtnTitle,
  onSecondaryPress,
  children,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon size={44} color={COLORS.success} strokeWidth={2.2} />
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {children && <View style={styles.content}>{children}</View>}

      <View style={styles.buttonStack}>
        {primaryBtnTitle && onPrimaryPress && (
          <PrimaryButton
            title={primaryBtnTitle}
            onPress={onPrimaryPress}
            style={styles.primaryBtn}
          />
        )}

        {secondaryBtnTitle && onSecondaryPress && (
          <SecondaryButton
            title={secondaryBtnTitle}
            onPress={onSecondaryPress}
            style={styles.secondaryBtn}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 6,
    borderColor: "#D1FAE5",
  },
  title: {
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 300,
    marginBottom: 20,
    fontWeight: "400",
  },
  content: {
    width: "100%",
    marginBottom: 24,
  },
  buttonStack: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    width: "100%",
  },
  secondaryBtn: {
    width: "100%",
  },
});
