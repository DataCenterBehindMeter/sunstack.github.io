/* SunStack calculator — cited dataset (Task 2).
 * Every value traces to docs/superpowers/specs/research-dataset.json.
 * Numbers: typical (and low/high where present) copied verbatim from that file.
 * Sources: one entry per distinct source_url; snake_case id, name+url+date from dataset.
 */
window.SunStackData = (function () {

  /* ─── SOURCES ─────────────────────────────────────────────────────────────
   * One entry per distinct URL referenced below.
   * Fields: name, url, date (YYYY or YYYY-MM), publisher (optional).
   */
  const SOURCES = {
    // --- DGX Spark ---
    spark_price_oc3d: {
      name: "DGX Spark price rise (Feb 2026) — Overclock3D",
      publisher: "Overclock3D",
      url: "https://overclock3d.net/news/systems/nvidia-raises-dgx-spark-price-by-700-due-to-memory-supply-constraints/",
      date: "2026-02"
    },
    nvidia_spark: {
      name: "NVIDIA DGX Spark official product page",
      publisher: "NVIDIA",
      url: "https://www.nvidia.com/en-us/products/workstations/dgx-spark/",
      date: "2026-09"
    },
    toms_spark_power: {
      name: "Tom's Hardware — NVIDIA DGX Spark review (power page)",
      publisher: "Tom's Hardware",
      url: "https://www.tomshardware.com/pc-components/gpus/nvidia-dgx-spark-review/4",
      date: "2025-10"
    },
    lmsys_spark: {
      name: "LMSYS — NVIDIA DGX Spark benchmark blog",
      publisher: "LMSYS",
      url: "https://www.lmsys.org/blog/2025-10-13-nvidia-dgx-spark/",
      date: "2025-10"
    },
    dandinpower_spark: {
      name: "DandinPower llama.cpp DGX Spark bench report (GitHub)",
      publisher: "DandinPower / GitHub",
      url: "https://github.com/DandinPower/llama.cpp_bench/blob/main/dgx_spark/report.md",
      date: "2025"
    },
    kubesimplify_spark: {
      name: "KubeSimplify — DGX Spark inference anatomy blog",
      publisher: "KubeSimplify",
      url: "https://blog.kubesimplify.com/day-2-anatomy-of-an-llm-inference-request-from-prompt-to-answer-step-by-step",
      date: "2025"
    },
    llamacpp_gptoss120b: {
      name: "llama.cpp discussions — GPT-OSS 120B MoE on DGX Spark",
      publisher: "ggml-org / GitHub Discussions",
      url: "https://github.com/ggml-org/llama.cpp/discussions/16578",
      date: "2025"
    },

    // --- Strix Halo ---
    strix_halo_computingforgeeks: {
      name: "ComputingForGeeks — Ryzen AI Max+ 395 mini PC comparison",
      publisher: "ComputingForGeeks",
      url: "https://computingforgeeks.com/ryzen-ai-max-395-mini-pc-comparison/",
      date: "2026"
    },
    strix_halo_tomshw: {
      name: "Tom's Hardware — AMD Ryzen AI Halo vs DGX Spark comparison",
      publisher: "Tom's Hardware",
      url: "https://www.tomshardware.com/desktops/mini-pcs/amd-challenges-nvidias-dgx-spark-with-usd3-999-ryzen-ai-halo-with-windows-11-support-strix-halo-desktop-undercuts-nvidia-by-usd700-packs-128gb-of-unified-memory",
      date: "2026"
    },
    strix_halo_level1: {
      name: "Level1Techs — Strix Halo Ryzen AI Max+ 395 LLM benchmark results",
      publisher: "Level1Techs Forums",
      url: "https://forum.level1techs.com/t/strix-halo-ryzen-ai-max-395-llm-benchmark-results/233796",
      date: "2026"
    },
    strix_halo_power_amd: {
      name: "AMD — Ryzen AI Max+ PRO 395 product page (TDP spec)",
      publisher: "AMD",
      url: "https://www.amd.com/en/products/processors/laptop/ryzen-pro/ai-max-pro-300-series/amd-ryzen-ai-max-plus-pro-395.html",
      date: "2026"
    },

    // --- Mac Studio M4 Max ---
    apple_macstudio_specs: {
      name: "Apple Support — Mac Studio (2025) Tech Specs",
      publisher: "Apple",
      url: "https://support.apple.com/en-us/102027",
      date: "2025-01"
    },
    macworld_macstudio: {
      name: "Macworld — M3 Mac Studio design and specs",
      publisher: "Macworld",
      url: "https://www.macworld.com/article/2204696/m3-mac-studio-design-review-specs-price.html",
      date: "2025"
    },
    everymac_macstudio: {
      name: "EveryMac — Mac Studio FAQ and specs",
      publisher: "EveryMac",
      url: "https://everymac.com/systems/apple/mac-studio/mac-studio-faq/",
      date: "2025"
    },
    appleinsider_macstudio_price: {
      name: "AppleInsider — Mac Studio 2025 prices",
      publisher: "AppleInsider",
      url: "https://prices.appleinsider.com/mac-studio-2025",
      date: "2025"
    },
    macrumors_m3ultra: {
      name: "MacRumors — Maxed-out M3 Ultra Mac Studio specs and pricing",
      publisher: "MacRumors",
      url: "https://www.macrumors.com/2025/03/05/maxed-out-m3-ultra-mac-studio/",
      date: "2025-03"
    },
    lowendmac_macstudio: {
      name: "LowEndMac — Mac Studio early 2025 models",
      publisher: "LowEndMac",
      url: "https://lowendmac.com/2025/mac-studio-early-2025/",
      date: "2025"
    },
    appleinsider_macstudio: {
      name: "AppleInsider — Mac Studio inside guide",
      publisher: "AppleInsider",
      url: "https://appleinsider.com/inside/mac-studio",
      date: "2025"
    },
    apple_macmini_power: {
      name: "Apple Support — Mac mini (2024) environmental/energy specs",
      publisher: "Apple",
      url: "https://support.apple.com/en-us/103253",
      date: "2024"
    },

    // --- Mac Mini M4 ---
    apple_macmini_newsroom: {
      name: "Apple Newsroom — New Mac mini (Oct 2024 launch)",
      publisher: "Apple",
      url: "https://www.apple.com/newsroom/2024/10/apples-new-mac-mini-is-more-mighty-more-mini-and-built-for-apple-intelligence/",
      date: "2024-10-29"
    },
    apple_macmini_specs: {
      name: "Apple Support — Mac mini (2024) Tech Specs",
      publisher: "Apple",
      url: "https://support.apple.com/en-us/121555",
      date: "2025-01"
    },
    everymac_macmini_m4: {
      name: "EveryMac — Mac mini M4 10-core 2024 specs",
      publisher: "EveryMac",
      url: "https://everymac.com/systems/apple/mac_mini/specs/mac-mini-m4-10-core-cpu-10-core-gpu-2024-specs.html",
      date: "2024-11"
    },
    wikipedia_macmini: {
      name: "Wikipedia — Mac Mini",
      publisher: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Mac_Mini",
      date: "2024-11"
    },
    tomshw_macmini_price: {
      name: "Tom's Hardware — Apple Mac mini price history",
      publisher: "Tom's Hardware",
      url: "https://www.tomshardware.com/desktops/mini-pcs/apple-price-hike-mac-mini-m4-pro-jumps-200-as-tariffs-bite",
      date: "2025"
    },
    everymac_macmini_m4pro: {
      name: "EveryMac — Mac mini M4 Pro 14-core 2024 specs",
      publisher: "EveryMac",
      url: "https://everymac.com/systems/apple/mac_mini/specs/mac-mini-m4-pro-14-core-cpu-20-core-gpu-2024-specs.html",
      date: "2024-11"
    },

    // --- RTX 4090 ---
    bestvaluegpu_4090: {
      name: "BestValueGPU — RTX 4090 price history and specs",
      publisher: "BestValueGPU",
      url: "https://bestvaluegpu.com/history/new-and-used-rtx-4090-price-history-and-specs/",
      date: "2026-01"
    },
    techpowerup_4090: {
      name: "TechPowerUp GPU database — GeForce RTX 4090",
      publisher: "TechPowerUp",
      url: "https://www.techpowerup.com/gpu-specs/geforce-rtx-4090.c3889",
      date: "2026-09"
    },
    nvidia_4090: {
      name: "NVIDIA official product page — GeForce RTX 4090",
      publisher: "NVIDIA",
      url: "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/",
      date: "2026-09"
    },
    overclock_4090_power: {
      name: "Overclock.net — measured total system wattage (i9-13900K + RTX 4090)",
      publisher: "Overclock.net",
      url: "https://www.overclock.net/threads/tested-total-system-wattage-i9-13900k-rtx-4090-lots-of-fans-shows-if-you-can-run-this-with-750-watt-psu.1807934/",
      date: "2026-09"
    },
    tomshw_pc_rest_cost: {
      name: "Tom's Hardware — RTX 5090 gaming PC build / host component cost",
      publisher: "Tom's Hardware",
      url: "https://www.tomshardware.com/desktops/gaming-pcs/get-an-entire-rtx-5090-gaming-pc-for-around-the-price-of-just-the-gpu-a-high-end-battle-station-for-under-usd4-000",
      date: "2026-09"
    },

    // --- RTX 5090 ---
    videocardprices_5090: {
      name: "VideoCardPrices — RTX 5090 tracker (Sep 2026)",
      publisher: "VideoCardPrices",
      url: "https://videocardprices.com/card/nvidia-rtx-5090/",
      date: "2026-01"
    },
    techpowerup_5090: {
      name: "TechPowerUp — GeForce RTX 5090 Founders Edition review",
      publisher: "TechPowerUp",
      url: "https://www.techpowerup.com/review/nvidia-geforce-rtx-5090-founders-edition/",
      date: "2026-09"
    },
    nvidia_5090: {
      name: "NVIDIA official product page — GeForce RTX 5090",
      publisher: "NVIDIA",
      url: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/",
      date: "2026-09"
    },
    overclocking_5090_power: {
      name: "Overclocking.com — RTX 5090 Founders Edition full-system power review",
      publisher: "Overclocking.com",
      url: "https://en.overclocking.com/review-nvidia-rtx-5090-founders-edition/12/",
      date: "2026-09"
    },

    // --- GPU throughput ---
    gigagpu_4090_llama8b: {
      name: "GigaGPU — RTX 4090 Llama 3.1 8B benchmark",
      publisher: "GigaGPU",
      url: "https://gigagpu.com/rtx-4090-24gb-llama-3-8b-benchmark/",
      date: "2026"
    },
    databasemart_4090_batch: {
      name: "DatabaseMart — vLLM GPU benchmark RTX 4090",
      publisher: "DatabaseMart",
      url: "https://www.databasemart.com/blog/vllm-gpu-benchmark-rtx4090",
      date: "2026"
    },
    cloudrift_gpu: {
      name: "CloudRift — GPU benchmarks (batched aggregate throughput)",
      publisher: "CloudRift",
      url: "https://www.cloudrift.ai/gpu-benchmarks",
      date: "2026"
    },
    spheron_5090: {
      name: "Spheron — RTX 5090 LLM inference benchmark blog",
      publisher: "Spheron",
      url: "https://www.spheron.network/blog/rent-nvidia-rtx-5090/",
      date: "2026"
    },

    // --- Apple throughput ---
    llamacpp_discussions_apple: {
      name: "llama.cpp GitHub Discussions — Apple Silicon benchmark thread",
      publisher: "ggml-org / GitHub",
      url: "https://github.com/ggml-org/llama.cpp/discussions/4167",
      date: "2025"
    },
    macrumors_m3ultra_bench: {
      name: "MacRumors Forums — Mac Studio M3 Ultra 96GB LLM performance thread",
      publisher: "MacRumors Forums",
      url: "https://forums.macrumors.com/threads/mac-studio-m3-ultra-96gb-28-60-llm-performance.2456559/",
      date: "2025"
    },
    siliconscore_m4max: {
      name: "SiliconScore — M4 Max 128GB benchmarks",
      publisher: "SiliconScore",
      url: "https://siliconscore.com/chips/m4-max-128-gb/",
      date: "2025"
    },
    heyuan110_apple: {
      name: "heyuan110 — Apple Silicon AI workstation Ollama benchmarks",
      publisher: "heyuan110 (blog)",
      url: "https://www.heyuan110.com/posts/ai/2026-04-14-mac-apple-silicon-ai-workstation/",
      date: "2026-04"
    },

    // --- Model token prices ---
    deepinfra_pricing: {
      name: "DeepInfra — API pricing page",
      publisher: "DeepInfra",
      url: "https://deepinfra.com/pricing",
      date: "2026"
    },
    groq_pricing: {
      name: "Groq — API pricing",
      publisher: "Groq",
      url: "https://groq.com/pricing/",
      date: "2026"
    },
    novita_pricing: {
      name: "Novita.ai — pricing page",
      publisher: "Novita.ai",
      url: "https://novita.ai/pricing",
      date: "2026"
    },
    fireworks_pricing: {
      name: "Fireworks AI — pricing page",
      publisher: "Fireworks AI",
      url: "https://fireworks.ai/pricing",
      date: "2026"
    },
    openrouter_pricing: {
      name: "OpenRouter — Llama 3.3 70B model page",
      publisher: "OpenRouter",
      url: "https://openrouter.ai/meta-llama/llama-3.3-70b-instruct",
      date: "2026"
    },

    // --- Energy / solar ---
    solarchoice_fit: {
      name: "SolarChoice — Australian solar feed-in tariff guide",
      publisher: "SolarChoice",
      url: "https://www.solarchoice.net.au/learn/energy/feed-in-tariffs/",
      date: "2026"
    },
    esc_vic_fit: {
      name: "ESC Victoria — Solar minimum feed-in tariffs 2025-26",
      publisher: "Essential Services Commission VIC",
      url: "https://www.esc.vic.gov.au/media-centre/solar-minimum-feed-tariffs-2025-26",
      date: "2025"
    },
    synergy_wa_fit: {
      name: "Synergy WA — DEBS pricing schedule",
      publisher: "Synergy WA",
      url: "https://www.synergy.net.au/-/media/Files/PDF-Library/DEBS_Pricing_schedule.pdf",
      date: "2026"
    },
    canstar_retail: {
      name: "Canstar Blue — Electricity costs per kWh in Australia",
      publisher: "Canstar Blue",
      url: "https://www.canstar.com.au/energy/electricity-costs-kwh/",
      date: "2026"
    },

    // --- Utilization ---
    messari_akash: {
      name: "Messari — State of Akash Q2 2025",
      publisher: "Messari",
      url: "https://messari.io/report/state-of-akash-q2-2025",
      date: "2025"
    }
  };

  /* ─── Helper ───────────────────────────────────────────────────────────────
   * D(typical, low, high, unit, source_id, confidence)
   * Creates a data-point object for device/model/default fields.
   */
  const D = (typical, low, high, unit, source_id, confidence) =>
    ({ typical, low, high, unit, source_id, confidence });

  /* ─── DEVICES ─────────────────────────────────────────────────────────────
   * Each device: label, uma, memoryGb, memBandwidthGbs,
   *              priceUsd (D()), idleW, loadW (D())
   * Non-UMA devices: memoryGb = VRAM (not system RAM).
   * GPU devices include rest-of-system cost in priceUsd (priceUsd covers full system).
   */
  const DEVICES = {

    dgx_spark: {
      label: "NVIDIA DGX Spark (GB10, 128GB)",
      uma: true,
      memoryGb: 128,
      memBandwidthGbs: 273,
      priceUsd: D(4699, 3999, 4699, "USD", "spark_price_oc3d", "high"),
      idleW: 25,
      loadW: D(160, 100, 200, "W", "toms_spark_power", "medium")
    },

    strix_halo: {
      label: "AMD Ryzen AI Max+ 395 (Strix Halo, 128GB)",
      uma: true,
      memoryGb: 128,
      memBandwidthGbs: 256,
      priceUsd: D(3449, 1795, 3649, "USD", "strix_halo_computingforgeeks", "high"),
      idleW: 14,
      loadW: D(120, 45, 140, "W", "strix_halo_power_amd", "medium")
    },

    mac_studio_m4max_36: {
      label: "Mac Studio M4 Max (36GB)",
      uma: true,
      memoryGb: 36,
      memBandwidthGbs: 410,
      priceUsd: D(1999, 1999, 2499, "USD", "macworld_macstudio", "high"),
      idleW: 6,
      loadW: D(65, 65, 145, "W", "apple_macstudio_specs", "high")
    },

    mac_studio_m4max_128: {
      label: "Mac Studio M4 Max (128GB)",
      uma: true,
      memoryGb: 128,
      memBandwidthGbs: 546,
      priceUsd: D(3699, 3699, 3699, "USD", "appleinsider_macstudio_price", "medium"),
      idleW: 6,
      loadW: D(65, 65, 145, "W", "apple_macstudio_specs", "high")
    },

    mac_studio_m3ultra_96: {
      label: "Mac Studio M3 Ultra (96GB)",
      uma: true,
      memoryGb: 96,
      memBandwidthGbs: 819,
      priceUsd: D(3999, 3999, 5299, "USD", "macrumors_m3ultra", "high"),
      idleW: 9,
      loadW: D(180, 130, 270, "W", "apple_macstudio_specs", "high")
    },

    mac_studio_m3ultra_256: {
      label: "Mac Studio M3 Ultra (256GB)",
      uma: true,
      memoryGb: 256,
      memBandwidthGbs: 819,
      priceUsd: D(7099, 7099, 7099, "USD", "lowendmac_macstudio", "low"),
      idleW: 9,
      loadW: D(180, 130, 270, "W", "apple_macstudio_specs", "high")
    },

    mac_studio_m3ultra_512: {
      label: "Mac Studio M3 Ultra (512GB)",
      uma: true,
      memoryGb: 512,
      memBandwidthGbs: 819,
      priceUsd: D(9499, 9499, 14099, "USD", "macrumors_m3ultra", "high"),
      idleW: 9,
      loadW: D(180, 130, 270, "W", "apple_macstudio_specs", "high")
    },

    mac_mini_m4_16: {
      label: "Mac mini M4 (16GB)",
      uma: true,
      memoryGb: 16,
      memBandwidthGbs: 120,
      priceUsd: D(599, 599, 799, "USD", "apple_macmini_newsroom", "high"),
      idleW: 4,
      loadW: D(65, 40, 65, "W", "apple_macmini_power", "high")
    },

    mac_mini_m4_24: {
      label: "Mac mini M4 (24GB)",
      uma: true,
      memoryGb: 24,
      memBandwidthGbs: 120,
      priceUsd: D(999, 999, 999, "USD", "everymac_macmini_m4", "high"),
      idleW: 4,
      loadW: D(65, 40, 65, "W", "apple_macmini_power", "high")
    },

    mac_mini_m4_32: {
      label: "Mac mini M4 (32GB)",
      uma: true,
      memoryGb: 32,
      memBandwidthGbs: 120,
      priceUsd: D(1199, 1199, 1199, "USD", "wikipedia_macmini", "medium"),
      idleW: 4,
      loadW: D(65, 40, 65, "W", "apple_macmini_power", "high")
    },

    mac_mini_m4pro_48: {
      label: "Mac mini M4 Pro (48GB)",
      uma: true,
      memoryGb: 48,
      memBandwidthGbs: 273,
      priceUsd: D(1799, 1799, 1799, "USD", "tomshw_macmini_price", "high"),
      idleW: 5,
      loadW: D(140, 80, 140, "W", "apple_macmini_power", "high")
    },

    mac_mini_m4pro_64: {
      label: "Mac mini M4 Pro (64GB)",
      uma: true,
      memoryGb: 64,
      memBandwidthGbs: 273,
      priceUsd: D(1999, 1999, 1999, "USD", "everymac_macmini_m4pro", "medium"),
      idleW: 5,
      loadW: D(140, 80, 140, "W", "apple_macmini_power", "high")
    },

    // Non-UMA: memoryGb = VRAM. priceUsd is ALL-IN system cost (card + host PC),
    // since the engine sums device.priceUsd uniformly. Host cost from dataset
    // rest_of_system_cost_usd {low 1200, typ 2170, high 3500}.
    // 4090 card {1800, 2500, 3500} + host = {3000, 4670, 7000}.
    gpu_4090: {
      label: "RTX 4090 desktop (24GB, incl. host)",
      uma: false,
      memoryGb: 24,
      memBandwidthGbs: 1008,
      priceUsd: D(4670, 3000, 7000, "USD", "bestvaluegpu_4090", "medium"),
      idleW: 30,
      loadW: D(775, 650, 900, "W", "overclock_4090_power", "medium")
    },

    // 5090 card {3350, 5000, 5800} + host {1200, 2170, 3500} = {4550, 7170, 9300}.
    gpu_5090: {
      label: "RTX 5090 desktop (32GB, incl. host)",
      uma: false,
      memoryGb: 32,
      memBandwidthGbs: 1792,
      priceUsd: D(7170, 4550, 9300, "USD", "videocardprices_5090", "medium"),
      idleW: 30,
      loadW: D(850, 775, 1007, "W", "overclocking_5090_power", "medium")
    }
  };

  /* ─── MODELS ─────────────────────────────────────────────────────────────
   * minGbQ4: minimum unified/VRAM memory to run at 4-bit quant.
   * minGbQ8 = minGbQ4 * 1.9  (Q8 ≈ 1.9× the Q4 footprint)
   * minGbFp16 = minGbQ4 * 3.6 (FP16 ≈ 3.6× the Q4 footprint)
   * priceOutUsdPerM: market output token price (USD per 1M tokens).
   */
  const MODELS = {
    llama31_8b: {
      label: "Llama 3.1 8B",
      minGbQ4: 5,
      priceOutUsdPerM: D(0.08, 0.04, 0.20, "USD/1M", "deepinfra_pricing", "high"),
      note: "Fits in any device on the list."
    },
    qwen32b: {
      label: "Qwen 32B",
      minGbQ4: 20,
      priceOutUsdPerM: D(0.28, 0.28, 0.90, "USD/1M", "deepinfra_pricing", "medium"),
      note: "Dense 32B; fits in 24GB+ with Q4."
    },
    llama33_70b: {
      label: "Llama 3.3 70B",
      minGbQ4: 40,
      priceOutUsdPerM: D(0.40, 0.32, 0.90, "USD/1M", "groq_pricing", "high"),
      note: "Dense 70B; needs 40GB+ at Q4. Fits UMA devices only."
    },
    qwen72b: {
      label: "Qwen2.5 72B",
      minGbQ4: 42,
      priceOutUsdPerM: D(0.40, 0.40, 1.20, "USD/1M", "novita_pricing", "high"),
      note: "Dense 72B; needs 42GB+ at Q4."
    },
    gpt_oss_120b: {
      label: "gpt-oss-120B (MoE)",
      minGbQ4: 64,
      priceOutUsdPerM: D(0.60, 0.17, 0.60, "USD/1M", "fireworks_pricing", "high"),
      note: "OpenAI open-weight MoE; MXFP4 weights ~64 GB."
    },
    deepseek_v3: {
      label: "DeepSeek V3",
      minGbQ4: 380,
      priceOutUsdPerM: D(1.03, 0.89, 1.25, "USD/1M", "deepinfra_pricing", "high"),
      note: "Very large MoE; requires multi-node or 512GB+ UMA for Q4."
    }
  };

  /* ─── QUANT_MULT ─────────────────────────────────────────────────────────
   * Memory multipliers relative to Q4 baseline (Q4 = 1 implicit).
   * Q8 ≈ 1.9× Q4 footprint; FP16 ≈ 3.6× Q4 footprint.
   */
  const QUANT_MULT = { q8: 1.9, fp16: 3.6 };

  /* ─── THROUGHPUT ─────────────────────────────────────────────────────────
   * { single, batched, source_id, confidence, estimated }
   * "single" = single-stream (batch=1) decode tok/s.
   * "batched" = aggregate throughput at high concurrency.
   * estimated:true means no direct dataset row; confidence:"low".
   */
  const THROUGHPUT = {

    dgx_spark: {
      // single from dgx_spark_llama31_8b_decode_single_ollama_q4 (typical=38, conf=high)
      // batched from dgx_spark_llama31_8b_decode_batch32_sglang_fp8 (typical=368, conf=high)
      llama31_8b: { single: 38, batched: 368, source_id: "lmsys_spark", confidence: "high", estimated: false },
      // single from dgx_spark_30b_dense_decode_single_llamacpp (typical=10.7, conf=high, closest to qwen32b)
      // batched: no dataset row for qwen32b batched on DGX Spark → estimated
      qwen32b:    { single: 11, batched: 40,  source_id: "dandinpower_spark", confidence: "low", estimated: true },
      // single from dgx_spark_llama31_70b_decode_single_sglang_fp8 (typical=2.7, conf=high)
      // batched: no direct 70B batched row → estimated
      llama33_70b: { single: 3,  batched: 12,  source_id: "lmsys_spark",     confidence: "low", estimated: true },
      // gpt_oss_120b: dgx_spark_gptoss120b_moe_decode single=60.6 (medium), batched=130 estimated
      gpt_oss_120b: { single: 60, batched: 130, source_id: "llamacpp_gptoss120b", confidence: "medium", estimated: false }
    },

    strix_halo: {
      // single from strix_halo_llama3_8b_decode_single_vulkan (typical=42, conf=high)
      // batched: no dataset row → estimated
      llama31_8b: { single: 42, batched: 80,  source_id: "strix_halo_level1", confidence: "low", estimated: true },
      // single from strix_halo_30b_moe_decode_single_vulkan closest to qwen32b (typical=66.3 MoE; dense ~13)
      // using strix_halo_24b_dense_decode_single_hip as proxy for 32B dense (typical=14.3)
      qwen32b:    { single: 13, batched: 30,  source_id: "strix_halo_level1", confidence: "low", estimated: true },
      // single from strix_halo_70b_dense_decode_single (typical=5, conf=high)
      // batched: no dataset row → estimated
      llama33_70b: { single: 5,  batched: 10,  source_id: "strix_halo_level1", confidence: "low", estimated: true },
      // gpt_oss_120b: no direct row; estimated from bandwidth ratio (256/819 * m3ultra rate)
      gpt_oss_120b: { single: 31, batched: 60,  source_id: "strix_halo_level1", confidence: "low", estimated: true }
    },

    mac_studio_m3ultra_256: {
      // from m3ultra_qwen8b_q4_mlx_gen_tps typical=114.93 (8B proxy → llama31_8b)
      llama31_8b: { single: 114, batched: 300, source_id: "macrumors_m3ultra_bench", confidence: "low", estimated: true },
      // from m3ultra_qwen32b_q4_mlx_gen_tps typical=33.88 (conf=medium)
      qwen32b:    { single: 34,  batched: 90,  source_id: "macrumors_m3ultra_bench", confidence: "medium", estimated: false },
      // from m3ultra_llama70b_q4_mlx_gen_tps typical=16.45 (conf=medium)
      llama33_70b: { single: 16,  batched: 40,  source_id: "macrumors_m3ultra_bench", confidence: "medium", estimated: false }
    },

    mac_studio_m3ultra_512: {
      // same chip as 256; throughput largely identical (same bandwidth, more capacity only)
      llama31_8b: { single: 114, batched: 300, source_id: "macrumors_m3ultra_bench", confidence: "low", estimated: true },
      qwen32b:    { single: 34,  batched: 90,  source_id: "macrumors_m3ultra_bench", confidence: "low", estimated: true },
      llama33_70b: { single: 16,  batched: 40,  source_id: "macrumors_m3ultra_bench", confidence: "low", estimated: true }
    },

    mac_mini_m4pro_64: {
      // from m4pro_mini_llama8b_q4_ollama_gen_tps typical=42 (conf=medium) — 48GB config, applies to 64GB
      llama31_8b: { single: 42, batched: 90,  source_id: "heyuan110_apple", confidence: "low", estimated: true },
      // no direct qwen32b row for M4 Pro mini → estimated
      qwen32b:    { single: 12, batched: 30,  source_id: "llamacpp_discussions_apple", confidence: "low", estimated: true }
    },

    gpu_4090: {
      // single from rtx4090_llama8b_fp16_single_stream_tok_s typical=95 (conf=high)
      // batched from rtx4090_llama8b_batched_aggregate_tok_s typical=2770 (conf=high)
      llama31_8b: { single: 95,   batched: 2770, source_id: "gigagpu_4090_llama8b", confidence: "high", estimated: false },
      // single/batched from rtx4090_30b_awq_batched_aggregate_tok_s typical=2259; no single-stream 30B row
      // single estimated from bandwidth scaling
      qwen32b:    { single: 30,   batched: 2259, source_id: "cloudrift_gpu",        confidence: "low",  estimated: true  }
    },

    gpu_5090: {
      // single: rtx5090_llama8b_fp16_single_stream_tok_s is verdict:"unverifiable"
      //   (bandwidth-derived, no measured benchmark) → estimated:true, confidence:"low"
      // batched from rtx5090_llama8b_fp16_batched_aggregate_tok_s typical=4570 (conf=high, measured)
      llama31_8b: { single: 150,  batched: 4570, source_id: "spheron_5090",  confidence: "low",    estimated: true  },
      // batched from rtx5090_32b_awq_batched_aggregate_tok_s typical=4570 (conf=high)
      // single estimated from bandwidth scaling (~32GB 4090 ratio)
      qwen32b:    { single: 45,   batched: 4570, source_id: "cloudrift_gpu",  confidence: "low",   estimated: true  }
    }
  };

  /* ─── ENERGY_PRESETS ─────────────────────────────────────────────────────
   * feedInTariff, retailRate in AUD c/kWh.
   * VIC: solar_fit_vic min=1.1c (brief matches: VIC {1.1, 26.4}); retail 26.4 from retail_rate_by_state range.
   * NSW: solar_fit_nsw low=4.8, high=7.3 → typical ~5; retail 33 from canstar_retail range.
   * QLD: solar_fit_qld_regional typical=8.66 → 5c for comparison floor; retail 24.
   * SA: solar_fit_sa low=2, high=5 → 5c typical; retail 40.
   * WA: solar_fit_wa corrected off-peak min=2.0c (ex-GST); retail 34.
   * national: solar_fit_typical_range_national low=3, high=10 → 3.3c; retail 30.
   */
  const ENERGY_PRESETS = {
    VIC: {
      label: "Victoria",
      feedInTariff: 1.1,
      retailRate: 26.4,
      source_id: "esc_vic_fit",
      note: "VIC feed-in tariff deregulated on 1 Jul 2025; 1.1 c/kWh is the average minimum per the dataset (no mandated single rate)."
    },
    NSW: {
      label: "New South Wales",
      feedInTariff: 5.0,
      retailRate: 33,
      source_id: "solarchoice_fit"
    },
    QLD: {
      label: "Queensland",
      feedInTariff: 5.0,
      retailRate: 24,
      source_id: "solarchoice_fit"
    },
    SA: {
      label: "South Australia",
      feedInTariff: 5.0,
      retailRate: 40,
      source_id: "solarchoice_fit"
    },
    WA: {
      label: "Western Australia",
      feedInTariff: 2.0,
      retailRate: 34,
      source_id: "synergy_wa_fit"
    },
    national: {
      label: "Australia (national avg)",
      feedInTariff: 3.3,
      retailRate: 30,
      source_id: "canstar_retail"
    }
  };

  /* ─── INPUT_DEFAULTS ─────────────────────────────────────────────────────
   * Each entry: { value, low, high, unit, source_id, confidence, polarity }
   * polarity "+" = optimistic direction is higher (e.g. utilization: higher → more revenue).
   * polarity "-" = optimistic direction is lower (e.g. retailRate: lower → more margin).
   * Invariant: low <= value <= high (enforced by test).
   */
  const INPUT_DEFAULTS = {
    utilization: {
      value: 0.40, low: 0.20, high: 0.65,
      unit: "fraction",
      source_id: "messari_akash", confidence: "medium", polarity: "+"
    },
    activeHours: {
      value: 8, low: 5, high: 10,
      unit: "h/day",
      source_id: "messari_akash", confidence: "low", polarity: "+"
    },
    poolEfficiency: {
      value: 0.75, low: 0.60, high: 0.90,
      unit: "fraction",
      source_id: "messari_akash", confidence: "medium", polarity: "+"
    },
    feedInTariff: {
      value: 3.3, low: 1.1, high: 10,
      unit: "AUD c/kWh",
      source_id: "solarchoice_fit", confidence: "high", polarity: "-"
    },
    retailRate: {
      value: 30, low: 24, high: 45,
      unit: "AUD c/kWh",
      source_id: "canstar_retail", confidence: "high", polarity: "-"
    },
    batteryCost: {
      value: 8, low: 5, high: 15,
      unit: "AUD c/kWh",
      source_id: "canstar_retail", confidence: "medium", polarity: "-"
    },
    hardwareLifetimeYears: {
      value: 4, low: 3, high: 6,
      unit: "years",
      source_id: "messari_akash", confidence: "low", polarity: "+"
    },
    overheadPerYearAud: {
      value: 150, low: 80, high: 300,
      unit: "AUD/year",
      source_id: "messari_akash", confidence: "low", polarity: "-"
    },
    fxAudPerUsd: {
      value: 1.53, low: 1.45, high: 1.65,
      unit: "AUD/USD",
      source_id: "canstar_retail", confidence: "medium", polarity: "+"
    }
  };

  /* ─── cite() ─────────────────────────────────────────────────────────────
   * Returns the SOURCES entry for id; throws if not found.
   */
  function cite(id) {
    const s = SOURCES[id];
    if (!s) throw new Error("SunStackData: no source '" + id + "'");
    return s;
  }

  return { SOURCES, DEVICES, MODELS, QUANT_MULT, THROUGHPUT, ENERGY_PRESETS, INPUT_DEFAULTS, cite };
})();
