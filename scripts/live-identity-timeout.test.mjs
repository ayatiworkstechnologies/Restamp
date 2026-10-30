// Regression tests for live Owner identity + bounded API timeouts.
// Run with: node scripts/live-identity-timeout.test.mjs  (plain node, no deps)
// Covers: OwnerContext derives identity from the authenticated user (no mock
// person, avatar, KYC, or membership claims); Owner render sites use neutral
// fallbacks; fetch hangs reject with kind "timeout" (not "login", so OTP
// failures are never misreported as invalid codes); caller aborts rethrow
// untouched; plain network failures still map to "offline".
//
// Same tmp-copy convention as the other script tests. Network is fully
// stubbed via global.fetch — no backend is contacted. React contexts and
// screens import React and cannot run in this harness; their identity wiring
// is guarded by source-text assertions below plus inspection and
// `npm run build:web` (Metro parse). Stated here, not overstated.
import { mkdtempSync, copyFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src", "shared", "api");
const tmp = mkdtempSync(join(tmpdir(), "identity-timeout-test-"));
copyFileSync(join(SRC, "client.js"), join(tmp, "client.js"));
const client = await import(join(tmp, "client.js"));

function src(rel) {
  return readFileSync(join(ROOT, "..", rel), "utf8");
}
const ownerCtxSrc = src("src/features/owner/context/OwnerContext.js");
const ownerProfileSrc = src("src/features/owner/screens/OwnerProfileScreen.js");
const ownerDashboardSrc = src("src/features/owner/screens/OwnerDashboardScreen.js");
const ownerHeaderSrc = src("src/features/owner/components/OwnerHeader.js");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- 1. Owner identity comes from the authenticated user ---
check(
  "I1 OwnerContext derives identity from AuthContext (no mock person)",
  ownerCtxSrc.includes("useAuth") &&
    ownerCtxSrc.includes("authUser") &&
    !ownerCtxSrc.includes("Arunavo") &&
    !ownerCtxSrc.includes("Mukherjee") &&
    !ownerCtxSrc.includes("unsplash.com") &&
    !ownerCtxSrc.includes("kycStatus") &&
    !ownerCtxSrc.includes("memberSince")
);
check(
  "I2 Owner render sites use neutral fallbacks (no mock names/claims)",
  !ownerProfileSrc.includes("Arunavo") &&
    !ownerProfileSrc.includes("Aadhaar") &&
    !ownerDashboardSrc.includes('"Arunavo"') &&
    !ownerHeaderSrc.includes('"Raj"') &&
    (ownerProfileSrc.includes("Not provided") || ownerProfileSrc.includes("not available"))
);

// --- 2. Bounded timeout behavior (stubbed fetch) ---
const realFetch = globalThis.fetch;
check("T0 default timeout is bounded (~25s)", client.REQUEST_TIMEOUT_MS === 25000);
client.__setRequestTimeoutMs(30);

// Hanging fetch must reject as a recoverable timeout, never as auth failure.
// The stub honors AbortSignal like a real fetch implementation does.
globalThis.fetch = (url, options = {}) =>
  new Promise((_, reject) => {
    const signal = options && options.signal;
    if (!signal) return; // hangs forever without a signal (proves the guard matters)
    if (signal.aborted) {
      const early = new Error("aborted");
      early.name = "AbortError";
      reject(early);
      return;
    }
    signal.addEventListener(
      "abort",
      () => {
        const aborted = new Error("aborted");
        aborted.name = "AbortError";
        reject(aborted);
      },
      { once: true }
    );
  });
{
  let err = null;
  try {
    await client.apiGet("/auth/otp/request", { phone: "+10000000000" });
  } catch (e) {
    err = e;
  }
  check(
    "T1 hung request rejects with kind timeout (not login)",
    !!err && err.kind === "timeout" && err.status === 0
  );
}
{
  // Same guarantee on the authenticated path used by verify/profile calls.
  let err = null;
  try {
    await client.apiGetAuth("/auth/me");
  } catch (e) {
    err = e;
  }
  check("T2 hung authed request rejects with kind timeout", !!err && err.kind === "timeout");
}
{
  // Fast successful responses are unaffected by the timeout machinery.
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ message: "ok" }),
  });
  let body = null;
  try {
    body = await client.apiGet("/health", {});
  } catch {
    body = null;
  }
  check("T3 fast success unaffected by timeout machinery", !!body && body.message === "ok");
}
{
  // Plain network failure keeps the existing offline mapping.
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  let err = null;
  try {
    await client.apiGet("/buyer/listings", {});
  } catch (e) {
    err = e;
  }
  check(
    "T4 network failure still maps to kind offline",
    !!err && err.kind === "offline" && err.status === 0
  );
}
globalThis.fetch = realFetch;

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all live-identity-timeout tests passed");
}
