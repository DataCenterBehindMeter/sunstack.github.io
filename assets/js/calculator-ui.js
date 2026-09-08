/* SunStack calculator — UI controller (Task 6+).
 * Depends on: SunStackData, SunStackEngine (loaded before this file).
 * DOM mount points: #rig-builder, #panels, #results, #sources, #references.
 */
window.SunStackUI = (function () {
  'use strict';

  const D  = window.SunStackData;
  const E  = window.SunStackEngine;
  const ID = D.INPUT_DEFAULTS;

  /* ── State ──────────────────────────────────────────────────────────────── */
  const state = {
    rig: ['dgx_spark'],
    modelId:  'minimax_m3',
    quant:    'q4',

    // uncertainty inputs — seeded from INPUT_DEFAULTS typical values
    poolEfficiency:          ID.poolEfficiency.value,
    utilization:             ID.utilization.value,
    activeHours:             24,
    feedInTariff:            ID.feedInTariff.value,
    retailRate:              ID.retailRate.value,

    // energy mix (fractions sum to 1; default: 60% free/off-peak, 30% solar, 10% grid)
    energyMix: { free: 0.6, solar: 0.3, grid: 0.1 },

    // concurrency — batching lever (NOT in INPUT_DEFAULTS; presets do not change it)
    concurrency: 16,

    // pricing + shares
    undercut:             0.20,   // 20% below market
    homeownerShare:       0.55,   // homeowner gets 55% of gross

    // hardware
    financed:             true,
    platformCostUsdPerMTok: 0.002,

    // scenario
    preset: 'neutral'
  };

  /* ── SVG dimensions ─────────────────────────────────────────────────────── */
  const SVG_W = 640, SVG_H = 380;
  const HUB_CX = SVG_W / 2, HUB_CY = SVG_H / 2;
  const HUB_R  = 28;   // hub circle radius
  const NODE_W = 128, NODE_H = 52, NODE_R = 8;

  /* ── Uncertainty-input display labels ────────────────────────────────────────
   * One source of truth, shared by renderPanels, the sources table, and the
   * downloadable assumptions export.
   */
  const INPUT_LABELS = {
    utilization:           'Utilization',
    activeHours:           'Active hours/day',
    poolEfficiency:        'Pool efficiency',
    feedInTariff:          'Solar feed-in (c/kWh)',
    retailRate:            'Grid retail (c/kWh)'
  };

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

  /* ── Compute and write the model sell-price line ───────────────────────────
   * Called from renderPanels (full rebuild) and renderOutputs (live update).
   * Shows SunStack sell price and the market/cloud price for comparison.
   */
  function _updateSellPriceLine(el, st) {
    const model = D.MODELS[st.modelId];
    if (!model) { el.textContent = ''; return; }
    const fx = D.FX_AUD_PER_USD;
    const marketAud   = model.priceOutUsdPerM.typical * fx;
    const sunstackAud = marketAud * (1 - st.undercut);
    el.textContent =
      'SunStack sells this model at A$' + sunstackAud.toFixed(2) + ' / 1M tokens' +
      '  (vs A$' + marketAud.toFixed(2) + ' market)';
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

  /* ── renderOutputs — recompute + repaint results/charts only ───────────────
   * Does NOT rebuild sliders or selects. Safe to call mid-drag.
   * Also updates every slider's value-label text in place.
   */
  function renderOutputs() {
    const ui = window.SunStackUI;

    // Update in-place value labels for uncertainty sliders
    E.UNCERTAINTY_INPUT_IDS.forEach(inputId => {
      const def = D.INPUT_DEFAULTS[inputId];
      const disp = document.getElementById('val-' + inputId);
      if (disp && def) disp.textContent = fmtVal(def, state[inputId]);
    });

    // Update in-place value labels for energy-mix sliders
    const ENERGY_KEYS = ['free', 'solar', 'grid'];
    const rawTot = ENERGY_KEYS.reduce((s, k) => s + (state.energyMix[k] || 0), 0) || 1;
    ENERGY_KEYS.forEach(key => {
      const disp = document.getElementById('val-energy-' + key);
      if (disp) {
        const pct = Math.round(((state.energyMix[key] || 0) / rawTot) * 100);
        disp.textContent = pct + '%';
      }
    });

    // Update preset-state indicator
    const presetEl = document.getElementById('preset-state');
    if (presetEl) {
      const displayPreset = (['pessimistic', 'neutral', 'optimistic'].includes(state.preset))
        ? state.preset.charAt(0).toUpperCase() + state.preset.slice(1)
        : 'Custom';
      presetEl.textContent = displayPreset;
    }

    // Update model sell-price line (live — undercut or model may have changed)
    const sellPriceEl = document.getElementById('model-sell-price');
    if (sellPriceEl) _updateSellPriceLine(sellPriceEl, state);

    // Repaint outputs (results cards, citations)
    ui && ui._renderResults   && ui._renderResults();
    ui && ui._renderCitations ? ui._renderCitations() : renderCitations();
  }

  /* ── renderStructure — full DOM rebuild (panels + rig-builder) ───────────
   * Call on structural changes: add/remove device, model/quant change,
   * financed toggle, preset-button clicks. Follows with renderOutputs().
   */
  function renderStructure() {
    renderRigBuilder();
    const ui = window.SunStackUI;
    ui && ui._renderPanels    ? ui._renderPanels()    : renderPanels();
    renderOutputs();
  }

  /* ── Top-level render ───────────────────────────────────────────────────── */
  function render() {
    renderStructure();
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
      const priceAud = Math.round(dev.priceUsd.typical * D.FX_AUD_PER_USD);
      btn.innerHTML =
        '<span class="dev-label">' + dev.label + '</span>' +
        '<span class="dev-mem">'   + dev.memoryGb + ' GB</span>' +
        '<span class="dev-price">A$' + priceAud.toLocaleString('en-AU') + '</span>';
      btn.addEventListener('click', () => {
        state.rig.push(id);
        state.preset = 'custom';
        renderStructure();
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

    // Hub node — wrapped in an SVG <a> so it links to the NVIDIA PAIR product page
    const hubAnchor = svgEl('a', {
      href:             'https://www.nvidia.com/en-au/ai-on-rtx/personal-ai-router/',
      target:           '_blank',
      rel:              'noopener',
      'aria-label':     'NVIDIA PAIR — Personal AI Router',
      style:            'cursor:pointer'
    });
    const hubG = svgEl('g', { class: 'pair-hub' });
    const hubCircle = svgEl('circle', {
      cx: HUB_CX, cy: HUB_CY, r: HUB_R,
      style: 'cursor:pointer'
    });
    const hubLabel = svgEl('text', {
      x: HUB_CX, y: HUB_CY + 5,
      'text-anchor': 'middle',
      'font-size':   '12',
      'font-weight': '600',
      style:         'pointer-events:none'
    });
    hubLabel.textContent = 'PAIR';
    hubG.appendChild(hubCircle);
    hubG.appendChild(hubLabel);
    hubAnchor.appendChild(hubG);
    svg.appendChild(hubAnchor);

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

      // Node group — keyboard-reachable: focusable + button semantics so it can
      // be removed via Enter/Space, not just a mouse click.
      const nodeG = svgEl('g', {
        class:        'rig-node' + (dev.uma ? '' : ' non-uma'),
        transform:    'translate(' + (pt.x - NODE_W / 2) + ',' + (pt.y - NODE_H / 2) + ')',
        style:        'cursor:pointer',
        tabindex:     '0',
        role:         'button',
        'aria-label': 'Remove ' + shortDeviceName(devId)
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
      const removeThisNode = () => {
        state.rig.splice(idx, 1);
        renderStructure();
      };
      nodeG.addEventListener('click', removeThisNode);

      // Keyboard: Enter or Space removes it, mirroring the click action.
      nodeG.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          removeThisNode();
        }
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
      // Use computeScenario as single source of truth for rigCostAud (no separate sum)
      const out        = E.computeScenario(state);
      const pooledGb   = E.poolMemoryGb(state.rig);
      const totalLoadW = state.rig.reduce((acc, id) => acc + D.DEVICES[id].loadW.typical, 0);
      const rigCostAud = out.rigCostAud;
      const okFit      = E.fits(state.rig, state.modelId, state.quant);
      let tpsHtml = '';
      if (okFit) {
        const tput = E.aggThroughput(state);
        const ss   = Math.round(tput.singleStreamMin);
        const srv  = Math.round(tput.aggServedTps);
        const conc = state.concurrency != null ? state.concurrency : 12;
        tpsHtml =
          '<span class="summary-stat"><span class="stat-val">' + ss + ' t/s</span><span class="stat-lbl">single-stream</span></span>' +
          '<span class="summary-stat"><span class="stat-val">' + srv + ' t/s</span><span class="stat-lbl">served (' + conc + ' concurrent)</span></span>';
      }

      const fitBadge = okFit
        ? '<span class="fit-badge fit-ok">fits ✓</span>'
        : '<span class="fit-badge fit-no">exceeds pool ✗</span>';

      summary.innerHTML =
        '<span class="summary-stat"><span class="stat-val">' + pooledGb + ' GB</span><span class="stat-lbl">pooled memory</span></span>' +
        '<span class="summary-stat"><span class="stat-val">' + fmtKw(totalLoadW) + '</span><span class="stat-lbl">total load</span></span>' +
        '<span class="summary-stat"><span class="stat-val">' + fmtAud(rigCostAud) + '</span><span class="stat-lbl">rig cost</span></span>' +
        tpsHtml +
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
        renderStructure();
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
      const mmPrefix = model.multimodal ? '◈ ' : '';
      const isFit = E.fits(state.rig, id, state.quant);
      if (isFit) {
        opt.textContent = mmPrefix + model.label;
      } else {
        const poolGb = E.poolMemoryGb(state.rig);
        const needGb = E.modelMinGb(id, state.quant);
        const reason = state.rig.length === 0
          ? '— add a device first'
          : '— needs ' + needGb + ' GB (pool ' + poolGb + ' GB)';
        opt.textContent = mmPrefix + model.label + ' ' + reason;
        opt.disabled = true;
        opt.setAttribute('disabled', '');
      }
      if (id === state.modelId) opt.selected = true;
      modelSelect.appendChild(opt);
    }

    modelSelect.addEventListener('change', () => {
      state.modelId = modelSelect.value;
      state.preset = 'custom';
      renderStructure();
    });

    const modelGroup = document.createElement('div');
    modelGroup.className = 'control-group';
    modelGroup.appendChild(modelLabel);
    modelGroup.appendChild(modelSelect);
    modelRow.appendChild(modelGroup);

    // Legend note for multimodal marker (below the select)
    const mmLegend = document.createElement('div');
    mmLegend.className = 'model-mm-legend';
    mmLegend.textContent = '◈ = multimodal (text + image/video)';
    modelRow.appendChild(mmLegend);

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
      renderStructure();
    });

    const quantGroup = document.createElement('div');
    quantGroup.className = 'control-group';
    quantGroup.appendChild(quantLabel);
    quantGroup.appendChild(quantSelect);
    modelRow.appendChild(quantGroup);

    // ── Model sell-price line ──────────────────────────────────────────────
    const sellPriceLine = document.createElement('div');
    sellPriceLine.id = 'model-sell-price';
    sellPriceLine.className = 'model-sell-price';
    _updateSellPriceLine(sellPriceLine, state);
    modelRow.appendChild(sellPriceLine);

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

    E.UNCERTAINTY_INPUT_IDS.forEach(inputId => {
      const def = D.INPUT_DEFAULTS[inputId];
      const currentVal = state[inputId];

      const group = document.createElement('div');
      group.className = 'slider-group';

      const label = document.createElement('label');
      label.setAttribute('for', 'in-' + inputId);
      label.className = 'slider-label';

      const labelText = document.createElement('span');
      labelText.textContent = INPUT_LABELS[inputId] || inputId;

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
      slider.setAttribute('aria-label', INPUT_LABELS[inputId] || inputId);

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        state[inputId] = v;
        state.preset = 'custom';
        renderOutputs();
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

    const ENERGY_KEYS = ['free', 'solar', 'grid'];
    const ENERGY_LABELS = { free: 'Free / off-peak', solar: 'Solar', grid: 'Grid' };

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
        // Read ALL three sliders' current 0–100 values, then normalise to
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
        renderOutputs();
      });

      group.appendChild(label);
      group.appendChild(slider);
      energyGrid.appendChild(group);
    });

    energySection.appendChild(energyGrid);
    wrap.appendChild(energySection);

    // ── Business split controls ────────────────────────────────────────────
    const bizSection = document.createElement('div');
    bizSection.className = 'panel-section biz-section';

    const bizTitle = document.createElement('h2');
    bizTitle.className = 'panel-section-title';
    bizTitle.textContent = 'Business split';
    bizSection.appendChild(bizTitle);

    const bizGrid = document.createElement('div');
    bizGrid.className = 'slider-grid';

    // Helper: make a range slider control group
    function makeBizSlider(id, label, min, max, step, currentVal, fmtFn, stateKey) {
      const group = document.createElement('div');
      group.className = 'slider-group';

      const lbl = document.createElement('label');
      lbl.setAttribute('for', id);
      lbl.className = 'slider-label';

      const lblText = document.createElement('span');
      lblText.textContent = label;

      const valDisp = document.createElement('span');
      valDisp.className = 'slider-val';
      valDisp.id = 'val-' + stateKey;
      valDisp.textContent = fmtFn(currentVal);

      lbl.appendChild(lblText);
      lbl.appendChild(valDisp);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = id;
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = currentVal;
      slider.setAttribute('aria-label', label);

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        state[stateKey] = v;
        state.preset = 'custom';
        const d = document.getElementById('val-' + stateKey);
        if (d) d.textContent = fmtFn(v);
        renderOutputs();
      });

      group.appendChild(lbl);
      group.appendChild(slider);
      return group;
    }

    // #in-undercut: 0–0.9, displayed as %
    bizGrid.appendChild(makeBizSlider(
      'in-undercut', 'SunStack undercut vs cloud (%)',
      0, 0.9, 0.01, state.undercut,
      v => Math.round(v * 100) + '%', 'undercut'
    ));

    // #in-homeownerShare: 0–1, displayed as %
    bizGrid.appendChild(makeBizSlider(
      'in-homeownerShare', 'Homeowner revenue share (%)',
      0, 1, 0.01, state.homeownerShare,
      v => Math.round(v * 100) + '%', 'homeownerShare'
    ));

    // #in-platformCostUsdPerMTok: number+range 0–1, displayed as USD
    bizGrid.appendChild(makeBizSlider(
      'in-platformCostUsdPerMTok', 'Platform cost (USD/1M tok)',
      0, 1, 0.01, state.platformCostUsdPerMTok,
      v => '$' + Number(v).toFixed(2), 'platformCostUsdPerMTok'
    ));

    // #in-concurrency: 1–64 integer; NOT in INPUT_DEFAULTS, not swung by presets
    bizGrid.appendChild(makeBizSlider(
      'in-concurrency', 'Concurrent requests (batch)',
      1, 64, 1, state.concurrency,
      v => String(Math.round(v)), 'concurrency'
    ));

    // #in-financed: checkbox
    const finGroup = document.createElement('div');
    finGroup.className = 'slider-group biz-checkbox-group';

    const finLabel = document.createElement('label');
    finLabel.setAttribute('for', 'in-financed');
    finLabel.className = 'slider-label biz-checkbox-label';

    const finLabelText = document.createElement('span');
    finLabelText.textContent = 'Hardware financed by SunStack';

    const finCheckbox = document.createElement('input');
    finCheckbox.type = 'checkbox';
    finCheckbox.id = 'in-financed';
    finCheckbox.checked = !!state.financed;
    finCheckbox.setAttribute('aria-label', 'Hardware financed by SunStack');

    finCheckbox.addEventListener('change', () => {
      state.financed = finCheckbox.checked;
      state.preset = 'custom';
      renderOutputs();
    });

    finLabel.appendChild(finLabelText);
    finLabel.appendChild(finCheckbox);
    finGroup.appendChild(finLabel);
    bizGrid.appendChild(finGroup);

    bizSection.appendChild(bizGrid);
    wrap.appendChild(bizSection);

    root.appendChild(wrap);
  }

  /* ── Citations ──────────────────────────────────────────────────────────────
   * Runs after _renderPanels rebuilds #panels.
   * 1. Injects a .cite-chip beside each uncertainty slider that has a source_id.
   * 2. Popover: click/focus opens it; Esc + outside-click closes it.
   * 3. #references: deduped numbered list of sources actually used.
   * 4. #sources: table of all cited defaults + #download-assumptions button.
   */
  function renderCitations() {
    // Close any open popover before re-injecting chips — otherwise a popover
    // anchored to a chip that's about to be removed is stranded in the DOM.
    _closePopover();
    _injectCiteChips();
    _renderReferences();
    _renderSourcesTable();
  }

  /* ── Popover state ──────────────────────────────────────────────────────── */
  let _activePopover = null;

  function _closePopover() {
    if (_activePopover) {
      _activePopover.remove();
      _activePopover = null;
    }
  }

  /* Close on Esc (one listener registered once). */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closePopover();
  });

  /* Close on outside-click (delegated). */
  document.addEventListener('click', function (e) {
    if (_activePopover && !_activePopover.contains(e.target) &&
        !e.target.classList.contains('cite-chip')) {
      _closePopover();
    }
  });

  /* ── makeCiteChip ───────────────────────────────────────────────────────── */
  function _makeCiteChip(sourceId, def) {
    const src = D.SOURCES[sourceId];
    if (!src) return null;

    const chip = document.createElement('span');
    chip.className = 'cite-chip';
    chip.dataset.sourceId = sourceId;
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-label', 'View source: ' + src.name);
    chip.textContent = src.publisher || src.name;

    function openPopover(anchorEl) {
      _closePopover();

      const pop = document.createElement('div');
      pop.className = 'cite-popover';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', 'Source details');

      // Confidence dot
      const conf = def && def.confidence ? def.confidence : 'medium';
      const dotEl = document.createElement('span');
      dotEl.className = 'dot ' + conf;
      dotEl.setAttribute('aria-label', 'Confidence: ' + conf);

      // Figure line (typical + range)
      let figLine = '';
      if (def && def.value !== undefined) {
        figLine = String(def.value);
        if (def.unit) figLine += ' ' + def.unit;
        if (def.low !== undefined && def.high !== undefined) {
          figLine += '  (range ' + def.low + '–' + def.high + ')';
        }
      }

      const meta = document.createElement('div');
      meta.className = 'cite-popover-meta';

      if (figLine) {
        const fig = document.createElement('div');
        fig.className = 'cite-popover-figure';
        fig.textContent = figLine;
        meta.appendChild(fig);
      }

      const nameRow = document.createElement('div');
      nameRow.className = 'cite-popover-name';
      nameRow.textContent = src.name + ' · ' + (src.publisher || '') + ' · ' + (src.date || '');
      meta.appendChild(nameRow);

      const link = document.createElement('a');
      link.href = src.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'View source ↗';
      link.className = 'cite-popover-link';

      pop.appendChild(dotEl);
      pop.appendChild(meta);
      pop.appendChild(link);

      // Position near anchor
      anchorEl.parentElement.style.position = 'relative';
      anchorEl.parentElement.appendChild(pop);
      _activePopover = pop;
    }

    // Whether THIS chip's popover is the one currently open.
    function mine() {
      return _activePopover && _activePopover.parentElement === chip.parentElement;
    }

    chip.addEventListener('click', function (e) {
      e.stopPropagation();
      // A pointer click on an unfocused chip fires focus (which opens the
      // popover) before this handler runs, so `mine()` is already true here.
      // Treat click as "ensure open" rather than a blind toggle — otherwise
      // the focus-open + click-toggle race would close it immediately. Esc and
      // outside-click remain the ways to dismiss.
      if (!mine()) openPopover(chip);
    });

    // Open on focus too — surfaces the source during keyboard/tab navigation.
    // openPopover() closes any prior popover (single-open), so tabbing between
    // chips moves the popover along with focus.
    chip.addEventListener('focus', function () {
      if (!mine()) openPopover(chip);
    });

    chip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!mine()) openPopover(chip);
      }
    });

    return chip;
  }

  /* ── Inject chips beside uncertainty sliders ────────────────────────────── */
  function _injectCiteChips() {
    // Remove any previously injected chips (idempotent)
    document.querySelectorAll('.cite-chip').forEach(c => c.remove());

    E.UNCERTAINTY_INPUT_IDS.forEach(function (inputId) {
      const def = D.INPUT_DEFAULTS[inputId];
      if (!def || !def.source_id) return;

      const slider = document.getElementById('in-' + inputId);
      if (!slider) return;

      const chip = _makeCiteChip(def.source_id, def);
      if (!chip) return;

      // Insert after the slider within its .slider-group
      slider.insertAdjacentElement('afterend', chip);
    });
  }

  /* ── Render #references — deduped, numbered ─────────────────────────────── */
  function _renderReferences() {
    const root = document.getElementById('references');
    if (!root) return;
    root.innerHTML = '';

    // Collect source IDs actually used across INPUT_DEFAULTS (always shown)
    const usedIds = [];
    const seen = new Set();

    function addId(id) {
      if (id && !seen.has(id) && D.SOURCES[id]) {
        seen.add(id);
        usedIds.push(id);
      }
    }

    // Uncertainty inputs
    E.UNCERTAINTY_INPUT_IDS.forEach(function (inputId) {
      const def = D.INPUT_DEFAULTS[inputId];
      if (def) addId(def.source_id);
    });

    // Device price + load sources for rig devices
    state.rig.forEach(function (devId) {
      const dev = D.DEVICES[devId];
      if (!dev) return;
      if (dev.priceUsd) addId(dev.priceUsd.source_id);
      if (dev.loadW)    addId(dev.loadW.source_id);
    });

    // Model price sources
    addId((D.MODELS[state.modelId] && D.MODELS[state.modelId].priceOutUsdPerM)
      ? D.MODELS[state.modelId].priceOutUsdPerM.source_id
      : null);

    // Always include all INPUT_DEFAULTS sources even for empty rig
    Object.values(D.INPUT_DEFAULTS).forEach(function (def) { addId(def.source_id); });

    if (usedIds.length === 0) return;

    const title = document.createElement('h2');
    title.className = 'references-title';
    title.textContent = 'References';
    root.appendChild(title);

    const ol = document.createElement('ol');
    ol.className = 'references-list';

    usedIds.forEach(function (id) {
      const src = D.SOURCES[id];
      const li = document.createElement('li');
      li.className = 'ref-item';

      const a = document.createElement('a');
      a.href = src.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = src.name + ' — ' + (src.publisher || '') + ', ' + (src.date || '');

      li.appendChild(a);
      ol.appendChild(li);
    });

    root.appendChild(ol);
  }

  /* ── Render #sources table + download button ────────────────────────────── */
  function _renderSourcesTable() {
    const root = document.getElementById('sources');
    if (!root) return;
    root.innerHTML = '';

    const title = document.createElement('h2');
    title.className = 'sources-title';
    title.textContent = 'Assumptions & Sources';
    root.appendChild(title);

    // Build rows: label, value, unit, confidence, source
    const table = document.createElement('table');
    table.className = 'sources-table';

    const thead = document.createElement('thead');
    thead.innerHTML =
      '<tr><th>Assumption</th><th>Value</th><th>Unit</th><th>Low</th><th>High</th><th>Confidence</th><th>Source</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    E.UNCERTAINTY_INPUT_IDS.forEach(function (inputId) {
      const def = D.INPUT_DEFAULTS[inputId];
      if (!def) return;
      const src = def.source_id ? D.SOURCES[def.source_id] : null;

      const tr = document.createElement('tr');

      const tdLabel = document.createElement('td');
      tdLabel.textContent = INPUT_LABELS[inputId] || inputId;

      const tdVal = document.createElement('td');
      tdVal.textContent = String(def.value);

      const tdUnit = document.createElement('td');
      tdUnit.textContent = def.unit || '';

      const tdLow = document.createElement('td');
      tdLow.textContent = def.low !== undefined ? String(def.low) : '';

      const tdHigh = document.createElement('td');
      tdHigh.textContent = def.high !== undefined ? String(def.high) : '';

      const tdConf = document.createElement('td');
      if (def.confidence) {
        const dot = document.createElement('span');
        dot.className = 'dot ' + def.confidence;
        dot.setAttribute('aria-label', 'Confidence: ' + def.confidence);
        tdConf.appendChild(dot);
        const confText = document.createTextNode(' ' + def.confidence);
        tdConf.appendChild(confText);
      }

      const tdSrc = document.createElement('td');
      if (src) {
        const a = document.createElement('a');
        a.href = src.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = src.name;
        tdSrc.appendChild(a);
      }

      tr.appendChild(tdLabel);
      tr.appendChild(tdVal);
      tr.appendChild(tdUnit);
      tr.appendChild(tdLow);
      tr.appendChild(tdHigh);
      tr.appendChild(tdConf);
      tr.appendChild(tdSrc);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    root.appendChild(table);

    // Download button
    const dlBtn = document.createElement('button');
    dlBtn.id = 'download-assumptions';
    dlBtn.className = 'dl-btn';
    dlBtn.textContent = 'Download assumptions (CSV + JSON)';

    dlBtn.addEventListener('click', function () {
      _downloadAssumptions();
    });

    root.appendChild(dlBtn);
  }

  /* ── Build + trigger download of assumptions as CSV and JSON ─────────────── */
  function _downloadAssumptions() {
    const rows = [];

    // Uncertainty input defaults
    E.UNCERTAINTY_INPUT_IDS.forEach(function (inputId) {
      const def = D.INPUT_DEFAULTS[inputId];
      if (!def) return;
      const src = def.source_id ? D.SOURCES[def.source_id] : null;
      rows.push({
        category:   'input_default',
        id:         inputId,
        label:      INPUT_LABELS[inputId] || inputId,
        value:      def.value,
        low:        def.low,
        high:       def.high,
        unit:       def.unit || '',
        confidence: def.confidence || '',
        source_id:  def.source_id || '',
        source_name: src ? src.name : '',
        source_url:  src ? src.url  : '',
        source_date: src ? src.date : ''
      });
    });

    // Device context rows (frontier ref prices)
    Object.entries(D.DEVICES).forEach(function ([devId, dev]) {
      if (dev.priceUsd) {
        const src = dev.priceUsd.source_id ? D.SOURCES[dev.priceUsd.source_id] : null;
        rows.push({
          category:   'ref_device_price',
          id:         devId,
          label:      dev.label + ' — price (USD)',
          value:      dev.priceUsd.typical,
          low:        dev.priceUsd.low,
          high:       dev.priceUsd.high,
          unit:       'USD',
          confidence: dev.priceUsd.confidence || '',
          source_id:  dev.priceUsd.source_id || '',
          source_name: src ? src.name : '',
          source_url:  src ? src.url  : '',
          source_date: src ? src.date : ''
        });
      }
      if (dev.loadW) {
        const src2 = dev.loadW.source_id ? D.SOURCES[dev.loadW.source_id] : null;
        rows.push({
          category:   'ref_device_load',
          id:         devId,
          label:      dev.label + ' — load (W)',
          value:      dev.loadW.typical,
          low:        dev.loadW.low,
          high:       dev.loadW.high,
          unit:       'W',
          confidence: dev.loadW.confidence || '',
          source_id:  dev.loadW.source_id || '',
          source_name: src2 ? src2.name : '',
          source_url:  src2 ? src2.url  : '',
          source_date: src2 ? src2.date : ''
        });
      }
    });

    // Model price context rows
    Object.entries(D.MODELS).forEach(function ([modelId, model]) {
      if (model.priceOutUsdPerM) {
        const p = model.priceOutUsdPerM;
        const src = p.source_id ? D.SOURCES[p.source_id] : null;
        rows.push({
          category:   'ref_model_price',
          id:         modelId,
          label:      model.label + ' — output token price (USD/1M)',
          value:      p.typical,
          low:        p.low,
          high:       p.high,
          unit:       'USD/1M',
          confidence: p.confidence || '',
          source_id:  p.source_id || '',
          source_name: src ? src.name : '',
          source_url:  src ? src.url  : '',
          source_date: src ? src.date : ''
        });
      }
    });

    // CSV
    const csvHeader = 'category,id,label,value,low,high,unit,confidence,source_id,source_name,source_url,source_date';
    const csvLines = rows.map(function (r) {
      return [
        r.category, r.id,
        '"' + r.label.replace(/"/g, '""') + '"',
        r.value, r.low, r.high, r.unit, r.confidence,
        r.source_id,
        '"' + r.source_name.replace(/"/g, '""') + '"',
        '"' + r.source_url.replace(/"/g, '""') + '"',
        r.source_date
      ].join(',');
    });
    const csvContent = csvHeader + '\n' + csvLines.join('\n');

    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = 'sunstack-assumptions.csv';
    csvLink.click();
    URL.revokeObjectURL(csvUrl);

    // JSON
    const jsonBlob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = 'sunstack-assumptions.json';
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);
  }

  /* ── Initial render ─────────────────────────────────────────────────────── */
  render();

  /* ── Public API ─────────────────────────────────────────────────────────── */
  return {
    state,
    render,
    renderStructure,
    renderOutputs,
    renderRigBuilder,
    // Hook wired at module load; later tasks override _renderResults, etc.
    _renderPanels:    renderPanels,
    _renderResults:   null,
    _renderCitations: renderCitations
  };
})();
