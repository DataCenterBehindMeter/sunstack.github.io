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
    activeHours:             ID.activeHours.value,
    feedInTariff:            ID.feedInTariff.value,
    retailRate:              ID.retailRate.value,

    // energy source (fractions sum to 1; one slider trades solar ↔ grid; default 90% solar)
    energyMix: { solar: 0.9, grid: 0.1 },

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

  /* ── Uncertainty-input display labels ────────────────────────────────────────
   * One source of truth, shared by renderPanels, the sources table, and the
   * downloadable assumptions export.
   */
  const INPUT_LABELS = {
    activeHours:           'Hours/day running inference',
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

    // Update in-place value label for the solar↔grid slider
    const solarDisp = document.getElementById('val-solar-share');
    if (solarDisp) {
      const solarPct = Math.round((state.energyMix.solar || 0) * 100);
      solarDisp.textContent = solarPct + '% solar / ' + (100 - solarPct) + '% grid';
    }

    // Update preset-state indicator
    const presetEl = document.getElementById('preset-state');
    if (presetEl) {
      const displayPreset = (['pessimistic', 'neutral', 'optimistic'].includes(state.preset))
        ? state.preset.charAt(0).toUpperCase() + state.preset.slice(1)
        : 'Custom';
      presetEl.textContent = displayPreset;
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === state.preset);
      btn.setAttribute('aria-pressed', String(btn.dataset.preset === state.preset));
    });
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      const progress = (Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min)) * 100;
      slider.style.setProperty('--range-fill', progress + '%');
    });
    renderRigSummary();

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
    const focused = document.activeElement;
    const focusId = focused?.id;
    const focusPreset = focused?.dataset.preset;
    renderRigBuilder();
    const ui = window.SunStackUI;
    ui && ui._renderPanels    ? ui._renderPanels()    : renderPanels();
    renderOutputs();
    const restoreFocus = focusId ? document.getElementById(focusId) :
      focusPreset ? document.querySelector('[data-preset="' + focusPreset + '"]') : null;
    if (restoreFocus) restoreFocus.focus({preventScroll: true});
  }

  /* ── Top-level render ───────────────────────────────────────────────────── */
  function render() {
    renderStructure();
  }

  /* Device families share illustrations across memory configurations. */
  function deviceArtwork(id) {
    if (id === 'dgx_spark') return 'dgx-spark';
    if (id === 'strix_halo') return 'strix-halo';
    if (id.startsWith('mac_studio')) return 'mac-studio';
    if (id.startsWith('mac_mini')) return 'mac-mini';
    return id.replace('_', '-');
  }

  function renderRigBuilder() {
    const root = document.getElementById('rig-builder');
    if (!root) return;
    const scrollTop = root.querySelector('.catalog-grid')?.scrollTop || 0;
    root.innerHTML =
      '<div class="section-heading"><div><span class="section-kicker">01 / CONFIGURE</span>' +
      '<h2>Rig assembler</h2></div><span class="section-meta">' + state.rig.length +
      (state.rig.length === 1 ? ' device' : ' devices') + '</span></div>' +
      '<div class="rig-enclosure"><div class="enclosure-heading"><span><i></i> SUNSTACK / HOME NODE</span>' +
      '<span>CONCEPT ENCLOSURE</span></div><div id="rig-stage"></div>' +
      '<div class="enclosure-footer"><span>Illustrative layout · not to scale</span><span>Select a device to remove it</span></div></div>' +
      '<div id="rig-summary"></div>' +
      '<div class="catalog"><div class="catalog-heading"><h3>Add to your rig</h3>' +
      '<span>Choose a device below <span aria-hidden="true">↙</span></span></div>' +
      '<div class="catalog-legend"><span class="legend-swatch legend-uma"></span>Unified memory' +
      '<span class="legend-swatch legend-nonuma"></span>Discrete GPU · host included</div>' +
      '<div class="catalog-grid"></div></div>';

    const grid = root.querySelector('.catalog-grid');
    for (const [id, dev] of Object.entries(D.DEVICES)) {
      const btn = document.createElement('button');
      const count = state.rig.filter(item => item === id).length;
      btn.type = 'button';
      btn.dataset.addDevice = id;
      btn.className = dev.uma ? 'uma' : 'non-uma';
      btn.setAttribute('aria-label', 'Add ' + dev.label);
      btn.innerHTML =
        '<img class="device-illustration" src="assets/img/calculator/' + deviceArtwork(id) + '.svg" alt="" width="88" height="59" />' +
        '<span class="dev-info"><span class="dev-label">' + shortDeviceName(id) + '</span>' +
        '<span class="dev-mem">' + dev.memoryGb + ' GB · ' + (dev.uma ? 'unified' : 'VRAM') + '</span>' +
        '<span class="dev-price">' + fmtAud(dev.priceUsd.typical * D.FX_AUD_PER_USD) + '</span></span>' +
        '<span class="dev-add" aria-hidden="true">+</span>' +
        (count ? '<span class="dev-count">' + count + ' in rig</span>' : '');
      btn.addEventListener('click', () => {
        state.rig.push(id);
        state.preset = 'custom';
        renderStructure();
        root.querySelector('[data-add-device="' + id + '"]').focus({ preventScroll: true });
      });
      grid.appendChild(btn);
    }
    grid.scrollTop = scrollTop;
    renderEnclosure();
  }

  function renderEnclosure() {
    const stage = document.getElementById('rig-stage');
    if (!stage) return;
    const mobile = window.matchMedia('(max-width: 600px)').matches;
    const cols = mobile ? 2 : 3;
    const width = mobile ? 440 : 720;
    const gap = mobile ? 28 : 34;
    const nodeW = (width - 104 - gap * (cols - 1)) / cols;
    const nodeH = 166;
    const rowStep = 206;
    const rows = Math.max(1, Math.ceil(state.rig.length / cols));
    const hubY = rows * rowStep + 38;
    const height = hubY + 96;
    const svg = svgEl('svg', {
      id: 'rig-svg', class: mobile ? 'rig-svg-mobile' : '', viewBox: '0 0 ' + width + ' ' + height,
      role: 'group', 'aria-label': 'Rig enclosure with ' + state.rig.length + ' devices connected to PAIR'
    });
    svg.innerHTML = '<defs><linearGradient id="rack-metal" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--dark-2)"/><stop offset="1" stop-color="var(--dark-3)"/>' +
      '</linearGradient><pattern id="rack-perforation" width="8" height="8" patternUnits="userSpaceOnUse">' +
      '<circle cx="2" cy="2" r="1" fill="var(--line-dark)"/></pattern></defs>';
    svg.appendChild(svgEl('rect', {x: 10, y: 8, width: width - 20, height: height - 16, rx: 14, class: 'rack-shell'}));
    svg.appendChild(svgEl('rect', {x: 28, y: 25, width: width - 56, height: hubY - 34, rx: 6, fill: 'url(#rack-perforation)'}));
    [27, width - 27].forEach(x => {
      svg.appendChild(svgEl('rect', {x: x - 6, y: 26, width: 12, height: height - 52, rx: 3, class: 'rack-rail'}));
      for (let y = 44; y < height - 24; y += 38) {
        svg.appendChild(svgEl('circle', {cx: x, cy: y, r: 2, class: 'rack-screw'}));
      }
    });
    const cables = svgEl('g', {'aria-hidden': 'true'});
    const bays = svgEl('g');
    for (let idx = 0; idx < rows * cols; idx++) {
      const row = Math.floor(idx / cols), col = idx % cols;
      const x = 52 + col * (nodeW + gap), y = 42 + row * rowStep;
      if (col === 0) {
        svg.appendChild(svgEl('path', {d: 'M42 ' + (y + nodeH + 7) + 'H' + (width - 42), class: 'rack-shelf'}));
      }
      const id = state.rig[idx];
      if (!id) {
        const empty = svgEl('g', {class: 'rig-empty-bay', transform: 'translate(' + x + ',' + y + ')', 'aria-hidden': 'true'});
        empty.innerHTML = '<rect width="' + nodeW + '" height="' + nodeH + '" rx="10"/>' +
          '<text x="' + nodeW / 2 + '" y="75" class="bay-plus">+</text>' +
          '<text x="' + nodeW / 2 + '" y="104">AVAILABLE BAY</text>';
        bays.appendChild(empty);
        continue;
      }
      const dev = D.DEVICES[id];
      // Each column has a cable channel beside its bays; cable stays clear of hardware.
      const portX = 92 + col * (width - 184) / Math.max(1, cols - 1);
      const laneX = x + nodeW + 8 + (row % 3) * 3;
      const plugY = y + nodeH - 15;
      const cableY = hubY - 16 + col * 4;
      cables.appendChild(svgEl('path', {
        d: 'M' + (x + nodeW - 8) + ' ' + plugY + 'H' + laneX + 'V' + cableY + 'H' + portX + 'V' + (hubY + 15),
        class: 'rig-edge' + (dev.uma ? '' : ' discrete')
      }));
      const node = svgEl('g', {
        class: 'rig-node' + (dev.uma ? '' : ' non-uma'), transform: 'translate(' + x + ',' + y + ')',
        tabindex: '0', role: 'button', 'aria-label': 'Remove ' + dev.label + ' from bay ' + (idx + 1)
      });
      const deviceName = shortDeviceName(id);
      const nameLines = mobile && deviceName.startsWith('Mac ')
        ? deviceName.replace(/ (M[34])/, '|$1').split('|') : [deviceName];
      const nameMarkup = nameLines.map((line, index) => '<tspan x="' + nodeW / 2 + '" y="' +
        (nameLines.length > 1 ? 121 + index * 16 : 131) + '">' + line + '</tspan>').join('');
      node.innerHTML = '<title>Remove ' + dev.label + '</title>' +
        '<rect class="device-bay" width="' + nodeW + '" height="' + nodeH + '" rx="10"/>' +
        '<text x="12" y="19" class="bay-number">' + String(idx + 1).padStart(2, '0') + '</text>' +
        '<circle cx="' + (nodeW - 17) + '" cy="16" r="9" class="node-remove-bg"/>' +
        '<text x="' + (nodeW - 17) + '" y="20" class="node-remove">×</text>' +
        '<image class="device-illustration" href="assets/img/calculator/' + deviceArtwork(id) + '.svg" x="10" y="18" width="' + (nodeW - 20) + '" height="100"/>' +
        '<text x="' + nodeW / 2 + '" y="131" class="rig-node-name">' + nameMarkup + '</text>' +
        '<text x="' + nodeW / 2 + '" y="155" class="rig-node-memory">' + dev.memoryGb + ' GB ' + (dev.uma ? 'UNIFIED' : 'VRAM') + '</text>' +
        '<circle cx="' + (nodeW - 8) + '" cy="' + (nodeH - 15) + '" r="3" class="device-port"/>';
      const remove = () => {
        state.rig.splice(idx, 1);
        state.preset = 'custom';
        renderStructure();
        const next = document.querySelectorAll('.rig-node')[Math.min(idx, state.rig.length - 1)] ||
          document.querySelector('[data-add-device="' + id + '"]');
        next.focus({preventScroll: true});
      };
      node.addEventListener('click', remove);
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); remove(); }
      });
      bays.appendChild(node);
    }
    svg.appendChild(cables);
    svg.appendChild(bays);
    const hub = svgEl('a', {
      href: 'https://www.nvidia.com/en-au/ai-on-rtx/personal-ai-router/',
      target: '_blank', rel: 'noopener', class: 'pair-hub',
      'aria-label': 'NVIDIA PAIR — Personal AI Router', transform: 'translate(52,' + hubY + ')'
    });
    hub.innerHTML = '<rect width="' + (width - 104) + '" height="60" rx="8"/>' +
      '<circle cx="20" cy="30" r="4" class="hub-light"/>' +
      '<text x="34" y="34" class="hub-name">PAIR</text>' +
      '<text x="91" y="34" class="hub-caption">PERSONAL AI ROUTER</text>' +
      '<text x="' + (width - 124) + '" y="35" class="hub-link">↗</text>';
    for (let col = 0; col < cols; col++) {
      hub.appendChild(svgEl('rect', {x: 40 + col * (width - 184) / Math.max(1, cols - 1) - 7, y: -3, width: 14, height: 6, rx: 1, class: 'hub-port'}));
    }
    svg.appendChild(hub);
    stage.replaceChildren(svg);
  }

  function renderRigSummary() {
    const summary = document.getElementById('rig-summary');
    if (!summary) return;
    if (!state.rig.length) {
      summary.innerHTML = '<span class="summary-empty">Your enclosure is ready. Add a device below to get started.</span>';
      return;
    }
    const out = E.computeScenario(state);
    const throughput = E.aggThroughput(state);
    const stat = (value, label) => '<span class="summary-stat"><span class="stat-val">' + value +
      '</span><span class="stat-lbl">' + label + '</span></span>';
    summary.innerHTML = stat(out.pooledMemoryGb + ' GB', 'pooled memory') +
      stat(fmtKw(out.totalLoadKw * 1000), 'inference load') + stat(fmtAud(out.rigCostAud), 'hardware cost') +
      stat(Math.round(out.singleStreamTps) + ' t/s', 'single-stream') +
      stat(Math.round(out.aggServedTps) + ' t/s', 'served (' + state.concurrency + ' concurrent)') +
      '<span class="summary-badge"><span class="fit-badge ' + (out.fits ? 'fit-ok' : 'fit-no') + '">' +
      (out.fits ? 'Model fits ✓' : 'Exceeds pool ✗') + '</span><span class="rig-mode">' +
      (out.fits ? (throughput.pooled ? '1 pooled instance' : out.replicaCount + (out.replicaCount === 1 ? ' replica' : ' replicas')) : 'Choose a smaller model') + '</span></span>';
  }

  window.matchMedia('(max-width: 600px)').addEventListener('change', () => {
    renderEnclosure();
    window.SunStackUI?._renderResults?.();
  });

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

    root.innerHTML = '<div class="section-heading"><div><span class="section-kicker">02 / FINE-TUNE</span><h2>Your scenario</h2></div></div>';

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
      btn.setAttribute('aria-pressed', String(state.preset === mode));
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

    // Solar↔grid energy slider — lives under "Assumptions" (one slider trades solar ↔ grid;
    // left = all grid at retail, right = all solar at the feed-in opportunity cost).
    {
      const solarPct0 = Math.round((state.energyMix.solar || 0) * 100);

      const eGroup = document.createElement('div');
      eGroup.className = 'slider-group';

      const eLabel = document.createElement('label');
      eLabel.setAttribute('for', 'in-solar-share');
      eLabel.className = 'slider-label';

      const eText = document.createElement('span');
      eText.textContent = 'Solar-powered share';

      const eVal = document.createElement('span');
      eVal.className = 'slider-val';
      eVal.id = 'val-solar-share';
      eVal.textContent = solarPct0 + '% solar / ' + (100 - solarPct0) + '% grid';

      eLabel.appendChild(eText);
      eLabel.appendChild(eVal);

      const eSlider = document.createElement('input');
      eSlider.type = 'range';
      eSlider.id = 'in-solar-share';
      eSlider.min = 0;
      eSlider.max = 100;
      eSlider.step = 1;
      eSlider.value = solarPct0;
      eSlider.setAttribute('aria-label', 'Solar-powered share of energy (remainder drawn from the grid)');

      eSlider.addEventListener('input', () => {
        const solar = parseInt(eSlider.value, 10) / 100;
        state.energyMix = { solar: solar, grid: 1 - solar };
        state.preset = 'custom';
        renderOutputs();
      });

      eGroup.appendChild(eLabel);
      eGroup.appendChild(eSlider);
      sliderGrid.appendChild(eGroup);
    }

    sliderSection.appendChild(sliderGrid);
    wrap.appendChild(sliderSection);

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
