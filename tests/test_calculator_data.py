import pathlib, pytest
from playwright.sync_api import sync_playwright

CALC = "file://" + str(pathlib.Path(__file__).parent.parent / "calculator.html")

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); yield pg; b.close()

def ev(page, expr): return page.evaluate(f"() => {expr}")

def test_every_source_id_resolves(page):
    page.goto(CALC)
    missing = ev(page, """(() => {
      const D = window.SunStackData, bad = [];
      const check = (o) => { if (o && o.source_id && !D.SOURCES[o.source_id]) bad.push(o.source_id); };
      Object.values(D.DEVICES).forEach(d => { check(d.priceUsd); check(d.loadW); });
      Object.values(D.MODELS).forEach(m => { check(m.priceOutUsdPerM); });
      Object.values(D.INPUT_DEFAULTS).forEach(check);
      return bad;
    })()""")
    assert missing == [], f"unresolved source_ids: {missing}"

def test_ranges_are_ordered(page):
    page.goto(CALC)
    bad = ev(page, """(() => {
      const bad = [];
      Object.entries(window.SunStackData.INPUT_DEFAULTS).forEach(([k,o]) => {
        if (!(o.low <= o.value && o.value <= o.high)) bad.push(k);
        if (o.polarity !== '+' && o.polarity !== '-') bad.push(k+':polarity');
      });
      return bad;
    })()""")
    assert bad == []

def test_every_source_has_url(page):
    page.goto(CALC)
    bad = ev(page, "Object.entries(window.SunStackData.SOURCES).filter(([k,s]) => !s.url || !s.name).map(([k])=>k)")
    assert bad == []

def test_cite_helper(page):
    page.goto(CALC)
    ok = ev(page, "typeof window.SunStackData.cite === 'function' && !!window.SunStackData.cite(Object.keys(window.SunStackData.SOURCES)[0]).url")
    assert ok
