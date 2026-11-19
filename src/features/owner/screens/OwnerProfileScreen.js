import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ScrollView } from "../../../shared/components/KeyboardSafe.js";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  ShieldCheck,
  MapPin,
  Building2,
  Users,
  Calendar,
  Crown,
  CreditCard,
  FileText,
  Bell,
  Globe,
  HelpCircle,
  FileCheck,
  Lock,
  ChevronRight,
  LogOut,
  Repeat,
  Sparkles,
  ArrowRight,
  Search,
  Pencil,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import InitialsAvatar from "../../../shared/components/InitialsAvatar.js";
import { useOwner } from "../context/OwnerContext.js";
import { OWNER_PLANS_LIST } from "../data/ownerPlans.js";
import { DEALER_PLANS_LIST } from "../../dealer/data/dealerPlans.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import ConfirmationModal from "../components/ConfirmationModal.js";
import { initialOwnerNameDraft, validateOwnerName, OWNER_NAME_MAX_LENGTH } from "../utils/ownerProfile.js";

export default function OwnerProfileScreen({ navigation, route }) {
  const isDealerMode = route?.params?.mode === "dealer";
  const { ownerProfile, subscription, hasDealerPlan, dealerSubscription } = useOwner();
  const plan = isDealerMode ? dealerSubscription : subscription;
  const planLimit = plan?.listingLimit === Infinity ? null : plan?.listingLimit;
  const planUsed = plan?.usedListings || 0;
  const openDealerPlans = () =>
    navigation.navigate("RolePlans", { lockedTab: "dealer" });
  const handleManagePlan = () => (isDealerMode ? openDealerPlans() : navigation.navigate("RolePlans", { lockedTab: "owner" }));
  // Renew: an already-purchased plan goes straight to checkout for the same
  // plan; with no plan yet, the user picks one on the Plans page.
  const handleRenewPlan = () => {
    const catalogue = isDealerMode ? DEALER_PLANS_LIST : OWNER_PLANS_LIST;
    const current = plan?.hasPurchased ? catalogue.find((p) => p.id === plan.id) : null;
    if (!current) {
      handleManagePlan();
      return;
    }
    navigation.navigate("OwnerPlanConfirm", {
      plan: {
        id: current.id,
        ...(isDealerMode ? { kind: "dealer" } : {}),
        name: current.name,
        price: current.price,
        originalPrice: current.originalPrice,
        priceNumeric:
          current.priceNumeric ?? (parseInt(String(current.price).replace(/[^0-9]/g, ""), 10) || 0),
        validity: current.validity,
        listingLimit: current.listingLimit,
        features: current.features,
        renewal: true,
      },
    });
  };
  const { logout, saveProfileName, saveProfileEmail } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Name editor (PATCH /users/me via AuthContext.saveProfileName). The
  // profile header re-renders from the server-confirmed user; on failure the
  // editor stays open with an honest error — success is never shown early.
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [nameError, setNameError] = useState(null);
  const [savingName, setSavingName] = useState(false);

  const openNameEditor = () => {
    setNameDraft(initialOwnerNameDraft(ownerProfile.name, ownerProfile.phone));
    setEmailDraft(ownerProfile.email || "");
    setNameError(null);
    setNameEditorOpen(true);
  };

  const handleSaveName = async () => {
    const result = validateOwnerName(nameDraft);
    if (!result.ok) {
      setNameError(result.error);
      return;
    }
    const typedEmail = emailDraft.trim();
    const emailChanged = typedEmail !== (ownerProfile.email || "");
    if (emailChanged && typedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typedEmail)) {
      setNameError("Please enter a valid email address.");
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await saveProfileName(result.firstName, result.lastName);
      if (emailChanged && saveProfileEmail) await saveProfileEmail(typedEmail);
      setNameEditorOpen(false);
    } catch (e) {
      setNameError(
        e && (e.status === 401 || e.kind === "login")
          ? "Your session has expired. Please log in again."
          : "Couldn't save your details. Please check your connection and try again."
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    if (logout) {
      await logout();
    }
    // Sign-out drops the whole stack on the logged-out auth entry route, so
    // no owner screen (and no previous owner's data) stays reachable and
    // Back cannot return to one.
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch {
      // The navigator may not be mounted; AuthContext already reset it.
    }
    Alert.alert("Logged Out", "You have been signed out of your owner account.");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />


      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HEADER (identity comes from the authenticated user) */}
        <View style={styles.profileHeaderCard}>
          <InitialsAvatar
            name={ownerProfile.name}
            uri={ownerProfile.avatar}
            style={styles.avatar}
            iconSize={24}
          />

          <View style={styles.profileInfo}>
            <TouchableOpacity
              style={styles.nameRow}
              onPress={openNameEditor}
              activeOpacity={0.7}
            >
              <Text style={styles.ownerName}>{ownerProfile.name}</Text>
              <Pencil size={15} color="#475569" style={styles.pencilIcon} />
            </TouchableOpacity>

            <Text style={styles.phoneText}>{ownerProfile.phone || "Phone not provided"}</Text>
            <Text style={styles.emailText}>{ownerProfile.email || "Email not provided"}</Text>

            {ownerProfile.verified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedBadgeText}>Verified Owner Partner</Text>
              </View>
            )}
          </View>
        </View>

        {/* MY PLAN (same card as the Agent profile) */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>MY PLAN</Text>

          <View style={styles.planCardItem}>
            <View style={styles.planCardTop}>
              <View style={styles.planTitleCol}>
                <Text style={styles.planTitleText}>
                  {plan?.hasPurchased ? plan.planName || plan.name : "No active plan"}
                </Text>
                <Text style={styles.planLimitSub}>
                  {planLimit == null
                    ? `${planUsed} Listings · Unlimited`
                    : `${planUsed}/${planLimit} Listings${planLimit - planUsed > 0 ? ` · ${planLimit - planUsed} remaining` : ""}`}
                </Text>
              </View>

              <View style={[styles.planActivePill, !(plan?.hasPurchased && plan?.active) && { backgroundColor: "#FEE2E2" }]}>
                <Text style={[styles.planActivePillText, !(plan?.hasPurchased && plan?.active) && { color: "#991B1B" }]}>
                  {!plan?.hasPurchased ? "No plan" : plan?.active ? "Active" : "Expired"}
                </Text>
              </View>
            </View>

            <View style={styles.planExpiryRow}>
              <Text style={styles.planExpiryLabel}>Expiry Date:</Text>
              <Text style={styles.planExpiryVal}>{plan?.expiryDate || "—"}</Text>
            </View>

            <TouchableOpacity style={styles.managePlanBtn} onPress={handleManagePlan} activeOpacity={0.8}>
              <Sparkles size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.managePlanBtnText}>Manage Plan</Text>
              <ChevronRight size={14} color={COLORS.primary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>

          </View>
        </View>

        {/* 1. ACCOUNT */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>ACCOUNT</Text>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={openNameEditor}
            accessibilityLabel="Edit personal information"
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <User size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Personal Information</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 2. MY ACTIVITY */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>MY ACTIVITY</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Properties")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Building2 size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>My Properties</Text>
            </View>
            <View style={styles.badgeRow}>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Leads")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Users size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>My Leads</Text>
            </View>
            <View style={styles.badgeRow}>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate("OwnerVisits")}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Calendar size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Site Visits</Text>
            </View>
            <View style={styles.badgeRow}>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. SUBSCRIPTION */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>SUBSCRIPTION</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleRenewPlan}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Repeat size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Renew Plan</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("PaymentHistory", { kind: isDealerMode ? "dealer" : "owner", view: "history" })}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <CreditCard size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Payment History</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate("PaymentHistory", { kind: isDealerMode ? "dealer" : "owner", view: "invoices" })}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <FileText size={18} color="#334155" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Invoices</Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 4. SETTINGS */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupHeading}>SETTINGS</Text>

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
            onPress={() => Alert.alert("Help & Support", "Email: support@restamp.in\nPhone: 1800-RESTAMP")}
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
            onPress={() => Alert.alert("Terms & Conditions", "RESTAMP Property Owner terms of service.")}
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
            onPress={() => Alert.alert("Privacy Policy", "RESTAMP user privacy and data security policy.")}
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

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Name editor */}
      <Modal
        visible={nameEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !savingName && setNameEditorOpen(false)}
      >
        <View style={styles.nameModalBackdrop}>
          <View style={styles.nameModalCard}>
            <Text style={styles.nameModalTitle}>Personal Information</Text>
            <Text style={styles.nameModalLabel}>Full Name</Text>
            <TextInput
              style={styles.nameModalInput}
              value={nameDraft}
              onChangeText={(t) => {
                setNameDraft(t);
                if (nameError) setNameError(null);
              }}
              placeholder="Your name"
              placeholderTextColor="#94A3B8"
              maxLength={OWNER_NAME_MAX_LENGTH}
              autoFocus
              editable={!savingName}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <Text style={styles.nameModalLabel}>Phone Number</Text>
            <TextInput
              style={[styles.nameModalInput, styles.nameModalInputLocked]}
              value={ownerProfile.phone || ""}
              editable={false}
              placeholder="No phone number"
              placeholderTextColor={COLORS.lightText}
            />
            <Text style={styles.nameModalHint}>Your login number can't be changed here.</Text>
            <Text style={styles.nameModalLabel}>Email Address</Text>
            <TextInput
              style={styles.nameModalInput}
              value={emailDraft}
              onChangeText={(t) => {
                setEmailDraft(t);
                if (nameError) setNameError(null);
              }}
              placeholder="Enter your email address"
              placeholderTextColor={COLORS.lightText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!savingName}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            {nameError ? <Text style={styles.nameModalError}>{nameError}</Text> : null}
            <View style={styles.nameModalActions}>
              <TouchableOpacity
                style={styles.nameModalCancel}
                onPress={() => setNameEditorOpen(false)}
                disabled={savingName}
                activeOpacity={0.8}
              >
                <Text style={styles.nameModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nameModalSave}
                onPress={handleSaveName}
                disabled={savingName}
                activeOpacity={0.8}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.nameModalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal before Logout as required */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out from your RESTAMP Owner account?"
        icon={LogOut}
        confirmText="Logout"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  planCardItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planTitleCol: {
    flex: 1,
  },
  planTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  planLimitSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  planActivePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planActivePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  planExpiryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  planExpiryLabel: {
    fontSize: 12,
    color: "#64748B",
    marginRight: 6,
  },
  planExpiryVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  managePlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  managePlanBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  nameModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  nameModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  nameModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  nameModalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 6,
    marginTop: 10,
  },
  nameModalInputLocked: {
    backgroundColor: COLORS.pillGray,
    color: COLORS.muted,
  },
  nameModalHint: {
    fontSize: 11,
    color: COLORS.lightText,
    marginTop: 4,
  },
  nameModalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  nameModalError: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.danger,
  },
  nameModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  nameModalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  nameModalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  nameModalSave: {
    minWidth: 88,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  nameModalSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
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
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  modeSwitchLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  modeSwitchIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modeSwitchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modeSwitchSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 3,
    lineHeight: 16,
    fontWeight: "400",
  },
  modeSwitchArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
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
  planBadge: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2563EB",
    marginRight: 6,
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
});
