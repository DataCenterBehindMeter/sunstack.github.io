# SunStack Node Revenue Calculator — Design Spec

- **Date:** 2026-09-08
- **Status:** Approved (brainstorm) → pending implementation plan
- **Scope:** A new standalone, interactive, due-diligence-grade revenue calculator for the SunStack pitch site, plus a plain-language teaser tile in the existing deck.
- **Repo:** `website/` (the `sunstack.github.io` pitch site — zero-build vanilla HTML/CSS/JS on GitHub Pages).

---

## 1. Purpose & audience

Let a viewer answer, quantitatively and credibly: **"How much can a household earn hosting SunStack compute, and does the marketplace work for everyone?"**

Primary audience is **investor / due-diligence** grade: the model must be transparent, every default number **cited to an authentic source**, uncertainty made explicit, and the tool must be willing to show a *losing* configuration. It computes **all three sides** of the marketplace — homeowner net earnings (primary), SunStack operator margin, and buyer savings vs. cloud.

### Goals
- An interactive **rig-builder** where a user composes a node from real "meta-compute" units and *sees* the rig update.
- A **deterministic economic engine** that recomputes homeowner / operator / buyer outcomes live.
- **Every default carries a beautiful, clickable citation** to its origin.
- **Pessimistic / Neutral / Optimistic** scenario presets over the cited ranges, defaulting to Neutral.
- **Sensitivity** views (tornado + break-even) so reviewers see which levers dominate.

### Non-goals
- Not a Monte-Carlo simulator (deterministic + ranges instead — more auditable).
- Not a live backend; no server, no persistence beyond URL/localStorage (optional, see §12).
- Not a change to the marketplace product itself; this is a marketing/analysis artifact only.

---

## 2. Placement & information architecture

- **New standalone page:** `website/calculator.html` with its own `calculator.js`, `calculator-data.js`, `calculator.css`. Reuses brand tokens from `assets/css/styles.css`.
- **Teaser tile** inserted into the deck's **"Who wins"** section (see §11), linking to the calculator.
- Reachable at `…/sunstack.github.io/calculator.html` (relative paths, `.nojekyll`-safe, no build step).

Page section order (top → bottom):
1. Header / intro (what this is · "every number is cited" · region = Australia · scenario preset toggle).
2. **Rig-builder** (device catalog + live PAIR-hub visualization + pooled summary).
3. **Workload** panel (model to host, batching, utilization, active hours).
4. **Energy** panel (source mix, tariffs, solar profile — AU state presets).
5. **Split & costs** panel (homeowner/SunStack share, hardware lifetime/financing, overhead, undercut %).
6. **Results** (headline cards + revenue-split stacked bar).
7. **Sensitivity** (tornado + break-even curve).
8. **Assumptions & Sources** (full cited table + download) and **References** list.

---

## 3. The economic model

All quantities computed **per node, per year** unless noted. Symbols map 1:1 to `calculator.js` variables.

### 3.1 Throughput (memory-gated, pooled, batched)
```
fits(model)      = pooled_UMA_GB ≥ model_min_GB(model, quant)         // gate
per_device_tokps = tokps(device_tier, model, quant)                    // from cited benchmarks
rig_tokps        = Σ_devices per_device_tokps        (only if fits(model); else model disabled)
agg_tokps        = rig_tokps × batch_multiplier                        // concurrency uplift
```
- `batch_multiplier` models aggregate throughput under concurrent requests (single-stream × uplift). Cited/bounded per device class (UMA boxes gain less than discrete GPUs).
- Pooling assumes tensor/pipeline split across units over QSFP/PAIR; flagged as an **optimistic-leaning modeling assumption** with a note (real multi-box scaling < linear). A `pool_efficiency` factor (≤1) discounts it.

### 3.2 Tokens served
```
active_seconds = active_hours_per_day × 3600 × 365
tokens_year    = agg_tokps × active_seconds × utilization
```
- `utilization` = fraction of active seconds actually serving *paid* work (the single biggest lever; cited from decentralized-compute references).

