"""Deck coverage for the investor tiles added to the pitch deck:
a value-adding-services tile (end of Prototype) and a two-tile "The market"
chapter (market size + market share) before the roadmap.

Playwright-Python over file:// like the other deck tests — CWD-independent.
"""

import pathlib

import pytest
from playwright.sync_api import sync_playwright

DECK = "file://" + str(pathlib.Path(__file__).resolve().parent.parent / "index.html")


@pytest.fixture()
def page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 1440, "height": 900})
        pg.goto(DECK)
        yield pg
        browser.close()


def test_deck_has_nineteen_tiles_and_seven_chapters(page):
    assert page.locator("main#deck .tile").count() == 19
    chapters = page.locator("#chapters .chapter")
    assert chapters.count() == 7
    # the new chapter is present and reachable
    assert page.get_by_role("button", name="Go to section: The market").count() == 1


def test_value_ladder_tile_present(page):
    tile = page.locator("#tile-12")
    assert tile.count() == 1
    # eyebrow is CSS-uppercased, so compare case-insensitively
    assert "beyond raw tokens" in tile.inner_text().lower()
    # three rungs, the premium one highlighted
    assert tile.locator(".cards.three .card").count() == 3
    assert tile.locator(".card.card-hi").count() == 1
    # the ascending value/margin axis renders
    assert tile.locator(".value-track").count() == 1
    # the vertical-solutions rung names a concrete SMB integration
    assert "ERP" in tile.locator(".card.card-hi").inner_text()


def test_market_size_tile_has_both_sides_and_cited_metrics(page):
    tile = page.locator("#tile-16")
    assert tile.count() == 1
    # demand + supply columns
    assert tile.locator(".duo .duo-col").count() == 2
    # each headline figure carries a metric block
    assert tile.locator(".metrics .metric").count() >= 8
    # every figure is cited: superscript refs map to a source footer
    refs = tile.locator("sup.ref").count()
    sources = tile.locator("ol.sources li").count()
    assert refs >= 8
    assert sources == refs
    # sources are real, click-through links (due-diligence)
    assert tile.locator("ol.sources li a[href^='https://']").count() >= 8


def test_market_share_tile_bottom_up_and_top_down(page):
    tile = page.locator("#tile-17")
    assert tile.count() == 1
    text = tile.inner_text()
    # bottom-up node build-up
    assert tile.locator(".buildup .row").count() >= 4
    assert "operator margin" in text
    # top-down headroom framing as a share of the market
    assert "%" in text
    # the calculator's per-node economics are the anchor, and are attributed
    assert tile.locator("ol.sources li").count() >= 2
    assert "calculator" in text.lower()


if __name__ == "__main__":
    import sys

    sys.exit(pytest.main([__file__, "-v"]))
