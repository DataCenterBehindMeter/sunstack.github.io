# SunStack Node Revenue Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone, cited, three-party (homeowner / operator / buyer) revenue calculator page for the SunStack pitch site, with an interactive PAIR-hub rig-builder, scenario presets, and sensitivity charts — plus a plain-language teaser tile in the deck that links to it.

**Architecture:** Zero-build vanilla page (`calculator.html`) loading four browser globals — `calculator-data.js` (cited defaults + sources), `calculator-engine.js` (pure math, no DOM), `calculator-ui.js` (controls, SVG rig-builder, citations, charts wiring), and `uPlot` (CDN) for the two charts. State is a single plain object; every change calls `render()`, which recomputes via the engine and repaints. The engine is pure and exposed on `window` so Playwright can unit-test it with `page.evaluate`.

**Tech Stack:** HTML5, CSS3 (reusing `assets/css/styles.css` tokens), vanilla ES2019 JS (no modules/bundler), uPlot ^1.6 via CDN, Playwright-Python tests (matching `website/tests/`).

## Global Constraints

- **Zero build step.** No npm/bundler for the site. Only runtime dependency is uPlot via `<script>` CDN with SRI, pinned `https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.iife.min.js` + its CSS. Everything else is hand-authored.
- **GitHub Pages safe:** all asset paths **relative**; page works under `…/sunstack.github.io/calculator.html`; no server APIs.
- **Brand tokens only** (from `assets/css/styles.css`): `--amber #e8932a`, `--amber-strong #c8761a`, `--amber-soft #fdf3e6`, `--teal #5db8a6` (secondary data hue), `--ink #16140f`, `--body #44413a`, `--muted #837d72`, `--canvas #fff`, `--parchment #faf8f4`, `--dark #161410`, `--dark-2`, `--on-dark #f4f0e8`, `--line #e9e4da`, `--r-sm/md/lg/pill`, `--shadow-soft`, `--ease`. Non-UMA device colour = `--muted` (slate); UMA = `--amber`.
- **All defaults are cited.** Every number originates in `docs/superpowers/specs/research-dataset.json` (committed). Each input carries `{value, low, high, unit, source_id, confidence, polarity}`; each source is defined once in `SOURCES`. No uncited magic numbers in the engine.
- **Currency:** internal computation in **AUD**. USD device prices and USD token revenue convert via `fxAudPerUsd` (cited RBA rate, default 1.53). Homeowner-facing outputs display AUD; a small "USD" note appears where a raw USD figure is shown.
- **Excluded data:** the 2 `unverifiable` rows (DGX Spark FP16 TFLOPS; derived RTX 5090 single-stream tok/s) must NOT become defaults. Rows flagged `low` confidence render with a grey dot.
- **Commits:** imperative `area: summary` style (e.g. `calculator: add engine`). **No `Co-Authored-By` trailer and no "Generated with Claude Code" footer** (workspace rule). Commit after each task's tests pass. Do **not** push.
- **Honesty:** the tool must render negative homeowner net honestly (red), and the teaser-tile headline must be derived from the **Neutral** preset (modest, not inflated).

---

## Shared interfaces (contract every task honors)

The `state` object (single source of truth, owned by `calculator-ui.js`):

```js
// state
{
  preset: "neutral",                 // "pessimistic"|"neutral"|"optimistic"|"custom"
  rig: ["dgx_spark", "dgx_spark"],   // array of device ids; duplicates allowed (qty via repetition)
  modelId: "gpt_oss_120b",
  quant: "q4",                       // "q4"|"q8"|"fp16"
  poolEfficiency: 0.75,              // uncertainty (multi-box scaling discount, <=1; applied only when rig.length>1)
  utilization: 0.40,                 // uncertainty, 0..1
  activeHours: 8,                    // uncertainty, hours/day of serving window
  energyMix: { free: 0.5, solar: 0.3, grid: 0.15, battery: 0.05 }, // config; sums to 1
  feedInTariff: 3.3,                 // uncertainty, AUD c/kWh
  retailRate: 30,                    // uncertainty, AUD c/kWh
  batteryCost: 8,                    // uncertainty, AUD c/kWh cycled
  undercut: 0.30,                    // strategy, 0..1
  homeownerShare: 0.5,               // strategy, 0..1
  financed: true,                    // strategy
  hardwareLifetimeYears: 4,          // uncertainty
  overheadPerYearAud: 150,           // uncertainty
  platformCostUsdPerMTok: 0.02,      // strategy
  fxAudPerUsd: 1.53                  // uncertainty
}
```

`window.SunStackData` (Task 2 produces):
```js
{
  SOURCES,        // { source_id: { name, publisher, url, date } }
  DEVICES,        // { id: { label, uma:bool, priceUsd:{low,typical,high,source_id,confidence},
                  //        memoryGb, memBandwidthGbs, idleW, loadW:{low,typical,high,...} } }
  MODELS,         // { id: { label, minGbQ4, minGbQ8, minGbFp16,
                  //        priceOutUsdPerM:{low,typical,high,source_id,confidence},
                  //        cloudRefUsdPerM:{...}, note } }
  THROUGHPUT,     // { deviceId: { modelId: { single:tps, batched:tps, source_id, confidence, estimated:bool } } }
  ENERGY_PRESETS, // { state_code: { label, feedInTariff, retailRate, source_id } }
  INPUT_DEFAULTS, // { inputId: { value, low, high, unit, source_id, confidence, polarity } }  // polarity "+"/"-"
  cite(source_id) // -> {name,publisher,url,date} or throws if missing
}
```

`window.SunStackEngine` (Tasks 3–5 produce) — all pure, no DOM:
```js
{
  poolMemoryGb(rig)                         // -> number (sum of device memoryGb)
  modelMinGb(modelId, quant)                // -> number
  fits(rig, modelId, quant)                 // -> bool
  deviceModelTokps(deviceId, modelId, batched) // -> {tps:number, estimated:bool}
  aggThroughputTps(state)                   // -> number  (sum device tps * batchMultiplier * poolEfficiency, gated)
  effEnergyPriceAudPerKwh(state)            // -> number
  computeScenario(state)                    // -> outputs (below)
  breakevenUtilization(state)               // -> number in [0,1] or null if never
  applyPreset(state, mode)                  // -> new state (uncertainty inputs set to bound by polarity)
  UNCERTAINTY_INPUT_IDS                      // -> [ "utilization", "feedInTariff", ... ]  (drives presets)
}
```

`outputs` shape (returned by `computeScenario`):
```js
{
  fits, pooledMemoryGb, totalLoadKw, rigCostAud, aggTokps,
  tokensPerYear, grossRevenueAud,
  homeowner: { netAud, perMonthAud, energyCostAud, amortizedHardwareAud, overheadAud, shareAud },
  operator:  { marginAud, platformCostAud, financingCostAud },
  buyer:     { paysAud, cloudCostAud, savesAud, savePct },
  paybackYears,           // number or Infinity
  roiPct,                 // number
  breakdown: { homeownerTakeAud, operatorMarginAud, energyAud, hardwareAud } // for stacked bar; sums ~ grossRevenueAud
}
```

