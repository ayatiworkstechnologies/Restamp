import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  ShieldCheck,
  MapPin,
  Building2,
  Heart,
  MessageSquare,
  Bell,
  Globe,
  HelpCircle,
  FileCheck,
  Lock,
  ChevronRight,
  LogOut,
  ArrowRight,
  X,
  Pencil,
  Check,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useWishlist } from "../../context/WishlistContext";
import { useOwner } from "../../context/OwnerContext";
import { useAuth } from "../../context/AuthContext";
import { getAuthTokenSync } from "../../api/client";
import { enterOwnerFlow } from "../../api/users";
import { fetchMyEnquiries } from "../../api/enquiries";
import { linkGoogleAccount } from "../../api/auth";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import ConfirmationModal from "../../components/owner/ConfirmationModal";
import AppBrandHeader from "../../components/AppBrandHeader";

export default function ProfileScreen({ navigation }) {
  const nav = useNavigation() || navigation;
  const { wishlist, wishlistSynced, refreshWishlist } = useWishlist();
  const { subscription } = useOwner();
  const { user: authUser, logout, refreshMe } = useAuth();
  const authForOwnerEntry = { user: authUser, refreshMe };
  const [switchingOwner, setSwitchingOwner] = useState(false);

  // Real counts + live role, refreshed whenever Profile gains focus.
  // Buyer endpoints (wishlist, enquiries) are only called while the account
  // holds the BUYER role — otherwise they would 403. Everyone else keeps the
  // existing local behavior. The role comes from the backend (never the
  // stale JWT claim) so the badge below always reflects the live role.
  const [authed, setAuthed] = useState(false);
  const [enquiriesTotal, setEnquiriesTotal] = useState(null);
  const isBuyerRole = authUser?.role === "BUYER";
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const token = !!getAuthTokenSync();
      setAuthed(token);
      if (!token) {
        return undefined;
      }
      refreshMe().catch(() => {});
      if (isBuyerRole) {
        refreshWishlist().catch(() => {});
        fetchMyEnquiries(1, 1).then(
          (data) => {
            if (!cancelled) setEnquiriesTotal(data.total);
          },
          () => {}
        );
      } else if (!cancelled) {
        // Non-buyer role: drop any stale buyer count instead of showing it.
        setEnquiriesTotal(null);
      }
      return () => {
        cancelled = true;
      };
    }, [refreshMe, refreshWishlist, isBuyerRole])
  );

  const savedCount = authed ? (wishlistSynced ? wishlist.length : "…") : wishlist.length;
  const enquiriesCount = authed ? enquiriesTotal ?? "…" : "–";

  const [userProfile, setUserProfile] = useState({
    name: authUser?.name || "Alex Smith",
    phone: authUser?.phone || "+91 98765 43210",
    email: authUser?.email || "alex.smith@restamp.in",
    avatar:
      authUser?.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    verified: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editPhone, setEditPhone] = useState(userProfile.phone);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Google account linking (web-only GIS button; phone session JWT is sent
  // automatically by the API client — the user_id is never chosen client-side).
  const googleLinked = (authUser?.providers || []).includes("google");
  const [showGoogleLink, setShowGoogleLink] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  const handleGoogleLinkCredential = async (idToken) => {
    if (linkingGoogle) return;
    setLinkingGoogle(true);
    try {
      await linkGoogleAccount(idToken);
      await refreshMe();
      setShowGoogleLink(false);
      Alert.alert(
        "Google Account Linked",
        "Google account linked successfully. You can now sign in with Google."
      );
    } catch (e) {
      if (e && e.status === 409) {
        Alert.alert(
          "Already Linked Elsewhere",
          "This Google account is already linked to another Restamp account."
        );
      } else if (e && (e.status === 401 || e.kind === "login")) {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again."
        );
      } else {
        Alert.alert(
          "Linking Failed",
          "Could not link your Google account. Please try again."
        );
      }
    } finally {
      setLinkingGoogle(false);
    }
  };

  React.useEffect(() => {
    if (authUser) {
      setUserProfile((prev) => ({
        ...prev,
        name: authUser.name || prev.name,
        phone: authUser.phone || prev.phone,
      }));
    }
  }, [authUser]);

  // P0 fix: backend requires the OWNER role for /owner/* endpoints.
  // Switch the backend role first (real POST /users/me/role, token
  // preserved), and only then navigate. Never logs out, never touches OTP.
  const handleSwitchToOwner = async () => {
    if (switchingOwner) return;
    setSwitchingOwner(true);
    try {
      await enterOwnerFlow(nav, authForOwnerEntry, "Dashboard");
    } finally {
      setSwitchingOwner(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    nav.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER (Matching Buyer Home) */}
      <AppBrandHeader currentRole="buyer" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />

          <View style={styles.profileInfo}>
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => {
                setEditName(userProfile.name);
                setEditPhone(userProfile.phone);
                setIsEditing(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.ownerName}>{userProfile.name}</Text>
              <Pencil size={15} color="#475569" style={styles.pencilIcon} />
            </TouchableOpacity>

            <Text style={styles.phoneText}>{userProfile.phone}</Text>
            <Text style={styles.emailText}>{userProfile.email}</Text>

            {/* Role badge reflects the LIVE backend role (never hardcoded):
                BUYER -> Verified Buyer, OWNER -> Owner Mode. */}
            {authUser?.role === "OWNER" ? (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedBadgeText}>Owner Mode</Text>
              </View>
            ) : authUser?.role === "BUYER" ? (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedBadgeText}>Verified Buyer</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Mode Switch Button (Switch to Post Property) */}
        <TouchableOpacity
          style={styles.modeSwitchBanner}
          onPress={handleSwitchToOwner}
          activeOpacity={0.88}
        >
          <View style={styles.modeSwitchLeft}>
            <View style={styles.modeSwitchIconWrap}>
              <Building2 size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeSwitchTitle}>Switch to Post Property</Text>
              <Text style={styles.modeSwitchSub}>
                List flats, villas & commercial properties as an Owner
              </Text>
            </View>
          </View>
          <ArrowRight size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {/* 1. ACCOUNT */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>ACCOUNT</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setEditName(userProfile.name);
              setEditPhone(userProfile.phone);
              setIsEditing(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <User size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Personal Information</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() =>
              Alert.alert(
                "Saved Address",
                "Registered residential address in Chennai."
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MapPin size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Saved Address</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 1b. LINKED ACCOUNTS */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>LINKED ACCOUNTS</Text>

          {googleLinked ? (
            <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
              <View style={styles.menuLeft}>
                <Globe size={18} color="#334155" style={styles.menuIcon} />
                <Text style={styles.menuLabel}>Google</Text>
              </View>
              <View style={styles.badgeRow}>
                <Check size={15} color="#16A34A" />
                <Text style={styles.linkedText}>Linked ✓</Text>
              </View>
            </View>
          ) : Platform.OS === "web" ? (
            <View>
              <TouchableOpacity
                style={[{ borderBottomWidth: 0 }, styles.menuRow]}
                onPress={() => setShowGoogleLink((v) => !v)}
                activeOpacity={0.7}
                disabled={linkingGoogle}
              >
                <View style={styles.menuLeft}>
                  <Globe size={18} color="#334155" style={styles.menuIcon} />
                  <Text style={styles.menuLabel}>Link Google Account</Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>
              {showGoogleLink ? (
                <View style={styles.googleLinkBody}>
                  <Text style={styles.googleLinkHint}>
                    {linkingGoogle
                      ? "Linking your Google account…"
                      : "Choose the Google account to link. It will be used for future Google sign-ins."}
                  </Text>
                  <GoogleSignInButton
                    compact
                    onCredential={handleGoogleLinkCredential}
                    onError={() =>
                      Alert.alert(
                        "Google Sign-In Failed",
                        "Could not start Google Sign-In. Please try again."
                      )
                    }
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 2. MY ACTIVITY */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>MY ACTIVITY</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => nav.navigate("Activity", { initialTab: "wishlist" })}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Heart size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Saved Properties</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{savedCount}</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => nav.navigate("Enquiries", { initialTab: "All" })}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MessageSquare size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>My Enquiries</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{enquiriesCount}</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. SETTINGS */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>SETTINGS & ACCOUNT</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => nav.navigate("Login")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <User size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>
                Phone Login / Switch Account
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(
                "Notifications",
                "Push notifications for new properties and price drops are ENABLED."
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Bell size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Notifications</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert("Language", "Selected: English (India)")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Globe size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Language</Text>
            </View>
            <View style={styles.badgeRow}>
              <Text style={styles.langText}>English</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(
                "Help & Support",
                "Email: support@restamp.in\nPhone: 1800-RESTAMP"
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <HelpCircle size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Help & Support</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(
                "Terms & Conditions",
                "RESTAMP terms of service and property seeker guidelines."
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <FileCheck size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Terms & Conditions</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() =>
              Alert.alert(
                "Privacy Policy",
                "RESTAMP user privacy and data security policy."
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Lock size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={COLORS.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal before Logout */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out from your RESTAMP account?"
        icon={LogOut}
        confirmText="Logout"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditing}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsEditing(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  setUserProfile((prev) => ({
                    ...prev,
                    name: editName.trim() || prev.name,
                    phone: editPhone.trim() || prev.phone,
                  }));
                  setIsEditing(false);
                }}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  screenHeaderTitle: {
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.textDark,
    letterSpacing: -0.3,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
  },
  profileHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: "#F1F5F9",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  pencilIcon: {
    marginLeft: 8,
  },
  phoneText: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "400",
  },
  emailText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "400",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#16A34A",
  },
  modeSwitchBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: 14,
    marginBottom: 18,
  },
  modeSwitchLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  modeSwitchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modeSwitchTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
  },
  modeSwitchSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
    fontWeight: "400",
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  groupHeading: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.muted,
    letterSpacing: 0.6,
    marginTop: 6,
    marginBottom: 6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
    marginLeft: 4,
  },
  googleLinkBody: {
    paddingVertical: 6,
    alignItems: "center",
  },
  googleLinkHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 17,
  },
  kycStatusText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.success,
    marginRight: 6,
  },
  countBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  langText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 6,
    fontWeight: "400",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    height: 48,
    marginTop: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.danger,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