### 3.3 Revenue and the three parties
```
sunstack_price = cloud_ref_price × (1 − undercut)                      // $/token, per model
gross          = tokens_year × sunstack_price

// Homeowner
energy_cost        = load_kW × active_hours_per_day × 365 × utilization × eff_price_per_kWh
amortized_hardware = (Σ device_price + networking_cost) / lifetime_years      // = 0 on homeowner side if SunStack-financed
overhead           = insurance + maintenance + internet_share                 // small annual constant
homeowner_net      = gross × homeowner_share − energy_cost − amortized_hardware − overhead

// SunStack (operator)
platform_cost   = platform_cost_per_token × tokens_year                       // routing, billing, support
financing_cost  = SunStack-financed ? (Σ device_price+networking)/lifetime_years + financing_spread : 0
sunstack_margin = gross × (1 − homeowner_share) − platform_cost − financing_cost

// Buyer
buyer_pays   = tokens_year × sunstack_price
buyer_cost_cloud = tokens_year × cloud_ref_price
buyer_saves  = buyer_cost_cloud − buyer_pays            // = tokens_year × cloud_ref_price × undercut
```

### 3.4 Effective energy price (the moat)
```
eff_price_per_kWh = w_free×0 + w_solar×feed_in_tariff + w_grid×retail_rate + w_batt×battery_throughput_cost
   where  w_free + w_solar + w_grid + w_batt = 1        // energy source mix (sliders)
```
- **Free**: curtailed / negative-priced midday solar the home couldn't otherwise use → ~0¢.
- **Solar (opportunity cost)**: solar the home *could* have exported → cost = feed-in tariff foregone.
- **Grid**: drawn from grid at retail (night / cloudy).
- **Battery**: stored solar, costed at battery throughput (levelized $/kWh cycled).
This makes the "near-free midday energy" advantage **visible and adjustable**, not baked in.

### 3.5 Derived outputs
```
payback_years   = (SunStack-financed ? homeowner cash-flow basis : Σ hardware_cost) / max(homeowner_net, ε)
roi_pct         = homeowner_net / Σ hardware_cost × 100
breakeven_util  = utilization s.t. homeowner_net = 0     // solved analytically (net is linear in utilization)
```

---

## 4. Inputs (control catalog)

Each input has: type, unit, default (Neutral=typical), `low`/`high`, `polarity` (which bound is optimistic for the **homeowner**), source citation, and gating. Ranges/values come from `calculator-data.js` (§9), populated by the research workflow.

| Input | Control | Polarity (optimistic =) | Notes |
|---|---|---|---|
| Devices in rig | rig-builder add/remove/dup | more capable rig | drives price, power, UMA pool, tok/s |
| Devices in rig | rig-builder | **held (config)** | user's scenario |
| Model hosted | select (memory-gated) | **held (config)** | disables models the pool can't fit |
| Quantization | select (Q4 / Q8 / FP16) | **held (config)** | affects memory + tok/s |
| Batch multiplier | slider | higher | per device-class cap |
| Pool efficiency | slider | higher | multi-box scaling discount |
| Utilization | slider 0–100% | higher | dominant lever |
| Active hours/day | slider | higher (bounded by solar) | solar-window uncertainty |
| Energy source mix | 4 weighted sliders | **held (config)** | Σ=1 enforced; user's scenario |
| Feed-in tariff | number ¢/kWh | lower | AU state presets |
| Retail rate | number ¢/kWh | lower | AU state presets |
| Battery cost | number ¢/kWh cycled | lower | optional |
| Cloud ref price | number $/1M tok | higher | per model, cited |
| Undercut % | slider | **held (strategy)** | sets SunStack price; drives buyer savings |
| Homeowner share | slider 0–100% | **held (strategy)** | split vs operator |
| Hardware financed? | toggle | **held (strategy)** | moves amortization to operator |
| Hardware lifetime | slider yrs | longer | amortization |
| Overhead | number $/yr | lower | insurance+maint+internet |
| Platform cost/token | number | **held (strategy)** | operator margin only |

**"Held (config/strategy)" inputs are not swung by scenario presets** — they are the user's chosen scenario and business decisions. Presets only swing genuine **uncertainty** inputs (those with cited `low/high` ranges) by their `polarity`.

---

## 5. Rig-builder (visual centerpiece)

### 5.1 Device catalog
UMA "meta-compute" units plus non-UMA contrast builds. Every spec (price, memory, bandwidth, idle/load W, tok/s) cited in `calculator-data.js`.

