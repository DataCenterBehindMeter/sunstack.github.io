# Page 2 Responsive Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the page-2 value-flow image's native 3:2 aspect ratio, restore readable label contrast, retain responsive behavior, and publish the verified result to GitHub Pages.

**Architecture:** Add a focused Playwright regression test that loads the static deck at representative viewport sizes and checks rendered geometry, computed colors, and horizontal overflow. Implement the correction entirely through `#tile-2` CSS overrides so shared media and other slides cannot regress.

**Tech Stack:** Static HTML/CSS/JavaScript, Python 3.10, Playwright for Python, Chromium, Git, GitHub Pages.

## Global Constraints

- Preserve the source image's native 1536 × 1024 (3:2) aspect ratio at every viewport size.
- Use `--ink` for flow-step headings and `--body` for supporting copy on page 2.
- Preserve the amber dots and dashed connectors.
- Keep all implementation overrides scoped below `#tile-2`.
- Preserve the existing four-to-two-column breakpoint at 720px.
- Do not modify the user's existing page-8 video sizing changes.

---

### Task 1: Add the page-2 responsive regression test

**Files:**
- Create: `tests/test_page2_responsive.py`
- Read: `index.html:79-98`
- Read: `assets/css/styles.css:137-160`
- Read: `assets/css/styles.css:395-409`

**Interfaces:**
- Consumes: `index.html` loaded through a local `file:` URL and the existing `#tile-2` selectors.
- Produces: a `unittest` regression suite runnable with `python3 -m unittest tests/test_page2_responsive.py -v`.

- [ ] **Step 1: Write the failing browser test**

```python
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PAGE_URL = (ROOT / "index.html").as_uri()
VIEWPORTS = (
    {"width": 1440, "height": 900},
    {"width": 768, "height": 1024},
    {"width": 390, "height": 844},
)


class Page2ResponsiveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def test_page2_media_and_labels_remain_responsive(self):
        for viewport in VIEWPORTS:
            with self.subTest(viewport=viewport):
                page = self.browser.new_page(viewport=viewport)
                try:
                    page.goto(PAGE_URL)
                    image = page.locator("#tile-2 .figure img")
                    image.wait_for(state="attached")
                    page.wait_for_function(
                        "document.querySelector('#tile-2 .figure img').complete"
                    )

                    metrics = image.evaluate(
                        """element => {
                            const box = element.getBoundingClientRect();
                            return {
                                renderedRatio: box.width / box.height,
                                naturalRatio: element.naturalWidth / element.naturalHeight,
                            };
                        }"""
                    )
                    self.assertAlmostEqual(
                        metrics["renderedRatio"], metrics["naturalRatio"], places=2
                    )
                    tile_metrics = page.locator("#tile-2").evaluate(
                        "element => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })"
                    )
                    self.assertLessEqual(
                        tile_metrics["scrollWidth"], tile_metrics["clientWidth"]
                    )
                    self.assertEqual(
                        page.locator("#tile-2 .flowstep h4").first.evaluate(
                            "element => getComputedStyle(element).color"
                        ),
                        "rgb(22, 20, 15)",
                    )
                    self.assertEqual(
                        page.locator("#tile-2 .flowstep p").first.evaluate(
                            "element => getComputedStyle(element).color"
                        ),
                        "rgb(68, 65, 58)",
                    )
                finally:
                    page.close()


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify the current page fails**

Run: `python3 -m unittest tests/test_page2_responsive.py -v`

Expected: `FAIL`; at desktop width the rendered image ratio is about `3.11` rather than `1.50`, and the current label colors are `rgb(255, 255, 255)` / `rgb(179, 171, 156)`.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add tests/test_page2_responsive.py
git commit -m "test: cover page 2 responsive media"
```

### Task 2: Correct page-2 image sizing and label contrast

**Files:**
- Modify: `assets/css/styles.css:153-154`
- Modify: `assets/css/styles.css:400-403`
- Test: `tests/test_page2_responsive.py`

**Interfaces:**
- Consumes: the page-2 markup IDs/classes and existing `--ink` / `--body` color tokens.
- Produces: page-scoped CSS that preserves intrinsic image dimensions and readable light-surface labels.

- [ ] **Step 1: Implement intrinsic page-2 image sizing**

Replace the page-2 rules with:

```css
#tile-2 .figure { width: fit-content; max-width: 100%; margin-inline: auto; }
#tile-2 .figure img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 30vh;
  margin-inline: auto;
}
```

- [ ] **Step 2: Implement light-surface label colors**

Add page-scoped overrides after the shared flow-step color rules:

```css
#tile-2 .flowstep h4 { color: var(--ink); }
#tile-2 .flowstep p { color: var(--body); }
```

- [ ] **Step 3: Run the focused regression test**

Run: `python3 -m unittest tests/test_page2_responsive.py -v`

Expected: `OK`; all three viewports preserve a rendered ratio of `1.50`, use the expected computed colors, and have no horizontal overflow.

- [ ] **Step 4: Run static validation**

Run: `git diff --check`

Expected: no output and exit code `0`.

- [ ] **Step 5: Commit the CSS correction**

```bash
git add assets/css/styles.css
git commit -m "fix: preserve page 2 media proportions"
```

### Task 3: Publish and verify GitHub Pages

**Files:**
- Verify: repository `main` branch and GitHub Pages deployment at `https://datacenterbehindmeter.github.io/sunstack.github.io/`

**Interfaces:**
- Consumes: verified commits on local `main` and the existing `origin` remote.
- Produces: the same commits on `origin/main` and a public Pages deployment serving the corrected CSS.

- [ ] **Step 1: Verify the branch and outgoing commits**

Run: `git status --short && git branch --show-current && git log --oneline origin/main..HEAD`

Expected: only intentional state is present, branch is `main`, and the page-2 commits are listed.

- [ ] **Step 2: Push the verified commits**

Run: `git push origin main`

Expected: `main -> main` succeeds.

- [ ] **Step 3: Wait for the Pages deployment to finish**

Run repeatedly until `status` is `built`:

```bash
gh api repos/DataCenterBehindMeter/sunstack.github.io/pages \
  --jq '{status,html_url,source}'
```

Expected: `status` is `built`, `source.branch` is `main`, and `source.path` is `/`.

- [ ] **Step 4: Verify the public CSS and page**

Run a Playwright browser check against `https://datacenterbehindmeter.github.io/sunstack.github.io/` using the same geometry, color, and overflow assertions from Task 1.

Expected: all assertions pass at 1440 × 900, 768 × 1024, and 390 × 844.
