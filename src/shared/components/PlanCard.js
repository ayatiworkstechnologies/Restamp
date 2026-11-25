// Shared RESTAMP plan card — single source of truth for Owner, Dealer, Agent
// and Buyer plan lists. Visuals are the former Menu "refCard" design:
// title (+ badge) → big price with 2-line sub text → CTA pill → divider →
// check-list. Content is passed in; the layout never changes per role.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check, Sparkles } from "./HugeIcon.js";
import COLORS from "../constants/colors.js";

export default function PlanCard({
  name,
  titlePrefix,
  titlePrefixColor,
  titleColor,
  price,
  priceSub1,
  priceSub2,
  isPopular = false,
  currentLabel, // e.g. "Current" — green pill next to the title
  features = [],
  buttonText = "Get started",
  onPress,
  selected = false,
  disabled = false,
}) {
  const rest = titlePrefix
    ? name.replace(titlePrefix.trim(), "").replace(/\s+/g, " ").trim()
    : name;

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {titlePrefix ? (
            <Text style={{ color: titlePrefixColor || COLORS.primary }}>{titlePrefix}</Text>
          ) : null}
          <Text style={{ color: titleColor || COLORS.textDark }}>{rest}</Text>
        </Text>

        {isPopular && (
          <View style={styles.badgePopular}>
            <Sparkles size={8.5} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.badgePopularText}>POPULAR</Text>
          </View>
        )}
        {currentLabel ? (
          <View style={styles.badgeCurrent}>
            <Text style={styles.badgeCurrentText}>{currentLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceBig}>{price}</Text>
        {priceSub1 || priceSub2 ? (
          <View style={styles.priceSubBox}>
            {priceSub1 ? <Text style={styles.priceSub1}>{priceSub1}</Text> : null}
            {priceSub2 ? <Text style={styles.priceSub2}>{priceSub2}</Text> : null}
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.cta, disabled && styles.ctaDisabled]}
        activeOpacity={0.82}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={[styles.ctaText, disabled && styles.ctaTextDisabled]}>{buttonText}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.features}>
        {features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={14} color={COLORS.textDark} strokeWidth={2.4} style={styles.checkIcon} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  badgePopular: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgePopularText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  badgeCurrent: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeCurrentText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginBottom: 10,
  },
  priceBig: {
    fontSize: 27,
    fontWeight: "800",
    color: COLORS.textDark,
    letterSpacing: -0.8,
  },
  priceSubBox: {
    marginLeft: 8,
    justifyContent: "center",
  },
  priceSub1: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
    lineHeight: 14,
  },
  priceSub2: {
    fontSize: 10,
    color: COLORS.lightText,
    fontWeight: "400",
    lineHeight: 13,
  },
  cta: {
    height: 38,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  ctaDisabled: {
    backgroundColor: COLORS.disabledBg,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
  },
  ctaTextDisabled: {
    color: COLORS.disabledText,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: -15,
    marginTop: 10,
    marginBottom: 10,
  },
  features: {
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "500",
    lineHeight: 16,
    flex: 1,
  },
});
