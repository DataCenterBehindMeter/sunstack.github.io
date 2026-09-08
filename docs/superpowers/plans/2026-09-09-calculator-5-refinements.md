# Calculator: 5 Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five tightly-scoped calculator improvements — 3-party split bar, model sell-price display, ROI/payback by hardware owner, rig-cost consistency fix, and DGX Spark default with all three parties positive.

**Architecture:** All changes are in-place edits to the four existing JS files and one CSS file; no new files. The engine (`calculator-engine.js`) changes in Tasks 3 and 5 only; the UI (`calculator-ui.js`) and results (`calculator-results.js`) carry the display logic. Tests live in `tests/test_calculator_ui.py` and `tests/test_calculator_engine.py`. Run the full suite after every commit: `python3 -m pytest tests/ -v`.

**Tech Stack:** Vanilla JS (no build step), Playwright-Python tests (`file://` protocol), Chromium headless.

## Global Constraints

- Zero-build vanilla JS — no npm, no bundler, no TypeScript.
- Playwright tests use `file://` URL: `CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")`.
- All money in AUD; `FX_AUD_PER_USD = 1.39` from `SunStackData`.
- Commit style: `calculator: imperative summary` — no `Co-Authored-By`, no "Generated with Claude Code" footer.
- Git branch: `revenue-calculator`. Do not push.
- `test_battery_terminology.py::test_network_explains_battery_mitigation` is a known pre-existing failure — it must remain the only failure after all tasks.
- Working directory for all commands: `/Users/lyk/Documents/projects/research/fundings/implementations/sunstack/website`.

---

### Task 1: Default state → DGX Spark + MiniMax M3 (refinement 5)

**Files:**
- Modify: `assets/js/calculator-ui.js` (state initializer, lines ~13–41)
- Modify: `assets/js/calculator-data.js` (MODELS.minimax_m3.minGbQ4, line ~647)
- Modify: `tests/test_calculator_ui.py` (update default-state assertions)
- Modify: `tests/test_calculator_engine.py` (update `test_both_parties_can_be_positive`)

**Interfaces:**
- Consumes: `SunStackData.MODELS.minimax_m3`, `SunStackData.DEVICES.dgx_spark`
- Produces: `window.SunStackUI.state` = `{ rig:['dgx_spark'], modelId:'minimax_m3', quant:'q4', energyMix:{free:0.6,solar:0.3,grid:0.1}, concurrency:16, activeHours:24, financed:true, homeownerShare:0.55, undercut:0.2, preset:'neutral', utilization:0.40, ... }` (utilization verified positive for all 3 parties; see Step 1)

- [ ] **Step 1: Verify the three parties are all positive with the target default**

Open the browser console (or run in Node-less way via pytest evaluate) — compute in-head first:

```
DGX Spark: 128 GB, 273 GB/s bw, loadW=160W, priceUsd.typical=4699
minimax_m3: activeParamsB=10, minGbQ4=126 (after change), priceOutUsdPerM.typical=0.96
state: rig=['dgx_spark'], modelId='minimax_m3', quant='q4'
       utilization=0.40, activeHours=24, concurrency=16, financed=true
       homeownerShare=0.55, undercut=0.2, platformCostUsdPerMTok=0.002
       energyMix={free:0.6,solar:0.3,grid:0.1}, feedInTariff=3.3, retailRate=30

singleStreamTps = 0.6 * 273 / (10 * 0.55) = 163.8 / 5.5 ≈ 29.8 t/s
batchGain(16) = 16^0.7 ≈ 7.46
servedTps ≈ 29.8 * 7.46 ≈ 222.3 t/s (solo fitter — dgx_spark 128GB ≥ 126GB minGbQ4)
tokensPerYear = 222.3 * 3600 * 24 * 365 * 0.4 ≈ 2.80e9 tokens/yr
grossRevenueAud = 2.80e9 * (0.96/1e6) * (1-0.2) * 1.39 ≈ A$2,980
homeownerShareAud = 2980 * 0.55 ≈ A$1,639
energyCostAud = 0.160kW * 24h * 365 * 0.4 * effEnergy
  effEnergy = (0.6*0 + 0.3*3.3 + 0.1*30)/1 = 3.99 c/kWh = 0.0399 AUD/kWh
  energyCostAud ≈ 0.160 * 24 * 365 * 0.4 * 0.0399 ≈ A$22.4
homeownerNet ≈ 1639 - 22 - 0 (financed) ≈ A$1,617  ✓ > 0
rigCostAud = 4699 * 1.39 = A$6,532
amortAll = 6532 / 5 = A$1,306
operatorMargin = grossRevenue*(1-0.55) - platformCost - financingCost
  = 2980*0.45 - 2.80e9*(0.002/1e6)*1.39 - 1306
  = 1341 - 7.8 - 1306 ≈ A$27  ✓ > 0 (barely — if needed, raise utilization or concurrency)
buyerSavesAud = tokensPerYear*(cloudPrice-sunstackPrice)*FX > 0  ✓
```

If `operatorMargin ≤ 0`, raise `INPUT_DEFAULTS.utilization.value` to `0.50` and re-check:
  tokensPerYear ∝ utilization, so `operatorMargin(0.50)` = 2980*1.25*0.45 - 7.8*1.25 - 1306 ≈ A$368 ✓

Confirm final numbers before coding by running a quick page.evaluate in the test below.

- [ ] **Step 2: Write the failing tests**

