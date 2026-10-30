import React, { useEffect, useRef } from "react";
import { Platform, DeviceEventEmitter, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  HugeHome,
  HugeSearch,
  HugeClock,
  HugeUser,
  HugeMenu,
} from "../components/HugeIcon.js";

import HomeScreen from "../../features/buyer/screens/HomeScreen.js";
import SearchScreen from "../../features/buyer/screens/SearchScreen.js";
import SavedScreen from "../../features/buyer/screens/SavedScreen.js";
import ExploreScreen from "../../features/buyer/screens/ExploreScreen.js";
import ProfileScreen from "../../features/buyer/screens/ProfileScreen.js";
import MenuScreen from "../../features/buyer/screens/MenuScreen.js";
import EnquiriesScreen from "../../features/buyer/screens/EnquiriesScreen.js";
import NotificationScreen from "../../features/buyer/screens/NotificationScreen.js";

import OwnerNavigator from "../../features/owner/navigation/OwnerNavigator.js";
import OwnerPlansScreen from "../../features/owner/screens/OwnerPlansScreen.js";
import OwnerPlanConfirmScreen from "../../features/owner/screens/OwnerPlanConfirmScreen.js";
import OwnerPaymentScreen from "../../features/owner/screens/OwnerPaymentScreen.js";
import OwnerPaymentSuccessScreen from "../../features/owner/screens/OwnerPaymentSuccessScreen.js";
import OwnerPaymentFailedScreen from "../../features/owner/screens/OwnerPaymentFailedScreen.js";
import OwnerPublishSuccessScreen from "../../features/owner/screens/OwnerPublishSuccessScreen.js";
import OwnerLeadDetailScreen from "../../features/owner/screens/OwnerLeadDetailScreen.js";
import OwnerPropertyLeadsScreen from "../../features/owner/screens/OwnerPropertyLeadsScreen.js";

import AgentNavigator from "../../features/agent/navigation/AgentNavigator.js";
import AgentLocationSelectScreen from "../../features/agent/screens/AgentLocationSelectScreen.js";
import AgentPlanConfirmScreen from "../../features/agent/screens/AgentPlanConfirmScreen.js";
import AgentPaymentScreen from "../../features/agent/screens/AgentPaymentScreen.js";
import AgentPaymentSuccessScreen from "../../features/agent/screens/AgentPaymentSuccessScreen.js";
import AgentLeadDetailScreen from "../../features/agent/screens/AgentLeadDetailScreen.js";
import AgentEarningsScreen from "../../features/agent/screens/AgentEarningsScreen.js";
import LoginScreen from "../../features/auth/screens/LoginScreen.js";
import { AGENT_MODULE_ENABLED } from "../constants/features.js";
import { navigationRef } from "./navRef.js";
import RequireAuth from "./RequireAuth.js";
import { useAuth } from "../../features/auth/context/AuthContext.js";
import { AUTH_ENTRY_ROUTE, planSessionNavigation } from "../../features/auth/session.js";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabConfig = {
  Home: {
    label: "Home",
    Icon: HugeHome,
  },
  Search: {
    label: "Search",
    Icon: HugeSearch,
  },
  Activity: {
    label: "Activity",
    Icon: HugeClock,
  },
  Saved: {
    label: "Activity",
    Icon: HugeClock,
  },
  Profile: {
    label: "Profile",
    Icon: HugeUser,
  },
  Menu: {
    label: "Menu",
    Icon: HugeMenu,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      detachInactiveScreens={true}
      freezeOnBlur={true}
      screenOptions={({ route }) => {
        const config = tabConfig[route.name] || tabConfig.Home;
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

          tabBarIcon: ({ color, focused }) => {
            return (
              <IconComponent
                size={22}
                color={color}
                strokeWidth={focused ? 2.4 : 1.8}
              />
            );
          },
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            DeviceEventEmitter.emit("OPEN_SEARCH_FILTER_MODAL", { fromNavbar: true });
            navigation.navigate("Search", {
              openFilterModal: Date.now(),
              fromNavbar: true,
            });
          },
        })}
      />
      <Tab.Screen name="Activity" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#FFFFFF",
  },
};

// Account-scoped screens are wrapped once, at module scope, so the wrapper
// identity is stable across renders (a wrapper created during render would
// remount the screen on every parent update).
const guarded = (Component) => {
  const Guarded = (props) => (
    <RequireAuth>
      <Component {...props} />
    </RequireAuth>
  );
  Guarded.displayName = `RequireAuth(${Component.displayName || Component.name || "Screen"})`;
  return Guarded;
};

