# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The **SunStack pitch-deck website** — a static site deployed to GitHub Pages
(`DataCenterBehindMeter/sunstack.github.io`, branch `main`, project-site URL
`https://datacenterbehindmeter.github.io/sunstack.github.io/`). It contains **two zero-build
vanilla HTML/CSS/JS apps** that share the brand stylesheet:

1. **The deck** (`index.html`) — a scroll-snap slide deck (currently **16** full-viewport
   `<section class="tile">` tiles) for a university senior-management panel. Behaviour in
   `assets/js/deck.js`; design tokens + layout in `assets/css/styles.css`.
2. **The revenue calculator** (`calculator.html`) — an interactive, source-cited model of
   what a household earns hosting SunStack compute (three parties: homeowner / operator /
   buyer). Four JS modules under `assets/js/calculator-*.js` + `assets/css/calculator.css`.
   Linked from the deck's "business model" tile.

There is **no build step, no bundler, no npm** for the site itself — files are served as-is.
The only tooling is Python (Playwright tests + the image generator).

## Commands

```bash
# Serve locally (run from website/). Use a server, not file://, so fonts/videos load.
python3 -m http.server 8080          # → http://localhost:8080 (deck) and /calculator.html

# Tests — Playwright + pytest. RUN FROM website/ (tests resolve paths relative to the repo root).
python3 -m pytest tests/ -q                                   # whole suite
python3 -m pytest tests/test_calculator_engine.py -v          # one file
python3 -m pytest tests/test_calculator_ui.py::test_add_device_updates_summary_and_svg  # one test

# Regenerate deck illustrations (paid OpenAI gpt-image-2; reads OPENAI_API_KEY from ../.env).
python3 tools/generate_images.py                 # only fills MISSING images
python3 tools/generate_images.py --force cover-hero   # redo one by name
```

There is no lint step for the site. Tests are the gate.

### Known pre-existing test failure (not yours to "fix")
`tests/test_battery_terminology.py::test_network_explains_battery_mitigation` **fails on
`main`** — it asserts a line of deck copy ("Home batteries smooth those gaps even further.")
that was removed when the deck went plain-language. A green run is therefore **"all pass
except that one."** Don't chase it unless explicitly asked; it's a stale test, not a regression.

## How the tests work (important)

Tests are **Playwright-Python loading the real static files over `file://`** (no server).
Newer test files use `CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")`
so they're CWD-independent. The calculator's engine is **unit-tested through the browser**:
tests call `page.evaluate("() => window.SunStackEngine.computeScenario(state)")` etc. against
the globals the modules expose. So the engine must stay pure and reachable on `window`.

## Deck architecture (`index.html` + `deck.js`)

- Each slide is `<section class="tile" id="tile-N" data-surface="dark|light">`. `deck.js`
  reads all `.tile`s, drives keyboard/scroll nav, a progress bar, a **slide counter**
  (`NN / <total>`, total = live `.tile` count), reveal-on-enter via IntersectionObserver,
  `data-count` number animations, and a video lightbox.
- **The chapter stepper is driven by the `SECTIONS` array at the top of `deck.js`** — each
  entry is `{ name, start }` where `start` is the 1-based tile number that chapter begins on.
  **Inserting/removing/reordering a tile means renumbering all following `id="tile-N"` AND
  updating `SECTIONS` starts.** `tests/test_operator_slides.py` hard-asserts the tile count
  (16) and that clicking a chapter lands on a specific counter value — it will catch drift.
- Copy/number changes live in `index.html`. Brand tokens (`--amber #e8932a`, `--ink`,
  `--parchment`, `--dark-2`, `--teal` secondary data hue, `--r-*`, `--shadow-soft`, `--ease`)
  live in `styles.css` and are reused by the calculator — **use tokens, not raw hex.**

## Calculator architecture (`calculator.html` + `calculator-*.js`)

Load order in `calculator.html` matters: `calculator-data.js` → `calculator-engine.js` →
`calculator-ui.js` → `calculator-results.js`. Each attaches a global; later files extend it.

