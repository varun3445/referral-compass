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

## G2 review → M2 fixes, console UI, M3 (3 Nov 2026)

**GitHub:** gh's active account was the *work* account. Stopped and asked; Varun chose to switch the active gh account to `varun3445`. Repo-local git identity uses the GitHub noreply email so no personal or work email goes into public history.

**M2 fixes**
- **Close call:** top two within 0.03 → both get "Close call: similar overall score"; header says "Scores are relative to the options shown here."
- **Specialist toggle**, default off. Off = excluded from ranking and listed in a "Hidden" note so nothing silently disappears.
- **"Fastest option has a lower CQC rating"** did not exist before; added. Fires in 79 origin×specialty combinations (e.g. Romford RM7, Rheumatology, 10 km → Barking, Havering & Redbridge, RI).
- **Privacy: outcode only.** The browser sends just `/outcodes/WC2N` to postcodes.io; the full postcode never leaves the page. Verified in the network log; no cookies or storage. `/summary` URL carries `provider`, `specialty`, `km` only.
- **Side effect worth saying on video:** the outcode centre of WC2N is ~0.4 km further from Guy's than the exact postcode was, so Homerton and Guy's are now tied at 85, and the new "Close call" label shows up right away on the headline search.

**Console UI**
- Badges: Nearest, Fastest, Highest rated ("Highest rated" only shown when ≤ 2 trusts share the best rating, otherwise it means nothing).
- Factor labels and weights shown once in the header; cards show bars + numbers only, plus overall score.
- Per-card amber age warnings replaced by one banner ("All CQC ratings shown are over 2 years old"); cards keep a quiet grey "Last rated Jul 2019".
- Minimum 13px everywhere (grep-checked). Evidence and Select for summary sit in a right-hand column, visible at 1440×900 on the first cards.

**M3**
- Evidence drawer is a native `<dialog>`: Esc closes, focus is trapped while open and returns to the Evidence button afterwards (tested with keyboard only).
- Every number shows its working. The pipeline now saves each percentile's inputs, so the drawer shows the real arithmetic, e.g. Homerton median: target 197 × 0.5 = 98.5 → week 3 + (98.5 − 89) ÷ 23 = 3.4 weeks.
- **Mistake caught:** distance formulas first printed 24.6 km as "25", so the arithmetic didn't check. Formulas now use 1 decimal place.
- **Mistake caught:** CSS Modules reject bare element selectors (`section h3`); moved to classes.
- Patient summary printed with headless Chrome to a real PDF: **1 page, A4** (595 × 842 pt). `docs/d-summary-homerton.pdf`.

## M3 fixes + M4 (3 Nov 2026)

**M3 fixes:** summary label "Waiting so far" with a plain explanation; prototype line and "not for urgent or suspected cancer referrals"; the printed NHS link now shows the full URL as text (the old `::after` suffix broke mid-word).
- **Mistake caught:** `git push --follow-tags` only pushes *annotated* tags, and `m3` was lightweight, so it didn't go up. Pushed it explicitly.
- gh account: switched back to WQA per instruction, then a follow-up said leave it on `varun3445`, so it's back on `varun3445`.

