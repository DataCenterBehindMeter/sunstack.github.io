# Battery Artwork and Terminology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible home battery to the page-2 value-flow illustration, update SunStack power-source copy to solar/battery, retain solar-only facts, and deploy the verified deck.

**Architecture:** Extend the static regression suite to lock the copy boundary and image prompt before changing production files. Update user-facing HTML and repository description semantically, update only the value-flow generation prompt, regenerate only that asset, then reuse the responsive browser suite locally and against GitHub Pages.

**Tech Stack:** Static HTML/CSS/JavaScript, Python 3.10 `unittest`, OpenAI Python SDK, `gpt-image-2-2026-04-21`, Playwright/Chromium, GitHub Pages.

## Global Constraints

- Page 2 must begin: `A small solar/battery-powered computer in a home does AI work for someone who needs it.`
- SunStack power-source descriptions use `solar/battery`.
- Solar export tariffs, rooftop-solar adoption statistics, and descriptions of visibly solar-only panels or roofs remain solar-only.
- Only `assets/img/value-flow.png` is regenerated.
- The value-flow artwork remains text-free, 1536 × 1024, and uses the existing four-step composition and visual style.
- Preserve the tested page-2 3:2 rendered ratio, light-surface label contrast, and responsive behavior.
- Preserve the user's uncommitted page-8 video CSS changes.

---

### Task 1: Lock the terminology and artwork prompt requirements

**Files:**
- Create: `tests/test_battery_terminology.py`
- Read: `index.html`
- Read: `README.md`
- Read: `tools/generate_images.py`

**Interfaces:**
- Consumes: repository text files.
- Produces: static regression checks runnable with `python3 -m unittest tests/test_battery_terminology.py -v`.

- [ ] **Step 1: Write the failing static tests**

```python
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class BatteryTerminologyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text()
        cls.readme = (ROOT / "README.md").read_text()
        cls.generator = (ROOT / "tools" / "generate_images.py").read_text()

    def test_page2_uses_requested_power_source_copy(self):
        self.assertIn(
            "A small solar/battery-powered computer in a home does AI work for someone who needs it.",
            self.html,
        )
        self.assertIn("<h4>Rooftop solar/battery</h4>", self.html)

    def test_sunstack_descriptions_use_solar_battery(self):
        for phrase in (
            "rooftop-solar/battery surplus",
            "solar/battery-powered GPUs",
            "spare solar/battery energy",
            "spare rooftop solar/battery energy",
            "Solar/battery-aware scheduling",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.html + self.readme)

    def test_solar_only_facts_remain_accurate(self):
        for phrase in (
            "paid for the solar you export at midday",
            "Most solar homes % on Earth",
            "has rooftop solar",
            "solar roof behind",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.html)

    def test_node_uses_home_internet_copy(self):
        self.assertIn("Home Internet.", self.html)
        self.assertNotIn("Its own internet.", self.html)

    def test_value_flow_prompt_requires_a_home_battery(self):
        self.assertIn("compact wall-mounted home battery", self.generator)
        self.assertIn("beside the house", self.generator)
```

- [ ] **Step 2: Run the test to verify it fails for missing solar/battery copy and battery prompt**

Run: `python3 -m unittest tests/test_battery_terminology.py -v`

