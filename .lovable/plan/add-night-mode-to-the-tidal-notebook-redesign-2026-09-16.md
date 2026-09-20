# Add night mode to the tidal notebook redesign

## Goal
Complete the approved “field notebook meets tidal data” visual pass and add an accessible night-mode option without changing routes, workflows, data, permissions, or page structure.

## Theme control
- Add a compact sun/moon icon switch in the shared top navigation so it is available across public and signed-in pages.
- Default to the visitor’s device preference on first visit, then remember their manual choice locally.
- Apply the saved theme before the page becomes visible to avoid a light-to-dark flash.
- Give the control a clear accessible label, keyboard focus state, and tooltip.

## Night palette
- Extend the existing semantic color tokens with a true deep-ocean night palette rather than a flat black inversion.
- Preserve the same coastal meanings in both modes: seafoam for verified, tidal-mud ochre for pending, coral for warnings, and mangrove-root brown for grounded accents.
- Retune paper sheets, field cards, tidal contours, forms, tables, charts, dialogs, navigation, and the photograph upload treatment for WCAG AA readability at night.
- Keep the EB Garamond, Source Sans 3, and Space Mono typography and the same asymmetric field-journal composition in both modes.

## Finish and verify
- Complete the remaining tidal notebook styling already in progress, including the landing statement, asymmetric KPI emphasis, page transitions, ripple statuses, and evidence-photo reveal.
- Check light and night modes on the landing page, registry, sign-in, and authenticated workspace at mobile and desktop widths.
- Confirm theme persistence, no page flash, keyboard usability, clean browser console, and a successful build.
