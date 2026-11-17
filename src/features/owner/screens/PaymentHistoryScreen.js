// Payment History + Invoices for the Owner / Dealer profile.
// params: { kind: "owner" | "dealer", view: "history" | "invoices" }
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Check, CreditCard, FileText, X, ChevronRight } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import RestampWordmark from "../../../shared/components/RestampWordmark.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import { useOwner } from "../context/OwnerContext.js";
import { formatListingLimit } from "../data/ownerPlans.js";

export default function PaymentHistoryScreen({ route, navigation }) {
  const kind = route?.params?.kind === "dealer" ? "dealer" : "owner";
  const view = route?.params?.view === "invoices" ? "invoices" : "history";
  const auth = useAuth();
  const { paymentHistory, subscription, dealerSubscription } = useOwner();
  const [selected, setSelected] = useState(null);

  const entries = useMemo(() => {
    const local = (paymentHistory || []).filter((p) => p.kind === kind);
    if (local.length) return local;
    // Nothing paid in this session: show the saved plan purchase, if any.
    const plan = kind === "dealer" ? dealerSubscription : subscription;
    if (!plan?.hasPurchased) return [];
    return [
      {
        id: plan.txnId || `RST-${String(plan.id || "plan").toUpperCase()}`,
        kind,
        planName: plan.planName || plan.name,
        amount: plan.amountPaid || plan.price || "—",
        validity: plan.validity || "",
        listingLimit: plan.listingLimit,
        date: plan.startDate || "—",
        status: "Success",
      },
    ];
  }, [paymentHistory, subscription, dealerSubscription, kind]);

  const title = view === "invoices" ? "Invoices" : "Payment History";
  const roleLabel = kind === "dealer" ? "Dealer" : "Owner";
  const billedName = auth?.user?.name || auth?.user?.full_name || `Restamp ${roleLabel}`;
  const billedPhone = auth?.user?.phone || auth?.user?.phone_number || "";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <CreditCard size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptySub}>Your {roleLabel.toLowerCase()} plan payments will appear here.</Text>
          </View>
        ) : (
          entries.map((e) => (
            <TouchableOpacity key={e.id} style={styles.row} onPress={() => setSelected(e)} activeOpacity={0.8}>
              <View style={styles.rowIcon}>
                {view === "invoices" ? (
                  <FileText size={18} color={COLORS.primary} />
                ) : (
                  <CreditCard size={18} color={COLORS.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{e.planName}</Text>
                <Text style={styles.rowSub}>
                  {view === "invoices" ? `Invoice ${e.id}` : e.date} · {e.status}
                </Text>
              </View>
              <Text style={styles.rowAmt}>{e.amount}</Text>
              <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          {selected && (
            <View style={styles.invoice}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={18} color="#475569" />
              </TouchableOpacity>
              <View style={styles.invTop}>
                <RestampWordmark height={16} />
                <View style={styles.paidPill}>
                  <Check size={12} color="#16A34A" strokeWidth={3} />
                  <Text style={styles.paidPillText}>PAID</Text>
                </View>
              </View>
              <Text style={styles.invHeading}>Invoice</Text>
              <View style={styles.metaRow}>
                <View>
                  <Text style={styles.metaLabel}>Invoice No.</Text>
                  <Text style={styles.metaVal}>{selected.id}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaVal}>{selected.date}</Text>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={styles.metaLabel}>Billed to</Text>
                <Text style={styles.metaVal}>{billedName}</Text>
                {billedPhone ? <Text style={styles.metaSub}>{billedPhone}</Text> : null}
              </View>
              <View style={styles.dashed} />
              <View style={styles.itemRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.itemTitle}>{selected.planName}</Text>
                  <Text style={styles.metaSub}>
                    {roleLabel} plan{selected.validity ? ` · ${selected.validity}` : ""}
                    {selected.listingLimit != null ? ` · ${formatListingLimit(selected.listingLimit)}` : ""}
                  </Text>
                </View>
                <Text style={styles.itemTitle}>{selected.amount}</Text>
              </View>
              <View style={styles.dashed} />
              <View style={styles.totalRow}>
                <Text style={styles.totalKey}>Total Paid</Text>
                <Text style={styles.totalVal}>{selected.amount}</Text>
              </View>
              <Text style={styles.note}>
                Simulated payment — no real money was charged. This is not a tax invoice.
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A", marginLeft: 4 },
  content: { padding: 16 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginTop: 10 },
  emptySub: { fontSize: 13, color: "#64748B", marginTop: 4, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  rowSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  rowAmt: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 16 },
  invoice: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18 },
  closeBtn: { position: "absolute", top: 10, right: 10, padding: 6, zIndex: 1 },
  invTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginRight: 30 },
  paidPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidPillText: { fontSize: 11, fontWeight: "800", color: "#16A34A", marginLeft: 4 },
  invHeading: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginTop: 14 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  metaLabel: { fontSize: 11, color: "#64748B" },
  metaVal: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginTop: 2 },
  metaSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  dashed: { borderTopWidth: 1, borderStyle: "dashed", borderColor: "#CBD5E1", marginVertical: 14 },
  itemRow: { flexDirection: "row", alignItems: "flex-start" },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalKey: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  totalVal: { fontSize: 15, fontWeight: "800", color: COLORS.primary },
  note: { fontSize: 11, color: "#94A3B8", marginTop: 14 },
});