Expected: `FAIL` in the page-2 copy, product-description, and value-flow prompt tests; the solar-only facts test passes.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/test_battery_terminology.py
git commit -m "test: lock battery artwork and terminology"
```

### Task 2: Update copy and generation tooling

**Files:**
- Modify: `index.html`
- Modify: `README.md`
- Modify: `tools/generate_images.py`
- Test: `tests/test_battery_terminology.py`

**Interfaces:**
- Consumes: existing deck copy and the `FIGURES` entry named `value-flow.png`.
- Produces: semantically updated user-facing copy and a reproducible battery-aware value-flow prompt.

- [ ] **Step 1: Update SunStack power-source copy**

Make these semantic replacements in `index.html`:

- `rooftop-solar surplus` → `rooftop-solar/battery surplus`
- `solar-powered GPUs` → `solar/battery-powered GPUs`
- `rooftop-solar` in the cover description → `rooftop-solar/battery`
- page-2 lead → the exact requested sentence followed by its unchanged remaining sentences
- page-2 alt text and flow heading → `Rooftop solar/battery`
- `spare solar` in SunStack operating/input descriptions → `spare solar/battery energy`
- `spare rooftop solar` in the income description → `spare rooftop solar/battery energy`
- `Solar-aware scheduling` → `Solar/battery-aware scheduling`
- page-4 card-01 title → the exact text `Most solar homes % on Earth`
- node-slide sentence `Its own internet.` → the exact text `Home Internet.`

Keep the identified solar-only facts and visual descriptions unchanged. Update the one-line README description to `rooftop-solar/battery surplus`.

- [ ] **Step 2: Update only the value-flow generation prompt**

Change the first scene in `tools/generate_images.py` to require:

```python
"small sunny pitched-roof house with solar panels and a recognizable compact "
"wall-mounted home battery installed beside the house, (2) a small matte "
```

Keep the remaining compute-box, network, laptop, style, no-text, model, size, and quality instructions unchanged.

- [ ] **Step 3: Run the terminology regression test**

Run: `python3 -m unittest tests/test_battery_terminology.py -v`

Expected: four tests pass with `OK`.

- [ ] **Step 4: Commit copy and tooling**

```bash
git add index.html README.md tools/generate_images.py
git commit -m "feat: add battery to SunStack energy story"
```

### Task 3: Regenerate and validate the page-2 asset

**Files:**
- Modify: `assets/img/value-flow.png`
- Verify: `tools/generate_images.py`

**Interfaces:**
- Consumes: the updated `value-flow.png` prompt and the parent `.env` API key.
- Produces: a 1536 × 1024 PNG containing the requested home battery.

- [ ] **Step 1: Regenerate only the value-flow asset**

Run: `python3 tools/generate_images.py --force value-flow`

Expected: `value-flow.png` reports `OK`, and the summary reports `Done: 1/1 succeeded`.

- [ ] **Step 2: Verify asset dimensions**

Run: `sips -g pixelWidth -g pixelHeight assets/img/value-flow.png`

Expected: `pixelWidth: 1536` and `pixelHeight: 1024`.

- [ ] **Step 3: Inspect the image visually**

Confirm the first scene visibly includes a compact home battery beside the solar house; the compute box, networked homes, laptop, amber connections, parchment background, and absence of text/logos remain intact.

- [ ] **Step 4: Commit the regenerated asset**

```bash
git add assets/img/value-flow.png
git commit -m "assets: regenerate value flow with home battery"
```

### Task 4: Verify and deploy

**Files:**
- Test: `tests/test_battery_terminology.py`
- Test: `tests/test_page2_responsive.py`
- Verify: GitHub Pages URL `https://datacenterbehindmeter.github.io/sunstack.github.io/`

**Interfaces:**
- Consumes: all implementation commits on local `main`.
- Produces: verified content on `origin/main` and the public GitHub Pages site.

- [ ] **Step 1: Run all repository regression tests and static validation**

Run: `python3 -m unittest discover -s tests -v && git diff --check`

Expected: all tests pass, no diff-check output, and exit code `0`.

- [ ] **Step 2: Verify the outgoing commit set excludes the uncommitted page-8 CSS edit**

Run: `git status --short && git log --oneline origin/main..HEAD && git diff -- assets/css/styles.css`

Expected: the page-8 CSS edit remains unstaged; outgoing commits contain the page-2 and battery work only.

- [ ] **Step 3: Push `main`**

Run: `git push origin main`

Expected: push succeeds without force.

- [ ] **Step 4: Wait for Pages and verify the public site**

Poll `gh api repos/DataCenterBehindMeter/sunstack.github.io/pages --jq '{status,html_url,source}'` until `status` is `built`, then run the two regression suites against the public URL and visually inspect page 2 at desktop and mobile widths.

Expected: public copy, image, aspect ratio, contrast, and responsive behavior match the local verified result.
