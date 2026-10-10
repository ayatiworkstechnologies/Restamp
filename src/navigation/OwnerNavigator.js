import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutGrid,
  Building2,
  PlusCircle,
  Users,
  User,
} from "lucide-react-native";

import OwnerDashboardScreen from "../screens/owner/OwnerDashboardScreen";
import OwnerPropertiesScreen from "../screens/owner/OwnerPropertiesScreen";
import OwnerAddPropertyScreen from "../screens/owner/OwnerAddPropertyScreen";
import OwnerLeadsScreen from "../screens/owner/OwnerLeadsScreen";
import OwnerProfileScreen from "../screens/owner/OwnerProfileScreen";

const Tab = createBottomTabNavigator();

const ownerTabConfig = {
  Dashboard: {
    label: "Dashboard",
    Icon: LayoutGrid,
  },
  Properties: {
    label: "Properties",
    Icon: Building2,
  },
  Add: {
    label: "Add",
    Icon: PlusCircle,
  },
  Leads: {
    label: "Leads",
    Icon: Users,
  },
  Profile: {
    label: "Profile",
    Icon: User,
  },
};

export default function OwnerNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      detachInactiveScreens={true}
      freezeOnBlur={true}
      screenOptions={({ route }) => {
        const config = ownerTabConfig[route.name] || ownerTabConfig.Dashboard;
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
            height: Platform.OS === "ios" ? 84 : 64,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 24 : 8,
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
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      <Tab.Screen name="Properties" component={OwnerPropertiesScreen} />
      <Tab.Screen
        name="Add"
        component={OwnerAddPropertyScreen}
        options={{
          tabBarStyle: { display: "none" },
        }}
      />
      <Tab.Screen name="Leads" component={OwnerLeadsScreen} />
      <Tab.Screen name="Profile" component={OwnerProfileScreen} />
    </Tab.Navigator>
  );
}