- **`calculator-data.js` → `window.SunStackData`** — the cited dataset: `DEVICES`, `MODELS`
  (each with `minGbQ4`, `activeParamsB`, `priceOutUsdPerM`, `multimodal`), `ENERGY_PRESETS`,
  `INPUT_DEFAULTS` (the uncertainty sliders, each with `value/low/high/polarity`), `SOURCES`,
  `cite()`, and constants `FX_AUD_PER_USD` (1.39), `QUANT_BYTES`, `HARDWARE_LIFETIME_YEARS`.
  **Every default must trace to a source** in `docs/superpowers/specs/research-dataset.md` /
  `models-research.json`; add a `SOURCES` entry with a real URL — never invent numbers.
- **`calculator-engine.js` → `window.SunStackEngine`** — pure math, no DOM. Key model:
  - Throughput is **memory-bandwidth-bound**, not a lookup table:
    `singleStream ≈ EFF(0.6) · device.memBandwidthGbs / (model.activeParamsB · QUANT_BYTES[quant])`
    (this is why MoE models with few active params are fast). Served/revenue throughput =
    `singleStream × batchGain(concurrency)` (`c^0.7`, sublinear), summed over rig devices that
    each fit the model (replicas) or `× poolEfficiency` if the model only fits pooled.
  - Money computed in **AUD**: USD device/token prices convert via `FX_AUD_PER_USD`; energy
    tariffs are AUD c/kWh. Pricing identity: `sunstackPrice = model.price × (1−undercut)`,
    `cloudPrice = model.price`, so **`buyer.savePct == undercut`**.
  - Three-party outputs: `homeowner.netAud`, `operator.marginAud`, `buyer.savesAud`.
    `financed=true` moves hardware amortization from the homeowner to the operator; ROI &
    payback refer to whichever party owns the hardware.
  - Presets (`applyPreset`) swing only `INPUT_DEFAULTS` (uncertainty) inputs by `polarity`;
    strategy/config inputs (rig, model, undercut, share, financed, concurrency, energyMix)
    are held.
- **`calculator-ui.js` → `window.SunStackUI`** — owns `state` (the single source of truth)
  and the render loop. **Critical split (do not collapse it):**
  - `renderStructure()` rebuilds the rig-builder + `#panels` (catalog, selects, sliders).
    Call on structural changes: add/remove device, model/quant change, preset, financed.
  - `renderOutputs()` recomputes and repaints results/charts/summary + slider *value labels*
    **without recreating the slider DOM**.
  - **Slider `input` handlers call `renderOutputs()` only** — calling the full rebuild there
    destroys the `<input>` mid-drag and makes sliders undraggable. This was a real bug; keep
    the separation.
- **`calculator-results.js`** — attaches `_renderResults` (headline cards + the 3-party
  "where each dollar of cloud-equivalent spend goes" split bar, hand-SVG). The old
  "Sensitivity & Break-even" charts and the uPlot dependency were removed — **the site has no
  external runtime JS dependencies.**

## Conventions & gotchas

- **Zero-build, relative asset paths, `.nojekyll`** — anything that breaks these breaks the
  GitHub Pages deploy. No absolute-rooted paths; no CDN runtime deps.
- **Deploy is a plain push to `main`** (Pages serves branch root). The repo is
  single-author; work is done on feature branches and merged to `main`.
- **Commits: `area: summary` imperative style, and NO `Co-Authored-By` / "Generated with
  Claude Code" trailer** (owner preference, enforced across this project).
- The deck deliberately uses **plain language** (senior-management audience); the calculator
  is **due-diligence rigorous** (every number cited, honest about thin margins).
- `docs/superpowers/specs/` holds the authoritative design spec + the audited research
  dataset behind the calculator's defaults; `docs/superpowers/plans/` holds the
  implementation plans. `.superpowers/` is git-ignored scratch.

The README covers viewing/presenting/deploy and the image generator in more detail; it
predates the calculator and still says "20 tiles" (now 16) — trust this file for architecture.
