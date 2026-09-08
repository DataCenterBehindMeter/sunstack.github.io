/* SunStack calculator — results cards (Task 9 / refine-remove-sensitivity).
 * Sets window.SunStackUI._renderResults.
 * Depends on: SunStackEngine (window.SunStackEngine).
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
    const roiOwner = state.financed ? 'operator' : 'homeowner';
    const roiCard = document.createElement('div');
    roiCard.className = 'result-card';
    roiCard.id = 'card-roi';
    roiCard.innerHTML =
      '<div class="card-label">ROI (' + roiOwner + ')</div>' +
      '<div class="card-val">' + out.roiPct.toFixed(1) + '%</div>' +
      '<div class="card-sub">annual return on hardware cost</div>';
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

    // ── Energy cost card — surfaces the value so energy-mix sliders visibly matter
    const energyCard = document.createElement('div');
    energyCard.className = 'result-card';
    energyCard.id = 'card-energy-cost';
    energyCard.innerHTML =
      '<div class="card-label">Energy A$/yr</div>' +
      '<div class="card-val">' + fmtAudVal(out.homeowner.energyCostAud) + '</div>' +
      '<div class="card-sub">homeowner inference electricity cost</div>';
    grid.appendChild(energyCard);

    root.appendChild(grid);

    // ── Stacked bar (split-bar) — total = buyer's cloud-equivalent spend ──────
    const cloudTotal = out.buyer.cloudCostAud;

    if (cloudTotal > 0) {
      const barWrap = document.createElement('div');
      barWrap.className = 'split-bar-wrap';

      const barTitle = document.createElement('div');
      barTitle.className = 'split-bar-title';
      barTitle.textContent = 'Where each dollar of cloud-equivalent spend goes';
      barWrap.appendChild(barTitle);

      const bar = document.createElement('div');
      bar.id = 'split-bar';
      bar.className = 'split-bar';

      // Hardware cost: operator's financing when financed, else homeowner's amortization
      const hwCostAud = state.financed
        ? out.operator.financingCostAud
        : out.homeowner.amortizedHardwareAud;

      // Clamp negative party values at 0 for bar rendering
      const homeownerBarVal = Math.max(out.homeowner.netAud, 0);
      const operatorBarVal  = Math.max(out.operator.marginAud, 0);

      const segments = [
        { label: 'Buyer saves',    val: out.buyer.savesAud,          barVal: out.buyer.savesAud,  cls: 'seg-buyer-saves' },
        { label: 'Homeowner earns', val: out.homeowner.netAud,        barVal: homeownerBarVal,     cls: 'seg-homeowner' },
        { label: 'Operator margin', val: out.operator.marginAud,      barVal: operatorBarVal,      cls: 'seg-operator' },
        { label: 'Energy',          val: out.homeowner.energyCostAud, barVal: out.homeowner.energyCostAud, cls: 'seg-energy' },
        { label: 'Hardware',        val: hwCostAud,                   barVal: hwCostAud,           cls: 'seg-hardware' }
      ];

      segments.forEach(seg => {
        if (seg.barVal <= 0) return;
        const pct = (seg.barVal / cloudTotal * 100).toFixed(1);
        const seg_el = document.createElement('div');
        seg_el.className = 'split-seg ' + seg.cls;
        seg_el.style.width = pct + '%';
        // Tooltip shows actual (possibly negative) value + % of cloud-equivalent spend
        const tooltipVal = seg.val < 0
          ? seg.label + ': ' + fmtAudVal(seg.val) + ' (bar clamped to 0; ' + pct + '% of cloud spend)'
          : seg.label + ': ' + fmtAudVal(seg.val) + ' (' + pct + '% of cloud spend)';
        seg_el.setAttribute('title', tooltipVal);
        seg_el.setAttribute('aria-label', seg.label + ' ' + pct + ' percent of cloud-equivalent spend');
        bar.appendChild(seg_el);
      });

      barWrap.appendChild(bar);

      // Legend — show all segments with actual value (including negative ones)
      const legend = document.createElement('div');
      legend.className = 'split-legend';
      segments.forEach(seg => {
        const item = document.createElement('span');
        item.className = 'split-legend-item';
        const valText = seg.val < 0
          ? fmtAudVal(seg.val) + ' ⚠'
          : fmtAudVal(seg.val);
        item.innerHTML =
          '<span class="split-swatch ' + seg.cls + '"></span>' +
          '<span>' + seg.label + ' ' + valText + '</span>';
        legend.appendChild(item);
      });
      barWrap.appendChild(legend);

      root.appendChild(barWrap);
    }
  }

  /* ── Wire hook ──────────────────────────────────────────────────────────── */
  if (window.SunStackUI) {
    window.SunStackUI._renderResults = _renderResults;
    // Re-render now that the output layer is attached
    window.SunStackUI.render && window.SunStackUI.render();
  }

})();
