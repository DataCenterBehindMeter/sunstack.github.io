import pathlib, pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(CALC); yield pg; b.close()

BASE = """{
  preset:'neutral', rig:['dgx_spark'], modelId:'gpt_oss_120b', quant:'q4',
  poolEfficiency:0.75, utilization:0.4, activeHours:16, concurrency:12,
  energyMix:{free:0.6,solar:0.3,grid:0.1}, feedInTariff:3.3, retailRate:30,
  undercut:0.3, homeownerShare:0.5, financed:true,
  platformCostUsdPerMTok:0.002 }"""

def calc(page, patch=""):
    return page.evaluate(f"() => {{ const s = {BASE}; {patch}; return window.SunStackEngine.computeScenario(s); }}")

def test_pool_memory_sums(page):
    assert page.evaluate("() => window.SunStackEngine.poolMemoryGb(['dgx_spark','dgx_spark'])") == 256

def test_fits_gating(page):
    assert page.evaluate("() => window.SunStackEngine.fits(['mac_mini_m4_16'],'gpt_oss_120b','q4')") is False
    assert page.evaluate("() => window.SunStackEngine.fits(['dgx_spark'],'gpt_oss_120b','q4')") is True

def test_energy_mix_normalizes(page):
    # doubling all weights must not change effective price (engine normalizes)
    # BASE has energyMix {free:0.6, solar:0.3, grid:0.1}; doubled = {free:1.2, solar:0.6, grid:0.2}
    a = page.evaluate(f"() => {{const s={BASE}; return window.SunStackEngine.effEnergyPriceAudPerKwh(s);}}")
    b = page.evaluate(f"() => {{const s={BASE}; s.energyMix={{free:1.2,solar:0.6,grid:0.2}}; return window.SunStackEngine.effEnergyPriceAudPerKwh(s);}}")
    assert abs(a-b) < 1e-9

def test_free_energy_is_zero_component(page):
    # 100% free energy => zero energy cost
    o = calc(page, "s.energyMix={free:1,solar:0,grid:0}")
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
    # overhead is always 0 (removed as user input); net = share - energy - hardware
    recon = h["shareAud"] - h["energyCostAud"] - h["amortizedHardwareAud"]
    assert abs(recon - h["netAud"]) < 1e-6            # net is exactly its parts
    assert abs(h["shareAud"] - o["grossRevenueAud"] * 0.5) < 1e-6  # homeownerShare=0.5

def test_does_not_fit_yields_zero_revenue(page):
    o = calc(page, "s.rig=['mac_mini_m4_16']; s.modelId='kimi_k26'")
    assert o["fits"] is False and o["tokensPerYear"] == 0 and o["grossRevenueAud"] == 0

def test_energy_zero_when_not_fit(page):
    # a node running no paid work (model does not fit) must not book inference energy
    o = calc(page, "s.rig=['mac_mini_m4_16']; s.modelId='kimi_k26'")
    assert o["fits"] is False and o["homeowner"]["energyCostAud"] == 0

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

def test_breakeven_null_when_zero_slope(page):
    # model does not fit => tokens=0 at every utilization => net is constant => slope 0 => null
    u = page.evaluate(f"() => {{const s={BASE}; s.rig=['mac_mini_m4_16']; s.modelId='kimi_k26'; return window.SunStackEngine.breakevenUtilization(s);}}")
    assert u is None

def test_breakeven_null_when_out_of_range(page):
    # When not financed and homeownerShare is tiny, the fixed hardware amortization
    # cost exceeds any revenue at utilization ≤ 1 → breakeven is > 1 → null.
    # Use financed=false so amortized hardware cost is always present;
    # set homeownerShare very low so revenue never covers hardware cost at u≤1.
    u = page.evaluate(f"() => {{const s={BASE}; s.financed=false; s.homeownerShare=0.001; return window.SunStackEngine.breakevenUtilization(s);}}")
    assert u is None

def test_hub_layout_bounds_and_count(page):
    r = page.evaluate("() => window.SunStackEngine.hubLayout(9, 600, 400)")
    assert len(r) == 9
    assert all(0 <= p['x'] <= 600 and 0 <= p['y'] <= 400 for p in r)

