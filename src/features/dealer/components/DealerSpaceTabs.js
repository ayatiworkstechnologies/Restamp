// Dealer segmented tabs: Sales Hub (area properties + leads, agent side)
// and My Property Space (own listings, owner side).
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Briefcase, Building2 } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";

const TABS = [
  { key: "sales", label: "Sales Hub", Icon: Briefcase },
  { key: "space", label: "My Property Space", Icon: Building2 },
];

export default function DealerSpaceTabs({ value, onChange, style }) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      {TABS.map(({ key, label, Icon }) => {
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
            <Icon size={15} color={on ? COLORS.primary : "#64748B"} style={{ marginRight: 6 }} />
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {label}
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
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabOn: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  labelOn: { color: COLORS.primary },
});
