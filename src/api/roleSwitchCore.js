/**
 * Pure role-switch coordination (no React Native imports) so it can be tested
 * with plain Node. The network boundary is injected by users.js.
 */

const DEFAULT_TIMEOUT_MS = 10000;

function roleError(message, kind = "role-unconfirmed") {
  const error = new Error(message);
  error.kind = kind;
  return error;
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(roleError("Role switch timed out", "timeout")),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {object} deps
 * @param {(role: string) => Promise<{role?: string}>} deps.setMyRole
 * @param {() => string | null} deps.getToken
 * @param {number} [deps.timeoutMs]
 */
export function createRoleGuard({ setMyRole, getToken, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  let inFlight = null;

  async function perform(auth, role) {
    const result = await withTimeout(Promise.resolve().then(() => setMyRole(role)), timeoutMs);
    if (!result || result.role !== role) {
      throw roleError("Server did not confirm the requested role");
    }

    if (auth && typeof auth.refreshMe === "function") {
      try {
        const me = await auth.refreshMe();
        if (me && me.role && me.role !== role) {
          throw roleError("Profile role does not match the server role change");
        }
      } catch (error) {
        if (error?.kind === "role-unconfirmed") throw error;
        // The role POST is authoritative; a transient profile refresh failure
        // must not block entry into the flow.
      }
    }

    return { already: false };
  }

  async function ensureRole(auth, role, force = false) {
    if (!getToken()) {
      return { already: true };
    }

    if (inFlight) {
      const active = inFlight;
      if (active.role === role) {
        // Share the one real POST; failures/timeouts propagate to every waiter.
        return active.promise;
      }
      // A different switch is running. Wait for it, then force a server-side
      // check: the caller's auth object may predate that switch and its role
      // snapshot is no longer trustworthy.
      try {
        await active.promise;
      } catch {
        // Re-evaluate our own target below.
      }
      return ensureRole(auth, role, true);
    }

    if (!force && auth?.user?.role === role) {
      return { already: true };
    }

    const record = { role };
    record.promise = (async () => {
      try {
        return await perform(auth, role);
      } finally {
        if (inFlight === record) inFlight = null;
      }
    })();
    inFlight = record;
    return record.promise;
  }

  return { ensureRole };
}
