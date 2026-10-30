// Regression tests for the displayed-OTP login flow.
// Run with: node scripts/otp-display.test.mjs  (plain node, no deps)
// Covers: requestOtp/verifyOtp hit the real endpoints and pass the backend's
// debug_code through untouched (leading zeros kept); a 503 rejects as an
// ApiError (never a fake success); LoginScreen stores the backend code,
// renders the chip only when a code exists, auto-fills six digits, and stays
// on the phone step when the request fails.
//
// Same tmp-copy convention as the other script tests. Network is fully
// stubbed via global.fetch — no backend is contacted. LoginScreen imports
// React and cannot run in this harness; its wiring is guarded by source-text
// assertions below plus `npx expo export -p web` (Metro parse).
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "otp-display-test-"));
copyFileSync(join(ROOT, "..", "src", "shared", "api", "client.js"), join(tmp, "client.js"));
writeFileSync(
  join(tmp, "auth.js"),
  readFileSync(join(ROOT, "..", "src", "features", "auth", "api", "auth.js"), "utf8")
    .replace(/from "[^"]*client(\.js)?"/g, 'from "./client.js"')
);
const client = await import(join(tmp, "client.js"));
const auth = await import(join(tmp, "auth.js"));
const loginSrc = readFileSync(join(ROOT, "..", "src", "features", "auth", "screens", "LoginScreen.js"), "utf8");

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const calls = [];
function stubFetch(status, body) {
  global.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method, body: options.body });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
}

// --- 1. API layer -------------------------------------------------------------
check("A1 requestOtp is exported", typeof auth.requestOtp === "function");
check("A2 verifyOtp is exported", typeof auth.verifyOtp === "function");

stubFetch(200, { message: "If the number is valid, an OTP was sent.", debug_code: "012345" });
const resp = await auth.requestOtp("+919876543210");
const req = calls.at(-1);
check("A3 request goes to POST /auth/otp/request", req.method === "POST" && req.url.endsWith("/auth/otp/request"), req);
check("A4 request body is the phone only", req.body === JSON.stringify({ phone: "+919876543210" }), req.body);
check("A5 debug_code passes through untouched (leading zero kept)", resp.debug_code === "012345", resp);

stubFetch(200, { access_token: "t", token_type: "bearer", expires_in: 1800, user_id: 1, role: "OWNER" });
const token = await auth.verifyOtp("+919876543210", "012345");
const ver = calls.at(-1);
check("A6 verify goes to POST /auth/otp/verify", ver.method === "POST" && ver.url.endsWith("/auth/otp/verify"), ver);
check("A7 verify sends the exact code", ver.body === JSON.stringify({ phone: "+919876543210", code: "012345" }), ver.body);
check("A8 verify returns the token response unchanged", token.access_token === "t" && token.role === "OWNER");

stubFetch(503, { detail: "OTP delivery is not configured. Try again later." });
let err = null;
try {
  await auth.requestOtp("+919876543210");
} catch (e) {
  err = e;
}
check("A9 503 rejects as ApiError (no fake success)", client.isApiError(err) && err.status === 503, err && err.status);

stubFetch(401, { detail: "Invalid or expired code" });
err = null;
try {
  await auth.verifyOtp("+919876543210", "999999");
} catch (e) {
  err = e;
}
check("A10 wrong code rejects as kind 'login' (401)", client.isApiError(err, "login") && err.status === 401);

// --- 2. LoginScreen wiring (source text) ---------------------------------------
check("L1 LoginScreen imports requestOtp from api/auth", /import\s*{[^}]*requestOtp[^}]*}\s*from\s*"\.\.\/api\/auth(\.js)?"/.test(loginSrc));
check(
  "L2 phone submit stores the backend debug_code",
  /const resp = await requestOtp\(fullPhone\(\)\);[\s\S]{0,700}resp && resp\.debug_code \? String\(resp\.debug_code\) : null;[\s\S]{0,40}setDevCode\(serverCode\);/.test(loginSrc)
);
check("L3 code chip renders only when devCode is set", /\{(SHOW_OTP_CODE_CHIP && )?devCode \? \(/.test(loginSrc));
check("L4 chip tap auto-fills the backend code", /onPress=\{\(\) => handleAutoFill\(devCode\)\}/.test(loginSrc));
check(
  "L5 auto-fill keeps all six digits as a string",
  /String\(targetCode\)\s*\.replace\(\/\[\^0-9\]\/g, ""\)\s*\.slice\(0, 6\)/.test(loginSrc)
);
const failBranch = loginSrc.slice(
  loginSrc.indexOf("const handlePhoneSubmit"),
  loginSrc.indexOf("// Direct OTP verify call")
);
const catchBlock = failBranch.slice(failBranch.indexOf("} catch (e) {"), failBranch.indexOf("} finally {"));
check("L6 failed request stays on the phone step", catchBlock.length > 0 && !catchBlock.includes("setStep(2)"), catchBlock);
check("L7 no locally fabricated codes", !/debug_code\s*[:=]\s*["'`]\d/.test(loginSrc));

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall otp-display checks passed");
