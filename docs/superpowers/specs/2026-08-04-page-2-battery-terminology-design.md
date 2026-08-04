# Page 2 battery artwork and deck terminology — design spec

**Date:** 2026-08-04  
**Status:** approved

## Goal

Show battery storage explicitly in the page-2 value-flow artwork and describe SunStack consistently as solar/battery-powered throughout the deck without rewriting facts or visuals that are specifically about solar panels.

## Artwork

Update only the `value-flow.png` prompt in `tools/generate_images.py`. The first step of the four-part illustration will contain a small house with rooftop solar panels and a recognizable compact wall-mounted home battery beside it. The compute box, networked houses, laptop, amber flow lines, parchment background, 3:2 dimensions, and text-free editorial style remain unchanged.

Regenerate only `value-flow.png` with `python3 tools/generate_images.py --force value-flow`. Inspect the resulting asset for the battery, the preserved four-step composition, absence of text/logos, and visual consistency with the deck.

## Copy

Page 2 will read:

> A small solar/battery-powered computer in a home does AI work for someone who needs it. The homeowner earns. The buyer saves. The sun is not wasted.

References describing SunStack's power source will use `solar/battery`, including page metadata, the cover description, the page-2 flow label and alt text, node operation, homeowner inputs and income, and energy-aware scheduling.

Solar-only facts remain solar-only. This includes solar export tariffs, rooftop-solar adoption statistics, and descriptions of visibly solar-only elements such as panels or roofs in other images. This avoids turning solar statistics into unsupported combined solar-and-battery claims.

On page 4, card 01 retains its solar-only meaning and uses the exact title `Most solar homes % on Earth`.

On the node slide, replace `Its own internet.` with the exact sentence `Home Internet.`

## Verification

Automated checks will assert the exact page-2 sentence, the updated SunStack power-source phrases, the retained solar-only factual phrases, and the presence of the battery requirement in the `value-flow.png` generation prompt. Existing browser checks will confirm the regenerated image preserves its native 3:2 ratio, page-2 text contrast remains readable, and page 2 does not overflow at desktop, tablet, or mobile widths.

After local visual inspection and automated verification, commit the changes, push `main`, wait for GitHub Pages to report a built deployment, and repeat the browser checks against the public site.
