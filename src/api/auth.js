/**
 * Authentication API against the real backend contract:
 * - POST /auth/otp/request {phone} -> {message} (+debug_code in local OTP-debug mode)
 * - POST /auth/otp/verify {phone, code} -> TokenOut {access_token, ...}
 * - POST /auth/google {id_token} -> TokenOut {access_token, ...}
 *   (404 GOOGLE_UNKNOWN when the Google identity is not linked; no auto-creation)
 * - GET  /auth/me -> MeOut {id, display_name, role, providers, is_admin}
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

export async function fetchMe() {
  return apiGetAuth("/auth/me");
}

export async function updateProfileName(displayName) {
  return apiPatchAuth("/users/me", { display_name: displayName });
}
