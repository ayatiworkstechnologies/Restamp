import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { HugeBuilding, HugeSearch, HugeBell, Sparkles, Repeat } from "./HugeIcon.js";
import RestampWordmark from "./RestampWordmark.js";
import COLORS from "../constants/colors.js";
import { useAuth } from "../../features/auth/context/AuthContext.js";
import { enterBuyerFlow, enterOwnerFlow, ensureRole } from "../api/users.js";
import { useOwner } from "../../features/owner/context/OwnerContext.js";
import { useAgent } from "../../features/agent/context/AgentContext.js";
import { useRequireAuth } from "../../features/auth/useRequireAuth.js";
import { getUnreadCount, subscribeNotifications } from "../data/notificationsStore.js";
import { useReva } from "../../features/reva/context/RevaContext.js";

// Mode tag shown beside the logo so the user always knows which side they are on.
const ROLE_BADGE = {
  owner: { label: "Owner", bg: "#EFF6FF", fg: "#1D4ED8" },
  dealer: { label: "Dealer", bg: "#FEF3C7", fg: "#B45309" },
  agent: { label: "Agent", bg: "#ECFDF5", fg: "#047857" },
};

export function RoleBadge({ role }) {
  const badge = ROLE_BADGE[role];
  if (!badge) return null;
  return (
    <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.roleBadgeText, { color: badge.fg }]}>{badge.label}</Text>
    </View>
  );
}

function AppBrandHeader({
  currentRole = "buyer",
  showSwitch = true,
  showNotification = true,
  rightActions,
  style,
}) {
  const navigation = useNavigation();
  const auth = useAuth();
  const { openReva } = useReva();
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

  // Owner <-> Agent switch: shown on the Owner and Agent dashboards only
  // when this account holds BOTH an owner plan and an agent plan.
  const { hasOwnerPlan } = useOwner();
  const { hasActivePlan: hasAgentPlan } = useAgent();
  const canSwapOwnerAgent =
    !!auth?.user && hasOwnerPlan && hasAgentPlan && (currentRole === "owner" || currentRole === "agent");
  const swapTarget = currentRole === "owner" ? "agent" : "owner";

  const handleOwnerAgentSwap = async () => {
    if (switchingRole) return;
    setSwitchingRole(true);
    try {
      await ensureRole(auth, swapTarget === "agent" ? "BROKER" : "OWNER");
      const rootNav = navigation?.getParent?.() || navigation;
      rootNav.reset({
        index: 0,
        routes: [{ name: swapTarget === "agent" ? "AgentNavigator" : "OwnerNavigator" }],
      });
    } catch (e) {
      Alert.alert(
        `Could not open ${swapTarget === "agent" ? "Agent" : "Owner"} mode`,
        "The server did not confirm the switch. Please try again."
      );
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <View style={[styles.header, style]}>
      {/* Left Side Restamp Logotype */}
      <View style={styles.logoContainer}>
        <RestampWordmark height={20} />
        <RoleBadge role={currentRole} />
      </View>

      {/* Right Side Actions */}
      <View style={styles.headerRightActions}>
        {rightActions}

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
  roleBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
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
  revaHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  revaHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
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
  revaHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginRight: 6,
  },
  revaHeaderBtnText: {
    fontSize: 12,
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
