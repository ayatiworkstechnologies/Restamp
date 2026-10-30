/**
 * Web fallback for React Native's Alert.alert.
 *
 * react-native-web ships Alert.alert as an empty function, so on the web
 * build every alert was silent: error messages never showed, and actions
 * confirmed through Alert buttons (visit confirm/decline/complete/cancel,
 * proposal replies, lead and listing confirmations) could never run.
 *
 * This maps Alert.alert onto the browser's blocking dialogs:
 *   - no buttons / one button  -> window.alert, then that button's onPress;
 *   - two or more buttons      -> window.confirm: OK runs the first
 *     non-cancel button, Cancel runs the cancel button (if any).
 * A browser confirm has only two choices, so with three or more buttons OK
 * always means the first non-cancel action; screens that offer several
 * distinct actions in one alert reach only that one on web.
 *
 * Pure module (no react-native import) so it is unit-tested from
 * scripts/web-alert.test.mjs; App.js installs it on web only.
 */

/**
 * @param {{alert: Function, confirm: Function}} dialogs - window-like object
 * @returns {(title?: string, message?: string, buttons?: Array) => void}
 */
export function createWebAlert(dialogs) {
  return function webAlert(title, message, buttons) {
    const text = [title, message].filter((part) => part !== undefined && part !== null && String(part) !== "").join("\n\n");
    const list = Array.isArray(buttons) ? buttons.filter(Boolean) : [];
    const cancel = list.find((b) => b.style === "cancel") || null;
    const actions = list.filter((b) => b !== cancel);
    if (list.length < 2) {
      dialogs.alert(text);
      const only = list[0];
      if (only && typeof only.onPress === "function") only.onPress();
      return;
    }
    const chosen = dialogs.confirm(text) ? actions[0] || null : cancel;
    if (chosen && typeof chosen.onPress === "function") chosen.onPress();
  };
}

/**
 * Replace Alert.alert with the web fallback. Call once, on web only.
 * @param {{alert: Function}} Alert - react-native's Alert export
 * @param {object} win - the browser window
 */
export function installWebAlert(Alert, win) {
  if (!Alert || !win || typeof win.confirm !== "function" || typeof win.alert !== "function") return false;
  Alert.alert = createWebAlert({
    alert: (t) => win.alert(t),
    confirm: (t) => win.confirm(t),
  });
  return true;
}
