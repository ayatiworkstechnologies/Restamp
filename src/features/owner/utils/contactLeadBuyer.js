import { Alert, Linking, Platform } from "react-native";

import { revealLeadBuyerContact } from "../api/owner.js";
import { openLeadBuyerContact, formatBuyerPhone } from "./leadContact.js";

/**
 * Screen glue for Call Buyer / WhatsApp Chat: the pure flow in leadContact.js
 * with the real reveal API and Linking, and an honest alert whenever nothing
 * was opened. Returns the leadContact.js result ({ok, phone?, ...}).
 *
 * Web: the number is fetched first (async), and browsers block a new tab
 * opened after an await. So WhatsApp pre-opens a blank tab inside the click
 * and points it at wa.me once the number arrives (closed on failure). Calls
 * use tel: in the same tab and also show the number, since desktop browsers
 * usually have no dialer.
 */
export async function contactLeadBuyer(lead, channel, { cachedPhone } = {}) {
  const isWeb = Platform.OS === "web" && typeof window !== "undefined";
  let preTab = null;
  if (isWeb && channel === "whatsapp") {
    try {
      preTab = window.open("", "_blank");
    } catch {
      preTab = null;
    }
  }

  const openURL = (url) => {
    if (!isWeb) return Linking.openURL(url);
    if (preTab && !preTab.closed) {
      preTab.location.href = url;
      return Promise.resolve();
    }
    if (url.startsWith("tel:")) {
      window.location.href = url;
      return Promise.resolve();
    }
    const tab = window.open(url, "_blank");
    return tab ? Promise.resolve() : Promise.reject(new Error("Popup blocked"));
  };

  const result = await openLeadBuyerContact(lead, channel, {
    reveal: revealLeadBuyerContact,
    openURL,
    cachedPhone,
  });

  if (!result.ok) {
    if (preTab && !preTab.closed) preTab.close();
    Alert.alert(result.title, result.message);
  } else if (isWeb && channel === "call" && result.phone) {
    Alert.alert("Buyer's number", formatBuyerPhone(result.phone));
  }
  return result;
}
