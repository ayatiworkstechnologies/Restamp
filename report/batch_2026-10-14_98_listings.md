# Batch Execution Report — 98 Listings (2026-10-14, uncommitted)

Dry run (listings 11–12) approved in `report/dry_run_2026-10-14_two_listings.md`;
this report covers the remaining 98 (IDs 13–110). Method: direct calls to the exact
endpoints the app uses (browser Playwright not installed; OTP/form/upload paths are
endpoint-identical). No SQL inserts; no secrets logged anywhere.

## Truthfulness note (required)
These 100 records are synthetic DEMO/TEST data (invented titles, localities,
prices, owner display names for test accounts), all titled `DEMO -` as approved
in the dry run. They are NOT genuine listings and must not be presented as such.

## Accounts
- Pooja, 98******01 → id 15, OWNER (existing from dry run)
- Sreelakshmi, 98******03 → id 17, OWNER (created this run, demo OTP, no collision)
- Gokul, 98******02 → id 16, OWNER (existing)
- Vishranth, 98******04 → id 18, OWNER (created this run, demo OTP, no collision)
- Gowtham, 98******05 → id 19, OWNER (created this run, demo OTP, no collision)
No SMS sent or received (demo mode). No other accounts created or touched.

## .jpg.jpg note
Left as-is: the suffix comes from backend public-id construction
(`uuid+extension` passed as Cloudinary public_id, which re-appends the delivery
extension). All stored URLs resolve to valid images; changing it needs a backend
edit + deploy, out of scope. Existing URLs unaffected either way.

## Execution
20 batches (19×5 + 1×3), sequential, ~3s delays, token refresh with 401 retry.
One transient 429 (OTP request rate limit) on the first login — handled by
1000s backoff, then clean. No duplicates (asserted per insert), no failed
creates, no retries that risked dupes, no invalid uploads.

## Verification (all via supported APIs)
- Per-listing: owner detail checked title prefix, deal, category, cover URL.
- Owner totals: 20/20/20/20/20 (100 rows). Buyer feed total: 100.
- Distribution: deals 25×4; categories 20×5 (incl. dry run).
- All 100 titles begin `DEMO -`; all 100 have Cloudinary covers; 100 unique images.
- Aiven direct-DB counts unavailable (no credentials); local reset untouched.
- SPA UI render not executed (same API source as feed).

## Full listing table (ID / Owner / Deal / Category / Image)

