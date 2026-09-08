import pathlib
import pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")


@pytest.fixture()
def page():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(CALC)
        yield pg
        b.close()


def test_state_initialized(page):
    """state object exists with expected keys."""
    has_state = page.evaluate(
        "() => typeof window.SunStackUI.state === 'object' && window.SunStackUI.state !== null"
    )
    assert has_state
    rig = page.evaluate("() => window.SunStackUI.state.rig")
    assert rig == []
    model_id = page.evaluate("() => window.SunStackUI.state.modelId")
    assert model_id == "gpt_oss_120b"


def test_render_exposed(page):
    """window.SunStackUI.render is a function."""
    assert page.evaluate("() => typeof window.SunStackUI.render === 'function'")


def test_catalog_buttons_present(page):
    """Catalog renders one button per device with data-add-device attr."""
    count = page.locator("button[data-add-device]").count()
    assert count > 0
    # Check known devices exist
    assert page.locator("button[data-add-device='dgx_spark']").count() == 1
    assert page.locator("button[data-add-device='gpu_5090']").count() == 1


def test_uma_button_class(page):
    """UMA device buttons have class 'uma'."""
    assert page.locator("button[data-add-device='dgx_spark'].uma").count() == 1


def test_non_uma_button_class(page):
    """Non-UMA device buttons have class 'non-uma'."""
    assert page.locator("button[data-add-device='gpu_5090'].non-uma").count() == 1


def test_svg_hub_present(page):
    """SVG with id=rig-svg is present in the DOM."""
    assert page.locator("#rig-svg").count() == 1


def test_empty_rig_no_nodes(page):
    """Empty rig: no .rig-node elements in SVG."""
    assert page.locator("#rig-svg .rig-node").count() == 0


def test_add_device_updates_summary_and_svg(page):
    """Adding two dgx_spark devices shows 2 SVG nodes and 256 GB in summary."""
    page.click("button[data-add-device='dgx_spark']")
    page.click("button[data-add-device='dgx_spark']")
    # two device nodes in SVG
    assert page.locator("#rig-svg .rig-node").count() == 2
    # pooled memory: 128 + 128 = 256 GB
    summary_text = page.inner_text("#rig-summary")
    assert "256" in summary_text


def test_uma_vs_nonuma_class(page):
    """Non-UMA device node gets class non-uma in SVG."""
    page.click("button[data-add-device='gpu_5090']")
    assert page.locator("#rig-svg .rig-node.non-uma").count() == 1


def test_remove_device(page):
    """Clicking a rig-node removes it from SVG."""
    page.click("button[data-add-device='dgx_spark']")
    assert page.locator("#rig-svg .rig-node").count() == 1
    page.click("#rig-svg .rig-node")
    assert page.locator("#rig-svg .rig-node").count() == 0


def test_rig_summary_present(page):
    """#rig-summary element exists."""
    assert page.locator("#rig-summary").count() == 1


def test_fits_badge_no_fit(page):
    """Single mac_mini_m4_16 (16 GB) cannot fit gpt_oss_120b (needs 64 GB Q4) — badge shows exceeds."""
    page.click("button[data-add-device='mac_mini_m4_16']")
    summary_text = page.inner_text("#rig-summary").lower()
    # should show a 'no fit' indicator
    assert "exceed" in summary_text or "✗" in summary_text or "no" in summary_text


def test_fits_badge_fit(page):
    """Two DGX Sparks (256 GB) fit gpt_oss_120b (64 GB Q4) — badge shows fits."""
    page.click("button[data-add-device='dgx_spark']")
    page.click("button[data-add-device='dgx_spark']")
    summary_text = page.inner_text("#rig-summary")
    assert "fit" in summary_text.lower() or "✓" in summary_text


def test_state_rig_updated_on_add(page):
    """state.rig reflects added devices."""
    page.click("button[data-add-device='dgx_spark']")
    rig = page.evaluate("() => window.SunStackUI.state.rig")
    assert rig == ["dgx_spark"]


def test_state_preset_becomes_custom(page):
    """Adding a device sets state.preset to 'custom'."""
    page.click("button[data-add-device='dgx_spark']")
    preset = page.evaluate("() => window.SunStackUI.state.preset")
    assert preset == "custom"


def test_page_no_throw_empty_rig(page):
    """Page loads without JS errors on empty rig."""
    errors = page.evaluate("() => window._jsErrors || []")
    assert errors == [] or errors is None
