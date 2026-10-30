/**
 * Pure buyer-mode coordination (no React Native imports) so it can be tested
 * with plain Node, exactly like src/api/roleSwitchCore.js.
 *
 * WHY THIS EXISTS
 * ---------------
 * The backend keeps exactly ONE current role per account (BUYER / OWNER /
 * BROKER — backend app/services/users_roles.py) and every /buyer/* endpoint
 * is gated on the BUYER role (backend app/deps.py: `require_buyer`).
 *
 * The app can legitimately show buyer surfaces while the server still holds
 * another role: an account that posted a property (OWNER mode) and then went
 * back to browsing. The server then answers
 *
 *     403 {"detail": "BUYER role required"}
 *
 * which means "authenticated, but in the wrong mode" — never "bad token"
 * (a missing/expired token is 401). The backend documents this matrix in
 * tests/test_guest_browsing.py::test_enquiry_403_means_wrong_role and keeps
 * a self-serve recovery: POST /users/me/role {role: "BUYER"} restores access.
 *
 * The app already uses that sanctioned switch for the owner flow
 * (src/api/users.js: enterOwnerFlow). This module applies the same,
 * server-confirmed switch to buyer actions so they are not refused, and it
 * never bypasses the check: the server still verifies the role, and an
 * unconfirmed switch is an error, not a success.
 */

export const BUYER_ROLE = "BUYER";

const DEFAULT_TIMEOUT_MS = 10000;

export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function isBuyerRole(role) {
  return normalizeRole(role) === BUYER_ROLE;
}

/**
 * True for the buyer-endpoint role gate: the backend answers 403 (mapped to
 * kind "denied" by the API client) when the account is authenticated but its
 * current role is not BUYER.
 */
export function isRoleGateError(error) {
  return !!error && (error.status === 403 || error.kind === "denied");
}

export function buyerModeError(message, kind = "role-unconfirmed") {
  const error = new Error(message);
  error.kind = kind;
  return error;
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(buyerModeError("Role switch timed out", "timeout")),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Create a guard that keeps the server's current role in BUYER mode.
 *
 * Contract:
 * - No token -> `{ already: true, role: null, skipped: true }` (the caller
 *   decides between "log in" and "just browse"); no request is made.
 * - The last server-confirmed role is cached, so the common case (already a
 *   buyer) costs no extra request. The cache is invalidated by the app
 *   whenever it switches roles itself (src/api/users.js: setMyRole).
 * - Otherwise the server is asked directly (GET /users/me/role) and, when it
 *   is not BUYER, switched (POST /users/me/role). The switch must be
 *   confirmed by the server response; anything else rejects.
 * - Concurrent callers share one in-flight switch.
 *
 * @param {object} deps
 * @param {() => (string|null)} deps.getToken
 * @param {() => Promise<{role?: string}>} deps.fetchRole
 * @param {(role: string) => Promise<{role?: string}>} deps.setRole
 * @param {number} [deps.timeoutMs]
 */
export function createBuyerModeGuard({
  getToken,
  fetchRole,
  setRole,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  // Last role the SERVER confirmed (not a local guess).
  let confirmedRole = null;
  let inFlight = null;

  function noteServerRole(role) {
    confirmedRole = normalizeRole(role) || null;
    return confirmedRole;
  }

  function invalidate() {
    confirmedRole = null;
  }

  function getConfirmedRole() {
    return confirmedRole;
  }

  async function switchToBuyer() {
    const current = await withTimeout(
      Promise.resolve().then(() => fetchRole()),
      timeoutMs
    );
    const role = normalizeRole(current && current.role);
    confirmedRole = role || null;
    if (role === BUYER_ROLE) {
      return { already: true, role: BUYER_ROLE };
    }
    const switched = await withTimeout(
      Promise.resolve().then(() => setRole(BUYER_ROLE)),
      timeoutMs
    );
    const newRole = normalizeRole(switched && switched.role);
    if (newRole !== BUYER_ROLE) {
      // The server did not confirm the switch: never report success.
      invalidate();
      throw buyerModeError("Server did not confirm the buyer role");
    }
    confirmedRole = BUYER_ROLE;
    return { already: false, role: BUYER_ROLE };
  }

  async function ensure(options = {}) {
    const force = !!options.force;
    if (!getToken()) {
      return { already: true, role: null, skipped: true };
    }
    if (!force && confirmedRole === BUYER_ROLE) {
      return { already: true, role: BUYER_ROLE };
    }
    if (inFlight) {
      return inFlight;
    }
    const record = { promise: null };
    record.promise = switchToBuyer().finally(() => {
      // Clear the shared slot only if it still points at THIS switch, so a
      // later switch is never cancelled by an earlier one settling.
      if (inFlight === record.promise) inFlight = null;
    });
    inFlight = record.promise;
    return record.promise;
  }

  return { ensure, noteServerRole, invalidate, getConfirmedRole };
}
