// Dealer segmented tabs: Sales Hub (area properties + leads, agent side)
// and My Property (own listings, owner side).
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Briefcase, Building2 } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useOwner } from "../../owner/context/OwnerContext.js";

const TABS = [
  { key: "sales", label: "Sales Hub", Icon: Briefcase },
  { key: "space", label: "My Property", Icon: Building2 },
];

// lockedKeys: tabs shown with a lock (e.g. "space" until the dealer buys an
// owner plan); pressing one still calls onChange so the caller can redirect.
// "My Property" is hidden until the dealer buys an Owner plan (Profile ->
// Add Owner Plan); a Dealer plan alone opens only Sales Hub.
export default function DealerSpaceTabs({ value, onChange, style, lockedKeys = [] }) {
  const { hasOwnerPlan } = useOwner();
  const tabs = hasOwnerPlan ? TABS : TABS.filter((t) => t.key !== "space");
  // Dealer plan only: no switch and no title (Sales Hub is the whole page).
  if (!hasOwnerPlan) return null;
  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      {tabs.map(({ key, label, Icon }) => {
        const on = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, on && styles.tabOn]}
            onPress={() => onChange(key)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.iconTile, on && styles.iconTileOn]}>
              <Icon size={16} color={on ? COLORS.primary : "#64748B"} strokeWidth={1.8} />
            </View>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {label}
              {lockedKeys.includes(key) ? " 🔒" : ""}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 100,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 100,
  },
  tabOn: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 100,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  iconTileOn: { backgroundColor: "#E8EDFB" },
  label: {flexShrink: 1,  fontSize: 13, fontWeight: "600", color: "#64748B" },
  labelOn: { color: COLORS.primary },
});
