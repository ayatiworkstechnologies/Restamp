import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  HugeDashboard,
  HugeBuilding,
  HugeClock,
  HugeUser,
} from "../../../shared/components/HugeIcon.js";

import AgentDashboardScreen from "../screens/AgentDashboardScreen.js";
import AgentPropertiesScreen from "../screens/AgentPropertiesScreen.js";
import AgentProfileScreen from "../screens/AgentProfileScreen.js";
import AgentLocationSelectScreen from "../screens/AgentLocationSelectScreen.js";
import { useAgent } from "../context/AgentContext.js";
import COLORS from "../../../shared/constants/colors.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { ensureRole } from "../../../shared/api/users.js";
// The agent's Activity tab IS the buyer My Activity screen (same UI, data and
// actions): an agent connects with owners exactly like a buyer, on its own
// account. Only the "browse properties" buttons point at the agent's own
// Properties tab instead of the buyer Home tab.
import SavedScreen from "../../buyer/screens/SavedScreen.js";

const Tab = createBottomTabNavigator();

function AgentActivityScreen(props) {
  return <SavedScreen {...props} browseRoute="Properties" />;
}

const agentTabConfig = {
  Dashboard: {
    label: "Dashboard",
    Icon: HugeDashboard,
  },
  Properties: {
    label: "Properties",
    Icon: HugeBuilding,
  },
  Activity: {
    label: "Activity",
    Icon: HugeClock,
  },
  Profile: {
    label: "Profile",
    Icon: HugeUser,
  },
};

// First-time setup: an agent with no plan yet (server-confirmed) picks the
// ONE free-trial area before the agent tabs open; returning agents keep the
// area saved on the server and never see this again.
export default function AgentNavigator({ navigation }) {
  const { planLoaded, hasActivePlan } = useAgent();
  if (!planLoaded) return <AgentSpinner />;
  if (!hasActivePlan) {
    return (
      <AgentLocationSelectScreen
        navigation={navigation}
        route={{ params: { trial: true } }}
        onTrialStarted={() => {}}
      />
    );
  }
  return <AgentModeGate />;
}

// Agent mode needs the server role BROKER: the agent endpoints
// (/broker/listings, detail, similar) answer 403 to any other role. The plan
// is read for any role, so an account last switched to buyer or owner mode
// could open the agent tabs with an empty inventory. Every entry (Menu,
// Profile, memberships, login) lands here, so the role is confirmed once on
// the server before the tabs open, then the inventory reloads. Failures stay
// on an honest retry state; the agent tabs never open on an unconfirmed role.
function AgentModeGate() {
  const auth = useAuth();
  const { reloadInventory } = useAgent();
  const [roleState, setRoleState] = useState("pending");
  const confirmRole = useCallback(async () => {
    setRoleState("pending");
    try {
      await ensureRole(auth, "BROKER");
      reloadInventory();
      setRoleState("ok");
    } catch {
      setRoleState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadInventory]);
  useEffect(() => {
    confirmRole();
  }, [confirmRole]);
  if (roleState === "pending") return <AgentSpinner />;
  if (roleState === "error") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: COLORS.background }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, textAlign: "center", marginBottom: 8 }}>
          Could not switch to Agent mode
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: 16 }}>
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={confirmRole}
          style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          <Text style={{ color: COLORS.white, fontWeight: "700" }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return <AgentTabs />;
}

function AgentSpinner() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}

function AgentTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      detachInactiveScreens={true}
      freezeOnBlur={true}
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
      <Tab.Screen name="Activity" component={AgentActivityScreen} />
      <Tab.Screen name="Profile" component={AgentProfileScreen} />
    </Tab.Navigator>
  );
}
