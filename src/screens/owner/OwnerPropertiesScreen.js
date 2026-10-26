import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Building2,
  X,
  Filter,
  ArrowUpRight,
  MoreHorizontal,
} from "../../components/common/HugeIcon";
import COLORS from "../../constants/colors";
import { useOwner, selectOwnerScopedProperties } from "../../context/OwnerContext";
import { useAuth } from "../../context/AuthContext";
import { fetchAllOwnerListings, toOwnerProperty, fetchDrafts, deleteDraft, freshAddParams, verifyListing, publishListing, archiveListing, updateListingStatus, deleteOwnerListing } from "../../api/owner";
import { resetToLogin } from "../../navigation/navRef";
import RestampLogo from "../../components/RestampLogo";
import AppBrandHeader from "../../components/AppBrandHeader";
import OwnerHeader from "../../components/owner/OwnerHeader";
import OwnerPropertyCard from "../../components/owner/OwnerPropertyCard";
import EmptyState from "../../components/owner/EmptyState";
import ConfirmationModal from "../../components/owner/ConfirmationModal";
import OwnerPropertyDetailModal from "./OwnerPropertyDetailModal";

const STATUS_TABS = [
  "All",
  "Active",
  "Pending",
  "Rejected",
  "Expired",
  "Closed",
  "Draft",
];

