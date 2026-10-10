import React, { useState } from "react";
import { Platform } from "react-native";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";

enableScreens(true);
import { WishlistProvider } from "./src/context/WishlistContext";
import { OwnerProvider } from "./src/context/OwnerContext";
import { AgentProvider } from "./src/context/AgentContext";
import { AuthProvider } from "./src/context/AuthContext";
import AnimatedSplashScreen from "./src/components/AnimatedSplashScreen";

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