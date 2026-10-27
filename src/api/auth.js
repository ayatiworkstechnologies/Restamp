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
 * - POST /auth/test-login {phone, code} -> TokenOut (restricted demo login,
 *   bounded demo window ONLY; while disabled/expired on the backend the
 *   endpoint answers the same 404 as an unknown route)
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
 * Restricted demo login for a bounded demo window ONLY: returns the SAME
 * TokenOut as /auth/otp/verify. The ONLY authorization value is `demoCode`
 * — the last six digits of the phone number the user just typed on the
 * same screen (a plain string, so LEADING ZEROS ARE PRESERVED, e.g.
 * "+91 7530006460" -> "006460"). The backend verifies it server-side,
 * inside its time-bounded suffix-demo mode, and only for an EXISTING
 * account (unknown phones get the explicit no-account 404 and nothing is
 * created). The value is predictable by design — presentation
 * convenience, never a secret — so no attempt is made to treat it as one
 * here: it is never hardcoded, read from EXPO_PUBLIC_*, stored, logged,
 * or reflected; it lives only in React state and the request body.
 * Server error contract (surfaced by the caller): 401 invalid demo code,
 * 404 no account for this phone / feature disabled or window expired,
 * 429 rate limited.
 */
export async function demoLogin(phone, demoCode) {
  return apiPost("/auth/test-login", { phone, code: demoCode });
}

export async function fetchMe() {
  return apiGetAuth("/auth/me");
}

export async function updateProfileName(displayName) {
  return apiPatchAuth("/users/me", { display_name: displayName });
}
