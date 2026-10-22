# Dry-Run Report — Two Test Listings (2026-10-14, uncommitted)

Target: Vercel frontend + Render `Restamp-backend` + Aiven `defaultdb`.
Method note: browser Playwright was replaced by direct calls to the exact
endpoints the app uses (Playwright not installed; OTP/form/upload flows are
API-identical). No SQL inserts; no secrets logged anywhere in this report.

## Preflight
- Git trees at baselines, work preserved; backend `/health` ok; buyer feed
  `total: 0` before; images `home_01.jpg`, `apartment_01.jpg` valid JPEGs.
- Rate limits respected (sequential, OTP_DEBUG=0, DEMO_MODE=1 on Render).

## Accounts (demo OTP, no SMS sent or received)
- Pooja, 98******01 → user id 15, display name + OWNER role verified via
  `/auth/me`. No collision (fresh identity).
- Gokul, 98******02 → user id 16, display name + OWNER role verified.
- Only Pooja/Gokul created. No other accounts touched.

## Listings published (real flow: POST /owner/listings → photo upload)
1. id **11** — Pooja — BUY / HOUSE — "DEMO - 2BHK Independent Home in Anna
   Nagar for Sale (Test Listing)" — Anna Nagar 600040 — `home_01.jpg` →
   media id 19, Cloudinary cover present.
2. id **12** — Gokul — RENT / APARTMENT — "DEMO - 2BHK Apartment in T. Nagar
   for Rent (Test Listing)" — T. Nagar 600017, deposit terms — 
   `apartment_01.jpg` → media id 20, Cloudinary cover present.
- Titles/descriptions marked DEMO/TEST; no verification/approval claims made.

## Verification
- Owner APIs: Pooja sees [11], Gokul sees [12]; names/roles correct.
- Auto-verification (~2 min, lazy on owner fetch) moved both to VERIFIED.
- Buyer feed `total: 2` with correct deal/category/covers; no duplicates
  (1+1 owner rows, feed of 2).
- Aiven row counts via direct DB unavailable (no credentials); API-visible
  state fully consistent. Local `restamp_dev` reset untouched.
- Deployed UI render not executed (JS SPA; same API source as verified
  feed) — stated limitation.
- Quirk (non-blocking): uploaded filenames gain a double `.jpg.jpg`
  suffix server-side; URLs valid.

## Counts
Buy 1, Rent 1; Home 1, Apartment 1; images used 2 distinct, 0 reused.

## Files / Git
- Runner scripts live outside repos (`/tmp/restamp_dryrun/`, not committed).
- No source, env, schema, or Cloudinary changes. Nothing staged, committed,
  pushed, or deployed. Frontend/backend trees at pre-run baselines.

STOPPED after two listings per the gate. Remaining 98 await explicit approval.
