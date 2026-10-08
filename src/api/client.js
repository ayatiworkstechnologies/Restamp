/**
 * Minimal RESTAMP API client (Phase 2, discovery only).
 * Base URL from EXPO_PUBLIC_API_URL (LAN IP for Android, localhost for web/iOS sim).
 * fetch-based; no extra dependencies. No auth yet (public discovery endpoints need
 * none); an Authorization hook is reserved for the auth phase.
 */
const RAW_BASE_URL =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.EXPO_PUBLIC_API_URL) ||
  "https://restamp-backend.onrender.com";

export const API_BASE_URL = (RAW_BASE_URL || "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  constructor(kind, status, detail) {
    super(detail || kind);
    this.kind = kind;
    this.status = status;
  }
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
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError(
      "offline",
      0,
      "No connection. Make sure the backend is running and reachable.",
    );
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
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      "offline",
      0,
      "No connection. Make sure the backend is running and reachable.",
    );
  }
  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }
  throw new ApiError(
    mapStatus(response.status),
    response.status,
    `Request failed (${response.status}).`,
  );
}

export async function apiPost(path, body) {
  return authedFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiDelete(path) {
  return authedFetch(`${API_BASE_URL}${path}`, { method: "DELETE" });
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