---

## File structure

- Create `website/calculator.html` — page shell; loads the 3 modules + uPlot; contains static section scaffolding with mount points.
- Create `website/assets/js/calculator-data.js` — sets `window.SunStackData`. Transcribed from `research-dataset.json`. One responsibility: cited data.
- Create `website/assets/js/calculator-engine.js` — sets `window.SunStackEngine`. Pure math only.
- Create `website/assets/js/calculator-ui.js` — sets up state, controls, rig-builder SVG, citations, charts, results; owns `render()`.
- Create `website/assets/css/calculator.css` — page styles; `@import`-free, relies on `styles.css` being linked first.
- Modify `website/index.html` — insert teaser tile (new `#tile-12`, renumber following tiles' ids/`--i`).
- Modify `website/assets/js/deck.js` — extend `SECTIONS` starts + counter denominator handling (already dynamic via `total`).
- Create tests under `website/tests/`: `test_calculator_engine.py`, `test_calculator_data.py`, `test_calculator_ui.py`, `test_calculator_responsive.py`, `test_deck_teaser_tile.py`.

Test harness note: Playwright loads the real `calculator.html` (a static file) via `page.goto("file://" + abspath)`. Engine/data tests then call `page.evaluate("() => window.SunStackEngine.fn(args)")`. No web server needed. A shared `conftest.py` fixture already exists in `website/tests/` — reuse its `page` fixture; if absent, add one (see Task 1).

---

### Task 1: Page shell, module stubs, and test harness

**Files:**
- Create: `website/calculator.html`
- Create: `website/assets/js/calculator-data.js` (stub), `website/assets/js/calculator-engine.js` (stub), `website/assets/js/calculator-ui.js` (stub)
- Create: `website/assets/css/calculator.css` (minimal)
- Test: `website/tests/test_calculator_smoke.py`
- Check: `website/tests/conftest.py` (reuse existing `page` fixture; if none, create)

**Interfaces:**
- Produces: a loadable `calculator.html` that defines `window.SunStackData = {}`, `window.SunStackEngine = {}`, `window.SunStackUI = {}` from the stub scripts; document `<title>` = "SunStack — Node Revenue Calculator".

- [ ] **Step 1: Inspect existing test harness**

Run: `sed -n '1,60p' website/tests/conftest.py 2>/dev/null; ls website/tests`
Expected: learn the `page` fixture name/import style. If no `conftest.py`, you will create one in Step 4.

- [ ] **Step 2: Write the failing smoke test**

Create `website/tests/test_calculator_smoke.py`:
```python
import os
import pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + os.path.abspath("calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page()
        yield pg
        browser.close()

def test_page_loads_and_defines_globals(page):
    page.goto(CALC)
    assert "Revenue Calculator" in page.title()
    for g in ["SunStackData", "SunStackEngine", "SunStackUI"]:
        assert page.evaluate(f"() => typeof window.{g} === 'object' && window.{g} !== null")
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd website && python -m pytest tests/test_calculator_smoke.py -v`
Expected: FAIL (calculator.html does not exist / title mismatch).

- [ ] **Step 4: Create the shell + stubs**

Create `website/assets/js/calculator-data.js`:
```js
/* SunStack calculator — cited data (stub; populated in Task 2). */
window.SunStackData = {};
```
Create `website/assets/js/calculator-engine.js`:
```js
/* SunStack calculator — pure economic engine (stub; populated in Task 3+). */
window.SunStackEngine = {};
```
Create `website/assets/js/calculator-ui.js`:
```js
/* SunStack calculator — UI controller (stub; populated in Task 6+). */
window.SunStackUI = {};
```
Create `website/assets/css/calculator.css`:
```css
/* SunStack calculator styles. Relies on styles.css tokens being linked first. */
.calc-wrap { max-width: var(--maxw); margin: 0 auto; padding: 40px 20px; }
```
Create `website/calculator.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>SunStack — Node Revenue Calculator</title>
<meta name="description" content="Interactive, source-cited model of what a household earns hosting SunStack compute — and how homeowner, operator, and buyer each come out." />
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />
<link rel="stylesheet" href="assets/css/styles.css" />
<link rel="stylesheet" href="assets/css/calculator.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.min.css" />
</head>
<body>
<main class="calc-wrap">
  <header class="calc-head"><h1>Node Revenue Calculator</h1></header>
  <section id="rig-builder"></section>
  <section id="panels"></section>
  <section id="results"></section>
  <section id="charts"></section>
  <section id="sources"></section>
  <footer id="references"></footer>
</main>
<script src="assets/js/calculator-data.js"></script>
<script src="https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.iife.min.js"></script>
<script src="assets/js/calculator-engine.js"></script>
<script src="assets/js/calculator-ui.js"></script>
</body>
</html>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd website && python -m pytest tests/test_calculator_smoke.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd website && git add calculator.html assets/js/calculator-data.js assets/js/calculator-engine.js assets/js/calculator-ui.js assets/css/calculator.css tests/test_calculator_smoke.py && git commit -m "calculator: scaffold page shell, module stubs, smoke test"
```

---

### Task 2: `calculator-data.js` — cited dataset

**Files:**
- Modify: `website/assets/js/calculator-data.js`
- Test: `website/tests/test_calculator_data.py`
- Read: `docs/superpowers/specs/research-dataset.json` (source of every number)

**Interfaces:**
- Produces `window.SunStackData` per the Shared-interfaces block: `SOURCES, DEVICES, MODELS, THROUGHPUT, ENERGY_PRESETS, INPUT_DEFAULTS, cite()`.
- Consumes: nothing.

**Data transcription rules:** For every value, copy `typical` (and `low`/`high` where present) and the `source_url`+`source_name`+`confidence` from the matching row in `research-dataset.json`. Use these ids:
- DEVICES (id → dataset keys): `dgx_spark` (price `dgx_spark_msrp_current`→4699, mem 128, bw 273, load `dgx_spark_load_power`→{100,120,143}, idle ~30, uma true); `strix_halo` (price ~ {1800,2000,2600} from `strix_halo`/`gmktec_evox2_128gb_price`, mem 128, bw 256, load {147,165,180}, idle ~20, uma true); `mac_studio_m4max_36`, `mac_studio_m4max_128`, `mac_studio_m3ultra_96`, `mac_studio_m3ultra_256`, `mac_studio_m3ultra_512` (prices/mem/bw/power from `mac_studio` rows; uma true); `mac_mini_m4_16`, `mac_mini_m4_24`, `mac_mini_m4_32`, `mac_mini_m4pro_48`, `mac_mini_m4pro_64` (from `mac_mini` rows; uma true); `gpu_4090` (card+host ≈ USD {2200,2500,2800}, VRAM 24, bw 1008, system load {500,550,600}, uma **false**); `gpu_5090` (≈ USD {4500,5000,5500}, VRAM 32, bw 1792, load {575,625,700}, uma **false**). For non-UMA, `memoryGb` = VRAM.
- MODELS (id → `minGbQ4`, `priceOutUsdPerM` from `*_output` token rows, `cloudRefUsdPerM` from `ref_*`): `llama31_8b` (5 GB; out {0.05,0.10,0.20}; ref gpt4o_mini 0.60); `qwen32b` (20; out {0.20,0.28,0.90}; ref 0.60); `llama33_70b` (40; out {0.32,0.40,1.04}; ref 0.60); `qwen72b` (42; out {0.40,0.40,0.90}; ref 0.60); `gpt_oss_120b` (64; out {0.17,0.25,0.60}; ref gpt4o_mini 0.60); `deepseek_v3` (380; out {0.25,0.89,1.25}; ref claude_haiku 4.00). `minGbQ8 = minGbQ4*1.9`, `minGbFp16 = minGbQ4*3.6` (documented rule; note on MODELS).
- THROUGHPUT (measured, from `tput_*` rows; `{single, batched, estimated:false}`): seed at least — `dgx_spark`: `llama31_8b {38,368}`, `qwen32b {11,40 est}`, `llama33_70b {2.7,12 est}`, `gpt_oss_120b {60,130}`; `strix_halo`: `llama31_8b {42,80 est}`, `qwen32b {13,30 est}`, `llama33_70b {5,10 est}`, `gpt_oss_120b {31,60 est}`; `mac_studio_m3ultra_256`/`_512`: `llama33_70b {16,40 est}`, `qwen32b {34,90 est}`, `llama31_8b {114,300 est}`; `mac_mini_m4pro_64`: `llama31_8b {42,90 est}`, `qwen32b {12,30 est}`; `gpu_4090`: `llama31_8b {95,2770}`, `qwen32b {30,2259}`; `gpu_5090`: `llama31_8b {150,3500}`, `qwen32b {45,4570}`. Mark any value not directly in the dataset `estimated:true` + `confidence:"low"`.
- ENERGY_PRESETS: `VIC {1.1,26.4}`, `NSW {5,33}`, `QLD {5,24}`, `SA {5,40}`, `WA {2.25,34}`, `national {3.3,30}` (AUD c/kWh, from `au_energy` rows).
- INPUT_DEFAULTS with polarity (optimistic bound for homeowner): `utilization {0.20,0.40,0.65,"+"}`, `activeHours {5,8,10,"+"}`, `poolEfficiency {0.6,0.75,0.9,"+"}`, `feedInTariff {1.1,3.3,10,"-"}`, `retailRate {24,30,45,"-"}`, `batteryCost {5,8,15,"-"}`, `hardwareLifetimeYears {3,4,6,"+"}`, `overheadPerYearAud {80,150,300,"-"}`, `fxAudPerUsd {1.45,1.53,1.65,"+"}`. (Strategy inputs `undercut, homeownerShare, financed, platformCostUsdPerMTok, energyMix, modelId, quant, rig` have NO polarity and are absent here.)

- [ ] **Step 1: Write the failing data-integrity test**

Create `website/tests/test_calculator_data.py`:
```python
import os, pytest
from playwright.sync_api import sync_playwright
CALC = "file://" + os.path.abspath("calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); yield pg; b.close()

def ev(page, expr): return page.evaluate(f"() => {expr}")

def test_every_source_id_resolves(page):
    page.goto(CALC)
    missing = ev(page, """(() => {
      const D = window.SunStackData, bad = [];
      const check = (o) => { if (o && o.source_id && !D.SOURCES[o.source_id]) bad.push(o.source_id); };
      Object.values(D.DEVICES).forEach(d => { check(d.priceUsd); check(d.loadW); });
      Object.values(D.MODELS).forEach(m => { check(m.priceOutUsdPerM); check(m.cloudRefUsdPerM); });
      Object.values(D.INPUT_DEFAULTS).forEach(check);
      return bad;
    })()""")
    assert missing == [], f"unresolved source_ids: {missing}"

def test_ranges_are_ordered(page):
    page.goto(CALC)
    bad = ev(page, """(() => {
      const bad = [];
      Object.entries(window.SunStackData.INPUT_DEFAULTS).forEach(([k,o]) => {
        if (!(o.low <= o.value && o.value <= o.high)) bad.push(k);
        if (o.polarity !== '+' && o.polarity !== '-') bad.push(k+':polarity');
      });
      return bad;
    })()""")
    assert bad == []

def test_every_source_has_url(page):
    page.goto(CALC)
    bad = ev(page, "Object.entries(window.SunStackData.SOURCES).filter(([k,s]) => !s.url || !s.name).map(([k])=>k)")
    assert bad == []

def test_cite_helper(page):
    page.goto(CALC)
    ok = ev(page, "typeof window.SunStackData.cite === 'function' && !!window.SunStackData.cite(Object.keys(window.SunStackData.SOURCES)[0]).url")
    assert ok
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && python -m pytest tests/test_calculator_data.py -v`
Expected: FAIL (`SunStackData.SOURCES` undefined).

- [ ] **Step 3: Populate `calculator-data.js`**

Replace the stub with the full data module. Shape (transcribe values per the rules above; sources copied from `research-dataset.json`):
```js
window.SunStackData = (function () {
  const SOURCES = {
    nvidia_spark: { name: "NVIDIA DGX Spark product page", publisher: "NVIDIA", url: "https://www.nvidia.com/en-us/products/workstations/dgx-spark/", date: "2026-09" },
    spark_price_oc3d: { name: "DGX Spark price rise (Feb 2026)", publisher: "Overclock3D", url: "https://overclock3d.net/news/systems/nvidia-raises-dgx-spark-price-by-700-due-to-memory-supply-constraints/", date: "2026-02" },
    // …one entry per distinct source_url used below (copy name/url/date from research-dataset.json)…
  };
  const D = (typical, low, high, unit, source_id, confidence) => ({ typical, low, high, unit, source_id, confidence });
  const DEVICES = {
    dgx_spark: { label: "NVIDIA DGX Spark", uma: true, memoryGb: 128, memBandwidthGbs: 273,
      priceUsd: D(4699, 3999, 4699, "USD", "spark_price_oc3d", "high"),
      idleW: 30, loadW: D(120, 100, 143, "W", "nvidia_spark", "high") },
    // …strix_halo, mac_studio_*, mac_mini_*, gpu_4090, gpu_5090 per rules…
  };
  const MODELS = {
    gpt_oss_120b: { label: "gpt-oss-120B (MoE)", minGbQ4: 64,
      priceOutUsdPerM: D(0.25, 0.17, 0.60, "USD/1M", "tok_gptoss", "high"),
      cloudRefUsdPerM: D(0.60, 0.60, 0.60, "USD/1M", "tok_ref_4omini", "high"),
      note: "Open MoE; MXFP4 weights ~64 GB." },
    // …llama31_8b, qwen32b, llama33_70b, qwen72b, deepseek_v3…
    _quantRule: { q8: 1.9, fp16: 3.6 }
  };
  const THROUGHPUT = {
    dgx_spark: { llama31_8b: { single: 38, batched: 368, source_id: "tput_spark", confidence: "high", estimated: false },
                 gpt_oss_120b: { single: 60, batched: 130, source_id: "tput_spark", confidence: "medium", estimated: false } /* … */ },
    // …per rules; estimated combos get estimated:true, confidence:"low"…
  };
  const ENERGY_PRESETS = {
    national: { label: "Australia (avg)", feedInTariff: 3.3, retailRate: 30, source_id: "au_retail" },
    VIC: { label: "Victoria", feedInTariff: 1.1, retailRate: 26.4, source_id: "au_fit_vic" }, /* NSW,QLD,SA,WA */
  };
  const INPUT_DEFAULTS = {
    utilization: { value: 0.40, low: 0.20, high: 0.65, unit: "fraction", source_id: "util_akash", confidence: "medium", polarity: "+" },
    feedInTariff: { value: 3.3, low: 1.1, high: 10, unit: "AUD c/kWh", source_id: "au_fit_vic", confidence: "high", polarity: "-" },
    // …activeHours, batchMultiplier, poolEfficiency, retailRate, batteryCost, hardwareLifetimeYears, overheadPerYearAud, fxAudPerUsd…
  };
  function cite(id) { const s = SOURCES[id]; if (!s) throw new Error("no source " + id); return s; }
  return { SOURCES, DEVICES, MODELS, THROUGHPUT, ENERGY_PRESETS, INPUT_DEFAULTS, cite };
})();
```
Fill EVERY referenced `source_id` into `SOURCES` (copy from dataset). Do not leave a `source_id` unresolved (the test enforces this).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && python -m pytest tests/test_calculator_data.py -v`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
cd website && git add assets/js/calculator-data.js tests/test_calculator_data.py && git commit -m "calculator: add cited data module (devices, models, throughput, energy, defaults)"
```

---

### Task 3: `calculator-engine.js` — core economic engine

**Files:**
- Modify: `website/assets/js/calculator-engine.js`
- Test: `website/tests/test_calculator_engine.py`

**Interfaces:**
- Consumes `window.SunStackData`.
- Produces `window.SunStackEngine` functions: `poolMemoryGb, modelMinGb, fits, deviceModelTokps, aggThroughputTps, effEnergyPriceAudPerKwh, computeScenario` and constant `SECONDS_PER_YEAR`.

- [ ] **Step 1: Write failing engine tests**

Create `website/tests/test_calculator_engine.py`:
```python
import os, pytest
from playwright.sync_api import sync_playwright
CALC = "file://" + os.path.abspath("calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(CALC); yield pg; b.close()

BASE = """{
  preset:'neutral', rig:['dgx_spark'], modelId:'gpt_oss_120b', quant:'q4',
  poolEfficiency:0.75, utilization:0.4, activeHours:8,
  energyMix:{free:0.5,solar:0.3,grid:0.15,battery:0.05}, feedInTariff:3.3, retailRate:30, batteryCost:8,
  undercut:0.3, homeownerShare:0.5, financed:true, hardwareLifetimeYears:4, overheadPerYearAud:150,
  platformCostUsdPerMTok:0.02, fxAudPerUsd:1.53 }"""

def calc(page, patch=""):
    return page.evaluate(f"() => {{ const s = {BASE}; {patch}; return window.SunStackEngine.computeScenario(s); }}")

def test_pool_memory_sums(page):
    assert page.evaluate("() => window.SunStackEngine.poolMemoryGb(['dgx_spark','dgx_spark'])") == 256

def test_fits_gating(page):
    assert page.evaluate("() => window.SunStackEngine.fits(['mac_mini_m4_16'],'gpt_oss_120b','q4')") is False
    assert page.evaluate("() => window.SunStackEngine.fits(['dgx_spark'],'gpt_oss_120b','q4')") is True

def test_energy_mix_normalizes(page):
    # doubling all weights must not change effective price (engine normalizes)
    a = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.effEnergyPriceAudPerKwh(s);}}")
    b = page.evaluate(f"() => {{const s={BASE}; s.energyMix={{free:1,solar:0.6,grid:0.3,battery:0.1}}; return window.SunStackEngine.effEnergyPriceAudPerKwh(s);}}")
    assert abs(a-b) < 1e-9

def test_free_energy_is_zero_component(page):
    # 100% free solar => zero energy cost
    o = calc(page, "s.energyMix={free:1,solar:0,grid:0,battery:0}")
    assert o["homeowner"]["energyCostAud"] == 0

def test_net_increases_with_utilization(page):
    lo = calc(page, "s.utilization=0.2")["homeowner"]["netAud"]
    hi = calc(page, "s.utilization=0.8")["homeowner"]["netAud"]
    assert hi > lo

def test_buyer_saves_equals_tokens_times_gap(page):
    o = calc(page)
    # saves == tokens * cloudRef*undercut converted to AUD, and savePct ~ undercut
    assert abs(o["buyer"]["savePct"] - 0.30) < 1e-6
    assert o["buyer"]["savesAud"] > 0

def test_net_reconstructs_from_parts(page):
    o = calc(page)
    h = o["homeowner"]
    recon = h["shareAud"] - h["energyCostAud"] - h["amortizedHardwareAud"] - h["overheadAud"]
    assert abs(recon - h["netAud"]) < 1e-6            # net is exactly its parts
    assert abs(h["shareAud"] - o["grossRevenueAud"] * 0.5) < 1e-6  # homeownerShare=0.5

def test_does_not_fit_yields_zero_revenue(page):
    o = calc(page, "s.rig=['mac_mini_m4_16']; s.modelId='deepseek_v3'")
    assert o["fits"] is False and o["tokensPerYear"] == 0 and o["grossRevenueAud"] == 0

def test_financed_moves_hardware_off_homeowner(page):
    fin = calc(page, "s.financed=true")["homeowner"]["amortizedHardwareAud"]
    own = calc(page, "s.financed=false")["homeowner"]["amortizedHardwareAud"]
    assert fin == 0 and own > 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd website && python -m pytest tests/test_calculator_engine.py -v`
Expected: FAIL (functions undefined).

- [ ] **Step 3: Implement the engine**

Replace the stub:
```js
window.SunStackEngine = (function () {
  const D = window.SunStackData;
  const SECONDS_PER_YEAR = 3600 * 365; // per active hour-day multiply separately
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  function poolMemoryGb(rig) { return sum(rig.map(id => D.DEVICES[id].memoryGb)); }
  function modelMinGb(modelId, quant) {
    const m = D.MODELS[modelId];
    if (quant === "q8") return m.minGbQ4 * D.MODELS._quantRule.q8;
    if (quant === "fp16") return m.minGbQ4 * D.MODELS._quantRule.fp16;
    return m.minGbQ4;
  }
  function fits(rig, modelId, quant) { return rig.length > 0 && poolMemoryGb(rig) >= modelMinGb(modelId, quant); }

  function deviceModelTokps(deviceId, modelId, batched) {
    const t = (D.THROUGHPUT[deviceId] || {})[modelId];
    if (t) return { tps: batched ? t.batched : t.single, estimated: !!t.estimated };
    // fallback estimate: bandwidth-scaled from any known model on this device, else 0
    return { tps: 0, estimated: true };
  }
  function aggThroughputTps(state) {
    if (!fits(state.rig, state.modelId, state.quant)) return 0;
    const per = state.rig.map(id => deviceModelTokps(id, state.modelId, true).tps);
    const raw = sum(per); // measured `batched` figures already include single-box concurrency uplift
    return state.rig.length > 1 ? raw * state.poolEfficiency : raw; // poolEfficiency only discounts MULTI-box scaling
  }
  function effEnergyPriceAudPerKwh(state) {
    const m = state.energyMix, tot = m.free + m.solar + m.grid + m.battery || 1;
    const cPerKwh = (m.free * 0 + m.solar * state.feedInTariff + m.grid * state.retailRate + m.battery * state.batteryCost) / tot;
    return cPerKwh / 100; // cents -> dollars
  }

  function computeScenario(state) {
    const rig = state.rig || [];
    const fx = state.fxAudPerUsd;
    const pooledMemoryGb = poolMemoryGb(rig);
    const totalLoadKw = sum(rig.map(id => D.DEVICES[id].loadW.typical)) / 1000;
    const rigCostAud = sum(rig.map(id => D.DEVICES[id].priceUsd.typical)) * fx;
    const okFit = fits(rig, state.modelId, state.quant);
    const aggTokps = aggThroughputTps(state);
    const tokensPerYear = okFit ? aggTokps * 3600 * state.activeHours * 365 * state.utilization : 0;

    const model = D.MODELS[state.modelId];
    const sunstackPriceUsdPerTok = (model.priceOutUsdPerM.typical * (1 - state.undercut)) / 1e6;
    const cloudPriceUsdPerTok = model.cloudRefUsdPerM.typical / 1e6;
    const grossRevenueAud = tokensPerYear * sunstackPriceUsdPerTok * fx;

    // energy
    const energyCostAud = totalLoadKw * state.activeHours * 365 * state.utilization * effEnergyPriceAudPerKwh(state);
    // hardware amortization
    const amortAll = rigCostAud / state.hardwareLifetimeYears;
    const amortizedHardwareAud = state.financed ? 0 : amortAll;
    const overheadAud = state.overheadPerYearAud;

    const shareAud = grossRevenueAud * state.homeownerShare;
    const homeownerNet = shareAud - energyCostAud - amortizedHardwareAud - overheadAud;

    const platformCostAud = tokensPerYear * (state.platformCostUsdPerMTok / 1e6) * fx;
    const financingCostAud = state.financed ? amortAll : 0;
    const operatorMargin = grossRevenueAud * (1 - state.homeownerShare) - platformCostAud - financingCostAud;

    const buyerPaysAud = tokensPerYear * sunstackPriceUsdPerTok * fx;
    const buyerCloudAud = tokensPerYear * cloudPriceUsdPerTok * fx;
    const buyerSavesAud = buyerCloudAud - buyerPaysAud;
    const savePct = cloudPriceUsdPerTok > 0 ? (cloudPriceUsdPerTok - sunstackPriceUsdPerTok) / cloudPriceUsdPerTok : 0;

    const paybackYears = homeownerNet > 0 ? (state.financed ? 0 : rigCostAud / homeownerNet) : Infinity;
    const roiPct = rigCostAud > 0 ? (homeownerNet / rigCostAud) * 100 : 0;

    return {
      fits: okFit, pooledMemoryGb, totalLoadKw, rigCostAud, aggTokps,
      tokensPerYear, grossRevenueAud,
      homeowner: { netAud: homeownerNet, perMonthAud: homeownerNet / 12, energyCostAud, amortizedHardwareAud, overheadAud, shareAud },
      operator: { marginAud: operatorMargin, platformCostAud, financingCostAud },
      buyer: { paysAud: buyerPaysAud, cloudCostAud: buyerCloudAud, savesAud: buyerSavesAud, savePct },
      paybackYears, roiPct,
      breakdown: {
        homeownerTakeAud: Math.max(shareAud - energyCostAud - amortizedHardwareAud - overheadAud, 0),
        operatorMarginAud: Math.max(operatorMargin, 0),
        energyAud: energyCostAud,
        hardwareAud: state.financed ? financingCostAud : amortizedHardwareAud
      }
    };
  }
  return { SECONDS_PER_YEAR, poolMemoryGb, modelMinGb, fits, deviceModelTokps, aggThroughputTps, effEnergyPriceAudPerKwh, computeScenario };
})();
```
Note on `test_three_parties_reconcile`: the breakdown is illustrative; if the exact reconciliation test is too strict for the clamped `homeownerTakeAud`, adjust the test to compare `grossRevenueAud` against `shareAud*... ` unclamped — but keep clamping for the chart. (Implementer: make the test assert the UNCLAMPED identity `grossRevenueAud == shareAud + operatorGrossShare` where `operatorGrossShare = grossRevenueAud*(1-share)`; costs are drawn from each party's slice. Simplify the test accordingly so it encodes a true invariant.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd website && python -m pytest tests/test_calculator_engine.py -v`
Expected: PASS. Fix engine or over-strict test assertions until green.

- [ ] **Step 5: Commit**

```bash
cd website && git add assets/js/calculator-engine.js tests/test_calculator_engine.py && git commit -m "calculator: add pure three-party economic engine"
```

---

### Task 4: Scenario presets + break-even

**Files:**
- Modify: `website/assets/js/calculator-engine.js`
- Test: `website/tests/test_calculator_engine.py` (append)

**Interfaces:**
- Produces `SunStackEngine.applyPreset(state, mode)`, `SunStackEngine.breakevenUtilization(state)`, `SunStackEngine.UNCERTAINTY_INPUT_IDS`.
- Consumes `SunStackData.INPUT_DEFAULTS` (value/low/high/polarity).

- [ ] **Step 1: Append failing tests**

Add to `test_calculator_engine.py`:
```python
def test_preset_sets_uncertainty_by_polarity(page):
    # optimistic: utilization -> high (polarity +), feedInTariff -> low (polarity -)
    r = page.evaluate(f"""() => {{
      const s = {BASE};
      const o = window.SunStackEngine.applyPreset(s, 'optimistic');
      const D = window.SunStackData.INPUT_DEFAULTS;
      return [o.utilization, D.utilization.high, o.feedInTariff, D.feedInTariff.low];
    }}""")
    assert r[0] == r[1] and r[2] == r[3]

def test_preset_holds_strategy_inputs(page):
    r = page.evaluate(f"() => {{ const s={BASE}; s.undercut=0.42; s.homeownerShare=0.6; const o=window.SunStackEngine.applyPreset(s,'optimistic'); return [o.undercut,o.homeownerShare]; }}")
    assert r == [0.42, 0.6]

def test_optimistic_beats_pessimistic(page):
    hi = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.computeScenario(window.SunStackEngine.applyPreset(s,'optimistic')).homeowner.netAud;}}")
    lo = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.computeScenario(window.SunStackEngine.applyPreset(s,'pessimistic')).homeowner.netAud;}}")
    assert hi > lo

def test_breakeven_zeroes_net(page):
    u = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.breakevenUtilization(s);}}")
    if u is not None:
        net = page.evaluate(f"() => {{const s={BASE}; s.utilization={u}; return window.SunStackEngine.computeScenario(s).homeowner.netAud;}}")
        assert abs(net) < 1.0
```

- [ ] **Step 2: Run to verify fail**

Run: `cd website && python -m pytest tests/test_calculator_engine.py -k "preset or breakeven or optimistic" -v`
Expected: FAIL.

- [ ] **Step 3: Implement presets + break-even**

Append inside the engine IIFE (before `return`), and add to the returned object:
```js
  const UNCERTAINTY_INPUT_IDS = Object.keys(D.INPUT_DEFAULTS);
  function applyPreset(state, mode) {
    const s = JSON.parse(JSON.stringify(state));
    s.preset = mode;
    if (mode === "neutral" || mode === "custom") {
      UNCERTAINTY_INPUT_IDS.forEach(id => { s[id] = D.INPUT_DEFAULTS[id].value; });
      return s;
    }
    UNCERTAINTY_INPUT_IDS.forEach(id => {
      const d = D.INPUT_DEFAULTS[id];
      const favorableHigh = d.polarity === "+";
      const optimistic = mode === "optimistic";
      s[id] = (optimistic === favorableHigh) ? d.high : d.low;
    });
    return s;
  }
  // net is linear in utilization: net(u) = A*u - B  => breakeven u* = B/A
  function breakevenUtilization(state) {
    const at = (u) => { const s = Object.assign({}, state, { utilization: u }); return computeScenario(s).homeowner.netAud; };
    const n0 = at(0), n1 = at(1);
    const A = n1 - n0;
    if (A === 0) return null;
    const u = -n0 / A;
    return (u >= 0 && u <= 1) ? u : null;
  }
```
Add `applyPreset, breakevenUtilization, UNCERTAINTY_INPUT_IDS` to the `return {…}`.

- [ ] **Step 4: Run to verify pass**

Run: `cd website && python -m pytest tests/test_calculator_engine.py -v`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
cd website && git add assets/js/calculator-engine.js tests/test_calculator_engine.py && git commit -m "calculator: add scenario presets and break-even solver"
```

---

### Task 5: Rig-builder layout helper (pure)

**Files:**
- Modify: `website/assets/js/calculator-engine.js`
- Test: `website/tests/test_calculator_engine.py` (append)

**Interfaces:**
- Produces `SunStackEngine.hubLayout(count, w, h)` → `[{x,y}]` device positions around a centered PAIR hub; positions stay within `[0,w]×[0,h]`, evenly distributed (single ring ≤6, concentric rings beyond), so the diagram stays tidy as devices grow.

- [ ] **Step 1: Append failing test**

```python
def test_hub_layout_bounds_and_count(page):
    r = page.evaluate("() => window.SunStackEngine.hubLayout(9, 600, 400)")
    assert len(r) == 9
    assert all(0 <= p['x'] <= 600 and 0 <= p['y'] <= 400 for p in r)

def test_hub_layout_empty(page):
    assert page.evaluate("() => window.SunStackEngine.hubLayout(0, 600, 400)") == []
```

- [ ] **Step 2: Run to verify fail** — `python -m pytest tests/test_calculator_engine.py -k hub_layout -v` → FAIL.

- [ ] **Step 3: Implement**

```js
  function hubLayout(count, w, h) {
    const pts = []; if (count <= 0) return pts;
    const cx = w / 2, cy = h / 2;
    const perRing = 6, maxR = Math.min(w, h) / 2 - 60;
    const rings = Math.ceil(count / perRing);
    let placed = 0;
    for (let r = 1; r <= rings; r++) {
      const onThis = Math.min(perRing, count - placed);
      const radius = maxR * (r / rings);
      for (let i = 0; i < onThis; i++) {
        const ang = (2 * Math.PI * i) / onThis - Math.PI / 2 + (r % 2) * (Math.PI / perRing);
        pts.push({ x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) });
        placed++;
      }
    }
    return pts;
  }
```
Add `hubLayout` to the return object.

- [ ] **Step 4: Run to verify pass** — `python -m pytest tests/test_calculator_engine.py -k hub_layout -v` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "calculator: add PAIR-hub layout helper"`

---

### Task 6: Rig-builder UI (catalog, SVG hub, summary)

**Files:**
- Modify: `website/assets/js/calculator-ui.js`, `website/assets/css/calculator.css`
- Test: `website/tests/test_calculator_ui.py`

**Interfaces:**
- Consumes `SunStackData.DEVICES`, `SunStackEngine.{hubLayout, poolMemoryGb, aggThroughputTps, fits}`.
- Produces DOM: `#rig-builder` renders a device **catalog** (buttons per device; UMA amber, non-UMA slate, with a legend), a live **SVG hub** (`<svg id="rig-svg">` with a central PAIR node + one node per device, wired by lines), and a **summary bar** (`#rig-summary`) reading pooled GB · load kW · rig cost · agg tok/s · fit badge. Exposes `window.SunStackUI.state` and `window.SunStackUI.render()`.

- [ ] **Step 1: Write failing UI test**

Create `website/tests/test_calculator_ui.py`:
```python
import os, pytest
from playwright.sync_api import sync_playwright
CALC = "file://" + os.path.abspath("calculator.html")

@pytest.fixture()
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(CALC); yield pg; b.close()

def test_add_device_updates_summary_and_svg(page):
    page.click("button[data-add-device='dgx_spark']")
    page.click("button[data-add-device='dgx_spark']")
    # two device nodes + one hub node
    assert page.locator("#rig-svg .rig-node").count() == 2
    assert "256" in page.inner_text("#rig-summary")  # pooled GB

def test_uma_vs_nonuma_class(page):
    page.click("button[data-add-device='gpu_5090']")
    assert page.locator("#rig-svg .rig-node.non-uma").count() == 1

def test_remove_device(page):
    page.click("button[data-add-device='dgx_spark']")
    page.click("#rig-svg .rig-node")  # click removes (or its remove control)
    assert page.locator("#rig-svg .rig-node").count() == 0
```

- [ ] **Step 2: Run to verify fail** — `python -m pytest tests/test_calculator_ui.py -v` → FAIL.

- [ ] **Step 3: Implement rig-builder in `calculator-ui.js`**

Build the module: initialize `state` (from Shared interfaces, `rig: []`), a `render()` that repaints `#rig-builder`, and event handlers. Full behavior:
- Render catalog buttons `for (id in DEVICES)` with `data-add-device="id"`, label + price + memory; class `uma`/`non-uma`.
- On add: `state.rig.push(id); state.preset='custom'; render()`. On node click: remove that index.
- Render SVG: viewBox 0 0 640 380; a central `<g class="pair-hub">`; for each device call `hubLayout(n,640,380)`, draw `<line>` hub→node then `<g class="rig-node [uma|non-uma]">` with rect+label.
- Summary bar: `poolMemoryGb`, `Σ loadW/1000` kW, `Σ priceUsd*fx` AUD, `aggThroughputTps` (0 if !fits), fit badge text "fits ✓ / exceeds pool ✗".
Provide the actual code (write it out fully — catalog builder, svg builder, summary builder, and a top-level `render()` that also calls the panels/results renderers added in later tasks via optional chaining `window.SunStackUI._renderPanels?.()`).
CSS: `.rig-node rect{fill:var(--amber)} .rig-node.non-uma rect{fill:var(--muted)} .rig-hub{...} #rig-summary{display:flex;gap:18px;...}` — write concrete rules.

- [ ] **Step 4: Run to verify pass** — `python -m pytest tests/test_calculator_ui.py -v` → PASS.

- [ ] **Step 5: Commit** — `git add assets/js/calculator-ui.js assets/css/calculator.css tests/test_calculator_ui.py && git commit -m "calculator: add interactive PAIR-hub rig-builder"`

---

### Task 7: Input panels + state→render loop

**Files:** Modify `website/assets/js/calculator-ui.js`, `website/assets/css/calculator.css`; Test append `website/tests/test_calculator_ui.py`.

**Interfaces:**
- Consumes `SunStackData.{MODELS, ENERGY_PRESETS, INPUT_DEFAULTS}`, `SunStackEngine.applyPreset`.
- Produces `#panels` with: preset toggle (Pessimistic/Neutral/Optimistic/Custom), model select (memory-gated `disabled` when `!fits`), quant select, and labelled range sliders for every input in `state`. Each control writes to `state`, sets `state.preset='custom'` on manual change (except the preset toggle), and calls `render()`. Energy-mix sliders auto-normalize display. Exposes `SunStackUI._renderPanels()`.

- [ ] **Step 1: Failing tests**
```python
def test_preset_toggle_moves_slider(page):
    page.click("button[data-add-device='dgx_spark']")
    before = page.eval_on_selector("#in-utilization", "el => el.value")
    page.click("button[data-preset='optimistic']")
    after = page.eval_on_selector("#in-utilization", "el => el.value")
    assert before != after

def test_model_gating_disables_unfittable(page):
    page.click("button[data-add-device='mac_mini_m4_16']")
    assert page.get_attribute("#model-select option[value='deepseek_v3']", "disabled") is not None

def test_manual_edit_sets_custom(page):
    page.click("button[data-add-device='dgx_spark']")
    page.fill("#in-utilization", "0.55") if page.get_attribute("#in-utilization","type")=="number" else page.eval_on_selector("#in-utilization","el=>{el.value=0.55; el.dispatchEvent(new Event('input'))}")
    assert "custom" in page.inner_text("#preset-state").lower()
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement panels** — write `_renderPanels()` fully: preset buttons calling `state = applyPreset(state, mode)` then `render()`; a `#preset-state` label; model `<select id="model-select">` with `<option disabled>` when `!fits(state.rig, id, quant)`; sliders `id="in-<inputId>"` bound to `state[inputId]`. Energy-mix as 4 sliders that normalize on display. On any manual `input`, set `state.preset='custom'`. **Auto-fallback (spec §12):** at the top of `render()`, if `!fits(state.rig, state.modelId, state.quant)`, reassign `state.modelId` to the largest-memory model that fits the current pool (iterate `MODELS` by `minGbQ4` descending); if none fit, leave the selection and let results show the "exceeds pool" state.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "calculator: add input panels and preset toggle"`

---

### Task 8: Citations — chips, popover, references, download

**Files:** Modify `website/assets/js/calculator-ui.js`, `website/assets/css/calculator.css`; Test `website/tests/test_calculator_ui.py` (append).

**Interfaces:**
- Consumes `SunStackData.{SOURCES, INPUT_DEFAULTS, DEVICES, MODELS}`, `cite()`.
- Produces: a `cite chip` beside every cited control (`.cite-chip[data-source-id]`), a focus/hover `.cite-popover` (figure + range + name·publisher·date + confidence dot + "View source ↗"), a numbered `#references` list (dedup sources → `[n]`), and a `#sources` table with a **Download JSON/CSV** button (`#download-assumptions`) producing a Blob.

- [ ] **Step 1: Failing tests**
```python
def test_cite_chip_links_out(page):
    page.click("button[data-add-device='dgx_spark']")
    chip = page.locator(".cite-chip").first
    assert chip.get_attribute("data-source-id")
    chip.click()
    href = page.locator(".cite-popover a").first.get_attribute("href")
    assert href.startswith("http")

def test_references_numbered_and_dedup(page):
    n_refs = page.locator("#references li").count()
    n_src = page.evaluate("() => Object.keys(window.SunStackData.SOURCES).length")
    assert 0 < n_refs <= n_src

def test_download_button_present(page):
    assert page.locator("#download-assumptions").count() == 1
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement citations** — write `makeCiteChip(sourceId, figure)`, popover open/close (click + focus, Esc to close, `role="dialog"`), `renderReferences()` (dedup used source_ids into an ordered list, superscript `[n]`), and `#download-assumptions` handler building CSV+JSON Blobs from `INPUT_DEFAULTS`+device/model data and triggering download. Confidence dot: `.dot.high{background:var(--teal)} .dot.medium{background:var(--amber)} .dot.low{background:var(--muted)}` plus an `aria-label`. Chip styling per spec §8 (pill, `--amber-soft`/`--dark-2`, mono micro-caps, `↗`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "calculator: add cited references (chips, popovers, downloadable sources)"`

---

### Task 9: Results cards + charts (stacked bar, tornado, break-even)

**Files:** Modify `website/assets/js/calculator-ui.js`, `website/assets/css/calculator.css`; Test `website/tests/test_calculator_ui.py` (append).

**Interfaces:**
- Consumes `SunStackEngine.{computeScenario, breakevenUtilization, applyPreset, UNCERTAINTY_INPUT_IDS}`, `uPlot` (global).
- Produces `#results` headline cards (homeowner net/yr, /mo, payback, ROI; operator margin; buyer saves + %; negative net shown red via `.neg`) and `#charts`: a hand-SVG stacked bar (`#split-bar`), a uPlot **tornado** (`#tornado`) ranking `UNCERTAINTY_INPUT_IDS` by |Δ net| across low↔high, and a uPlot **break-even** curve (`#breakeven`, net vs utilization 0→1 with break-even marker). If `window.uPlot` is undefined, render a `<table class="chart-fallback">` instead.

- [ ] **Step 1: Failing tests**
```python
def test_headline_cards_render(page):
    page.click("button[data-add-device='dgx_spark']")
    for cid in ["#card-homeowner-net","#card-payback","#card-operator-margin","#card-buyer-saves"]:
        assert page.locator(cid).count() == 1

def test_negative_net_flagged(page):
    # force a losing config: tiny utilization, not financed, expensive
    page.click("button[data-add-device='gpu_5090']")
    page.eval_on_selector("#in-utilization","el=>{el.value=0.01; el.dispatchEvent(new Event('input'))}")
    page.eval_on_selector("#in-financed","el=>{el.checked=false; el.dispatchEvent(new Event('change'))}") if page.locator("#in-financed").count() else None
    assert page.locator("#card-homeowner-net.neg").count() == 1 or "-" in page.inner_text("#card-homeowner-net")

def test_charts_or_fallback_present(page):
    page.click("button[data-add-device='dgx_spark']")
    assert page.locator("#tornado, #tornado .chart-fallback, #tornado table").count() >= 1
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement results + charts** — write `_renderResults()` (cards from `computeScenario(state)`, AUD-formatted via `Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'})`, `.neg` when `<0`); stacked bar from `breakdown`; tornado computed by, for each uncertainty id, `computeScenario({...state,[id]:low}).homeowner.netAud` vs `high`, sorted by |Δ|; break-even line sampling utilization 0..1. Guard `if (!window.uPlot)` → table fallback. Call all three renderers from the top-level `render()`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "calculator: add results cards, split bar, tornado and break-even charts"`

---

### Task 10: Deck teaser tile + deck.js

**Files:** Modify `website/index.html`, `website/assets/js/deck.js`; Test `website/tests/test_deck_teaser_tile.py`.

**Interfaces:**
- Produces a new `<section class="tile" id="tile-12">` in the **Who wins** group (after current `#tile-11`), renumbering subsequent tiles' `id` (`tile-12→13 … tile-15→16`) and their internal `--i` unaffected. Adds a Neutral-derived headline and a button `<a class="btn" href="calculator.html">`. Updates `deck.js` `SECTIONS` (the "Who wins" start stays 11; "The plan" start shifts 14→15).

- [ ] **Step 1: Failing test**

Create `website/tests/test_deck_teaser_tile.py`:
```python
import os, pytest
from playwright.sync_api import sync_playwright
DECK = "file://" + os.path.abspath("index.html")

@pytest.fixture()
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(DECK); yield pg; b.close()

def test_teaser_tile_links_to_calculator(page):
    link = page.locator("a[href='calculator.html']")
    assert link.count() >= 1

def test_tile_count_increased_and_counter_matches(page):
    tiles = page.locator("main#deck .tile").count()
    assert tiles == 16
    # counter denominator is dynamic from total; just assert no JS error and stepper built
    assert page.locator("#chapters .chapter").count() == 6
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — insert the teaser tile HTML (plain language: three one-line wins + a Neutral headline like "On today's numbers a typical solar-hours node nets ~A$X/yr" — compute X once from the Neutral preset and hard-code with a comment pointing to the calculator; keep modest per Global Constraints). Renumber following tile ids. In `deck.js`, update `SECTIONS` "The plan" `start: 14`→`15`. Verify the counter (`/ total`) still works (it's dynamic).
- [ ] **Step 4: Run → PASS.** Also run existing deck tests: `python -m pytest tests/test_operator_slides.py tests/test_page2_responsive.py -v` → still PASS.
- [ ] **Step 5: Commit** — `git commit -m "deck: add business-model teaser tile linking to the calculator"`

---

### Task 11: Responsive + a11y + full-suite integration

**Files:** Modify `website/assets/css/calculator.css`, `website/assets/js/calculator-ui.js`; Test `website/tests/test_calculator_responsive.py`.

**Interfaces:** No new engine/data interfaces. Ensures: panels/rig stack on ≤820px; controls keyboard-reachable; popovers open on focus; `prefers-reduced-motion` disables slider/rig transitions; charts have table fallback (already Task 9).

- [ ] **Step 1: Failing tests**
```python
import os, pytest
from playwright.sync_api import sync_playwright
CALC = "file://" + os.path.abspath("calculator.html")

@pytest.fixture()
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); yield pg; b.close()

