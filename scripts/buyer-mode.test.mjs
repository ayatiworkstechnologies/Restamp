// Regression tests for buyer-mode coordination (the fix for the
// "POST /buyer/enquiries -> 403" and "POST /buyer/visits -> 403" failures).
//
// Root cause these tests pin down: the backend keeps ONE current role per
// account (backend app/services/users_roles.py) and every /buyer/* endpoint is
// gated on the BUYER role (backend app/deps.py: `require_buyer`). An account
// that posted a property (OWNER mode) and went back to browsing still holds
// OWNER on the server, so the backend answers
//   403 {"detail": "BUYER role required"}
// which means "authenticated, wrong mode" (a bad token is 401).
//
// The app now puts the server in BUYER mode through the sanctioned self-serve
// endpoint (POST /users/me/role) before a buyer action, and only trusts a
// server-confirmed role.
//
// Run with: node scripts/buyer-mode.test.mjs  (plain node, no deps)
// Covers: pure guard semantics (guest skip, cached BUYER, server GET -> POST
// switch, unconfirmed switch rejects, cache invalidation, one shared switch,
// timeout) and the real-client wiring (withBuyerMode: switch-then-send,
// one retry after a stale-role 403, no false success), plus the enquiry and
// site-visit payload contracts.
//
// Harness note: src/api/*.js use extensionless imports (Metro), so the API
// modules are copied to a tmp dir with extensions fixed — same approach as
// buyer-flow.test.mjs / visits-integration.test.mjs. Network is fully stubbed
// via global.fetch; no backend is contacted.
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src", "api");

// --- Pure core (no imports at all -> imported straight from source) --------
const {
  createBuyerModeGuard,
  isBuyerRole,
  isRoleGateError,
  normalizeRole,
} = await import(join(ROOT, "..", "src", "api", "buyerModeCore.js"));

// --- Real client wiring (needs the tmp/extension harness) ----------------
const tmp = mkdtempSync(join(tmpdir(), "buyer-mode-test-"));
for (const f of ["client.js", "buyerMode.js", "buyerModeCore.js", "enquiries.js", "visits.js", "contact.js", "saved.js", "mappers.js"]) {
  copyFileSync(join(SRC, f), join(tmp, f));
}
for (const f of ["buyerMode.js", "enquiries.js", "visits.js", "contact.js", "saved.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(tmp, f), "utf8")
      .replaceAll('from "./client"', 'from "./client.js"')
      .replaceAll('from "./buyerMode"', 'from "./buyerMode.js"')
      .replaceAll('from "./buyerModeCore"', 'from "./buyerModeCore.js"')
      .replaceAll('from "./mappers"', 'from "./mappers.js"')
  );
}
const client = await import(join(tmp, "client.js"));
const buyerMode = await import(join(tmp, "buyerMode.js"));
const enquiries = await import(join(tmp, "enquiries.js"));
const visits = await import(join(tmp, "visits.js"));
const contact = await import(join(tmp, "contact.js"));
const saved = await import(join(tmp, "saved.js"));

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

