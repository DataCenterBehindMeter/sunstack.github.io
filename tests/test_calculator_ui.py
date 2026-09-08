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
    assert rig == ["dgx_spark"]
    model_id = page.evaluate("() => window.SunStackUI.state.modelId")
    assert model_id == "minimax_m3"


def test_default_state_dgx_minimax(page):
    """Default state is DGX Spark + MiniMax M3 with correct knobs."""
    s = page.evaluate("() => window.SunStackUI.state")
    assert s["rig"] == ["dgx_spark"]
    assert s["modelId"] == "minimax_m3"
    assert s["quant"] == "q4"
    assert s["activeHours"] == 16
    assert s["concurrency"] == 16
    assert s["financed"] is True
    assert abs(s["homeownerShare"] - 0.55) < 1e-6
    assert abs(s["undercut"] - 0.20) < 1e-6


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
    """Default rig (mac_studio_m3ultra_256): one .rig-node element in SVG."""
    assert page.locator("#rig-svg .rig-node").count() == 1


def test_add_device_updates_summary_and_svg(page):
    """Adding two dgx_spark devices to the default rig shows 3 SVG nodes total."""
    page.click("button[data-add-device='dgx_spark']")
    page.click("button[data-add-device='dgx_spark']")
    # default rig has 1 dgx_spark (128 GB) + 2 more dgx_spark (128 GB each) = 384 GB
    assert page.locator("#rig-svg .rig-node").count() == 3
    summary_text = page.inner_text("#rig-summary")
    assert "384" in summary_text


def test_uma_vs_nonuma_class(page):
    """Non-UMA device node gets class non-uma in SVG."""
    page.click("button[data-add-device='gpu_5090']")
    assert page.locator("#rig-svg .rig-node.non-uma").count() >= 1


def test_remove_device(page):
    """Clicking a rig-node removes it from SVG (default rig starts with 1 node)."""
    assert page.locator("#rig-svg .rig-node").count() == 1
    page.click("#rig-svg .rig-node")
    assert page.locator("#rig-svg .rig-node").count() == 0


def test_rig_summary_present(page):
    """#rig-summary element exists."""
    assert page.locator("#rig-summary").count() == 1


def test_fits_badge_no_fit(page):
    """No catalog model fits a 16 GB Mac mini at FP16."""
    # Remove the default dgx_spark node first
    page.click("#rig-svg .rig-node")
    # Set model to minimax_m3 which needs 126 GB — won't fit in 16 GB
    page.evaluate("() => { window.SunStackUI.state.modelId = 'minimax_m3'; window.SunStackUI.render(); }")
    page.click("button[data-add-device='mac_mini_m4_16']")
    # Q4 automatically selects a smaller model; FP16 exceeds 16 GB for every model.
    page.select_option("#quant-select", "fp16")
    summary_text = page.inner_text("#rig-summary").lower()
    # should show a 'no fit' indicator
    assert "exceed" in summary_text or "✗" in summary_text or "no" in summary_text


def test_fits_badge_fit(page):
    """Default rig (dgx_spark, 128 GB) fits minimax_m3 (126 GB Q4) — badge shows fits."""
    summary_text = page.inner_text("#rig-summary")
    assert "fit" in summary_text.lower() or "✓" in summary_text


def test_state_rig_updated_on_add(page):
    """state.rig reflects added devices (default rig already has dgx_spark)."""
    page.click("button[data-add-device='dgx_spark']")
    rig = page.evaluate("() => window.SunStackUI.state.rig")
    assert rig == ["dgx_spark", "dgx_spark"]


def test_state_preset_becomes_custom(page):
    """Adding a device sets state.preset to 'custom'."""
    page.click("button[data-add-device='dgx_spark']")
    preset = page.evaluate("() => window.SunStackUI.state.preset")
    assert preset == "custom"


def test_page_no_throw_on_load(page):
    """Page loads without JS errors."""
    errors = page.evaluate("() => window._jsErrors || []")
    assert errors == [] or errors is None


# ── Task 7 tests ────────────────────────────────────────────────────────────


def test_preset_toggle_moves_slider(page):
    """Clicking the optimistic preset changes the hours/day slider value."""
    before = page.eval_on_selector("#in-activeHours", "el => el.value")
    page.click("button[data-preset='optimistic']")
    after = page.eval_on_selector("#in-activeHours", "el => el.value")
    assert before != after


def test_model_gating_disables_unfittable(page):
    """kimi_k26 option is disabled when pool cannot fit it (mac_studio_m3ultra_256
    has 256 GB, kimi_k26 needs 630 GB Q4)."""
    # Default rig (mac_studio_m3ultra_256, 256 GB) cannot fit kimi_k26 (630 GB)
    assert page.get_attribute("#model-select option[value='kimi_k26']", "disabled") is not None


