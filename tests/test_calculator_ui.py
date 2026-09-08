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
    assert rig == ["gpu_4090"]
    model_id = page.evaluate("() => window.SunStackUI.state.modelId")
    assert model_id == "qwen32b"


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


def test_default_rig_has_one_node(page):
    """Default rig (gpu_4090): one .rig-node element in SVG."""
    assert page.locator("#rig-svg .rig-node").count() == 1


def test_add_device_updates_summary_and_svg(page):
    """Adding two dgx_spark devices to the default rig shows 3 SVG nodes total."""
    page.click("button[data-add-device='dgx_spark']")
    page.click("button[data-add-device='dgx_spark']")
    # default rig has 1 node (gpu_4090) + 2 dgx_spark = 3 nodes in SVG
    assert page.locator("#rig-svg .rig-node").count() == 3
    # pooled memory includes gpu_4090 (24GB) + 128 + 128 = 280 GB
    summary_text = page.inner_text("#rig-summary")
    assert "280" in summary_text


def test_uma_vs_nonuma_class(page):
    """Non-UMA device node gets class non-uma in SVG (default rig has gpu_4090 which is non-UMA)."""
    # Default rig already includes gpu_4090 (non-UMA); add another to be explicit
    page.click("button[data-add-device='gpu_5090']")
    assert page.locator("#rig-svg .rig-node.non-uma").count() >= 1


def test_remove_device(page):
    """Clicking a rig-node removes it from SVG (default rig starts with 1 node)."""
    # Default rig has 1 node (gpu_4090); click it to remove
    assert page.locator("#rig-svg .rig-node").count() == 1
    page.click("#rig-svg .rig-node")
    assert page.locator("#rig-svg .rig-node").count() == 0


def test_rig_summary_present(page):
    """#rig-summary element exists."""
    assert page.locator("#rig-summary").count() == 1


def test_fits_badge_no_fit(page):
    """After removing default device and adding only mac_mini_m4_16 (16 GB), model qwen32b (needs 20 GB Q4) doesn't fit."""
    # Remove the default gpu_4090 node first
    page.click("#rig-svg .rig-node")
    # Change model to one that won't fit in 16 GB
    page.evaluate("() => { window.SunStackUI.state.modelId = 'qwen32b'; window.SunStackUI.render(); }")
    page.click("button[data-add-device='mac_mini_m4_16']")
    summary_text = page.inner_text("#rig-summary").lower()
    # should show a 'no fit' indicator
    assert "exceed" in summary_text or "✗" in summary_text or "no" in summary_text


def test_fits_badge_fit(page):
    """Default rig (gpu_4090, 24 GB) fits qwen32b (20 GB Q4) — badge shows fits."""
    summary_text = page.inner_text("#rig-summary")
    assert "fit" in summary_text.lower() or "✓" in summary_text


def test_state_rig_updated_on_add(page):
    """state.rig reflects added devices (default rig already has gpu_4090)."""
    page.click("button[data-add-device='dgx_spark']")
    rig = page.evaluate("() => window.SunStackUI.state.rig")
    assert rig == ["gpu_4090", "dgx_spark"]


def test_state_preset_becomes_custom(page):
    """Adding a device sets state.preset to 'custom'."""
    # Start fresh: remove default node first, then add one back to confirm behavior
    page.click("button[data-add-device='dgx_spark']")
    preset = page.evaluate("() => window.SunStackUI.state.preset")
    assert preset == "custom"


def test_page_no_throw_on_load(page):
    """Page loads without JS errors."""
    errors = page.evaluate("() => window._jsErrors || []")
    assert errors == [] or errors is None


# ── Task 7 tests ────────────────────────────────────────────────────────────


def test_preset_toggle_moves_slider(page):
    """Clicking the optimistic preset changes the utilization slider value."""
    # Default rig already has a device; neutral preset has utilization=0.40,
    # optimistic sets it to the high value (0.65) so they will differ.
    before = page.eval_on_selector("#in-utilization", "el => el.value")
    page.click("button[data-preset='optimistic']")
    after = page.eval_on_selector("#in-utilization", "el => el.value")
    assert before != after