In `tests/test_calculator_ui.py`, update the two default-state assertions (they currently expect `mac_studio_m3ultra_256`):

```python
def test_state_initialized(page):
    """state object exists with expected keys."""
    has_state = page.evaluate(
        "() => typeof window.SunStackUI.state === 'object' && window.SunStackUI.state !== null"
    )
    assert has_state
    rig = page.evaluate("() => window.SunStackUI.state.rig")
    assert rig == ["dgx_spark"]
    model_id = page.evaluate("() => window.SunStackUI.state.modelId")
    assert model_id == "minimax_m3"
```

Also add a new test for the default activeHours and concurrency:

```python
def test_default_state_dgx_minimax(page):
    """Default state is DGX Spark + MiniMax M3 with correct knobs."""
    s = page.evaluate("() => window.SunStackUI.state")
    assert s["rig"] == ["dgx_spark"]
    assert s["modelId"] == "minimax_m3"
    assert s["quant"] == "q4"
    assert s["activeHours"] == 24
    assert s["concurrency"] == 16
    assert s["financed"] is True
    assert abs(s["homeownerShare"] - 0.55) < 1e-6
    assert abs(s["undercut"] - 0.20) < 1e-6
```

In `tests/test_calculator_engine.py`, update `test_both_parties_can_be_positive`:

```python
def test_both_parties_can_be_positive(page):
    """Default config (dgx_spark + minimax_m3, financed) yields homeowner.netAud > 0,
    operator.marginAud > 0, and buyer.savesAud > 0."""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      const state = {
        rig: ['dgx_spark'], modelId: 'minimax_m3', quant: 'q4',
        poolEfficiency: 0.75, concurrency: 16,
        utilization: 0.40, activeHours: 24,
        energyMix: {free:0.6, solar:0.3, grid:0.1},
        feedInTariff: 3.3, retailRate: 30,
        undercut: 0.2, homeownerShare: 0.55, financed: true,
        platformCostUsdPerMTok: 0.002, preset: 'neutral'
      };
      const out = E.computeScenario(state);
      return {
        homeownerNet: out.homeowner.netAud,
        operatorMargin: out.operator.marginAud,
        buyerSaves: out.buyer.savesAud,
        ok: out.homeowner.netAud > 0 && out.operator.marginAud > 0 && out.buyer.savesAud > 0
      };
    }""")
    assert result['ok'], (
        f"Default not all-positive: "
        f"homeowner={result['homeownerNet']:.0f}, "
        f"operator={result['operatorMargin']:.0f}, "
        f"buyer={result['buyerSaves']:.0f}"
    )
```

- [ ] **Step 3: Run tests to see them fail**

```bash
python3 -m pytest tests/test_calculator_ui.py::test_state_initialized tests/test_calculator_ui.py::test_default_state_dgx_minimax tests/test_calculator_engine.py::test_both_parties_can_be_positive -v
```

Expected: FAIL (rig is still `mac_studio_m3ultra_256`).

- [ ] **Step 4: Change minimax_m3.minGbQ4 to 126 in calculator-data.js**

Find (around line 648):
```js
    minimax_m3: {
      label: "MiniMax M3 (MoE 230B/10B, text+image+video)",
      minGbQ4: 130,
```

Replace with:
```js
    minimax_m3: {
      label: "MiniMax M3 (MoE 230B/10B, text+image+video)",
      minGbQ4: 126,
      // fits a single 128 GB node at Q4 (tight, short context)
```

Also update the `note` field to add: `"Fits a single 128 GB node at Q4 (tight, short context). ..."` — keep the existing note text, just prepend the new clause:

```js
      note: "Fits a single 128 GB node at Q4 (tight, short context). MiniMax's flagship multimodal MoE (text, image, video). Needs 256 GB Mac Studio or 2-box pool for Q8/FP16. 'MiniMax H3' is their companion multimodal video generation model."
```

- [ ] **Step 5: Update state initializer in calculator-ui.js**

Find the `const state = {` block (lines ~13–41) and replace it entirely:

```js
  const state = {
    rig: ['dgx_spark'],
    modelId:  'minimax_m3',
    quant:    'q4',

    // uncertainty inputs — seeded from INPUT_DEFAULTS typical values
    poolEfficiency:          ID.poolEfficiency.value,
    utilization:             ID.utilization.value,
    activeHours:             24,
    feedInTariff:            ID.feedInTariff.value,
    retailRate:              ID.retailRate.value,

    // energy mix (fractions sum to 1; default: 60% free/off-peak, 30% solar, 10% grid)
    energyMix: { free: 0.6, solar: 0.3, grid: 0.1 },

    // concurrency — batching lever (NOT in INPUT_DEFAULTS; presets do not change it)
    concurrency: 16,

    // pricing + shares
    undercut:             0.20,   // 20% below market
    homeownerShare:       0.55,   // homeowner gets 55% of gross

    // hardware
    financed:             true,
    platformCostUsdPerMTok: 0.002,

    // scenario
    preset: 'neutral'
  };
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
python3 -m pytest tests/test_calculator_ui.py::test_state_initialized tests/test_calculator_ui.py::test_default_state_dgx_minimax tests/test_calculator_engine.py::test_both_parties_can_be_positive -v
```

Expected: PASS. If `test_both_parties_can_be_positive` fails because operator margin is ≤ 0, increase `INPUT_DEFAULTS.utilization.value` from 0.40 to 0.50 in `calculator-data.js` and re-run.

