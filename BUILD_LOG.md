# Build log — Referral Compass

Notable moments for the video: decisions, mistakes caught, things that worked.

## M1 — Data pipeline (3 Nov 2026)

**Sources fetched**
- RTT: NHS England "Full CSV data file Aug26" (period `RTT-August-2026`, published Oct 2026). 177k rows, 80 MB.
- CQC: `01_October_2026_Latest_ratings.ods` from cqc.org.uk/about-us/transparency/using-cqc-data.
- ODS API (directory.spineservices.nhs.uk) for trust HQ postcodes, postcodes.io for lat/lng.

**Decisions**
- **Pain Management (191) dropped.** It is not published as its own treatment function; it sits inside the "Other" groups (X02–X06). Spec says don't use it.
- **NHS trusts only.** RTT also lists independent sector providers (e.g. SpaMedica, Nuffield). Filtered to 3-character codes starting R/T. 130 trusts nationally, 41 within 80 km of central London.
- **CQC "Well-led only" trusts.** 8 London-area trusts (King's, St George's, Hillingdon, Royal Surrey, etc.) have no trust-wide *overall* rating, only a trust-level *Well-led* rating under CQC's newer approach. They show "Rating unavailable" and score neutral (0.5), with Well-led kept as context in the Evidence drawer. Never used as a substitute.
- **104+ week bucket** is open-ended, so a percentile landing there is reported as 104 (lower bound).
- **No dependencies added.** Wrote a ~30-line CSV parser and a streaming ODS extractor instead of `csv-parse` / `xlsx`.

**Mistakes caught**
- First run produced 0 providers. The `Total` column is **blank** on Incomplete Pathways rows (only `Total All` is filled, and that includes unknown clock starts). Fixed by summing the weekly buckets.
- The CQC `.ods` is 27 MB zipped but **1 GB of XML** unzipped. Streamed it through `unzip -p` and parsed row by row (3 seconds).
- First CQC profile showed only 120 trusts with ODS codes mostly blank — looked like a broken extractor. It wasn't: for NHS trusts the CQC **Provider ID is the ODS code** (`RJ1`), and the "Provider ODS Code" column is only filled for non-NHS providers. Switched to matching on Provider ID → 129/130 exact matches.

**Validation**
- Guy's and St Thomas' (RJ1), Rheumatology: 21 commissioner rows → 486 waiting, median 5.7 wks, p92 15.1 wks, 95.5% within 18 wks. Independently recomputed in Python: identical. CQC Good (23 Jul 2019). ODS postcode SE1 7EH → 51.49796, −0.11888.
- 5 spot-checks (RAL, RVR, RQM, RWF, RD8): RTT name, CQC name and live ODS API name all agree.
- Only fuzzy match: R0D University Hospitals Dorset → Dorset County Hospital, 0.67, correctly rejected (and outside radius).

**Surprises worth saying out loud**
- **Every** CQC overall rating in scope is older than 2 years (oldest Mar 2018, newest Nov 2023). The "older than 2 years" flag will show on all of them.
- Headline preview: Rheumatology within 25 km of central London — Homerton 3.4 wks median vs Royal Free 15.5 wks. Royal Free is *closer* to the centre (5.7 km vs 7.4 km).

## G1 gate review (10:10) → conditions applied

Reviewer recomputed all 180 trust×specialty pairs from the raw CSV: PASS with 4 conditions.
1. **Small numbers + specialist trusts.** Pairs with < 50 waiting get `smallNumbers: true` and are left out of ranking but listed under the shortlist ("Not ranked, small numbers"). `isSpecialist` + note added for RPY, RAN, RPC, RGM, RYY, RDR → "Specialist or community service" tag on the card.
2. **Well-led visible on the card**, not just the drawer: outlined chip "Well-led only: Inadequate (Nov 2025)" next to "Rating unavailable". Neutral 0.5 kept in the maths (to explain on Data page).
3. **Copy:** the big number is captioned "Median wait so far for people on the list", never "time to appointment".
4. **Age always shown:** "Good · ⚠ Last rated Jul 2019 · 7 yrs ago". Used "Last rated" rather than "Last inspected" because the CQC date is the *publication* date of the rating, not the inspection date.

## M2 — Console + ranking

- No create-next-app: hand-wrote package.json (next 16.4.4, react 19.3.1) so every file is explainable.
- `lib/rank.js` checked by hand before any UI: Rheumatology at WC2N 5DU, 25 km → Guy's (nearest, 1.2 km, 5.7 wks) vs Homerton (+6 km, ~2 wks sooner). Matches the arithmetic.
- **Decision:** trade-off line wording. The spec's "Nearest option is also the fastest" is only shown when the nearest trust really has the shortest median; otherwise "This is the nearest option."
- Tested: invalid postcode, Scottish postcode (England-only message), empty state at 5 km in rural Sussex, Fastest vs Balanced reorder, Well-led chip (Hillingdon), specialist tags (RNOH, Kent Community), small-numbers note (Royal Marsden, 4 waiting).
- **Observation for video:** T&O at 80 km, Fastest: Kent Community Health appears at #4, 78 km away. The specialist tag is what stops a GP being misled.
- Gate screenshot: `docs/gate-m2-rheumatology-wc2n.jpg`.
