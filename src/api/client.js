/**
 * Minimal RESTAMP API client (Phase 2, discovery only).
 * Base URL from EXPO_PUBLIC_API_URL (LAN IP for Android, localhost for web/iOS sim).
 * fetch-based; no extra dependencies. No auth yet (public discovery endpoints need
 * none); an Authorization hook is reserved for the auth phase.
 *
 * Environment rules (never edit per environment — use env files / dashboards):
 * - Local dev (`expo start`, `__DEV__ === true`) with no configured URL uses the
 *   local FastAPI backend at http://127.0.0.1:8000. Prefer setting
 *   EXPO_PUBLIC_API_URL in `.env.local` (gitignored) for LAN-device testing.
 * - Production (`expo export`, Vercel) with no configured URL uses the deployed
 *   Render backend. Set EXPO_PUBLIC_API_URL in the Vercel dashboard to override.
 * - A configured URL always wins in both environments.
 * The base URL is fixed per app load: requests never silently switch between
 * local and production hosts after a failure.
 */
const DEFAULT_LOCAL_API_URL = "http://127.0.0.1:8000";
const DEFAULT_PROD_API_URL = "https://restamp-backend-h3x8.onrender.com";

function trimTrailingSlashes(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

/**
 * True for loopback hosts only (fails closed on malformed URLs).
 */
export function isLocalHostUrl(url) {
  try {
    // Node keeps IPv6 brackets in hostname ("[::1]"); strip them first.
    const host = new URL(String(url)).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Pure resolver (unit-testable): configured URL wins; otherwise development
 * targets the local backend and anything else targets production.
 */
export function resolveApiBaseUrl({ envUrl, isDev } = {}) {
  const configured = trimTrailingSlashes(envUrl);
  if (configured) return configured;
  if (isDev) return DEFAULT_LOCAL_API_URL;
  return DEFAULT_PROD_API_URL;
}

function readEnvApiUrl() {
  if (typeof process !== "undefined" && process.env) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return "";
}

function readIsDev() {
  if (typeof __DEV__ !== "undefined") return !!__DEV__;
  // Unknown runtime (e.g. plain node in tests): fail toward production so a
  // production bundle can never accidentally target localhost.
  return false;
}

export const API_BASE_URL = resolveApiBaseUrl({
  envUrl: readEnvApiUrl(),
  isDev: readIsDev(),
});

// Development safeguard: a production build must never talk to localhost.
// This fires only when someone explicitly configures a loopback URL for a
// production export (e.g. a stray Vercel env value) — not during local dev.
if (!readIsDev() && isLocalHostUrl(API_BASE_URL)) {
  console.error(
    "[RESTAMP] Production build resolved the API to localhost. " +
      "Set EXPO_PUBLIC_API_URL to the deployed backend URL."
  );
}

export class ApiError extends Error {
  constructor(kind, status, detail, message) {
    super(message ?? (detail || kind));
    this.kind = kind;
    this.status = status;
    /**
     * Backend-supplied error reason when the response error body was a
     * JSON object carrying a `detail` string (e.g. "GOOGLE_UNKNOWN", the
     * restricted test-login 404 for a phone with no account). Kept
     * SEPARATE from `message`, which stays the generic request-failure
     * text the UI already branches on; undefined for timeout, offline,
     * and non-JSON error bodies. Never contains credentials.
     */
    this.detail = detail;
  }
}

/**
 * Bounded request timeout (25s). Without it a slow/unreachable backend
 * (e.g. a cold hosted instance) hangs `await fetch` indefinitely, leaving
 * login and other flows stuck on a spinner with no recovery. Timeouts map
 * to kind "timeout" (status 0) — recoverable and retryable, never confused
 * with auth/validation failures. Caller-provided AbortSignals keep working:
 * only our own timer maps to "timeout"; a caller abort rethrows untouched.
 */
export const REQUEST_TIMEOUT_MS = 25000;

// Test-only override for the timeout above (plain-node suites cannot wait
// 25s). Production code never calls this.
let requestTimeoutMs = REQUEST_TIMEOUT_MS;
export function __setRequestTimeoutMs(ms) {
  requestTimeoutMs = ms;
}

function fetchWithTimeout(url, options = {}) {
  if (typeof AbortController === "undefined") {
    return fetch(url, options);
  }
  const { signal: callerSignal, ...rest } = options;
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) {
      const early = new Error("The operation was aborted.");
      early.name = "AbortError";
      return Promise.reject(early);
    }
    callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, requestTimeoutMs);
  const done = () => {
    clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener("abort", onCallerAbort);
  };
  return fetch(url, { ...rest, signal: controller.signal }).then(
    (response) => {
      done();
      return response;
    },
    (error) => {
      done();
      if (timedOut) {
        throw new ApiError(
          "timeout",
          0,
          "The request timed out. Please check your connection and try again."
        );
      }
      throw error;
    }
  );
}

function toNetworkError(e) {
  // Our own timeout already carries the right shape; a caller abort is
  // rethrown untouched so cancellation is never misclassified; anything
  // else is an unreachable-backend failure as before.
  if (e instanceof ApiError) return e;
  if (e && e.name === "AbortError") throw e;
  throw new ApiError(
    "offline",
    0,
    "No connection. Make sure the backend is running and reachable."
  );
}

function mapStatus(status) {
  if (status === 401) return "login";
  if (status === 403) return "denied";
  if (status === 404) return "missing";
  if (status === 400 || status === 422) return "validation";
  return "retry";
}

export async function apiGet(path, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  let response;
  try {
    response = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw toNetworkError(e);
  }
  if (response.ok) return response.json();
  throw new ApiError(
    mapStatus(response.status),
    response.status,
    `Request failed (${response.status}).`,
  );
}

export function isApiError(e, kind) {
  return e instanceof ApiError && (kind === undefined || e.kind === kind);
}

/** Check connectivity to the live backend /health endpoint */
export async function checkBackendHealth() {
  try {
    const data = await apiGet("/health");
    return { ok: true, status: data?.status || "ok", url: API_BASE_URL };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || "Unreachable",
      url: API_BASE_URL,
    };
  }
}

