# SunStack pitch-deck website — design spec

**Date:** 2026-08-04
**Author:** Wei (with Claude Code)
**Status:** for review

A slide-deck **website** that introduces the SunStack project to the university's senior-management panel. Built in `website/`, styled per `DESIGN.md` (Apple design language) recoloured to SunStack's sun-amber brand, deployed as a GitHub Pages site.

---

## 1. Goal, audience, tone

- **Goal.** Explain SunStack clearly and make it feel real. Open with the vision, land hard on the working demo, close on shared benefit and a warm thank-you.
- **Audience.** University senior management. Smart, busy, non-specialist. They care about impact, credibility, sovereignty, and that the team can actually execute.
- **Tone.** Plain words. Short sentences. Calm confidence. No hype, no jargon. Every claim is grounded in the project docs.
- **No hard ask.** The final tile is a thank-you, not a funding/pilot request.

## 2. What SunStack is (source of truth: `../dist-datacenter`)

Australia wastes rooftop-solar surplus at midday (exported at 4–8¢/kWh, bought back at 30–40¢/kWh in the evening) and pays a premium for AI compute (Sydney GPUs 30–60% above comparable US regions, with workloads fleeing offshore). SunStack puts a small solar-powered GPU **node** in a homeowner's garage, connects many homes into one network, and sells that compute to **buyers** through an OpenAI-compatible API. The homeowner earns money; the buyer gets cheaper, Australia-based AI; the grid gets a new flexible load; the sun is not wasted.

Three parties: **Homeowner** (hosts the node), **Buyer** (runs inference), **SunStack** (matches, meters, bills). Traffic is NATS pub/sub — the node dials out, so home NAT/dynamic IP is fine.

## 3. What is actually built (the demo's backbone — do not overclaim)

Grounded in `sunstack-cloud/plans/PROGRESS.md` (154 cloud / 118 node tests passing):

- **Buyer Console** — real ChatGPT-style chat with **real** inference: text (vLLM), image (Z-Image Turbo), speech (Qwen3-TTS). OpenAI-compatible `/v1`. API keys, usage, billing.
- **Operator Console** — fleet/nodes, live dispatch (least-loaded routing), usage ledger, pricing, energy per node, audit.
- **Homeowner Node GUI** — serving status, live earnings estimate, pause serving, activity charts.
- **Validated on real GPUs** (DGX Spark / GB10): buyer signup → chat → real tokens → metering → billing, end to end.
- `text-image.mov` shows real text + image generation on the served model.

Honest framing for the panel: *"We have built a working system. Real AI, running on a real GPU, served through a real marketplace."* We do **not** claim a live national fleet; fleet scale is the roadmap.

## 4. Tech approach

**Zero-build vanilla HTML + CSS + JS.** No framework, no bundler.

- **Why:** GitHub Pages serves it directly (push = live). Nothing to break during the presentation. Easy for Wei to edit copy later. Full control over scroll-snap + animation.
- **One `index.html`** (all ~20 `<section>` tiles), **one `assets/css/styles.css`**, **one `assets/js/deck.js`**.
- **Self-hosted fonts** (`assets/fonts/`): Inter (variable) + JetBrains Mono `woff2`. No CDN dependency mid-presentation.
- **Relative asset paths everywhere** + a root **`.nojekyll`** so it works whether Pages serves at org root or under `/sunstack.github.io/`.
- **Video:** transcode `text-image.mov` → `assets/video/text-image.mp4` (H.264 + AAC) for Chrome/Firefox; keep a poster JPG; `<video>` with graceful fallback link. (`.mov`/QuickTime does not play reliably outside Safari.)
- **No secrets in the repo.** `.gitignore` excludes `.env`. The image script reads `OPENAI_API_KEY` from the parent `../.env` at generation time only.

### File structure
```
website/
  index.html
  .nojekyll
  .gitignore
  README.md                      # how to run / regenerate / deploy
  SCREENSHOTS-NEEDED.md          # short list of nice-to-have extra shots
  DESIGN.md                      # existing (kept)
  assets/
    css/styles.css
    js/deck.js
    fonts/*.woff2
    img/*.png                    # gpt-image-2 output
    shots/*.png                  # product screenshots (copied from parent)
    video/text-image.mp4, poster.jpg
  tools/
    generate_images.py           # loads key from ../.env; model gpt-image-2-2026-04-21
  docs/superpowers/specs/2026-08-04-sunstack-pitch-deck-design.md
```