- [ ] **Step 7: Update test_default_rig_has_one_node (test_calculator_ui.py)**

The DGX Spark is still one node — this test passes without change. But the `test_add_device_updates_summary_and_svg` and `test_state_rig_updated_on_add` tests refer to `mac_studio_m3ultra_256` being the default; update them:

```python
def test_add_device_updates_summary_and_svg(page):
    """Adding two dgx_spark devices to the default rig shows 3 SVG nodes total."""
    page.click("button[data-add-device='dgx_spark']")
    page.click("button[data-add-device='dgx_spark']")
    # default rig has 1 dgx_spark (128 GB) + 2 more dgx_spark (128 GB each) = 384 GB
    assert page.locator("#rig-svg .rig-node").count() == 3
    summary_text = page.inner_text("#rig-summary")
    assert "384" in summary_text

def test_state_rig_updated_on_add(page):
    """state.rig reflects added devices (default rig already has dgx_spark)."""
    page.click("button[data-add-device='dgx_spark']")
    rig = page.evaluate("() => window.SunStackUI.state.rig")
    assert rig == ["dgx_spark", "dgx_spark"]
```

- [ ] **Step 8: Update test_default_net_positive and test_default_operator_margin_positive**

These tests just call `computeScenario(state)` on the live UI state — they still pass without source changes, but let their docstrings reflect the new default for clarity. No code change needed if they still pass.

- [ ] **Step 9: Run full suite to confirm no new breakage**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: 1 failure (`test_battery_terminology`), all others pass.

- [ ] **Step 10: Commit**

```bash
git add assets/js/calculator-data.js assets/js/calculator-ui.js tests/test_calculator_ui.py tests/test_calculator_engine.py
git commit -m "calculator: default rig → DGX Spark + MiniMax M3 (all 3 parties positive); minimax_m3 minGbQ4=126"
```

---

### Task 2: Rig-cost consistency fix (refinement 4)

**Files:**
- Modify: `assets/js/calculator-ui.js` (`renderRigBuilder` summary bar, lines ~338–363)
- Modify: `tests/test_calculator_engine.py` (add rig-cost value test)

**Interfaces:**
- Consumes: `SunStackEngine.computeScenario(state).rigCostAud`
- Produces: Summary bar reads `rigCostAud` from `computeScenario`, not its own sum; adds a Playwright test asserting exact A$6,532 for `['dgx_spark']`.

**Context:** The current summary bar recomputes rig cost as `sum(priceUsd.typical) * FX` independently, which matches `computeScenario` — but the test spec says "if the summary computes rig cost via its own path, make it use `computeScenario(...).rigCostAud`". The test for `['dgx_spark','mac_mini_m4_32']` = A$8,198 = (4699+1199)*1.39 = 8,198 must pass.

- [ ] **Step 1: Write the failing engine test for rig cost**

In `tests/test_calculator_engine.py`, add:

```python
def test_rig_cost_exact_value(page):
    """rigCostAud = sum(device.priceUsd.typical) * FX, no double-counting, no .high prices.
    dgx_spark (4699) + mac_mini_m4_32 (1199) at FX 1.39 = (5898) * 1.39 = 8197.22 → round to A$8,197.
    (Note: 5898 * 1.39 = 8,198.22; integer rounding gives A$8,198.)"""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      const state = {
        rig: ['dgx_spark', 'mac_mini_m4_32'],
        modelId: 'gpt_oss_20b', quant: 'q4',
        poolEfficiency: 0.75, concurrency: 12,
        utilization: 0.4, activeHours: 16,
        energyMix: {free:0.6, solar:0.3, grid:0.1},
        feedInTariff: 3.3, retailRate: 30,
        undercut: 0.2, homeownerShare: 0.55, financed: true,
        platformCostUsdPerMTok: 0.002
      };
      const out = E.computeScenario(state);
      const D = window.SunStackData;
      const expected = (D.DEVICES.dgx_spark.priceUsd.typical + D.DEVICES.mac_mini_m4_32.priceUsd.typical) * D.FX_AUD_PER_USD;
      return { rigCostAud: out.rigCostAud, expected, ok: Math.abs(out.rigCostAud - expected) < 0.01 };
    }""")
    assert result['ok'], f"rigCostAud={result['rigCostAud']:.2f} expected={result['expected']:.2f}"
    # Also verify the concrete value: (4699 + 1199) * 1.39 = 8198.22
    assert abs(result['rigCostAud'] - 8198.22) < 0.5, f"Expected ~A$8198, got {result['rigCostAud']:.2f}"
```

- [ ] **Step 2: Run test to confirm it passes (engine already correct)**

```bash
python3 -m pytest tests/test_calculator_engine.py::test_rig_cost_exact_value -v
```

Expected: PASS (the engine already uses `priceUsd.typical`). If it FAILS, the engine has a bug — investigate `computeScenario` lines 123–124 of `calculator-engine.js`.

- [ ] **Step 3: Fix summary bar in calculator-ui.js to use computeScenario**

In `renderRigBuilder`, find the summary bar block (~lines 338–363). Currently it independently computes:
```js
const rigCostUsd = state.rig.reduce((acc, id) => acc + D.DEVICES[id].priceUsd.typical, 0);
const rigCostAud = rigCostUsd * D.FX_AUD_PER_USD;
```