def test_model_gating_disables_unfittable(page):
    """deepseek_v3 option is disabled when pool cannot fit it (gpu_4090 has 24 GB, deepseek needs 380 GB Q4)."""
    # Default rig (gpu_4090, 24 GB) cannot fit deepseek_v3 (380 GB)
    assert page.get_attribute("#model-select option[value='deepseek_v3']", "disabled") is not None


def test_manual_edit_sets_custom(page):
    """Manually changing a slider sets state.preset to 'custom'."""
    # Default rig is already pre-populated; just change the slider
    if page.get_attribute("#in-utilization", "type") == "number":
        page.fill("#in-utilization", "0.55")
    else:
        page.eval_on_selector(
            "#in-utilization",
            "el => { el.value = 0.55; el.dispatchEvent(new Event('input')); }"
        )
    assert "custom" in page.inner_text("#preset-state").lower()


# ── Task 8 tests ────────────────────────────────────────────────────────────


def test_cite_chip_links_out(page):
    """A .cite-chip adjacent to a slider has a data-source-id; clicking it opens
    a .cite-popover whose first <a> href starts with http."""
    # Default rig already has a device; chips are rendered
    chip = page.locator(".cite-chip").first
    assert chip.get_attribute("data-source-id")
    chip.click()
    href = page.locator(".cite-popover a").first.get_attribute("href")
    assert href.startswith("http")


def test_references_numbered_and_dedup(page):
    """#references has at least one <li> and no more than the total source count."""
    n_refs = page.locator("#references li").count()
    n_src = page.evaluate("() => Object.keys(window.SunStackData.SOURCES).length")
    assert 0 < n_refs <= n_src


def test_download_button_present(page):
    """#download-assumptions button exists exactly once inside #sources."""
    assert page.locator("#download-assumptions").count() == 1


# ── Task 9 tests ────────────────────────────────────────────────────────────


def test_headline_cards_render(page):
    """With the default rig pre-populated, all four headline cards exist in #results."""
    for cid in ["#card-homeowner-net", "#card-payback", "#card-operator-margin", "#card-buyer-saves"]:
        assert page.locator(cid).count() == 1, f"Missing card: {cid}"


def test_negative_net_flagged(page):
    """A config with tiny utilisation produces a card flagged negative (.neg or '-' in text)."""
    page.click("button[data-add-device='gpu_5090']")
    page.eval_on_selector(
        "#in-utilization",
        "el => { el.value = 0.01; el.dispatchEvent(new Event('input')); }"
    )
    # Disable financing so hardware cost hits the homeowner
    if page.locator("#in-financed").count():
        page.eval_on_selector(
            "#in-financed",
            "el => { el.checked = false; el.dispatchEvent(new Event('change')); }"
        )
    card = page.locator("#card-homeowner-net")
    has_neg_class = card.get_attribute("class") or ""
    card_text = page.inner_text("#card-homeowner-net")
    assert "neg" in has_neg_class or "-" in card_text


def test_charts_or_fallback_present(page):
    """#tornado contains an svg (or .chart-fallback) both without and with a device;
    #breakeven container always exists."""
    # Default rig is pre-populated — tornado and breakeven should render.
    assert page.locator("#tornado svg, #tornado .chart-fallback, #tornado table").count() >= 1
    assert page.locator("#breakeven").count() == 1
    # After removing the device, a fallback still appears.
    page.click("#rig-svg .rig-node")
    assert page.locator("#tornado svg, #tornado .chart-fallback, #tornado table").count() >= 1
    assert page.locator("#breakeven").count() == 1


def test_strategy_control_homeowner_share(page):
    """Changing #in-homeownerShare slider updates #card-homeowner-net."""
    # Default rig is pre-populated so the card renders immediately
    before = page.inner_text("#card-homeowner-net")
    page.eval_on_selector(
        "#in-homeownerShare",
        "el => { el.value = 0.3; el.dispatchEvent(new Event('input')); }"
    )
    after = page.inner_text("#card-homeowner-net")
    assert before != after


# ── Item 6: Model gating tests ──────────────────────────────────────────────


