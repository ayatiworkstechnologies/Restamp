import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  User,
} from "lucide-react-native";

import AgentDashboardScreen from "../screens/agent/AgentDashboardScreen";
import AgentPropertiesScreen from "../screens/agent/AgentPropertiesScreen";
import AgentLeadsScreen from "../screens/agent/AgentLeadsScreen";
import AgentVisitsScreen from "../screens/agent/AgentVisitsScreen";
import AgentProfileScreen from "../screens/agent/AgentProfileScreen";

const Tab = createBottomTabNavigator();

const agentTabConfig = {
  Dashboard: {
    label: "Dashboard",
    Icon: LayoutDashboard,
  },
  Properties: {
    label: "Properties",
    Icon: Building2,
  },
  Leads: {
    label: "Leads",
    Icon: Users,
  },
  Visits: {
    label: "Visits",
    Icon: CalendarDays,
  },
  Profile: {
    label: "Profile",
    Icon: User,
  },
};

export default function AgentNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => {
        const config = agentTabConfig[route.name] || agentTabConfig.Dashboard;
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
      <Tab.Screen name="Dashboard" component={AgentDashboardScreen} />
      <Tab.Screen name="Properties" component={AgentPropertiesScreen} />
      <Tab.Screen name="Leads" component={AgentLeadsScreen} />
      <Tab.Screen name="Visits" component={AgentVisitsScreen} />
      <Tab.Screen name="Profile" component={AgentProfileScreen} />
    </Tab.Navigator>
  );
}
