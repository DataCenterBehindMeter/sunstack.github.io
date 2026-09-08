import pathlib, pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(CALC); yield pg; b.close()

EXPECTED_MODEL_IDS = [
    "gpt_oss_20b", "gemma4_26b_a4b", "qwen3_vl_30b_a3b", "qwen36_35b_a3b",
    "qwen3_coder_next", "llama4_scout", "gpt_oss_120b", "mistral_small_4",
    "minimax_m3", "qwen3_vl_235b_a22b", "deepseek_v4_flash",
    "glm_53_flash", "glm_52", "kimi_k26"
]
OLD_MODEL_IDS = [
    "llama31_8b", "qwen32b", "llama33_70b", "qwen72b", "deepseek_v3", "mixtral",
    "minimax_m2"
]

def test_new_model_ids_present(page):
    ids = page.evaluate("() => Object.keys(window.SunStackData.MODELS)")
    for mid in EXPECTED_MODEL_IDS:
        assert mid in ids, f"Missing model: {mid}"

def test_old_model_ids_removed(page):
    ids = page.evaluate("() => Object.keys(window.SunStackData.MODELS)")
    for mid in OLD_MODEL_IDS:
        assert mid not in ids, f"Old model still present: {mid}"

def test_all_models_have_active_params(page):
    bad = page.evaluate("""() => {
      const M = window.SunStackData.MODELS;
      return Object.entries(M).filter(([k,m]) => !m.activeParamsB || m.activeParamsB <= 0).map(([k]) => k);
    }""")
    assert bad == [], f"Models missing activeParamsB: {bad}"

def test_quant_bytes_exported(page):
    qb = page.evaluate("() => window.SunStackData.QUANT_BYTES")
    assert qb == {"q4": 0.55, "q8": 1.06, "fp16": 2.0}

def test_eff_exported(page):
    eff = page.evaluate("() => window.SunStackData.EFF")
    assert abs(eff - 0.6) < 1e-9

def test_fx_updated(page):
    fx = page.evaluate("() => window.SunStackData.FX_AUD_PER_USD")
    assert abs(fx - 1.39) < 0.01, f"Expected 1.39, got {fx}"

def test_active_hours_default_16(page):
    ah = page.evaluate("() => window.SunStackData.INPUT_DEFAULTS.activeHours.value")
    assert ah == 16

def test_multimodal_flag_present(page):
    """Every model has a multimodal boolean field."""
    bad = page.evaluate("""() => {
      return Object.entries(window.SunStackData.MODELS)
        .filter(([k,m]) => typeof m.multimodal !== 'boolean')
        .map(([k]) => k);
    }""")
    assert bad == [], f"Models missing multimodal flag: {bad}"

def test_minimax_m3_is_multimodal(page):
    """minimax_m3 should be marked multimodal."""
    mm = page.evaluate("() => window.SunStackData.MODELS.minimax_m3.multimodal")
    assert mm is True

def test_hardware_lifetime_constant_exported(page):
    """HARDWARE_LIFETIME_YEARS is exported on SunStackData."""
    lt = page.evaluate("() => window.SunStackData.HARDWARE_LIFETIME_YEARS")
    assert lt == 5

def test_no_overhead_or_lifetime_inputs(page):
    """hardwareLifetimeYears and overheadPerYearAud are no longer in INPUT_DEFAULTS."""
    keys = page.evaluate("() => Object.keys(window.SunStackData.INPUT_DEFAULTS)")
    assert "hardwareLifetimeYears" not in keys, "hardwareLifetimeYears should be removed"
    assert "overheadPerYearAud" not in keys, "overheadPerYearAud should be removed"