## 5. Visual system (locked to the brand)

From `DESIGN.md` structure + `buyer-console/src/theme.css` tokens.

- **Tiles.** Full-bleed, one viewport each, alternating **light `#ffffff` / parchment `#faf8f4` ↔ near-black `#161410`**. The colour change is the divider. `rounded.none` on tiles.
- **Accent.** Single **sun amber `#e8932a`** (strong `#c8761a`, soft `#fdf3e6`, gold `#f3b865`). One muted **teal `#5db8a6`** for secondary data only. No third accent.
- **Ink/body.** Ink `#16140f`, body `#44413a`, muted `#837d72`; on dark: `#f4f0e8` / muted `#b3ab9c`.
- **Type.** Inter — display 700–800, letter-spacing `-0.02em`, tight leading; body 400, ~17px, leading ~1.5. JetBrains Mono for code/API snippets. Headline sizes `clamp()` down on mobile.
- **Shadow.** Exactly one soft shadow, reserved for imagery/cards resting on a surface (`0 12px 48px rgba(20,18,12,.14)`). Never on text.
- **CTA grammar.** Pill buttons (`999px`), amber fill / ghost. Reused sparingly (the deck is mostly non-interactive).
- **Radii.** 8 / 12 / 18 / 999, matching the product.

## 6. Interaction & animation

- **Navigation.** CSS `scroll-snap-type: y mandatory`; each tile `scroll-snap-align: start; min-height: 100vh`. Plus keyboard: **↓/→/Space/PageDown = next**, **↑/←/PageUp = prev**, **Home/End = first/last**. Smooth-scroll to the target tile.
- **Progress.** Right-edge **dot rail** (one dot per tile, active dot amber, click to jump) + a small **"03 / 20"** counter. A thin top **scroll-progress bar** in amber.
- **Reveal.** `IntersectionObserver` adds `.in` when a tile enters; children stagger in (fade + 12px rise + slight scale). One-shot per tile.
- **Signature motions** (subtle, purposeful, matching existing `nsflow`/`gpuspin` motifs):
  - Cover: amber **sun mark** rays draw in; hero photo slow zoom (Ken Burns).
  - Value flow: dashed amber links **flow** along the path (animated `stroke-dashoffset`), tokens travel.
  - Motivation: **number counters** (4–8¢ vs 30–40¢; +30–60%) count up on entry.
  - Network: node dots pulse; links flow.
  - Roadmap: timeline draws left→right; milestones pop in.
- **Reduced motion.** `@media (prefers-reduced-motion: reduce)` disables all non-essential animation; content still fully visible. Scroll-snap falls back to normal scroll.
- **Responsive.** Works down to phone width (single column, tighter padding, `clamp()` type). Primary target is a projector/laptop at 1080p–1440p.

## 7. Slide-by-slide content (actual copy — plain words, short sentences)

> Copy below is the real draft text. Numbers are from the SunStack docs. Wei can edit any line.

**1 — Cover (dark).**
- Eyebrow: `SUNSTACK`
- H1: **Turning sunshine into intelligence.**
- Sub: An Australian marketplace that turns rooftop-solar surplus into sovereign AI compute.
- Foot: small backer row — UNSW · TRaCE · RACE for 2030 · ARENA.
- Visual: `cover-hero.png` (golden-hour rooftops) behind a dark scrim; animated sun mark.

**2 — Overview (light).**
- H2: **The whole idea, in one sentence.**
- Lead: A small solar-powered computer in a home does AI work for someone who needs it. The homeowner earns. The buyer saves. The sun is not wasted.
- Row of three **HTML cards** (no generated art here — keeps images distinct from tile 3): **Homeowner** → **SunStack** → **Buyer**, with the amber sun mark, connectors animating in.

**3 — The value flow (dark, full-bleed).**
- H2: **From your roof to real work.**
- Four steps, labelled in HTML over `value-flow.png`: **Rooftop solar → Home node → SunStack network → AI for a buyer.**
- Caption: Clean energy in. Useful intelligence out.

