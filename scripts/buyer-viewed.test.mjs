// Regression tests for the Buyer Viewed tab and Saved screen integration.
// Run with: node scripts/buyer-viewed.test.mjs  (plain node, no deps)
// Covers: toUiViewed maps the backend ListingCard to the standard property
// card (numeric id/backendId, image, address, price label) and reads
// viewed_at as UTC; rows without a card are dropped; recordViewed is
// passive (no token / non-BUYER role -> no request, failures -> null, never
// a role switch); SavedScreen's Calls tab state exists again (C2 crash);
// PropertyDetailModal is the single place that records a view (once per
// opening, every entry point) and Saved only refreshes after it.
//
// Deterministic time zone (Asia/Kolkata). Same tmp-copy harness as the
// other script tests; network fully stubbed via global.fetch.
process.env.TZ = "Asia/Kolkata";

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const tmp = mkdtempSync(join(tmpdir(), "buyer-viewed-test-"));
copyFileSync(join(SRC, "api", "client.js"), join(tmp, "client.js"));
for (const f of ["viewed.js", "visits.js", "buyerMode.js", "buyerModeCore.js", "mappers.js"]) {
  writeFileSync(
    join(tmp, f),
    readFileSync(join(SRC, "api", f), "utf8").replace(/from "\.\/([A-Za-z]+)"/g, 'from "./$1.js"')
  );
}
const client = await import(join(tmp, "client.js"));
const buyerMode = await import(join(tmp, "buyerMode.js"));
const { recordViewed, fetchViewed, toUiViewed } = await import(join(tmp, "viewed.js"));
const savedSrc = readFileSync(join(SRC, "screens", "buyer", "SavedScreen.js"), "utf8");
const modalSrc = readFileSync(join(SRC, "components", "PropertyDetailModal.js"), "utf8");

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
    calls.push({ url, method: options.method || "GET" });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

const card = {
  listing_id: 12, title: "Sea View 2BHK", price_paise: 250000000, price_period: "TOTAL",
  price_display: "₹25.00 L", transaction_type: "BUY", property_type: "APARTMENT",
  construction_status: null, description: null, area_value: 1100, area_unit: "sqft",
  bedrooms: 2, bathrooms: 2, address_line: "12 Beach Rd", locality: "Besant Nagar",
  city: "Chennai", pincode: "600090", location_label: "Besant Nagar, Chennai",
  cover_image_url: "https://img.example/12.jpg",
};
const row = (extra = {}) => ({ id: 5, property_listing_id: 12, buyer_user_id: 7, viewed_at: "2030-12-30T11:00:00Z", listing: card, ...extra });

// --- 1. toUiViewed -----------------------------------------------------------------
{
  const v = toUiViewed(row());
  check("V1 numeric id + backendId from the listing card (was the string 'undefined')", v.id === 12 && v.backendId === 12, v.id);
  check("V2 card fields the Viewed tab renders", v.title === "Sea View 2BHK" && v.price === "₹25.00 L" && v.address === "12 Beach Rd" && v.image === "https://img.example/12.jpg");
  check("V3 viewed_at kept as the same UTC instant", v.viewed_at === "2030-12-30T11:00:00.000Z");
  check("V4 viewed time shown in local time (4:30 PM Chennai)", /^0?4:30\s*pm$/i.test(v.viewedTime.replace(/ /g, " ")), v.viewedTime);
  check("V5 zone-less viewed_at read as UTC (not device-local)", toUiViewed(row({ viewed_at: "2030-12-30T11:00:00" })).viewed_at === "2030-12-30T11:00:00.000Z");
  check("V6 missing viewed_at: no time, no crash", toUiViewed(row({ viewed_at: null })).viewedTime === "");
  check("V7 row without a listing card is dropped (null)", toUiViewed(row({ listing: null })) === null && toUiViewed(null) === null);
  const sparse = toUiViewed(row({ listing: { ...card, cover_image_url: null, address_line: null, bedrooms: null, area_value: null } }));
  check(
    "V8 optional listing fields missing: still a valid card, no stock photo invented",
    sparse && sparse.id === 12 && sparse.beds === undefined && sparse.image === null
  );
}