- **DGX Spark 128GB** (GB10) — UMA
- **AMD Strix Halo 128GB** (Ryzen AI Max+ 395 mini-PC) — UMA
- **Mac Studio** tiers: M4 Max 36GB, M4 Max 128GB, M3 Ultra 96GB, M3 Ultra 256GB, M3 Ultra 512GB — UMA
- **Mac mini** tiers: M4 16GB, M4 24GB, M4 32GB, M4 Pro 48GB, M4 Pro 64GB — UMA
- **Discrete-GPU desktop** (contrast): RTX 4090 24GB build, RTX 5090 32GB build — **non-UMA**

### 5.2 Visualization — PAIR-centric hub, auto-reflow
- **PAIR router** at the center; each device is a labeled node placed symmetrically around it, wired by a **QSFP link**.
- **Layout scales gracefully** (explicit user requirement): radial arrangement for few nodes, transitioning to a balanced grid-around-hub for many, so it stays clean and attractive as devices are added — never sprawls into "spaghetti." Implemented as a deterministic layout function of node count (positions on ring(s); links routed to hub). Add/remove animates.
- **Colour encoding:** UMA devices in **amber** (`--amber`), non-UMA in **slate** (a neutral `--muted`/steel tone), with a small legend. Selected/hovered device highlights.
- **Live summary bar:** pooled UMA (GB) · total draw (kW) · rig cost ($) · **aggregate tok/s for the selected model** · "fits / doesn't fit" badge.
- Rendered as inline **SVG** (no lib); accessible labels per node.

### 5.3 Interaction
- Add from catalog (click/drag), remove, **duplicate** (e.g., "2× DGX Spark"), reorder irrelevant.
- Changing the rig re-gates the model list (greys out models exceeding pooled UMA) and recomputes everything.

---

## 6. Scenario presets

Top-of-page toggle: **Pessimistic · Neutral · Optimistic**, default **Neutral**.
- **Neutral** → every input = its `typical`.
- **Optimistic / Pessimistic** → each **uncertainty** input = the favorable / unfavorable bound per its `polarity` (so high utilization is optimistic, high energy cost is pessimistic).
- Presets swing **only uncertainty inputs** (those with cited `low/high` ranges). **Config/strategy inputs are held** (devices, model, quantization, energy mix, undercut %, homeowner share, financing, platform cost) — they are the user's chosen scenario and business decisions, not uncertainties. See §4.
- Switching a preset **animates sliders** to their new values (visible swing).
- Any manual edit flips the toggle to **Custom**.
- Reuses the low/typical/high ranges already in `calculator-data.js` — no extra data.

---

## 7. Outputs & visualizations

- **Headline cards:** homeowner **net $/yr** and **$/mo**, **payback**, **ROI %**; **SunStack margin/node/yr**; buyer **$ vs cloud** and **% saved**. Cards colour by sign (net can be negative → shown honestly).
- **Revenue-split stacked bar:** gross → homeowner take / SunStack margin / energy / hardware.
- **Tornado chart** (uPlot): ranks inputs by ± impact on homeowner net across their cited ranges — visually proves utilization / token-price / model dominate.
- **Break-even curve** (uPlot): homeowner net vs utilization (toggle: vs token price), with break-even point marked.

---

## 8. Data & citations ("beautiful references")

### 8.1 Data model
- `calculator-data.js` exports `DATA` (all inputs) and `SOURCES` (dedup map).
- Input row: `{ id, label, value, low, high, unit, source_id, confidence: 'high'|'medium'|'low', polarity: '+'|'-' }`.
- Source row: `SOURCES[source_id] = { name, publisher, url, date }`.

### 8.2 Three reference layers, all brand-styled
1. **Inline citation chip** beside each number — a `--r-pill` pill, muted fill (`--amber-soft` on light / `--dark-2` on dark), source name in JetBrains Mono micro-caps + hairline `↗`; amber on hover; focus-visible ring. Never a raw URL.
2. **Hover/focus popover** — small card: exact figure + low–typical–high range, `name · publisher · date`, **confidence dot** (green/amber/grey), **"View source ↗"** button. Keyboard-accessible, dismissible.
3. **References section** (page foot) — numbered academic-style list; superscript `[n]` markers map here; reused sources share a number. Plus **Assumptions & Sources** table (same dots) with **Download CSV/JSON**.
- **Confidence dots** everywhere double as an honesty signal (solid vs. indicative numbers).

---

## 9. Sourced dataset (from research)

