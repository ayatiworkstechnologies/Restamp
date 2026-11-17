// "Switch Profile" header pill: opens a sheet listing Buyer / Owner / Agent.
// Buyer is always available. Owner and Agent open their dashboard when the
// account holds that plan, otherwise their plan screen. Every switch is
// confirmed on the server before navigating (never on a stale role).
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { HugeSearch, HugeBuilding, Check } from "./HugeIcon.js";
import { Briefcase } from "./HugeIcon.js";
import COLORS from "../constants/colors.js";
import { useAuth } from "../../features/auth/context/AuthContext.js";
import { useOwner } from "../../features/owner/context/OwnerContext.js";
import { useAgent } from "../../features/agent/context/AgentContext.js";
import { useRequireAuth } from "../../features/auth/useRequireAuth.js";
import { ensureRole, enterBuyerFlow } from "../api/users.js";
import { AGENT_UPGRADE_ROUTE, AGENT_UPGRADE_PARAMS } from "../../features/agent/utils/agentUpgrade.js";

export default function SwitchProfileButton({ currentRole = "buyer" }) {
  const navigation = useNavigation();
  const auth = useAuth();
  const requireAuth = useRequireAuth(navigation);
  const { hasOwnerPlan } = useOwner();
  const { hasActivePlan: hasAgentPlan } = useAgent();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const rootNav = () => navigation?.getParent?.() || navigation;

  const enterDashboard = async (role, routeName, label) => {
    try {
      await ensureRole(auth, role);
      rootNav().reset({ index: 0, routes: [{ name: routeName }] });
      return true;
    } catch {
      Alert.alert(`Could not open ${label}`, "The server did not confirm the switch. Please try again.");
      return false;
    }
  };

  const choose = async (key) => {
    if (busy) return;
    if (key === currentRole) {
      setOpen(false);
      return;
    }
    setBusy(key);
    try {
      if (key === "buyer") {
        if (await enterBuyerFlow(navigation, auth)) setOpen(false);
      } else if (key === "owner") {
        if (hasOwnerPlan) {
          if (await enterDashboard("OWNER", "OwnerNavigator", "Owner profile")) setOpen(false);
        } else {
          setOpen(false);
          navigation.navigate("OwnerPlans");
        }
      } else if (key === "agent") {
        if (hasAgentPlan) {
          if (await enterDashboard("BROKER", "AgentNavigator", "Agent profile")) setOpen(false);
        } else {
          setOpen(false);
          navigation.navigate(AGENT_UPGRADE_ROUTE, AGENT_UPGRADE_PARAMS);
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const options = [
    { key: "buyer", title: "Buyer", sub: "Find a property", Icon: HugeSearch, ready: true },
    { key: "owner", title: "Owner", sub: hasOwnerPlan ? "Manage your listings" : "Needs an Owner plan", Icon: HugeBuilding, ready: hasOwnerPlan },
    { key: "agent", title: "Agent", sub: hasAgentPlan ? "Your areas and leads" : "Needs an Agent plan", Icon: Briefcase, ready: hasAgentPlan },
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        activeOpacity={0.75}
        onPress={() => requireAuth(() => setOpen(true))}
        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Switch Profile"
      >
        <Text style={styles.pillText}>Switch Profile</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => !busy && setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>Switch Profile</Text>
            {options.map(({ key, title, sub, Icon, ready }) => {
              const current = key === currentRole;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.row, current && styles.rowCurrent]}
                  activeOpacity={0.8}
                  onPress={() => choose(key)}
                  disabled={!!busy}
                >
                  <View style={[styles.iconWrap, current && styles.iconWrapCurrent]}>
                    <Icon size={18} color={current ? "#FFFFFF" : COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{title}</Text>
                    <Text style={[styles.rowSub, !ready && styles.rowSubLocked]}>{sub}</Text>
                  </View>
                  {busy === key ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : current ? (
                    <Check size={18} color={COLORS.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pillText: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 12, paddingHorizontal: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  rowCurrent: { borderColor: COLORS.primary, backgroundColor: "#EFF6FF" },
  iconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  iconWrapCurrent: { backgroundColor: COLORS.primary },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  rowSub: { fontSize: 12.5, color: "#64748B", marginTop: 2 },
  rowSubLocked: { color: "#B45309" },
});
