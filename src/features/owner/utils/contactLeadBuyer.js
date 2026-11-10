import { Alert, Linking } from "react-native";

import { revealLeadBuyerContact } from "../api/owner.js";
import { openLeadBuyerContact } from "./leadContact.js";

/**
 * Screen glue for Call Buyer / WhatsApp Chat: the pure flow in leadContact.js
 * with the real reveal API and Linking, and an honest alert whenever nothing
 * was opened. Returns the leadContact.js result ({ok, phone?, ...}).
 */
export async function contactLeadBuyer(lead, channel, { cachedPhone } = {}) {
  const result = await openLeadBuyerContact(lead, channel, {
    reveal: revealLeadBuyerContact,
    openURL: (url) => Linking.openURL(url),
    cachedPhone,
  });
  if (!result.ok) Alert.alert(result.title, result.message);
  return result;
}