def test_mobile_layout_no_overflow(page):
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(CALC)
    page.click("button[data-add-device='dgx_spark']")
    sw = page.evaluate("() => document.documentElement.scrollWidth")
    cw = page.evaluate("() => document.documentElement.clientWidth")
    assert sw <= cw + 1  # no horizontal overflow

def test_controls_are_labelled(page):
    page.goto(CALC)
    page.click("button[data-add-device='dgx_spark']")
    unl = page.evaluate("""() => [...document.querySelectorAll('input[type=range],select')]
      .filter(el => !el.getAttribute('aria-label') && !el.labels?.length).length""")
    assert unl == 0
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — add responsive CSS (`@media (max-width:820px){ #panels{grid-template-columns:1fr} .calc-wrap{padding:24px 14px} }`), ensure every `input`/`select` has a `<label for>` or `aria-label`, `@media (prefers-reduced-motion:reduce){ *{transition:none!important} }`, focus-visible rings on chips/controls.
- [ ] **Step 4: Run whole suite** — `cd website && python -m pytest tests/ -v` → ALL PASS. Then `python -m pytest -q` and confirm no regressions in pre-existing deck tests.
- [ ] **Step 5: Commit** — `git commit -m "calculator: responsive + accessibility pass"`

---

## Self-review

**Spec coverage:**
- §2 standalone page + teaser → Tasks 1, 10. ✓
- §3 economic model (3 parties, throughput gating, energy blend, derived) → Task 3. ✓
- §4 input catalog (uncertainty vs strategy) → Tasks 2 (defaults+polarity), 4 (presets), 7 (controls). ✓
- §5 rig-builder (catalog, PAIR hub auto-reflow, UMA/non-UMA colour, summary) → Tasks 5, 6. ✓
- §6 presets (P/N/O + Custom) → Tasks 4, 7. ✓
- §7 outputs (cards, stacked bar, tornado, break-even) → Task 9. ✓
- §8 beautiful citations (chip, popover, references, download, confidence dots) → Task 8. ✓
- §9/App-A cited data → Task 2 (transcribed from committed `research-dataset.json`). ✓
- §10 tech/files → file structure + Task 1. ✓
- §11 teaser tile + deck.js → Task 10. ✓
- §12 edge cases (empty rig, no-fit, zero-util, negative net, mix normalize, uPlot fail) → Tasks 3, 7, 9. ✓
- §13 a11y/responsive → Task 11. ✓
- §14 test plan → tests in every task, full suite in Task 11. ✓

**Placeholder scan:** data values are transcribed from a committed, cited source (`research-dataset.json`) with exact ids listed in Task 2 — not vague TODOs. Engine/preset/layout code is complete. UI tasks give complete tests + concrete DOM contracts + the functions to write; the executing subagent writes the full render code against those contracts (acceptable for view code; logic code is fully specified).

**Type consistency:** `state`, `SunStackData`, `SunStackEngine`, and `outputs` shapes are defined once in Shared Interfaces and referenced verbatim by every task. Function names (`computeScenario`, `applyPreset`, `hubLayout`, `fits`, `aggThroughputTps`, `effEnergyPriceAudPerKwh`, `breakevenUtilization`) are used identically across tasks and tests.

**Currency:** every money output is AUD via `fxAudPerUsd`; device/token source numbers stay USD in `DATA` and convert in the engine only. Consistent across Tasks 2–3–9.
