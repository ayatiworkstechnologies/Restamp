import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
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
  Clock,
} from "../../components/common/HugeIcon";
import SafeImage from "../../components/common/SafeImage";
import PropertyDetailModal from "../../components/PropertyDetailModal";
import ALL_PROPERTIES from "../../data/properties";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeNotifications,
} from "../../data/notificationsStore";
import COLORS from "../../constants/colors";
import TYPOGRAPHY from "../../constants/typography";
import { useWishlist } from "../../context/WishlistContext";
import { useRequireAuth } from "../../auth/useRequireAuth";

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

  // Group by Today vs Earlier
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
    const size = 20;
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

  const renderNotificationCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.card,
        !item.isRead && styles.cardUnread,
      ]}
      activeOpacity={0.88}
      onPress={() => handleNotificationPress(item)}
    >
      {/* Unread blue dot indicator */}
      {!item.isRead && <View style={styles.unreadDot} />}

      <View style={styles.cardMainRow}>
        {/* Left Icon Badge */}
        <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
          {renderIcon(item)}
        </View>

        {/* Center Details */}
        <View style={styles.cardContent}>
          <View style={styles.metaRow}>
            <View style={[styles.categoryTag, { backgroundColor: item.iconBg }]}>
              <Text style={[styles.categoryTagText, { color: item.iconColor }]}>
                {item.category.toUpperCase()}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <Clock size={11} color="#94A3B8" style={{ marginRight: 3 }} />
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>

          <Text style={[styles.titleText, !item.isRead && styles.titleTextUnread]}>
            {item.title}
          </Text>

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
      </View>

      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={(e) => handleDelete(item.id, e)}
      >
        <Trash2 size={13} color="#94A3B8" />
      </TouchableOpacity>
    </TouchableOpacity>
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

      {/* NOTIFICATIONS LIST */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Bell size={36} color={COLORS.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtitle}>
              You have no {selectedCategory !== "All" ? selectedCategory.toLowerCase() : ""}{" "}
              notifications at the moment.
            </Text>
          </View>
        ) : (
          <>
            {todayList.length > 0 && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>TODAY</Text>
                {todayList.map(renderNotificationCard)}
              </View>
            )}

            {earlierList.length > 0 && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>EARLIER</Text>
                {earlierList.map(renderNotificationCard)}
              </View>
            )}

            {/* Notification settings tip */}
            <View style={styles.prefFooterCard}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIconWrap}>
                  <Settings size={18} color={COLORS.primary} />
                </View>
                <View style={styles.prefTextWrap}>
                  <Text style={styles.prefTitle}>Notification Preferences</Text>
                  <Text style={styles.prefSubtitle}>
                    Customise alerts for price drops & site visits
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.prefActionBtn}
                onPress={() => navigation.navigate("Profile")}
                activeOpacity={0.8}
              >
                <Text style={styles.prefActionText}>Manage</Text>
                <ChevronRight size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 18,
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 12.5,
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
    paddingHorizontal: 18,
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
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BFDBFE",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  cardMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  categoryTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "500",
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 20,
    marginBottom: 4,
  },
  titleTextUnread: {
    fontWeight: "700",
    color: "#0F172A",
  },
  messageText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 6,
  },
  actionPromptRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  actionPromptText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.primary,
    marginRight: 2,
  },
  thumbnail: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginLeft: 8,
    alignSelf: "center",
  },
  deleteBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
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
  prefFooterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  prefLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  prefIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  prefTextWrap: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  prefSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  prefActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: "#EFF6FF",
  },
  prefActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginRight: 2,
  },
});
