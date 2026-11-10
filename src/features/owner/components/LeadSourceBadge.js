import React from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../../shared/constants/colors.js";

/**
 * Small corner tag on an owner lead card: "Buyer" or "Agent", from the
 * lead's real source role (backend owner lead source_role, mapped to
 * lead.sourceRole by toOwnerLead). Renders nothing when the role is unknown
 * (e.g. an older backend that does not send it) — never a guess.
 * Positioned absolutely: it hangs from the card's top edge inside the card
 * padding (`inset` = the card's horizontal padding).
 */
export default function LeadSourceBadge({ sourceRole, inset = 16 }) {
  if (sourceRole !== "buyer" && sourceRole !== "agent") return null;
  const isAgent = sourceRole === "agent";
  return (
    <View
      style={[styles.badge, { left: inset }, isAgent ? styles.agent : styles.buyer]}
      accessibilityLabel={isAgent ? "Lead from an agent" : "Lead from a buyer"}
    >
      <Text style={[styles.text, isAgent ? styles.agentText : styles.buyerText]}>
        {isAgent ? "Agent" : "Buyer"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    zIndex: 1,
  },
  buyer: {
    backgroundColor: COLORS.primaryLight,
  },
  agent: {
    backgroundColor: COLORS.warningBg,
  },
  text: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  buyerText: {
    color: COLORS.primaryDark,
  },
  agentText: {
    color: COLORS.warning,
  },
});
