import React, { useState } from "react";
import { Platform } from "react-native";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/shared/navigation/AppNavigator";

enableScreens(true);
import { WishlistProvider } from "./src/features/buyer/context/WishlistContext";
import { OwnerProvider } from "./src/features/owner/context/OwnerContext";
import { AgentProvider } from "./src/features/agent/context/AgentContext";
import { AuthProvider } from "./src/features/auth/context/AuthContext";
import AnimatedSplashScreen from "./src/shared/components/AnimatedSplashScreen";

// Disable blue focus outline across all fields globally on Web / WebViews
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.id = "remove-blue-focus-ring";
  style.textContent = `
    input, textarea, select, [contenteditable="true"] {
      outline: none !important;
      outline-width: 0 !important;
      outline-style: none !important;
      outline-color: transparent !important;
      box-shadow: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus {
      outline: none !important;
      outline-width: 0 !important;
      outline-style: none !important;
      outline-color: transparent !important;
      box-shadow: none !important;
    }
    *:focus {
      outline: none !important;
      outline-style: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <AuthProvider>
        <WishlistProvider>
          <OwnerProvider>
            <AgentProvider>
              <AppNavigator />
              {isSplashVisible && (
                <AnimatedSplashScreen
                  onAnimationComplete={() => setIsSplashVisible(false)}
                />
              )}
            </AgentProvider>
          </OwnerProvider>
        </WishlistProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}