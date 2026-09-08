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

  /* ── Per-device throughput lookup ────────────────────────────────────── */
  function deviceModelTokps(deviceId, modelId, batched) {
    const t = (D.THROUGHPUT[deviceId] || {})[modelId];
    if (t) return { tps: batched ? t.batched : t.single, estimated: !!t.estimated };
    // No data row: return 0 (conservative fallback)
    return { tps: 0, estimated: true };
  }

  /* ── Aggregate throughput for a rig ──────────────────────────────────── */
  function aggThroughputTps(state) {
    if (!fits(state.rig, state.modelId, state.quant)) return 0;
    const per = state.rig.map(id => deviceModelTokps(id, state.modelId, true).tps);
    const raw = sum(per);
    // poolEfficiency only discounts multi-box scaling overhead;
    // measured `batched` figures already include single-box concurrency uplift.
    return state.rig.length > 1 ? raw * state.poolEfficiency : raw;
  }

  /* ── Effective energy price (AUD/kWh) ────────────────────────────────── */
  function effEnergyPriceAudPerKwh(state) {
    const m = state.energyMix;
    const tot = (m.free + m.solar + m.grid + m.battery) || 1;
    // feedInTariff / retailRate / batteryCost are in AUD c/kWh → divide by 100 for AUD/kWh
    const cPerKwh = (
      m.free    * 0 +
      m.solar   * state.feedInTariff +
      m.grid    * state.retailRate +
      m.battery * state.batteryCost
    ) / tot;
    return cPerKwh / 100; // cents → dollars
  }

  /* ── Full scenario computation ────────────────────────────────────────── */
  function computeScenario(state) {
    const rig = state.rig || [];
    const fx  = state.fxAudPerUsd;

    const pooledMemoryGb = poolMemoryGb(rig);
    const totalLoadKw    = sum(rig.map(id => D.DEVICES[id].loadW.typical)) / 1000;
    const rigCostAud     = sum(rig.map(id => D.DEVICES[id].priceUsd.typical)) * fx;

    const okFit   = fits(rig, state.modelId, state.quant);
    const aggTokps = aggThroughputTps(state);

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
    const energyCostAud = totalLoadKw * state.activeHours * 365 * state.utilization
                          * effEnergyPriceAudPerKwh(state);

    const amortAll = rigCostAud / state.hardwareLifetimeYears;
    // financed = operator covers hardware; homeowner's book entry = 0
    const amortizedHardwareAud = state.financed ? 0 : amortAll;
    const overheadAud          = state.overheadPerYearAud;

    const shareAud     = grossRevenueAud * state.homeownerShare;
    const homeownerNet = shareAud - energyCostAud - amortizedHardwareAud - overheadAud;

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
    const roiPct = rigCostAud > 0 ? (homeownerNet / rigCostAud) * 100 : 0;

    return {
      fits: okFit,
      pooledMemoryGb,
      totalLoadKw,
      rigCostAud,
      aggTokps,
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

  return {
    SECONDS_PER_YEAR,
    poolMemoryGb,
    modelMinGb,
    fits,
    deviceModelTokps,
    aggThroughputTps,
    effEnergyPriceAudPerKwh,
    computeScenario
  };
})();
