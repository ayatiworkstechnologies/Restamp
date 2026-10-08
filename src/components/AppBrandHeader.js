import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Building2, Search, Bell } from "lucide-react-native";
import RestampLogo from "./RestampLogo";
import COLORS from "../constants/colors";

export default function AppBrandHeader({
  currentRole = "buyer",
  showSwitch = true,
  showNotification = true,
  rightActions,
  style,
}) {
  const navigation = useNavigation();

  const handleSwitchPress = () => {
    if (currentRole === "buyer") {
      navigation.navigate("OwnerNavigator", { screen: "Dashboard" });
    } else {
      // Owner or Agent switching back to Buyer
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    }
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
            activeOpacity={0.8}
            onPress={handleSwitchPress}
          >
            {isBuyer ? (
              <Building2 size={13} color="#2563EB" style={{ marginRight: 4 }} />
            ) : (
              <Search size={13} color="#2563EB" style={{ marginRight: 4 }} />
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
            onPress={() =>
              Alert.alert("Notifications", "You have no unread notifications.")
            }
          >
            <Bell size={20} color="#0F172A" />
            <View style={styles.notificationDot} />
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
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  logoTextAccent: {
    color: COLORS.primary || "#2563EB",
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
