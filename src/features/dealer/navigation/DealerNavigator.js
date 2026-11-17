// Dealer page. A dealer posts properties through the owner listing system
// (server OWNER role underneath), so Add New, hidden Properties and the
// shared dashboard/profile come from the Owner feature in dealer mode.
// Navbar: Home · My Hub · My Ads · Add New · Leads · Profile.
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
  HugeUser,
} from "../../../shared/components/HugeIcon.js";
import { roleTabScreenOptions, HIDDEN_TAB } from "../../../shared/navigation/roleTabOptions.js";

import DealerHomeScreen from "../screens/DealerHomeScreen.js";
import DealerDashboardScreen from "../screens/DealerDashboardScreen.js";
import DealerPropertiesScreen from "../screens/DealerPropertiesScreen.js";
import DealerLeadsScreen from "../screens/DealerLeadsScreen.js";
import DealerProfileScreen from "../screens/DealerProfileScreen.js";
import OwnerPropertiesScreen from "../../owner/screens/OwnerPropertiesScreen.js";
import OwnerAddPropertyScreen from "../../owner/screens/OwnerAddPropertyScreen.js";

const Tab = createBottomTabNavigator();

const dealerTabConfig = {
  HomeLink: { label: "Home", Icon: HugeHome },
  Dashboard: { label: "My Hub", Icon: HugeDashboard },
  AreaProperties: { label: "My Ads", Icon: HugeBuilding },
  Properties: { label: "Properties", Icon: HugeBuilding },
  Add: { label: "Add New", Icon: HugePlus },
  Leads: { label: "Leads", Icon: HugeUsers },
  Profile: { label: "Profile", Icon: HugeUser },
};

export default function DealerNavigator() {
  // Lift the tab bar above the phone's gesture/nav bar (edge-to-edge Android).
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 0);
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      detachInactiveScreens={true}
      freezeOnBlur={true}
      screenOptions={({ route }) =>
        roleTabScreenOptions(dealerTabConfig[route.name] || dealerTabConfig.Dashboard, bottomInset)
      }
    >
      <Tab.Screen name="HomeLink" component={DealerHomeScreen} />
      <Tab.Screen name="Dashboard" component={DealerDashboardScreen} />
      <Tab.Screen name="AreaProperties" component={DealerPropertiesScreen} />
      <Tab.Screen name="Properties" component={OwnerPropertiesScreen} options={HIDDEN_TAB} />
      <Tab.Screen name="Add" component={OwnerAddPropertyScreen} options={{ tabBarStyle: { display: "none" } }} />
      <Tab.Screen name="Leads" component={DealerLeadsScreen} />
      <Tab.Screen name="Profile" component={DealerProfileScreen} />
    </Tab.Navigator>
  );
}