export default function OwnerPropertiesScreen({ route, navigation }) {
  const {
    properties: localProperties,
    updatePropertyStatus,
    deleteProperty,
  } = useOwner();
  const { user: authUser } = useAuth();
  // The owning account of this screen. Everything rendered here belongs to
  // this account only — the backend scopes the API response, and the locally
  // cached rows are filtered by the same owner id.
  const ownerUserId = authUser?.id ?? null;

  const initialTab = route?.params?.initialTab || "All";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [liveProperties, setLiveProperties] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  // Server-backed drafts (listing_drafts): the ONLY draft source for the
  // Draft tab. Local mock drafts are excluded below.
  const [serverDrafts, setServerDrafts] = useState([]);

  // Merge: live API listings take precedence; local rows are used ONLY when
  // they belong to the authenticated owner (never another account's rows).
  // Local mock drafts (status draft) are excluded — real drafts come from
  // the server and render in the Draft tab.
  const properties = useMemo(() => {
    const withoutMockDrafts = (list) => (list || []).filter((p) => p.status !== "draft");
    const scopedLocal = selectOwnerScopedProperties(localProperties, ownerUserId);
    if (!liveProperties) return withoutMockDrafts(scopedLocal);
    // Deduplicate by id string
    const liveIds = new Set(liveProperties.map((p) => p.id));
    const localOnly = scopedLocal.filter((p) => !liveIds.has(p.id));
    return [...withoutMockDrafts(liveProperties), ...withoutMockDrafts(localOnly)];
  }, [liveProperties, localProperties, ownerUserId]);

  const loadLiveListings = useCallback(() => {
    return fetchAllOwnerListings()
      .then((resp) => {
        setLiveProperties((resp.items || []).map(toOwnerProperty));
        setLoadError(null);
      })
      .catch((e) => {
        // An expired session must not keep showing the previous account's
        // rows: drop the cached list and return to the auth entry route.
        if (e && (e.status === 401 || e.kind === "login")) {
          setLiveProperties(null);
          setLoadError(null);
          resetToLogin();
          return;
        }
        setLoadError(
          "Couldn't load your listings. Check your connection and pull to refresh."
        );
      });
  }, []);

  const loadDrafts = useCallback(() => {
    fetchDrafts().then(setServerDrafts, () => {});
  }, []);

  // Load on mount and re-focus
  useEffect(() => {
    loadLiveListings();
    loadDrafts();
    const unsubListings = navigation.addListener("focus", loadLiveListings);
    const unsubDrafts = navigation.addListener("focus", loadDrafts);
    return () => {
      unsubListings();
      unsubDrafts();
    };
  }, [navigation, loadLiveListings, loadDrafts]);

  // Pull to refresh: the status of a listing can change server-side (an
  // explicit verification, an archive, a rejection), so the owner can always
  // re-read the authoritative state without signing out and back in.
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadLiveListings(), loadDrafts()]).finally(() => {
      setRefreshing(false);
    });
  }, [loadLiveListings, loadDrafts]);

  // Honor late navigation params (e.g. Save & Exit → Draft tab).
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Map one server draft to the OwnerPropertyCard shape (status draft).
  const draftToCard = (draft) => {
    const form = (draft && draft.form_data) || {};
    const photos = Array.isArray(form.photosList) ? form.photosList : [];
    const remotePhotos = photos.filter(
      (p) => p && typeof p.url === "string" && p.url
    );
    const cover =
      remotePhotos.find((p) => p.isCover) || remotePhotos[0] || null;
    const tx = (draft.transaction_type || "RENT").toUpperCase();
    const purpose =
      form.lookingTo ||
      (tx === "RENT" ? "Rent" : tx === "LEASE" ? "Lease" : tx === "RESALE" ? "Resale" : "New");
    const rent = Number(form.monthlyRent);
    return {
      id: `draft-${draft.id}`,
      draftId: draft.id,
      title: draft.title || "Untitled Draft",
      purpose,
      status: "draft",
      city: form.city || "",
      locality: form.locality || "",
      price: Number.isFinite(rent) && rent > 0 ? rent : null,
      priceUnit: tx === "RENT" || tx === "LEASE" ? "/ month" : "",
      bhk: form.bhk && form.bhk !== "N/A" ? form.bhk : "",
      builtUpArea: form.carpetArea ? `${form.carpetArea} sq.ft` : "",
      furnishing: form.furnishing || "",
      images: remotePhotos.map((p) => p.url),
      coverPhoto: cover ? cover.url : null,
      description: form.description || "",
      updatedAt: draft.updated_at || null,
    };
  };

  const draftCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return serverDrafts
      .map(draftToCard)
      .filter(
        (card) =>
          !query ||
          card.title.toLowerCase().includes(query) ||
          (card.locality || "").toLowerCase().includes(query)
      );
  }, [serverDrafts, searchQuery]);

  // Modals state
  const [selectedPropertyForPreview, setSelectedPropertyForPreview] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "primary",
  });

  // Filtered properties (Draft tab reads server drafts, not listings)
  const filteredProperties = useMemo(() => {
    if (activeTab === "Draft") return draftCards;
    return properties.filter((prop) => {
      // Tab filter
      if (activeTab !== "All") {
        if (activeTab === "Pending" && prop.status !== "pending") return false;
        if (activeTab === "Active" && prop.status !== "active") return false;
        if (activeTab === "Rejected" && prop.status !== "rejected") return false;
        if (activeTab === "Expired" && prop.status !== "expired") return false;
        if (activeTab === "Closed" && prop.status !== "closed") return false;
        if (activeTab === "Draft" && prop.status !== "draft") return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = prop.title.toLowerCase().includes(query);
        const matchesLocality = prop.locality?.toLowerCase().includes(query);
        const matchesAddress = prop.address?.toLowerCase().includes(query);
        return matchesTitle || matchesLocality || matchesAddress;
      }

      return true;
    });
  }, [properties, activeTab, searchQuery, draftCards]);

  // Handlers for property card actions
  const handleViewLeads = (property) => {
    navigation.navigate("OwnerPropertyLeads", { property });
  };

  const handleViewProperty = (property) => {
    setSelectedPropertyForPreview(property);
  };

  const handleEditProperty = (property) => {
    navigation.navigate("Add", { editingProperty: property });
  };

  const handlePauseListing = (property) => {
    setConfirmModal({
      visible: true,
      title: "Pause Listing?",
      message: `Pausing "${property.title}" will temporarily hide it from buyer searches. You can resume anytime.`,
      variant: "primary",
      confirmText: "Pause",
      onConfirm: () => {
        runListingTransition(property, () => archiveListing(serverListingId(property)), "paused");
        setConfirmModal((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handleCloseListing = (property) => {
    // Deal outcome picker: the backend supports SOLD/RENTED/LEASED closes
    // (all terminal) plus reversible archiving. The owner picks the real
    // outcome — never silently recorded as a generic close.
    Alert.alert(
      "Close Listing?",
      `How was "${property.title}" closed? Sold, rented and leased outcomes are final; archiving simply hides it and can be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sold",
          onPress: () =>
            runListingTransition(
              property,
              () => updateListingStatus(serverListingId(property), { status: "SOLD", closedReason: "Sold" }),
              "closed"
            ),
        },
        {
          text: "Rented",
          onPress: () =>
            runListingTransition(
              property,
              () => updateListingStatus(serverListingId(property), { status: "RENTED", closedReason: "Rented out" }),
              "closed"
            ),
        },
        {
          text: "Leased",
          onPress: () =>
            runListingTransition(
              property,
              () => updateListingStatus(serverListingId(property), { status: "LEASED", closedReason: "Leased out" }),
              "closed"
            ),
        },
        {
          text: "Just Archive",
          onPress: () => {
            setConfirmModal({
              visible: true,
              title: "Archive Listing?",
              message: `Archive "${property.title}"? It will be hidden from buyers but can be published again later.`,
              variant: "primary",
              confirmText: "Archive",
              onConfirm: () => {
                runListingTransition(
                  property,
                  () => updateListingStatus(serverListingId(property), { status: "CLOSED", closedReason: "Archived by Owner" }),
                  "closed"
                );
                setConfirmModal((prev) => ({ ...prev, visible: false }));
              },
            });
          },
        },
      ]
    );
  };

  // Remove a listing from active use (soft delete). Explicit confirmation,
  // refreshes list on success. Only server-backed listings (real listing_id)
  // can be removed; local/mock cards fall through to the legacy local close.
  const handleDeleteListing = (property) => {
    const listingId = serverListingId(property);
    if (listingId == null) {
      // Local-only card: fall back to legacy local removal (drafts are
      // handled separately via handleDeleteDraft).
      updatePropertyStatus(property.id, "closed");
      return;
    }
    setConfirmModal({
      visible: true,
      title: "Remove Listing?",
      message: `Remove "${property.title}" from the marketplace? It will be hidden from buyers, while its record and history are retained.`,
      variant: "primary",
      confirmText: "Remove",
      cancelText: "Cancel",
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        runListingTransition(
          property,
          () => deleteOwnerListing(listingId),
          "removed"
        );
      },
    });
  };

  // Numeric backend identity for server-backed cards; local/mock cards and
  // drafts resolve to null and keep the legacy local-only behavior below.
  const serverListingId = (property) => {
    const raw = property && (property.listing_id ?? property.listingId);
    const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // Guards duplicate taps while a lifecycle request is in flight.
  const [transitionBusyId, setTransitionBusyId] = useState(null);

  // Run a real backend lifecycle transition for server-backed cards, then
  // reload from the server. Local/mock cards fall back to the legacy local
  // status flip. Failures show an honest error and change nothing.
  const runListingTransition = (property, action, verb) => {
    const listingId = serverListingId(property);
    if (listingId == null) {
      updatePropertyStatus(property.id, verb === "published" ? "active" : "closed");
      return;
    }
    if (transitionBusyId === property.id) return;
    setTransitionBusyId(property.id);
    action().then(
      () => {
        setTransitionBusyId(null);
        loadLiveListings();
      },
      (e) => {
        setTransitionBusyId(null);
        if (e && (e.status === 401 || e.kind === "login")) {
          // The session is gone: drop the cached list and leave the owner on
          // the auth entry route instead of showing a stale property list.
          setLiveProperties(null);
          resetToLogin();
          return;
        }
        if (e && (e.status === 403 || e.kind === "denied")) {
          Alert.alert(
            "Owner Mode Required",
            "Your account must hold the Owner role for this property."
          );
          return;
        }
        Alert.alert(
          "Couldn't update listing",
          e?.status === 422 || e?.kind === "validation"
            ? "This change isn't allowed for the listing's current state."
            : "Please check your connection and try again."
        );
      }
    );
  };

  const handleVerifyListing = (property) => {
    setConfirmModal({
      visible: true,
      title: "Verify Listing?",
      message: `Verify "${property.title}"? Verified listings become visible to buyers.`,
      variant: "primary",
      confirmText: "Verify",
      onConfirm: () => {
        runListingTransition(property, () => verifyListing(serverListingId(property)), "published");
        setConfirmModal((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handlePublishListing = (property) => {
    runListingTransition(property, () => publishListing(serverListingId(property)), "published");
  };

  const handleDeleteDraft = (property) => {
    // Server drafts delete via API (confirm first); anything else falls back
    // to the legacy local removal.
    if (!property.draftId) {
      setConfirmModal({
        visible: true,
        title: "Delete Draft?",
        message: "Are you sure you want to delete this listing draft? This cannot be undone.",
        variant: "danger",
        confirmText: "Delete Draft",
        onConfirm: () => {
          deleteProperty(property.id);
          setConfirmModal((prev) => ({ ...prev, visible: false }));
        },
      });
      return;
    }
    setConfirmModal({
      visible: true,
      title: "Delete Draft?",
      message: `Delete "${property.title}"? Your saved progress will be permanently removed. Published properties are not affected.`,
      variant: "danger",
      confirmText: "Delete Draft",
      onConfirm: async () => {
        try {
          await deleteDraft(property.draftId);
          setServerDrafts((prev) => prev.filter((d) => d.id !== property.draftId));
        } catch {
          Alert.alert(
            "Could Not Delete Draft",
            "Please check your connection and try again."
          );
        } finally {
          setConfirmModal((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleContinueDraft = (property) => {
    const draft = serverDrafts.find((d) => d.id === property.draftId);
    navigation.navigate("Add", {
      draftId: property.draftId,
      ...(draft ? { draft } : {}),
    });
  };

  const handleResubmit = (property) => {
    navigation.navigate("Add", {
      editingProperty: property,
      initialStep: 5, // Jump to media/documents to fix issues
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BRAND HEADER (Matching Buyer Page) */}
      <AppBrandHeader
        currentRole="owner"
        rightActions={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={[styles.headerCircleBtn, showSearch && styles.headerCircleBtnActive]}
              onPress={() => setShowSearch(!showSearch)}
              activeOpacity={0.7}
            >
              <Search size={18} color={showSearch ? COLORS.primary : "#111111"} strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addPropertyCircleBtn}
              onPress={() => navigation.navigate("Add", freshAddParams())}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        }
        showNotification={false}
      />

      {/* Main Scrollable View */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Search Input Bar (Expandable) */}
        {showSearch && (
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBarCard}>
              <Search size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title, locality or address..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                underlineColorAndroid="transparent"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                  <X size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Screen Title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A", letterSpacing: -0.4 }}>
            My Properties
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            Manage and track your active property listings
          </Text>
        </View>

        {/* Honest load failure: the owner is told instead of being shown a
            stale list from a previous session. */}
        {loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        ) : null}

        {/* Horizontally Scrollable Status Tabs (Matching Buyer Search Properties Filter Bar) */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {/* Main Filter Icon Button */}
            <TouchableOpacity
              style={[styles.filterIconPill, showSearch && styles.filterIconPillActive]}
              activeOpacity={0.8}
              onPress={() => setShowSearch(!showSearch)}
            >
              <SlidersHorizontal size={15} color={showSearch ? COLORS.primary : "#334155"} />
            </TouchableOpacity>

            {STATUS_TABS.map((tab) => {
              const count =
                tab === "All"
                  ? properties.length
                  : tab === "Draft"
                    ? draftCards.length
                    : properties.filter((p) => p.status.toLowerCase() === tab.toLowerCase()).length;
              const isActive = activeTab === tab;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterDropdownPill, isActive && styles.filterDropdownPillActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterDropdownText, isActive && styles.filterDropdownTextActive]}>
                    {tab}
                  </Text>
                  <View style={[styles.tabCountBadge, isActive && styles.tabCountBadgeActive]}>
                    <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {filteredProperties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={
              activeTab === "All"
                ? "No Properties Yet"
                : activeTab === "Draft"
                  ? "No Saved Drafts Yet"
                  : `No ${activeTab} Properties`
            }
            description={
              activeTab === "All"
                ? "Start by adding your first property to receive verified buyer enquiries."
                : activeTab === "Draft"
                  ? "Start a listing and tap Save Draft to resume it here later."
                  : `You currently have zero properties under the ${activeTab} category.`
            }
            buttonTitle="Add Property"
            onButtonPress={() => navigation.navigate("Add", freshAddParams())}
          />
        ) : (
          filteredProperties.map((prop) => (
            <OwnerPropertyCard
              key={prop.id}
              property={prop}
              onViewLeads={handleViewLeads}
              onViewProperty={handleViewProperty}
              onEditProperty={
                prop.status === "draft" && prop.draftId
                  ? handleContinueDraft
                  : handleEditProperty
              }
              onPauseListing={handlePauseListing}
              onCloseListing={handleCloseListing}
              onRemoveListing={handleDeleteListing}
              onVerifyListing={handleVerifyListing}
              onPublishListing={handlePublishListing}
              onDeleteListing={handleDeleteListing}
              onDeleteDraft={handleDeleteDraft}
              onResubmit={handleResubmit}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Full Preview Modal for Owner */}
      <OwnerPropertyDetailModal
        visible={Boolean(selectedPropertyForPreview)}
        property={selectedPropertyForPreview}
        onClose={() => setSelectedPropertyForPreview(null)}
        onEdit={(prop) => {
          setSelectedPropertyForPreview(null);
          handleEditProperty(prop);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  brandIconWrapper: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitles: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  headerCircleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  addPropertyCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  searchBarCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: COLORS.textDark,
    outlineStyle: "none",
    outlineWidth: 0,
  },
  tabsContainer: {
    marginHorizontal: -20,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  tabsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterIconPill: {
    width: 36,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterIconPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  filterDropdownPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  filterDropdownPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  filterDropdownText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  filterDropdownTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  tabCountBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  tabCountBadgeActive: {
    backgroundColor: "#DBEAFE",
  },
  tabCountText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    includeFontPadding: false,
  },
  tabCountTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorBannerText: {
    fontSize: 12,
    color: "#991B1B",
    lineHeight: 17,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  bigCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  bigCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bigCardTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.3,
  },
  moreIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statTile: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statTileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  statTileNumber: {
    fontSize: 24,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.5,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  statTileLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "400",
    marginTop: 4,
  },
});
