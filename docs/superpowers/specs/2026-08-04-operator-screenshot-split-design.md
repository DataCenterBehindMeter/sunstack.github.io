# Operator screenshot slide split — design spec

**Date:** 2026-08-04  
**Status:** approved

## Goal

Make both operator-console screenshots legible during presentation by replacing the current two-column page 9 with two consecutive slides, one screenshot per slide.

## Layout

Page 9 remains the Dispatch view. It keeps the control-room framing and uses the existing copy `One console runs the marketplace.` followed by `See every node. Watch each job go to the least-busy one.` The Dispatch browser frame sits below the copy at a large centered width.

The new page 10 is the Energy view. It uses the same dark control-room surface, the heading `One console tracks the energy.` and the existing remaining copy `Track usage, energy, and billing across the fleet.` The Energy browser frame uses the same large centered container.

Both screenshots render with `width: 100%` and `height: auto` inside a responsive container capped at 1120px. This retains each file's intrinsic aspect ratio: Dispatch is 3456 × 1089 and Energy is 3456 × 1816. The container shrinks to the available width on tablets and phones without horizontal overflow.

## Deck integration

The deck grows from 15 to 16 slides. Renumber the IDs and comments for the former pages 10–15 so IDs remain sequential. Update the initial counter fallback to 16, shift the `Who wins` chapter start from 11 to 12, and shift `The plan` from 14 to 15. The runtime counter and progress bar continue deriving their total from the `.tile` elements.

Replace the unused `.shots-2` grid with a single `.operator-shot` container. No carousel, toggle, cropping, or new interaction is introduced.

## Verification

Browser regression tests will assert that there are 16 slides, Dispatch and Energy appear on different consecutive slides, both rendered image ratios match their natural ratios at desktop and mobile widths, the desktop screenshots are materially larger than the former half-width layout, and neither slide overflows horizontally. The full deck regression suite and visual desktop/mobile inspection run before deployment.