| ID | Owner | Deal | Category | Image |
|----|-------|------|----------|-------|
| 11 | Pooja | BUY | Home | home/home_01.jpg |
| 12 | Gokul | RENT | Apartment | apartment/apartment_01.jpg |
| 13 | Pooja | BUY | Home | home/home_02.jpg |
| 14 | Sreelakshmi | BUY | Home | home/home_03.jpg |
| 15 | Gokul | BUY | Home | home/home_04.jpg |
| 16 | Vishranth | BUY | Home | home/home_05.jpg |
| 17 | Gowtham | BUY | Plot | plot/plot_01.jpg |
| 18 | Pooja | BUY | Plot | plot/plot_02.jpg |
| 19 | Sreelakshmi | BUY | Plot | plot/plot_03.jpg |
| 20 | Gokul | BUY | Plot | plot/plot_04.jpg |
| 21 | Vishranth | BUY | Plot | plot/plot_05.jpg |
| 22 | Gowtham | BUY | Villa | villa/villa_01.jpg |
| 23 | Pooja | BUY | Villa | villa/villa_02.jpg |
| 24 | Sreelakshmi | BUY | Villa | villa/villa_03.jpg |
| 25 | Gokul | BUY | Villa | villa/villa_04.jpg |
| 26 | Vishranth | BUY | Villa | villa/villa_05.jpg |
| 27 | Gowtham | BUY | Apartment | apartment/apartment_02.jpg |
| 28 | Pooja | BUY | Apartment | apartment/apartment_03.jpg |
| 29 | Sreelakshmi | BUY | Apartment | apartment/apartment_04.jpg |
| 30 | Gokul | BUY | Apartment | apartment/apartment_05.jpg |
| 31 | Vishranth | BUY | Apartment | apartment/apartment_06.jpg |
| 32 | Gowtham | BUY | Commercial | commercial/commercial_01.jpg |
| 33 | Pooja | BUY | Commercial | commercial/commercial_02.jpg |
| 34 | Sreelakshmi | BUY | Commercial | commercial/commercial_03.jpg |
| 35 | Gokul | BUY | Commercial | commercial/commercial_04.jpg |
| 36 | Vishranth | BUY | Commercial | commercial/commercial_05.jpg |
| 37 | Gowtham | RESALE | Home | home/home_06.jpg |
| 38 | Pooja | RESALE | Home | home/home_07.jpg |
| 39 | Sreelakshmi | RESALE | Home | home/home_08.jpg |
| 40 | Gokul | RESALE | Home | home/home_09.jpg |
| 41 | Vishranth | RESALE | Home | home/home_10.jpg |
| 42 | Gowtham | RESALE | Plot | plot/plot_06.jpg |
| 43 | Pooja | RESALE | Plot | plot/plot_07.jpg |
| 44 | Sreelakshmi | RESALE | Plot | plot/plot_08.jpg |
| 45 | Gokul | RESALE | Plot | plot/plot_09.jpg |
| 46 | Vishranth | RESALE | Plot | plot/plot_10.jpg |
| 47 | Gowtham | RESALE | Villa | villa/villa_06.jpg |
| 48 | Pooja | RESALE | Villa | villa/villa_07.jpg |
| 49 | Sreelakshmi | RESALE | Villa | villa/villa_08.jpg |
| 50 | Gokul | RESALE | Villa | villa/villa_09.jpg |
| 51 | Vishranth | RESALE | Villa | villa/villa_10.jpg |
| 52 | Gowtham | RESALE | Apartment | apartment/apartment_07.jpg |
| 53 | Pooja | RESALE | Apartment | apartment/apartment_08.jpg |
| 54 | Sreelakshmi | RESALE | Apartment | apartment/apartment_09.jpg |
| 55 | Gokul | RESALE | Apartment | apartment/apartment_10.jpg |
| 56 | Vishranth | RESALE | Apartment | apartment/apartment_11.jpg |
| 57 | Gowtham | RESALE | Commercial | commercial/commercial_06.jpg |
| 58 | Pooja | RESALE | Commercial | commercial/commercial_07.jpg |
| 59 | Sreelakshmi | RESALE | Commercial | commercial/commercial_08.jpg |
| 60 | Gokul | RESALE | Commercial | commercial/commercial_09.jpg |
| 61 | Vishranth | RESALE | Commercial | commercial/commercial_10.jpg |
| 62 | Gowtham | RENT | Home | home/home_11.jpg |
| 63 | Pooja | RENT | Home | home/home_12.jpg |
| 64 | Sreelakshmi | RENT | Home | home/home_13.jpg |
| 65 | Gokul | RENT | Home | home/home_14.jpg |
| 66 | Vishranth | RENT | Home | home/home_15.jpg |
| 67 | Gowtham | RENT | Plot | plot/plot_11.jpg |
| 68 | Pooja | RENT | Plot | plot/plot_12.jpg |
| 69 | Sreelakshmi | RENT | Plot | plot/plot_13.jpg |
| 70 | Gokul | RENT | Plot | plot/plot_14.jpg |
| 71 | Vishranth | RENT | Plot | plot/plot_15.jpg |
| 72 | Gowtham | RENT | Villa | villa/villa_11.jpg |
| 73 | Pooja | RENT | Villa | villa/villa_12.jpg |
| 74 | Sreelakshmi | RENT | Villa | villa/villa_13.jpg |
| 75 | Gokul | RENT | Villa | villa/villa_14.jpg |
| 76 | Vishranth | RENT | Villa | villa/villa_15.jpg |
| 77 | Gowtham | RENT | Apartment | apartment/apartment_12.jpg |
| 78 | Pooja | RENT | Apartment | apartment/apartment_13.jpg |
| 79 | Sreelakshmi | RENT | Apartment | apartment/apartment_14.jpg |
| 80 | Gokul | RENT | Apartment | apartment/apartment_15.jpg |
| 81 | Vishranth | RENT | Commercial | commercial/commercial_11.jpg |
| 82 | Gowtham | RENT | Commercial | commercial/commercial_12.jpg |
| 83 | Pooja | RENT | Commercial | commercial/commercial_13.jpg |
| 84 | Sreelakshmi | RENT | Commercial | commercial/commercial_14.jpg |
| 85 | Gokul | RENT | Commercial | commercial/commercial_15.jpg |
| 86 | Vishranth | LEASE | Home | home/home_16.jpg |
| 87 | Gowtham | LEASE | Home | home/home_17.jpg |
| 88 | Pooja | LEASE | Home | home/home_18.jpg |
| 89 | Sreelakshmi | LEASE | Home | home/home_19.jpg |
| 90 | Gokul | LEASE | Home | home/home_20.jpg |
| 91 | Vishranth | LEASE | Plot | plot/plot_16.jpg |
| 92 | Gowtham | LEASE | Plot | plot/plot_17.jpg |
| 93 | Pooja | LEASE | Plot | plot/plot_18.jpg |
| 94 | Sreelakshmi | LEASE | Plot | plot/plot_19.jpg |
| 95 | Gokul | LEASE | Plot | plot/plot_20.jpg |
| 96 | Vishranth | LEASE | Villa | villa/villa_16.jpg |
| 97 | Gowtham | LEASE | Villa | villa/villa_17.jpg |
| 98 | Pooja | LEASE | Villa | villa/villa_18.jpg |
| 99 | Sreelakshmi | LEASE | Villa | villa/villa_19.jpg |
| 100 | Gokul | LEASE | Villa | villa/villa_20.jpg |
| 101 | Vishranth | LEASE | Apartment | apartment/apartment_16.jpg |
| 102 | Gowtham | LEASE | Apartment | apartment/apartment_17.jpg |
| 103 | Pooja | LEASE | Apartment | apartment/apartment_18.jpg |
| 104 | Sreelakshmi | LEASE | Apartment | apartment/apartment_19.jpg |
| 105 | Gokul | LEASE | Apartment | apartment/apartment_20.jpg |
| 106 | Vishranth | LEASE | Commercial | commercial/commercial_16.jpg |
| 107 | Gowtham | LEASE | Commercial | commercial/commercial_17.jpg |
| 108 | Sreelakshmi | LEASE | Commercial | commercial/commercial_18.jpg |
| 109 | Vishranth | LEASE | Commercial | commercial/commercial_19.jpg |
| 110 | Gowtham | LEASE | Commercial | commercial/commercial_20.jpg |

## Git / safety
- No source, env, schema, Cloudinary, or Render changes. Nothing staged,
  committed, pushed, or deployed. Runner scripts live outside repos
  (`/tmp/restamp_dryrun/`, not committed).
