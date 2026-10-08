import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Building2, Plus } from "lucide-react-native";
import COLORS from "../../constants/colors";
import PrimaryButton from "./PrimaryButton";

export default function EmptyState({
  icon: Icon = Building2,
  title = "No Properties Yet",
  description = "Start by adding your first property.",
  buttonTitle = "Add Property",
  onButtonPress,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon size={36} color={COLORS.primary} strokeWidth={1.7} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {buttonTitle && onButtonPress && (
        <PrimaryButton
          title={buttonTitle}
          onPress={onButtonPress}
          icon={Plus}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 280,
    fontWeight: "400",
  },
  button: {
    minWidth: 160,
  },
});
