// Dealer page. A dealer posts properties through the owner listing system
// (server OWNER role underneath), so Add New, hidden Properties and the
// shared dashboard/profile come from the Owner feature in dealer mode.
// Navbar: Home · My Hub · My Ads · Leads · Profile (Sales Hub). With a PAID
// dealer plan (not the free trial) the bar adds My Properties (hide /
// activate listings) and Add New. Dealers work in BROKER mode; the backend
// accepts BROKER on the listing endpoints and refuses posting without a
// paid dealer plan.
import React, { useEffect } from "react";
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
import { useOwner } from "../../owner/context/OwnerContext.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { ensureRole } from "../../../shared/api/users.js";

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
  Properties: { label: "My Properties", Icon: HugeBuilding },
  Add: { label: "Add New", Icon: HugePlus },
  Leads: { label: "Leads", Icon: HugeUsers },
  Profile: { label: "Profile", Icon: HugeUser },
};

export default function DealerNavigator() {
  // Lift the tab bar above the phone's gesture/nav bar (edge-to-edge Android).
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 0);
  // Sales Hub needs the Dealer plan; My Properties / Add New open only after
  // the Owner plan add-on is bought (Profile -> Add Owner Plan).
  const { hasOwnerPlan: canPost } = useOwner();
  const auth = useAuth();
  // Every entry (Menu, login, payment) lands here: confirm BROKER mode once.
  useEffect(() => {
    ensureRole(auth, "BROKER").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      detachInactiveScreens={true}
      freezeOnBlur={true}
      // Posting uses the Owner plan (OWNER mode); everything else is Sales
      // Hub (BROKER mode). Switch the backend mode as tabs change.
      screenListeners={({ route }) => ({
        focus: () => {
          const role = route.name === "Properties" || route.name === "Add" ? "OWNER" : "BROKER";
          ensureRole(auth, role).catch(() => {});
        },
      })}
      screenOptions={({ route }) =>
        roleTabScreenOptions(dealerTabConfig[route.name] || dealerTabConfig.Dashboard, bottomInset)
      }
    >
      <Tab.Screen name="HomeLink" component={DealerHomeScreen} />
      <Tab.Screen name="Dashboard" component={DealerDashboardScreen} />
      <Tab.Screen name="AreaProperties" component={DealerPropertiesScreen} />
      <Tab.Screen name="Properties" component={OwnerPropertiesScreen} options={canPost ? undefined : HIDDEN_TAB} />
      <Tab.Screen
        name="Add"
        component={OwnerAddPropertyScreen}
        options={canPost ? { tabBarStyle: { display: "none" } } : { ...HIDDEN_TAB, tabBarStyle: { display: "none" } }}
      />
      <Tab.Screen name="Leads" component={DealerLeadsScreen} />
      <Tab.Screen name="Profile" component={DealerProfileScreen} />
    </Tab.Navigator>
  );
}
