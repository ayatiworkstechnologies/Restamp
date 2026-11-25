/**
 * RESTAMP buyer plans. Reached from a phone reveal that answered 402
 * BUYER_PLAN_REQUIRED (free leads used up), or directly.
 *
 * Payment is SIMULATED: "Pay" records a simulated payment on the server and
 * activates the plan. No money is charged.
 *
 * Built from the shared RESTAMP plan/payment components (PlanCard,
 * PaymentHeader, PaymentInvoice, PaymentFooter) so it matches Owner, Dealer
 * and Agent plan screens.
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
import { Phone } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import PlanCard from "../../../shared/components/PlanCard.js";
import PaymentHeader from "../../../shared/components/PaymentHeader.js";
import PaymentInvoice from "../../../shared/components/PaymentInvoice.js";
import PaymentFooter from "../../../shared/components/PaymentFooter.js";
import { useAuth } from "../../auth/context/AuthContext.js";
import {
  fetchBuyerPlans,
  fetchMyBuyerPlan,
  subscribeBuyerPlan,
  formatPlanPrice,
} from "../../../shared/api/buyerPlans.js";

// `embedded`: rendered as the Buyer tab inside the Plans menu (MenuScreen),
// without its own safe area or header.
export default function BuyerPlansScreen({ navigation, route, embedded = false }) {
  const Shell = embedded ? View : SafeAreaView;
  const shellProps = embedded ? { style: styles.safe } : { style: styles.safe, edges: ["top", "bottom"] };
  const auth = useAuth();
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

  // ── Success (same invoice layout as Owner / Dealer / Agent) ──
  if (success) {
    const invoiceDate = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return (
      <Shell {...shellProps}>
        {!embedded && <PaymentHeader title="Invoice" onBack={goBack} />}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PaymentInvoice
            invoiceNo={success.transaction_id}
            date={invoiceDate}
            billedName={auth?.user?.name || auth?.user?.full_name || "Restamp Buyer"}
            billedPhone={auth?.user?.phone || auth?.user?.phone_number || ""}
            itemTitle={success.plan_name}
            itemSub="Buyer plan · You can view owner phone numbers again"
            amount={formatPlanPrice(success.amount_paise)}
            rows={[
              {
                label: "Leads",
                value:
                  success.lead_limit == null
                    ? "Unlimited"
                    : `${success.leads_used} of ${success.lead_limit} used`,
              },
            ]}
          />
        </ScrollView>
        <PaymentFooter primaryLabel={embedded ? "Done" : "Back to Properties"} onPrimary={embedded ? () => setSuccess(null) : goBack} />
      </Shell>
    );
  }

  return (
    <Shell {...shellProps}>
      {!embedded && <PaymentHeader title="Buyer Plans" onBack={goBack} />}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
              <PlanCard
                key={p.code}
                name={p.name}
                price={formatPlanPrice(p.price_paise)}
                currentLabel={isCurrent ? "Current" : undefined}
                features={[p.leads_label, leadsText(p), `${p.duration_days} days validity`]}
                buttonText={isSelected ? "Selected" : p.is_free ? "Free plan" : "Select Plan"}
                selected={isSelected}
                disabled={p.is_free}
                onPress={() => setSelected(p)}
              />
            );
          })
        )}
        {payError && <Text style={styles.payError}>{payError}</Text>}
      </ScrollView>

      {selected && !selected.is_free && (
        <PaymentFooter
          note="Simulated payment — no real money is charged."
          primaryLabel={`Pay ${formatPlanPrice(selected.price_paise)} · ${selected.name}`}
          onPrimary={handlePay}
          loading={paying}
        />
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
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
    borderColor: COLORS.borderLight,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  usageLabel: { fontSize: 12, color: COLORS.muted },
  usageValue: { fontSize: 16, fontWeight: "700", color: COLORS.textDark, marginTop: 2 },
  usageSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  errorBox: { alignItems: "center", marginTop: 32 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
  retryText: { fontSize: 14, fontWeight: "600", color: COLORS.primary, marginTop: 10 },
  payError: { fontSize: 14, color: COLORS.danger, textAlign: "center", marginTop: 8 },
});
