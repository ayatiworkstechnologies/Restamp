import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import * as Network from "expo-network";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react-native";
import COLORS from "../constants/colors";

const NetworkContext = createContext({
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  isChecking: false,
  checkConnection: async () => true,
});

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [bannerAnim] = useState(new Animated.Value(0));

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      if (Platform.OS === "web") {
        const online =
          typeof navigator !== "undefined" ? navigator.onLine : true;
        setIsConnected(online);
        setIsInternetReachable(online);
        setIsChecking(false);
        return online;
      }

      const state = await Network.getNetworkStateAsync();
      const connected =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
      setIsChecking(false);
      return connected;
    } catch {
      // In case of permission or device quirk, fallback to true
      setIsConnected(true);
      setIsInternetReachable(true);
      setIsChecking(false);
      return true;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Web listeners
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => {
        setIsConnected(true);
        setIsInternetReachable(true);
      };
      const handleOffline = () => {
        setIsConnected(false);
        setIsInternetReachable(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // Native listeners
    try {
      if (Network.addNetworkStateListener) {
        const sub = Network.addNetworkStateListener((state) => {
          setIsConnected(state.isConnected ?? true);
          setIsInternetReachable(state.isInternetReachable ?? true);
        });
        return () => {
          sub?.remove?.();
        };
      }
    } catch {
      // Graceful fallback
    }
  }, [checkConnection]);

  const isOffline = !isConnected || !isInternetReachable;

  // Animate banner in / out
  useEffect(() => {
    Animated.spring(bannerAnim, {
      toValue: isOffline ? 1 : 0,
      tension: 60,
      friction: 8,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [isOffline, bannerAnim]);

  const contextValue = useMemo(
    () => ({
      isConnected,
      isInternetReachable,
      isOffline,
      isChecking,
      checkConnection,
    }),
    [isConnected, isInternetReachable, isOffline, isChecking, checkConnection]
  );

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
      {/* Global Non-intrusive Offline Toast Banner */}
      {isOffline && (
        <Animated.View
          style={[
            styles.offlineBanner,
            {
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-60, 0],
                  }),
                },
              ],
              opacity: bannerAnim,
            },
          ]}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconCircle}>
              <WifiOff size={15} color="#DC2626" />
            </View>
            <Text style={styles.bannerText}>
              No network connection • Showing offline preview
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={checkConnection}
              activeOpacity={0.7}
              disabled={isChecking}
            >
              <RefreshCw
                size={13}
                color="#FFFFFF"
                style={isChecking ? styles.spinIcon : undefined}
              />
              <Text style={styles.retryButtonText}>
                {isChecking ? "Checking..." : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
  },
  bannerContent: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  bannerIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary || "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  retryButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  spinIcon: {
    opacity: 0.7,
  },
});
