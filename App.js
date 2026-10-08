import React, { useState } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
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

  if (!document.getElementById("google-fonts-dancing-script")) {
    const fontLink = document.createElement("link");
    fontLink.id = "google-fonts-dancing-script";
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap";
    document.head.appendChild(fontLink);
  }
}

import { NetworkProvider } from "./src/context/NetworkContext";

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <NetworkProvider>
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
      </NetworkProvider>
    </SafeAreaProvider>
  );
}