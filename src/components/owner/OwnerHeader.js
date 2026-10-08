import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Bell, ArrowLeft } from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
import { useNavigation } from "@react-navigation/native";

export default function OwnerHeader({
  title,
  subtitle,
  greeting = false,
  showBack = false,
  showBuyerBack = false,
  onBack,
  rightAction,
  unreadCount = 2,
}) {
  const { ownerProfile } = useOwner();
  const navigation = useNavigation();

  const handleProfilePress = () => {
    navigation.navigate("Profile");
  };

  const handleBackToBuyer = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || (() => navigation.goBack())}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={COLORS.textDark} />
          </TouchableOpacity>
        ) : showBuyerBack ? (
          <TouchableOpacity
            style={styles.buyerBackButton}
            onPress={handleBackToBuyer}
            activeOpacity={0.75}
          >
            <ArrowLeft size={16} color={COLORS.primary} strokeWidth={2.4} />
            <Text style={styles.buyerBackText}>Buyer</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleWrapper}>

          {greeting ? (
            <>
              <Text style={styles.greetingText}>
                Good Morning, {ownerProfile.firstName || "Raj"} 👋
              </Text>
              <Text style={styles.subGreetingText}>RESTAMP Owner Partner</Text>
            </>
          ) : (
            <>
              <Text style={styles.titleText}>{title}</Text>
              {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
            </>
          )}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {rightAction ? (
          rightAction
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.75}
              onPress={() => {}}
            >
              <Bell size={20} color={COLORS.textDark} />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarBtn}
              activeOpacity={0.8}
              onPress={handleProfilePress}
            >
              <Image
                source={{ uri: ownerProfile.avatar }}
                style={styles.avatarImg}
              />
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  buyerBackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 12,
  },
  buyerBackText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary,
    marginLeft: 3,
  },
  titleWrapper: {

    flex: 1,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.textDark,
    letterSpacing: -0.3,
  },
  subGreetingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.textDark,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  rightContainer: {
    marginLeft: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.danger,
    borderRadius: 6,
    minWidth: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
  },
  avatarBtn: {
    position: "relative",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
