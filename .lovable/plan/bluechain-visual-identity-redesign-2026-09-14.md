# BlueChain visual identity redesign

## Goal
Transform the existing interface into a distinctive “field notebook meets tidal data” experience while preserving every route, workflow, data query, form field, table, permission, and user action.

## Visual direction
- Replace the current glassy teal SaaS styling with a layered deep-ocean canvas, restrained water-depth washes, and faint topographic/tidal-line texture outside readable surfaces.
- Use **DM Mono** for headings, labels, coordinates, and log-like details, paired with **Source Sans 3** for body copy and controls.
- Introduce semantic coastal colors: seafoam for verified/healthy, tidal-mud ochre for pending/watch, coral for flagged/rejected/critical, and mangrove-root brown for grounded secondary accents.
- Shift surfaces toward tactile field sheets: subtle paper-like borders, intentionally asymmetric corner radii, thin ruled details, stamped labels, and restrained depth instead of generic glass cards.

## Shared design system
- Rebuild global color, type, border, shadow, texture, motion, and focus tokens in the global stylesheet with WCAG AA contrast.
- Restyle shared cards, buttons, badges, fields, tabs, tables, dialogs, menus, and the navigation shell so all existing pages inherit the new identity consistently.
- Add reusable visual primitives for tidal-line section dividers, field-log stamps, ripple status treatment, and domain-specific line icons.
- Replace the ambient orb/cursor-glow treatment with subtle tide-depth layers and low-opacity contour/ripple texture; keep reduced-motion support.
- Apply a soft fade-and-rise route entrance without changing navigation behavior.

## Navigation and iconography
- Restyle the existing sidebar as a compact field-index rail rather than a generic dashboard panel, preserving its links, role filtering, collapse behavior, and mobile behavior.
- Replace prominent generic navigation and status glyphs with custom mangrove roots, tide lines, canopy/leaf, evidence frame, alert beacon, and water-drop verification marks where the domain has a natural equivalent.
- Keep familiar utility symbols for universal actions such as search, download, close, and sign out.

## Landing, registry, and access pages
- Redesign the landing page as a full-bleed animated tidal-depth statement, with “BlueChain Registry” as the single H1 and a field-log/typewriter reveal for the supporting line.
- Preserve the existing calls to action and content order while replacing the uniform feature cards with an editorial field-note treatment and tidal dividers.
- Carry the same visual language into sign-in/sign-up, public registry search, project cards, and public project details without changing any forms or results.

## Authenticated workspace
- Keep the current page hierarchy and content, but use asymmetric visual emphasis on the admin KPI area so the most important metric spans more space at larger breakpoints.
- Restyle charts, tables, feeds, project/evidence lists, approval queues, verification views, alerts, user management, dialogs, and empty/loading/error states with the coastal semantic palette and field-record detailing.
- Apply intentionally uneven corner geometry to key cards and repeated items without reducing scanability or changing responsive content flow.

## Evidence upload and statuses
- Convert the existing photo picker into a “developing photograph” visual treatment: framed preview, darkroom-like reveal, and clear drag/focus/selected states, while retaining the same file input, camera capture, validation, preview, and submission logic.
- Give status badges semantic coastal colors and a restrained ripple animation on appearance/state updates; disable the animation when reduced motion is requested.

## Verification
- Check all public and authenticated routes at desktop and mobile widths for readable contrast, focus visibility, clipping, overlap, and preserved interactions.
- Confirm the project builds cleanly and that the browser console remains free of new errors.
