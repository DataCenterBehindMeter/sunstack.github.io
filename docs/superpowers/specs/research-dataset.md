# SunStack Calculator — Sourced Dataset (audited)

*Generated from the research workflow (run `wf_cb79e172-16e`): 11 finders → adversarial verification → merged with corrections applied. Every row carries a primary/reputable source. `Verdict` = the independent fact-checker's call (`confirmed` / `corrected` = number or source updated / `unchecked`). Access date 2026-09-08. Full machine-readable set in `research-dataset.json`.*


## NVIDIA DGX Spark (GB10)

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| NVIDIA DGX Spark Founders Edition MSRP (current, 4TB) | 4699 | USD | high | confirmed | [Overclock3D / NVIDIA statement (Feb 2026 price](https://overclock3d.net/news/systems/nvidia-raises-dgx-spark-price-by-700-due-to-memory-supply-constraints/) |
| DGX Spark unified system memory | 128 GB LPDDR5x coherent unified | GB | high | confirmed | [NVIDIA DGX Spark official product page](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| DGX Spark memory type | LPDDR5X (ASUS review: LPDDR5X-8533, soldered) | type | high | confirmed | [NVIDIA product page + ServeTheHome ASUS Ascent](https://www.servethehome.com/asus-ascent-gx10-review-a-new-nvidia-gb10-solution/) |
| DGX Spark memory bandwidth | 273 | GB/s | high | confirmed | [NVIDIA DGX Spark official product page (273 GB](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| DGX Spark FP4 sparse AI performance | 1 PFLOP FP4 (=1000 TFLOPS / ~1000 TOPS, sparse with sparsity) | PFLOPS | high | confirmed | [NVIDIA DGX Spark official product page](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| DGX Spark FP16/BF16 dense TFLOPS | ~125 (derived, not officially published) | TFLOPS | low | unverifiable | [Derived from GB10 FP4 1 PFLOP sparse (NVIDIA);](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| DGX Spark idle power (after ConnectX-7 hot-plug software upd | 22 (headless) / 25 (with display) | W | high | confirmed | [Tom's Hardware (NVIDIA DGX Spark idle-power up](https://www.tomshardware.com/tech-industry/artificial-intelligence/nvidia-dgx-spark-update-cuts-idle-power-by-32-percent-or-more-hot-plug-detection-on-connectx-nic-makes-for-a-more-efficient-ai-workstation) |
| DGX Spark idle power (pre-update, out of box) | 35 headless / 40 with display / up to 45 (other tests) | W | medium | confirmed | [Tom's Hardware DGX Spark review (power page)](https://www.tomshardware.com/pc-components/gpus/nvidia-dgx-spark-review/4) |
| DGX Spark load / peak power (AI workload) | ~100-143 measured; 140 W GB10 SoC budget; 240 W PSU | W | medium | corrected | [Tom's Hardware review + ServeTheHome measureme](https://www.tomshardware.com/pc-components/gpus/nvidia-dgx-spark-review/4) |
| DGX Spark power supply rating (Founders Edition) | 240 (NVIDIA FE / ASUS); 280 (Dell Pro Max variant) | W | high | confirmed | [NVIDIA DGX Spark product page; Dell / HotHardw](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| Two-unit cluster over 200GbE QSFP / ConnectX-7 — pooled mode | 2 units => Llama 3.1 405B; 256GB pooled memory, 2 PFLOP FP4 | params (billio | high | confirmed | [ASUS Ascent GX10 availability press release + ](https://www.asus.com/us/business/resources/news/asus-ascent-gx10-personal-ai-supercomputer/) |
| Four-unit cluster — max pooled model size | up to 4 units => up to 700B params | params (billio | high | confirmed | [NVIDIA DGX Spark official product page](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| DGX Spark inter-node networking | ConnectX-7 NIC @ 200 Gbps (2x QSFP112/OSFP); + 10 GbE RJ-45 | Gbps | high | confirmed | [NVIDIA product page; ServeTheHome ASUS review](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| DGX Spark availability / release date | 2025-10-15 (Founders Edition + ASUS Ascent GX10 same day); announced C | date | high | confirmed | [ASUS availability press release; NVIDIA / Intu](https://www.asus.com/us/business/resources/news/asus-ascent-gx10-personal-ai-supercomputer/) |
| DGX Spark storage (Founders Edition) | 4 TB NVMe M.2 self-encrypting (FE); OEM options 1/2/4 TB | TB | high | confirmed | [NVIDIA product page; ASUS/Dell listings](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| GB10 Grace CPU configuration (all twins) | 20-core Arm: 10x Cortex-X925 + 10x Cortex-A725 | cores | high | confirmed | [NVIDIA DGX Spark product page](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) |
| ASUS Ascent GX10 price (OEM twin) | 2999 (1TB launch, per NVIDIA) up to ~4499 (4TB) / regional higher | USD | medium | confirmed | [VideoCardz (NVIDIA-quoted $2,999 launch); Serv](https://videocardz.com/newz/asus-announces-ascent-gx10-mini-ai-supercomputer-with-nvidia-gb10-grace-blackwell-superchip-costs-2999) |
| Dell Pro Max with GB10 price (OEM twin, 4TB) | ~6332 (configured, Dell.com) | USD | medium | corrected | [HotHardware Dell Pro Max GB10 review](https://hothardware.com/reviews/dell-pro-max-with-gb10-review) |
| MSI EdgeXpert (OEM twin) specs | GB10, 128GB LPDDR5, 4TB Gen5 NVMe, Wi-Fi 7, DGX OS, ships QSFP cable | spec | low | confirmed | [Newegg / retail listing (MSI EdgeXpert 02SKUS)](https://www.newegg.com/p/pl?d=gb10) |
| HP ZGX Nano G1n (HP's actual GB10 box) | GB10 Superchip, 128GB, 4TB SSD, DGX OS, 200GbE | spec | low | confirmed | [InsiderLLM GB10 comparison / HP listing](https://insiderllm.com/guides/gb10-boxes-compared/) |
| GB10 bandwidth vs RTX 5090 (throughput context) | GB10 273 GB/s vs RTX 5090 1,792 GB/s (~6.5x) | GB/s | medium | confirmed | [IntuitionLabs DGX Spark review](https://intuitionlabs.ai/articles/nvidia-dgx-spark-review) |

## AMD Strix Halo 128GB mini-PCs

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| Framework Desktop (Ryzen AI Max+ 395, 128GB) price | $1,999 at Feb-2025 launch; risen to $3,449 by mid-2026 due to DRAM pri | USD | high | corrected | [PCWorld / Tom's Hardware / Engadget (Jan 2026 ](https://www.pcworld.com/article/3031562/framework-raises-prices-yet-again-as-memory-costs-go-up.html) |
| GMKtec EVO-X2 (Ryzen AI Max+ 395, 128GB + 2TB SSD) price | $2,599.99 list; sold ~$1,799.99-$1,999 on promo; ~$2,199 street mid-20 | USD | high | corrected | [GMKtec official store + Micro Center + VideoCa](https://www.microcenter.com/product/695875/gmktec-evo-x2-ai-mini-pc) |
| HP Z2 Mini G1a Workstation (Ryzen AI Max+ PRO 395, 128GB) pr | HP list ~$4,781 (dual 1TB); B&H $3,342.65 (2TB); SMB deal ~$2,374 (1TB | USD | high | corrected | [B&H Photo Video (HP Z2 Mini G1a, model BN4F6UT](https://www.bhphotovideo.com/c/product/1892697-REG/hp_bn4f6ut_aba_z2_mini_g1a_workstation.html) |
| Beelink GTR9 Pro (Ryzen AI Max+ 395, 128GB + 2TB SSD) price | Launch $1,985 (US); ~12,999 CNY (~$1,808) China; street $1,999-$2,099 | USD | high | confirmed | [WccfTech / ServeTheHome / TechRadar](https://wccftech.com/beelink-gtr9-pro-mini-pc-launched-140w-amd-ryzen-ai-max-395-128-gb-dual-10gbe-1985-usd/) |
| Minisforum MS-S1 MAX (Ryzen AI Max+ 395, 128GB + 2TB SSD) pr | Launched $2,299 (list $2,879); later listings $2,959-$3,039; heavy pro | USD | medium | confirmed | [Liliputing / VideoCardz / TechRadar](https://liliputing.com/minisforum-launches-ms-s1-max-for-2299-pc-with-ryzen-ai-max-395-128gb-ram-and-80-gbps-usb4v2/) |
| Total unified/shared memory (all models, top config) | 128 GB LPDDR5X, soldered/non-upgradeable (all five models) | GB | high | confirmed | [AMD / ServeTheHome](https://www.amd.com/en/developer/resources/technical-articles/2025/amd-ryzen-ai-max-395--a-leap-forward-in-generative-ai-performanc.html) |
| Max GPU-addressable (VRAM) memory from 128GB pool | Up to 96 GB dedicated VRAM (32GB reserved for OS); up to ~110-112GB vi | GB | high | confirmed | [GMKtec / Framework / community](https://www.gmktec.com/products/amd-ryzen%e2%84%a2-ai-max-395-evo-x2-ai-mini-pc) |
| Memory bandwidth (Ryzen AI Max+ 395, 256-bit LPDDR5X-8000) | 256 GB/s theoretical (LPDDR5X-8000, 256-bit); ~215 GB/s measured real; | GB/s | high | confirmed | [AMD / VideoCardz / independent benchmarks](https://videocardz.com/newz/framework-desktop-with-ryzen-ai-max-pro-495-gets-6-6-higher-memory-bandwidth-and-192gb-ram) |
| Integrated GPU (all models) | AMD Radeon 8060S, 40 CU RDNA 3.5, up to 2.9 GHz | spec | high | confirmed | [AMD / ServeTheHome](https://www.servethehome.com/gmktec-evo-x2-review-an-amd-ryzen-ai-max-395-powerhouse/) |
| TDP / typical load (AI inference) power draw | Configurable TDP 55-120W (default cTDP up to 120W, peak 140W); wall dr | W | medium | corrected | [AMD Ryzen AI Max+ PRO 395 official product pag](https://www.amd.com/en/products/processors/laptop/ryzen-pro/ai-max-pro-300-series/amd-ryzen-ai-max-plus-pro-395.html) |
| Idle power draw | ~8-15W idle at the wall | W | medium | confirmed | [DataHardware / Beelink owner reports](https://datahardware.ai/blog/gmktec-evo-x2-review-2026) |
| CPU (all models) | AMD Ryzen AI Max+ 395, 16C/32T Zen 5, 3.0 GHz base / 5.1 GHz boost, 80 | spec | high | confirmed | [AMD / WccfTech](https://wccftech.com/beelink-gtr9-pro-mini-pc-launched-140w-amd-ryzen-ai-max-395-128-gb-dual-10gbe-1985-usd/) |
| Availability / launch dates by model | Framework: preorder Feb 2025, shipping from Q2/Q3 2025 (batch backlog) | date | high | confirmed | [Manufacturer announcements / press](https://frame.work/blog/introducing-the-framework-desktop) |
| Reference LLM throughput (Ryzen AI Max+ 395, 128GB) | 7B ~50-80 tok/s; dense 70B ~5-10 tok/s; GPT-OSS 120B (MoE) ~31 tok/s;  | tokens/sec | medium | corrected | [Local LLM benchmarks on Ryzen AI Max+ 395 (GPT](https://zenn.dev/shuzan/articles/72852bb9621b40?locale=en) |

## Apple Mac Studio tiers

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| Mac Studio M4 Max (36GB) — Apple price (base config: 14-core | $1,999 launch (Mar 2025); raised to $2,499 in June 2026 amid DRAM shor | USD | high | confirmed | [Macworld / Apple (via itechguides)](https://www.macworld.com/article/2204696/m3-mac-studio-design-processor-specs-price.html) |
| Mac Studio M4 Max (36GB) — unified memory | 36 | GB | high | confirmed | [Apple Support — Mac Studio power consumption d](https://support.apple.com/en-us/102027) |
| Mac Studio M4 Max (36GB / 32-core GPU) — unified memory band | 410 | GB/s | medium | confirmed | [EveryMac — Mac Studio M3 Ultra vs M4 Max 2025 ](https://everymac.com/systems/apple/mac-studio/mac-studio-faq/differences-between-mac-studio-m3-ultra-m4-max-2025.html) |
| Mac Studio M4 Max (36GB) — GPU core count | 32 | cores | high | confirmed | [Apple Support / Macworld (base config 14-core ](https://support.apple.com/en-us/102027) |
| Mac Studio M4 Max — idle power draw (from wall) | 6 | W | high | confirmed | [Apple Support 102027 — Mac Studio power consum](https://support.apple.com/en-us/102027) |
| Mac Studio M4 Max — maximum power draw (from wall) | 145 (Apple test app); up to ~330-370 in 3rd-party torture tests | W | high | confirmed | [Apple Support 102027 — Mac Studio power consum](https://support.apple.com/en-us/102027) |
| Mac Studio M4 Max (128GB) — Apple price (16-core CPU / 40-co | ~$3,699 (16-core CPU, 40-core GPU, 128GB, 1TB SSD, launch config) | USD | medium | confirmed | [AppleInsider / launch reviews (via web search ](https://prices.appleinsider.com/mac-studio-2025) |
| Mac Studio M4 Max (128GB) — unified memory | 128 | GB | high | confirmed | [AppleInsider — Mac Studio M4 Max/M3 Ultra spec](https://appleinsider.com/inside/mac-studio) |
| Mac Studio M4 Max (128GB / 40-core GPU) — unified memory ban | 546 | GB/s | high | confirmed | [AppleInsider / Apple tech specs (16-core CPU, ](https://appleinsider.com/inside/mac-studio) |
| Mac Studio M4 Max (128GB) — GPU core count | 40 | cores | high | confirmed | [EveryMac — Mac Studio 2025 differences (128GB ](https://everymac.com/systems/apple/mac-studio/mac-studio-faq/differences-between-mac-studio-m3-ultra-m4-max-2025.html) |
| Mac Studio M3 Ultra (96GB) — Apple price (base: 28-core CPU  | $3,999 launch (Mar 2025); raised to $5,299 in 2026 (DRAM shortage) | USD | high | confirmed | [MacRumors / Macworld — M3 Ultra base pricing](https://www.macrumors.com/2025/03/05/maxed-out-m3-ultra-mac-studio-14099/) |
| Mac Studio M3 Ultra (96GB) — unified memory | 96 | GB | high | confirmed | [Apple / Macworld — M3 Ultra base config](https://www.macworld.com/article/2204696/m3-mac-studio-design-processor-specs-price.html) |
| Mac Studio M3 Ultra — unified memory bandwidth (all configs) | 819 | GB/s | high | confirmed | [EveryMac / AppleInsider — M3 Ultra spec](https://everymac.com/systems/apple/mac-studio/mac-studio-faq/differences-between-mac-studio-m3-ultra-m4-max-2025.html) |
| Mac Studio M3 Ultra (96GB) — GPU core count | 60 (base); 80 optionally (base chip is 28c CPU / 60c GPU) | cores | high | confirmed | [EveryMac — M3 Ultra config options](https://everymac.com/systems/apple/mac-studio/mac-studio-faq/differences-between-mac-studio-m3-ultra-m4-max-2025.html) |
| Mac Studio M3 Ultra — idle power draw (from wall) | 9 | W | high | confirmed | [Apple Support 102027 — Mac Studio power consum](https://support.apple.com/en-us/102027) |
| Mac Studio M3 Ultra — maximum power draw (from wall) | 270 | W | high | confirmed | [Apple Support 102027 — Mac Studio power consum](https://support.apple.com/en-us/102027) |
| Mac Studio M3 Ultra (256GB) — Apple price (with 32-core CPU  | ~$7,499 at launch (base 80-core M3 Ultra $5,499 + $1,500 for 256GB + 1 | USD | low | corrected | [Low End Mac — Mac Studio (Early 2025) memory u](https://lowendmac.com/2025/mac-studio-early-2025/) |
| Mac Studio M3 Ultra (256GB) — unified memory | 256 | GB | high | confirmed | [EveryMac / AppleInsider — M3 Ultra memory opti](https://appleinsider.com/inside/mac-studio) |
| Mac Studio M3 Ultra (256GB) — GPU core count | 80 | cores | high | confirmed | [EveryMac — 256/512GB require 80-core GPU confi](https://everymac.com/systems/apple/mac-studio/mac-studio-faq/differences-between-mac-studio-m3-ultra-m4-max-2025.html) |
| Mac Studio M3 Ultra (512GB) — Apple price (32-core CPU / 80- | $9,499 launch starting price (512GB, 1TB SSD); up to $14,099 maxed (16 | USD | high | confirmed | [MacRumors — Maxed-out M3 Ultra Mac Studio $14,](https://www.macrumors.com/2025/03/05/maxed-out-m3-ultra-mac-studio-14099/) |
| Mac Studio M3 Ultra (512GB) — unified memory | 512 | GB | high | confirmed | [MacRumors / Apple — 512GB M3 Ultra](https://www.macrumors.com/2025/03/05/maxed-out-m3-ultra-mac-studio-14099/) |
| Mac Studio M3 Ultra (512GB) — GPU core count | 80 | cores | high | confirmed | [EveryMac / Apple Support power doc (512GB conf](https://support.apple.com/en-us/102027) |

## Apple Mac mini tiers

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| Mac mini M4, 16GB unified memory — Apple price (base, 256GB  | 599 (16GB/256GB); 799 (16GB/512GB) | USD | high | confirmed | [Apple Newsroom (Oct 2024 launch) / EveryMac](https://www.apple.com/newsroom/2024/10/apples-new-mac-mini-is-more-mighty-more-mini-and-built-for-apple-intelligence/) |
| Mac mini M4, 16GB tier — unified memory | 16 | GB | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4, 24GB unified memory — Apple price (512GB SSD) | 999 (24GB/512GB) | USD | high | confirmed | [EveryMac — Mac mini M4 10C/10C 2024 specs](https://everymac.com/systems/apple/mac_mini/specs/mac-mini-m4-10-core-cpu-10-core-gpu-2024-specs.html) |
| Mac mini M4, 24GB tier — unified memory | 24 | GB | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4, 32GB unified memory — Apple price (512GB SSD) | 1199 (32GB/512GB) | USD | medium | confirmed | [Apple Support Tech Specs + Wikipedia (Mac Mini](https://en.wikipedia.org/wiki/Mac_Mini) |
| Mac mini M4, 32GB tier — unified memory | 32 | GB | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4 — memory bandwidth (all M4 tiers) | 120 | GB/s | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4 — GPU cores (all M4 tiers) | 10 | cores | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4 — idle power (Apple official) | 4 | W | high | confirmed | [Apple Support — Mac mini power consumption & t](https://support.apple.com/en-us/103253) |
| Mac mini M4 — maximum power (Apple official) | 65 | W | high | confirmed | [Apple Support — Mac mini power consumption & t](https://support.apple.com/en-us/103253) |
| Mac mini M4 Pro, 48GB unified memory — Apple price (512GB SS | 1799 (48GB/512GB) | USD | high | confirmed | [Tom's Hardware (Apple pricing breakdown) / lau](https://www.tomshardware.com/desktops/mini-pcs/apple-price-hikes-continue-as-mac-mini-with-16gb-ram-and-256gb-is-now-usd899-1tb-storage-option-adds-usd500-to-entry-level-headless-system) |
| Mac mini M4 Pro, 48GB tier — unified memory | 48 | GB | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4 Pro, 64GB unified memory — Apple price (512GB SS | 1999 (64GB/512GB) | USD | medium | confirmed | [Tom's Hardware / EveryMac M4 Pro launch-config](https://everymac.com/systems/apple/mac_mini/specs/mac-mini-m4-pro-12-core-cpu-16-core-gpu-2024-specs.html) |
| Mac mini M4 Pro, 64GB tier — unified memory | 64 | GB | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4 Pro — memory bandwidth (all M4 Pro tiers) | 273 | GB/s | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs](https://support.apple.com/en-us/121555) |
| Mac mini M4 Pro — GPU cores (base 16-core; up to 20-core) | 16 (base 12-core CPU); 20 (BTO 14-core CPU / 20-core GPU, +$200) | cores | high | confirmed | [Apple Support — Mac mini (2024) Tech Specs / E](https://support.apple.com/en-us/121555) |
| Mac mini M4 Pro — idle power (Apple official) | 5 | W | high | confirmed | [Apple Support — Mac mini power consumption & t](https://support.apple.com/en-us/103253) |
| Mac mini M4 Pro — maximum power (Apple official) | 140 | W | high | confirmed | [Apple Support — Mac mini power consumption & t](https://support.apple.com/en-us/103253) |

## Discrete-GPU desktop (non-UMA contrast)

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| RTX 4090 (24GB) current street price | 1800–3500 (typ 2500) | USD | medium | confirmed | [BestValueGPU / itechguides / levelupblogs (agg](https://bestvaluegpu.com/history/new-and-used-rtx-4090-price-history-and-specs/) |
| RTX 4090 VRAM | 24 GB GDDR6X | GB | high | confirmed | [NVIDIA official product/spec page](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/) |
| RTX 4090 memory bandwidth | 1008 | GB/s | high | confirmed | [TechPowerUp GPU database / NVIDIA specs (384-b](https://www.techpowerup.com/gpu-specs/geforce-rtx-4090.c3889) |
| RTX 4090 board TDP (Total Graphics Power) | 450 | W | high | confirmed | [NVIDIA official product/spec page](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/) |
| RTX 4090 realistic whole-system load power | 650–900 (typ 775) | W | medium | confirmed | [Overclock.net measured (i9-13900K + RTX 4090 f](https://www.overclock.net/threads/tested-total-system-wattage-i9-13900k-rtx-4090-lots-of-fans-shows-if-you-can-run-this-with-750-watt-psu.1807934/) |
| RTX 5090 (32GB) current street price | 3350–5800 (typ 5000) | USD | medium | corrected | [BestValueGPU / videocardprices RTX 5090 tracke](https://videocardprices.com/card/nvidia-rtx-5090/) |
| RTX 5090 VRAM | 32 GB GDDR7 | GB | high | confirmed | [NVIDIA official product/spec page](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) |
| RTX 5090 memory bandwidth | 1792 | GB/s | high | confirmed | [TechPowerUp Founders Edition review / NVIDIA s](https://www.techpowerup.com/review/nvidia-geforce-rtx-5090-founders-edition/) |
| RTX 5090 board TDP (Total Graphics Power) | 575 | W | high | confirmed | [NVIDIA official product/spec page](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) |
| RTX 5090 realistic whole-system load power | 775–1007 (typ 850) | W | medium | confirmed | [Overclocking.com / TechPowerUp FE review (meas](https://en.overclocking.com/review-nvidia-rtx-5090-founders-edition/12/) |
| Rest-of-system (host PC minus GPU) cost | 1200–3500 (typ 2170) | USD | medium | confirmed | [Tom's Hardware RTX 5090 build / component brea](https://www.tomshardware.com/desktops/gaming-pcs/get-an-entire-rtx-5090-gaming-pc-for-around-the-price-of-just-the-gpu-a-high-end-battle-station-for-under-usd4-000) |

## LLM throughput — Apple Silicon

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| M3 Ultra (60-core, 96GB) — Llama-class 70B, 4-bit MLX, singl | 16.45 tok/s (DeepSeek-R1 Llama 70B distill, MLX Q4, LM Studio, short ' | tokens/sec | medium | confirmed | [MacRumors Forums — Mac Studio M3 Ultra 96GB 28](https://forums.macrumors.com/threads/mac-studio-m3-ultra-96gb-28-60-llm-performance.2456559/) |
| M3 Ultra (60-core, 96GB) — Qwen3 32B dense, 4-bit MLX, singl | Qwen3 32B MLX Q4 = 33.88 tok/s; QwQ 32B Q4 = 33.04; DeepSeek-R1 Qwen 3 | tokens/sec | medium | confirmed | [MacRumors Forums — Mac Studio M3 Ultra 96GB 28](https://forums.macrumors.com/threads/mac-studio-m3-ultra-96gb-28-60-llm-performance.2456559/) |
| M3 Ultra (60-core, 96GB) — Qwen3 8B, 4-bit MLX, single-strea | Qwen3 8B MLX Q4 = 114.93 tok/s (TTFT 0.08s); DeepSeek-R1 Qwen 7B Q4 =  | tokens/sec | medium | confirmed | [MacRumors Forums — Mac Studio M3 Ultra 96GB 28](https://forums.macrumors.com/threads/mac-studio-m3-ultra-96gb-28-60-llm-performance.2456559/) |
| M3 Ultra (80-core) — Llama-2 7B Q4_0, llama.cpp Metal, gener | 60-core: 88.40 tg / 1073 pp; 80-core: 92.14 tg / 1471 pp (tg128 / pp51 | tokens/sec | high | confirmed | [llama.cpp GitHub Discussion #4167 — Performanc](https://github.com/ggml-org/llama.cpp/discussions/4167) |
| M4 Max (40-core, 128GB) — Llama 3.x 70B, 4-bit, single-strea | MLX 4-bit: ~18-20 tok/s (some tests 20-28 depending on context); LM St | tokens/sec | medium | confirmed | [siliconscore M4 Max 128GB page (measured, LM S](https://siliconscore.com/chips/m4-max-128-gb/) |
| M4 Max (40-core, 128GB) — Qwen 32B dense, 4-bit, single-stre | Qwen3 32B Q4_K_M, LM Studio = 11.7 tok/s (measured, 10k ctx); MLX 4-bi | tokens/sec | medium | confirmed | [siliconscore M4 Max 128GB page (Qwen3 32B Q4_K](https://siliconscore.com/chips/m4-max-128-gb/) |
| M4 Max (128GB) — Qwen3.5 35B-A3B MoE (3B active), 4-bit, sin | MLX Python 4-bit = 126-132 tok/s; MLX HTTP server = 84-108; llama.cpp  | tokens/sec | high | confirmed | [Ante Kapetanovic — Ollama vs llama.cpp vs MLX ](https://antekapetanovic.com/blog/qwen3.5-apple-silicon-benchmark/) |
| M4 Pro Mac mini (48GB) — Llama 3.1 8B Q4_K_M, Ollama, genera | Llama 3.1 8B Q4_K_M = 42 tok/s; Llama 3.1 ~34B Q4_K_M = 11 tok/s; Llam | tokens/sec | medium | confirmed | [heyuan110 — Best Mac for Local LLM: M4 Pro vs ](https://www.heyuan110.com/posts/ai/2026-04-14-mac-apple-silicon-ai-workstation/) |
| M4 Pro (20-core, 273 GB/s) — Llama-2 7B Q4_0, llama.cpp Meta | 16-core: 49.64 tg / 364 pp; 20-core: 50.74 tg / 440 pp (Q4_0, tg128/pp | tokens/sec | high | confirmed | [llama.cpp GitHub Discussion #4167 — Performanc](https://github.com/ggml-org/llama.cpp/discussions/4167) |
| M4 (base, 10-core, 120 GB/s) — Llama-2 7B Q4_0, llama.cpp Me | Q4_0: 24.11 tg / 221 pp (tg128 / pp512) | tokens/sec | high | confirmed | [llama.cpp GitHub Discussion #4167 — Performanc](https://github.com/ggml-org/llama.cpp/discussions/4167) |
| M4 Max (40-core, 546 GB/s) — Llama-2 7B Q4_0, llama.cpp Meta | 32-core/410GB/s: 69.95 tg / 714 pp; 40-core/546GB/s: 83.06 tg / 886 pp | tokens/sec | high | confirmed | [llama.cpp GitHub Discussion #4167 — Performanc](https://github.com/ggml-org/llama.cpp/discussions/4167) |
| M3 Max Studio (40-core, 128GB) — Llama 3.3 70B Q4_K_M, Ollam | M3 Max Studio 128GB (40-core) = 9.8 tok/s; M3 Max MBP 64GB (30-core) = | tokens/sec | medium | confirmed | [heyuan110 — Best Mac for Local LLM: M4 Pro vs ](https://www.heyuan110.com/posts/ai/2026-04-14-mac-apple-silicon-ai-workstation/) |
| M3 Max Studio (128GB) — Llama ~34B Q4_K_M, Ollama, generatio | M3 Max Studio 128GB = 19 tok/s; M3 Max MBP 64GB = 15 tok/s (~34B Q4_K_ | tokens/sec | low | confirmed | [heyuan110 — Best Mac for Local LLM benchmark](https://www.heyuan110.com/posts/ai/2026-04-14-mac-apple-silicon-ai-workstation/) |
| Framework speedup on Apple Silicon: MLX vs llama.cpp vs Olla | MLX ~1.5x faster than llama.cpp and ~2.5-2.7x faster than Ollama for t | multiplier (x, | high | confirmed | [Ante Kapetanovic — Qwen3.5 35B Apple Silicon b](https://antekapetanovic.com/blog/qwen3.5-apple-silicon-benchmark/) |
| Unified-memory footprint at 4-bit (Q4) for each model class | 8B Q4 ~4.5-5 GB (needs 16GB Mac); dense 32B Q4 ~18-20 GB (needs 32GB,  | GB | high | confirmed | [heyuan110 benchmark + siliconscore + Ante Kape](https://www.heyuan110.com/posts/ai/2026-04-14-mac-apple-silicon-ai-workstation/) |
| Long-context generation slowdown on Apple Silicon (single st | Up to ~10x slower generation with a large (40-50k token) context loade | multiplier (x  | low | corrected | [Starmorph — Apple Silicon LLM Inference Optimi](https://blog.starmorph.com/blog/apple-silicon-llm-inference-optimization-guide) |

## LLM throughput — DGX Spark & Strix Halo

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| DGX Spark (GB10) — Llama 3.1 8B decode, single-stream, SGLan | 20.5 t/s decode @ batch 1; prefill 7,991 t/s | tokens/sec | high | confirmed | [LMSYS Org — NVIDIA DGX Spark In-Depth Review](https://www.lmsys.org/blog/2025-10-13-nvidia-dgx-spark/) |
| DGX Spark (GB10) — Llama 3.1 8B decode, BATCHED aggregate, S | 368 t/s aggregate decode @ batch 32; prefill 7,949 t/s | tokens/sec | high | confirmed | [LMSYS Org — NVIDIA DGX Spark In-Depth Review](https://www.lmsys.org/blog/2025-10-13-nvidia-dgx-spark/) |
| DGX Spark (GB10) — Llama 3.1 8B decode, single-stream, Ollam | ~38-44 t/s decode single-stream (Q4); prefill ~7,600 t/s | tokens/sec | high | corrected | [Kubesimplify — Anatomy of an LLM Inference Req](https://blog.kubesimplify.com/day-2-anatomy-of-an-llm-inference-request-from-prompt-to-answer-step-by-step) |
| DGX Spark (GB10) — Llama 3.1 8B FP4 high-throughput batch ag | ~924 t/s aggregate (Llama 3.1 8B FP4, batched) | tokens/sec | low | corrected | [StorageReview / AIMultiple DGX Spark benchmark](https://aimultiple.com/dgx-spark-alternatives) |
| DGX Spark (GB10) — Llama 3.1 8B prefill (prompt processing) | ~7,600-7,991 t/s (FP8/Q4 short ctx); ~1,860-3,170 t/s at 16k ctx (llam | tokens/sec | high | corrected | [LMSYS Org + DandinPower llama.cpp_bench (DGX S](https://github.com/DandinPower/llama.cpp_bench/blob/main/dgx_spark/report.md) |
| DGX Spark (GB10) — ~30B MoE (Qwen3 30B-A3B) decode single-st | 89.3 t/s @ 512 ctx, 83.8 t/s @ 2048 ctx (decode); prefill 2,541 t/s | tokens/sec | high | confirmed | [DandinPower llama.cpp_bench — DGX Spark report](https://github.com/DandinPower/llama.cpp_bench/blob/main/dgx_spark/report.md) |
| DGX Spark (GB10) — ~27-30B model decode BATCHED aggregate, v | vLLM NVFP4+MTP: 105.8 t/s aggregate @ c=10 (Qwen3-27B); Qwen3-30B-A3B  | tokens/sec | medium | confirmed | [Kubesimplify — Qwen3.8-27B on DGX Spark + NVID](https://blog.kubesimplify.com/qwen3-8-27b-on-dgx-spark) |
| DGX Spark (GB10) — 32B DENSE (Qwen3 32B) decode single-strea | 10.7 t/s @ 512 ctx (Qwen3 32B); ~11.6 t/s (Qwen3 27B dense); prefill 7 | tokens/sec | high | confirmed | [DandinPower llama.cpp_bench + Kubesimplify (Qw](https://github.com/DandinPower/llama.cpp_bench/blob/main/dgx_spark/report.md) |
| DGX Spark (GB10) — Llama 3.1 70B decode, single-stream, SGLa | 2.7 t/s decode @ batch 1 (SGLang FP8); prefill 803 t/s. Theoretical NV | tokens/sec | high | confirmed | [LMSYS Org — NVIDIA DGX Spark In-Depth Review](https://www.lmsys.org/blog/2025-10-13-nvidia-dgx-spark/) |
| Strix Halo (Ryzen AI Max+ 395) — Llama-3 8B decode single-st | 42.0 t/s (Vulkan fa=1, tg128); 37.2 t/s (HIP/ROCm); ~48 t/s (owner-rep | tokens/sec | high | confirmed | [Level1Techs Forums — Strix Halo LLM Benchmark ](https://forum.level1techs.com/t/strix-halo-ryzen-ai-max-395-llm-benchmark-results/233796) |
| Strix Halo (Ryzen AI Max+ 395) — Llama-3 8B prefill (pp512), | 878.2 t/s (HIP hipBLASLt); 614.2 t/s (Vulkan fa=1) | tokens/sec | high | confirmed | [Level1Techs Forums — Strix Halo LLM Benchmark ](https://forum.level1techs.com/t/strix-halo-ryzen-ai-max-395-llm-benchmark-results/233796) |
| Strix Halo (Ryzen AI Max+ 395) — ~30B MoE (Qwen3 30B-A3B) de | 66.3 t/s (Vulkan fa=1); 72.0 t/s (Vulkan batch=256); prefill 604.8 t/s | tokens/sec | high | confirmed | [Level1Techs Forums — Strix Halo LLM Benchmark ](https://forum.level1techs.com/t/strix-halo-ryzen-ai-max-395-llm-benchmark-results/233796) |
| Strix Halo (Ryzen AI Max+ 395) — 24B DENSE (Mistral Small 3. | 13.6 t/s decode (tg128); prefill 316.9 t/s (HIP) | tokens/sec | medium | corrected | [Level1Techs Forums — Strix Halo LLM Benchmark ](https://forum.level1techs.com/t/strix-halo-ryzen-ai-max-395-llm-benchmark-results/233796) |
| Strix Halo (Ryzen AI Max+ 395) — 70B DENSE (Llama-3 70B) dec | 5.0 t/s (Vulkan fa=1); 4.5 t/s (HIP rocWMMA); prefill 94.7 t/s (HIP) / | tokens/sec | high | confirmed | [Level1Techs Forums — Strix Halo LLM Benchmark ](https://forum.level1techs.com/t/strix-halo-ryzen-ai-max-395-llm-benchmark-results/233796) |
| Strix Halo — backend selection (Vulkan vs ROCm/HIP) impact o | HIP/ROCm wins prefill on dense models; Vulkan often wins decode. Vulka | qualitative | medium | confirmed | [Level1Techs / kyuz0 amd-strix-halo-toolboxes +](https://kyuz0.github.io/amd-strix-halo-toolboxes/) |
| DGX Spark (GB10) — unified memory bandwidth (decode bottlene | 273 GB/s, 128 GB LPDDR5x unified | GB/s | high | confirmed | [LMSYS Org / NVIDIA DGX Spark specs](https://www.lmsys.org/blog/2025-10-13-nvidia-dgx-spark/) |
| Strix Halo (Ryzen AI Max+ 395) — unified memory bandwidth (d | ~256 GB/s (LPDDR5x-8000, 256-bit), 128 GB unified | GB/s | medium | confirmed | [Tom's Hardware / AMD Ryzen AI Max+ 395 specs](https://www.tomshardware.com/desktops/mini-pcs/amd-challenges-nvidias-dgx-spark-with-usd3-999-ryzen-ai-halo-with-windows-11-support-strix-halo-desktop-undercuts-nvidia-by-usd700-packs-128gb-of-unified-memory) |
| NVIDIA DGX Spark (GB10, 128GB) — price | Launch $3,999; raised to $4,699 (2026, memory/NAND supply constraints) | USD | high | confirmed | [Tom's Hardware / itechguides](https://www.tomshardware.com/desktops/mini-pcs/amd-challenges-nvidias-dgx-spark-with-usd3-999-ryzen-ai-halo-with-windows-11-support-strix-halo-desktop-undercuts-nvidia-by-usd700-packs-128gb-of-unified-memory) |
| AMD Ryzen AI Max+ 395 (Strix Halo, 128GB) — system price | Framework Desktop 128GB $1,999; GMKtec EVO-X2 128GB from ~$1,499; AMD  | USD | high | corrected | [ComputingForGeeks / Framework / GMKtec 128GB p](https://computingforgeeks.com/ryzen-ai-max-395-mini-pc-comparison/) |
| DGX Spark — NVFP4 vs BF16 throughput speedup (trtllm-bench) | up to 3.93x output-token throughput vs BF16 (batched, up to 256 reques | x (multiplier) | low | confirmed | [arXiv — ReQAT / NVFP4 trtllm-bench on DGX Spar](https://arxiv.org/pdf/2606.15682) |
| DGX Spark (GB10) — GPT-OSS-120B MoE decode (large-MoE refere | 60.6 t/s decode @ 0 ctx, 40.6 t/s @ 32k ctx (llama.cpp MXFP4); vLLM 60 | tokens/sec | medium | corrected | [llama.cpp GitHub Discussion #16578 (eugr) + NV](https://github.com/ggml-org/llama.cpp/discussions/16578) |

## LLM throughput — RTX 4090/5090

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| RTX 4090 — Llama 3.1 8B FP16, single-stream (batch=1) decode | 95 tok/s (vLLM 0.6.4, FP16, batch=1) | tokens/sec | high | confirmed | [GIGAGPU — RTX 4090 24GB Llama 3 8B benchmark](https://gigagpu.com/rtx-4090-24gb-llama-3-8b-benchmark/) |
| RTX 4090 — Llama 3.1 8B FP8, single-stream (batch=1) decode | ~190 tok/s (FP8 ≈ 2× FP16, native Ada FP8 tensor cores) | tokens/sec | medium | confirmed | [GIGAGPU — RTX 4090 24GB Llama 3 8B benchmark](https://gigagpu.com/rtx-4090-24gb-llama-3-8b-benchmark/) |
| RTX 4090 — 8B model (Llama-based), batched aggregate through | ~2,770 tok/s aggregate output+input (DeepSeek-R1-Distill-Llama-8B, FP1 | tokens/sec | high | confirmed | [DatabaseMart — RTX 4090 vLLM GPU benchmark](https://www.databasemart.com/blog/vllm-gpu-benchmark-rtx4090) |
| RTX 4090 — 30B model (Qwen3-Coder-30B, AWQ INT4), batched ag | 2,259 tok/s aggregate (1 GPU); 8,903 tok/s on 4× GPU | tokens/sec | high | confirmed | [CloudRift — GPU Benchmarks for LLM Inference](https://www.cloudrift.ai/gpu-benchmarks) |
| RTX 5090 — Llama 3.1 8B FP16, single-stream (batch=1) decode | ~170 tok/s (derived from 1.78× the 4090's 1008→1792 GB/s bandwidth rat | tokens/sec | medium | unverifiable | [Spheron / Hardware-Corner / bandwidth derivati](https://www.spheron.network/blog/rent-nvidia-rtx-5090/) |
| RTX 5090 — Llama 3.1 8B FP16, batched aggregate throughput a | ~3,500 tok/s (Spheron, batch 32, FP16) up to 4,570 tok/s (CloudRift, 3 | tokens/sec | high | confirmed | [Spheron RTX 5090 LLM benchmarks + CloudRift GP](https://www.cloudrift.ai/gpu-benchmarks) |
| RTX 5090 — 30B model (Qwen3-Coder-30B, AWQ INT4), batched ag | 4,570 tok/s aggregate (1 GPU); 12,744 tok/s on 4× GPU | tokens/sec | high | confirmed | [CloudRift — GPU Benchmarks for LLM Inference](https://www.cloudrift.ai/gpu-benchmarks) |
| Batching multiplier — aggregate ÷ single-stream tok/s (the d | ~27× for 8B on 4090 (2,770 aggregate ÷ ~95 single-stream FP16) | x (dimensionle | medium | corrected | [Derived from DatabaseMart aggregate + GIGAGPU ](https://www.databasemart.com/blog/vllm-gpu-benchmark-rtx4090) |
| RTX 4090 — memory bandwidth (sets single-stream decode ceili | 1,008 GB/s (GDDR6X, 24GB) | GB/s | high | confirmed | [InventiveHQ / GIGAGPU (bandwidth grounding)](https://inventivehq.com/blog/local-llm-performance-what-to-expect) |
| RTX 5090 — memory bandwidth (sets single-stream decode ceili | 1,792 GB/s (GDDR7, 32GB) | GB/s | high | confirmed | [InventiveHQ / Hardware-Corner (bandwidth groun](https://inventivehq.com/blog/local-llm-performance-what-to-expect) |

## Market token prices (USD/1M)

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| Llama 3.1 8B Instruct — INPUT price | low DeepInfra/Novita $0.02; Groq $0.05; Fireworks $0.20 (4-16B tier fl | USD per 1M inp | high | confirmed | [DeepInfra pricing / Groq pricing / Fireworks s](https://deepinfra.com/pricing) |
| Llama 3.1 8B Instruct — OUTPUT price | low DeepInfra $0.04; Novita $0.05; Groq $0.08; Fireworks $0.20 flat | USD per 1M out | high | confirmed | [DeepInfra pricing / Novita pricing / Groq pric](https://deepinfra.com/pricing) |
| Llama 3.3 70B Instruct — INPUT price | DeepInfra $0.10 in; Novita $0.135; Hyperbolic $0.40 flat; Groq $0.59;  | USD per 1M inp | high | corrected | [DeepInfra / Novita / Groq / Fireworks / Togeth](https://openrouter.ai/meta-llama/llama-3.3-70b-instruct) |
| Llama 3.3 70B Instruct — OUTPUT price | DeepInfra $0.32; Novita $0.40; Hyperbolic $0.40 flat; Groq $0.79; Fire | USD per 1M out | high | corrected | [DeepInfra / Groq / Together pricing](https://groq.com/pricing/) |
| Qwen 32B (Qwen3-32B / Qwen2.5-32B) — INPUT price | DeepInfra Qwen3-32B $0.08 in; Hyperbolic Qwen2.5-Coder-32B ~$0.20 flat | USD per 1M inp | medium | confirmed | [DeepInfra pricing / Hyperbolic rate card / Fir](https://deepinfra.com/pricing) |
| Qwen 32B — OUTPUT price | DeepInfra $0.28; Fireworks $0.90 flat | USD per 1M out | medium | confirmed | [DeepInfra pricing / Fireworks serverless prici](https://deepinfra.com/pricing) |
| Qwen2.5 72B Instruct — INPUT price | DeepInfra $0.36; Novita $0.38; Hyperbolic $0.40 flat; Together $1.20 f | USD per 1M inp | high | confirmed | [DeepInfra / Novita / Together pricing](https://deepinfra.com/pricing) |
| Qwen2.5 72B Instruct — OUTPUT price | DeepInfra $0.40; Novita $0.40; Hyperbolic $0.40 flat; Together $1.20 f | USD per 1M out | high | confirmed | [DeepInfra / Novita / Together pricing](https://novita.ai/pricing) |
| DeepSeek V3 — INPUT price | Hyperbolic $0.25 flat; DeepSeek 1st-party $0.27; DeepInfra $0.32; Toge | USD per 1M inp | high | corrected | [DeepInfra pricing / Hyperbolic rate card / Dee](https://openrouter.ai/deepseek/deepseek-chat) |
| DeepSeek V3 — OUTPUT price | Hyperbolic $0.25 flat; DeepInfra $0.89; DeepSeek 1st-party $1.10; Toge | USD per 1M out | high | corrected | [DeepInfra pricing / DeepSeek API pricing / Tog](https://deepinfra.com/pricing) |
| gpt-oss-120b (OpenAI open-weight MoE) — INPUT price | DeepInfra $0.04; Novita $0.05; Groq/Fireworks/Together $0.15 | USD per 1M inp | high | confirmed | [Fireworks serverless pricing / Groq pricing / ](https://fireworks.ai/pricing) |
| gpt-oss-120b — OUTPUT price | DeepInfra $0.17; Novita $0.25; Groq/Fireworks/Together $0.60 | USD per 1M out | high | confirmed | [Fireworks serverless pricing / Groq pricing / ](https://fireworks.ai/pricing) |
| Mixtral 8x7B Instruct — price (input=output, size-tier flat) | Fireworks & DeepInfra MoE-≤56B tier $0.50 flat; Together historically  | USD per 1M tok | medium | confirmed | [Fireworks serverless pricing (MoE tier) / Deep](https://fireworks.ai/pricing) |
| OpenRouter marketplace floor (routes to cheapest underlying  | Llama 3.3 70B as low as ~$0.10 in / $0.32 out; DeepSeek V3 ~$0.26 in / | USD per 1M tok | medium | confirmed | [OpenRouter model pages](https://openrouter.ai/models) |
| FRONTIER REFERENCE — GPT-4o mini INPUT price | $0.15 in ($0.075 cached) | USD per 1M inp | high | confirmed | [OpenAI API pricing](https://openai.com/api/pricing/) |
| FRONTIER REFERENCE — GPT-4o mini OUTPUT price | $0.60 out | USD per 1M out | high | confirmed | [OpenAI API pricing](https://openai.com/api/pricing/) |
| FRONTIER REFERENCE — Claude 3.5 Haiku INPUT price | $0.80 in | USD per 1M inp | high | confirmed | [Anthropic / Claude Platform pricing docs](https://platform.claude.com/docs/en/about-claude/pricing) |
| FRONTIER REFERENCE — Claude 3.5 Haiku OUTPUT price | $4.00 out | USD per 1M out | high | confirmed | [Anthropic / Claude Platform pricing docs](https://platform.claude.com/docs/en/about-claude/pricing) |
| FRONTIER REFERENCE — Claude Haiku 4.5 (current-gen) price | $1.00 in / $5.00 out | USD per 1M tok | high | confirmed | [Anthropic / Claude Platform pricing docs](https://platform.claude.com/docs/en/about-claude/pricing) |

## Australian energy

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| Solar feed-in tariff, typical national range (2025-26) | 3-10 c/kWh typical; historic premium schemes were 44-66 c/kWh | AUD cents/kWh | high | confirmed | [Solar Choice](https://www.solarchoice.net.au/learn/energy/feed-in-tariffs/) |
| Solar FiT, NSW (IPART benchmark, non-mandatory flat) | IPART 2025-26 flat benchmark 4.8-7.3 c/kWh; time-of-day evening-peak b | AUD cents/kWh | medium | confirmed | [Solar Choice / IPART](https://www.solarchoice.net.au/learn/energy/feed-in-tariffs/) |
| Solar FiT, Victoria (deregulated from 1 Jul 2025) | Avg minimum ~1.1 c/kWh flat; deregulated (ESC no longer sets a floor,  | AUD cents/kWh | medium | corrected | [Essential Services Commission (Victoria) - Sol](https://www.esc.vic.gov.au/media-centre/solar-minimum-feed-tariffs-2025-26) |
| Solar FiT, Regional QLD (Ergon, QCA mandated flat) | 8.66 c/kWh mandated 2025-26 (down from 12.377 c prior year); QCA draft | AUD cents/kWh | medium | confirmed | [Solar Choice / QCA](https://www.solarchoice.net.au/learn/energy/feed-in-tariffs/) |
| Solar FiT, South Australia (no mandated minimum) | Daytime 2-5 c/kWh typical; battery-linked evening-peak plans pay more | AUD cents/kWh | medium | confirmed | [Solar Choice](https://www.solarchoice.net.au/learn/energy/feed-in-tariffs/) |
| Solar FiT, WA (Synergy DEBS, time-varying) | DEBS: 2.25 c/kWh off-peak, up to 10 c/kWh peak (3pm-9pm) | AUD cents/kWh | medium | corrected | [Synergy - Distributed Energy Buyback Scheme (D](https://www.synergy.net.au/-/media/Files/PDF-Library/DEBS_Pricing_schedule.pdf) |
| Solar FiT, Tasmania (OTTER regulated minimum) | Regulated minimum 8.782 c/kWh for 2025-26; some retailers offer higher | AUD cents/kWh | medium | confirmed | [Solar Choice / OTTER](https://www.solarchoice.net.au/learn/energy/feed-in-tariffs/) |
| Solar FiT, ACT (no mandated minimum) | 7-12 c/kWh typical (competitive market, among the best in Australia) | AUD cents/kWh | low | confirmed | [Solar Choice](https://www.solarchoice.net.au/learn/energy/feed-in-tariffs/) |
| Residential retail electricity usage rate, national range (2 | ~19 c (SE QLD lowest) to ~43 c (top); Canstar Oct 2025: 24-43 c/kWh de | AUD cents/kWh | high | corrected | [Canstar - Average electricity price per kWh in](https://www.canstar.com.au/energy/electricity-costs-kwh/) |
| Residential usage rate by state (flat/competitive, 2025) | SE QLD ~19 c (lowest); VIC & TAS ~26-33 c; ACT ~27-32 c; NSW mid-range | AUD cents/kWh | medium | corrected | [Canstar - Average electricity price per kWh in](https://www.canstar.com.au/energy/electricity-costs-kwh/) |
| Time-of-use PEAK residential rate (typical) | TOU plans have 3 tiers (peak/shoulder/off-peak); peak rates commonly e | AUD cents/kWh | low | confirmed | [Solar Choice / AER](https://www.solarchoice.net.au/energy/electricity-cost-per-kwh-in-australia/) |
| Default Market Offer (DMO 7) price change, effective 1 Jul 2 | Residential increases 0.5% to 9.7% across the 3 DMO areas (NSW, SA, SE | percent | high | confirmed | [energy.gov.au (AER)](https://www.energy.gov.au/news/australian-energy-regulator-releases-new-default-electricity-prices) |
| Zero/negative wholesale price intervals, South Australia (Q4 | 48% of intervals were zero or negative — a record high | percent of dis | high | confirmed | [AEMO Quarterly Energy Dynamics Q4 2025](https://www.aemo.com.au/-/media/files/major-publications/qed/2025/qed-q4-2025.pdf) |
| Zero/negative wholesale price intervals, Victoria (Q4 2025) | 43% of intervals were zero or negative — a record high | percent of dis | high | confirmed | [AEMO Quarterly Energy Dynamics Q4 2025](https://www.aemo.com.au/-/media/files/major-publications/qed/2025/qed-q4-2025.pdf) |
| Economic offloading (curtailment) of wind & solar capacity ( | Wind 15%, solar 18% of capacity economically offloaded | percent of ava | high | confirmed | [AEMO Quarterly Energy Dynamics Q4 2025](https://www.aemo.com.au/-/media/files/major-publications/qed/2025/qed-q4-2025.pdf) |
| Total VRE curtailment, NEM full-year 2025 | 7.2 TWh in 2025, up from 4.3 TWh in 2024 | TWh | high | confirmed | [WattClarity (AEMO data analysis)](https://wattclarity.com.au/articles/2026/02/keeping-up-with-the-curtailment-2025-beneath-the-headline-numbers/) |
| Distributed (rooftop) PV peak share of NEM underlying demand | 61% of NEM underlying demand met by distributed PV in one half-hour in | percent | high | confirmed | [AEMO Quarterly Energy Dynamics Q4 2025](https://www.aemo.com.au/-/media/files/major-publications/qed/2025/qed-q4-2025.pdf) |
| Average NEM wholesale spot price (Q4 2025) | NEM avg $50/MWh (-44% YoY). By region: NSW $75, QLD $58, TAS $41, SA $ | AUD per MWh | high | confirmed | [AEMO Quarterly Energy Dynamics Q4 2025](https://www.aemo.com.au/-/media/files/major-publications/qed/2025/qed-q4-2025.pdf) |
| Rooftop solar generation per installed kW per day, national  | 3.5-5 kWh/kW/day averaged over a year, depending on location/orientati | kWh/kW/day | high | confirmed | [energy.gov.au (DCCEEW)](https://www.energy.gov.au/solar/solar-system-design/size-your-solar-system) |
| Rooftop solar generation per kW/day, Sydney | ~3.9-4.1 (6.6 kW system ~26 kWh sunny day; ~4.5 peak sun hours). CEC-b | kWh/kW/day | medium | confirmed | [SolarQuotes / energy.gov.au](https://support.solarquotes.com.au/hc/en-us/articles/115002395494-What-can-I-expect-my-solar-system-to-produce-on-average-per-day) |
| Rooftop solar generation per kW/day, Melbourne | ~3.6 (6.6 kW system ~24 kWh sunny day; ~4.0 peak sun hours) — lowest o | kWh/kW/day | medium | confirmed | [energy.gov.au / Energy Matters](https://www.energy.gov.au/solar/solar-system-design/size-your-solar-system) |
| Rooftop solar generation per kW/day, Brisbane | ~4.2-5.0 (6.6 kW system 28-33 kWh sunny day; ~5.0 peak sun hours) | kWh/kW/day | medium | confirmed | [energy.gov.au / Energy Matters](https://www.energy.gov.au/solar/solar-system-design/size-your-solar-system) |
| Rooftop solar generation per kW/day, Perth | ~5.0 (6.6 kW system ~33 kWh sunny day; ~5.5 peak sun hours) — top main | kWh/kW/day | medium | confirmed | [Energy Matters](https://www.energymatters.com.au/renewable-news/how-much-energy-can-a-solar-panel-generate-per-day/) |
| Rooftop solar generation per kW/day, Hobart | ~3.5 (6.6 kW system ~23 kWh sunny day) | kWh/kW/day | low | confirmed | [energy.gov.au (DCCEEW)](https://www.energy.gov.au/solar/solar-system-design/size-your-solar-system) |
| Home battery installed cost per usable kWh (before state reb | ~$540-$1,080/kWh after federal rebate (SolarQuotes, May 2026); pre-reb | AUD per usable | high | confirmed | [SolarQuotes](https://www.solarquotes.com.au/battery-storage/cost/) |
| Typical installed cost, ~10 kWh home battery | $8,000-$12,000 installed before rebates for a 10 kWh system; some quot | AUD | medium | corrected | [SolarQuotes - Battery storage cost](https://www.solarquotes.com.au/battery-storage/cost/) |
| Cheaper Home Batteries rebate at launch (mid-2025) | ~$372 per usable kWh maximum subsidy at launch (1 Jul 2025); ~30% of u | AUD per usable | high | confirmed | [energy.gov.au (DCCEEW) / Macquarie](https://www.energy.gov.au/rebates/cheaper-home-batteries-program) |
| Cheaper Home Batteries rebate, current (2026) | ~$311 per usable kWh until 30 Apr 2026; ~$370/kWh also cited early 202 | AUD per usable | high | confirmed | [energy.gov.au (DCCEEW) / Solar Choice](https://www.dcceew.gov.au/energy/programs/cheaper-home-batteries) |

## Networking & node utilization

| Field | Value | Unit | Conf | Verdict | Source |
|---|---|---|---|---|---|
| 100GbE QSFP28 passive DAC copper cable (1-3m), street price | ~$15-30 for 1m, ~$20-45 for 3m (passive copper twinax, 30AWG for <=3m) | USD | medium | corrected | [FS.com 100G QSFP28 passive DAC 1m (product 470](https://www.fs.com/products/47096.html) |
| NVIDIA/Mellanox ConnectX-6 Dx 100GbE dual-port NIC (MCX62310 | MCX623106AN-CDAT: dual-port QSFP56, 100GbE/port, PCIe 4.0 x16, no-cryp | USD | medium | confirmed | [Cloud Ninjas retail listing (NVIDIA SKU 900-9X](https://cloudninjas.com/products/nvidia-mellanox-connectx-6-dx-en-nic-100gbe-dual-port-qsfp56-pcie4-0-x-16) |
| NVIDIA/Mellanox ConnectX-5 100GbE dual-port NIC (MCX516A), u | MCX516A-CCAT (PCIe 3.0) seen at $49.99; CDAT (PCIe 4.0) variant higher | USD | medium | confirmed | [eBay used listings (MCX516A-CCAT / -CDAT)](https://www.ebay.com/itm/386688746061) |
| NVIDIA PAIR (Personal AI Router) - what it is | Free, open-source (Apache-2.0) SOFTWARE that pools idle compute of RTX | description | high | confirmed | [NVIDIA - Personal AI Router product page & Tec](https://www.nvidia.com/en-us/ai-on-rtx/personal-ai-router/) |
| NVIDIA PAIR price | Free (open-source, Apache-2.0); no hardware to buy | USD | high | confirmed | [NVIDIA PAIR FAQ](https://www.nvidia.com/en-us/ai-on-rtx/personal-ai-router/faq/) |
| NVIDIA PAIR availability | Public BETA, announced 3 Sep 2026 at IFA Berlin. Windows, macOS, Linux | date/status | high | confirmed | [NVIDIA Developer Technical Blog + product page](https://developer.nvidia.com/blog/nvidia-pair-virtual-inference-router-expands-available-compute-on-your-local-network/) |
| Akash Network decentralized GPU utilization (network-wide) | ~50-70% through 2025; ~57% peak late June (H100-heavy), ~60% full-year | percent | medium | corrected | [Messari State of Akash Q2/Q3/Q4 2025](https://messari.io/report/state-of-akash-q2-2025) |
| io.net fraction of registered GPUs actually active/cluster-r | ~2% of registered base active in Q1 2025 (327,000 registered vs ~6,720 | percent | low | confirmed | [Independent io.net analysis (Own Your Mind, ci](https://ownyourmind.ai/projects/io-net/) |
| Salad (crowdsourced consumer GPUs) - utilization model | Runs only when the host PC is idle (idle-time detection / user thresho | description | low | corrected | [SaladCloud FAQ/docs + Salad Chef Community](https://github.com/SaladTechnologies/salad-kitchen-docs/blob/main/content/docs/faq/jobs/should-i-enable-my-gpu-my-cpu-or-both.md) |
| Vast.ai host GPU occupancy / earnings guidance | Vast.ai's own earnings example assumes 80% utilization for a 4x RTX 50 | percent | medium | confirmed | [Vast.ai 'How much can you earn' + hosting calc](https://vast.ai/article/how-much-money-can-you-earn-renting-out-your-gpu-on-vast-ai) |
| Render Network - idle-capacity GPU model / utilization discl | P2P marketplace explicitly for idle GPU capacity; ~5,600 cumulative GP | description | low | confirmed | [Render Network Foundation Monthly Report (May ](https://rendernetwork.medium.com/render-network-foundation-monthly-report-may-2025-defd346b2db3) |
| Datacenter LLM inference GPU compute (SM) utilization - typi | ~20-40% typical; 24h production trace (Qwen3-8B, 8x H800) averaged 18. | percent | medium | corrected | [Characterization of LLM Development in the Dat](https://arxiv.org/pdf/2403.07648) |
| Achievable GPU utilization with continuous batching under lo | 80-95% only with continuous batching AND many concurrent requests sust | percent | medium | confirmed | [Spheron / practitioner guidance on LLM inferen](https://www.spheron.network/blog/llm-inference-slow/) |
| Plausible capacity factor for a home GPU inference node (% o | ~5-35% of wall-clock hours; ~15% central estimate for a single residen | percent | low | confirmed | [Synthesized bound from Akash (~50-70% network-](https://messari.io/report/state-of-akash-q2-2025) |
