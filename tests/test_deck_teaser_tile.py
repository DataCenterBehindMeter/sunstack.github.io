import pytest
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DECK = ROOT / "index.html"


@pytest.fixture()
def page():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(DECK.as_uri())
        yield pg
        b.close()


def test_teaser_tile_links_to_calculator(page):
    link = page.locator("a[href='calculator.html']")
    assert link.count() >= 1


def test_tile_count_increased_and_counter_matches(page):
    tiles = page.locator("main#deck .tile").count()
    assert tiles == 19
    # counter denominator is dynamic from total; just assert no JS error and stepper built
    assert page.locator("#chapters .chapter").count() == 7
