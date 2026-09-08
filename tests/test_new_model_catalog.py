import pathlib, pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(CALC); yield pg; b.close()

EXPECTED_MODEL_IDS = [
    "gpt_oss_20b", "gemma4_26b_a4b", "qwen36_35b_a3b", "qwen3_coder_next",
    "llama4_scout", "gpt_oss_120b", "mistral_small_4", "minimax_m2",
    "deepseek_v4_flash", "glm_53_flash", "glm_52", "kimi_k26"
]
OLD_MODEL_IDS = ["llama31_8b", "qwen32b", "llama33_70b", "qwen72b", "deepseek_v3", "mixtral"]

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

def test_overhead_default_updated(page):
    oh = page.evaluate("() => window.SunStackData.INPUT_DEFAULTS.overheadPerYearAud.value")
    assert oh == 60

def test_hardware_lifetime_default_5(page):
    lt = page.evaluate("() => window.SunStackData.INPUT_DEFAULTS.hardwareLifetimeYears.value")
    assert lt == 5

def test_active_hours_default_16(page):
    ah = page.evaluate("() => window.SunStackData.INPUT_DEFAULTS.activeHours.value")
    assert ah == 16
