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

  /* Compact AUD for axis/label use, e.g. "A$12k" / "-A$3k" / "A$857". */
  function fmtAudK(v) {
    const sign = v < 0 ? '-' : '';
    const abs  = Math.abs(v);
    if (abs < 1000) {
      return sign + 'A$' + Math.round(abs);
    }
    return sign + 'A$' + (abs / 1000).toFixed(1) + 'k';
  }

  /* ── Human-readable labels for uncertainty inputs (tornado bar labels) ──── */
  const TORNADO_LABELS = {
    utilization:           'Utilization',
    activeHours:           'Active hours/day',
    poolEfficiency:        'Pool efficiency',
    feedInTariff:          'Feed-in tariff',
    retailRate:            'Retail rate',
    hardwareLifetimeYears: 'Hardware lifetime',
    overheadPerYearAud:    'Overhead/yr'
  };

  /* ── SVG helper ─────────────────────────────────────────────────────────── */
  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
    }
    return el;
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
    // When financed: operator payback = rigCostAud / operatorMargin (operator bears capital).
    // When not financed: homeowner payback = rigCostAud / homeownerNet (homeowner bears capital).
    const paybackCard = document.createElement('div');
    paybackCard.className = 'result-card';
    paybackCard.id = 'card-payback';
    let paybackText;
    let paybackSub;
    if (state.financed) {
      const opMargin = out.operator.marginAud;
      if (opMargin > 0) {
        const opPayback = out.rigCostAud / opMargin;
        paybackText = opPayback.toFixed(1) + ' yr';
        paybackSub  = 'operator payback';
      } else {
        paybackText = 'N/A';
        paybackSub  = 'operator margin ≤ 0';
      }
    } else {
      const hwNet = out.homeowner.netAud;
      if (hwNet > 0) {
        const hwPayback = out.rigCostAud / hwNet;
        paybackText = hwPayback.toFixed(1) + ' yr';
        paybackSub  = 'homeowner payback';
      } else {
        paybackText = 'N/A';
        paybackSub  = 'homeowner net ≤ 0';
      }
    }
    paybackCard.innerHTML =
      '<div class="card-label">Payback</div>' +
      '<div class="card-val">' + paybackText + '</div>' +
      '<div class="card-sub">' + paybackSub + '</div>';
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

    const chartsTitle = document.createElement('h2');
    chartsTitle.className = 'charts-section-title';
    chartsTitle.textContent = 'Sensitivity & Break-even';
    root.appendChild(chartsTitle);

    // Always build BOTH chart scaffolds (title + #tornado / #breakeven
    // container) so the containers exist even for an empty rig — the spec
    // requires #tornado to always hold a chart or a fallback.
    const tornadoContainer  = _buildChartScaffold(root, 'tornado',   'Sensitivity (tornado)');
    const breakevenContainer = _buildChartScaffold(root, 'breakeven', 'Net income vs utilisation');

    const hasRig = state.rig && state.rig.length > 0;

    // ── Tornado (always hand-SVG; renders even with empty rig) ───────────────
    _renderTornado(tornadoContainer, state, hasRig);

    // ── Break-even (uPlot + table fallback) ─────────────────────────────────
    if (hasRig) {
      _renderBreakeven(breakevenContainer, state);
    } else {
      const p = document.createElement('p');
      p.className = 'results-empty';
      p.textContent = 'Add a device to see the break-even curve.';
      breakevenContainer.appendChild(p);
    }
  }

  /* Build a .chart-wrap holding a titled empty #id container, return the container. */
  function _buildChartScaffold(root, id, titleText) {
    const wrap = document.createElement('div');
    wrap.className = 'chart-wrap';

    const title = document.createElement('div');
    title.className = 'chart-title';
    title.textContent = titleText;
    wrap.appendChild(title);

    const container = document.createElement('div');
    container.id = id;
    container.className = 'chart-container';
    wrap.appendChild(container);

    root.appendChild(wrap);
    return container;
  }

  /* ── Tornado chart (hand-SVG horizontal bars) ───────────────────────────────
   * For each uncertainty input, a horizontal bar spans from the homeowner net at
   * that input's `low` to its net at `high` (others held at current state),
   * ranked DESCENDING by |Δnet| (biggest driver on top). The two halves around
   * the base-case net are coloured with brand tokens: teal toward the lower-net
   * end, amber toward the higher-net end.
   */
  function _renderTornado(container, state, hasRig) {
    container.innerHTML = '';

    // Empty rig → the spec requires #tornado to ALWAYS hold a chart or a
    // .chart-fallback table. There is no sensitivity to draw without a rig, so
    // render a one-row .chart-fallback placeholder (keeps the container valid).
    if (!hasRig) {
      const table = document.createElement('table');
      table.className = 'chart-fallback';
      table.innerHTML =
        '<thead><tr><th>Input</th><th>Sensitivity</th></tr></thead>' +
        '<tbody><tr><td colspan="2">Add a device to rank which assumptions ' +
        'move homeowner net income the most.</td></tr></tbody>';
      container.appendChild(table);
      return;
    }

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
      rows.push({ id, label: TORNADO_LABELS[id] || id, netLow, netHigh, delta });
    });

    // Rank descending by |Δ net| — biggest driver first (top).
    rows.sort((a, b) => b.delta - a.delta);

    if (rows.length === 0) {
      const p = document.createElement('p');
      p.className = 'results-empty';
      p.textContent = 'No sensitivity data available.';
      container.appendChild(p);
      return;
    }

    // ── SVG geometry ────────────────────────────────────────────────────────
    const LABEL_W = 128;   // left gutter for input labels
    const VAL_W   = 56;    // right gutter for Δ value
    const ROW_H   = 30;    // per-row height (incl. gap)
    const BAR_H   = 16;
    const PAD_T   = 8;
    const PAD_B   = 24;    // space for base-case axis label
    const W       = 560;
    const plotL   = LABEL_W;
    const plotR   = W - VAL_W;
    const plotW   = plotR - plotL;
    const H       = PAD_T + rows.length * ROW_H + PAD_B;

    // Domain: min/max across all low/high nets and the base-case, so the
    // base-case (0-net line separate) sits proportionally.
    let lo = base, hi = base;
    rows.forEach(r => {
      lo = Math.min(lo, r.netLow, r.netHigh);
      hi = Math.max(hi, r.netLow, r.netHigh);
    });
    if (hi === lo) { hi = lo + 1; }   // avoid divide-by-zero
    const span = hi - lo;
    const xOf = v => plotL + ((v - lo) / span) * plotW;

    const svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      width: W,
      height: H,
      role: 'img',
      'aria-label': 'Tornado sensitivity chart of homeowner net income',
      class: 'tornado-svg'
    });
    // Let the SVG scale down responsively.
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.maxWidth = W + 'px';

    // Base-case vertical reference line.
    const baseX = xOf(base);
    svg.appendChild(svgEl('line', {
      x1: baseX, y1: PAD_T, x2: baseX, y2: PAD_T + rows.length * ROW_H,
      class: 'tornado-baseline'
    }));
    const baseLbl = svgEl('text', {
      x: baseX, y: H - 8,
      'text-anchor': 'middle',
      class: 'tornado-base-label'
    });
    baseLbl.textContent = 'base ' + fmtAudK(base);
    svg.appendChild(baseLbl);

    rows.forEach((r, i) => {
      const yTop = PAD_T + i * ROW_H;
      const yBar = yTop + (ROW_H - BAR_H) / 2;
      const cy   = yBar + BAR_H / 2;

      // Bar spans low↔high; split at the base-case net.
      const xLow  = xOf(r.netLow);
      const xHigh = xOf(r.netHigh);
      const barL  = Math.min(xLow, xHigh);
      const barR  = Math.max(xLow, xHigh);

      // Split point = base-case x, clamped into [barL, barR].
      const split = Math.max(barL, Math.min(barR, baseX));

      // Lower-net half (teal): from barL to split.
      if (split - barL > 0.5) {
        svg.appendChild(svgEl('rect', {
          x: barL, y: yBar, width: (split - barL), height: BAR_H,
          rx: 2, ry: 2, class: 'tornado-bar-low'
        }));
      }
      // Higher-net half (amber): from split to barR.
      if (barR - split > 0.5) {
        svg.appendChild(svgEl('rect', {
          x: split, y: yBar, width: (barR - split), height: BAR_H,
          rx: 2, ry: 2, class: 'tornado-bar-high'
        }));
      }
      // If the whole bar is on one side of base (degenerate split), ensure at
      // least a visible sliver exists.
      if (barR - barL < 0.5) {
        svg.appendChild(svgEl('rect', {
          x: barL - 1, y: yBar, width: 2, height: BAR_H,
          class: 'tornado-bar-high'
        }));
      }

      // Row label (left gutter).
      const lbl = svgEl('text', {
        x: LABEL_W - 8, y: cy + 3,
        'text-anchor': 'end',
        class: 'tornado-row-label'
      });
      lbl.textContent = r.label;
      const titleEl = svgEl('title', {});
      titleEl.textContent = r.label + ': ' + fmtAudVal(r.netLow) + ' … ' + fmtAudVal(r.netHigh) +
                            ' (Δ ' + fmtAudVal(r.delta) + ')';
      lbl.appendChild(titleEl);
      svg.appendChild(lbl);

      // Δ value (right gutter).
      const val = svgEl('text', {
        x: plotR + 6, y: cy + 3,
        'text-anchor': 'start',
        class: 'tornado-delta-label'
      });
      val.textContent = fmtAudK(r.delta);
      svg.appendChild(val);
    });

    container.appendChild(svg);
  }

  /* ── Break-even chart ───────────────────────────────────────────────────── */
  function _renderBreakeven(container, state) {
    container.innerHTML = '';

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
          values: (u, vals) => vals.map(v => {
            if (v == null) return '';
            return fmtAudK(v);
          }),
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
