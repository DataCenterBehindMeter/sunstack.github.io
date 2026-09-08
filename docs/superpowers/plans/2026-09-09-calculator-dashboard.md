# Calculator Dashboard Implementation Plan

**Goal:** Deliver the approved light dashboard and dark equipment enclosure.
**Architecture:** Keep the current engine and state API. Rebuild calculator markup and styling; render rig illustrations through SVG and charts from engine outputs. Keep controls intact during input events.
**Tech stack:** Vanilla HTML/CSS/JS, local SVG, Python Playwright.

## Constraints

Calculator-only changes. No shared deck edits or dependencies. Preserve AUD economics and existing defaults. Work in calculator/dashboard-refresh, then merge only reviewed calculator changes to the shared workspace.

## Tasks

- [x] Add focused browser checks for exact chart accounting, negative returns, live summary updates without control replacement, large rigs, and narrow screens.
- [x] Build calculator.html dashboard regions: header, results, workspace with rig-builder and panels, charts, sources, references. Restyle assets/css/calculator.css using shared tokens.
- [x] Add device-family illustrations under assets/img/calculator/. Replace radial layout in calculator-ui.js with responsive numbered bays and orthogonal wiring. Recompute the rig summary in renderOutputs after model fallback; preserve focus and catalog scroll.
- [x] Update calculator-results.js to populate headline cards separately from charts. Include platform expenses and visible funding deficits. Generate 0–24 hour sensitivity samples via computeScenario({...state, activeHours: hour}) and show the current selection without mutating state.
- [x] Run python3 -m pytest tests/test_calculator_*.py -q. Check HTTP previews at 1440px, 1024px, 768px, 390px and 320px, including empty and 12-device rigs, preset changes, sliders and keyboard removal. Inspect screenshots; fix observed problems.
- [x] Review calculator-only diff, save screenshots, and commit the calculator changes and merge them into main in the shared workspace without changing its branch or deck edits.

## Validation

87 calculator tests pass. Playwright HTTP review passed at 1440, 1024, 768, 390 and 320 px, with continuous slider dragging, keyboard removal, 12-device rigs, zero/no-fit and negative-return states, reduced motion and local asset loading. Screenshots were visually inspected. Independent review identified mobile overflow for million-dollar results; responsive number sizing and a text-containment regression check address it.
