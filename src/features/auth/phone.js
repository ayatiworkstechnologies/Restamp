/**
 * Phone-number validation for the OTP login screen (Change 1).
 *
 * Framework-free pure helpers (unit-tested in scripts/auth-guard.test.mjs):
 * - phoneDigits: strip everything but 0-9 (handles typing, paste, spaces).
 * - maxPhoneDigits: +91 (India) numbers are exactly 10 digits; other country
 *   codes allow up to 15 (E.164 max) so the country selector keeps working.
 * - isPhoneValidForCountry: the gate for the Continue/Send-OTP action.
 * - phoneValidationMessage: inline hint text; the +91 country code is never
 *   counted as part of the 10 digits.
 */

export function phoneDigits(text) {
  return String(text || "").replace(/[^0-9]/g, "");
}

export function maxPhoneDigits(countryCode) {
  return String(countryCode || "").replace(/[^0-9+]/g, "") === "+91" ? 10 : 15;
}

export function sanitizePhoneInput(text, countryCode) {
  return phoneDigits(text).slice(0, maxPhoneDigits(countryCode));
}

export function isPhoneValidForCountry(digits, countryCode) {
  const clean = phoneDigits(digits);
  if (String(countryCode || "").replace(/[^0-9+]/g, "") === "+91") {
    return clean.length === 10;
  }
  return clean.length >= 7 && clean.length <= 15;
}

export function phoneValidationMessage(digits, countryCode) {
  const clean = phoneDigits(digits);
  const isIndia =
    String(countryCode || "").replace(/[^0-9+]/g, "") === "+91";
  if (clean.length === 0) {
    return isIndia
      ? "Enter your 10-digit mobile number."
      : "Enter your phone number.";
  }
  if (isIndia && clean.length !== 10) {
    return "Enter a valid 10 digits mobile number.";
  }
  if (!isIndia && (clean.length < 7 || clean.length > 15)) {
    return "Enter a valid phone number for the selected country.";
  }
  return "";
}
