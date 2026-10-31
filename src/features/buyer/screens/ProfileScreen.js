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
  Check,
  Crown,
  Briefcase,
  Calendar,
  Sparkles,
  Pencil,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useWishlist } from "../context/WishlistContext.js";
import { useOwner } from "../../owner/context/OwnerContext.js";
import { useAgent } from "../../agent/context/AgentContext.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { getAuthTokenSync } from "../../../shared/api/client.js";
import { enterOwnerFlow } from "../../../shared/api/users.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";
import { fetchMyEnquiries } from "../api/enquiries.js";
import { linkGoogleAccount } from "../../auth/api/auth.js";
import GoogleSignInButton from "../../auth/components/GoogleSignInButton.js";
import ConfirmationModal from "../../owner/components/ConfirmationModal.js";
import { AGENT_MODULE_ENABLED } from "../../../shared/constants/features.js";

export default function ProfileScreen({ navigation }) {
  const nav = useNavigation() || navigation;
  const { wishlist, wishlistSynced, refreshWishlist } = useWishlist();
  const { subscription } = useOwner();
  const { agentPlan, hasActivePlan, selectedLocalities } = useAgent();
  const { user: authUser, logout, refreshMe, saveProfileName } = useAuth();
  const authForOwnerEntry = { user: authUser, refreshMe };
  const [switchingOwner, setSwitchingOwner] = useState(false);
  // Owner entry is protected (Change 2): guests log in first, then resume.
  const requireAuth = useRequireAuth(nav);

  const hasOwnerPlan = Boolean(
    subscription?.hasPurchased ||
    subscription?.planName ||
    authUser?.role === "OWNER"
  );
  const hasAgentPlan =
    AGENT_MODULE_ENABLED &&
    Boolean(
      hasActivePlan &&
      (agentPlan?.hasPurchased ||
        agentPlan?.name ||
        authUser?.role === "BROKER" ||
        authUser?.role === "AGENT")
    );

  const handleSwitchToAgent = () => {
    nav.navigate("AgentNavigator");
  };

  const handleManageOwnerPlan = () => {
    nav.navigate("OwnerPlans");
  };

  const handleManageAgentPlan = () => {
    nav.navigate("AgentLocationSelect", {
      selectedLocalities,
      plan: agentPlan,
    });
  };

  const handleExploreAgentPlans = () => {
    nav.navigate("AgentPlanConfirm");
  };

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
    // Identity comes from the authenticated user only. A logged-out visitor
    // has no identity: the fields stay empty instead of showing another
    // (mock) person's name, phone or email.
    name: authUser?.name || "",
    phone: authUser?.phone || "",
    email: authUser?.email || "",
    avatar: authUser?.avatar || null,
    verified: !!authUser?.verified,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editPhone, setEditPhone] = useState(userProfile.phone);
  const [editEmail, setEditEmail] = useState(userProfile.email);
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
        name: authUser.name || "",
        phone: authUser.phone || "",
        email: authUser.email || "",
        avatar: authUser.avatar || null,
        verified: !!authUser.verified,
      }));
    } else {
      // Signed out: drop the previous account's identity entirely, so the
      // next account never inherits it.
      setUserProfile({
        name: "",
        phone: "",
        email: "",
        avatar: null,
        verified: false,
      });
    }
  }, [authUser]);

  // P0 fix: backend requires the OWNER role for /owner/* endpoints.
  // Switch the backend role first (real POST /users/me/role, token
  // preserved), and only then navigate. Never logs out, never touches OTP.
  const doSwitchToOwner = async () => {
    if (switchingOwner) return;
    setSwitchingOwner(true);
    try {
      await enterOwnerFlow(nav, authForOwnerEntry, "Dashboard");
    } finally {
      setSwitchingOwner(false);
    }
  };

  const handleSwitchToOwner = () => {
    requireAuth(doSwitchToOwner);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    // Clear the session, the account-scoped cached data and the navigation
    // stack in one step (AuthContext owns the first two).
    await logout();
    try {
      nav.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch {
      // The navigator may not be mounted; AuthContext already reset it.
    }
  };

  // Signed-out experience: no previous account's identity, no account data —
  // just the existing auth entry point.
  if (!authUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loggedOutCard}>
            <View style={styles.loggedOutIconWrap}>
              <User size={26} color={COLORS.primary} />
            </View>
            <Text style={styles.loggedOutTitle}>You're not signed in</Text>
            <Text style={styles.loggedOutText}>
              Log in to see your profile, saved properties, enquiries and visits.
            </Text>
            <TouchableOpacity
              style={styles.loggedOutBtn}
              onPress={() => {
                try {
                  nav.navigate("Login");
                } catch {
                  // navigation unavailable; the Home Login action still works
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.loggedOutBtnText}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
                setEditEmail(userProfile.email);
                setIsEditing(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.ownerName}>{userProfile.name}</Text>
              <Pencil size={15} color="#475569" style={styles.pencilIcon} />
            </TouchableOpacity>

            {userProfile.phone ? (
              <Text style={styles.phoneText}>{userProfile.phone}</Text>
            ) : (
              <Text style={styles.phoneText}>Phone not available</Text>
            )}
            {userProfile.email ? (
              <Text style={styles.emailText}>{userProfile.email}</Text>
            ) : (
              <Text style={styles.emailText}>Email not available</Text>
            )}

            {authUser?.role === "OWNER" && (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedBadgeText}>Owner Mode</Text>
              </View>
            )}
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
              setEditEmail(userProfile.email);
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
            style={styles.menuRow}
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

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => nav.navigate("ActiveMemberships")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Crown size={18} color="#2563EB" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Active Memberships & Plans</Text>
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
            onPress={() => navigation.navigate("Notifications")}
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
                  const updatedName = editName.trim() || userProfile.name;
                  const updatedPhone = editPhone.trim() || userProfile.phone;
                  const updatedEmail = editEmail.trim() || userProfile.email;
                  setUserProfile((prev) => ({
                    ...prev,
                    name: updatedName,
                    phone: updatedPhone,
                    email: updatedEmail,
                  }));
                  if (saveProfileName && updatedName && updatedName !== authUser?.name) {
                    const parts = updatedName.split(/\s+/);
                    saveProfileName(parts[0], parts.slice(1).join(" ")).catch(() => {});
                  }
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
  loggedOutCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    paddingHorizontal: 20,
    paddingVertical: 28,
    marginTop: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  loggedOutIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  loggedOutTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  loggedOutText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  loggedOutBtn: {
    height: 46,
    minWidth: 140,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  loggedOutBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Subscriptions & Memberships Section Styles
  subscriptionsSection: {
    marginBottom: 20,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionHeadingIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionHeadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  sectionSubHeadingText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  // Ticket Design Styles (matching user reference)
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  ticketTopRow: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 10,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  ticketHeaderButtons: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 6,
  },
  ticketDraftBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketDraftBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  ticketSaveBtn: {
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 8,
    backgroundColor: "#0284FE",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketSaveBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  ticketStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  ticketCheckCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 14,
    marginBottom: 16,
  },
  ticketGrid: {
    marginBottom: 16,
  },
  ticketGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ticketGridCol: {
    flex: 1,
    paddingRight: 8,
  },
  ticketGridLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 6,
  },
  ticketGridValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  ticketGridSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  ticketQuotaBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  ticketQuotaText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 8,
  },
  ticketManagerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketManagerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  ticketManagerName: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  ticketAvatarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketAssigneeAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  ticketTimelineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketTimelineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  ticketTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginTop: 8,
    marginBottom: 14,
  },
  ticketTabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginRight: 22,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  ticketTabItemActive: {
    borderBottomColor: "#F59E0B",
  },
  ticketTabText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  ticketTabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  ticketTabBadge: {
    backgroundColor: "#EF4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  ticketTabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ticketCommentCard: {
    marginTop: 4,
  },
  ticketCommentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketCommentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  ticketCommentAuthor: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  ticketCommentMeta: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  ticketSpeechBubble: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  ticketSpeechBubbleText: {
    fontSize: 14,
    color: "#1E293B",
    lineHeight: 20,
  },
  ticketReplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  ticketReplyBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  ticketTabBox: {
    paddingVertical: 6,
  },
  ticketDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  ticketDetailLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  ticketDetailValue: {
    fontSize: 13.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  ticketAttachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    marginTop: 4,
  },
  ticketAttachmentName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  ticketAttachmentSize: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  planCardOwner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  planCardAgent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  planCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  planCardIconWrapOwner: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  planCardIconWrapAgent: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  planSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  activeStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 5,
  },
  activeStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.4,
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 3,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  metaInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metaItemText: {
    fontSize: 11.5,
    color: "#15803D",
    fontWeight: "500",
  },
  metaItemRef: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  expiryNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  expiryNoticeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "400",
  },
  planActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  primaryPlanBtn: {
    flex: 1.4,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryPlanBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryPlanBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
  },
  secondaryPlanBtnText: {
    color: "#334155",
    fontSize: 12.5,
    fontWeight: "600",
  },
  localitiesPreviewWrap: {
    marginBottom: 10,
  },
  localitiesPreviewTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  localitiesChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  localityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  localityChipText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "500",
  },
  localityMoreChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  localityMoreChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyPlanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  emptyPlanIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyPlanTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 4,
  },
  emptyPlanSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  emptyPlanButtonsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  emptyOwnerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 8,
  },
  emptyOwnerBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#B45309",
  },
  emptyAgentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 8,
  },
  emptyAgentBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#4338CA",
  },
  addOtherPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  addOtherLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  addOtherTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  addOtherSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
});