// --- 2. recordViewed is passive -----------------------------------------------------
{
  client.setAuthToken(null);
  calls.length = 0;
  stubFetch(201, row());
  check("R1 signed out: no request, resolves null", (await recordViewed(12)) === null && calls.length === 0);

  client.setAuthToken("tok");
  buyerMode.noteServerRole("OWNER");
  calls.length = 0;
  check("R2 OWNER-mode account: no request and no role switch", (await recordViewed(12)) === null && calls.length === 0);

  buyerMode.noteServerRole("BUYER");
  calls.length = 0;
  const ok = await recordViewed(12);
  check("R3 BUYER: one POST /buyer/viewed/{id}", calls.length === 1 && calls[0].method === "POST" && calls[0].url.endsWith("/buyer/viewed/12") && ok && ok.id === 5, calls);

  calls.length = 0;
  stubFetch(500, { detail: "Internal error" });
  let threw = false;
  let res;
  try { res = await recordViewed(12); } catch { threw = true; }
  check("R4 server failure never throws (navigation not blocked)", !threw && res === null);
  check("R5 invalid ids are ignored", (await recordViewed("undefined")) === null && (await recordViewed(0)) === null);
}

// --- 3. fetchViewed -----------------------------------------------------------------
{
  buyerMode.noteServerRole("BUYER");
  stubFetch(200, { items: [row()], page: 1, page_size: 50, total: 1 });
  calls.length = 0;
  const page = await fetchViewed({ page: 1, pageSize: 50 });
  check("F1 GET /buyer/viewed with paging", calls.some((c) => c.url.includes("/buyer/viewed?") && c.url.includes("page_size=50")), calls);
  check("F2 items/total passed through", page.total === 1 && page.items.length === 1);
  stubFetch(503, { detail: "x" });
  let rejected = false;
  try { await fetchViewed(); } catch { rejected = true; }
  check("F3 list failure rejects (screen shows its error state)", rejected);
}

// --- 4. Screen wiring (source text) ------------------------------------------------
check("S1 SavedScreen declares callHistory again (C2: Calls tab crashed with ReferenceError)", savedSrc.includes("const [callHistory, setCallHistory] = useState([])") && savedSrc.includes("No call activity yet"));
check("S2 Viewed rows without a card are dropped", savedSrc.includes(".map(toUiViewed).filter(Boolean)"));
check("S3 Viewed tab has loading/error state", savedSrc.includes("setViewedLoading(true)") && savedSrc.includes("setViewedError(err)"));
check("S4 Saved (wishlist) tab still renders the wishlist, not viewed history", savedSrc.includes("{wishlist.map((property) => {"));
check(
  "S5 PropertyDetailModal records every real listing it opens, fire-and-forget",
  modalSrc.includes('import { recordViewed } from "../api/viewed";') &&
    modalSrc.includes('if (!visible || typeof backendId !== "number") return;') &&
    modalSrc.includes("recordViewed(backendId).then((recorded) => {")
);
check(
  "S6 the tracking hook runs before the modal's early return (hook order kept)",
  modalSrc.indexOf("recordViewed(backendId)") < modalSrc.indexOf("if (!visible || !property) return null;")
);
check(
  "S7 the effect re-runs only for a new opening (visible / listing id), not on callback identity",
  modalSrc.includes("}, [visible, property && property.backendId]);") &&
    modalSrc.includes("onViewRecordedRef.current = onViewRecorded;")
);

// --- 5. One view per opening (no duplicate POSTs from Saved) ------------------------
{
  const { readdirSync, statSync } = await import("node:fs");
  const files = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".js")) files.push(p);
    }
  };
  walk(SRC);
  const callers = files.filter(
    (f) => !f.endsWith(join("api", "viewed.js")) && /\brecordViewed\(/.test(readFileSync(f, "utf8"))
  );
  check(
    "D1 recordViewed is called from exactly one place: PropertyDetailModal",
    callers.length === 1 && callers[0].endsWith(join("components", "PropertyDetailModal.js")),
    callers.map((f) => f.slice(SRC.length + 1))
  );
  check(
    "D2 Saved/Viewed card taps only open the sheet (no own view POST)",
    !savedSrc.includes("recordPropertyView") && !savedSrc.includes("recordViewed")
  );
  check(
    "D3 Saved still refreshes its Viewed list after the sheet records",
    savedSrc.includes("onViewRecorded={handleViewRecorded}") &&
      savedSrc.includes("loadViewedProperties().catch(() => {});")
  );
  check(
    "D4 the callback fires only after a real recording (skipped/failed -> no refresh)",
    modalSrc.includes("if (recorded && onViewRecordedRef.current) onViewRecordedRef.current(recorded);")
  );
}

client.setAuthToken(null);
if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall buyer-viewed checks passed");
