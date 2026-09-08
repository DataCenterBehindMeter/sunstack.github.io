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
  const NODE_W = 128, NODE_H = 52, NODE_R = 8;

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

  /* Slider value display precision: integer-valued defaults show no decimals,
   * everything else shows 2 dp. One rule for both initial paint and live input
   * so the displayed precision never changes (no flicker on re-render). */
  function fmtVal(def, v) {
    return Number.isInteger(def.value) ? String(v) : Number(v).toFixed(2);
  }

  /* Short, node-sized device name (drops the "(…GB)" suffix + vendor prefixes). */
  function shortDeviceName(id) {
    const NAMES = {
      dgx_spark:              'DGX Spark',
      strix_halo:             'Strix Halo',
      mac_studio_m4max_36:    'Mac Studio M4 Max',
      mac_studio_m4max_128:   'Mac Studio M4 Max',
      mac_studio_m3ultra_96:  'Mac Studio M3 Ultra',
      mac_studio_m3ultra_256: 'Mac Studio M3 Ultra',
      mac_studio_m3ultra_512: 'Mac Studio M3 Ultra',
      mac_mini_m4_16:         'Mac mini M4',
      mac_mini_m4_24:         'Mac mini M4',
      mac_mini_m4_32:         'Mac mini M4',
      mac_mini_m4pro_48:      'Mac mini M4 Pro',
      mac_mini_m4pro_64:      'Mac mini M4 Pro',
      gpu_4090:               'RTX 4090',
      gpu_5090:               'RTX 5090'
    };
    if (NAMES[id]) return NAMES[id];
    // Fallback: label up to first parenthesis / comma.
    return (D.DEVICES[id].label || id).split(/[(,]/)[0].trim();
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

      // Line 1: short device name so distinct devices are distinguishable.
      const nameEl = svgEl('text', {
        x: NODE_W / 2, y: NODE_H / 2 - 10,
        'text-anchor': 'middle',
        'font-size':   '9',
        'font-weight': '700',
        class: 'rig-node-name'
      });
      nameEl.textContent = shortDeviceName(devId);

      // Line 2: memory.
      const memEl = svgEl('text', {
        x: NODE_W / 2, y: NODE_H / 2 + 3,
        'text-anchor': 'middle',
        'font-size':   '9',
        'font-weight': '600'
      });
      memEl.textContent = dev.memoryGb + ' GB';

      // Line 3: remove hint.
      const removeEl = svgEl('text', {
        x: NODE_W / 2, y: NODE_H / 2 + 16,
        'text-anchor': 'middle',
        'font-size':   '8',
        class: 'rig-node-hint'
      });
      removeEl.textContent = '✕ click to remove';

      nodeG.appendChild(rect);
      nodeG.appendChild(nameEl);
      nodeG.appendChild(memEl);
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

  /* ── Panels (input controls) ─────────────────────────────────────────────
   * Renders into #panels: preset toggle, model/quant selects, uncertainty
   * sliders, energy-mix sliders.
   * Called from render() via window.SunStackUI._renderPanels.
   */
  function renderPanels() {
    const root = document.getElementById('panels');
    if (!root) return;

    // ── Auto-fallback: if current model doesn't fit, pick the largest that does ──
    if (!E.fits(state.rig, state.modelId, state.quant)) {
      const sorted = Object.entries(D.MODELS)
        .sort((a, b) => b[1].minGbQ4 - a[1].minGbQ4);
      for (const [id] of sorted) {
        if (E.fits(state.rig, id, state.quant)) {
          state.modelId = id;
          break;
        }
      }
      // If none fit (empty rig or all exceed), leave unchanged
    }

    root.innerHTML = '';

    // ── Section wrapper ────────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.className = 'panels-wrap';

    // ── Preset toggle ──────────────────────────────────────────────────────
    const presetSection = document.createElement('div');
    presetSection.className = 'panel-section preset-section';

    const presetTitle = document.createElement('h2');
    presetTitle.className = 'panel-section-title';
    presetTitle.textContent = 'Scenario';
    presetSection.appendChild(presetTitle);

    const presetRow = document.createElement('div');
    presetRow.className = 'preset-row';

    ['pessimistic', 'neutral', 'optimistic'].forEach(mode => {
      const btn = document.createElement('button');
      btn.dataset.preset = mode;
      btn.className = 'preset-btn' + (state.preset === mode ? ' active' : '');
      btn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
      btn.addEventListener('click', () => {
        Object.assign(state, E.applyPreset(state, mode));
        render();
      });
      presetRow.appendChild(btn);
    });

    presetSection.appendChild(presetRow);

    const presetState = document.createElement('span');
    presetState.id = 'preset-state';
    presetState.className = 'preset-state-label';
    const displayPreset = (['pessimistic', 'neutral', 'optimistic'].includes(state.preset))
      ? state.preset.charAt(0).toUpperCase() + state.preset.slice(1)
      : 'Custom';
    presetState.textContent = displayPreset;
    presetSection.appendChild(presetState);

    wrap.appendChild(presetSection);

    // ── Model + Quant selects ──────────────────────────────────────────────
    const modelSection = document.createElement('div');
    modelSection.className = 'panel-section model-section';

    const modelTitle = document.createElement('h2');
    modelTitle.className = 'panel-section-title';
    modelTitle.textContent = 'Model';
    modelSection.appendChild(modelTitle);

    const modelRow = document.createElement('div');
    modelRow.className = 'model-row';

    // Model select
    const modelLabel = document.createElement('label');
    modelLabel.setAttribute('for', 'model-select');
    modelLabel.className = 'control-label';
    modelLabel.textContent = 'Model';

    const modelSelect = document.createElement('select');
    modelSelect.id = 'model-select';
    modelSelect.className = 'calc-select';

    for (const [id, model] of Object.entries(D.MODELS)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = model.label;
      if (id === state.modelId) opt.selected = true;
      if (!E.fits(state.rig, id, state.quant)) {
        opt.disabled = true;
        opt.setAttribute('disabled', '');
      }
      modelSelect.appendChild(opt);
    }

    modelSelect.addEventListener('change', () => {
      state.modelId = modelSelect.value;
      state.preset = 'custom';
      render();
    });

    const modelGroup = document.createElement('div');
    modelGroup.className = 'control-group';
    modelGroup.appendChild(modelLabel);
    modelGroup.appendChild(modelSelect);
    modelRow.appendChild(modelGroup);

    // Quant select
    const quantLabel = document.createElement('label');
    quantLabel.setAttribute('for', 'quant-select');
    quantLabel.className = 'control-label';
    quantLabel.textContent = 'Quantization';

    const quantSelect = document.createElement('select');
    quantSelect.id = 'quant-select';
    quantSelect.className = 'calc-select';

    [
      { value: 'q4',  label: 'Q4 (4-bit)' },
      { value: 'q8',  label: 'Q8 (8-bit)' },
      { value: 'fp16', label: 'FP16 (half)' }
    ].forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === state.quant) opt.selected = true;
      quantSelect.appendChild(opt);
    });

    quantSelect.addEventListener('change', () => {
      state.quant = quantSelect.value;
      state.preset = 'custom';
      render();
    });

    const quantGroup = document.createElement('div');
    quantGroup.className = 'control-group';
    quantGroup.appendChild(quantLabel);
    quantGroup.appendChild(quantSelect);
    modelRow.appendChild(quantGroup);

    modelSection.appendChild(modelRow);
    wrap.appendChild(modelSection);

    // ── Uncertainty sliders ────────────────────────────────────────────────
    const sliderSection = document.createElement('div');
    sliderSection.className = 'panel-section slider-section';

    const sliderTitle = document.createElement('h2');
    sliderTitle.className = 'panel-section-title';
    sliderTitle.textContent = 'Assumptions';
    sliderSection.appendChild(sliderTitle);

    const sliderGrid = document.createElement('div');
    sliderGrid.className = 'slider-grid';

    const LABELS = {
      utilization:           'Utilization',
      activeHours:           'Active hours/day',
      poolEfficiency:        'Pool efficiency',
      feedInTariff:          'Solar feed-in (c/kWh)',
      retailRate:            'Grid retail (c/kWh)',
      batteryCost:           'Battery cost (c/kWh)',
      hardwareLifetimeYears: 'Hardware lifetime (yr)',
      overheadPerYearAud:    'Overhead (A$/yr)',
      fxAudPerUsd:           'AUD/USD rate'
    };

    E.UNCERTAINTY_INPUT_IDS.forEach(inputId => {
      const def = D.INPUT_DEFAULTS[inputId];
      const currentVal = state[inputId];

      const group = document.createElement('div');
      group.className = 'slider-group';

      const label = document.createElement('label');
      label.setAttribute('for', 'in-' + inputId);
      label.className = 'slider-label';

      const labelText = document.createElement('span');
      labelText.textContent = LABELS[inputId] || inputId;

      const valDisplay = document.createElement('span');
      valDisplay.className = 'slider-val';
      valDisplay.id = 'val-' + inputId;
      valDisplay.textContent = fmtVal(def, currentVal);

      label.appendChild(labelText);
      label.appendChild(valDisplay);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = 'in-' + inputId;
      slider.min = def.low;
      slider.max = def.high;
      // Use enough step resolution for fractional inputs
      slider.step = def.unit === 'fraction' ? 0.01
                  : def.unit === 'AUD/USD'  ? 0.01
                  : def.unit === 'AUD c/kWh' ? 0.1
                  : 1;
      slider.value = currentVal;
      slider.setAttribute('aria-label', LABELS[inputId] || inputId);

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        state[inputId] = v;
        state.preset = 'custom';
        // Update display without full re-render for smoothness
        const disp = document.getElementById('val-' + inputId);
        if (disp) disp.textContent = fmtVal(def, v);
        render();
      });

      group.appendChild(label);
      group.appendChild(slider);
      sliderGrid.appendChild(group);
    });

    sliderSection.appendChild(sliderGrid);
    wrap.appendChild(sliderSection);

    // ── Energy-mix sliders ─────────────────────────────────────────────────
    const energySection = document.createElement('div');
    energySection.className = 'panel-section energy-section';

    const energyTitle = document.createElement('h2');
    energyTitle.className = 'panel-section-title';
    energyTitle.textContent = 'Energy mix';
    energySection.appendChild(energyTitle);

    const energyGrid = document.createElement('div');
    energyGrid.className = 'slider-grid';

    const ENERGY_KEYS = ['free', 'solar', 'grid', 'battery'];
    const ENERGY_LABELS = { free: 'Free / off-peak', solar: 'Solar', grid: 'Grid', battery: 'Battery' };

    // Normalise totals for display (raw mix values stored, display as %)
    const rawTot = ENERGY_KEYS.reduce((s, k) => s + (state.energyMix[k] || 0), 0) || 1;

    ENERGY_KEYS.forEach(key => {
      const rawVal = state.energyMix[key] || 0;
      const pct = Math.round((rawVal / rawTot) * 100);

      const group = document.createElement('div');
      group.className = 'slider-group';

      const label = document.createElement('label');
      label.setAttribute('for', 'in-energy-' + key);
      label.className = 'slider-label';

      const labelText = document.createElement('span');
      labelText.textContent = ENERGY_LABELS[key];

      const valDisplay = document.createElement('span');
      valDisplay.className = 'slider-val';
      valDisplay.id = 'val-energy-' + key;
      valDisplay.textContent = pct + '%';

      label.appendChild(labelText);
      label.appendChild(valDisplay);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = 'in-energy-' + key;
      slider.min = 0;
      slider.max = 100;
      slider.step = 1;
      slider.value = pct;
      slider.setAttribute('aria-label', ENERGY_LABELS[key] + ' energy share');

      slider.addEventListener('input', () => {
        // Read ALL four sliders' current 0–100 values, then normalise to
        // fractions. Reading every slider (not just the changed key) keeps
        // normalisation independent of the keys' prior stored scale.
        const raw = {};
        ENERGY_KEYS.forEach(k => {
          const el = document.getElementById('in-energy-' + k);
          raw[k] = el ? parseInt(el.value, 10) : 0;
        });
        const tot = ENERGY_KEYS.reduce((s, k) => s + (raw[k] || 0), 0) || 1;
        ENERGY_KEYS.forEach(k => { state.energyMix[k] = raw[k] / tot; });
        state.preset = 'custom';
        render();
      });

      group.appendChild(label);
      group.appendChild(slider);
      energyGrid.appendChild(group);
    });

    energySection.appendChild(energyGrid);
    wrap.appendChild(energySection);

    root.appendChild(wrap);
  }

  /* ── Initial render ─────────────────────────────────────────────────────── */
  render();

  /* ── Public API ─────────────────────────────────────────────────────────── */
  return {
    state,
    render,
    renderRigBuilder,
    // Hook wired at module load; later tasks override _renderResults, etc.
    _renderPanels:    renderPanels,
    _renderResults:   null,
    _renderCharts:    null,
    _renderCitations: null
  };
})();
