from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

CALC = (Path(__file__).resolve().parent.parent / 'calculator.html').as_uri()


@pytest.fixture()
def page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.goto(CALC)
        yield page
        browser.close()


def test_allocation_accounts_for_platform_and_losses(page):
    for share in [0.55, 1]:
        page.evaluate('''share => {
            SunStackUI.state.homeownerShare = share;
            SunStackUI.renderOutputs();
        }''', share)
        expected = page.evaluate('SunStackEngine.computeScenario(SunStackUI.state)')
        rows = page.locator('[data-allocation-value]').evaluate_all('els => els.map(el => Number(el.dataset.allocationValue))')
        assert sum(rows) == pytest.approx(expected['buyer']['cloudCostAud'])
        assert len(rows) == 6
        assert float(page.locator('[data-allocation="platform"]').get_attribute('data-allocation-value')) == pytest.approx(expected['operator']['platformCostAud'])
        if share == 1:
            assert page.locator('.allocation-deficit').is_visible()
            assert 'loss' in page.locator('.allocation-deficit').inner_text().lower()


def test_hours_chart_uses_engine_and_keeps_state(page):
    before = page.evaluate('JSON.stringify(SunStackUI.state)')
    points = page.locator('[data-hours]').evaluate_all('els => els.map(el => ({hours: Number(el.dataset.hours), homeowner: Number(el.dataset.homeowner), operator: Number(el.dataset.operator)}))')
    assert [point['hours'] for point in points] == list(range(0, 25, 4))
    for point in points:
        expected = page.evaluate('hours => SunStackEngine.computeScenario({...SunStackUI.state, activeHours: hours})', point['hours'])
        assert point['homeowner'] == pytest.approx(expected['homeowner']['netAud'])
        assert point['operator'] == pytest.approx(expected['operator']['marginAud'])
    assert page.evaluate('JSON.stringify(SunStackUI.state)') == before
    assert page.locator('#hours-chart .chart-zero').count() == 1


def test_live_throughput_summary_does_not_replace_slider(page):
    slider = page.query_selector('#in-concurrency')
    before = page.locator('#rig-summary').inner_text()
    slider.evaluate('el => { el.value = 32; el.dispatchEvent(new Event("input")); }')
    assert slider.evaluate('el => el.isConnected')
    assert page.locator('#rig-summary').inner_text() != before
    assert '32 concurrent' in page.locator('#rig-summary').inner_text()
    assert page.locator('.preset-btn.active').count() == 0


def test_large_rig_stays_inside_enclosure_and_removal_keeps_focus(page):
    page.evaluate('''() => {
        SunStackUI.state.rig = Array(12).fill('dgx_spark');
        SunStackUI.render();
    }''')
    nodes = page.locator('#rig-svg .rig-node')
    assert nodes.count() == 12
    assert page.locator('#rig-svg .rig-edge').count() == 12
    assert page.evaluate('''() => {
        const svg = document.querySelector('#rig-svg');
        const bounds = svg.viewBox.baseVal;
        return [...svg.querySelectorAll('.rig-node')].every(node => {
            const box = node.getBBox();
            const matrix = node.transform.baseVal.consolidate().matrix;
            return box.x + matrix.e >= 0 && box.y + matrix.f >= 0 &&
                box.x + matrix.e + box.width <= bounds.width &&
                box.y + matrix.f + box.height <= bounds.height;
        });
    }''')
    nodes.nth(2).focus()
    page.keyboard.press('Enter')
    assert nodes.count() == 11
    assert page.locator('.rig-node:focus').count() == 1


@pytest.mark.parametrize('width', [320, 390, 768, 1024, 1440])
def test_dashboard_layout_and_device_assets(page, width):
    page.set_viewport_size({'width': width, 'height': 1000})
    page.reload()
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')
    assert page.locator('.device-illustration').count() > 0
    page.wait_for_function('''() => [...document.querySelectorAll('img.device-illustration')].every(img => img.complete && img.naturalWidth > 0)''')
    if width >= 1024:
        assert page.locator('#results').bounding_box()['y'] < page.locator('#rig-builder').bounding_box()['y']
        assert page.locator('#panels').bounding_box()['x'] > page.locator('#rig-builder').bounding_box()['x']


def test_empty_rig_clears_charts(page):
    page.locator('.rig-node').click()
    assert page.locator('.results-empty').is_visible()
    assert page.locator('#hours-chart').count() == 0
    assert page.locator('#split-bar').count() == 0


def test_large_financial_values_fit_mobile_cards(page):
    page.set_viewport_size({'width': 320, 'height': 844})
    page.evaluate("""() => {
        Object.assign(SunStackUI.state, {
            rig: Array(12).fill('gpu_5090'), modelId: 'qwen36_35b_a3b',
            activeHours: 24, concurrency: 64
        });
        SunStackUI.render();
    }""")
    page.evaluate('document.fonts.ready')
    assert page.evaluate("""() => [...document.querySelectorAll('.card-val')].every(el => {
        const text = document.createRange();
        text.selectNodeContents(el);
        const bounds = text.getBoundingClientRect();
        const card = el.closest('.result-card').getBoundingClientRect();
        return bounds.left >= card.left && bounds.right <= card.right &&
            el.scrollWidth <= el.clientWidth + 1;
    })""")


def test_fallback_model_and_summary_agree(page):
    page.locator('.rig-node').click()
    page.locator('[data-add-device="mac_mini_m4_16"]').click()
    assert page.evaluate('SunStackUI.state.modelId') == 'gpt_oss_20b'
    assert page.locator('#model-select').input_value() == 'gpt_oss_20b'
    assert 'Model fits' in page.locator('#rig-summary').inner_text()
