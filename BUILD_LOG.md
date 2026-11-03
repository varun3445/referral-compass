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

## M4c visual finish (3 Nov 2026)

Restyle only. No ranking, data or copy changes, apart from the delta lines the brief asked for ("+2.3 weeks vs shortest", "+6 km vs closest", "Closest option").

- **Dropped the NHS look**, kept NHS plain language and accessibility. Pale grey canvas (#ECEEF1), borderless white cards (radius 20, two-layer soft shadow), deep green #1F7A5A as the only data accent, near-black pill for primary actions, white outlined pills for secondary, near-black selected chips. Inter via `next/font` (part of Next, no new dependency).
- **Signature: hatched wait bars.** Every result has a lime diagonal-hatch bar for "waiting so far", scaled to the longest wait in the results shown. The number is always written next to it; the bar is `aria-hidden`.
- **One big number per tile** (44px, weight 600, -0.03em, tabular), unit and label small and muted, delta line with a tiny Lucide icon. "Other options" are now separate lifting cards.
- CQC tags: tinted pill + dot + text label. Old ratings banner: soft amber, radius 14, small icon.
- Focus: 3px dark ring with a 2px white gap (replaces the NHS yellow). Motion: 2px hover lift, 0.98 press, 200ms ease-out, panels exit the way they enter; reduced motion drops the lift and slides.
- **Phones:** numbers never wrap from their units; the wait tile is full width with the other two side by side; after a search the intro paragraph hides and the headline shrinks, so the wait number sits at 490px of an 844px screen.

**Mistakes caught**
- "Seen within 18 weeks" didn't fit a half-width tile at 390px and pushed its bar past the edge. Copy couldn't change, so the two small tiles drop their icons and use a 12px label on phones.
- At 320px the one-line phone banner (nowrap) widened the results grid and the page scrolled sideways. Fixed with `minmax(0, 1fr)` on the results column.
- The new 5-column weights table on /data scrolls inside its box on phones; axe flagged the scroll area as not keyboard reachable. Both table wrappers are now labelled, focusable regions.

## M4d layout fixes + visual finish (3 Nov 2026)

**Job 1, layout (own commit).** The tile bugs (label touching the edge, bar overrunning padding, units off the baseline, tiles with different rhythm) came from patches: fixed text-column widths, nowrap labels, sibling margins, ellipsis clipping. Removed the causes instead:
- `box-sizing: border-box` and `min-width: 0` on every element; spacing only through flex/grid gap on one scale (4, 8, 12, 16, 24, 32, 48). No sibling margins left (only `margin: 0` resets and `margin: 0 auto` centring).
- Labels may wrap; nothing clips. Number + unit is one baseline-aligned, nowrap inline-flex.
- Stat tiles use a container query: side by side only when each tile gets 200px (3 × 200 + 2 × 12 = 624px), otherwise stacked full width. Side by side, they use `subgrid` rows so label, number and context line up across tiles. Each tile has exactly three rows; the info icon and "486 waiting" footnote are gone.
- `checks/layout-check.mjs` (playwright-core, driving the installed Chrome; dev dependency only) checks every element for scrollWidth > clientWidth, children outside the parent's content box, and page width > viewport, on the console, the Evidence panel and /summary at 320, 390, 768, 1024, 1440. Baseline failed at 4 widths (the reported tile overrun at 1024 and 1440, clipped text at 320 and 390); after the fix all pass.

**Job 2, look.** Warmer and calmer: canvas #F6F5F2, white cards with a #E6E3DC hairline and no shadow at rest, ink #14181B, one accent #1F7A5A used only for data and the focus ring. The top result is the only tinted surface (mint #EAF4EE, 28px name, 48px wait); other options are plain rows in one white card with hairline dividers. Specialty is a 2-column grid of equal buttons; distance and priority are full-width segmented controls. Empty state fills the results column with one sentence and "Try an example: WC2N, Rheumatology". Container 1200, sticky 340px input card.

**Conflicts in the brief, resolved and flagged**
- "No gradients" + "one accent" ruled out the M4c lime diagonal hatch (it was a CSS gradient). Wait bars are now solid accent.
- Accent reserved for data and focus, so links became near-black underlined text.
- 20px card padding on phones is off the 4/8/12/16/24/32/48 scale; kept as one named exception (`--pad-card`).
- At 1024 the tiles stack (the hero is narrower than 624px there), which is the container rule working as specified.

**Capture note:** Playwright full-page and element screenshots paint the sticky summary bar mid-page. The screenshot script un-sticks it during capture only; the app is unchanged.

## M4e polish (3 Nov 2026)

1. **Wording, data accuracy.** "Seen within 18 weeks" was wrong: the figure is the share of people *still waiting* who have waited under 18 weeks, not people seen. Now "Waiting under 18 weeks" with context "96 in 100 on the list", in the console, Evidence panel and /data (/summary already said "have waited under 18 weeks").
2. **CQC age.** The console banner and /summary now say "3 to 8 years old", computed from the data by the same `ratingAgeRange` as the checkbox label. Mid-round request: the console banner is one sentence, no bold "Important": "CQC ratings are 3 to 8 years old and not used in the ranking." (or "...and are used in the ranking." when the CQC box is ticked). It is one line on desktop; at 390px the sentence is longer than a phone line, so it wraps to two.
3. **Option rows.** Fixed grid (name 1fr, wait 200px, distance 96px, action 120px), centre-aligned, so bars, distances and links line up. **Deviation:** triggered by the rows card being 640px or wider (a container query), not by a 900px viewport. At a 1024px window the results column is ~612px, and the fixed columns would have left the trust name ~100px. Every screen 900px or wider where the column has room gets the fixed grid. "Highest rated" now sits right after the rating chip.
4. **Dead space.** The postcode status line takes no space when empty (stays in the page for screen readers). "More options" is a proper disclosure with a chevron, closed by default. Disabled "Show results" is a light outlined state.
5. **Phones below 600px.** The three stats are one card with three hairline rows, label left and number right; only the wait row has a bar. At 390x844 the trust name ends at 427px and the wait number at 498px.
6. **Desktop empty state.** Centred in the column, with "For each trust you will see waiting so far, CQC rating and distance." under the button.

Checks: layout-check passes at 320/390/768/1024/1440; axe 0 issues on empty and results at 390 and 1440; verify-ranking output byte-identical to M4b; summary prints on 1 A4 page.

**Real time for this round (system clock):** started 12:02:24, all changes and checks done 12:05:26, so **3 minutes**, plus the commit, push and deploy that follow. Timestamps from `date` on this machine at the start and end of the round, not estimates.

## M4f readme (3 Nov 2026)

- "Waiting under 18 weeks" context now reads "of 486 waiting" (the trust's real total for the selected specialty).
- README.md: screenshot, live link, what it is for, ranking (0.55 / 0.45 by default, CQC optional and why), sources with dates, limits, run and check instructions.
- **Brief PDF check:** `git log --all -- "*.pdf"` lists only the app's own printed summaries in `docs/`. The Palantir brief has never been in the repo or its history; it lives in `~/Downloads`, outside the project. `.gitignore` now blocks `*Palantir*` / `*palantir*` anywhere in the repo as a guard.
- Checks: layout-check passes at 5 widths, axe 0 issues on 10 page states, verify-ranking output unchanged.

## M4g M4h trust wording and designer comments (3 Nov 2026)

**Look:** mid-round, the reference became a light fitness-style dashboard. The canvas is neutral light grey (#F2F2F1, not the briefed #EEF3FA), with white 28px cards, pill controls and buttons, and a round black logo. The top match is the one black card, with bright green (#1FDB78) bars and a primary button. Its wait number is 56px italic bold. Bright green is used only for fills and marks, never as text on white. There are no gradients, glass or photos.

- **Wording:** "Top match for your settings"; /summary leads with "Provider option to discuss with your GP" and "About this option". "Distance to trust HQ" everywhere with an info note. The 18 week tile has an info note with the real N. CQC is shown as "Good · Published Jul 2019". The date is the CQC file's **Publication Date** column (scripts/build-data.mjs). Ratings older than 2 years get a lighter outlined tag. A missing rating shows "Not available" with the reason from the data.
- **How ranking works** disclosure under Priority, with no weights.
- **Distances** are 5, 10, 15 and 25 km, default 10. Outside the coverage area (more than the data radius from central London): "This postcode is outside the London area covered by this prototype."
- **Summary:** a comparison table with the trust plus the next 2 results, passed as ODS:km pairs in the URL (no postcode), and a ruled notes box. It prints on 1 A4 page: the notes box drops to 2 lines and print spacing is tighter. The table is unchanged.
- **Evidence:** plain sentences, no formulas or score bars. New rows for the CQC match method and the location source. The formulas and a worked example (WC2N, 10 km) are on Data and limits under "How the ranking is worked out".
- **Data and limits** opens as a native modal (X, Esc, scrim, focus return; full screen on phones), and /data shows the same content. On the desktop console the button sits at the top right of the results area; on phones it stays in the header. **Deviation:** "New search" was removed at the user's request; the logo link still clears the search.
- **Stat tiles:** the same bar on all three, and each phone row has its bar. **Font:** Plus Jakarta Sans 400 to 700, including print.

Checks: layout-check passes at 5 widths; axe 0 issues on console with the popover open, Evidence, modal and /summary at 390 and 1440; verify-ranking output identical; summary prints on 1 A4 page; Impeccable detector found nothing.

**Real time (system clock):** started 15:19, finished 15:32:24 (before commit and deploy).
Deployed and confirmed live at https://referral-compass.vercel.app at 15:33:15, so about **14 minutes** from start to live.

## M4i clinical look and "why" visuals (3 Nov 2026)

Feedback: the reference was meant for its visual approach, not its colours. This is a GP tool, so it should look fresh and clean and show *why* a trust is the top match.

- **Palette:** very light blue canvas #EEF3FA, white cards, #DDE6F0 hairlines, navy ink #0F1B2D, and one blue #2457C5 for data, charts and focus (6.3:1 on white). The top match is a soft blue tint (#EAF1FD) instead of black, and the italic numbers are gone. Pill controls and large radii stay.
- **"Why it is the top match":** a white panel in the hero with the plain sentence and two dot strips. Every trust in the search is plotted by waiting so far and by distance to trust HQ, with this trust highlighted. The caption says the same in words ("3rd shortest of 11", "Closest of 11"), and a key sits underneath. The same strips are in the Evidence panel. The ranking is unchanged: the page asks for every ranked trust and lists the top 5, and the top 5 order is identical.
- **Clashes fixed:** the CQC tag in the rows could run into the wait bar. Rows now use the stacked badge (date on its own line), switch to the 4-column grid only from a 46rem card (was 40rem), and use 24px column gaps. Rows get a rank number in a soft circle.

Checks: layout-check passes at 5 widths; axe 0 issues on 8 states; verify-ranking identical; summary prints on 1 A4 page; detector clean. Not yet deployed.

## M4j neutral canvas, graphite data, new nav (3 Nov 2026)

- **Background:** the blue was dropped. The canvas is a neutral cool off-white #F4F5F7 with #E3E6EA hairlines. The hero is a white card with a soft lift, and its tiles and why panel sit on #F7F8FA.
- **Data marks:** graphite #1F2937 for bars, captions and focus (14:1 on white). Strip dots are smaller: other trusts are 8px grey (#C3C8D0), this trust is 14px near black. The line is now 4px.
- **Why panel:** 24px padding on every side (24/16 on phones).
- **Nav:** sticky white 64px bar with a hairline. A graphite square mark sits next to "Referral Compass" with a "GP referral console" subtitle, and a two-part status pill on the right (NHS RTT Aug 2026 | CQC Oct 2026). The phone summary bar and the desktop input card now stick below the nav, and anchors scroll clear of it.

Checks: layout-check passes at 5 widths; axe 0 issues on 8 states; verify-ranking identical; summary prints on 1 A4 page; detector clean. Not yet deployed.

- **M4j follow-up:** the CQC "Good" tag is bright green (#0D6B3A text on #D9F5E4, #18B464 dot, 6.0:1) and stays filled when older than 2 years; Requires improvement and Not available are unchanged. The Data and limits modal has 24px side padding on desktop.
- **Follow-up:** the Good badge has no fill (green text and dot on a hairline outline). Option rows have 32px top padding.