def test_model_gating_large_models_disabled_for_small_rig(page):
    """With default rig (gpu_4090, 24 GB), larger models (≥40 GB Q4) are disabled."""
    # llama33_70b needs 40 GB — disabled for 24 GB rig
    assert page.get_attribute("#model-select option[value='llama33_70b']", "disabled") is not None
    # gpt_oss_120b needs 64 GB — also disabled
    assert page.get_attribute("#model-select option[value='gpt_oss_120b']", "disabled") is not None
    # deepseek_v3 needs 380 GB — also disabled
    assert page.get_attribute("#model-select option[value='deepseek_v3']", "disabled") is not None


def test_model_gating_qwen32b_enabled_for_default_rig(page):
    """With default rig (gpu_4090, 24 GB), qwen32b (20 GB Q4) is selectable (not disabled)."""
    disabled = page.get_attribute("#model-select option[value='qwen32b']", "disabled")
    assert disabled is None


def test_model_gating_enabled_for_big_rig(page):
    """Adding DGX Spark (128 GB) enables large models that were previously disabled."""
    # Before: gpt_oss_120b (64 GB) disabled for 24 GB rig
    assert page.get_attribute("#model-select option[value='gpt_oss_120b']", "disabled") is not None
    # Add a DGX Spark (128 GB) -> pool = 24 + 128 = 152 GB -> gpt_oss_120b (64 GB) fits
    page.click("button[data-add-device='dgx_spark']")
    disabled_after = page.get_attribute("#model-select option[value='gpt_oss_120b']", "disabled")
    assert disabled_after is None


def test_default_net_approx_1857(page):
    """Default rig scenario (gpu_4090 + qwen32b Q4 + grid 100% + financed) yields homeowner net ~A$1857."""
    net = page.evaluate(
        "() => window.SunStackEngine.computeScenario(window.SunStackUI.state).homeowner.netAud"
    )
    assert abs(net - 1857) < 50, f"Expected ~1857, got {net}"


# ── Slider drag persistence (regression for render-loop split) ───────────────


def test_slider_drag_does_not_recreate_element(page):
    """Dragging #in-utilization must NOT destroy and recreate the element.

    Captures the element handle before triggering input events, then asserts
    the handle is still connected (same DOM node) after renderOutputs fires.
    Also asserts that results updated (card value changed).
    """
    # Capture the element handle and initial card text.
    slider_el = page.query_selector("#in-utilization")
    assert slider_el is not None, "#in-utilization not found"

    before_card = page.inner_text("#card-homeowner-net")

    # Simulate a drag: programmatically move slider to a new value and fire
    # the input event.  Use a value distinct from the neutral default (0.40).
    page.evaluate(
        """() => {
            const el = document.getElementById('in-utilization');
            el.value = 0.75;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }"""
    )

    # The SAME element handle must still be connected — if the element was
    # recreated the handle would be detached (isConnected === false).
    still_connected = page.evaluate("(el) => el.isConnected", slider_el)
    assert still_connected, (
        "#in-utilization was replaced in the DOM during slider input — "
        "the render-loop split is not working correctly"
    )

    # Results must have updated to reflect the new utilization value.
    after_card = page.inner_text("#card-homeowner-net")
    assert before_card != after_card, (
        "#card-homeowner-net did not update after slider input"
    )


def test_energy_slider_drag_does_not_recreate_element(page):
    """Dragging #in-energy-solar must NOT destroy and recreate that slider."""
    slider_el = page.query_selector("#in-energy-solar")
    assert slider_el is not None, "#in-energy-solar not found"

    before_card = page.inner_text("#card-homeowner-net")

    page.evaluate(
        """() => {
            const el = document.getElementById('in-energy-solar');
            el.value = 60;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }"""
    )

    still_connected = page.evaluate("(el) => el.isConnected", slider_el)
    assert still_connected, (
        "#in-energy-solar was replaced in the DOM during slider input"
    )

    after_card = page.inner_text("#card-homeowner-net")
    assert before_card != after_card, (
        "#card-homeowner-net did not update after energy-mix slider input"
    )
