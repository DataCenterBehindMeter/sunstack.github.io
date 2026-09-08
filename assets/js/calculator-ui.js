/* SunStack calculator — UI controller (Task 6+).
 * Depends on: SunStackData, SunStackEngine (loaded before this file).
 * DOM mount points: #rig-builder, #panels, #results, #charts, #sources, #references.
 */
window.SunStackUI = (function () {
  'use strict';

  const D  = window.SunStackData;
  const E  = window.SunStackEngine;
  const ID = D.INPUT_DEFAULTS;

  /* ── State ──────────────────────────────────────────────────────────────── */
  const state = {
    rig: [],
    modelId:  'gpt_oss_120b',
    quant:    'q4',

    // uncertainty inputs — seeded from INPUT_DEFAULTS typical values
    poolEfficiency:          ID.poolEfficiency.value,
    utilization:             ID.utilization.value,
    activeHours:             ID.activeHours.value,
    feedInTariff:            ID.feedInTariff.value,
    retailRate:              ID.retailRate.value,
    batteryCost:             ID.batteryCost.value,
    hardwareLifetimeYears:   ID.hardwareLifetimeYears.value,
    overheadPerYearAud:      ID.overheadPerYearAud.value,
    fxAudPerUsd:             ID.fxAudPerUsd.value,

    // energy mix (fractions that must sum to 1; default: 100% grid)
    energyMix: { free: 0, solar: 0, grid: 1, battery: 0 },

    // pricing + shares
    tariffs:              null,   // null = no state override (panels task sets this)
    undercut:             0.20,   // 20% below market
    homeownerShare:       0.70,   // homeowner gets 70% of gross

    // hardware
    financed:             true,
    platformCostUsdPerMTok: 0.04,

    // scenario
    preset: 'neutral'
  };

  /* ── SVG dimensions ─────────────────────────────────────────────────────── */
  const SVG_W = 640, SVG_H = 380;
  const HUB_CX = SVG_W / 2, HUB_CY = SVG_H / 2;
  const HUB_R  = 28;   // hub circle radius
  const NODE_W = 110, NODE_H = 44, NODE_R = 8;

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  }

  function fmtKw(watts) {
    return (watts / 1000).toFixed(2) + ' kW';
  }

  function fmtAud(aud) {
    return 'A$' + Math.round(aud).toLocaleString('en-AU');
  }

  /* ── Top-level render ───────────────────────────────────────────────────── */
  function render() {
    renderRigBuilder();
    // Later tasks attach hooks directly onto window.SunStackUI after module load.
    // Guard window.SunStackUI itself — it is undefined during the initial render()
    // call that happens inside the IIFE before the return value is assigned.
    const ui = window.SunStackUI;
    ui && ui._renderPanels    && ui._renderPanels();
    ui && ui._renderResults   && ui._renderResults();
    ui && ui._renderCharts    && ui._renderCharts();
    ui && ui._renderCitations && ui._renderCitations();
  }

  /* ── Rig-builder ─────────────────────────────────────────────────────────
   * Renders: catalog buttons, SVG hub, summary bar.
   * All DOM is written fresh into #rig-builder on each call.
   */
  function renderRigBuilder() {
    const root = document.getElementById('rig-builder');
    if (!root) return;

    // Clear and rebuild
    root.innerHTML = '';

    // ── Catalog section ────────────────────────────────────────────────────
    const catalogSection = document.createElement('div');
    catalogSection.className = 'catalog';

    const catalogTitle = document.createElement('h2');
    catalogTitle.className = 'catalog-title';
    catalogTitle.textContent = 'Add devices to your rig';
    catalogSection.appendChild(catalogTitle);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'catalog-legend';
    legend.innerHTML =
      '<span class="legend-swatch legend-uma"></span><span>UMA (unified memory)</span>' +
      '<span class="legend-swatch legend-nonuma"></span><span>Discrete GPU</span>';
    catalogSection.appendChild(legend);

    // Device buttons
    const grid = document.createElement('div');
    grid.className = 'catalog-grid';
    for (const [id, dev] of Object.entries(D.DEVICES)) {
      const btn = document.createElement('button');
      btn.dataset.addDevice = id;
      btn.className = dev.uma ? 'uma' : 'non-uma';
      btn.innerHTML =
        '<span class="dev-label">' + dev.label + '</span>' +
        '<span class="dev-mem">'   + dev.memoryGb + ' GB</span>' +
        '<span class="dev-price">US$' + dev.priceUsd.typical.toLocaleString('en-US') + '</span>';
      btn.addEventListener('click', () => {
        state.rig.push(id);
        state.preset = 'custom';
        render();
      });
      grid.appendChild(btn);
    }
    catalogSection.appendChild(grid);
    root.appendChild(catalogSection);

    // ── SVG hub ─────────────────────────────────────────────────────────────
    const svg = svgEl('svg', {
      id:      'rig-svg',
      viewBox: '0 0 ' + SVG_W + ' ' + SVG_H,
      width:   SVG_W,
      height:  SVG_H,
      role:    'img',
      'aria-label': 'PAIR hub rig diagram'
    });

    // Hub node
    const hubG = svgEl('g', { class: 'pair-hub' });
    const hubCircle = svgEl('circle', {
      cx: HUB_CX, cy: HUB_CY, r: HUB_R
    });
    const hubLabel = svgEl('text', {
      x: HUB_CX, y: HUB_CY + 5,
      'text-anchor': 'middle',
      'font-size':   '12',
      'font-weight': '600'
    });
    hubLabel.textContent = 'PAIR';
    hubG.appendChild(hubCircle);
    hubG.appendChild(hubLabel);
    svg.appendChild(hubG);

    // Device nodes
    const positions = E.hubLayout(state.rig.length, SVG_W, SVG_H);
    state.rig.forEach((devId, idx) => {
      const dev = D.DEVICES[devId];
      const pt  = positions[idx];

      // Line from hub to node
      const line = svgEl('line', {
        x1: HUB_CX, y1: HUB_CY,
        x2: pt.x,   y2: pt.y,
        class: 'rig-edge'
      });
      svg.appendChild(line);

      // Node group
      const nodeG = svgEl('g', {
        class:     'rig-node' + (dev.uma ? '' : ' non-uma'),
        transform: 'translate(' + (pt.x - NODE_W / 2) + ',' + (pt.y - NODE_H / 2) + ')',
        style:     'cursor:pointer'
      });

      const rect = svgEl('rect', {
        width:  NODE_W, height: NODE_H,
        rx: NODE_R,     ry: NODE_R
      });

      const labelEl = svgEl('text', {
        x: NODE_W / 2, y: NODE_H / 2 - 6,
        'text-anchor': 'middle',
        'font-size':   '9',
        'font-weight': '600'
      });
      // Shorten label to fit: take first word + memory
      const shortLabel = dev.memoryGb + ' GB';
      labelEl.textContent = shortLabel;

      const removeEl = svgEl('text', {
        x: NODE_W / 2, y: NODE_H / 2 + 9,
        'text-anchor': 'middle',
        'font-size':   '8',
        'fill':        '#999'
      });
      removeEl.textContent = '✕ click to remove';

      nodeG.appendChild(rect);
      nodeG.appendChild(labelEl);
      nodeG.appendChild(removeEl);

      // Click removes this index
      nodeG.addEventListener('click', () => {
        state.rig.splice(idx, 1);
        render();
      });

      svg.appendChild(nodeG);
    });

    root.appendChild(svg);

    // ── Summary bar ──────────────────────────────────────────────────────────
    const summary = document.createElement('div');
    summary.id = 'rig-summary';

    if (state.rig.length === 0) {
      summary.innerHTML = '<span class="summary-empty">Add a device above to start building your rig.</span>';
    } else {
      const pooledGb  = E.poolMemoryGb(state.rig);
      const totalLoadW = state.rig.reduce((acc, id) => acc + D.DEVICES[id].loadW.typical, 0);
      const rigCostUsd = state.rig.reduce((acc, id) => acc + D.DEVICES[id].priceUsd.typical, 0);
      const rigCostAud = rigCostUsd * state.fxAudPerUsd;
      const okFit      = E.fits(state.rig, state.modelId, state.quant);
      const aggTps     = okFit ? E.aggThroughputTps(state) : 0;

      const fitBadge = okFit
        ? '<span class="fit-badge fit-ok">fits ✓</span>'
        : '<span class="fit-badge fit-no">exceeds pool ✗</span>';

      summary.innerHTML =
        '<span class="summary-stat"><span class="stat-val">' + pooledGb + ' GB</span><span class="stat-lbl">pooled memory</span></span>' +
        '<span class="summary-stat"><span class="stat-val">' + fmtKw(totalLoadW) + '</span><span class="stat-lbl">total load</span></span>' +
        '<span class="summary-stat"><span class="stat-val">' + fmtAud(rigCostAud) + '</span><span class="stat-lbl">rig cost</span></span>' +
        '<span class="summary-stat"><span class="stat-val">' + Math.round(aggTps) + ' tok/s</span><span class="stat-lbl">aggregate</span></span>' +
        '<span class="summary-badge">' + fitBadge + '</span>';
    }

    root.appendChild(summary);
  }

  /* ── Initial render ─────────────────────────────────────────────────────── */
  render();

  /* ── Public API ─────────────────────────────────────────────────────────── */
  return {
    state,
    render,
    renderRigBuilder,
    // Hooks for later tasks (set externally):
    _renderPanels:    null,
    _renderResults:   null,
    _renderCharts:    null,
    _renderCitations: null
  };
})();
