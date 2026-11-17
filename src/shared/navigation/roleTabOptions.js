// Shared bottom-tab look for the Owner, Dealer and Agent navbars.
import React from "react";
import { Platform } from "react-native";

export function roleTabScreenOptions(config, bottomInset) {
  const IconComponent = config.Icon;
  return {
    headerShown: false,
    tabBarShowLabel: true,
    tabBarLabelPosition: "below-icon",
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: "#2563EB",
    tabBarInactiveTintColor: "#64748B",
    tabBarLabel: config.label,
    tabBarLabelStyle: {
      fontSize: 10.5,
      fontWeight: "500",
      marginTop: 3,
      marginBottom: Platform.OS === "ios" ? 0 : 2,
      letterSpacing: -0.2,
      textAlign: "center",
    },
    tabBarItemStyle: {
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 2,
      paddingHorizontal: 2,
    },
    tabBarStyle: {
      backgroundColor: "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor: "#EEF2F6",
      height: 60 + bottomInset,
      paddingTop: 8,
      paddingBottom: 8 + bottomInset,
      paddingHorizontal: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 8,
    },
    tabBarIcon: ({ color, focused }) => (
      <IconComponent size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
    ),
  };
}

// Hidden tab: stays registered so links from shared screens still work.
export const HIDDEN_TAB = { tabBarItemStyle: { display: "none" }, tabBarButton: () => null };