**4 — Motivation ① The midday problem (light).**
- H2: **Australia wastes its best sunshine.**
- Body: On a sunny afternoon, rooftops make more power than the street can use. The grid does not want it.
- Stat pair (counters): **4–8¢** paid for exported solar  ·  **30–40¢** to buy it back at night.
- Kicker: *The worst trade in the country. Every sunny day.*

**5 — Motivation ② The compute gap (dark).**
- H2: **And it pays too much for AI.**
- Body: AI runs on GPUs. In Sydney they cost far more than overseas. So many Australian businesses send their data offshore to save money.
- Stat (counter): **+30–60%** GPU premium vs comparable US regions.
- Kicker: *Too much wasted energy at noon. Not enough affordable AI. Two problems, never meeting.*

**6 — The idea (parchment interstitial).**
- Big type: **What if those two problems shared a door?**
- Sub: Your roof powers a small computer. That computer does real AI work for someone in Sydney, Perth, or Brisbane. Everybody wins.

**7 — Why only Australia (light).**
- H2: **This maths only works here.**
- Four cards (stagger in):
  1. **Most solar homes on Earth.** About 1 in 3 Australian homes has rooftop solar.
  2. **The widest price gap.** Cheap at noon, dear at night — the biggest spread in the developed world.
  3. **Batteries at scale.** ~350,000 homes added a battery in the scheme's first ten months; 2M+ targeted by 2030.
  4. **Ready-made rails.** The energy market already accepts home-based "virtual power plants."

**8 — What lives in the garage (dark).**
- H2: **A quiet box on the wall.**
- Body: A sealed computer, about the size of a large desktop. Its own circuit. Its own internet. It works only on spare solar, and steps aside when the house needs power. Pause it any time from your phone.
- Points: **No upfront cost** (financed from what it earns) · **Sealed & insured** · **You stay in control.**
- Visual: `node-garage.png`.

**9 — Three sides, one story (light).**
- H2: **Three people who never have to meet.**
- Three columns over `three-party.png`:
  - **Homeowner** — lends spare solar + a corner of the garage. Earns a share.
  - **SunStack** — builds the box, routes each job, handles billing, security, and the energy market.
  - **Buyer** — sends AI work, gets results. Never learns whose garage ran it.

**10 — How the network behaves (dark).**
- H2: **Many small homes. One big machine.**
- Body: If a storm cuts the sun in Sydney, work shifts to Melbourne. If Melbourne has a bad day, it shifts again, or waits. Unreliable in any one place. Reliable everywhere at once.
- Visual: `network-topology.png` (glowing homes → hub), links flowing.

**11 — It runs today → Buyer demo (light).**
- Eyebrow: `NOT A CONCEPT`
- H2: **It already runs.**
- Body: A buyer signs in, picks a model, and chats. Real text. Real images. Served by a solar-powered GPU, metered and billed — end to end.
- Visual: **`text-image.mp4`** (autoplay muted loop, click to enlarge) + `shots/buyer-chat-local-inference.png`.

**12 — Operators run the fleet (dark).**
- H2: **One console runs the marketplace.**
- Body: See every node, watch each job get routed to the least-busy home, track usage, energy, and billing.
- Visual: `shots/e2e-6-dashboard-nodes.png` (+ Dispatch / Energy if supplied), device-framed.

**13 — Homeowners see their earnings (light).**
- H2: **The homeowner sees everything.**
- Body: Serving status, energy used, and money earned — live. One button pauses the node.
- Visual: `shots/e2e-owner-gui-overview.png` (+ Node Activity charts if supplied).

**14 — Is it safe? (dark).**
- H2: **Safety was the part that took longest.**
- Three columns:
  - **For the home** — own circuit, own network, sealed, insured, pause anytime.
  - **For the buyer** — encrypted in transit; on high-trust nodes, encrypted inside the chip; signed receipts; random re-runs to catch mistakes.
  - **For the country** — stays in Australia; follows privacy law; registered in the energy market; auditable for government work.

**15 — Benefits ① Homeowners (light).**
- H2: **For homeowners.**
- Three points: **A new income** — about **$1,500–$4,500 a year** from spare solar · **Nothing to pay upfront** — the box pays for itself · **Full control** — pause anytime, remove anytime.
- Visual: `homeowner-spot.png`.