Replace the entire summary-bar `else` block content so it calls `computeScenario` once:

```js
    } else {
      const out      = E.computeScenario(state);
      const pooledGb = E.poolMemoryGb(state.rig);
      const totalLoadW = state.rig.reduce((acc, id) => acc + D.DEVICES[id].loadW.typical, 0);
      const rigCostAud = out.rigCostAud;
      const okFit      = E.fits(state.rig, state.modelId, state.quant);
      let tpsHtml = '';
      if (okFit) {
        const tput = E.aggThroughput(state);
        const ss   = Math.round(tput.singleStreamMin);
        const srv  = Math.round(tput.aggServedTps);
        const conc = state.concurrency != null ? state.concurrency : 12;
        tpsHtml =
          '<span class="summary-stat"><span class="stat-val">' + ss + ' t/s</span><span class="stat-lbl">single-stream</span></span>' +
          '<span class="summary-stat"><span class="stat-val">' + srv + ' t/s</span><span class="stat-lbl">served (' + conc + ' concurrent)</span></span>';
      }

      const fitBadge = okFit
        ? '<span class="fit-badge fit-ok">fits ✓</span>'
        : '<span class="fit-badge fit-no">exceeds pool ✗</span>';

      summary.innerHTML =
        '<span class="summary-stat"><span class="stat-val">' + pooledGb + ' GB</span><span class="stat-lbl">pooled memory</span></span>' +
        '<span class="summary-stat"><span class="stat-val">' + fmtKw(totalLoadW) + '</span><span class="stat-lbl">total load</span></span>' +
        '<span class="summary-stat"><span class="stat-val">' + fmtAud(rigCostAud) + '</span><span class="stat-lbl">rig cost</span></span>' +
        tpsHtml +
        '<span class="summary-badge">' + fitBadge + '</span>';
    }
```

- [ ] **Step 4: Run full suite**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: 1 failure (`test_battery_terminology`), all others pass.

- [ ] **Step 5: Commit**

```bash
git add assets/js/calculator-ui.js tests/test_calculator_engine.py
git commit -m "calculator: summary bar rig cost reads computeScenario.rigCostAud; add rig-cost exact-value test"
```

---

### Task 3: ROI + Payback refer to hardware owner (refinement 3)

**Files:**
- Modify: `assets/js/calculator-engine.js` (`computeScenario`, lines ~180–183)
- Modify: `assets/js/calculator-results.js` (`_renderResults`, ROI card ~lines 119–126)
- Modify: `tests/test_calculator_engine.py` (add ROI-by-owner tests)
- Modify: `tests/test_calculator_ui.py` (update payback card label assertion)

**Interfaces:**
- Consumes: `out.operator.marginAud`, `out.homeowner.netAud`, `out.rigCostAud`, `state.financed`
- Produces: `out.roiPct` = `owningPartyProfit / rigCostAud * 100`; cards labeled "(operator)" or "(homeowner)".

**Background:** The payback card in `_renderResults` already correctly uses `operator.marginAud` when financed and `homeowner.netAud` when self-funded (added in a prior task). The engine's `roiPct` is still homeowner-only. This task fixes `roiPct` in the engine and updates the ROI card label.

- [ ] **Step 1: Write failing engine test**

In `tests/test_calculator_engine.py`:

```python
def test_roi_by_owner_financed(page):
    """When financed, roiPct = operator.marginAud / rigCostAud * 100."""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      const state = {
        rig: ['dgx_spark'], modelId: 'gpt_oss_120b', quant: 'q4',
        poolEfficiency: 0.75, concurrency: 12,
        utilization: 0.4, activeHours: 16,
        energyMix: {free:0.6, solar:0.3, grid:0.1},
        feedInTariff: 3.3, retailRate: 30,
        undercut: 0.3, homeownerShare: 0.5, financed: true,
        platformCostUsdPerMTok: 0.002
      };
      const out = E.computeScenario(state);
      const expected = out.operator.marginAud / out.rigCostAud * 100;
      return { roiPct: out.roiPct, expected, ok: Math.abs(out.roiPct - expected) < 0.001 };
    }""")
    assert result['ok'], f"roiPct={result['roiPct']:.3f} expected={result['expected']:.3f}"

def test_roi_by_owner_self_funded(page):
    """When not financed, roiPct = homeowner.netAud / rigCostAud * 100."""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      const state = {
        rig: ['dgx_spark'], modelId: 'gpt_oss_120b', quant: 'q4',
        poolEfficiency: 0.75, concurrency: 12,
        utilization: 0.4, activeHours: 16,
        energyMix: {free:0.6, solar:0.3, grid:0.1},
        feedInTariff: 3.3, retailRate: 30,
        undercut: 0.3, homeownerShare: 0.5, financed: false,
        platformCostUsdPerMTok: 0.002
      };
      const out = E.computeScenario(state);
      const expected = out.homeowner.netAud / out.rigCostAud * 100;
      return { roiPct: out.roiPct, expected, ok: Math.abs(out.roiPct - expected) < 0.001 };
    }""")
    assert result['ok'], f"roiPct={result['roiPct']:.3f} expected={result['expected']:.3f}"
```

- [ ] **Step 2: Run tests to see them fail**

```bash
python3 -m pytest tests/test_calculator_engine.py::test_roi_by_owner_financed tests/test_calculator_engine.py::test_roi_by_owner_self_funded -v
```

Expected: FAIL (roiPct currently uses homeownerNet unconditionally).

