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
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
import { fetchOwnerListings, toOwnerProperty, fetchDrafts, deleteDraft } from "../../api/owner";
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

  const initialTab = route?.params?.initialTab || "All";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [liveProperties, setLiveProperties] = useState(null);
  // Server-backed drafts (listing_drafts): the ONLY draft source for the
  // Draft tab. Local mock drafts are excluded below.
  const [serverDrafts, setServerDrafts] = useState([]);

  // Merge: live API listings take precedence; fall back to local OwnerContext.
  // Local mock drafts (status draft) are excluded — real drafts come from
  // the server and render in the Draft tab.
  const properties = useMemo(() => {
    const withoutMockDrafts = (list) => (list || []).filter((p) => p.status !== "draft");
    if (!liveProperties) return withoutMockDrafts(localProperties);
    // Deduplicate by id string
    const liveIds = new Set(liveProperties.map((p) => p.id));
    const localOnly = localProperties.filter((p) => !liveIds.has(p.id));
    return [...withoutMockDrafts(liveProperties), ...withoutMockDrafts(localOnly)];
  }, [liveProperties, localProperties]);

  const loadLiveListings = useCallback(() => {
    fetchOwnerListings(1, 50)
      .then((resp) => setLiveProperties((resp.items || []).map(toOwnerProperty)))
      .catch(() => {}); // silently fall back to local data
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
        updatePropertyStatus(property.id, "closed", { pauseReason: "Owner Paused" });
        setConfirmModal((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handleCloseListing = (property) => {
    setConfirmModal({
      visible: true,
      title: "Close Listing?",
      message: `Mark "${property.title}" as closed? This indicates the property was rented, sold, or taken off market.`,
      variant: "primary",
      confirmText: "Close Listing",
      onConfirm: () => {
        updatePropertyStatus(property.id, "closed", { closedOutcome: "Closed by Owner" });
        setConfirmModal((prev) => ({ ...prev, visible: false }));
      },
    });
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
              onPress={() => navigation.navigate("Add")}
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
            buttonTitle="+ Add Property"
            onButtonPress={() => navigation.navigate("Add")}
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
