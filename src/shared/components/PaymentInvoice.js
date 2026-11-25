// Shared "payment successful" receipt card used by Owner, Dealer, Agent and
// Buyer success screens (extracted from the Owner invoice). Content is passed
// in; the layout is identical everywhere:
// brand + PAID pill → invoice no./date → billed to → line item → totals → note.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check } from "./HugeIcon.js";
import COLORS from "../constants/colors.js";
import RestampWordmark from "./RestampWordmark.js";

export default function PaymentInvoice({
  invoiceNo = "—",
  date,
  billedName,
  billedPhone,
  itemTitle,
  itemSub,
  amount,
  rows = [], // optional extra summary rows: [{ label, value }]
  note = "Simulated payment — no real money was charged. This is not a tax invoice.",
  style,
}) {
  return (
    <View style={[styles.invoice, style]}>
      <View style={styles.top}>
        <RestampWordmark height={16} />
        <View style={styles.paidPill}>
          <Check size={12} color={COLORS.success} strokeWidth={3} />
          <Text style={styles.paidPillText}>PAID</Text>
        </View>
      </View>

      <Text style={styles.heading}>Invoice</Text>
      <View style={styles.metaRow}>
        <View>
          <Text style={styles.metaLabel}>Invoice No.</Text>
          <Text style={styles.metaVal}>{invoiceNo}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaVal}>{date}</Text>
        </View>
      </View>

      {billedName ? (
        <View style={styles.billed}>
          <Text style={styles.metaLabel}>Billed to</Text>
          <Text style={styles.metaVal}>{billedName}</Text>
          {billedPhone ? <Text style={styles.metaSub}>{billedPhone}</Text> : null}
        </View>
      ) : null}

      <View style={styles.dashed} />

      <View style={styles.itemRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.itemTitle}>{itemTitle}</Text>
          {itemSub ? <Text style={styles.itemSub}>{itemSub}</Text> : null}
        </View>
        <Text style={styles.itemAmt}>{amount}</Text>
      </View>

      <View style={styles.dashed} />

      <View style={styles.sumRow}>
        <Text style={styles.sumKey}>Subtotal</Text>
        <Text style={styles.sumVal}>{amount}</Text>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={styles.sumRow}>
          <Text style={styles.sumKey}>{r.label}</Text>
          <Text style={styles.sumVal}>{r.value}</Text>
        </View>
      ))}
      <View style={styles.sumRow}>
        <Text style={styles.sumKey}>Payment</Text>
        <Text style={styles.sumVal}>Successful</Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalKey}>Total Paid</Text>
        <Text style={styles.totalVal}>{amount}</Text>
      </View>

      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  invoice: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paidPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 100,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  paidPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.success,
    letterSpacing: 0.6,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textDark,
    letterSpacing: -0.5,
    marginTop: 20,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 11.5,
    color: COLORS.muted,
    fontWeight: "500",
  },
  metaVal: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
    marginTop: 3,
  },
  metaSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  billed: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.pageBackground,
  },
  dashed: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.borderInput,
    marginVertical: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  itemSub: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 3,
    lineHeight: 18,
  },
  itemAmt: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sumKey: {
    fontSize: 13,
    color: COLORS.muted,
  },
  sumVal: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
  },
  totalKey: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },
  note: {
    fontSize: 11.5,
    color: COLORS.lightText,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
});
