import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { HugeBuilding, HugeSearch, HugeBell } from "./HugeIcon.js";
import RestampLogo from "./RestampLogo.js";
import COLORS from "../constants/colors.js";
import { useAuth } from "../../features/auth/context/AuthContext.js";
import { enterBuyerFlow, enterOwnerFlow } from "../api/users.js";
import { useRequireAuth } from "../../features/auth/useRequireAuth.js";
import { getUnreadCount, subscribeNotifications } from "../data/notificationsStore.js";

function AppBrandHeader({
  currentRole = "buyer",
  showSwitch = true,
  showNotification = true,
  rightActions,
  style,
}) {
  const navigation = useNavigation();
  const auth = useAuth();
  const [switchingRole, setSwitchingRole] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(getUnreadCount());

  useEffect(() => {
    return subscribeNotifications(() => {
      setUnreadNotifCount(getUnreadCount());
    });
  }, []);
  // Role switches are protected (Change 2): guests log in first, then the
  // switch resumes. enterOwnerFlow/enterBuyerFlow still enforce backend
  // roles afterwards — a stale pre-login auth object can only cost one
  // redundant role check, never a bypass (token + refreshMe stay live).
  const requireAuth = useRequireAuth(navigation);

  const doSwitch = async () => {
    if (switchingRole) return;
    setSwitchingRole(true);
    try {
      if (currentRole === "buyer") {
        await enterOwnerFlow(navigation, auth, "Dashboard");
      } else {
        await enterBuyerFlow(navigation, auth);
      }
    } catch (e) {
      // enterOwnerFlow/enterBuyerFlow report their own failures; never
      // navigate past an unconfirmed role switch as a fallback.
      console.warn("handleSwitchPress error:", e);
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleSwitchPress = () => {
    requireAuth(doSwitch);
  };

  const isBuyer = currentRole === "buyer";

  return (
    <View style={[styles.header, style]}>
      {/* Left Side Restamp Logotype */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIconBg}>
          <RestampLogo size={28} />
        </View>
        <Text style={styles.logoText}>
          Res<Text style={styles.logoTextAccent}>tamp</Text>
        </Text>
      </View>

      {/* Right Side Actions */}
      <View style={styles.headerRightActions}>
        {rightActions}

        {showSwitch && (
          <TouchableOpacity
            style={styles.switchRolePill}
            activeOpacity={0.75}
            onPress={handleSwitchPress}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          >
            {isBuyer ? (
              <HugeBuilding size={13} color="#2563EB" style={{ marginRight: 4 }} />
            ) : (
              <HugeSearch size={13} color="#2563EB" style={{ marginRight: 4 }} />
            )}
            <Text style={styles.switchRoleText}>
              {isBuyer ? "Owner" : "Buyer"}
            </Text>
          </TouchableOpacity>
        )}

        {showNotification && (
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Notifications")}
          >
            <HugeBell size={20} color="#0F172A" />
            {unreadNotifCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIconBg: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  logoTextAccent: {
    color: "#0E2773",
    fontWeight: "800",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchRolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  switchRoleText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});

export default memo(AppBrandHeader);
