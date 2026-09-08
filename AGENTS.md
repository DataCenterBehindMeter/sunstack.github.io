# Repository guidance

## Project and layout

SunStack is a static pitch-deck website and household compute revenue calculator.
Both apps use vanilla HTML, CSS, and JavaScript, served directly without a build
step, bundler, npm, or external runtime JavaScript dependencies.

- `index.html`: slide copy and markup for the pitch deck (currently 16 tiles).
- `assets/js/deck.js`: chapter navigation, keyboard controls, progress, counters,
  reveal animations, and video lightbox.
- `assets/css/styles.css`: shared brand tokens and deck layout.
- `calculator.html`: calculator entry point; `assets/css/calculator.css` styles it.
- `assets/js/calculator-*.js`: calculator data, pure engine, UI, and results.
- `tests/`: Python tests, including Playwright browser tests and static assertions.
- `docs/superpowers/specs/`: design specs and the calculator's research datasets.
- `docs/superpowers/plans/`: implementation plans.
- `tools/generate_images.py`: illustration generation; other assets are checked in
  under `assets/fonts/`, `assets/img/`, `assets/shots/`, `assets/logos/`, and `assets/video/`.

`CLAUDE.md` provides additional project guidance. The README's 20-slide count and
deck-only file map are outdated; verify architecture against the current code.

## Local commands and validation

Run commands from the repository root (`website/`):

```bash
# Preview the deck at / and the calculator at /calculator.html.
python3 -m http.server 8080

# Full test suite.
python3 -m pytest tests/ -q

# Focused calculator tests.
python3 -m pytest tests/test_calculator_engine.py -v
python3 -m pytest tests/test_calculator_ui.py::test_add_device_updates_summary_and_svg
```

Tests require `pytest`, the Python `playwright` package, and Playwright Chromium.
There is no configured lint or build step. Run tests relevant to a code change;
use the full suite for changes shared by the deck and calculator. For visual
changes, also check desktop/mobile layout and affected interactions.

Browser tests load the actual HTML through `file://`; no local server is needed
for tests. Some tests resolve paths from the working directory, so run from the
repository root. For new tests, derive file URLs from `Path(__file__)`. Engine
tests use `page.evaluate()` to call `window.SunStackEngine`, so preserve its browser
API. Use the HTTP server for manual previews so fonts and videos load reliably.

`CLAUDE.md` records a pre-existing failure in
`tests/test_battery_terminology.py::BatteryTerminologyTests::test_network_explains_battery_mitigation`:
it expects the removed sentence “Home batteries smooth those gaps even further.”
Report this separately if encountered; do not restore old copy or change the test
unless the task calls for it. Do not assume other failures are part of that baseline.

## Deck changes

Slides are `.tile` sections with sequential `id="tile-N"` values and
`data-surface="dark|light"`. When inserting, removing, or reordering slides, update
subsequent IDs, chapter starts in the `SECTIONS` array in `deck.js`, and affected
tests. The displayed total is computed from the live tile count;
`tests/test_operator_slides.py` asserts the count and chapter destinations.

Keep deck copy plain and concise for a university senior-management audience.
Reuse CSS variables from `styles.css` (including `--amber`, `--ink`, `--parchment`,
and `--teal`) rather than introducing raw brand colors. Preserve keyboard
navigation, responsive media, and `prefers-reduced-motion` behavior.

## Calculator changes

Preserve script load order: `calculator-data.js` → `calculator-engine.js` →
`calculator-ui.js` → `calculator-results.js`.

- **Data:** `window.SunStackData` contains devices, models, energy presets,
  uncertainty defaults, constants, and citations. Trace defaults to
  `docs/superpowers/specs/research-dataset.md`, `research-dataset.json`, and
  `models-research.json` in that directory. Add real URLs to `SOURCES` when adding
  data; do not invent prices, benchmarks, or citations.
- **Engine:** `window.SunStackEngine` must remain pure and free of DOM access.
  Throughput depends on memory bandwidth, active model parameters, quantization,
  and sublinear batch gain. Preserve the distinction between devices that can
  each fit a model as replicas and models that only fit pooled memory.
- **Economics:** outputs use AUD; convert USD hardware/token prices with
  `FX_AUD_PER_USD`, and treat energy tariffs as AUD cents/kWh. Preserve
  `buyer.savePct == undercut`. With `financed=true`, the operator bears hardware
  amortization; hardware ROI/payback follows the owner. Scenario presets vary
  `INPUT_DEFAULTS` by polarity while holding strategy/configuration inputs fixed.
- **UI:** `window.SunStackUI.state` is the single source of truth.
  `renderStructure()` rebuilds controls for structural changes.
  `renderOutputs()` updates results and value labels without replacing controls.
  Slider `input` handlers must call only `renderOutputs()`; rebuilding the DOM
  mid-drag breaks sliders.
- **Results:** `calculator-results.js` extends the UI with `_renderResults` and
  renders headline cards and the three-party split using SVG. Keep calculations
  in the engine and present assumptions, sources, and thin margins honestly.

## Assets, deployment, and commits

Keep asset paths relative and retain `.nojekyll`: GitHub Pages serves the root of
`main` at `https://datacenterbehindmeter.github.io/sunstack.github.io/`. Root-absolute
paths break this project subpath. Work on feature branches; pushing merged changes
to `main` deploys the site.

Illustration generation calls a paid API and reads `OPENAI_API_KEY` from `../.env`.
Keep credentials out of the repository and regenerate selectively:

```bash
python3 tools/generate_images.py                    # Fill missing images only.
python3 tools/generate_images.py --force cover-hero  # Regenerate one illustration.
```

Match surrounding code style and keep changes focused. Use imperative commit
messages in `area: summary` form. Do not add `Co-Authored-By` or generated-by trailers.