**16 — Benefits ② Buyers / end-users (dark).**
- H2: **For the people who use the AI.**
- Three points: **Lower prices** — powered by the cheapest energy in the country · **Australian & sovereign** — data stays on home soil · **Familiar & verifiable** — a standard API, with a signed receipt that the work was done right.

**17 — Benefits ③ Society & government (light).**
- H2: **For the country.**
- Three points: **Sovereign AI** — every job runs in an Australian home · **A calmer grid** — soaks up midday surplus where it's made · **No new land** — uses rooftops people already own; no data-centre in a paddock.

**18 — Benefits ④ SunStack & the university (dark).**
- H2: **For SunStack and the university.**
- Three points: **A defensible new business** — first integrated operator at national scale · **Real research** — energy-aware scheduling, edge attestation, virtual power plants, tenant isolation → papers, IP, trained engineers · **A uniquely Australian story** — infrastructure no other country can build the same way.

**19 — Roadmap (parchment).**
- H2: **We build it in stages.**
- Timeline (draws in):
  - **6 months** — a handful of homes. Real hardware, real workloads, real proof.
  - **18 months** — 200–500 homes in Sydney & Melbourne. A developer API. First energy-market revenue. First business partner.
  - **2–3 years** — several thousand homes. A government-grade service. An enterprise product.
  - **5 years** — tens of thousands of homes. A real slice of the national flexibility market.

**20 — Thank you (dark).**
- H1: **Australia has a once-in-a-generation chance to build something no other country can.**
- Sub: We'd love to build it here, with you.
- Foot: **Thank you.** + SunStack wordmark + backer row (UNSW · TRaCE · RACE for 2030 · ARENA) + a contact line placeholder.

## 8. Imagery spec (gpt-image-2)

- Script: `tools/generate_images.py`. **Confirmed working call pattern** (matches `dist-datacenter`): `client.images.generate(model="gpt-image-2-2026-04-21", prompt=f"{prompt}\n\nVisual style: {STYLE}", size="1536x1024", quality="high", n=1)` → decode `result.data[0].b64_json`. Loads `OPENAI_API_KEY` from the parent `../.env` (never copied into the repo). Writes PNGs to `assets/img/`. Generates concurrently (thread pool) but is idempotent — **skips files that already exist** so a rerun only fills gaps; pass `--force <name>` to regenerate one. Costs real money; regenerate selectively.
- **Confirmed available (no need to fetch/ask):** ffmpeg 8.1.2, python3 + `openai` 1.88, `uv`; backer logos (`unsw.png`, `trace.png`, `race.png`, `arena.svg`) and founder photos already in `sunstack-cloud/buyer-console/public/{logos,team}`.
- **Fresh STYLE string** (not the old academic/Nature ones):

  > *Warm, premium, Apple-keynote minimalism with an Australian-solar soul. Editorial and photographic — never clip-art. Colour palette strictly: sun amber #e8932a with deeper #c8761a and soft gold #f3b865 as the ONLY accent; warm off-white parchment #faf8f4 and pure white as surfaces; near-black #161410; at most one muted teal #5db8a6 for a secondary element. Soft natural golden-hour light, gentle shadows, generous negative space, shallow depth of field on photographs, clean matte surfaces, subtle fine grain. Calm, optimistic, confident, sovereign-tech feel. Absolutely no text, letters, numbers, logos, watermarks, or UI. Cohesive so all images read as one family.*

