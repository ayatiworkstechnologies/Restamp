/**
 * Single-shot post-login continuation store (Change 2).
 *
 * Holds at most one pending protected action (a zero-arg function created by
 * the originating screen). consume() returns and clears it exactly once, so
 * a resumed action can never run twice; clear() drops it on login cancel,
 * Skip, or backing out of the Login screen. Framework-free and unit-tested
 * (scripts/auth-guard.test.mjs). AuthContext exposes one shared instance.
 */

export function createContinuationStore() {
  let pending = null;
  return {
    set(action) {
      pending = typeof action === "function" ? action : null;
    },
    peek() {
      return pending;
    },
    has() {
      return pending !== null;
    },
    consume() {
      const action = pending;
      pending = null;
      return action;
    },
    clear() {
      pending = null;
    },
  };
}
