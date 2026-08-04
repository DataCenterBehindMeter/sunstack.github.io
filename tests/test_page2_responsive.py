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
