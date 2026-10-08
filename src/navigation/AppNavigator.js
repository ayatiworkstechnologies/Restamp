import React from "react";
import { Platform, DeviceEventEmitter } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, Search, Clock, Compass, Menu as MenuIcon, Heart, User } from "lucide-react-native";

import HomeScreen from "../screens/buyer/HomeScreen";
import SearchScreen from "../screens/buyer/SearchScreen";
import SavedScreen from "../screens/buyer/SavedScreen";
import ExploreScreen from "../screens/buyer/ExploreScreen";
import ProfileScreen from "../screens/buyer/ProfileScreen";
import MenuScreen from "../screens/buyer/MenuScreen";
import EnquiriesScreen from "../screens/buyer/EnquiriesScreen";

import OwnerNavigator from "./OwnerNavigator";
import OwnerPlansScreen from "../screens/owner/OwnerPlansScreen";
import OwnerPlanConfirmScreen from "../screens/owner/OwnerPlanConfirmScreen";
import OwnerPaymentScreen from "../screens/owner/OwnerPaymentScreen";
import OwnerPaymentSuccessScreen from "../screens/owner/OwnerPaymentSuccessScreen";
import OwnerPaymentFailedScreen from "../screens/owner/OwnerPaymentFailedScreen";
import OwnerPublishSuccessScreen from "../screens/owner/OwnerPublishSuccessScreen";
import OwnerLeadDetailScreen from "../screens/owner/OwnerLeadDetailScreen";
import OwnerPropertyLeadsScreen from "../screens/owner/OwnerPropertyLeadsScreen";

import AgentNavigator from "./AgentNavigator";
import AgentLocationSelectScreen from "../screens/agent/AgentLocationSelectScreen";
import AgentPlanConfirmScreen from "../screens/agent/AgentPlanConfirmScreen";
import AgentPaymentScreen from "../screens/agent/AgentPaymentScreen";
import AgentPaymentSuccessScreen from "../screens/agent/AgentPaymentSuccessScreen";
import AgentLeadDetailScreen from "../screens/agent/AgentLeadDetailScreen";
import AgentEarningsScreen from "../screens/agent/AgentEarningsScreen";
import LoginScreen from "../screens/auth/LoginScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabConfig = {
  Home: {
    label: "Home",
    Icon: Home,
  },
  Search: {
    label: "Search",
    Icon: Search,
  },
  Activity: {
    label: "Activity",
    Icon: Clock,
  },
  Saved: {
    label: "Activity",
    Icon: Clock,
  },
  Profile: {
    label: "Profile",
    Icon: User,
  },
  Menu: {
    label: "Menu",
    Icon: MenuIcon,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
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

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Activity" component={SavedScreen} />
        <Stack.Screen name="Saved" component={SavedScreen} />
        <Stack.Screen name="Enquiries" component={EnquiriesScreen} />
        <Stack.Screen name="Explore" component={ExploreScreen} />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />

        {/* OWNER FLOW (Entry, Subscription, Payment, Success/Failed, Navigator) */}
        <Stack.Screen name="OwnerPlans" component={OwnerPlansScreen} />
        <Stack.Screen name="OwnerPlanConfirm" component={OwnerPlanConfirmScreen} />
        <Stack.Screen name="OwnerPayment" component={OwnerPaymentScreen} />
        <Stack.Screen name="OwnerPaymentSuccess" component={OwnerPaymentSuccessScreen} />
        <Stack.Screen name="OwnerPaymentFailed" component={OwnerPaymentFailedScreen} />
        <Stack.Screen name="OwnerNavigator" component={OwnerNavigator} />
        <Stack.Screen name="OwnerPublishSuccess" component={OwnerPublishSuccessScreen} />
        <Stack.Screen name="OwnerLeadDetail" component={OwnerLeadDetailScreen} />
        <Stack.Screen name="OwnerPropertyLeads" component={OwnerPropertyLeadsScreen} />

        {/* AGENT FLOW (Entry, Location Select, Confirm, Payment, Success, Navigator, Detail) */}
        <Stack.Screen name="AgentLocationSelect" component={AgentLocationSelectScreen} />
        <Stack.Screen name="AgentPlanConfirm" component={AgentPlanConfirmScreen} />
        <Stack.Screen name="AgentPayment" component={AgentPaymentScreen} />
        <Stack.Screen name="AgentPaymentSuccess" component={AgentPaymentSuccessScreen} />
        <Stack.Screen name="AgentNavigator" component={AgentNavigator} />
        <Stack.Screen name="AgentLeadDetail" component={AgentLeadDetailScreen} />
        <Stack.Screen name="AgentEarnings" component={AgentEarningsScreen} />
      </Stack.Navigator>

    </NavigationContainer>
  );
}