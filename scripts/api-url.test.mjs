// Regression tests for environment-based API URL configuration.
// Run with: node scripts/api-url.test.mjs  (plain node, no deps)
// Covers: configured URL always wins (dev + prod, trimmed); unset URL uses
// the local backend in development and the Render backend otherwise;
// loopback detection (fail-closed); the bundled default never resolves to
// localhost outside development; the production-localhost safeguard stays
// silent for correct configs and fires for a loopback production config.
//
// Same tmp-copy convention as the other script tests. No backend contacted.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "api");
const LOCAL = "http://127.0.0.1:8000";
const PROD = "https://restamp-backend-h3x8.onrender.com";

async function loadClient(envUrl) {
  const tmp = mkdtempSync(join(tmpdir(), "api-url-test-"));
  copyFileSync(join(SRC, "client.js"), join(tmp, "client.js"));
  const had = Object.prototype.hasOwnProperty.call(process.env, "EXPO_PUBLIC_API_URL");
  const prev = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = envUrl;
  }
  const errors = [];
  const origError = console.error;
  console.error = (...args) => {
    errors.push(args.join(" "));
  };
  let mod;
  try {
    mod = await import(join(tmp, "client.js"));
  } finally {
    console.error = origError;
    if (had) {
      process.env.EXPO_PUBLIC_API_URL = prev;
    } else {
      delete process.env.EXPO_PUBLIC_API_URL;
    }
  }
  return { mod, errors };
}

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const base = await loadClient(undefined);
const { resolveApiBaseUrl, isLocalHostUrl, API_BASE_URL } = base.mod;

// --- 1. Configured URL always wins ---
check("C1 configured wins in dev",
  base.mod.resolveApiBaseUrl({ envUrl: "https://api.example.com/", isDev: true }) === "https://api.example.com");
check("C2 configured wins in prod",
  resolveApiBaseUrl({ envUrl: "https://api.example.com", isDev: false }) === "https://api.example.com");
check("C3 configured trims whitespace/slashes",
  resolveApiBaseUrl({ envUrl: "  http://192.168.1.5:8000/// ", isDev: true }) === "http://192.168.1.5:8000");

// --- 2. Unset URL resolves by environment ---
check("U1 dev defaults to local backend",
  resolveApiBaseUrl({ envUrl: "", isDev: true }) === LOCAL);
check("U2 prod defaults to Render backend",
  resolveApiBaseUrl({ envUrl: "", isDev: false }) === PROD);
check("U3 whitespace-only env counts as unset",
  resolveApiBaseUrl({ envUrl: "   ", isDev: true }) === LOCAL
  && resolveApiBaseUrl({ envUrl: undefined, isDev: false }) === PROD);

// --- 3. Loopback detection (fail-closed) ---
for (const u of ["http://localhost:8000", "http://127.0.0.1:8000", "http://[::1]:8000", "HTTP://LOCALHOST:8081/x"]) {
  check(`L1 loopback ${u}`, isLocalHostUrl(u) === true);
}
for (const u of [PROD, "https://restamp-app.vercel.app", "", "not-a-url", null, undefined]) {
  check(`L2 non-loopback ${JSON.stringify(u)}`, isLocalHostUrl(u) === false);
}

// --- 4. Bundled default (plain node: no env, not dev) fails toward production ---
check("D1 default is Render (never localhost)", API_BASE_URL === PROD);
check("D2 safeguard silent for correct config", base.errors.length === 0, base.errors);

// --- 5. Safeguard fires only for loopback production configs ---
const loopback = await loadClient("http://127.0.0.1:8000");
check("S1 safeguard fires on loopback prod config",
  loopback.errors.length === 1 && loopback.errors[0].includes("localhost"));
check("S2 loopback config still honored verbatim",
  loopback.mod.API_BASE_URL === LOCAL);

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all api-url tests passed");
}
