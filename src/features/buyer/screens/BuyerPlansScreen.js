/**
 * RESTAMP buyer plans. Reached from a phone reveal that answered 402
 * BUYER_PLAN_REQUIRED (free leads used up), or directly.
 *
 * Payment is SIMULATED: "Pay" records a simulated payment on the server and
 * activates the plan. No money is charged.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Check, CheckCircle2, Phone } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import {
  fetchBuyerPlans,
  fetchMyBuyerPlan,
  subscribeBuyerPlan,
  formatPlanPrice,
} from "../../../shared/api/buyerPlans.js";

export default function BuyerPlansScreen({ navigation, route }) {
  const fromQuota = route?.params?.reason === "quota";
  const [plans, setPlans] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, me] = await Promise.all([
        fetchBuyerPlans(),
        fetchMyBuyerPlan().catch(() => null),
      ]);
      setPlans(list);
      setMine(me);
    } catch (e) {
      setLoadError("Couldn't load plans. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePay = async () => {
    if (!selected || paying) return;
    setPaying(true);
    setPayError(null);
    try {
      const result = await subscribeBuyerPlan(selected.code);
      setSuccess(result);
      setMine(result);
    } catch (e) {
      setPayError("Payment could not be completed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("MainTabs");
  };

  const leadsText = (p) =>
    p.lead_limit == null ? "Unlimited owner contacts" : `Up to ${p.lead_limit} owner contacts`;

  // ── Success ──
  if (success) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerBtn} />
          <Text style={styles.headerTitle}>Payment Successful</Text>
          <View style={styles.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={44} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>{success.plan_name} is active</Text>
          <Text style={styles.successSub}>
            You can view owner phone numbers again.
          </Text>
          <View style={styles.summaryCard}>
            <Row k="Plan" v={success.plan_name} />
            <Row
              k="Leads"
              v={success.lead_limit == null ? "Unlimited" : `${success.leads_used} of ${success.lead_limit} used`}
            />
            <Row k="Amount" v={formatPlanPrice(success.amount_paise)} />
            <Row k="Transaction" v={success.transaction_id} />
          </View>
          <Text style={styles.simNote}>Simulated payment — no real money was charged.</Text>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={goBack} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Back to Properties</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={goBack} accessibilityLabel="Back">
          <ArrowLeft size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buyer Plans</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {fromQuota && (
          <View style={styles.quotaBanner}>
            <Phone size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
            <Text style={styles.quotaText}>
              You've used your free owner contacts. Choose a plan to keep viewing owner phone numbers.
            </Text>
          </View>
        )}

        {mine && (
          <View style={styles.usageCard}>
            <Text style={styles.usageLabel}>Current plan</Text>
            <Text style={styles.usageValue}>{mine.plan_name}</Text>
            <Text style={styles.usageSub}>
              {mine.lead_limit == null
                ? `${mine.leads_used} contacts viewed · unlimited`
                : `${mine.leads_used} of ${mine.lead_limit} contacts used`}
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((p) => {
            const isCurrent = mine?.plan_code === p.code;
            const isSelected = selected?.code === p.code;
            return (
              <TouchableOpacity
                key={p.code}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                disabled={p.is_free}
                onPress={() => setSelected(p)}
                activeOpacity={0.85}
              >
                <View style={styles.planTop}>
                  <Text style={styles.planName}>{p.name}</Text>
                  {isCurrent && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPrice}>{formatPlanPrice(p.price_paise)}</Text>
                <View style={styles.featureRow}>
                  <Check size={14} color={COLORS.success} style={{ marginRight: 8 }} />
                  <Text style={styles.featureText}>{p.leads_label}</Text>
                </View>
                <View style={styles.featureRow}>
                  <Check size={14} color={COLORS.success} style={{ marginRight: 8 }} />
                  <Text style={styles.featureText}>{leadsText(p)}</Text>
                </View>
                <View style={styles.featureRow}>
                  <Check size={14} color={COLORS.success} style={{ marginRight: 8 }} />
                  <Text style={styles.featureText}>{p.duration_days} days validity</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        {payError && <Text style={styles.payError}>{payError}</Text>}
      </ScrollView>

      {selected && !selected.is_free && (
        <View style={styles.footer}>
          <Text style={styles.footerNote}>Simulated payment — no real money is charged.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, paying && { opacity: 0.7 }]}
            onPress={handlePay}
            disabled={paying}
            activeOpacity={0.85}
          >
            {paying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                Pay {formatPlanPrice(selected.price_paise)} · {selected.name}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Row({ k, v }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={styles.rowVal}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: COLORS.textDark },
  content: { padding: 16, paddingBottom: 32 },
  quotaBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  quotaText: { flex: 1, fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  usageCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  usageLabel: { fontSize: 12, color: "#64748B" },
  usageValue: { fontSize: 16, fontWeight: "700", color: COLORS.textDark, marginTop: 2 },
  usageSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  planCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  planCardSelected: { borderColor: COLORS.primary, borderWidth: 2, backgroundColor: COLORS.primaryLight },
  planTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  currentPill: {
    backgroundColor: COLORS.successBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentPillText: { fontSize: 12, fontWeight: "600", color: COLORS.success },
  planPrice: { fontSize: 24, fontWeight: "700", color: COLORS.textDark, marginTop: 6, marginBottom: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  featureText: { fontSize: 14, color: COLORS.textSecondary },
  errorBox: { alignItems: "center", marginTop: 32 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
  retryText: { fontSize: 14, fontWeight: "600", color: COLORS.primary, marginTop: 10 },
  payError: { fontSize: 14, color: "#DC2626", textAlign: "center", marginTop: 8 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  footerNote: { fontSize: 12, color: "#64748B", textAlign: "center", marginBottom: 8 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  successIcon: { alignItems: "center", marginTop: 24, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, textAlign: "center" },
  successSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginTop: 6 },
  summaryCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  rowKey: { fontSize: 14, color: "#64748B" },
  rowVal: { fontSize: 14, fontWeight: "600", color: COLORS.textDark, flexShrink: 1, textAlign: "right" },
  simNote: { fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 14 },
});