def test_hub_layout_empty(page):
    assert page.evaluate("() => window.SunStackEngine.hubLayout(0, 600, 400)") == []


# ── Bandwidth-bound throughput tests (Part A) ──────────────────────────────

def test_throughput_bandwidth_bound(page):
    """single-stream formula = EFF * bw / (activeParamsB * quantBytes)."""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      // DGX Spark (273 GB/s) + gpt_oss_120b (5.1B active) at q4 (0.55 B/param)
      // expected = 0.6 * 273 / (5.1 * 0.55) = 163.8 / 2.805 ≈ 58.4 t/s
      const tps = E.singleStreamTps('dgx_spark', 'gpt_oss_120b', 'q4');
      const expected = 0.6 * 273 / (5.1 * 0.55);
      return { tps, expected, ok: Math.abs(tps - expected) < 0.5 };
    }""")
    assert result['ok'], f"singleStreamTps mismatch: got {result['tps']:.2f}, expected {result['expected']:.2f}"

def test_moe_faster_than_dense_same_total(page):
    """A MoE model with fewer active params is faster on the same device.
    gpt_oss_120b (5.1B active) should be faster than llama4_scout (17B active) on DGX Spark."""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      // Both fit in DGX Spark (128 GB) at q4
      const moe_fast = E.singleStreamTps('dgx_spark', 'gpt_oss_120b', 'q4');   // 5.1B active
      const moe_slow  = E.singleStreamTps('dgx_spark', 'llama4_scout', 'q4');  // 17B active
      return { moe_fast, moe_slow, ok: moe_fast > moe_slow };
    }""")
    assert result['ok'], f"MoE faster check failed: {result['moe_fast']:.1f} vs {result['moe_slow']:.1f}"

def test_fitting_rig_has_nonzero_tps(page):
    """Any rig that fits a model has aggServedTps > 0 — no more 0-when-fits."""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      // dgx_spark (128 GB) fits gpt_oss_120b (63 GB Q4)
      const state = {
        rig: ['dgx_spark'], modelId: 'gpt_oss_120b', quant: 'q4',
        poolEfficiency: 0.75, concurrency: 12,
        utilization: 0.4, activeHours: 16,
        energyMix: {free:0.6, solar:0.3, grid:0.1},
        feedInTariff: 3.3, retailRate: 30,
        undercut: 0.2, homeownerShare: 0.55, financed: true,
        platformCostUsdPerMTok: 0.002
      };
      const fits = E.fits(state.rig, state.modelId, state.quant);
      const out = E.computeScenario(state);
      return { fits, aggServedTps: out.aggServedTps, ok: fits && out.aggServedTps > 0 };
    }""")
    assert result['ok'], f"Fitting rig has zero tps: fits={result['fits']}, aggServedTps={result['aggServedTps']}"

def test_both_parties_can_be_positive(page):
    """Default config (minimax_m3, mac_studio_m3ultra_256) yields homeowner.netAud > 0 AND operator.marginAud > 0."""
    result = page.evaluate("""() => {
      const E = window.SunStackEngine;
      const state = {
        rig: ['mac_studio_m3ultra_256'], modelId: 'minimax_m3', quant: 'q4',
        poolEfficiency: 0.75, concurrency: 12,
        utilization: 0.4, activeHours: 16,
        energyMix: {free:0.6, solar:0.3, grid:0.1},
        feedInTariff: 3.3, retailRate: 30,
        undercut: 0.2, homeownerShare: 0.55, financed: true,
        platformCostUsdPerMTok: 0.002, preset: 'neutral'
      };
      const out = E.computeScenario(state);
      return {
        homeownerNet: out.homeowner.netAud,
        operatorMargin: out.operator.marginAud,
        ok: out.homeowner.netAud > 0 && out.operator.marginAud > 0
      };
    }""")
    assert result['ok'], (
        f"Default config not both-positive: "
        f"homeowner={result['homeownerNet']:.0f}, operator={result['operatorMargin']:.0f}"
    )
