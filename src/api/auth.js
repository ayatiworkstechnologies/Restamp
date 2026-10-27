/**
 * Authentication API against the real backend contract:
 * - POST /auth/otp/request {phone} -> {message} normally; in the backend's
 *   restricted internal-testing display mode ONLY (non-production, flag-set,
 *   also refused at production startup) the backend-selected code is returned
 *   as `debug_code` so the login screen can show it. Production responses
 *   never contain a code and this module adds none of its own.
 * - POST /auth/otp/verify {phone, code} -> TokenOut {access_token, ...}
 * - POST /auth/google {id_token} -> TokenOut {access_token, ...}
 *   (404 GOOGLE_UNKNOWN when the Google identity is not linked; no auto-creation)
 * - GET  /auth/me -> MeOut {id, display_name, role, providers, is_admin}
 * - POST /auth/test-login {phone} + X-Test-Login-Key header -> TokenOut
 *   (restricted demo login, bounded testing window ONLY; while disabled on
 *   the backend the endpoint answers the same 404 as an unknown route)
 * No mock tokens. No native Google flow (web-only GIS button; see
 * components/GoogleSignInButton.web.js).
 */
import { apiGetAuth, apiPatchAuth, apiPost } from "./client";

export async function requestOtp(phone) {
  return apiPost("/auth/otp/request", { phone });
}

export async function verifyOtp(phone, code) {
  return apiPost("/auth/otp/verify", { phone, code });
}

export async function googleSignIn(idToken) {
  return apiPost("/auth/google", { id_token: idToken });
}

export async function linkGoogleAccount(idToken) {
  return apiPost("/auth/google/link", { id_token: idToken });
}

/**
 * Restricted demo login for bounded testing windows ONLY: returns the SAME
 * TokenOut as /auth/otp/verify, authorized server-side by the backend's
 * RESTAMP_TEST_LOGIN_KEY plus its own existing-account policy. The demo key
 * value is supplied BY THE OPERATOR at runtime and is sent ONLY as the
 * X-Test-Login-Key request header — it is never hardcoded, never read from
 * EXPO_PUBLIC_* or any bundle/env value, and never stored, logged, or
 * reflected anywhere. Server error contract (surfaced by the caller):
 * 401 bad key, 403 denied, 404 no account for this phone / feature
 * disabled, 429 rate limited.
 */
export async function demoLogin(phone, demoKey) {
  return apiPost("/auth/test-login", { phone }, {
    "X-Test-Login-Key": demoKey,
  });
}

export async function fetchMe() {
  return apiGetAuth("/auth/me");
}

export async function updateProfileName(displayName) {
  return apiPatchAuth("/users/me", { display_name: displayName });
}
