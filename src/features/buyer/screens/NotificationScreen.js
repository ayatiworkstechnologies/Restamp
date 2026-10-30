import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  Check,
  Tag,
  Calendar,
  ShieldCheck,
  Star,
  Sparkles,
  Home,
  Trash2,
  Settings,
  ChevronRight,
} from "../../../shared/components/HugeIcon.js";
import SafeImage from "../../../shared/components/SafeImage.js";
import PropertyDetailModal from "../components/PropertyDetailModal.js";
import ALL_PROPERTIES from "../data/properties.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeNotifications,
} from "../../../shared/data/notificationsStore.js";
import COLORS from "../../../shared/constants/colors.js";
import TYPOGRAPHY from "../../../shared/constants/typography.js";
import { useWishlist } from "../context/WishlistContext.js";
import { useRequireAuth } from "../../auth/useRequireAuth.js";

const CATEGORIES = ["All", "Properties", "Visits", "System"];

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState(getNotifications());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProperty, setSelectedProperty] = useState(null);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const requireAuth = useRequireAuth(navigation);

  useEffect(() => {
    const unsubscribe = subscribeNotifications((updated) => {
      setNotifications(updated);
    });
    return unsubscribe;
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "All") return notifications;
    return notifications.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  const todayList = useMemo(
    () => filteredNotifications.filter((n) => n.dateGroup === "Today"),
    [filteredNotifications]
  );
  const earlierList = useMemo(
    () => filteredNotifications.filter((n) => n.dateGroup === "Earlier"),
    [filteredNotifications]
  );

  const handleNotificationPress = (item) => {
    markAsRead(item.id);

    if (item.propertyId) {
      const prop = (ALL_PROPERTIES || []).find((p) => p.id === item.propertyId);
      if (prop) {
        setSelectedProperty(prop);
        return;
      }
    }

    if (item.category === "Visits") {
      navigation.navigate("Activity");
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation?.();
    deleteNotification(id);
  };

  const renderIcon = (item) => {
    const size = 19;
    switch (item.icon) {
      case "tag":
        return <Tag size={size} color={item.iconColor} strokeWidth={2} />;
      case "calendar":
        return <Calendar size={size} color={item.iconColor} strokeWidth={2} />;
      case "home":
        return <Home size={size} color={item.iconColor} strokeWidth={2} />;
      case "shield":
        return <ShieldCheck size={size} color={item.iconColor} strokeWidth={2} />;
      case "star":
        return <Star size={size} color={item.iconColor} strokeWidth={2} />;
      case "sparkles":
        return <Sparkles size={size} color={item.iconColor} strokeWidth={2} />;
      default:
        return <Bell size={size} color={item.iconColor} strokeWidth={2} />;
    }
  };

  const renderNotificationRow = (item, index, listArr) => (
    <View key={item.id} style={styles.rowWrapper}>
      <TouchableOpacity
        style={[
          styles.rowItem,
          !item.isRead && styles.rowItemUnread,
        ]}
        activeOpacity={0.75}
        onPress={() => handleNotificationPress(item)}
      >
        {/* Left Icon Badge */}
        <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
          {renderIcon(item)}
        </View>

        {/* Center Details */}
        <View style={styles.contentWrap}>
          <View style={styles.topMetaRow}>
            <View style={styles.titleWithDot}>
              {!item.isRead && <View style={styles.unreadDot} />}
              <Text
                style={[styles.titleText, !item.isRead && styles.titleTextUnread]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </View>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>

          <Text style={styles.messageText} numberOfLines={2}>
            {item.message}
          </Text>

          {item.propertyId && (
            <View style={styles.actionPromptRow}>
              <Text style={styles.actionPromptText}>View property details</Text>
              <ChevronRight size={13} color={COLORS.primary} strokeWidth={2.4} />
            </View>
          )}
        </View>

        {/* Right Thumbnail Image if property notification */}
        {item.image ? (
          <SafeImage
            source={{ uri: item.image }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : null}
      </TouchableOpacity>

      {/* Hairline divider between rows, indented under the content */}
      {index < listArr.length - 1 && <View style={styles.divider} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            ) : null}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            activeOpacity={0.8}
          >
            <Check size={14} color={COLORS.primary} strokeWidth={2.4} style={{ marginRight: 4 }} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FILTER PILLS */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* FLAT NOTIFICATIONS LIST */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Bell size={34} color={COLORS.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySubtitle}>
              You have no {selectedCategory !== "All" ? selectedCategory.toLowerCase() : ""}{" "}
              notifications right now.
            </Text>
          </View>
        ) : (
          <>
            {todayList.length > 0 && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>TODAY</Text>
                {todayList.map((item, idx) => renderNotificationRow(item, idx, todayList))}
              </View>
            )}

            {earlierList.length > 0 && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>EARLIER</Text>
                {earlierList.map((item, idx) => renderNotificationRow(item, idx, earlierList))}
              </View>
            )}

            {/* Notification settings footer row */}
            <TouchableOpacity
              style={styles.prefFooterRow}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.75}
            >
              <View style={styles.prefLeft}>
                <View style={styles.prefIconWrap}>
                  <Settings size={18} color="#64748B" />
                </View>
                <View style={styles.prefTextWrap}>
                  <Text style={styles.prefTitle}>Notification Settings</Text>
                  <Text style={styles.prefSubtitle}>
                    Manage push alerts for price drops & site visits
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Property detail viewer if tapped from notification */}
      {selectedProperty && (
        <PropertyDetailModal
          visible={!!selectedProperty}
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onSelectProperty={(prop) => setSelectedProperty(prop)}
          onLoginRequired={(resume) => requireAuth(resume)}
          isWishlisted={isWishlisted}
          onToggleWishlist={toggleWishlist}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  unreadBadge: {
    marginLeft: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: "#EFF6FF",
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  filterRow: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionWrap: {
    marginTop: 14,
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  rowWrapper: {
    backgroundColor: "#FFFFFF",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  rowItemUnread: {
    backgroundColor: "#F8FAFC",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },
  contentWrap: {
    flex: 1,
    marginRight: 8,
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titleWithDot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 20,
  },
  titleTextUnread: {
    fontWeight: "700",
    color: "#0F172A",
  },
  timeText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },
  messageText: {
    fontSize: 13.5,
    color: "#64748B",
    lineHeight: 19,
    marginTop: 2,
  },
  actionPromptRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  actionPromptText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.primary,
    marginRight: 2,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    marginLeft: 6,
    alignSelf: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 78, // Aligns exactly under the text, indented past the icon
    marginRight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  prefFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 16,
  },
  prefLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  prefIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  prefTextWrap: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  prefSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
});
