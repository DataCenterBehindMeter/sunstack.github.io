/* SunStack calculator — headline estimates and SVG insights.
 * Loaded after calculator-ui.js; all economic values come from SunStackEngine.
 */
(function () {
  'use strict';

  const E = window.SunStackEngine;
  const money = value => (value < 0 ? '−' : '') + 'A$' + Math.round(Math.abs(value)).toLocaleString('en-AU');
  const compact = value => (value < 0 ? '−' : '') + (Math.abs(value) >= 1000
    ? (Math.abs(value) / 1000).toFixed(1) + 'k' : Math.round(Math.abs(value)));

  function card(id, label, value, sub, negative) {
    const valueLength = value.replace(/<[^>]*>/g, '').length;
    return '<article style="--value-length:' + valueLength + '" class="result-card' + (negative ? ' neg' : '') + '" id="card-' + id + '">' +
      '<div class="card-label">' + label + '</div><div class="card-val">' + value + '</div>' +
      '<div class="card-sub">' + sub + '</div></article>';
  }

  function renderAllocation(state, out) {
    const segments = [
      {id: 'buyer-saves', label: 'Buyer savings', value: out.buyer.savesAud},
      {id: 'homeowner', label: 'Homeowner net', value: out.homeowner.netAud},
      {id: 'operator', label: 'Operator margin', value: out.operator.marginAud},
      {id: 'energy', label: 'Energy', value: out.homeowner.energyCostAud},
      {id: 'hardware', label: 'Hardware', value: state.financed ? out.operator.financingCostAud : out.homeowner.amortizedHardwareAud},
      {id: 'platform', label: 'Platform', value: out.operator.platformCostAud}
    ];
    const positiveTotal = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
    const losses = segments.reduce((sum, segment) => sum + Math.max(0, -segment.value), 0);
    const bar = segments.filter(segment => segment.value > 0).map(segment => {
      const pct = segment.value / positiveTotal * 100;
      const label = segment.label + ': ' + money(segment.value);
      return '<span class="split-seg seg-' + segment.id + '" style="width:' + pct + '%" title="' + label + '" aria-label="' + label + '"></span>';
    }).join('');
    const legend = segments.map(segment =>
      '<div class="split-legend-item" data-allocation="' + segment.id + '" data-allocation-value="' + segment.value + '">' +
      '<span class="split-swatch seg-' + segment.id + '"></span><span>' + segment.label + '</span>' +
      '<strong class="' + (segment.value < 0 ? 'negative-value' : '') + '">' + money(segment.value) + '</strong></div>'
    ).join('');
    return '<article class="insight-card split-bar-wrap"><div class="chart-heading"><div>' +
      '<span class="section-kicker">THE VALUE SPLIT</span><h3 class="split-bar-title">Where the cloud spend goes</h3></div>' +
      '<span class="chart-unit">AUD / year</span></div>' +
      '<div class="allocation-total">' + money(out.buyer.cloudCostAud) + '<span>cloud-equivalent spend</span></div>' +
      '<div class="split-bar" id="split-bar" role="img" aria-label="Positive annual allocations. Exact amounts follow below.">' + bar + '</div>' +
      (losses > 0.005 ? '<p class="allocation-deficit">' + money(losses) + ' combined loss. Positive allocations total ' +
        money(positiveTotal) + '; the bar uses this total. Losses are shown below.</p>' :
        '<p class="chart-caption">The same output, shared savings, and the costs of running your node.</p>') +
      '<div class="split-legend">' + legend + '</div>' +
      '<p class="chart-footnote">Hardware spread over ' + window.SunStackData.HARDWARE_LIFETIME_YEARS +
      ' years · Energy includes foregone solar feed-in.</p></article>';
  }

  function renderHours(state, current) {
    const points = Array.from({length: 7}, (_, index) => {
      const hours = index * 4;
      return {hours, out: E.computeScenario({...state, activeHours: hours})};
    });
    const values = points.flatMap(point => [point.out.homeowner.netAud, point.out.operator.marginAud]);
    const low = Math.min(0, ...values), high = Math.max(0, ...values);
    const spread = high - low || 1;
    const yMin = low - spread * 0.12, yMax = high + spread * 0.15;
    const mobile = window.matchMedia('(max-width: 600px)').matches;
    const width = mobile ? 360 : 560;
    const left = mobile ? 50 : 64, right = width - 34, top = 26, bottom = 210;
    const x = hours => left + hours / 24 * (right - left);
    const y = value => bottom - (value - yMin) / (yMax - yMin) * (bottom - top);
    const series = [
      {name: 'Homeowner net', cls: 'homeowner', value: out => out.homeowner.netAud},
      {name: 'Operator margin', cls: 'operator', value: out => out.operator.marginAud}
    ];
    let svg = '<svg id="hours-chart" class="' + (mobile ? 'chart-mobile' : '') + '" viewBox="0 0 ' + width + ' 258" role="img" aria-labelledby="hours-chart-title hours-chart-desc">' +
      '<title id="hours-chart-title">Daily operating hours versus annual returns</title>' +
      '<desc id="hours-chart-desc">Homeowner net and operator margin from zero to 24 hours per day. Current selection: ' +
      state.activeHours + ' hours, homeowner ' + money(current.homeowner.netAud) + ', operator ' + money(current.operator.marginAud) +
      '. All other inputs held fixed. Exact values in the table below.</desc>';
    [low, (low + high) / 2, high].filter((value, index, all) => all.indexOf(value) === index).forEach(value => {
      if (Math.abs(value) < spread * 0.06) return;
      svg += '<path class="chart-gridline" d="M' + left + ' ' + y(value) + 'H' + right + '"/>' +
        '<text class="chart-tick" x="' + (left - 10) + '" y="' + (y(value) + 4) + '" text-anchor="end">' + compact(value) + '</text>';
    });
    svg += '<path class="chart-zero" d="M' + left + ' ' + y(0) + 'H' + right + '"/>' +
      '<text class="chart-tick" x="' + (left - 10) + '" y="' + (y(0) + 4) + '" text-anchor="end">0</text>';
    points.forEach(point => {
      svg += '<text class="chart-tick" x="' + x(point.hours) + '" y="235" text-anchor="middle">' + point.hours + '</text>';
    });
    svg += '<text class="chart-axis-title" x="' + left + '" y="12">AUD / year</text>' +
      '<text class="chart-axis-title" x="' + right + '" y="254" text-anchor="end">Inference hours / day</text>' +
      '<path class="chart-selection" d="M' + x(state.activeHours) + ' ' + top + 'V' + bottom + '"/>';
    series.forEach(item => {
      const path = points.map((point, index) => (index ? 'L' : 'M') + x(point.hours) + ' ' + y(item.value(point.out))).join(' ');
      svg += '<path class="chart-line line-' + item.cls + '" d="' + path + '"/>' +
        '<circle class="chart-point point-' + item.cls + '" cx="' + x(state.activeHours) + '" cy="' + y(item.value(current)) +
        '" r="5"><title>' + item.name + ': ' + money(item.value(current)) + ' at ' + state.activeHours + ' hours/day</title></circle>';
    });
    svg += '</svg>';
    const rows = points.map(point => '<tr data-hours="' + point.hours + '" data-homeowner="' + point.out.homeowner.netAud +
      '" data-operator="' + point.out.operator.marginAud + '"><th scope="row">' + point.hours + '</th><td>' +
      money(point.out.homeowner.netAud) + '</td><td>' + money(point.out.operator.marginAud) + '</td></tr>').join('');
    return '<article class="insight-card hours-card"><div class="chart-heading"><div><span class="section-kicker">EXPLORE THE TRADE-OFF</span>' +
      '<h3>More hours. Better returns?</h3></div><span class="chart-unit">' + state.activeHours + ' h / day selected</span></div>' +
      '<p class="chart-caption">Annual returns as inference hours change. All other inputs held fixed.</p>' + svg +
      '<div class="chart-series-key"><span><i class="series-homeowner"></i>Homeowner net</span><span><i class="series-operator"></i>Operator margin</span></div>' +
      '<details class="chart-data"><summary>View chart data</summary><table><caption>Annual returns (AUD)</caption><thead><tr><th>Hours / day</th>' +
      '<th>Homeowner</th><th>Operator</th></tr></thead><tbody>' + rows + '</tbody></table></details></article>';
  }

  function _renderResults() {
    const root = document.getElementById('results');
    const charts = document.getElementById('charts');
    const ui = window.SunStackUI;
    if (!root || !charts || !ui) return;
    const state = ui.state;
    if (!state.rig.length) {
      root.innerHTML = '<div class="results-empty"><strong>Start with your hardware.</strong><span>Add a device to see annual revenue, costs and returns.</span></div>';
      charts.innerHTML = '';
      return;
    }
    const out = E.computeScenario(state);
    const owner = state.financed ? 'operator' : 'homeowner';
    const ownerProfit = state.financed ? out.operator.marginAud : out.homeowner.netAud;
    const payback = ownerProfit > 0 ? (out.rigCostAud / ownerProfit).toFixed(1) + '<small> yr</small>' : 'N/A';
    root.innerHTML = '<div class="results-grid">' +
      card('homeowner-net', 'Homeowner net / yr', money(out.homeowner.netAud), money(out.homeowner.perMonthAud) + ' / month after costs', out.homeowner.netAud < 0) +
      card('operator-margin', 'Operator margin / yr', money(out.operator.marginAud), 'After platform + financing', out.operator.marginAud < 0) +
      card('buyer-saves', 'Buyer saves / yr', money(out.buyer.savesAud), Math.round(out.buyer.savePct * 100) + '% below cloud API price', false) +
      card('payback', 'Payback', payback, ownerProfit > 0 ? owner + ' payback at this annual return' : owner + ' return ≤ 0', false) +
      card('roi', 'ROI (' + owner + ')', out.roiPct.toFixed(1) + '<small>%</small>', 'Annual return on hardware cost', out.roiPct < 0) + '</div>' +
      (!out.fits ? '<p class="fit-warning">This model exceeds the memory pool. Select a smaller model or add hardware; hardware costs still apply.</p>' : '');
    // Keep expanded chart data open as slider outputs update.
    const dataOpen = charts.querySelector('.chart-data')?.open || false;
    charts.innerHTML = '<div class="section-heading"><div><span class="section-kicker">03 / UNDERSTAND</span>' +
      '<h2>The economics, at a glance</h2></div><span class="section-meta">Your current scenario</span></div>' +
      '<div class="insights-grid">' + renderAllocation(state, out) + renderHours(state, out) + '</div>';
    charts.querySelector('.chart-data').open = dataOpen;
  }

  window.SunStackUI._renderResults = _renderResults;
  _renderResults();
})();
