// Dealer plan purchase: pick an option tab (30 days at ₹200 per pincode or
// 60 days at ₹300 per pincode), pick the pincodes, see the total, continue to
// payment. The paid pincodes become the dealer's Sales Hub areas.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import COLORS from "../../../shared/constants/colors.js";
import { fetchDealerPincodes } from "../../../shared/api/ownerPlans.js";
import { DEALER_PLANS_LIST, dealerTotal, inr } from "../data/dealerPlans.js";

const MAX_PINCODES = 50; // mirrors DEALER_MAX_PINCODES on the server

export default function DealerPincodePlanPicker({ isLoggedIn, onLogin, onContinue }) {
  const [planId, setPlanId] = useState(DEALER_PLANS_LIST[0].id);
  const plan = DEALER_PLANS_LIST.find((p) => p.id === planId) || DEALER_PLANS_LIST[0];
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);

  const load = useCallback(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    fetchDealerPincodes()
      .then(setCatalogue)
      .catch(() => setError("Could not load pincodes. Please try again."))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogue;
    return catalogue.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.pincodes.some((p) => p.includes(q)) ||
        row.localities.some((n) => n.toLowerCase().includes(q)),
    );
  }, [catalogue, query]);

  // Selection = area names (the backend allocates dealer areas by name).
  const toggle = (name) =>
    setSelected((cur) =>
      cur.includes(name)
        ? cur.filter((p) => p !== name)
        : cur.length >= MAX_PINCODES
          ? cur
          : [...cur, name],
    );

  const total = dealerTotal(plan, selected.length);

  const handleContinue = () =>
    onContinue({
      id: plan.id,
      kind: "dealer",
      name: plan.name,
      ratePerPincode: plan.ratePerPincode,
      localities: [...selected].sort(),
      pincodes: catalogue
        .filter((row) => selected.includes(row.name))
        .flatMap((row) => row.pincodes),
      price: inr(total),
      priceNumeric: total,
      validity: plan.validity,
      listingLimit: 0,
      features: plan.features,
    });

  return (
    <View>
      {/* Option tabs */}
      <View style={styles.tabs} accessibilityRole="tablist">
        {DEALER_PLANS_LIST.map((p) => {
          const on = p.id === planId;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setPlanId(p.id)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tabTitle, on && styles.tabTitleOn]}>{p.tabLabel}</Text>
              <Text style={[styles.tabSub, on && styles.tabSubOn]}>{inr(p.ratePerPincode)} / pincode</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.note}>
        Pick the pincodes you work in. Sales Hub shows owner properties and owner numbers in these areas for{" "}
        {plan.days} days. A paid dealer plan also lets you post your own properties.
      </Text>

      {!isLoggedIn ? (
        <TouchableOpacity style={styles.payBtn} onPress={onLogin} activeOpacity={0.85}>
          <Text style={styles.payBtnText}>Log in to choose pincodes</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TextInput
            style={styles.search}
            placeholder="Search area or pincode"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            keyboardType="default"
            autoCorrect={false}
          />

          {loading && <ActivityIndicator style={{ marginVertical: 16 }} color={COLORS.primary} />}
          {!!error && (
            <TouchableOpacity onPress={load}>
              <Text style={styles.error}>{error} Tap to retry.</Text>
            </TouchableOpacity>
          )}
          {!loading && !error && visible.length === 0 && (
            <Text style={styles.empty}>No matching pincodes.</Text>
          )}

          <View style={styles.list}>
            {visible.slice(0, 80).map((row) => {
              const on = selected.includes(row.name);
              return (
                <TouchableOpacity
                  key={row.name}
                  style={[styles.row, on && styles.rowOn]}
                  onPress={() => toggle(row.name)}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <View style={[styles.box, on && styles.boxOn]}>{on && <Text style={styles.tick}>✓</Text>}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pin}>
                      {row.primary || row.name}
                      {row.pincode ? `  ${row.pincode}` : ""}
                    </Text>
                    <Text style={styles.area} numberOfLines={3}>
                      {[row.zone, row.localities.length > 1 ? row.localities.join(", ") : null].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <Text style={styles.rowPrice}>{inr(plan.ratePerPincode)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Total + pay */}
          <View style={styles.summary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>
                {selected.length} area{selected.length === 1 ? "" : "s"} × {inr(plan.ratePerPincode)} · {plan.validity}
              </Text>
              <Text style={styles.summaryTotal}>{inr(total)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.payBtn, styles.payBtnInline, !selected.length && styles.payBtnOff]}
              onPress={handleContinue}
              disabled={!selected.length}
              activeOpacity={0.85}
            >
              <Text style={styles.payBtnText}>Pay {inr(total)}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 14, padding: 4, marginBottom: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 11 },
  tabOn: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabTitle: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  tabTitleOn: { color: "#0F172A" },
  tabSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  tabSubOn: { color: COLORS.primary, fontWeight: "600" },
  note: { fontSize: 12, color: "#64748B", lineHeight: 17, marginBottom: 12 },
  search: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 10,
  },
  error: { color: "#DC2626", fontSize: 13, marginVertical: 10 },
  empty: { color: "#94A3B8", fontSize: 13, marginVertical: 10 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowOn: { borderColor: COLORS.primary, backgroundColor: "#EFF6FF" },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  boxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tick: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  pin: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  area: { fontSize: 12, color: "#64748B", marginTop: 1 },
  rowPrice: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryLabel: { fontSize: 12, color: "#64748B" },
  summaryTotal: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginTop: 2 },
  payBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  payBtnInline: { paddingHorizontal: 18 },
  payBtnOff: { opacity: 0.45 },
  payBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