def test_manual_edit_sets_custom(page):
    """Manually changing a slider sets state.preset to 'custom'."""
    page.eval_on_selector(
        "#in-activeHours",
        "el => { el.value = 20; el.dispatchEvent(new Event('input')); }"
    )
    assert "custom" in page.inner_text("#preset-state").lower()


# ── Task 8 tests ────────────────────────────────────────────────────────────


def test_cite_chip_links_out(page):
    """A .cite-chip adjacent to a slider has a data-source-id; clicking it opens
    a .cite-popover whose first <a> href starts with http."""
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
    """A config with almost no running hours produces a card flagged negative (.neg or '-' in text)."""
    page.click("button[data-add-device='gpu_5090']")
    page.eval_on_selector(
        "#in-activeHours",
        "el => { el.value = 1; el.dispatchEvent(new Event('input')); }"
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


def test_strategy_control_homeowner_share(page):
    """Changing #in-homeownerShare slider updates #card-homeowner-net."""
    before = page.inner_text("#card-homeowner-net")
    page.eval_on_selector(
        "#in-homeownerShare",
        "el => { el.value = 0.3; el.dispatchEvent(new Event('input')); }"
    )
    after = page.inner_text("#card-homeowner-net")
    assert before != after


# ── Item 6: Model gating tests ──────────────────────────────────────────────


def test_model_gating_large_models_disabled_for_small_rig(page):
    """With mac_mini_m4_16 (16 GB) rig, larger models are disabled."""
    # Set up a tiny 16 GB rig
    page.click("#rig-svg .rig-node")   # remove default dgx_spark
    page.click("button[data-add-device='mac_mini_m4_16']")
    # gpt_oss_120b needs 63 GB — disabled for 16 GB rig
    assert page.get_attribute("#model-select option[value='gpt_oss_120b']", "disabled") is not None
    # minimax_m3 needs 126 GB — also disabled
    assert page.get_attribute("#model-select option[value='minimax_m3']", "disabled") is not None
    # kimi_k26 needs 630 GB — also disabled
    assert page.get_attribute("#model-select option[value='kimi_k26']", "disabled") is not None


def test_model_gating_qwen32b_enabled_for_default_rig(page):
    """With default rig (dgx_spark, 128 GB), gpt_oss_120b (63 GB Q4) is selectable."""
    disabled = page.get_attribute("#model-select option[value='gpt_oss_120b']", "disabled")
    assert disabled is None


def test_model_gating_enabled_for_big_rig(page):
    """Adding DGX Spark (128 GB) to a 16 GB rig enables models that were previously disabled."""
    # Set up a tiny 16 GB rig
    page.click("#rig-svg .rig-node")   # remove default dgx_spark
    page.click("button[data-add-device='mac_mini_m4_16']")
    # minimax_m3 (126 GB) disabled for 16 GB rig
    assert page.get_attribute("#model-select option[value='minimax_m3']", "disabled") is not None
    # Add DGX Spark (128 GB) → pool = 16 + 128 = 144 GB → minimax_m3 (126 GB) fits
    page.click("button[data-add-device='dgx_spark']")
    disabled_after = page.get_attribute("#model-select option[value='minimax_m3']", "disabled")
    assert disabled_after is None


def test_default_net_positive(page):
    """Default rig scenario yields homeowner net > 0 (both parties positive)."""
    net = page.evaluate(
        "() => window.SunStackEngine.computeScenario(window.SunStackUI.state).homeowner.netAud"
    )
    assert net > 0, f"Expected positive homeowner net, got {net}"


def test_default_operator_margin_positive(page):
    """Default rig scenario yields operator margin > 0."""
    margin = page.evaluate(
        "() => window.SunStackEngine.computeScenario(window.SunStackUI.state).operator.marginAud"
    )
    assert margin > 0, f"Expected positive operator margin, got {margin}"


# ── Concurrency slider ────────────────────────────────────────────────────────


def test_concurrency_slider_present(page):
    """#in-concurrency slider exists with correct attributes."""
    el = page.locator("#in-concurrency")
    assert el.count() == 1
    assert el.get_attribute("type") == "range"
    assert int(el.get_attribute("min")) == 1
    assert int(el.get_attribute("max")) == 64


def test_concurrency_default_16(page):
    """Concurrency slider starts at 16 (state default)."""
    val = page.evaluate("() => window.SunStackUI.state.concurrency")
    assert val == 16


def test_concurrency_slider_updates_state(page):
    """Moving #in-concurrency updates state.concurrency."""
    page.eval_on_selector(
        "#in-concurrency",
        "el => { el.value = 32; el.dispatchEvent(new Event('input')); }"
    )
    val = page.evaluate("() => window.SunStackUI.state.concurrency")
    assert val == 32


def test_summary_shows_dual_tps(page):
    """Rig summary shows both single-stream and served t/s for a fitting model."""
    summary_text = page.inner_text("#rig-summary")
    # Should contain "t/s" at least twice — once for single-stream, once for served
    assert summary_text.count("t/s") >= 2


def test_payback_card_shows_operator_payback_when_financed(page):
    """When financed=true and operator margin > 0, payback card shows operator payback."""
    assert page.evaluate("() => window.SunStackUI.state.financed") is True
    payback_text = page.inner_text("#card-payback").lower()
    # Should show a numeric payback (e.g. "3.2 yr") not "N/A"
    assert "n/a" not in payback_text
    assert "yr" in payback_text or "operator" in payback_text


# ── Slider drag persistence (regression for render-loop split) ───────────────


def test_slider_drag_does_not_recreate_element(page):
    """Dragging #in-activeHours must NOT destroy and recreate the element."""
    slider_el = page.query_selector("#in-activeHours")
    assert slider_el is not None, "#in-activeHours not found"

    before_card = page.inner_text("#card-homeowner-net")

    page.evaluate(
        """() => {
            const el = document.getElementById('in-activeHours');
            el.value = 20;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }"""
    )

    still_connected = page.evaluate("(el) => el.isConnected", slider_el)
    assert still_connected, (
        "#in-activeHours was replaced in the DOM during slider input — "
        "the render-loop split is not working correctly"
    )

    after_card = page.inner_text("#card-homeowner-net")
    assert before_card != after_card, (
        "#card-homeowner-net did not update after slider input"
    )


def test_energy_slider_drag_does_not_recreate_element(page):
    """Dragging #in-solar-share must NOT destroy and recreate that slider."""
    slider_el = page.query_selector("#in-solar-share")
    assert slider_el is not None, "#in-solar-share not found"

    before_card = page.inner_text("#card-homeowner-net")

    page.evaluate(
        """() => {
            const el = document.getElementById('in-solar-share');
            el.value = 20;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }"""
    )

    still_connected = page.evaluate("(el) => el.isConnected", slider_el)
    assert still_connected, (
        "#in-solar-share was replaced in the DOM during slider input"
    )

    after_card = page.inner_text("#card-homeowner-net")
    assert before_card != after_card, (
        "#card-homeowner-net did not update after solar-share slider input"
    )


def test_model_sell_price_element_exists(page):
    """#model-sell-price element exists after page load."""
    assert page.locator("#model-sell-price").count() == 1


def test_model_sell_price_value(page):
    """Sell-price line shows a plausible AUD value for the selected model."""
    text = page.inner_text("#model-sell-price")
    assert "A$" in text
    assert "1M tokens" in text


def test_model_sell_price_updates_on_undercut_change(page):
    """Changing undercut slider updates #model-sell-price."""
    before = page.inner_text("#model-sell-price")
    page.eval_on_selector(
        "#in-undercut",
        "el => { el.value = 0.5; el.dispatchEvent(new Event('input')); }"
    )
    after = page.inner_text("#model-sell-price")
    assert before != after


def test_roi_card_shows_owner_label(page):
    """ROI card label includes '(operator)' when financed, '(homeowner)' when not."""
    # Default state is financed=true
    assert page.evaluate("() => window.SunStackUI.state.financed") is True
    roi_label = page.inner_text("#card-roi .card-label").lower()
    assert "operator" in roi_label

    # Switch to self-funded
    page.evaluate("""() => {
      window.SunStackUI.state.financed = false;
      window.SunStackUI.renderOutputs();
    }""")
    roi_label_after = page.inner_text("#card-roi .card-label").lower()
    assert "homeowner" in roi_label_after


def test_split_bar_three_party_segments_exist(page):
    """#split-bar has segments for all three parties: homeowner, operator, buyer-saves."""
    assert page.locator("#split-bar .seg-homeowner").count() >= 1
    assert page.locator("#split-bar .seg-operator").count() >= 1
    assert page.locator("#split-bar .seg-buyer-saves").count() >= 1


def test_split_bar_title_mentions_cloud(page):
    """Split bar title mentions cloud-equivalent spend."""
    title_text = page.inner_text(".split-bar-title").lower()
    assert "cloud" in title_text or "spend" in title_text


def test_split_bar_has_tooltip_on_segment(page):
    """The buyer-saves segment has a title attribute (tooltip) with AUD amount."""
    seg = page.locator("#split-bar .seg-buyer-saves").first
    tooltip = seg.get_attribute("title") or ""
    assert "A$" in tooltip or "$" in tooltip
