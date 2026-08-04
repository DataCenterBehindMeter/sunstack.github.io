# Page 2 responsive media and contrast — design spec

**Date:** 2026-08-04  
**Status:** approved

## Goal

Correct two presentation problems on page 2 without changing the rest of the deck:

- Preserve the value-flow image's original 3:2 aspect ratio at every viewport size.
- Make the flow labels beneath the image readable on the page's white background.
- Keep the page responsive on desktop, tablet, and mobile viewports.

## Considered approaches

1. **Intrinsic image sizing with page-scoped styles (selected).** Override the shared full-width image rule only on page 2, using automatic width and height plus responsive maximum bounds. Apply the existing light-surface text tokens to the page-2 labels. This is the smallest change and cannot affect media on other pages.
2. **A fixed-ratio wrapper with `object-fit: contain`.** This would preserve the image but reserve a fixed box that can create empty space at some viewport shapes.
3. **New HTML utility classes and dimensions.** This would be reusable, but it expands the shared component API for a one-page correction.

## Design

The page-2 figure remains centered and may shrink to the available width. Its image uses intrinsic sizing (`width: auto; height: auto`) with `max-width: 100%` and the existing viewport-relative maximum height. The browser therefore scales both axes together from the image's native 1536 × 1024 dimensions.

The four flow-step headings use `--ink`, and their supporting copy uses `--body`, matching other light slides. Amber dots and dashed connectors remain unchanged to retain the visual flow and brand accent.

All overrides are scoped below `#tile-2`. On narrow screens, the existing four-to-two-column flow-strip breakpoint remains in force. Verification covers representative desktop and mobile viewport sizes, checks the rendered image ratio, confirms the label colors, and checks for horizontal overflow.

## Deployment

After local verification, commit the implementation on `main`, push it to `origin`, and verify the public GitHub Pages URL loads the updated page.