// --- 1. Pure guard semantics ----------------------------------------------
{
  // G1: a guest is never asked to switch (the caller owns the login prompt).
  let fetchCalls = 0;
  let setCalls = 0;
  const guard = createBuyerModeGuard({
    getToken: () => null,
    fetchRole: async () => {
      fetchCalls += 1;
      return { role: "OWNER" };
    },
    setRole: async () => {
      setCalls += 1;
      return { role: "BUYER" };
    },
  });
  const res = await guard.ensure();
  check(
    "G1 guest is skipped without any request",
    res.already === true && res.skipped === true && res.role === null &&
      fetchCalls === 0 && setCalls === 0
  );
}
{
  // G2: the server is the source of truth — BUYER means no switch.
  const calls = [];
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: async () => {
      calls.push("GET");
      return { role: "BUYER" };
    },
    setRole: async (role) => {
      calls.push(`POST:${role}`);
      return { role };
    },
  });
  const res = await guard.ensure();
  check(
    "G2 a BUYER account is used as-is (one GET, no POST)",
    res.already === true && res.role === "BUYER" && calls.join(",") === "GET"
  );
}
{
  // G3: a non-buyer account is switched through the sanctioned endpoint.
  const calls = [];
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: async () => {
      calls.push("GET");
      return { role: "OWNER" };
    },
    setRole: async (role) => {
      calls.push(`POST:${role}`);
      return { role };
    },
  });
  const res = await guard.ensure();
  check(
    "G3 a non-buyer account is switched to BUYER (GET then POST /users/me/role)",
    res.already === false && res.role === "BUYER" &&
      calls.join(",") === "GET,POST:BUYER"
  );
}
{
  // G4: an unconfirmed switch is an error, never a success.
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: async () => ({ role: "OWNER" }),
    setRole: async () => ({ role: "OWNER" }),
  });
  let err = null;
  try {
    await guard.ensure();
  } catch (e) {
    err = e;
  }
  check(
    "G4 an unconfirmed switch rejects (no false success)",
    !!err && err.kind === "role-unconfirmed"
  );
}
{
  // G5: the confirmed role is cached, so the common case costs no request.
  const calls = [];
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: async () => {
      calls.push("GET");
      return { role: "BUYER" };
    },
    setRole: async (role) => {
      calls.push(`POST:${role}`);
      return { role };
    },
  });
  await guard.ensure();
  await guard.ensure();
  await guard.ensure();
  check("G5 the confirmed BUYER role is cached (no repeated requests)", calls.length === 1);
}
{
  // G6: a role switch away from BUYER invalidates the cache.
  const calls = [];
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: async () => {
      calls.push("GET");
      return { role: "BUYER" };
    },
    setRole: async (role) => {
      calls.push(`POST:${role}`);
      return { role };
    },
  });
  await guard.ensure();
  guard.noteServerRole("OWNER");
  await guard.ensure();
  check(
    "G6 a confirmed role change invalidates the cached BUYER role",
    calls.join(",") === "GET,GET" && guard.getConfirmedRole() === "BUYER"
  );
}
{
  // G7: invalidate() forces a fresh server read.
  const calls = [];
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: async () => {
      calls.push("GET");
      return { role: "BUYER" };
    },
    setRole: async (role) => ({ role }),
  });
  await guard.ensure();
  guard.invalidate();
  await guard.ensure();
  check("G7 invalidate() forces a fresh server read", calls.join(",") === "GET,GET");
}
{
  // G8: concurrent callers share exactly one switch.
  const calls = [];
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: async () => {
      calls.push("GET");
      return { role: "OWNER" };
    },
    setRole: async (role) => {
      calls.push(`POST:${role}`);
      return { role };
    },
  });
  const results = await Promise.all([guard.ensure(), guard.ensure(), guard.ensure()]);
  check(
    "G8 concurrent callers share one in-flight switch",
    calls.join(",") === "GET,POST:BUYER" &&
      results.every((r) => r.role === "BUYER")
  );
}
{
  // G9: a hanging server must not hang the UI forever.
  const guard = createBuyerModeGuard({
    getToken: () => "t",
    fetchRole: () => new Promise(() => {}),
    setRole: async (role) => ({ role }),
    timeoutMs: 30,
  });
  let err = null;
  try {
    await guard.ensure();
  } catch (e) {
    err = e;
  }
  check("G9 a hanging role read times out (kind 'timeout')", !!err && err.kind === "timeout");
}
{
  // G10: helpers
  check(
    "G10 role helpers behave",
    isBuyerRole("buyer") === true &&
      isBuyerRole("OWNER") === false &&
      normalizeRole(" owner ") === "OWNER" &&
      isRoleGateError({ status: 403 }) === true &&
      isRoleGateError({ kind: "denied" }) === true &&
      isRoleGateError({ status: 404 }) === false &&
      isRoleGateError(null) === false
  );
}

// --- 2. Real wiring: withBuyerMode ---------------------------------------
const realFetch = globalThis.fetch;
const ok = (json, status = 200) => ({ status, json });
const fail = (status, json = {}) => ({ status, json });

/**
 * Stub the network. `handler` answers every non-role request; `roleHandler`
 * answers GET/POST /users/me/role (default: the account already holds BUYER).
 */
function stub(handler, roleHandler = null) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const call = {
      url: String(url),
      method: (options.method || "GET").toUpperCase(),
      body: options.body ? JSON.parse(options.body) : null,
    };
    calls.push(call);
    const res = call.url.endsWith("/users/me/role")
      ? roleHandler
        ? roleHandler(call)
        : ok({ role: "BUYER" })
      : handler(call);
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json: async () => res.json || {},
    };
  };
  return calls;
}

