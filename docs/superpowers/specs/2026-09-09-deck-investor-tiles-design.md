# Deck — investor tiles + page-7 image (design)

*2026-09-09. Adds three tiles to the pitch deck (`index.html`) for an investor
audience and regenerates the page-7 node illustration. Deck-only: no calculator
files touched. Every market number traces to a verified source (research run
`wf_9b987136-431`: 10 finders → adversarial verification, 37/40 confirmed).*

## Goal

1. A **value-adding-services** tile at the end of the Prototype section — the
   "we can sell more than raw tokens" story (higher-margin managed/vertical
   services for SMBs), so investors see margin expansion beyond a token
   commodity.
2. Two **market** tiles before the roadmap — potential **market size** (demand +
   supply) and our potential **market share** (bottom-up + top-down), fully
   cited.
3. Regenerate the **page-7** node image so it matches the copy (a PAIR-linked
   *multi-device* node), not a single appliance.

## Structure — 16 → 19 tiles, 6 → 7 chapters

New tile 12 (Prototype), new tiles 16–17 (a new "The market" chapter); roadmap
and thank-you shift to 18–19.

| # | Tile | Surface | Chapter (start) |
|---|---|---|---|
| 8–11 | buyer demo · dispatch · energy · business model | — | Prototype (8) |
| **12** | **Value-adding services** | light | Prototype |
| 13–15 | homeowners · buyers · society+uni | — | Who wins (13) |
| **16** | **Market size** | light | **The market (16)** |
| **17** | **Market share** | dark | The market |
| 18–19 | roadmap · thank-you | — | The plan (18) |

`deck.js` `SECTIONS` gains `{ "The market", start: 16 }`; "Who wins"→13,
"The plan"→18. All `id="tile-N"` from 12 on are renumbered. No CSS/JS rule keys
off a renumbered id (the id-specific CSS rules are all for tiles ≤ 11).

## Tile 12 — Value-adding services

- Eyebrow "Beyond raw tokens"; H2 "The margin is in the solution, not the token."
- A three-rung value ladder (`.cards.three`, premium rung `.card-hi` amber):
  **Raw tokens** (commodity floor) → **Managed models** (private/fine-tuned, SLAs)
  → **Vertical solutions** (an assistant wired into an SMB's ERP, accounts &
  documents — sold as an outcome). Ascending `.value-track` axis + kicker.

## Tile 16 — Market size (demand | supply), all cited

Lead anchor: GenAI could add **up to A$115bn/yr** to the AU economy by 2030
(Tech Council of Australia/Microsoft, 2023 — economy-wide value-add, framed as an
opportunity anchor, *not* an addressable market, per the research cautions).

- **Demand · the buyers:** A$33.6bn AU public-cloud spend 2026 (+17.9%); A$946M
  AI-optimised-cloud 2026 (+128%); 2.7M AU businesses (97% small); +72–90% grid-
  power premium vs US (behind-the-meter solar skips it).
- **Supply · the homes:** ~4.3M homes/small-biz with rooftop solar (~1 in 3
  households); 500,000+ home batteries since Jul-2025 (target 1M+ by 2030); 3×
  battery growth in 2025 (221k vs 72.5k); ~5¢ vs ~35¢ export-vs-night — surplus
  solar is near-worthless, and that's a node's fuel.

## Tile 17 — Market share (bottom-up + top-down)

- **Bottom-up:** capture 1–5% of solar-battery homes over 5 yrs → 10,000–50,000
  nodes → × A$780/node = **A$8–39M/yr operator margin**; A$25–125M/yr to
  households; A$12–58M/yr saved by buyers. (Per-node economics from the revenue
  calculator: operator A$780/yr, homeowner A$2,505/yr net, buyer saves
  A$1,164/yr.)
- **Top-down:** even 50,000 nodes = **~4%** of the A$946M AI-cloud segment and
  **~0.1%** of the A$33.6bn AU public-cloud market — room to grow the fleet
  10–20× before touching 1% of cloud spend. The limit is node recruitment, not
  demand.

## Citation component (`styles.css`)

`sup.ref` (amber/gold superscript) + `.sources` (thin top-bordered, muted,
numbered footer; each publisher is a click-through link, new tab). Works on light
and dark; no new runtime deps. Market metrics use a compact `.metrics/.metric`
list; the dense tiles get a `@media (max-height:860px)` compaction so the source
footer never clips under mandatory scroll-snap (verified fits at 1440×900 and
1366×768).

## Sources (as printed on the tiles)

1. Tech Council of Australia / Microsoft (2023) — A$115bn GenAI opportunity.
2. Gartner (2026) — A$33.6bn AU public-cloud spend.
3. SecurityBrief AU citing Gartner (2026) — A$946M AI-optimised cloud.
4. ABS (2025) — 2.73M businesses, 97.3% small.
5. US EIA · GlobalPetrolPrices (2025) — AU vs US business power premium.
6. Clean Energy Council (2025) — ~4.3M solar homes/small-biz.
7. PM of Australia (2026) · DCCEEW — 500,000+ batteries; 1M+ by 2030 target.
8. SunWiz via Business News Australia (2025) — 221k batteries in 2025 (3×).
9. AEMO Quarterly Energy Dynamics Q4 2025 — negative-price / wasted-solar signal.

## Page-7 image

`tools/generate_images.py` `node-garage.png` prompt updated to two small matte
mini-computers side by side on a wall shelf, joined by one short cable (one sealed
node), tidy solar inverter + conduit on its own circuit — same warm cohesion, no
text. Regenerated with `--force node-garage` (gpt-image-2).

## Tests

- `test_operator_slides.py`: tile count 19; chapter landings "Who wins" 13/19,
  "The market" 16/19, "The plan" 18/19; dispatch/energy stay tile-9/tile-10.
- `test_deck_teaser_tile.py`: tiles 19, chapters 7.
- `test_investor_tiles.py` (new): value ladder (3 rungs incl. `.card-hi`), both
  market tiles present, each market figure cited (refs == source-footer entries,
  https links), bottom-up/top-down present, calculator attributed.

Green run = all pass except the pre-existing stale
`test_battery_terminology.py::test_network_explains_battery_mitigation`.