**M4**
- `/data`: sources table with links and dates, calculation methods, ranking weights (read live from `lib/rank.js` so they can't drift), 10 known limits with counts worked out from the data, privacy, and licence.
- Open Government Licence v3.0 attribution for NHS England, CQC and ODS data on `/data`, plus a one-line footer on every page. postcodes.io (OS / Royal Mail / ONS) attribution also on `/data`.
- Console hero: one question as the headline, scope line, and "Prototype · routine referrals only".
- Deployed with `vercel whoami` = `varun3445`, scope `varunbuilds` (Hobby, the personal account; no WQA team on this login). `.vercelignore` keeps the 110 MB of raw downloads out of the upload.
- Lighthouse accessibility (live site, desktop): **100 / 100 / 100** on `/`, `/data`, `/summary`.
- **Caveat caught:** Lighthouse scores `/` in its empty state, so it never sees the cards or drawer. Ran Lighthouse's own axe-core 4.14 on the filled-in console and the open Evidence drawer: 0 violations.
- **200% zoom** (720 CSS px): no horizontal scroll on any page. Found and fixed two issues: score bars lost their labels once the shared header hid, and the priority toggle stretched into an empty box.

## M4a UI redesign (3 Nov 2026)

Presentation and copy only. `lib/rank.js`, `scripts/` and `data/` untouched (checked with `git diff --stat`).

**Decision: decision first, evidence on demand.** Score numbers, score bars and the weights column are **removed from the result cards**. A GP in a 10 minute appointment needs one suggestion and three numbers they understand (waiting so far, seen within 18 weeks, distance), not a scoring table. The score breakdown, weights, formulas and "scores are relative to the options shown here" now live only in the Evidence panel, one tap away. Nothing is hidden, it just moved.

**What changed**
- NHS design system patterns, apple-design principles (response, spatial consistency, reduced motion, size-specific tracking, simplicity). Tokens in `globals.css`: page #F0F4F5, white 16px-radius cards, NHS blue as the only data accent, NHS green for primary buttons only, NHS yellow focus.
- Reference image (finance dashboard): took only the quiet cues (grey page, white rounded cards, one big number per tile, muted captions, one thin progress line on "Seen within 18 weeks"). Did not take the palette, widgets or density.
- Console: sticky 320px input panel on desktop; on tablet and phone the inputs fold into "WC2N · Rheumatology · 25 km · Edit" after "Show results". Specialty and distance are chips, priority is a segmented control ("Shortest wait" | "Balanced"), specialist toggle under More options.
- Results: one hero card "Suggested for this patient" with a plain why sentence built in `lib/explain.js` (e.g. "Shortest wait of 18 options and 6 km further than the closest."), close call as an inset note, then up to 4 compact "Other options" rows where the whole row opens Evidence.
- Evidence: native `<dialog>`, right panel on desktop, 85% bottom sheet with drag handle on phones. Enters and exits on the same path (200ms); reduced motion = cross-fade.
- Copy: no "median" in the main view (rank.js's trade-off line uses it, so that line now only appears inside Evidence), no "typical", "weeks" not "wks", no dashes, sentence case.
- Back from the summary keeps the search: inputs are held in JS memory for the tab only, never in storage.

**Mistakes caught**
- Summary bar's one-line text stretched the grid at 320px (page scrolled sideways). Fixed with `minmax(0, 1fr)`.
- Printed NHS link broke at a hyphen mid-URL. Now prints on its own line, unbroken.
- Evidence panel used `requestAnimationFrame` to start its slide, which never fires in a background tab, and close relied on a timer that hidden tabs throttle. Now forces a style flush to open and finishes closing on `transitionend` with a timer fallback; reopening cancels a pending close.
- No short NHS choice URL exists (`nhs.uk/your-choices` is a 404), so the summary prints the real path without `https://www.`.

## M4b ranking on fresh data (3 Nov 2026)

**Decision: stale data no longer drives the ranking.** Every CQC overall rating in scope is 3 to 8 years old (newest Nov 2023, oldest Mar 2018). Waiting times are from Aug 2026 and distance is computed live. Letting a 2018 inspection move a trust above or below one with a shorter wait *this* quarter would give an old judgement the same authority as current data, and the GP couldn't see that from the order. So by default the ranking uses only the two fresh signals:
- Shortest wait: wait 0.75, distance 0.25
- Balanced: wait 0.55, distance 0.45

CQC stays visible as context (tag, "Last rated", old ratings banner, Well-led chip, "Highest rated" badge). A GP who still wants it in the maths can tick **"Include CQC rating in the ranking (ratings are 3 to 8 years old)"**, which restores the old weights (0.6/0.2/0.2 and 0.4/0.3/0.3).

- The age range in that label is worked out from the data (`ratingAgeRange` in `lib/explain.js`). The brief said "2 to 8", but the newest rating (3 Nov 2023) is exactly 3 years old today, so the label reads "3 to 8".
- Effect on the headline search (Rheumatology, WC2N, 25 km, Balanced): **Guy's moves to #1** (0.895) ahead of Homerton (0.888), still a close call. With CQC ticked the old order returns (Homerton 0.850, Guy's 0.849).
- `checks/verify-ranking.mjs` recomputes the pool by hand with its own distance maths and confirms the top 5 and totals match `lib/rank.js` to 9 decimals, and that the weights sum to 1 in all four modes. Output saved in `checks/verify-output.txt`.
- The "why" sentence had to change: with Guy's first it read "2 weeks longer than the shortest wait of 18 options and the closest." Now: "Closest of 18 options, with a wait 2 weeks longer than the shortest."
- "Highest rated" had dropped out of the UI in M4a; restored next to the CQC tag as context.
