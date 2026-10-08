import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import {
  MoreVertical,
  MapPin,
  Eye,
  MessageSquare,
  Calendar,
  AlertTriangle,
  Clock,
  ExternalLink,
  Edit,
  PauseCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import StatusBadge from "./StatusBadge";
import SafeImage from "../common/SafeImage";

export default function OwnerPropertyCard({
  property,
  onViewLeads,
  onViewProperty,
  onEditProperty,
  onPauseListing,
  onCloseListing,
  onDeleteDraft,
  onResubmit,
}) {
  const [menuVisible, setMenuVisible] = useState(false);

  const isDraft = property.status === "draft";
  const isRejected = property.status === "rejected";
  const isPending = property.status === "pending";
  const isActive = property.status === "active";
  const isClosed = property.status === "closed";

  const formattedPrice =
    property.priceFormatted ||
    (property.price
      ? `₹${property.price.toLocaleString("en-IN")}${property.priceUnit || ""}`
      : "Price On Request");

  const metadataString = [
    property.bhk && property.bhk !== "N/A" ? `${property.bhk} BHK` : null,
    property.builtUpArea,
    property.furnishing,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <View style={styles.card}>
      {/* Top Image + Badges */}
      <View style={styles.imageContainer}>
        <SafeImage
          source={{
            uri:
              property.coverPhoto ||
              property.images?.[0] ||
              "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
          }}
          style={styles.image}
        />
        <View style={styles.imageOverlayTop}>
          <StatusBadge status={property.status} />

          <TouchableOpacity
            style={styles.menuTrigger}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {property.purpose && (
          <View style={styles.purposePill}>
            <Text style={styles.purposeText}>FOR {property.purpose.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Card Content */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {property.title}
          </Text>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.locationText} numberOfLines={1}>
            {property.locality}, {property.city}
          </Text>
        </View>

        <Text style={styles.priceText}>{formattedPrice}</Text>

        {metadataString ? (
          <Text style={styles.metadataText} numberOfLines={1}>
            {metadataString}
          </Text>
        ) : null}

        {/* Rejection / Moderation Alert if applicable */}
        {isRejected && (
          <View style={styles.rejectionBox}>
            <AlertTriangle size={15} color="#DC2626" style={{ marginRight: 6, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionTitle}>Listing Rejected</Text>
              <Text style={styles.rejectionReason}>
                {property.rejectionReason || "Verification document requirement not met."}
              </Text>
            </View>
          </View>
        )}

        {isPending && (
          <View style={styles.pendingBox}>
            <Clock size={15} color="#D97706" style={{ marginRight: 6, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>Pending Verification</Text>
              <Text style={styles.pendingReason}>
                {property.moderationNote || "Listing will go live once RESTAMP team validates ownership."}
              </Text>
            </View>
          </View>
        )}

        {/* Statistics Bar for active/closed */}
        {!isDraft && !isPending && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Eye size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.statValue}>
                {property.views >= 1000 ? `${(property.views / 1000).toFixed(1)}K` : property.views || 0}
              </Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <MessageSquare size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.statValue}>{property.enquiries || 0}</Text>
              <Text style={styles.statLabel}>Enquiries</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Calendar size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.statValue}>{property.visits || 0}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
          </View>
        )}

        {/* Action Buttons based on status */}
        <View style={styles.actionRow}>
          {isDraft ? (
            <>
              <TouchableOpacity
                style={[styles.outlineBtn, { flex: 1, marginRight: 8 }]}
                onPress={() => onDeleteDraft?.(property)}
                activeOpacity={0.8}
              >
                <Trash2 size={15} color={COLORS.danger} style={{ marginRight: 4 }} />
                <Text style={[styles.outlineBtnText, { color: COLORS.danger }]}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 2 }]}
                onPress={() => onEditProperty?.(property)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Continue Listing</Text>
              </TouchableOpacity>
            </>
          ) : isRejected ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { width: "100%" }]}
              onPress={() => onResubmit?.(property)}
              activeOpacity={0.8}
            >
              <Edit size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Edit & Resubmit</Text>
            </TouchableOpacity>
          ) : isPending ? (
            <View style={styles.moderationNoticeBar}>
              <Text style={styles.moderationNoticeText}>Editing locked during verification</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => onViewLeads?.(property)}
                activeOpacity={0.8}
              >
                <MessageSquare size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>View Leads</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => onViewProperty?.(property)}
                activeOpacity={0.8}
              >
                <ExternalLink size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.outlineBtnText}>Preview</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 3-Dot Secondary Action Modal Sheet */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{property.title}</Text>
            <Text style={styles.sheetSubtitle}>Manage Property Listing</Text>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setMenuVisible(false);
                onViewProperty?.(property);
              }}
            >
              <ExternalLink size={18} color={COLORS.textDark} style={styles.sheetIcon} />
              <Text style={styles.sheetItemText}>View Property</Text>
            </TouchableOpacity>

            {!isPending && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  setMenuVisible(false);
                  onEditProperty?.(property);
                }}
              >
                <Edit size={18} color={COLORS.textDark} style={styles.sheetIcon} />
                <Text style={styles.sheetItemText}>Edit Property</Text>
              </TouchableOpacity>
            )}

            {isActive && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  setMenuVisible(false);
                  onPauseListing?.(property);
                }}
              >
                <PauseCircle size={18} color="#D97706" style={styles.sheetIcon} />
                <Text style={styles.sheetItemText}>Pause Listing</Text>
              </TouchableOpacity>
            )}

            {!isClosed && !isDraft && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  setMenuVisible(false);
                  onCloseListing?.(property);
                }}
              >
                <CheckCircle2 size={18} color={COLORS.textSecondary} style={styles.sheetIcon} />
                <Text style={styles.sheetItemText}>Close Listing</Text>
              </TouchableOpacity>
            )}

            {isDraft && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  setMenuVisible(false);
                  onDeleteDraft?.(property);
                }}
              >
                <Trash2 size={18} color={COLORS.danger} style={styles.sheetIcon} />
                <Text style={[styles.sheetItemText, { color: COLORS.danger }]}>Delete Draft</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginBottom: 16,
    overflow: "hidden",
  },
  imageContainer: {
    height: 170,
    width: "100%",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlayTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTrigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  purposePill: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  purposeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  body: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.primary,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "400",
    marginBottom: 12,
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#DC2626",
    marginBottom: 2,
  },
  rejectionReason: {
    fontSize: 11,
    color: "#991B1B",
    lineHeight: 15,
  },
  pendingBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  pendingTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#D97706",
    marginBottom: 2,
  },
  pendingReason: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 15,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textDark,
    marginRight: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#E2E8F0",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryBtn: {
    flex: 2,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  outlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: "500",
  },
  moderationNoticeBar: {
    width: "100%",
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  moderationNoticeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
    marginTop: 2,
    fontWeight: "400",
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetIcon: {
    marginRight: 14,
  },
  sheetItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textDark,
  },
});
