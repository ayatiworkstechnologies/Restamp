// Regression tests for the web Alert.alert fallback (src/utils/webAlert.js).
// Run with: node scripts/web-alert.test.mjs  (plain node, no deps)
// react-native-web's Alert.alert is a no-op, so on web errors were silent
// and Alert-confirmed actions (visit confirm/decline/cancel...) never ran.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "web-alert-test-"));
writeFileSync(join(tmp, "webAlert.mjs"), readFileSync(join(ROOT, "src", "shared", "utils", "webAlert.js"), "utf8"));
const { createWebAlert, installWebAlert } = await import(join(tmp, "webAlert.mjs"));

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`ok - ${name}`);
  else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

function harness(confirmAnswer) {
  const log = [];
  const alert = createWebAlert({
    alert: (t) => log.push(["alert", t]),
    confirm: (t) => { log.push(["confirm", t]); return confirmAnswer; },
  });
  return { alert, log };
}

{
  const { alert, log } = harness(true);
  alert("Couldn't close lead", "Please check your connection and try again.");
  check("A1 message-only alert is shown (title + message)", log.length === 1 && log[0][0] === "alert" && log[0][1] === "Couldn't close lead\n\nPlease check your connection and try again.");
}
{
  const { alert, log } = harness(true);
  let ran = 0;
  alert("Done", undefined, [{ text: "OK", onPress: () => { ran += 1; } }]);
  check("A2 single button: shown, then its onPress runs once", log[0][1] === "Done" && ran === 1);
}
{
  const { alert, log } = harness(true);
  const ran = [];
  alert("Confirm Site Visit", "Confirm the visit?", [
    { text: "Not Now", style: "cancel", onPress: () => ran.push("cancel") },
    { text: "Confirm", onPress: () => ran.push("confirm") },
  ]);
  check("A3 OK on a confirm runs the action (not the cancel)", log[0][0] === "confirm" && ran.join() === "confirm", ran);
}
{
  const { alert } = harness(false);
  const ran = [];
  alert("Decline Visit Request", "Decline?", [
    { text: "Not Now", style: "cancel", onPress: () => ran.push("cancel") },
    { text: "Decline", style: "destructive", onPress: () => ran.push("decline") },
  ]);
  check("A4 Cancel on a confirm never runs the destructive action", ran.join() === "cancel", ran);
}
{
  const { alert } = harness(false);
  let threw = false;
  try {
    alert("Leave?", "", [{ text: "Stay", style: "cancel" }, { text: "Leave" }]);
  } catch {
    threw = true;
  }
  check("A5 buttons without onPress are safe", !threw);
}
{
  const { alert } = harness(true);
  const ran = [];
  alert("Options", "Pick", [{ text: "A", onPress: () => ran.push("A") }, { text: "B", onPress: () => ran.push("B") }, { text: "Cancel", style: "cancel" }]);
  check("A6 three buttons: OK runs the first non-cancel action only (documented limit)", ran.join() === "A", ran);
}
{
  const Alert = { alert() {} };
  const seen = [];
  const ok = installWebAlert(Alert, { alert: (t) => seen.push(t), confirm: () => true });
  Alert.alert("Hi");
  check("A7 install replaces Alert.alert", ok && seen.join() === "Hi");
  check("A8 install refuses a window without dialogs", installWebAlert({ alert() {} }, {}) === false);
}
{
  const app = readFileSync(join(ROOT, "App.js"), "utf8");
  check(
    "A9 App.js installs it on web only",
    (app.includes('import { installWebAlert } from "./src/utils/webAlert";') ||
      app.includes('import { installWebAlert } from "./src/shared/utils/webAlert";')) &&
      /if \(Platform\.OS === "web" && typeof window !== "undefined"\) \{\n  installWebAlert\(Alert, window\);/.test(app)
  );
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall web-alert checks passed");
