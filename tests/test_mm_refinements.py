"""Tests for the seven MM-refinements (multimodal, greyed reason, PAIR link, energy card,
no overhead/lifetime inputs, hardware lifetime constant, default model).
"""
import pathlib
import pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")


@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(CALC)
        yield pg
        b.close()


# ── Refinement 1: model catalog & multimodal flag ─────────────────────────────

def test_multimodal_flag_present(page):
    """Every MODELS entry has a boolean multimodal field."""
    bad = page.evaluate("""() =>
      Object.entries(window.SunStackData.MODELS)
        .filter(([k, m]) => typeof m.multimodal !== 'boolean')
        .map(([k]) => k)
    """)
    assert bad == [], f"Models missing multimodal flag: {bad}"


def test_minimax_m3_present_and_multimodal(page):
    """minimax_m3 exists and is multimodal; minimax_m2 is removed."""
    ids = page.evaluate("() => Object.keys(window.SunStackData.MODELS)")
    assert "minimax_m3" in ids, "minimax_m3 should be in MODELS"
    assert "minimax_m2" not in ids, "minimax_m2 should be removed"
    mm = page.evaluate("() => window.SunStackData.MODELS.minimax_m3.multimodal")
    assert mm is True


def test_new_vl_models_present(page):
    """New VL/M3 models are present."""
    ids = page.evaluate("() => Object.keys(window.SunStackData.MODELS)")
    assert "qwen3_vl_30b_a3b" in ids, "qwen3_vl_30b_a3b missing"
    assert "qwen3_vl_235b_a22b" in ids, "qwen3_vl_235b_a22b missing"


# ── Refinement 2: greyed option shows memory reason + multimodal badge ─────────

def test_greyed_option_shows_memory_reason(page):
    """A disabled model option includes 'needs X GB' in its text."""
    # Default rig = mac_studio_m3ultra_256 (256 GB); kimi_k26 needs 630 GB
    text = page.evaluate(
        "() => document.querySelector('#model-select option[value=\"kimi_k26\"]').textContent"
    )
    assert "needs" in text and "GB" in text, (
        f"Greyed option should show memory reason, got: {text!r}"
    )


def test_greyed_option_shows_pool_size(page):
    """A disabled model option includes the pool size in its text."""
    text = page.evaluate(
        "() => document.querySelector('#model-select option[value=\"kimi_k26\"]').textContent"
    )
    # pool is 256 GB for default rig
    assert "256" in text or "pool" in text, (
        f"Greyed option should mention pool size, got: {text!r}"
    )


def test_multimodal_option_has_marker(page):
    """A multimodal model option has the ◈ prefix."""
    text = page.evaluate(
        "() => document.querySelector('#model-select option[value=\"minimax_m3\"]').textContent"
    )
    assert "◈" in text, f"Multimodal option should have ◈ marker, got: {text!r}"


def test_non_multimodal_option_no_marker(page):
    """A non-multimodal model option does not have the ◈ prefix."""
    text = page.evaluate(
        "() => document.querySelector('#model-select option[value=\"gpt_oss_20b\"]').textContent"
    )
    assert "◈" not in text, f"Non-multimodal option should not have ◈, got: {text!r}"


def test_model_select_never_rests_on_disabled(page):
    """The auto-fallback ensures state.modelId always points to an enabled option."""
    # state.modelId must match an option that is not disabled
    is_valid = page.evaluate("""() => {
      const state = window.SunStackUI.state;
      const opt = document.querySelector('#model-select option[value="' + state.modelId + '"]');
      return opt !== null && !opt.disabled;
    }""")
    assert is_valid, "state.modelId rests on a disabled option"


# ── Refinement 3: no hardwareLifetimeYears slider ────────────────────────────

def test_no_overhead_or_lifetime_inputs(page):
    """hardwareLifetimeYears and overheadPerYearAud sliders are not in the DOM."""
    assert page.locator("#in-hardwareLifetimeYears").count() == 0, \
        "#in-hardwareLifetimeYears should be absent"
    assert page.locator("#in-overheadPerYearAud").count() == 0, \
        "#in-overheadPerYearAud should be absent"


def test_hardware_lifetime_constant_on_data(page):
    """HARDWARE_LIFETIME_YEARS constant is 5 on SunStackData."""
    lt = page.evaluate("() => window.SunStackData.HARDWARE_LIFETIME_YEARS")
    assert lt == 5


# ── Refinement 5: PAIR hub is clickable link ──────────────────────────────────

def test_pair_link_present(page):
    """An <a> element with href containing 'personal-ai-router' exists in the SVG."""
    href = page.evaluate("""() => {
      const a = document.querySelector('#rig-svg a[href*="personal-ai-router"]');
      return a ? a.getAttribute('href') : null;
    }""")
    assert href is not None, "PAIR hub <a href*='personal-ai-router'> not found in SVG"
    assert "nvidia.com" in href, f"Expected nvidia.com in PAIR link, got: {href!r}"


def test_pair_link_opens_new_tab(page):
    """The PAIR hub link has target='_blank' and rel='noopener'."""
    target = page.evaluate("""() => {
      const a = document.querySelector('#rig-svg a[href*="personal-ai-router"]');
      return a ? a.getAttribute('target') : null;
    }""")
    rel = page.evaluate("""() => {
      const a = document.querySelector('#rig-svg a[href*="personal-ai-router"]');
      return a ? a.getAttribute('rel') : null;
    }""")
    assert target == "_blank", f"Expected target='_blank', got {target!r}"
    assert rel is not None and "noopener" in rel, f"Expected rel='noopener', got {rel!r}"


# ── Energy source: single solar↔grid slider ──────────────────────────────────

def test_solar_share_slider_present(page):
    """The single solar↔grid slider is present (no more 3-way energy mix)."""
    assert page.locator("#in-solar-share").count() == 1, \
        "#in-solar-share slider should exist"


def test_solar_share_updates_net(page):
    """Dragging solar share to mostly-grid raises energy cost and changes net."""
    before = page.inner_text("#card-homeowner-net")
    page.evaluate("""() => {
      const el = document.getElementById('in-solar-share');
      if (el) { el.value = 10; el.dispatchEvent(new Event('input')); }
    }""")
    after = page.inner_text("#card-homeowner-net")
    assert before != after, "Homeowner net did not change when solar share dropped to 10%"


# ── Refinement 7: default model + both parties positive ──────────────────────

def test_default_model_is_minimax_m3(page):
    """Default state.modelId is minimax_m3."""
    model_id = page.evaluate("() => window.SunStackUI.state.modelId")
    assert model_id == "minimax_m3", f"Expected minimax_m3, got {model_id}"


def test_default_homeowner_net_positive(page):
    """Default config: homeowner.netAud > 0."""
    net = page.evaluate(
        "() => window.SunStackEngine.computeScenario(window.SunStackUI.state).homeowner.netAud"
    )
    assert net > 0, f"Expected positive homeowner net, got {net:.0f}"


def test_default_operator_margin_positive(page):
    """Default config: operator.marginAud > 0."""
    margin = page.evaluate(
        "() => window.SunStackEngine.computeScenario(window.SunStackUI.state).operator.marginAud"
    )
    assert margin > 0, f"Expected positive operator margin, got {margin:.0f}"
