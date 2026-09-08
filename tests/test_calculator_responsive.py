import pathlib
import pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")


@pytest.fixture()
def page():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        yield pg
        b.close()


def test_mobile_layout_no_overflow(page):
    """At 390px wide, adding a device must not cause horizontal scroll."""
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(CALC)
    page.click("button[data-add-device='dgx_spark']")
    sw = page.evaluate("() => document.documentElement.scrollWidth")
    cw = page.evaluate("() => document.documentElement.clientWidth")
    assert sw <= cw + 1, f"Horizontal overflow: scrollWidth={sw} > clientWidth={cw}"


def test_controls_are_labelled(page):
    """Every range input and select must have aria-label or an associated <label>."""
    page.goto(CALC)
    page.click("button[data-add-device='dgx_spark']")
    unlabelled = page.evaluate(
        """() => [...document.querySelectorAll('input[type=range],select')]
          .filter(el => !el.getAttribute('aria-label') && !(el.labels && el.labels.length)).length"""
    )
    assert unlabelled == 0, f"{unlabelled} range/select element(s) lack a label"
