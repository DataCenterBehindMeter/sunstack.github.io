/* SunStack calculator — pure three-party economic engine (Task 3).
 * Reads window.SunStackData; sets window.SunStackEngine.
 * No DOM access. No side-effects.
 */
window.SunStackEngine = (function () {
  const D = window.SunStackData;
  const SECONDS_PER_YEAR = 3600 * 365; // per active hour-day multiply separately
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  /* ── Pool memory ──────────────────────────────────────────────────────── */
  function poolMemoryGb(rig) {
    return sum(rig.map(id => D.DEVICES[id].memoryGb));
  }

  /* ── Minimum memory for a model at a given quantization ──────────────── */
  function modelMinGb(modelId, quant) {
    const m = D.MODELS[modelId];
    if (quant === "q8")   return m.minGbQ4 * D.QUANT_MULT.q8;
    if (quant === "fp16") return m.minGbQ4 * D.QUANT_MULT.fp16;
    return m.minGbQ4; // q4 = 1 implicit
  }

  /* ── Fits check ───────────────────────────────────────────────────────── */
  function fits(rig, modelId, quant) {
    return rig.length > 0 && poolMemoryGb(rig) >= modelMinGb(modelId, quant);
  }

  /* ── Bytes per active parameter for quantization ─────────────────────── */
  function quantBytes(quant) {
    return D.QUANT_BYTES[quant] || D.QUANT_BYTES.q4;
  }

  /* ── Memory-bandwidth-bound single-stream throughput (tok/s) ─────────────
   * Formula: EFF * device.memBandwidthGbs / (model.activeParamsB * bytesPerParam)
   * Decode phase is memory-bandwidth-bound: each active parameter is loaded
   * once per output token. GBs / (B × bytes/param) = tok/s (units cancel).
   */
  function singleStreamTps(deviceId, modelId, quant) {
    const dev = D.DEVICES[deviceId];
    const mod = D.MODELS[modelId];
    if (!dev || !mod || !mod.activeParamsB) return 0;
    return D.EFF * dev.memBandwidthGbs / (mod.activeParamsB * quantBytes(quant));
  }

  /* ── Sublinear batch gain: c^0.7 ─────────────────────────────────────── */
  function batchGain(c) {
    return Math.pow(c, 0.7);
  }

  /* ── Served throughput for one device (batched) ───────────────────────── */
  function servedTpsDevice(deviceId, modelId, quant, concurrency) {
    return singleStreamTps(deviceId, modelId, quant) * batchGain(concurrency);
  }

  /* ── Aggregate throughput for a rig ─────────────────────────────────────
   * Returns { aggServedTps, singleStreamMin, replicaCount, pooled }
   *
   * - Devices that individually hold the model each run one replica.
   *   aggServedTps = sum of servedTps across all solo-fitting devices.
   * - If none fit individually but pooled memory fits: one slower instance
   *   at the min-bandwidth device × poolEfficiency.
   * - If pooled memory does not fit: aggServedTps = 0.
   *
   * This ensures any rig that fits() a model yields aggServedTps > 0.
   */
  function aggThroughput(state) {
    const rig = state.rig || [];
    if (rig.length === 0) return { aggServedTps: 0, singleStreamMin: 0, replicaCount: 0, pooled: false };
    const minGb = modelMinGb(state.modelId, state.quant);
    const concurrency = state.concurrency != null ? state.concurrency : 12;
    const totalMem = poolMemoryGb(rig);
    if (totalMem < minGb) return { aggServedTps: 0, singleStreamMin: 0, replicaCount: 0, pooled: false };

    // Devices that individually fit — each runs a replica
    const soloFitters = rig.filter(id => D.DEVICES[id].memoryGb >= minGb);

    if (soloFitters.length > 0) {
      let aggServedTps = 0;
      soloFitters.forEach(id => {
        aggServedTps += servedTpsDevice(id, state.modelId, state.quant, concurrency);
      });
      const singleStreamMin = soloFitters.reduce(
        (mn, id) => Math.min(mn, singleStreamTps(id, state.modelId, state.quant)), Infinity
      );
      return { aggServedTps, singleStreamMin, replicaCount: soloFitters.length, pooled: false };
    }

    // Only fits pooled: one instance, min-bandwidth device governs, apply poolEfficiency
    const minBwDevice = rig.reduce((mn, id) =>
      D.DEVICES[id].memBandwidthGbs < D.DEVICES[mn].memBandwidthGbs ? id : mn
    );
    const poolEff = state.poolEfficiency != null ? state.poolEfficiency : 0.75;
    const single = singleStreamTps(minBwDevice, state.modelId, state.quant);
    const aggServedTps = single * batchGain(concurrency) * poolEff;
    return { aggServedTps, singleStreamMin: single, replicaCount: 1, pooled: true };
  }

  /* ── Scalar aggThroughputTps (backward-compat shim) ─────────────────── */
  function aggThroughputTps(state) {
    return aggThroughput(state).aggServedTps;
  }

  /* ── Effective energy price (AUD/kWh) ────────────────────────────────── */
  function effEnergyPriceAudPerKwh(state) {
    const m = state.energyMix;
    const tot = ((m.free || 0) + (m.solar || 0) + (m.grid || 0)) || 1;
    // feedInTariff / retailRate are in AUD c/kWh → divide by 100 for AUD/kWh
    const cPerKwh = (
      (m.free  || 0) * 0 +
      (m.solar || 0) * state.feedInTariff +
      (m.grid  || 0) * state.retailRate
    ) / tot;
    return cPerKwh / 100; // cents → dollars
  }

  /* ── Full scenario computation ────────────────────────────────────────── */
  function computeScenario(state) {
    const rig = state.rig || [];
    const fx  = D.FX_AUD_PER_USD;

    const pooledMemoryGb = poolMemoryGb(rig);
    const totalLoadKw    = sum(rig.map(id => D.DEVICES[id].loadW.typical)) / 1000;
    const rigCostAud     = sum(rig.map(id => D.DEVICES[id].priceUsd.typical)) * fx;

    const okFit   = fits(rig, state.modelId, state.quant);
    const thr      = aggThroughput(state);
    const aggTokps = thr.aggServedTps;

    // tokensPerYear = aggregate tok/s * seconds per active hour * active hours/day * 365 days * utilization
    const tokensPerYear = okFit
      ? aggTokps * 3600 * state.activeHours * 365 * state.utilization
      : 0;

    // ── Pricing ────────────────────────────────────────────────────────────
    const model = D.MODELS[state.modelId];
    // marketPrice = what a buyer pays on competing cloud API for this model
    const marketPriceUsdPerTok   = model.priceOutUsdPerM.typical / 1e6;
    // sunstackPrice undercuts market by `undercut` fraction
    const sunstackPriceUsdPerTok = marketPriceUsdPerTok * (1 - state.undercut);
    // cloudPrice = market price (buyer's alternative baseline)
    const cloudPriceUsdPerTok    = marketPriceUsdPerTok;

    const grossRevenueAud = tokensPerYear * sunstackPriceUsdPerTok * fx;

    // ── Homeowner ──────────────────────────────────────────────────────────
    // Only book inference energy when the rig actually runs paid work.
    // A node that can't fit the model does no work (tokens=0), so charging it
    // energy would be a phantom cost.
    const energyCostAud = okFit
      ? totalLoadKw * state.activeHours * 365 * state.utilization
        * effEnergyPriceAudPerKwh(state)
      : 0;

    const amortAll = rigCostAud / D.HARDWARE_LIFETIME_YEARS;
    // financed = operator covers hardware; homeowner's book entry = 0
    const amortizedHardwareAud = state.financed ? 0 : amortAll;
    // overhead: marginal overhead for a home node is negligible (homeowner already
    // has internet); no longer a user-adjustable input — treated as zero.
    const overheadAud = 0;

    const shareAud     = grossRevenueAud * state.homeownerShare;
    const homeownerNet = shareAud - energyCostAud - amortizedHardwareAud;

    // ── Operator ───────────────────────────────────────────────────────────
    const platformCostAud  = tokensPerYear * (state.platformCostUsdPerMTok / 1e6) * fx;
    const financingCostAud = state.financed ? amortAll : 0;
    const operatorMargin   = grossRevenueAud * (1 - state.homeownerShare)
                             - platformCostAud - financingCostAud;

    // ── Buyer ──────────────────────────────────────────────────────────────
    const buyerPaysAud  = tokensPerYear * sunstackPriceUsdPerTok * fx;
    const buyerCloudAud = tokensPerYear * cloudPriceUsdPerTok    * fx;
    const buyerSavesAud = buyerCloudAud - buyerPaysAud;
    // savePct == undercut by construction (cloudPrice == marketPrice)
    const savePct = cloudPriceUsdPerTok > 0
      ? (cloudPriceUsdPerTok - sunstackPriceUsdPerTok) / cloudPriceUsdPerTok
      : 0;

    // ── Derived ────────────────────────────────────────────────────────────
    const paybackYears = homeownerNet > 0
      ? (state.financed ? 0 : rigCostAud / homeownerNet)
      : Infinity;
    // ROI refers to whoever pays for the hardware
    const ownerProfit = state.financed ? operatorMargin : homeownerNet;
    const roiPct = rigCostAud > 0 ? (ownerProfit / rigCostAud) * 100 : 0;

    return {
      fits: okFit,
      pooledMemoryGb,
      totalLoadKw,
      rigCostAud,
      aggTokps,
      aggServedTps: thr.aggServedTps,
      singleStreamTps: thr.singleStreamMin,
      replicaCount: thr.replicaCount,
      tokensPerYear,
      grossRevenueAud,
      homeowner: {
        netAud:              homeownerNet,
        perMonthAud:         homeownerNet / 12,
        energyCostAud,
        amortizedHardwareAud,
        overheadAud,
        shareAud
      },
      operator: {
        marginAud:      operatorMargin,
        platformCostAud,
        financingCostAud
      },
      buyer: {
        paysAud:     buyerPaysAud,
        cloudCostAud: buyerCloudAud,
        savesAud:    buyerSavesAud,
        savePct
      },
      paybackYears,
      roiPct,
      breakdown: {
        homeownerTakeAud:  Math.max(shareAud - energyCostAud - amortizedHardwareAud - overheadAud, 0),
        operatorMarginAud: Math.max(operatorMargin, 0),
        energyAud:         energyCostAud,
        hardwareAud:       state.financed ? financingCostAud : amortizedHardwareAud
      }
    };
  }

  const UNCERTAINTY_INPUT_IDS = Object.keys(D.INPUT_DEFAULTS);

  function applyPreset(state, mode) {
    const s = JSON.parse(JSON.stringify(state));
    s.preset = mode;
    if (mode === "neutral" || mode === "custom") {
      UNCERTAINTY_INPUT_IDS.forEach(id => { s[id] = D.INPUT_DEFAULTS[id].value; });
      return s;
    }
    UNCERTAINTY_INPUT_IDS.forEach(id => {
      const d = D.INPUT_DEFAULTS[id];
      const favorableHigh = d.polarity === "+";
      const optimistic = mode === "optimistic";
      s[id] = (optimistic === favorableHigh) ? d.high : d.low;
    });
    return s;
  }

  // net is linear in utilization: net(u) = A*u - B  => breakeven u* = B/A
  function breakevenUtilization(state) {
    const at = (u) => { const s = Object.assign({}, state, { utilization: u }); return computeScenario(s).homeowner.netAud; };
    const n0 = at(0), n1 = at(1);
    const A = n1 - n0;
    if (A === 0) return null;
    const u = -n0 / A;
    return (u >= 0 && u <= 1) ? u : null;
  }

  /* ── PAIR hub layout helper ──────────────────────────────────────────────── */
  function hubLayout(count, w, h) {
    const pts = []; if (count <= 0) return pts;
    const cx = w / 2, cy = h / 2;
    const perRing = 6, maxR = Math.min(w, h) / 2 - 60;
    const rings = Math.ceil(count / perRing);
    let placed = 0;
    for (let r = 1; r <= rings; r++) {
      const onThis = Math.min(perRing, count - placed);
      const radius = maxR * (r / rings);
      for (let i = 0; i < onThis; i++) {
        const ang = (2 * Math.PI * i) / onThis - Math.PI / 2 + (r % 2) * (Math.PI / perRing);
        pts.push({ x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) });
        placed++;
      }
    }
    return pts;
  }

  return {
    SECONDS_PER_YEAR,
    poolMemoryGb,
    modelMinGb,
    fits,
    singleStreamTps,
    batchGain,
    aggThroughput,
    aggThroughputTps,
    effEnergyPriceAudPerKwh,
    computeScenario,
    applyPreset,
    breakevenUtilization,
    hubLayout,
    UNCERTAINTY_INPUT_IDS
  };
})();