Populated by the background research workflow (run `wf_cb79e172-16e`, task `wrzv0rfcd`): 11 domain finders → adversarial verification → synthesis, each datapoint carrying `value/low/high/unit/source_url/confidence`. Domains: DGX Spark, Strix Halo, Mac Studio tiers, Mac mini tiers, discrete-GPU, tok/s benchmarks (Apple / Spark+AMD / GPU), market token prices, AU energy, networking+utilization.

**Status: complete.** Output merged with corrections applied and saved durably alongside this spec:
- `research-dataset.json` — machine-readable (194 rows; feeds `calculator-data.js`).
- `research-dataset.md` — human-readable, every row linked to its source + verifier verdict.
- `research-finders.jsonl` / `research-verifiers.jsonl` — raw provenance.

194 datapoints; **123 high / 56 medium / 15 low** confidence; **31 corrected** by the adversarial pass, **2 excluded** as unverifiable (DGX Spark's unpublished FP16 TFLOPS; a derived RTX 5090 tok/s). Headline anchors in Appendix A.

---

## 10. Tech & file layout

Zero-build vanilla + **one tiny chart lib** (**uPlot**, ~40 KB, no deps, via CDN) for tornado/break-even; everything else hand-rolled SVG/DOM.

```
website/
  calculator.html                 new — page shell
  assets/js/calculator.js         new — engine, rig-builder, charts, citations
  assets/js/calculator-data.js    new — all cited defaults + SOURCES (single source of truth)
  assets/css/calculator.css       new — reuses tokens from styles.css
  index.html                      edit — add teaser tile
  assets/js/deck.js               edit — SECTIONS + counter bump
```
- Reuse tokens: `--amber`, `--amber-strong`, `--amber-soft`, `--ink`, `--body`, `--muted`, `--parchment`, `--dark-2`, `--teal` (secondary data hue), `--r-*`, `--shadow-soft`, `--ease`.
- No framework; state is a plain object + a single `render()` on change (recompute is microseconds).

---

## 11. Deck teaser tile

- One new tile in the **"Who wins"** section (after tile-11 homeowners), plain language matching deck tone: the three-way win (a sentence each) + a **conservative headline** ("a typical solar-hours node nets ~$X/yr on today's numbers") + a button → `calculator.html`.
- Update `deck.js`: extend `SECTIONS` start indices, tile counter (`/16 → /17`), keep chapter stepper correct.
- No funding ask (matches existing closing tone).

---

## 12. Edge cases & error handling

- **Empty rig** → results show "add a device"; no NaN.
- **Model doesn't fit pooled UMA** → model disabled with reason; if selected model becomes unfittable after removal, auto-fallback to largest fitting model + notice.
- **Zero utilization / zero active hours** → net = −(fixed costs); payback = ∞ shown as "never".
- **Negative net** → shown in red honestly, break-even utilization surfaced.
- **Energy mix not summing to 1** → auto-normalize with visual feedback.
- **uPlot CDN fails** → charts degrade to a static table (page still works offline-ish).
- **Optional:** encode state in URL hash / localStorage so a scenario is shareable (nice-to-have, not required).

---

## 13. Accessibility & responsive

- Keyboard: all controls tabbable; citation popovers open on focus; charts have text-table fallbacks.
- Reduced-motion: honor `prefers-reduced-motion` (no slider/rig animation).
- Responsive: rig-builder and panels stack on narrow screens; the deck's snap behavior is unaffected (calculator is a normal scrolling page, not snap tiles).
- Contrast: confidence dots have shape/label backup, not colour-only.

---

## 14. Testing

Match existing `website/tests/` Playwright-Python style (`test_page2_responsive.py`, etc.):
- `test_calculator_math.py` — engine invariants: monotonicities (net ↑ with utilization, buyer_saves ↑ with undercut), break-even solves to net≈0, presets set bounds by polarity, energy-mix normalization.
- `test_calculator_ui.py` — add/remove device updates pooled memory + tok/s; model gating; preset animates values; citation popover opens and links out; download produces valid CSV/JSON.
- `test_calculator_responsive.py` — layout integrity at mobile/desktop; rig stays legible at 1 and N devices.
- Lint/build parity with the rest of the site (no toolchain).

---

## 15. Open questions / to finalize during implementation
- Exact `batch_multiplier` and `pool_efficiency` caps per device class (from research; conservative defaults if thin).
- Final teaser-tile headline number (recompute from Neutral preset once data lands).
- Whether to ship URL-state sharing in v1 (default: yes if cheap).

---

## Appendix A — Sourced dataset

Full audited tables (every row source-linked) live in **`research-dataset.md`**; machine-readable in **`research-dataset.json`**. Headline anchors (access date 2026-09-08):

**Devices (price · UMA/mem · load power)**
- **NVIDIA DGX Spark** — $4,699 current (was $3,999 Oct-2025 launch; +$700 Feb-2026 on LPDDR5X supply) · 128 GB LPDDR5X unified · ~100–143 W load / 240 W PSU. *high*
- **AMD Strix Halo 128 GB** (Ryzen AI Max+ 395; Framework Desktop / GMKtec / HP Z2) — ~$1,800–2,600 street (DRAM spike; Framework launched $1,999) · 128 GB unified (~256 GB/s) · 45–120 W cTDP, 147–180 W wall. *medium*
- **Mac Studio** — M4 Max 36 GB ~$1,999 → M3 Ultra 256 GB ~$7,499 (some Ultra tiers now discontinued) · up to 512 GB unified · 819 GB/s (Ultra). *high*
- **Mac mini** — M4 from $599 (16 GB) → M4 Pro 64 GB · 120–273 GB/s · low idle draw. *high*
- **Non-UMA contrast** — RTX 5090 ~$5,000 (32 GB VRAM) / RTX 4090 (24 GB); VRAM caps model size vs UMA. *medium*

**Throughput (measured, quantized)**
- DGX Spark: Llama-3.1-8B Q4 ~38–44 tok/s single decode (~7,600 prefill); gpt-oss-120B MoE ~60 tok/s single, **116–153 tok/s at 8-concurrent**. *high*
- Strix Halo: 7–13B ~30–45 tok/s, 24B dense ~14 tok/s, 70B dense ~5–10 tok/s (bandwidth-bound). *medium*
- RTX 4090: Llama-8B ~2,770 tok/s **batched aggregate** (~29× single-stream) — discrete GPUs win at concurrency. *medium*

**Market token prices (USD / 1M, open models)**
- Llama-3.3-70B: input $0.10–1.04, output $0.32–1.04 (DeepInfra cheapest; Together flat $1.04). *high*
- DeepSeek-V3: input ~$0.25–0.32, output ~$0.89–1.25. *high*
- These commodity rates are the buyer's cloud reference; SunStack price = cloud_ref × (1 − undercut).

**Australia energy**
- Feed-in tariff ~1–10 ¢/kWh (VIC deregulated 1 Jul 2025, avg ~1.1 ¢; WA DEBS 2.25 ¢ off-peak / 10 ¢ peak) — the low FiT is why hosting-compute can beat exporting. *high*
- Retail 24–45 ¢/kWh (SE-QLD lowest ~19–24, SA highest). Battery ~$8k–12k installed / 10 kWh (pre-rebate). *high/medium*

**Utilization (bounds the dominant lever)**
- Realistic home-node duty cycle ≈ **20–60 %**: Akash GPU network ~50–57 %; production LLM-inference SM utilization ~20–40 %; Salad-style nodes earn only while idle/rented. *medium*
- Networking: QSFP28 DAC ~$40 (1 m); ConnectX 100 GbE NIC; NVIDIA PAIR is early/limited-availability. *medium*

### Honest economic read (informs framing, not a blocker)
Plugging neutral anchors into §3 (e.g. DGX Spark on gpt-oss-120B, ~130 tok/s aggregate, 8 solar-hours, 40 % utilization, ~$0.45/1M) yields only **a few hundred $/yr gross** per node — commodity open-model token prices are low. **Implication:** a single household's token-sales revenue alone is *modest income, not wealth* — consistent with the deck's "a new income, from a financed box" (not "get rich"). What makes the homeowner side positive is that the **energy input is near-free** (curtailed/low-FiT solar) and **SunStack finances the hardware**, so it's thin-but-positive margin rather than a capital risk. This is a feature for a due-diligence audience: the calculator should show this honestly and let higher-value levers (premium/sovereign pricing, higher utilization, grid-service revenue) be explored. **Flag for the teaser tile:** keep its headline number modest and Neutral-derived.

**Residual low-confidence / gaps (15 rows):** multi-box PAIR pooling efficiency (little public data → conservative `pool_efficiency` default), gpt-oss-120B exact market price spread, some batched-aggregate figures on UMA boxes, NVIDIA PAIR pricing.
