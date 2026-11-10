/**
 * "View Number" button for property cards and the detail page.
 *
 * Tap → POST /buyer/listings/{id}/contact (server counts one lead per
 * DISTINCT property). While the buyer has leads left, the full owner number
 * is shown and can be tapped to call. Once the plan's leads are used up the
 * server answers 402 with only the last 4 digits: the button then shows a
 * masked number (••••••5150) and a "Get Buyer Plan" action that opens the
 * BuyerPlans screen.
 *
 * Failures never dead-end: each one shows its real reason and (except for a
 * card with no backend record) the button stays tappable to retry.
 */
import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from "react-native";
import { Phone, RefreshCw } from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import { getRevealedContact, revealContact } from "../../../shared/api/contact.js";
import { getAuthTokenSync } from "../../../shared/api/client.js";
import { isBuyerPlanRequired, BUYER_PLANS_ROUTE } from "../../../shared/api/buyerPlans.js";
import { isAgentAreaRequired } from "../../../shared/api/agentPlans.js";
import { promptAgentUpgrade } from "../../agent/utils/agentUpgrade.js";
import { recordCallTap } from "../api/calls.js";
import { ownerDialUrl } from "../utils/ownerContact.js";

function formatPhone(phone) {
  const d = String(phone).replace(/\D/g, "");
  const local = d.length > 10 ? d.slice(-10) : d;
  if (local.length !== 10) return String(phone);
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** Map a reveal failure to { label, retry } shown on the button. */
function describeError(err) {
  const status = err && err.status;
  if (status === 422 && /own listing/i.test(String(err.detail || ""))) {
    // Signed-in owner looking at their own property (older backends refuse
    // the reveal because it would create a lead on your own listing).
    return { label: "This is your listing", retry: false, own: true };
  }
  if (status === 404) {
    // Listing not verified/available, or owner has no phone on record.
    return { label: "Owner hasn't shared a number", retry: false };
  }
  if (status === 403 || (err && (err.kind === "denied" || err.kind === "role-unconfirmed"))) {
    return { label: "Switch to Buyer mode · Retry", retry: true };
  }
  if (status === 429) {
    return { label: "Too many requests · Retry", retry: true };
  }
  if (err && (err.kind === "timeout" || err.kind === "offline" || status === 0 || status === undefined)) {
    return { label: "No connection · Tap to retry", retry: true };
  }
  return { label: "Couldn't load number · Retry", retry: true };
}

export default function ViewNumberButton({
  property,
  navigation,
  onLoginRequired,
  // Optional: runs before opening BuyerPlans (e.g. close a modal sheet so the
  // plans screen isn't hidden behind it).
  onBeforeNavigate,
  style,
}) {
  // idle | loading | revealed | locked | error
  const [state, setState] = useState("idle");
  const [phone, setPhone] = useState(null);
  const [ownListing, setOwnListing] = useState(false);
  const [last4, setLast4] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const req = useRef(0);

  const backendId = property && property.backendId;
  const hasRecord = typeof backendId === "number" || /^\d+$/.test(String(backendId ?? ""));

  const stop = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
  };

  const handleView = (e) => {
    stop(e);
    if (!hasRecord) return;
    if (!getAuthTokenSync()) {
      if (onLoginRequired) onLoginRequired(() => handleView());
      return;
    }
    const cached = getRevealedContact(Number(backendId));
    if (cached) {
      // Already revealed this session: same number, no second request.
      setPhone(cached.phone);
      setOwnListing(cached.ownListing);
      setState("revealed");
      return;
    }
    const mine = ++req.current;
    setState("loading");
    setErrorInfo(null);
    revealContact(Number(backendId)).then(
      (contact) => {
        if (req.current !== mine) return;
        if (contact && contact.phone) {
          setPhone(contact.phone);
          setOwnListing(contact.ownListing);
          setState("revealed");
        } else {
          setErrorInfo({ label: "Owner hasn't shared a number", retry: false });
          setState("error");
        }
      },
      (err) => {
        if (req.current !== mine) return;
        if (isAgentAreaRequired(err)) {
          // Agent outside its plan's areas: agent upgrade, never buyer plans.
          setState("idle");
          if (onBeforeNavigate) onBeforeNavigate();
          promptAgentUpgrade(navigation, err);
          return;
        }
        if (isBuyerPlanRequired(err)) {
          setLast4(err?.data?.phone_last4 || null);
          setState("locked");
          return;
        }
        if (err && (err.status === 401 || err.kind === "login") && onLoginRequired) {
          setState("idle");
          onLoginRequired(() => handleView());
          return;
        }
        if (typeof console !== "undefined" && !(err && err.status === 422)) {
          console.warn("[ViewNumber] reveal failed", {
            listing: backendId,
            status: err && err.status,
            kind: err && err.kind,
            message: err && err.message,
          });
        }
        setErrorInfo(describeError(err));
        setState("error");
      }
    );
  };

  const goToPlans = (e) => {
    stop(e);
    if (onBeforeNavigate) onBeforeNavigate();
    navigation.navigate(BUYER_PLANS_ROUTE, { reason: "quota" });
  };

  // Tapping the revealed number dials it. "Call button tapped" (CONTRACT §B)
  // is recorded fire-and-forget right before dialling (initiated, never
  // "answered"), so it never blocks the dialler; not on your own listing.
  const call = (e) => {
    stop(e);
    const url = ownerDialUrl(phone);
    if (!url) return;
    if (!ownListing) recordCallTap(Number(backendId));
    Linking.openURL(url).catch(() => {});
  };

  // A card with no backend record has no owner number to reveal — say so
  // plainly instead of offering a button that can never work.
  if (!hasRecord) {
    return (
      <View style={[styles.btn, styles.muted, style]}>
        <Phone size={15} color="#94A3B8" style={{ marginRight: 8 }} />
        <Text style={[styles.text, { color: "#94A3B8" }]}>Contact via enquiry</Text>
      </View>
    );
  }

  if (state === "revealed") {
    return (
      <TouchableOpacity style={[styles.btn, styles.revealed, style]} onPress={call} activeOpacity={0.85}>
        <Phone size={15} color={COLORS.success} style={{ marginRight: 8 }} />
        <Text style={[styles.text, { color: COLORS.success }]}>{formatPhone(phone)}</Text>
      </TouchableOpacity>
    );
  }

  if (state === "locked") {
    return (
      <View style={style}>
        <View style={styles.maskRow}>
          <Phone size={15} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.maskText}>+91 ••••• •{last4 || "••••"}</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.planBtn]} onPress={goToPlans} activeOpacity={0.85}>
          <Text style={[styles.text, { color: "#FFFFFF" }]}>Get Buyer Plan to view</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === "error" && errorInfo) {
    const canRetry = errorInfo.retry;
    return (
      <TouchableOpacity
        style={[styles.btn, canRetry ? styles.warn : styles.muted, style]}
        onPress={canRetry ? handleView : stop}
        disabled={!canRetry}
        activeOpacity={0.85}
      >
        {canRetry ? (
          <RefreshCw size={15} color="#B45309" style={{ marginRight: 8 }} />
        ) : (
          <Phone size={15} color="#94A3B8" style={{ marginRight: 8 }} />
        )}
        <Text style={[styles.text, { color: canRetry ? "#B45309" : "#94A3B8" }]} numberOfLines={1}>
          {errorInfo.label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.btn, styles.idle, style]}
      onPress={handleView}
      disabled={state === "loading"}
      activeOpacity={0.85}
    >
      {state === "loading" ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <>
          <Phone size={15} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.text, { color: COLORS.primary }]}>View Number</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  idle: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primaryBorder },
  revealed: { backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: "#BBF7D0" },
  warn: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  muted: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: COLORS.border },
  planBtn: { backgroundColor: COLORS.primary, marginTop: 8 },
  text: { fontSize: 14, fontWeight: "700" },
  maskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  maskText: { fontSize: 14, fontWeight: "700", color: COLORS.textDark, letterSpacing: 0.5 },
});
