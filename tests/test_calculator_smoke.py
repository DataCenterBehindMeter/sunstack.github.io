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