- **Text goes in HTML, not in images** (avoids garbled labels). Diagrams = textless art + crisp HTML/CSS labels & arrows over the top. Charts (price gap, roadmap) = pure HTML/CSS for accuracy + animation.
- **Images to generate (~8):**
  1. `cover-hero` — cinematic golden-hour Australian suburban street from above, rows of solar rooftops glowing warm; aspirational, editorial; works under a dark scrim.
  2. `value-flow` — clean flat editorial illustration reading left→right: a sunny rooftop, a small matte compute box, a soft network of homes, a person's laptop; connected by gentle amber flow lines; textless.
  3. `node-garage` — photoreal: a small sealed matte GPU appliance mounted on a clean bright garage wall, warm daylight, product-photography quality, shallow depth of field; no text on the box.
  4. `three-party` — three warm connected vignettes in one frame: a solar home, an abstract routing hub, a small office/desk; unified amber-on-parchment palette; textless.
  5. `network-topology` — stylised night map of Australia's east coast with many warm-glowing home points linked by soft amber lines to a couple of hubs; calm, editorial; textless.
  6. `homeowner-spot` — a homeowner glancing at a phone in a warm garage/driveway with solar roof behind; hopeful, natural light.
  7. `buyer-spot` — a developer/creator at a laptop in a calm Australian workspace, warm light; no readable screen text.
  8. `society-spot` — a warm suburban evening skyline with subtle solar/energy motif; optimistic, clean.
- Aspect: mostly 3:2 landscape; `cover-hero` and full-bleed tiles 16:9. Each tile also has a solid-colour fallback so a missing image never breaks layout.

## 9. Screenshots

**Already have** (in the parent `sunstack/` dir, will copy into `assets/shots/`): `buyer-chat-local-inference.png`, `e2e-1..8` (chat streaming / real tokens / multiturn / usage / probe / dashboard nodes / dashboard usage / qwen multiturn), `e2e-owner-gui-overview.png`.

**`SCREENSHOTS-NEEDED.md`** (nice-to-have extras; deck ships without them):
1. Operator **Dispatch & Scheduling** page (live routing).
2. Operator **Energy** page (per-node energy).
3. Node **Activity** page (Task-Manager-style charts).
4. Buyer **public landing** hero (the polished front door).
5. (Optional) Buyer **Usage** or **Billing** page.

All at ~1440×900, light theme, logged-in, with realistic-but-non-sensitive data.

## 10. Deployment

- `website/` becomes a git repo. `.gitignore`: `.env`, `.DS_Store`, `tools/__pycache__/`. **Video handling:** transcode once to `assets/video/text-image.mp4` (H.264) + `poster.jpg`; the original `text-image.mov` (18 MB) is **git-ignored** (kept locally as source, not shipped) since the `.mp4` supersedes it and cuts repo size.
- Commands (run at the end, after the site is built and verified):
  ```bash
  git init && git add -A && git commit -m "site: SunStack pitch deck"
  git branch -M main
  git remote add origin git@github.com:DataCenterBehindMeter/sunstack.github.io.git
  git push -u origin main
  ```
- **Enable Pages:** repo → Settings → Pages → Source = *Deploy from a branch* → `main` / root.
- **URL note:** the repo is `sunstack.github.io` under org `DataCenterBehindMeter`, so Pages serves it as a **project site** at `https://datacenterbehindmeter.github.io/sunstack.github.io/`. Relative paths + `.nojekyll` make that work. (If Wei wants the clean org-root URL `https://datacenterbehindmeter.github.io/`, the repo must instead be named `datacenterbehindmeter.github.io` — flag before pushing.)

## 11. Accessibility & robustness

- Semantic landmarks (`<section aria-label>`, headings in order), alt text on every image, visible focus states, keyboard-operable dot rail, `prefers-reduced-motion` honoured, colour contrast AA on text.
- Every image/video has a solid-colour fallback; the deck is fully readable if any asset fails to load.

## 12. Out of scope (YAGNI)

- No CMS, no backend, no analytics, no build pipeline, no framework.
- No live data from the real system (screenshots + the existing video only).
- No PDF export (browser print can approximate if ever needed).
- No i18n.

## 13. Open items for Wei (non-blocking — sensible defaults chosen, easy to change)

1. **Contact line** on the thank-you tile — *default:* show the SunStack wordmark + backer row, no email, unless Wei supplies one.
2. **Backer logos** — *default:* include (UNSW · TRaCE · RACE for 2030 · ARENA), reusing the files already in `buyer-console/public/logos`. Easy to hide.
3. **Numbers/claims** — all grounded in the docs; *default:* as written. Wei can soften/cut any line (copy lives in one `index.html`).
4. **Deploy URL** — *default:* push as-is to `sunstack.github.io` (project-site URL). Flag before push if the org-root URL is wanted (needs repo rename).
