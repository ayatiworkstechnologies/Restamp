// Live end-to-end check: the REAL frontend API layer (src/api/auth.js,
// src/api/client.js, src/api/owner.js) against a RUNNING local backend.
//
// It reproduces the reported sequence and asserts the account isolation:
//   1. sign in as Roshan (owner)          -> sees his own listings
//   2. sign out (token cleared)           -> no token, no account data
//   3. sign in as Test 1 (owner)          -> must NOT see Roshan's listing
//   4. sign back in as Roshan             -> his listing is still his
//
// READ-ONLY: it signs in and reads listings. It never creates, edits or
// deletes a property, so the database is left untouched.
//
// Run with:
//   EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 node scripts/e2e-owner-isolation.mjs
// Optional env:
//   RESTAMP_ROSHAN_PHONE (default +917530006460)
//   RESTAMP_TEST1_PHONE  (default +919884105435)
//   RESTAMP_ROSHAN_OTP / RESTAMP_TEST1_OTP — the SMS codes delivered by the
//       configured SMS provider. When absent and the backend does not return
//       debug_code (restricted internal-testing display mode), the script
//       prompts on the terminal.
//   RESTAMP_ROSHAN_TOKEN / RESTAMP_TEST1_TOKEN — pre-minted tokens that skip
//       the OTP step entirely (e.g. per-phone request cap already reached).
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");

// The app's modules use extensionless relative imports (Metro resolves them,
// plain Node does not). Copy the few modules this check needs into a temp
// directory and add the ".js" extension so Node can load the REAL app code.
const tmp = mkdtempSync(join(tmpdir(), "restamp-e2e-"));
const FILES = [
  join(SRC, "api", "auth.js"),
  join(SRC, "api", "client.js"),
  join(SRC, "api", "owner.js"),
  join(SRC, "api", "mappers.js"),
  join(SRC, "auth", "session.js"),
];
for (const file of FILES) {
  const code = readFileSync(file, "utf8").replace(/from "(\.\/[^"]+?)"/g, (m, spec) =>
    spec.endsWith(".js") ? m : `from "${spec}.js"`
  );
  writeFileSync(join(tmp, file.split("/").pop()), code);
}

const { requestOtp, verifyOtp } = await import(join(tmp, "auth.js"));
const { setAuthToken, getAuthTokenSync } = await import(join(tmp, "client.js"));
const { fetchOwnerListings, fetchAllOwnerListings, fetchOwnerListing } = await import(
  join(tmp, "owner.js")
);
const { selectOwnerScopedProperties } = await import(join(tmp, "session.js"));

const ROSHAN = process.env.RESTAMP_ROSHAN_PHONE || "+917530006460";
const TEST1 = process.env.RESTAMP_TEST1_PHONE || "+919884105435";
// Pre-minted access tokens (same JWT the backend issues) can be supplied to
// skip the OTP step, e.g. when the local server's per-phone OTP request cap
// is already reached.
const ROSHAN_TOKEN = process.env.RESTAMP_ROSHAN_TOKEN || "";
const TEST1_TOKEN = process.env.RESTAMP_TEST1_TOKEN || "";

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`ok - ${name}`);
  else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

async function signIn(phone, token, otpEnv) {
  if (token) {
    setAuthToken(token);
    return { access_token: token, user_id: null };
  }
  const resp = await requestOtp(phone);
  // Code priority: (1) the backend-selected code the request response itself
  // carries (only in the backend's restricted internal-testing display mode;
  // production responses never contain it), (2) the RESTAMP_*_OTP env var
  // (code delivered by an actual SMS provider), (3) a terminal prompt.
  let code = (resp && resp.debug_code ? String(resp.debug_code) : "");
  if (!code) code = process.env[otpEnv] || "";
  if (!code) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    code = (await rl.question(`Enter the OTP delivered to ${phone}: `)).trim();
    rl.close();
  }
  if (!code) {
    throw new Error(
      `No OTP available for ${phone}. Run the local backend with the ` +
        `internal-testing display mode enabled (RESTAMP_OTP_DISPLAY_MODE=1) ` +
        `so the response carries debug_code, or pass ${otpEnv} / ` +
        `RESTAMP_ROSHAN_TOKEN / RESTAMP_TEST1_TOKEN to skip the OTP step.`
    );
  }
  const out = await verifyOtp(phone, code);
  setAuthToken(out.access_token);
  return out;
}