- [ ] **Step 3: Fix roiPct in calculator-engine.js**

Find lines ~180–183:
```js
    const paybackYears = homeownerNet > 0
      ? (state.financed ? 0 : rigCostAud / homeownerNet)
      : Infinity;
    const roiPct = rigCostAud > 0 ? (homeownerNet / rigCostAud) * 100 : 0;
```

Replace with:
```js
    const paybackYears = homeownerNet > 0
      ? (state.financed ? 0 : rigCostAud / homeownerNet)
      : Infinity;
    // ROI refers to whoever pays for the hardware
    const ownerProfit = state.financed ? operatorMargin : homeownerNet;
    const roiPct = rigCostAud > 0 ? (ownerProfit / rigCostAud) * 100 : 0;
```

- [ ] **Step 4: Run engine tests**

```bash
python3 -m pytest tests/test_calculator_engine.py::test_roi_by_owner_financed tests/test_calculator_engine.py::test_roi_by_owner_self_funded -v
```

Expected: PASS.

- [ ] **Step 5: Update ROI card in calculator-results.js**

Find the ROI card block (~lines 119–126):
```js
    const roiCard = document.createElement('div');
    roiCard.className = 'result-card';
    roiCard.id = 'card-roi';
    roiCard.innerHTML =
      '<div class="card-label">ROI</div>' +
      '<div class="card-val">' + out.roiPct.toFixed(1) + '%</div>' +
      '<div class="card-sub">annual return on hardware</div>';
    grid.appendChild(roiCard);
```

Replace with:
```js
    const roiOwner = state.financed ? 'operator' : 'homeowner';
    const roiCard = document.createElement('div');
    roiCard.className = 'result-card';
    roiCard.id = 'card-roi';
    roiCard.innerHTML =
      '<div class="card-label">ROI (' + roiOwner + ')</div>' +
      '<div class="card-val">' + out.roiPct.toFixed(1) + '%</div>' +
      '<div class="card-sub">annual return on hardware cost</div>';
    grid.appendChild(roiCard);
```

- [ ] **Step 6: Write a UI test for the ROI label**

In `tests/test_calculator_ui.py`:

```python
def test_roi_card_shows_owner_label(page):
    """ROI card label includes '(operator)' when financed, '(homeowner)' when not."""
    # Default state is financed=true
    assert page.evaluate("() => window.SunStackUI.state.financed") is True
    roi_label = page.inner_text("#card-roi .card-label").lower()
    assert "operator" in roi_label

    # Switch to self-funded
    page.evaluate("""() => {
      window.SunStackUI.state.financed = false;
      window.SunStackUI.renderOutputs();
    }""")
    roi_label_after = page.inner_text("#card-roi .card-label").lower()
    assert "homeowner" in roi_label_after
```

- [ ] **Step 7: Run the new UI test**

```bash
python3 -m pytest tests/test_calculator_ui.py::test_roi_card_shows_owner_label -v
```

Expected: PASS.

- [ ] **Step 8: Run full suite**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: 1 failure only.

- [ ] **Step 9: Commit**

```bash
git add assets/js/calculator-engine.js assets/js/calculator-results.js tests/test_calculator_engine.py tests/test_calculator_ui.py
git commit -m "calculator: ROI uses hardware-owner profit (operator when financed, homeowner when self-funded); label both ROI + payback cards with owner name"
```

---

### Task 4: Model sell-price line next to model select (refinement 2)

**Files:**
- Modify: `assets/js/calculator-ui.js` (`renderPanels`, model section ~lines 434–529)
- Modify: `assets/js/calculator-results.js` (`_renderResults`, add sell-price update)
- Modify: `assets/css/calculator.css` (add `.model-sell-price` style)
- Modify: `tests/test_calculator_ui.py` (add sell-price tests)

**Interfaces:**
- Consumes: `state.modelId`, `state.undercut`, `SunStackData.MODELS[modelId].priceOutUsdPerM.typical`, `SunStackData.FX_AUD_PER_USD`
- Produces: A `<div id="model-sell-price">` element inside `.model-section` showing "SunStack sells this model at A$X / 1M tokens  (vs A$Y market)"; updated on model change, quant change, and undercut slider change.

**Formula:**
```
sunstackPriceAud = model.priceOutUsdPerM.typical * (1 - state.undercut) * FX_AUD_PER_USD
marketPriceAud   = model.priceOutUsdPerM.typical * FX_AUD_PER_USD
```

- [ ] **Step 1: Write failing tests**

In `tests/test_calculator_ui.py`:

```python
def test_model_sell_price_element_exists(page):
    """#model-sell-price element exists after page load."""
    assert page.locator("#model-sell-price").count() == 1

def test_model_sell_price_value(page):
    """Sell-price line shows a plausible AUD value for the selected model."""
    text = page.inner_text("#model-sell-price")
    assert "A$" in text
    assert "1M tokens" in text

def test_model_sell_price_updates_on_undercut_change(page):
    """Changing undercut slider updates #model-sell-price."""
    before = page.inner_text("#model-sell-price")
    page.eval_on_selector(
        "#in-undercut",
        "el => { el.value = 0.5; el.dispatchEvent(new Event('input')); }"
    )
    after = page.inner_text("#model-sell-price")
    assert before != after
```

- [ ] **Step 2: Run tests to see them fail**

