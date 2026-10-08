import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Settings,
  Check,
  Pencil,
  Building2,
  FileText,
  Award,
  Bell,
  MapPin,
  Banknote,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useWishlist } from "../../context/WishlistContext";

export default function AccountScreen() {
  const { wishlist } = useWishlist();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [currency, setCurrency] = useState("INR (₹)");

  const currencies = ["INR (₹)", "USD ($)", "EUR (€)", "AED (د.إ)"];

  const handleCurrencyChange = () => {
    const currentIndex = currencies.indexOf(currency);
    const nextIndex = (currentIndex + 1) % currencies.length;
    setCurrency(currencies[nextIndex]);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to sign out of RESTAMP?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => Alert.alert("Logged Out", "You have successfully signed out."),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
          <Pressable
            style={styles.settingsIconBtn}
            onPress={() => Alert.alert("Settings", "App version 1.0.0 (RESTAMP Pro)")}
          >
            <Settings size={18} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
                }}
                style={styles.avatar}
              />
              <View style={styles.verifiedBadge}>
                <Check size={10} color={COLORS.white} />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>Alex Morgan</Text>
                <View style={styles.proPill}>
                  <Text style={styles.proPillText}>Verified Buyer</Text>
                </View>
              </View>
              <Text style={styles.email}>alex.morgan@restamp.app</Text>
              <Text style={styles.bio}>Active property buyer & real estate investor 🏡</Text>
            </View>
          </View>

          <Pressable
            style={styles.editProfileBtn}
            onPress={() => Alert.alert("Edit Profile", "Profile editing opened.")}
          >
            <Pencil size={14} color={COLORS.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Quick Stats Banner */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Site Visits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{wishlist.length}</Text>
            <Text style={styles.statLabel}>Saved Properties</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4</Text>
            <Text style={styles.statLabel}>Enquiries</Text>
          </View>
        </View>

        {/* Section 1: Property Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Property Activity</Text>
          <View style={styles.cardGroup}>
            <Pressable
              style={styles.rowItem}
              onPress={() =>
                Alert.alert(
                  "Scheduled Site Visits",
                  "1. Emerald Heights Luxury 3BHK (Tomorrow, 11:00 AM)\n2. Sea Breeze Beach Villa (Saturday, 4:00 PM)"
                )
              }
            >
              <View style={[styles.iconBox, { backgroundColor: "#E6F4FF" }]}>
                <Building2 size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.rowTitle}>Scheduled Site Visits</Text>
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>2 Upcoming</Text>
              </View>
              <ChevronRight size={16} color={COLORS.muted} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.rowItem}
              onPress={() =>
                Alert.alert("Property Documents", "All title deeds & verification documents loaded.")
              }
            >
              <View style={[styles.iconBox, { backgroundColor: "#FFF7E6" }]}>
                <FileText size={18} color="#FA8C16" />
              </View>
              <Text style={styles.rowTitle}>Property Documents</Text>
              <ChevronRight size={16} color={COLORS.muted} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.rowItem}
              onPress={() =>
                Alert.alert(
                  "RESTAMP Prime",
                  "Prime Tier Member: Priority access to new project launches and zero brokerage benefits."
                )
              }
            >
              <View style={[styles.iconBox, { backgroundColor: "#F6FFED" }]}>
                <Award size={18} color={COLORS.success} />
              </View>
              <Text style={styles.rowTitle}>RESTAMP Prime</Text>
              <Text style={styles.rowValue}>Prime Member</Text>
              <ChevronRight size={16} color={COLORS.muted} />
            </Pressable>
          </View>
        </View>

        {/* Section 2: Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Preferences</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: "#F0F5FF" }]}>
                <Bell size={18} color="#2F54EB" />
              </View>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#D9D9D9", true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: "#FFF0F6" }]}>
                <MapPin size={18} color="#EB2F96" />
              </View>
              <Text style={styles.rowTitle}>Location Services</Text>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: "#D9D9D9", true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.rowDivider} />

            <Pressable style={styles.rowItem} onPress={handleCurrencyChange}>
              <View style={[styles.iconBox, { backgroundColor: "#E6FFFB" }]}>
                <Banknote size={18} color="#13C2C2" />
              </View>
              <Text style={styles.rowTitle}>Preferred Currency</Text>
              <Text style={styles.rowValue}>{currency}</Text>
              <ChevronRight size={16} color={COLORS.muted} />
            </Pressable>
          </View>
        </View>

        {/* Section 3: Support & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Support & Security</Text>
          <View style={styles.cardGroup}>
            <Pressable
              style={styles.rowItem}
              onPress={() => Alert.alert("Payment Methods", "Visa ending in •••• 4242")}
            >
              <View style={[styles.iconBox, { backgroundColor: "#FFF2E8" }]}>
                <CreditCard size={18} color="#FA541C" />
              </View>
              <Text style={styles.rowTitle}>Payment Methods</Text>
              <Text style={styles.rowValue}>•••• 4242</Text>
              <ChevronRight size={16} color={COLORS.muted} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.rowItem}
              onPress={() =>
                Alert.alert("Help Center", "Connecting to RESTAMP 24/7 Property Support...")
              }
            >
              <View style={[styles.iconBox, { backgroundColor: "#F9F0FF" }]}>
                <HelpCircle size={18} color="#722ED1" />
              </View>
              <Text style={styles.rowTitle}>Help Center & FAQ</Text>
              <ChevronRight size={16} color={COLORS.muted} />
            </Pressable>
          </View>
        </View>

        {/* Log Out Button */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.appVersion}>RESTAMP v1.0.0 • Built with Expo SDK 57</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  settingsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 14,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.cardBg,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  proPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  proPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  email: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  bio: {
    fontSize: 11.5,
    color: COLORS.muted,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F0F7FF",
    gap: 6,
  },
  editProfileText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 20,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  rowValue: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  upcomingBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  upcomingBadgeText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 58,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FFCCC7",
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.danger,
  },
  appVersion: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
  },
});