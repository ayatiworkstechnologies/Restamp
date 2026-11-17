import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  HugeDashboard,
  HugeBuilding,
  HugePlus,
  HugeUsers,
  HugeCalendar,
  HugeUser,
} from "../../../shared/components/HugeIcon.js";

import OwnerDashboardScreen from "../screens/OwnerDashboardScreen.js";
import OwnerPropertiesScreen from "../screens/OwnerPropertiesScreen.js";
import OwnerAddPropertyScreen from "../screens/OwnerAddPropertyScreen.js";
import OwnerLeadsScreen from "../screens/OwnerLeadsScreen.js";
import OwnerProfileScreen from "../screens/OwnerProfileScreen.js";
import DealerPropertiesScreen from "../../dealer/screens/DealerPropertiesScreen.js";
import DealerLeadsScreen from "../../dealer/screens/DealerLeadsScreen.js";

const Tab = createBottomTabNavigator();

const ownerTabConfig = {
  Dashboard: {
    label: "Dashboard",
    Icon: HugeDashboard,
  },
  Properties: {
    label: "Properties",
    Icon: HugeBuilding,
  },
  Add: {
    label: "Add",
    Icon: HugePlus,
  },
  Leads: {
    label: "Leads",
    Icon: HugeUsers,
  },
  Visits: {
    label: "Visits",
    Icon: HugeCalendar,
  },
  Profile: {
    label: "Profile",
    Icon: HugeUser,
  },
};

// Dealer page: Dashboard · Add Property · Activity · Profile. Properties and
// Visits stay registered (hidden) so links from the shared screens still work.
const dealerTabConfig = {
  AreaProperties: { label: "Properties", Icon: HugeBuilding },
  Add: { label: "Add Property", Icon: HugePlus },
  Leads: { label: "Buyer Leads", Icon: HugeUsers },
};
const HIDDEN_TAB = { tabBarItemStyle: { display: "none" }, tabBarButton: () => null };

export default function OwnerNavigator({ mode = "owner" }) {
  const isDealer = mode === "dealer";
  // Lift the tab bar above the phone's gesture/nav bar (edge-to-edge Android).
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 0);
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      detachInactiveScreens={true}
      freezeOnBlur={true}
      screenOptions={({ route }) => {
        const config = (isDealer && dealerTabConfig[route.name]) || ownerTabConfig[route.name] || ownerTabConfig.Dashboard;
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
            <IconComponent
              size={22}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        };
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={OwnerDashboardScreen}
        initialParams={isDealer ? { mode: "dealer" } : undefined}
      />
      {isDealer && (
        // Sales Hub (area properties) + My Property Space (own listings).
        <Tab.Screen name="AreaProperties" component={DealerPropertiesScreen} />
      )}
      <Tab.Screen
        name="Properties"
        component={OwnerPropertiesScreen}
        options={isDealer ? HIDDEN_TAB : undefined}
      />
      <Tab.Screen
        name="Add"
        component={OwnerAddPropertyScreen}
        options={{
          tabBarStyle: { display: "none" },
        }}
      />
      <Tab.Screen name="Leads" component={isDealer ? DealerLeadsScreen : OwnerLeadsScreen} />
      <Tab.Screen name="Profile" component={OwnerProfileScreen} />
    </Tab.Navigator>
  );
}
