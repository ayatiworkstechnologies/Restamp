/**
 * Authentication guard decisions for protected persistent actions (Change 2).
 *
 * Pure, framework-free decision helpers (unit-tested). The impure parts
 * (navigation, token reads) stay with the callers:
 * - planProtectedAction: run now when authenticated, otherwise defer.
 * - planLoginResume: after a successful login, decide whether a stored
 *   continuation exists and whether the navigator can simply go back to the
 *   exact origin screen (preserving form state) or must reset into MainTabs.
 */

export function planProtectedAction({ isAuthenticated, hasToken }) {
  if (isAuthenticated && hasToken) return { status: "run" };
  return { status: "defer" };
}

/**
 * @param {object} args
 * @param {Function|null} args.continuation - consumed pending action or null
 * @param {boolean} args.canGoBack - navigation.canGoBack() from Login
 * @param {boolean} args.loginSucceeded - only resume on real success
 * @returns {{ mode: "resume-back" | "resume-reset" | "default-reset", action: Function|null }}
 */
export function planLoginResume({ continuation, canGoBack, loginSucceeded }) {
  if (loginSucceeded && typeof continuation === "function") {
    return {
      mode: canGoBack ? "resume-back" : "resume-reset",
      action: continuation,
    };
  }
  return { mode: "default-reset", action: null };
}
