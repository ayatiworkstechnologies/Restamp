import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Phone, MessageSquare, Calendar, ChevronRight, Eye } from "lucide-react-native";
import COLORS from "../../constants/colors";
import StatusBadge from "./StatusBadge";

export default function LeadCard({
  lead,
  onViewDetails,
  compact = false,
}) {
  const isNew = lead.status === "new";
  const isVisitScheduled = lead.status === "visit_scheduled";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onViewDetails?.(lead)}
      activeOpacity={0.92}
    >
      {/* Top Header: Avatar, Name, Role & StatusBadge */}
      <View style={styles.topRow}>
        <Image
          source={{
            uri:
              lead.avatar ||
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
          }}
          style={styles.avatar}
        />

        <View style={styles.customerInfo}>
          <Text style={styles.customerName} numberOfLines={1}>
            {lead.customerName}
          </Text>
          <Text style={styles.customerRole} numberOfLines={1}>
            {isNew ? "New Enquiry" : "Verified Customer"} • {lead.budget ? `${lead.budget} • ` : ""}{lead.timestamp || "Today"}
          </Text>
        </View>

        <StatusBadge status={lead.status} />
      </View>

      {/* Body: Enquiry Snippet / Message */}
      <Text style={styles.messageText} numberOfLines={3}>
        {lead.message ||
          `Interested in ${lead.propertyTitle || "Property"}${
            lead.propertyLocality ? ` • ${lead.propertyLocality}` : ""
          }${lead.requirement ? `. ${lead.requirement}` : ". Enquiry submitted."}`}
      </Text>

      {/* Visit Scheduled Alert Chip (if applicable) */}
      {isVisitScheduled && lead.visitData && (
        <View style={styles.visitChipRow}>
          <Calendar size={13} color="#D97706" style={{ marginRight: 5 }} />
          <Text style={styles.visitChipText}>
            Visit: {lead.visitData.date}, {lead.visitData.time}
          </Text>
        </View>
      )}

      {/* Footer: View Details Button Only (No share, call, chat) */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => onViewDetails?.(lead)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewDetailsBtnText}>View Details</Text>
          <ChevronRight size={15} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "#E2E8F0",
  },
  customerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  customerName: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  customerRole: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "400",
  },
  messageText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
    marginTop: 13,
    fontWeight: "400",
  },
  visitChipRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  visitChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
  },
  footerRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 6,
  },
  viewDetailsBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