// --- 1. Roshan signs in ----------------------------------------------------
const roshan = await signIn(ROSHAN, ROSHAN_TOKEN, "RESTAMP_ROSHAN_OTP");
check("E1 Roshan signed in with a token", !!getAuthTokenSync(), roshan.user_id);
const roshanUserId = roshan.user_id ?? Number(JSON.parse(atob(roshan.access_token.split(".")[1])).sub);

const roshanList = await fetchOwnerListings(1, 100);
const roshanIds = roshanList.items.map((i) => i.listing_id);
check(
  "E2 Roshan's My Properties contains his own listing",
  roshanIds.length > 0,
  roshanIds
);
const rosansListingId = roshanIds[0];
const roshanDetail = await fetchOwnerListing(rosansListingId);
check(
  "E3 Roshan can open his own listing detail",
  roshanDetail.listing_id === rosansListingId,
  roshanDetail
);

// The listing's lifecycle state comes straight from the backend.
check(
  "E4 the listing carries the backend verification status",
  ["PENDING", "VERIFIED", "REJECTED"].includes(roshanDetail.verification_status),
  roshanDetail.verification_status
);
check(
  "E5 the listing carries the backend listing status",
  ["AVAILABLE", "CLOSED", "SOLD", "RENTED", "LEASED", "EXPIRED"].includes(
    roshanDetail.listing_status
  ),
  roshanDetail.listing_status
);

// --- 2. Roshan signs out ---------------------------------------------------
// The app's sign-out: drop the bearer token (the backend session is a
// stateless JWT; there is no server-side logout call to fail).
setAuthToken(null);
check("E6 sign-out clears the bearer token", getAuthTokenSync() === null);

// --- 3. Test 1 signs in ----------------------------------------------------
const test1 = await signIn(TEST1, TEST1_TOKEN, "RESTAMP_TEST1_OTP");
const test1UserId = test1.user_id ?? Number(JSON.parse(atob(test1.access_token.split(".")[1])).sub);
check(
  "E7 Test 1 signed in as a different account",
  !!getAuthTokenSync() && test1UserId !== roshanUserId,
  { test1: test1UserId, roshan: roshanUserId }
);

const test1List = await fetchOwnerListings(1, 100);
const test1Ids = test1List.items.map((i) => i.listing_id);
check(
  "E8 Test 1's My Properties does NOT contain Roshan's listing",
  !test1Ids.includes(rosansListingId),
  test1Ids
);
check(
  "E9 Test 1's My Properties is empty (no fallback to another account)",
  test1List.total === 0 && test1List.items.length === 0,
  { total: test1List.total, items: test1List.items.length }
);

// The detail endpoint is ownership-scoped too.
let foreignDetail = null;
try {
  foreignDetail = await fetchOwnerListing(rosansListingId);
} catch (e) {
  foreignDetail = { error: e?.status || e?.message };
}
check(
  "E10 Test 1 cannot open Roshan's listing detail (404)",
  foreignDetail && foreignDetail.error === 404,
  foreignDetail
);

// The client's own account scoping is a second line of defence.
const localRows = [{ id: "1", listing_id: rosansListingId, ownerUserId: roshanUserId }];
const scopedForTest1 = selectOwnerScopedProperties(localRows, test1UserId);
check(
  "E11 the client-side scope filter drops the previous owner's row",
  scopedForTest1.length === 0,
  scopedForTest1
);

// --- 4. Roshan signs back in ----------------------------------------------
setAuthToken(null);
await signIn(ROSHAN, ROSHAN_TOKEN);
const roshanAgain = await fetchAllOwnerListings();
const roshanAgainIds = roshanAgain.items.map((i) => i.listing_id);
check(
  "E12 Roshan still sees his own listing after signing back in",
  roshanAgainIds.includes(rosansListingId),
  roshanAgainIds
);
check(
  "E13 the paged collection and the single page agree",
  roshanAgainIds.length === roshanList.items.length,
  { paged: roshanAgainIds.length, page: roshanList.items.length }
);

setAuthToken(null);

if (failures > 0) {
  console.log(`${failures} e2e check(s) FAILED`);
  process.exit(1);
}
console.log("all live e2e owner-isolation checks passed");
