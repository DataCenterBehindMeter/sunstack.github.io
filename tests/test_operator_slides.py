import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PAGE_URL = (ROOT / "index.html").as_uri()
VIEWPORTS = (
    {"width": 1440, "height": 900},
    {"width": 390, "height": 844},
)


class OperatorSlideTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def test_operator_images_have_separate_responsive_slides(self):
        for viewport in VIEWPORTS:
            with self.subTest(viewport=viewport):
                page = self.browser.new_page(viewport=viewport)
                try:
                    page.goto(PAGE_URL)
                    self.assertEqual(page.locator(".tile").count(), 16)

                    dispatch = page.locator(
                        'img[src="assets/shots/dispatch-scheduling.png"]'
                    )
                    energy = page.locator('img[src="assets/shots/energy.png"]')
                    self.assertEqual(
                        dispatch.locator("xpath=ancestor::section[1]").get_attribute(
                            "id"
                        ),
                        "tile-9",
                    )
                    self.assertEqual(
                        energy.locator("xpath=ancestor::section[1]").get_attribute("id"),
                        "tile-10",
                    )

                    for image in (dispatch, energy):
                        page.wait_for_function(
                            "element => element.complete", image.element_handle()
                        )
                        metrics = image.evaluate(
                            """element => {
                                const box = element.getBoundingClientRect();
                                const tile = element.closest('.tile');
                                return {
                                    renderedRatio: box.width / box.height,
                                    naturalRatio: element.naturalWidth / element.naturalHeight,
                                    renderedWidth: box.width,
                                    tileClientWidth: tile.clientWidth,
                                    tileScrollWidth: tile.scrollWidth,
                                };
                            }"""
                        )
                        self.assertAlmostEqual(
                            metrics["renderedRatio"],
                            metrics["naturalRatio"],
                            places=2,
                        )
                        self.assertLessEqual(
                            metrics["tileScrollWidth"], metrics["tileClientWidth"]
                        )
                        if viewport["width"] == 1440:
                            self.assertGreater(metrics["renderedWidth"], 1000)
                finally:
                    page.close()

    def test_chapter_navigation_uses_shifted_slide_numbers(self):
        page = self.browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            page.goto(PAGE_URL)
            self.assertIn("/ 16", page.locator("#counter").inner_text())

            page.get_by_role("button", name="Go to section: Who wins").click()
            page.wait_for_function(
                "document.querySelector('#counter').innerText.includes('12 / 16')"
            )

            page.get_by_role("button", name="Go to section: The plan").click()
            page.wait_for_function(
                "document.querySelector('#counter').innerText.includes('15 / 16')"
            )
        finally:
            page.close()


if __name__ == "__main__":
    unittest.main()