const GuardedProfile = guarded(ProfileScreen);
const GuardedEnquiries = guarded(EnquiriesScreen);
const GuardedNotifications = guarded(NotificationScreen);
const GuardedOwnerNavigator = guarded(OwnerNavigator);
const GuardedOwnerPlans = guarded(OwnerPlansScreen);
const GuardedOwnerPlanConfirm = guarded(OwnerPlanConfirmScreen);
const GuardedOwnerPayment = guarded(OwnerPaymentScreen);
const GuardedOwnerPaymentSuccess = guarded(OwnerPaymentSuccessScreen);
const GuardedOwnerPaymentFailed = guarded(OwnerPaymentFailedScreen);
const GuardedOwnerPublishSuccess = guarded(OwnerPublishSuccessScreen);
const GuardedOwnerLeadDetail = guarded(OwnerLeadDetailScreen);
const GuardedOwnerPropertyLeads = guarded(OwnerPropertyLeadsScreen);

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Track the previous session so a logout can be told apart from "the app
  // simply started logged out" (a guest may keep browsing the public tabs).
  const wasAuthenticatedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated) wasAuthenticatedRef.current = true;
  }, [isAuthenticated]);

  // Authentication state is the single source of truth for the navigation
  // shell: while the session is resolving nothing is rendered (no flash of
  // authenticated screens), and a logout drops the stack on the auth entry
  // route so Back can never return to a protected screen.
  useEffect(() => {
    if (isLoading) return;
    const plan = planSessionNavigation({
      isLoading,
      isAuthenticated,
      wasAuthenticated: wasAuthenticatedRef.current,
      currentRouteName: navigationRef.getCurrentRoute()?.name ?? null,
    });
    if (plan.action === "reset") {
      navigationRef.reset({ index: 0, routes: [{ name: plan.route || AUTH_ENTRY_ROUTE }] });
    }
  }, [isLoading, isAuthenticated]);

  // Session still resolving: render neither shell. The animated splash in
  // App.js stays on top during this window.
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "MainTabs" : AUTH_ENTRY_ROUTE}
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          animationDuration: 180,
          freezeOnBlur: true,
          detachInactiveScreens: true,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Profile" component={GuardedProfile} />
        <Stack.Screen name="Activity" component={SavedScreen} />
        <Stack.Screen name="Saved" component={SavedScreen} />
        <Stack.Screen name="Enquiries" component={GuardedEnquiries} />
        <Stack.Screen name="Explore" component={ExploreScreen} />
        <Stack.Screen name="Notifications" component={GuardedNotifications} />
        <Stack.Screen name="Notification" component={GuardedNotifications} />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />

        {/* OWNER FLOW (Entry, Subscription, Payment, Success/Failed, Navigator) */}
        <Stack.Screen name="OwnerPlans" component={GuardedOwnerPlans} />
        <Stack.Screen name="OwnerPlanConfirm" component={GuardedOwnerPlanConfirm} />
        <Stack.Screen name="OwnerPayment" component={GuardedOwnerPayment} />
        <Stack.Screen name="OwnerPaymentSuccess" component={GuardedOwnerPaymentSuccess} />
        <Stack.Screen name="OwnerPaymentFailed" component={GuardedOwnerPaymentFailed} />
        <Stack.Screen name="OwnerNavigator" component={GuardedOwnerNavigator} />
        <Stack.Screen name="OwnerPublishSuccess" component={GuardedOwnerPublishSuccess} />
        <Stack.Screen name="OwnerLeadDetail" component={GuardedOwnerLeadDetail} />
        <Stack.Screen name="OwnerPropertyLeads" component={GuardedOwnerPropertyLeads} />

        {/* AGENT FLOW: gated off until a production broker/lead API exists. */}
        {AGENT_MODULE_ENABLED ? (
          <>
            <Stack.Screen name="AgentLocationSelect" component={AgentLocationSelectScreen} />
            <Stack.Screen name="AgentPlanConfirm" component={AgentPlanConfirmScreen} />
            <Stack.Screen name="AgentPayment" component={AgentPaymentScreen} />
            <Stack.Screen name="AgentPaymentSuccess" component={AgentPaymentSuccessScreen} />
            <Stack.Screen name="AgentNavigator" component={AgentNavigator} />
            <Stack.Screen name="AgentLeadDetail" component={AgentLeadDetailScreen} />
            <Stack.Screen name="AgentEarnings" component={AgentEarningsScreen} />
          </>
        ) : null}
      </Stack.Navigator>

    </NavigationContainer>
  );
}