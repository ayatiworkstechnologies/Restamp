// Pure regression tests for role-switch coordination. Run with:
//   node scripts/role-switch.test.mjs
import { createRoleGuard } from "../src/shared/api/roleSwitchCore.js";

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`ok - ${name}`);
  else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

// A successful switch is confirmed by the POST response and profile refresh.
{
  const calls = [];
  const guard = createRoleGuard({
    getToken: () => "t",
    setMyRole: async (role) => {
      calls.push(role);
      return { role };
    },
  });
  const auth = {
    user: { role: "BUYER" },
    refreshMe: async () => {
      auth.user.role = "OWNER";
      return { role: "OWNER" };
    },
  };
  const result = await guard.ensureRole(auth, "OWNER");
  check("R1 success posts once and is not 'already'", calls.length === 1 && result.already === false);
  check("R2 success refreshes the local profile", auth.user.role === "OWNER");
}

// Already-correct role and unauthenticated callers make no request.
{
  let calls = 0;
  const guard = createRoleGuard({
    getToken: () => "t",
    setMyRole: async () => {
      calls += 1;
      return { role: "OWNER" };
    },
  });
  check("R3 matching role is already", (await guard.ensureRole({ user: { role: "OWNER" } }, "OWNER")).already === true);
  const noToken = createRoleGuard({
    getToken: () => null,
    setMyRole: async () => {
      calls += 1;
      return { role: "OWNER" };
    },
  });
  check("R4 missing token is already (no request)", (await noToken.ensureRole({}, "OWNER")).already === true && calls === 0);
}

// Double tap on the same role shares one POST, and both resolve only after it.
{
  const gate = deferred();
  let calls = 0;
  const guard = createRoleGuard({
    getToken: () => "t",
    setMyRole: async (role) => {
      calls += 1;
      await gate.promise;
      return { role };
    },
  });
  const auth = { user: { role: "BUYER" }, refreshMe: async () => ({ role: "OWNER" }) };
  const first = guard.ensureRole(auth, "OWNER");
  const second = guard.ensureRole(auth, "OWNER");
  await tick();
  check("R5 concurrent same-role taps make one POST", calls === 1);
  let settled = 0;
  first.then(() => (settled += 1));
  second.then(() => (settled += 1));
  await tick();
  check("R6 neither waiter resolves before the POST", settled === 0);
  gate.resolve();
  const results = await Promise.all([first, second]);
  check("R7 both waiters see the confirmed result", results.every((r) => r.already === false));
}

// A failed shared POST must reject every waiter; no waiter gets stale success.
{
  const gate = deferred();
  const guard = createRoleGuard({
    getToken: () => "t",
    setMyRole: async () => {
      await gate.promise;
      throw new Error("network down");
    },
  });
  const auth = { user: { role: "BUYER" } };
  const first = guard.ensureRole(auth, "OWNER");
  const second = guard.ensureRole(auth, "OWNER");
  gate.reject(new Error("network down"));
  const outcomes = await Promise.allSettled([first, second]);
  check("R8 failed shared POST rejects both waiters", outcomes.every((o) => o.status === "rejected"));
}

// Timeouts reject and clear the in-flight slot so a retry can run.
{
  let calls = 0;
  const guard = createRoleGuard({
    timeoutMs: 20,
    getToken: () => "t",
    setMyRole: async (role) => {
      calls += 1;
      if (calls === 1) return new Promise(() => {});
      return { role };
    },
  });
  const auth = { user: { role: "BUYER" } };
  const timedOut = await guard.ensureRole(auth, "OWNER").then(
    () => null,
    (e) => e
  );
  check("R9 timeout rejects instead of reporting success", timedOut?.kind === "timeout");
  const retried = await guard.ensureRole(auth, "OWNER");
  check("R10 retry after timeout issues a fresh POST", calls === 2 && retried.already === false);
}

// A different target role waits for the active switch and then POSTs itself,
// even though the caller's auth snapshot still says the old role.
{
  const gate = deferred();
  const calls = [];
  const auth = { user: { role: "BUYER" } };
  const guard = createRoleGuard({
    getToken: () => "t",
    setMyRole: async (role) => {
      calls.push(role);
      if (role === "OWNER") await gate.promise;
      return { role };
    },
  });
  const owner = guard.ensureRole(auth, "OWNER");
  const buyer = guard.ensureRole(auth, "BUYER");
  await tick();
  check("R11 different targets do not run concurrently", calls.join(",") === "OWNER");
  gate.resolve();
  await Promise.all([owner, buyer]);
  check("R12 stale auth cannot skip the second server switch", calls.join(",") === "OWNER,BUYER");
}

// A profile refresh failure after a confirmed POST does not fail entry.
{
  const guard = createRoleGuard({
    getToken: () => "t",
    setMyRole: async (role) => ({ role }),
  });
  const result = await guard.ensureRole(
    { user: { role: "BUYER" }, refreshMe: async () => { throw new Error("offline"); } },
    "OWNER"
  );
  check("R13 refresh failure keeps the confirmed switch", result.already === false);
}

// A mismatching POST or refreshed role must not be treated as success.
{
  const missing = createRoleGuard({ getToken: () => "t", setMyRole: async () => ({}) });
  const a = await missing.ensureRole({ user: { role: "BUYER" } }, "OWNER").then(
    () => null,
    (e) => e
  );
  check("R14 unconfirmed POST response rejects", a?.kind === "role-unconfirmed");

  const mismatch = createRoleGuard({
    getToken: () => "t",
    setMyRole: async (role) => ({ role }),
  });
  const b = await mismatch.ensureRole(
    { user: { role: "BUYER" }, refreshMe: async () => ({ role: "BUYER" }) },
    "OWNER"
  ).then(() => null, (e) => e);
  check("R15 refreshed role mismatch rejects", b?.kind === "role-unconfirmed");
}

if (failures > 0) {
  console.log(`${failures} role-switch test(s) FAILED`);
  process.exit(1);
}
console.log("all role-switch tests passed");
