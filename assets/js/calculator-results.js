/* SunStack calculator — results cards + charts (Task 9).
 * Sets window.SunStackUI._renderResults and window.SunStackUI._renderCharts.
 * Depends on: SunStackEngine (window.SunStackEngine), uPlot (optional global).
 * Must be loaded AFTER calculator-ui.js.
 */
(function () {
  'use strict';

  const E = window.SunStackEngine;

  /* ── AUD formatter ──────────────────────────────────────────────────────── */
  const fmtAud = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  });

  function fmtAudVal(v) {
    return fmtAud.format(Math.round(v));
  }

  /* ── Results cards ──────────────────────────────────────────────────────── */
  function _renderResults() {
    const root = document.getElementById('results');
    if (!root) return;

    const ui = window.SunStackUI;
    if (!ui) return;
    const state = ui.state;

    // Guard: need at least one device
    if (!state.rig || state.rig.length === 0) {
      root.innerHTML = '<p class="results-empty">Add a device above to see revenue projections.</p>';
      return;
    }

    const out = E.computeScenario(state);

    root.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'results-grid';

    // ── Homeowner net card ────────────────────────────────────────────────
    const netCard = document.createElement('div');
    netCard.className = 'result-card' + (out.homeowner.netAud < 0 ? ' neg' : '');
    netCard.id = 'card-homeowner-net';
    netCard.innerHTML =
      '<div class="card-label">Homeowner net / yr</div>' +
      '<div class="card-val">' + fmtAudVal(out.homeowner.netAud) + '</div>' +
      '<div class="card-sub">' + fmtAudVal(out.homeowner.perMonthAud) + ' / mo</div>';
    grid.appendChild(netCard);

    // ── Payback card ──────────────────────────────────────────────────────
    const paybackCard = document.createElement('div');
    paybackCard.className = 'result-card';
    paybackCard.id = 'card-payback';
    let paybackText;
    if (state.financed || out.paybackYears === Infinity || out.paybackYears <= 0) {
      paybackText = 'N/A';
    } else {
      paybackText = out.paybackYears.toFixed(1) + ' yr';
    }
    paybackCard.innerHTML =
      '<div class="card-label">Payback</div>' +
      '<div class="card-val">' + paybackText + '</div>' +
      '<div class="card-sub">' + (state.financed ? 'No capital at risk' : 'break-even') + '</div>';
    grid.appendChild(paybackCard);

    // ── ROI card ──────────────────────────────────────────────────────────
    const roiCard = document.createElement('div');
    roiCard.className = 'result-card';
    roiCard.id = 'card-roi';
    roiCard.innerHTML =
      '<div class="card-label">ROI</div>' +
      '<div class="card-val">' + out.roiPct.toFixed(1) + '%</div>' +
      '<div class="card-sub">annual return on hardware</div>';
    grid.appendChild(roiCard);

    // ── Operator margin card ──────────────────────────────────────────────
    const opCard = document.createElement('div');
    opCard.className = 'result-card';
    opCard.id = 'card-operator-margin';
    opCard.innerHTML =
      '<div class="card-label">Operator margin / yr</div>' +
      '<div class="card-val">' + fmtAudVal(out.operator.marginAud) + '</div>' +
      '<div class="card-sub">after platform + financing</div>';
    grid.appendChild(opCard);

    // ── Buyer saves card ──────────────────────────────────────────────────
    const buyCard = document.createElement('div');
    buyCard.className = 'result-card';
    buyCard.id = 'card-buyer-saves';
    buyCard.innerHTML =
      '<div class="card-label">Buyer saves / yr</div>' +
      '<div class="card-val">' + fmtAudVal(out.buyer.savesAud) + '</div>' +
      '<div class="card-sub">vs cloud API (' + Math.round(out.buyer.savePct * 100) + '% cheaper)</div>';
    grid.appendChild(buyCard);

    root.appendChild(grid);

    // ── Stacked bar (split-bar) ───────────────────────────────────────────
    const bd = out.breakdown;
    const total = (bd.homeownerTakeAud || 0) + (bd.operatorMarginAud || 0) +
                  (bd.energyAud || 0) + (bd.hardwareAud || 0);

    if (total > 0) {
      const barWrap = document.createElement('div');
      barWrap.className = 'split-bar-wrap';

      const barTitle = document.createElement('div');
      barTitle.className = 'split-bar-title';
      barTitle.textContent = 'Revenue split';
      barWrap.appendChild(barTitle);

      const bar = document.createElement('div');
      bar.id = 'split-bar';
      bar.className = 'split-bar';

      const segments = [
        { key: 'homeownerTakeAud', label: 'Homeowner',  val: bd.homeownerTakeAud  || 0, cls: 'seg-homeowner' },
        { key: 'operatorMarginAud', label: 'Operator',  val: bd.operatorMarginAud || 0, cls: 'seg-operator' },
        { key: 'energyAud',        label: 'Energy',     val: bd.energyAud         || 0, cls: 'seg-energy' },
        { key: 'hardwareAud',      label: 'Hardware',   val: bd.hardwareAud       || 0, cls: 'seg-hardware' }
      ];

      segments.forEach(seg => {
        if (seg.val <= 0) return;
        const pct = (seg.val / total * 100).toFixed(1);
        const seg_el = document.createElement('div');
        seg_el.className = 'split-seg ' + seg.cls;
        seg_el.style.width = pct + '%';
        seg_el.setAttribute('title', seg.label + ': ' + fmtAudVal(seg.val) + ' (' + pct + '%)');
        seg_el.setAttribute('aria-label', seg.label + ' ' + pct + ' percent');
        bar.appendChild(seg_el);
      });

      barWrap.appendChild(bar);

      // Legend
      const legend = document.createElement('div');
      legend.className = 'split-legend';
      segments.forEach(seg => {
        const item = document.createElement('span');
        item.className = 'split-legend-item';
        item.innerHTML =
          '<span class="split-swatch ' + seg.cls + '"></span>' +
          '<span>' + seg.label + '</span>';
        legend.appendChild(item);
      });
      barWrap.appendChild(legend);

      root.appendChild(barWrap);
    }
  }

  /* ── Charts ─────────────────────────────────────────────────────────────── */
  function _renderCharts() {
    const root = document.getElementById('charts');
    if (!root) return;

    const ui = window.SunStackUI;
    if (!ui) return;
    const state = ui.state;

    root.innerHTML = '';

    if (!state.rig || state.rig.length === 0) {
      root.innerHTML = '<p class="results-empty">Add a device to see charts.</p>';
      return;
    }

    const chartsTitle = document.createElement('h2');
    chartsTitle.className = 'charts-section-title';
    chartsTitle.textContent = 'Sensitivity & Break-even';
    root.appendChild(chartsTitle);

    _renderTornado(root, state);
    _renderBreakeven(root, state);
  }

  /* ── Tornado chart ──────────────────────────────────────────────────────── */
  function _renderTornado(root, state) {
    const wrap = document.createElement('div');
    wrap.className = 'chart-wrap';

    const title = document.createElement('div');
    title.className = 'chart-title';
    title.textContent = 'Sensitivity (tornado)';
    wrap.appendChild(title);

    const container = document.createElement('div');
    container.id = 'tornado';
    container.className = 'chart-container';
    wrap.appendChild(container);

    root.appendChild(wrap);

    // Compute sensitivity for each uncertainty input
    const base = E.computeScenario(state).homeowner.netAud;

    const rows = [];
    E.UNCERTAINTY_INPUT_IDS.forEach(function (id) {
      const def = window.SunStackData && window.SunStackData.INPUT_DEFAULTS
                  ? window.SunStackData.INPUT_DEFAULTS[id]
                  : null;
      if (!def) return;

      const stLow  = Object.assign({}, state, { [id]: def.low });
      const stHigh = Object.assign({}, state, { [id]: def.high });
      const netLow  = E.computeScenario(stLow).homeowner.netAud;
      const netHigh = E.computeScenario(stHigh).homeowner.netAud;
      const delta = Math.abs(netHigh - netLow);
      rows.push({ id, label: id, netLow, netHigh, delta });
    });

    // Sort descending by |Δ net|
    rows.sort((a, b) => b.delta - a.delta);
    const top = rows.slice(0, 8);

    if (window.uPlot && top.length > 0) {
      _renderTornadoUplot(container, top, state);
    } else {
      _renderTornadoFallback(container, top);
    }
  }

  function _renderTornadoUplot(container, rows, state) {
    // uPlot horizontal bar: we simulate with a vertical bar chart
    // x = row index, two series: low-end net, high-end net
    const labels = rows.map(r => r.label.replace(/([A-Z])/g, ' $1').trim());
    const lowVals  = rows.map(r => r.netLow);
    const highVals = rows.map(r => r.netHigh);
    const xs = rows.map((_, i) => i);

    const w = container.clientWidth || 500;
    const h = Math.max(180, rows.length * 36 + 40);

    const opts = {
      width:  w,
      height: h,
      title: '',
      scales: { x: { time: false }, y: {} },
      axes: [
        {
          values: (u, vals) => vals.map(v => {
            const i = Math.round(v);
            return (labels[i] !== undefined) ? labels[i] : '';
          }),
          size: 130,
          gap: 6,
          font: '11px sans-serif',
          stroke: '#837d72'
        },
        {
          values: (u, vals) => vals.map(v => 'A$' + Math.round(v / 1000) + 'k'),
          size: 60,
          gap: 4,
          font: '11px sans-serif',
          stroke: '#837d72'
        }
      ],
      series: [
        {},
        {
          label: 'Low',
          stroke: '#5db8a6',
          fill:   'rgba(93,184,166,0.25)',
          width:  2,
          points: { show: false }
        },
        {
          label: 'High',
          stroke: '#e8932a',
          fill:   'rgba(232,147,42,0.25)',
          width:  2,
          points: { show: false }
        }
      ],
      data: [xs, lowVals, highVals]
    };

    try {
      new window.uPlot(opts, [xs, lowVals, highVals], container);
    } catch (e) {
      _renderTornadoFallback(container, rows);
    }
  }

  function _renderTornadoFallback(container, rows) {
    const table = document.createElement('table');
    table.className = 'chart-fallback';
    table.innerHTML =
      '<thead><tr><th>Input</th><th>Net (low)</th><th>Net (high)</th><th>|Δ|</th></tr></thead>';
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + r.id + '</td>' +
        '<td>' + (r.netLow >= 0 ? '' : '-') + 'A$' + Math.abs(Math.round(r.netLow)).toLocaleString('en-AU') + '</td>' +
        '<td>' + (r.netHigh >= 0 ? '' : '-') + 'A$' + Math.abs(Math.round(r.netHigh)).toLocaleString('en-AU') + '</td>' +
        '<td>A$' + Math.round(r.delta).toLocaleString('en-AU') + '</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  /* ── Break-even chart ───────────────────────────────────────────────────── */
  function _renderBreakeven(root, state) {
    const wrap = document.createElement('div');
    wrap.className = 'chart-wrap';

    const title = document.createElement('div');
    title.className = 'chart-title';
    title.textContent = 'Net income vs utilisation';
    wrap.appendChild(title);

    const container = document.createElement('div');
    container.id = 'breakeven';
    container.className = 'chart-container';
    wrap.appendChild(container);

    root.appendChild(wrap);

    // Sample 21 points from 0 to 1
    const N = 21;
    const us = [];
    const nets = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      us.push(u);
      const s = Object.assign({}, state, { utilization: u });
      nets.push(E.computeScenario(s).homeowner.netAud);
    }

    const beu = E.breakevenUtilization(state);

    if (window.uPlot) {
      _renderBreakevenUplot(container, us, nets, beu);
    } else {
      _renderBreakevenFallback(container, us, nets, beu);
    }
  }

  function _renderBreakevenUplot(container, us, nets, beu) {
    const w = container.clientWidth || 500;
    const h = 220;

    const annotations = [];
    if (beu !== null && beu >= 0 && beu <= 1) {
      annotations.push({ x: beu, label: 'Break-even' });
    }

    const opts = {
      width:  w,
      height: h,
      title: '',
      scales: {
        x: { time: false, range: [0, 1] },
        y: {}
      },
      axes: [
        {
          label: 'Utilisation',
          values: (u, vals) => vals.map(v => Math.round(v * 100) + '%'),
          font: '11px sans-serif',
          stroke: '#837d72'
        },
        {
          values: (u, vals) => vals.map(v =>
            v == null ? '' : (v >= 0 ? 'A$' : '-A$') + Math.abs(Math.round(v / 1000)) + 'k'
          ),
          size: 68,
          font: '11px sans-serif',
          stroke: '#837d72'
        }
      ],
      series: [
        {},
        {
          label: 'Homeowner net',
          stroke: '#5db8a6',
          fill:   (u, seriesIdx) => {
            const grad = u.ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0,   'rgba(93,184,166,0.3)');
            grad.addColorStop(1,   'rgba(93,184,166,0.0)');
            return grad;
          },
          width:  2,
          points: { show: false }
        }
      ],
      hooks: {
        draw: [
          function (u) {
            // draw zero line
            const ctx = u.ctx;
            const y0 = u.valToPos(0, 'y', true);
            if (y0 >= u.bbox.top && y0 <= u.bbox.top + u.bbox.height) {
              ctx.save();
              ctx.strokeStyle = '#e9e4da';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(u.bbox.left, y0);
              ctx.lineTo(u.bbox.left + u.bbox.width, y0);
              ctx.stroke();
              ctx.restore();
            }
            // draw break-even vertical marker
            if (beu !== null) {
              const xBeu = u.valToPos(beu, 'x', true);
              if (xBeu >= u.bbox.left && xBeu <= u.bbox.left + u.bbox.width) {
                ctx.save();
                ctx.strokeStyle = '#c8761a';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(xBeu, u.bbox.top);
                ctx.lineTo(xBeu, u.bbox.top + u.bbox.height);
                ctx.stroke();
                ctx.fillStyle = '#c8761a';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('break-even', xBeu + 4, u.bbox.top + 14);
                ctx.restore();
              }
            }
          }
        ]
      }
    };

    try {
      new window.uPlot(opts, [us, nets], container);
    } catch (e) {
      _renderBreakevenFallback(container, us, nets, beu);
    }
  }

  function _renderBreakevenFallback(container, us, nets, beu) {
    const table = document.createElement('table');
    table.className = 'chart-fallback';
    let rows = '<thead><tr><th>Utilisation</th><th>Homeowner net/yr</th></tr></thead><tbody>';
    us.forEach((u, i) => {
      const net = nets[i];
      const marker = (beu !== null && Math.abs(u - beu) < 0.03) ? ' ← break-even' : '';
      rows +=
        '<tr><td>' + Math.round(u * 100) + '%</td>' +
        '<td>' + (net >= 0 ? '' : '-') + 'A$' + Math.abs(Math.round(net)).toLocaleString('en-AU') + marker + '</td></tr>';
    });
    rows += '</tbody>';
    table.innerHTML = rows;
    container.appendChild(table);
  }

  /* ── Wire hooks ─────────────────────────────────────────────────────────── */
  if (window.SunStackUI) {
    window.SunStackUI._renderResults = _renderResults;
    window.SunStackUI._renderCharts  = _renderCharts;
    // Re-render now that the output layer is attached
    window.SunStackUI.render && window.SunStackUI.render();
  }

})();
