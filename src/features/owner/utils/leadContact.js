/**
 * Owner -> buyer contact for "Call Buyer" and "WhatsApp Chat".
 *
 * Lead rows never carry the buyer's phone. The number comes only from the
 * audited POST /owner/leads/{id}/contact (revealLeadBuyerContact), which the
 * backend answers for the lead's own owner only. Pure module (no React Native
 * imports): screens inject `reveal` and `openURL`, so the whole flow is
 * tested by scripts/lead-contact.test.mjs.
 *
 * Numbers are validated before any URL is built: an Indian mobile
 * (+91 then 6-9 and nine digits, the only kind OTP sign-up accepts) or a
 * well-formed E.164 number. Anything else yields null, and no dialer or
 * WhatsApp URL is ever launched with it.
 */

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

/** E.164 ("+91" + ten digits for India), or null when the value isn't a usable number. */
export function normalizeBuyerPhone(raw) {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw).trim();
  if (!s || /[^\d+\s\-().]/.test(s)) return null;
  const plusCount = (s.match(/\+/g) || []).length;
  if (plusCount > 1 || (plusCount === 1 && !s.startsWith("+"))) return null;
  const digits = s.replace(/\D/g, "");
  let e164;
  if (plusCount === 1) e164 = `+${digits}`;
  else if (INDIAN_MOBILE.test(digits)) e164 = `+91${digits}`;
  else if (/^0[6-9]\d{9}$/.test(digits)) e164 = `+91${digits.slice(1)}`;
  else if (/^91[6-9]\d{9}$/.test(digits)) e164 = `+${digits}`;
  else return null;
  if (!E164.test(e164)) return null;
  if (e164.startsWith("+91") && !INDIAN_MOBILE.test(e164.slice(3))) return null;
  return e164;
}

/** tel: URL for the phone dialer, or null. */
export function buyerDialUrl(raw) {
  const phone = normalizeBuyerPhone(raw);
  return phone ? `tel:${phone}` : null;
}

/** WhatsApp click-to-chat URL (international digits, no "+"), or null. */
export function buyerWhatsAppUrl(raw) {
  const phone = normalizeBuyerPhone(raw);
  return phone ? `https://wa.me/${phone.slice(1)}` : null;
}

/** "+91 XXXXX XXXXX" for Indian mobiles, E.164 otherwise, "" when invalid. */
export function formatBuyerPhone(raw) {
  const phone = normalizeBuyerPhone(raw);
  if (!phone) return "";
  if (phone.startsWith("+91")) return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  return phone;
}

/** Honest {title, message} for a failed number lookup. */
export function leadContactErrorMessage(error) {
  const status = error && error.status;
  const detail = error && typeof error.detail === "string" ? error.detail : "";
  if (status === 404 && detail === "Contact not available") {
    return {
      title: "Phone Number Unavailable",
      message: "This buyer hasn't added a phone number to their account.",
    };
  }
  if (status === 404) {
    return { title: "Lead Unavailable", message: "This lead is no longer available." };
  }
  if (status === 401 || (error && error.kind === "login")) {
    return { title: "Session Expired", message: "Please sign in again to contact buyers." };
  }
  if (status === 403 || (error && error.kind === "denied")) {
    return { title: "Owner Mode Required", message: "Switch to your owner account to contact buyers." };
  }
  if (error && (error.kind === "offline" || error.kind === "timeout") && error.message) {
    return { title: "Couldn't get the number", message: error.message };
  }
  return {
    title: "Couldn't get the number",
    message: "Please check your connection and try again.",
  };
}

const CHANNELS = {
  call: { url: buyerDialUrl, app: "the phone dialer" },
  whatsapp: { url: buyerWhatsAppUrl, app: "WhatsApp" },
};

/**
 * Fetch the buyer's number (unless `cachedPhone` is a valid one) and open the
 * dialer or WhatsApp. Never throws. Returns one of:
 *   {ok: true, phone}                       launched; phone is E.164
 *   {ok: false, title, message, phone?}     nothing was launched
 * deps: reveal(leadId) -> Promise<string|null>, openURL(url) -> Promise.
 */
export async function openLeadBuyerContact(lead, channel, { reveal, openURL, cachedPhone } = {}) {
  const spec = CHANNELS[channel];
  const leadId = Number(lead && lead.id);
  if (!spec || !Number.isFinite(leadId) || leadId <= 0 || typeof reveal !== "function" || typeof openURL !== "function") {
    return { ok: false, title: "Couldn't contact buyer", message: "This lead is missing its reference. Please reopen it." };
  }
  let phone = normalizeBuyerPhone(cachedPhone);
  if (!phone) {
    let raw;
    try {
      raw = await reveal(leadId);
    } catch (error) {
      return { ok: false, ...leadContactErrorMessage(error) };
    }
    phone = normalizeBuyerPhone(raw);
    if (!phone) {
      return {
        ok: false,
        title: "Phone Number Unavailable",
        message: "The number on this buyer's account isn't a valid phone number.",
      };
    }
  }
  const url = spec.url(phone);
  try {
    await openURL(url);
  } catch {
    return {
      ok: false,
      phone,
      title: `Couldn't open ${spec.app === "WhatsApp" ? "WhatsApp" : "the dialer"}`,
      message: `${spec.app === "WhatsApp" ? "WhatsApp" : "Calling"} isn't available on this device. The buyer's number is ${formatBuyerPhone(phone)}.`,
    };
  }
  return { ok: true, phone };
}