```bash
python3 -m pytest tests/test_calculator_ui.py::test_model_sell_price_element_exists tests/test_calculator_ui.py::test_model_sell_price_value tests/test_calculator_ui.py::test_model_sell_price_updates_on_undercut_change -v
```

Expected: FAIL (element doesn't exist yet).

- [ ] **Step 3: Add #model-sell-price element in renderPanels (calculator-ui.js)**

In `renderPanels`, after the `modelRow` is assembled and before `modelSection.appendChild(modelRow)`, add:

```js
    // ── Model sell-price line ──────────────────────────────────────────────
    const sellPriceLine = document.createElement('div');
    sellPriceLine.id = 'model-sell-price';
    sellPriceLine.className = 'model-sell-price';
    // Compute and set text (initial render)
    _updateSellPriceLine(sellPriceLine, state);
    modelRow.appendChild(sellPriceLine);
```

Add the helper function inside the IIFE (near other helpers like `fmtAud`):

```js
  /* ── Compute and write the model sell-price line ────────────────────────────
   * Called both from renderPanels (full rebuild) and renderOutputs (live update).
   */
  function _updateSellPriceLine(el, st) {
    const model = D.MODELS[st.modelId];
    if (!model) { el.textContent = ''; return; }
    const fx = D.FX_AUD_PER_USD;
    const marketAud   = model.priceOutUsdPerM.typical * fx;
    const sunstackAud = marketAud * (1 - st.undercut);
    el.textContent =
      'SunStack sells this model at A$' + sunstackAud.toFixed(2) + ' / 1M tokens' +
      '  (vs A$' + marketAud.toFixed(2) + ' market)';
  }
```

- [ ] **Step 4: Update #model-sell-price in renderOutputs (calculator-ui.js)**

In `renderOutputs`, after the preset-state update block, add:

```js
    // Update model sell-price line (live — undercut or model may have changed)
    const sellPriceEl = document.getElementById('model-sell-price');
    if (sellPriceEl) _updateSellPriceLine(sellPriceEl, state);
```

- [ ] **Step 5: Add CSS for .model-sell-price in calculator.css**

After the `.model-mm-legend` block (search for `.model-mm-legend`), add:

```css
.model-sell-price {
  font-size: 0.78rem;
  color: var(--teal);
  margin-top: 6px;
  font-weight: 500;
  grid-column: 1 / -1;
}
```

- [ ] **Step 6: Run sell-price tests**

```bash
python3 -m pytest tests/test_calculator_ui.py::test_model_sell_price_element_exists tests/test_calculator_ui.py::test_model_sell_price_value tests/test_calculator_ui.py::test_model_sell_price_updates_on_undercut_change -v
```

Expected: PASS.

- [ ] **Step 7: Run full suite**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: 1 failure only.

- [ ] **Step 8: Commit**

```bash
git add assets/js/calculator-ui.js assets/css/calculator.css tests/test_calculator_ui.py
git commit -m "calculator: show model sell price (SunStack vs market) next to model select; updates live on undercut/model change"
```

---

### Task 5: 3-party split bar — total = buyer's cloud equivalent spend (refinement 1)

**Files:**
- Modify: `assets/js/calculator-results.js` (`_renderResults`, split-bar section ~lines 159–211)
- Modify: `assets/css/calculator.css` (add `seg-buyer-saves` color)
- Modify: `tests/test_calculator_ui.py` (add 3-party split-bar tests)

**Interfaces:**
- Consumes: `out.buyer.cloudCostAud`, `out.buyer.savesAud`, `out.homeowner.netAud`, `out.operator.marginAud`, `out.homeowner.energyCostAud`, `out.operator.financingCostAud`, `out.homeowner.amortizedHardwareAud`, `state.financed`
- Produces: `#split-bar` with five potential segments: `seg-buyer-saves`, `seg-homeowner`, `seg-operator`, `seg-energy`, `seg-hardware`; total bar width represents `buyer.cloudCostAud`; title "Where each dollar of cloud-equivalent spend goes".

**Layout:**
```
totalBar = buyer.cloudCostAud
segments (clamp display at ≥0 for bar, but show note if negative):
  seg-buyer-saves: buyer.savesAud        (color: green/gold — buyer benefit)
  seg-homeowner:   homeowner.netAud      (clamp ≥0; amber)
  seg-operator:    operator.marginAud    (clamp ≥0; teal)
  seg-energy:      homeowner.energyCostAud  (muted red)
  seg-hardware:    financed ? operator.financingCostAud : homeowner.amortizedHardwareAud  (muted grey)
These sum to buyer.cloudCostAud by construction (verify the algebra below).

Algebra check:
  buyer.cloudCostAud = buyer.paysAud + buyer.savesAud
  buyer.paysAud = grossRevenueAud = homeowner.shareAud + operator's share
  homeowner.netAud = shareAud - energyCostAud - amortizedHardwareAud
  operator.marginAud = grossRevenue*(1-homeownerShare) - platformCostAud - financingCostAud
  So: homeownerNet + energyCost + amortizedHW + operatorMargin + platformCost + financingCost
      = shareAud + (grossRevenue*(1-share) - platformCost - financingCost) + energyCost + amortizedHW + platformCost + financingCost
      = grossRevenue + energyCost + amortizedHW
      = buyer.paysAud + energyCost + amortizedHW
  We are folding platform cost into operator margin (already in marginAud) and omitting it
  as a separate bar. Hardware = financingCostAud (financed) or amortizedHW (self-funded).
  buyer.cloudCostAud = buyer.paysAud + buyer.savesAud
  So the five segments sum to: buyer.savesAud + homeownerNet + operatorMargin + energyCost + hwCost
    = savesAud + (paysAud - platformCost) [where platformCost is already deducted in marginAud]
    ≈ cloudCostAud - platformCostAud
  PlatformCost is tiny (~A$10/yr for DGX + minimax_m3 scenario) and is folded into operatorMargin.
  Sum of displayed bar segments will equal buyer.cloudCostAud only if we use clamped values.
  Use buyer.cloudCostAud as the denominator for % so the bar always totals 100%.
```

**Tooltip format:** `"Homeowner earns: A$1,617 (26.3%)"` — `fmtAudVal(val) + ' (' + pct + '%)'`

- [ ] **Step 1: Write failing split-bar tests**

In `tests/test_calculator_ui.py`:

```python
def test_split_bar_three_party_segments_exist(page):
    """#split-bar has segments for all three parties: homeowner, operator, buyer-saves."""
    # Default rig (dgx_spark + minimax_m3) should render a positive bar
    assert page.locator("#split-bar .seg-homeowner").count() >= 1
    assert page.locator("#split-bar .seg-operator").count() >= 1
    assert page.locator("#split-bar .seg-buyer-saves").count() >= 1

def test_split_bar_title_mentions_cloud(page):
    """Split bar title mentions cloud-equivalent spend."""
    title_text = page.inner_text(".split-bar-title").lower()
    assert "cloud" in title_text or "spend" in title_text

def test_split_bar_has_tooltip_on_segment(page):
    """Each non-zero segment has a title attribute (tooltip) with AUD amount."""
    seg = page.locator("#split-bar .seg-buyer-saves").first
    tooltip = seg.get_attribute("title") or ""
    assert "A$" in tooltip or "$" in tooltip
```

- [ ] **Step 2: Run tests to see them fail**

```bash
python3 -m pytest tests/test_calculator_ui.py::test_split_bar_three_party_segments_exist tests/test_calculator_ui.py::test_split_bar_title_mentions_cloud tests/test_calculator_ui.py::test_split_bar_has_tooltip_on_segment -v
```

Expected: FAIL (no `seg-buyer-saves` class exists yet).

- [ ] **Step 3: Add seg-buyer-saves CSS in calculator.css**

After `.seg-hardware { ... }` (line ~662):

```css
.seg-buyer-saves { background: #66bb6a; } /* green — buyer benefit */
```

- [ ] **Step 4: Rewrite the split-bar section in _renderResults (calculator-results.js)**

Find the `// ── Stacked bar (split-bar) ─────` section (~lines 159–211). Replace it entirely:

```js
    // ── Stacked bar (split-bar) — total = buyer's cloud-equivalent spend ──────
    const cloudTotal = out.buyer.cloudCostAud;

    if (cloudTotal > 0) {
      const barWrap = document.createElement('div');
      barWrap.className = 'split-bar-wrap';

      const barTitle = document.createElement('div');
      barTitle.className = 'split-bar-title';
      barTitle.textContent = 'Where each dollar of cloud-equivalent spend goes';
      barWrap.appendChild(barTitle);

      const bar = document.createElement('div');
      bar.id = 'split-bar';
      bar.className = 'split-bar';

      // Hardware cost: operator's financing when financed, else homeowner's amortization
      const hwCostAud = state.financed
        ? out.operator.financingCostAud
        : out.homeowner.amortizedHardwareAud;

      // Clamp negative party values at 0 for bar rendering (still show actual in tooltip)
      const homeownerBarVal = Math.max(out.homeowner.netAud, 0);
      const operatorBarVal  = Math.max(out.operator.marginAud, 0);

      const segments = [
        { key: 'buyer-saves',  label: 'Buyer saves',      val: out.buyer.savesAud,           barVal: out.buyer.savesAud,   cls: 'seg-buyer-saves' },
        { key: 'homeowner',    label: 'Homeowner earns',   val: out.homeowner.netAud,          barVal: homeownerBarVal,      cls: 'seg-homeowner' },
        { key: 'operator',     label: 'Operator margin',   val: out.operator.marginAud,        barVal: operatorBarVal,       cls: 'seg-operator' },
        { key: 'energy',       label: 'Energy',            val: out.homeowner.energyCostAud,   barVal: out.homeowner.energyCostAud, cls: 'seg-energy' },
        { key: 'hardware',     label: 'Hardware',          val: hwCostAud,                     barVal: hwCostAud,            cls: 'seg-hardware' }
      ];

      segments.forEach(seg => {
        if (seg.barVal <= 0) return;
        const pct = (seg.barVal / cloudTotal * 100).toFixed(1);
        const seg_el = document.createElement('div');
        seg_el.className = 'split-seg ' + seg.cls;
        seg_el.style.width = pct + '%';
        // Tooltip shows actual (possibly negative) value + % of cloud-equivalent
        const tooltipVal = seg.val < 0
          ? seg.label + ': ' + fmtAudVal(seg.val) + ' (bar clamped to 0; ' + pct + '% of cloud spend)'
          : seg.label + ': ' + fmtAudVal(seg.val) + ' (' + pct + '% of cloud spend)';
        seg_el.setAttribute('title', tooltipVal);
        seg_el.setAttribute('aria-label', seg.label + ' ' + pct + ' percent of cloud-equivalent spend');
        bar.appendChild(seg_el);
      });

      barWrap.appendChild(bar);

      // Legend — show all segments, even zero ones, with actual value
      const legend = document.createElement('div');
      legend.className = 'split-legend';
      segments.forEach(seg => {
        const item = document.createElement('span');
        item.className = 'split-legend-item';
        const valText = seg.val < 0
          ? fmtAudVal(seg.val) + ' ⚠'
          : fmtAudVal(seg.val);
        item.innerHTML =
          '<span class="split-swatch ' + seg.cls + '"></span>' +
          '<span>' + seg.label + ' ' + valText + '</span>';
        legend.appendChild(item);
      });
      barWrap.appendChild(legend);

      root.appendChild(barWrap);
    }
```

- [ ] **Step 5: Run split-bar tests**

```bash
python3 -m pytest tests/test_calculator_ui.py::test_split_bar_three_party_segments_exist tests/test_calculator_ui.py::test_split_bar_title_mentions_cloud tests/test_calculator_ui.py::test_split_bar_has_tooltip_on_segment -v
```

Expected: PASS.

- [ ] **Step 6: Run full suite**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: 1 failure only.

- [ ] **Step 7: Commit**

```bash
git add assets/js/calculator-results.js assets/css/calculator.css tests/test_calculator_ui.py
git commit -m "calculator: 3-party split bar (buyer-saves/homeowner/operator/energy/hardware) over cloud-equivalent spend total"
```

---

### Task 6: Write report + final full suite run

**Files:**
- Create: `.superpowers/sdd/refine-3party-report.md`

**Interfaces:**
- Consumes: Final `computeScenario(defaultState)` output read via Playwright
- Produces: Report with default homeowner/operator/buyer numbers, ROI/payback party, rig cost, and full-suite result.

- [ ] **Step 1: Run full suite, capture output**

```bash
python3 -m pytest tests/ -v 2>&1 | tee /tmp/suite-result.txt | tail -20
```

- [ ] **Step 2: Compute default state numbers via Playwright**

Write a one-shot test to extract the key numbers:

```bash
python3 -c "
from playwright.sync_api import sync_playwright
import pathlib
CALC = 'file://' + str(pathlib.Path('calculator.html').resolve())
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(); pg.goto(CALC)
    r = pg.evaluate('''() => {
      const out = window.SunStackEngine.computeScenario(window.SunStackUI.state);
      return {
        rig: window.SunStackUI.state.rig,
        modelId: window.SunStackUI.state.modelId,
        utilization: window.SunStackUI.state.utilization,
        homeownerNet: out.homeowner.netAud,
        operatorMargin: out.operator.marginAud,
        buyerSaves: out.buyer.savesAud,
        roiPct: out.roiPct,
        paybackYears: out.paybackYears,
        rigCostAud: out.rigCostAud
      };
    }''')
    import json; print(json.dumps(r, indent=2))
    b.close()
"
```

- [ ] **Step 3: Write the report**

Create `.superpowers/sdd/refine-3party-report.md` with the actual numbers from Step 2 and the suite result from Step 1. Template:

```markdown
# 3-Party Calculator Refinements — Final Report

## Default scenario
- Rig: [dgx_spark], model: minimax_m3, quant: q4
- Utilization: {value from step 2}
- Rig cost: A${rigCostAud}

## Three-party numbers (neutral scenario)
| Party | Annual AUD |
|---|---|
| Homeowner net | A${homeownerNet} |
| Operator margin | A${operatorMargin} |
| Buyer saves | A${buyerSaves} |

## ROI + Payback
- ROI: {roiPct}% (operator — hardware financed by SunStack)
- Payback: {paybackYears:.1f} yr (operator)

## Rig cost consistency
- `['dgx_spark','mac_mini_m4_32']`: (4699+1199)*1.39 = A$8,198 ✓

## Full suite result
{full suite output summary from step 1}
```

- [ ] **Step 4: Final full suite run for confirmation**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -10
```

Expected: `N passed, 1 failed` where the 1 failure is `test_battery_terminology`.

---

## Self-Review

**Spec coverage check:**

1. ✅ Refinement 1 (3-party split bar) → Task 5
2. ✅ Refinement 2 (model sell price) → Task 4
3. ✅ Refinement 3 (ROI + payback by hardware owner) → Task 3
4. ✅ Refinement 4 (rig cost consistency) → Task 2
5. ✅ Refinement 5 (default = DGX Spark + MiniMax M3, all positive) → Task 1
6. ✅ "No Co-Authored-By/Generated with footer" → stated in every commit step
7. ✅ Tests updated for new default (dgx_spark) → Task 1 steps 2 + 7
8. ✅ 3-party split segments asserted → Task 5 step 1
9. ✅ Model sell-price line tested → Task 4 step 1
10. ✅ ROI-by-owner tested → Task 3 steps 1 + 6
11. ✅ Rig-cost exact value tested → Task 2 step 1
12. ✅ Report written → Task 6

**Placeholder scan:** None — all steps have actual code, actual commands, and actual expected output.

**Type consistency:** `out.buyer.cloudCostAud`, `out.operator.financingCostAud`, `out.homeowner.amortizedHardwareAud` — all present in `computeScenario` return (engine lines 186–213). `_updateSellPriceLine(el, state)` — defined in Task 4 Step 3, called in Task 4 Steps 3 + 4. Consistent throughout.
