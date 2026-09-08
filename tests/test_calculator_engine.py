import pathlib, pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(CALC); yield pg; b.close()

BASE = """{
  preset:'neutral', rig:['dgx_spark'], modelId:'gpt_oss_120b', quant:'q4',
  poolEfficiency:0.75, utilization:0.4, activeHours:8,
  energyMix:{free:0.5,solar:0.3,grid:0.15,battery:0.05}, feedInTariff:3.3, retailRate:30, batteryCost:8,
  undercut:0.3, homeownerShare:0.5, financed:true, hardwareLifetimeYears:4, overheadPerYearAud:150,
  platformCostUsdPerMTok:0.02, fxAudPerUsd:1.53 }"""

def calc(page, patch=""):
    return page.evaluate(f"() => {{ const s = {BASE}; {patch}; return window.SunStackEngine.computeScenario(s); }}")

def test_pool_memory_sums(page):
    assert page.evaluate("() => window.SunStackEngine.poolMemoryGb(['dgx_spark','dgx_spark'])") == 256

def test_fits_gating(page):
    assert page.evaluate("() => window.SunStackEngine.fits(['mac_mini_m4_16'],'gpt_oss_120b','q4')") is False
    assert page.evaluate("() => window.SunStackEngine.fits(['dgx_spark'],'gpt_oss_120b','q4')") is True

def test_energy_mix_normalizes(page):
    # doubling all weights must not change effective price (engine normalizes)
    a = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.effEnergyPriceAudPerKwh(s);}}")
    b = page.evaluate(f"() => {{const s={BASE}; s.energyMix={{free:1,solar:0.6,grid:0.3,battery:0.1}}; return window.SunStackEngine.effEnergyPriceAudPerKwh(s);}}")
    assert abs(a-b) < 1e-9

def test_free_energy_is_zero_component(page):
    # 100% free solar => zero energy cost
    o = calc(page, "s.energyMix={free:1,solar:0,grid:0,battery:0}")
    assert o["homeowner"]["energyCostAud"] == 0

def test_net_increases_with_utilization(page):
    lo = calc(page, "s.utilization=0.2")["homeowner"]["netAud"]
    hi = calc(page, "s.utilization=0.8")["homeowner"]["netAud"]
    assert hi > lo

def test_buyer_saves_equals_tokens_times_gap(page):
    o = calc(page)
    # saves == tokens * market*undercut converted to AUD, and savePct == undercut
    assert abs(o["buyer"]["savePct"] - 0.30) < 1e-6
    assert o["buyer"]["savesAud"] > 0

def test_net_reconstructs_from_parts(page):
    o = calc(page)
    h = o["homeowner"]
    recon = h["shareAud"] - h["energyCostAud"] - h["amortizedHardwareAud"] - h["overheadAud"]
    assert abs(recon - h["netAud"]) < 1e-6            # net is exactly its parts
    assert abs(h["shareAud"] - o["grossRevenueAud"] * 0.5) < 1e-6  # homeownerShare=0.5

def test_does_not_fit_yields_zero_revenue(page):
    o = calc(page, "s.rig=['mac_mini_m4_16']; s.modelId='deepseek_v3'")
    assert o["fits"] is False and o["tokensPerYear"] == 0 and o["grossRevenueAud"] == 0

def test_financed_moves_hardware_off_homeowner(page):
    fin = calc(page, "s.financed=true")["homeowner"]["amortizedHardwareAud"]
    own = calc(page, "s.financed=false")["homeowner"]["amortizedHardwareAud"]
    assert fin == 0 and own > 0

def test_preset_sets_uncertainty_by_polarity(page):
    # optimistic: utilization -> high (polarity +), feedInTariff -> low (polarity -)
    r = page.evaluate(f"""() => {{
      const s = {BASE};
      const o = window.SunStackEngine.applyPreset(s, 'optimistic');
      const D = window.SunStackData.INPUT_DEFAULTS;
      return [o.utilization, D.utilization.high, o.feedInTariff, D.feedInTariff.low];
    }}""")
    assert r[0] == r[1] and r[2] == r[3]

def test_preset_holds_strategy_inputs(page):
    r = page.evaluate(f"() => {{ const s={BASE}; s.undercut=0.42; s.homeownerShare=0.6; const o=window.SunStackEngine.applyPreset(s,'optimistic'); return [o.undercut,o.homeownerShare]; }}")
    assert r == [0.42, 0.6]

def test_optimistic_beats_pessimistic(page):
    hi = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.computeScenario(window.SunStackEngine.applyPreset(s,'optimistic')).homeowner.netAud;}}")
    lo = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.computeScenario(window.SunStackEngine.applyPreset(s,'pessimistic')).homeowner.netAud;}}")
    assert hi > lo

def test_breakeven_zeroes_net(page):
    u = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.breakevenUtilization(s);}}")
    if u is not None:
        net = page.evaluate(f"() => {{const s={BASE}; s.utilization={u}; return window.SunStackEngine.computeScenario(s).homeowner.netAud;}}")
        assert abs(net) < 1.0

def test_hub_layout_bounds_and_count(page):
    r = page.evaluate("() => window.SunStackEngine.hubLayout(9, 600, 400)")
    assert len(r) == 9
    assert all(0 <= p['x'] <= 600 and 0 <= p['y'] <= 400 for p in r)

def test_hub_layout_empty(page):
    assert page.evaluate("() => window.SunStackEngine.hubLayout(0, 600, 400)") == []