// --- Optional auth (Phase 5) -------------------------------------------------
// In-memory Bearer token holder. No login UI exists yet, so this stays empty in
// the app until an auth flow sets it; all saved-API calls then authenticate.
// (Persistent storage + login screens belong to the auth phase, not this one.)
let _authTokenProvider = null;
let _authTokenCurrent = null;

export function setAuthTokenProvider(fn) {
  _authTokenProvider = fn;
}

export function setAuthToken(token) {
  _authTokenCurrent = token || null;
  _authTokenProvider = token ? async () => token : null;
}

/** Sync read for UI gating (may lag the provider by one set; never used for auth decisions). */
export function getAuthTokenSync() {
  return _authTokenCurrent;
}

async function authHeaders() {
  if (!_authTokenProvider)
    return _authTokenCurrent
      ? { Authorization: `Bearer ${_authTokenCurrent}` }
      : {};
  try {
    const token = await _authTokenProvider();
    _authTokenCurrent = token || null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function authedFetch(url, options = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...(options.headers || {}),
  };
  let response;
  try {
    response = await fetchWithTimeout(url, { ...options, headers });
  } catch (e) {
    throw toNetworkError(e);
  }
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }
  throw await toHttpError(response);
}

/**
 * Non-OK response -> ApiError. The `message` stays the generic
 * request-failure text (the UI keeps branching on its own fixed strings),
 * while the backend's own `detail` field — when the error body is a JSON
 * object carrying one — is attached as `ApiError.detail` for flows that
 * need the server's reason (e.g. GOOGLE_UNKNOWN, the restricted test-login
 * 404 for a phone with no account). The raw body is never logged; only
 * this structured field propagates to the caller.
 */
async function toHttpError(response) {
  let serverDetail;
  try {
    const body = await response.json();
    serverDetail =
      body && typeof body.detail === "string" ? body.detail : undefined;
  } catch {
    // Non-JSON (or empty) error body: no server reason to attach.
  }
  return new ApiError(
    mapStatus(response.status),
    response.status,
    serverDetail,
    `Request failed (${response.status}).`,
  );
}

export async function apiPost(path, body, extraHeaders) {
  return authedFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: extraHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiDelete(path) {
  return authedFetch(`${API_BASE_URL}${path}`, { method: "DELETE" });
}

export async function apiPutAuth(path, body) {
  return authedFetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiPatchAuth(path, body) {
  return authedFetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiGetAuth(path, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  return authedFetch(url, { method: "GET" });
}
