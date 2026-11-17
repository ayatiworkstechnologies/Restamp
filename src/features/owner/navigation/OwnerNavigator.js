// Owner page. Navbar: Home · My Hub · My Ads · Add New · Leads · Profile.
// The Dealer page has its own navigator in features/dealer/navigation.
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  HugeHome,
  HugeDashboard,
  HugeBuilding,
  HugePlus,
  HugeUsers,
  HugeCalendar,
  HugeUser,
} from "../../../shared/components/HugeIcon.js";
import { roleTabScreenOptions } from "../../../shared/navigation/roleTabOptions.js";

import HomeScreen from "../../buyer/screens/HomeScreen.js";
import OwnerDashboardScreen from "../screens/OwnerDashboardScreen.js";
import OwnerPropertiesScreen from "../screens/OwnerPropertiesScreen.js";
import OwnerAddPropertyScreen from "../screens/OwnerAddPropertyScreen.js";
import OwnerLeadsScreen from "../screens/OwnerLeadsScreen.js";
import OwnerProfileScreen from "../screens/OwnerProfileScreen.js";

const Tab = createBottomTabNavigator();

const ownerTabConfig = {
  HomeLink: { label: "Home", Icon: HugeHome },
  Dashboard: { label: "My Hub", Icon: HugeDashboard },
  Properties: { label: "My Ads", Icon: HugeBuilding },
  Add: { label: "Add New", Icon: HugePlus },
  Leads: { label: "Leads", Icon: HugeUsers },
  Visits: { label: "Visits", Icon: HugeCalendar },
  Profile: { label: "Profile", Icon: HugeUser },
};

export default function OwnerNavigator() {
  // Lift the tab bar above the phone's gesture/nav bar (edge-to-edge Android).
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 0);
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      detachInactiveScreens={true}
      freezeOnBlur={true}
      screenOptions={({ route }) =>
        roleTabScreenOptions(ownerTabConfig[route.name] || ownerTabConfig.Dashboard, bottomInset)
      }
    >
      <Tab.Screen name="HomeLink" component={HomeScreen} initialParams={{ modeRole: "owner" }} />
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      <Tab.Screen name="Properties" component={OwnerPropertiesScreen} />
      <Tab.Screen name="Add" component={OwnerAddPropertyScreen} options={{ tabBarStyle: { display: "none" } }} />
      <Tab.Screen name="Leads" component={OwnerLeadsScreen} />
      <Tab.Screen name="Profile" component={OwnerProfileScreen} />
    </Tab.Navigator>
  );
}
