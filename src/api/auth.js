/**
 * Authentication API against the real backend contract:
 * - POST /auth/otp/request {phone} -> {message} (+debug_code in local OTP-debug mode)
 * - POST /auth/otp/verify {phone, code} -> TokenOut {access_token, ...}
 * - GET  /auth/me -> MeOut {id, display_name, role, providers, is_admin}
 * No mock tokens. No Google flow here (no OAuth config available).
 */
import { apiGetAuth, apiPatchAuth, apiPost } from "./client";

export async function requestOtp(phone) {
  return apiPost("/auth/otp/request", { phone });
}

export async function verifyOtp(phone, code) {
  return apiPost("/auth/otp/verify", { phone, code });
}

export async function fetchMe() {
  return apiGetAuth("/auth/me");
}

export async function updateProfileName(displayName) {
  return apiPatchAuth("/users/me", { display_name: displayName });
}