client.setAuthToken("test-token");
{
  // W1: an OWNER-mode account sends an enquiry: switch first, then send.
  buyerMode.invalidateBuyerMode();
  const calls = stub(
    (call) => {
      if (call.url.endsWith("/buyer/enquiries")) return ok({ id: 5 }, 201);
      return fail(404);
    },
    (call) => (call.method === "GET" ? ok({ role: "OWNER" }) : ok({ role: "BUYER" }))
  );
  const result = await enquiries.createEnquiry(13996, "Is the price negotiable?");
  const urls = calls.map((c) => `${c.method} ${c.url.replace(/^https?:\/\/[^/]+/, "")}`);
  check(
    "W1 an OWNER-mode account switches to BUYER before the enquiry is sent",
    result?.id === 5 &&
      urls[0] === "GET /users/me/role" &&
      urls[1] === "POST /users/me/role" &&
      urls[2] === "POST /buyer/enquiries" &&
      calls[1].body?.role === "BUYER"
  );
}
{
  // W2: the enquiry payload matches the backend schema.
  buyerMode.invalidateBuyerMode();
  const calls = stub(() => ok({ id: 6 }, 201));
  await enquiries.createEnquiry(13996, "Hello");
  const body = calls[calls.length - 1].body;
  check(
    "W2 the enquiry body matches EnquiryCreate (listing id + optional message)",
    body.property_listing_id === 13996 && body.message === "Hello" &&
      Object.keys(body).sort().join(",") === "message,property_listing_id"
  );
  await enquiries.createEnquiry(13996, "   ");
  const blank = calls[calls.length - 1].body;
  check(
    "W3 a blank message is omitted (never sent as an empty string)",
    blank.property_listing_id === 13996 && !("message" in blank)
  );
}
{
  // W4: the visit payload matches the backend schema.
  buyerMode.invalidateBuyerMode();
  const calls = stub(() => ok({ id: 7, status: "REQUESTED" }, 201));
  await visits.createBuyerVisit({
    listingId: 13996,
    scheduledAtISO: "2030-01-01T10:00:00.000Z",
    note: "Evening please",
  });
  const body = calls[calls.length - 1].body;
  check(
    "W4 the visit body matches VisitCreate (listing id + scheduled_at + optional note)",
    body.property_listing_id === 13996 &&
      body.scheduled_at === "2030-01-01T10:00:00.000Z" &&
      body.note === "Evening please" &&
      Object.keys(body).sort().join(",") === "note,property_listing_id,scheduled_at"
  );
}
{
  // W5: a stale cached role (server changed elsewhere) is re-synced and the
  //     very same request is retried exactly once.
  buyerMode.invalidateBuyerMode();
  buyerMode.noteServerRole("BUYER"); // cached: no GET before the first attempt
  let enquiryAttempts = 0;
  const calls = stub(
    (call) => {
      if (call.url.endsWith("/buyer/enquiries")) {
        enquiryAttempts += 1;
        return enquiryAttempts === 1 ? fail(403, { detail: "BUYER role required" }) : ok({ id: 8 }, 201);
      }
      return fail(404);
    },
    (call) => (call.method === "GET" ? ok({ role: "OWNER" }) : ok({ role: "BUYER" }))
  );
  const result = await enquiries.createEnquiry(13996, "retry me");
  check(
    "W5 a stale-role 403 triggers one re-sync and one retry of the same request",
    result?.id === 8 && enquiryAttempts === 2 &&
      calls.filter((c) => c.url.endsWith("/buyer/enquiries")).length === 2
  );
}
{
  // W6: a persistent 403 still surfaces as an error (never a false success).
  buyerMode.invalidateBuyerMode();
  const calls = stub(
    () => fail(403, { detail: "BUYER role required" }),
    (call) => (call.method === "GET" ? ok({ role: "OWNER" }) : ok({ role: "BUYER" }))
  );
  let err = null;
  try {
    await enquiries.createEnquiry(13996, "nope");
  } catch (e) {
    err = e;
  }
  check(
    "W6 a refused buyer action rejects with the server status (no false success)",
    err?.status === 403
  );
}
{
  // W7: owner endpoints are NOT wrapped — an owner action must never flip the
  //     account into BUYER mode.
  buyerMode.invalidateBuyerMode();
  const calls = stub(() => ok({ id: 9, status: "PROPOSED" }, 201));
  await visits.proposeOwnerVisit({
    listingId: 13996,
    buyerUserId: 42,
    scheduledAtISO: "2030-01-01T10:00:00.000Z",
  });
  check(
    "W7 the owner visit path never triggers a role switch",
    calls.length === 1 && calls[0].url.includes("/owner/visits") &&
      !calls.some((c) => c.url.includes("/users/me/role"))
  );
}
{
  // W8: a 401 is a session problem, not a role problem — it is not retried.
  buyerMode.invalidateBuyerMode();
  let attempts = 0;
  const calls = stub((call) => {
    if (call.url.endsWith("/buyer/enquiries")) {
      attempts += 1;
      return fail(401, { detail: "not authenticated" });
    }
    return fail(404);
  });
  let err = null;
  try {
    await enquiries.createEnquiry(13996, "expired session");
  } catch (e) {
    err = e;
  }
  check(
    "W8 a 401 is surfaced once (no role retry on an expired session)",
    err?.status === 401 && attempts === 1
  );
}
{
  // W9: the other buyer-gated endpoints are covered too (same role gate).
  buyerMode.invalidateBuyerMode();
  const calls = stub(
    (call) => {
      if (call.url.includes("/buyer/listings/13996/contact")) {
        return ok({ phone: "+919840100001" });
      }
      if (call.url.includes("/buyer/saved/13996")) return ok({ id: 3 }, 201);
      return fail(404);
    },
    (call) => (call.method === "GET" ? ok({ role: "OWNER" }) : ok({ role: "BUYER" }))
  );
  const phone = await contact.revealContactPhone(13996);
  await saved.saveListingRemote(13996);
  const roleCalls = calls.filter((c) => c.url.endsWith("/users/me/role"));
  check(
    "W9 the other buyer-gated endpoints (contact reveal, save) switch to BUYER too",
    phone === "+919840100001" &&
      roleCalls.length === 2 &&
      roleCalls[0].method === "GET" &&
      roleCalls[1].method === "POST" &&
      calls.some((c) => c.url.includes("/buyer/listings/13996/contact")) &&
      calls.some((c) => c.url.includes("/buyer/saved/13996"))
  );
}
globalThis.fetch = realFetch;
client.setAuthToken(null);
buyerMode.invalidateBuyerMode();
if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
}
console.log("all buyer-mode tests passed");
