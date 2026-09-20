# Role-specific left navigation

## Goal
Make the signed-in navigation feel purpose-built for each role while preserving all current pages, data, permissions, and workflows.

## What will change
- Give each role a distinct sidebar identity:
  - **Field submitter:** Field Station, focused on projects, evidence capture, and alerts.
  - **Verifier:** Review Desk, focused on evidence review, verification, and flagged alerts.
  - **Admin:** Registry Command, focused on portfolio oversight, verification, alerts, and team governance.
- Replace the single flat workspace list with role-specific workflow groups and labels.
- Add a compact role “field pass” in the sidebar header showing the active workspace and role icon.
- Add a role-specific quick-action area using existing destinations only:
  - Submitter: New project, submit evidence.
  - Verifier: Open review queue, inspect alerts.
  - Admin: Review queue, manage team.
- Add short contextual descriptions beneath navigation items when expanded, while retaining icon-only tooltips when collapsed.
- Keep Public Registry in its own transparency section for every role.
- Refine sidebar styling with notebook tabs, tide-line separators, semantic role accents, and clear active states in both light and night modes.

## Permissions and behavior
- Existing authorization remains unchanged.
- Admin-only and verifier-only links remain hidden from unauthorized roles.
- No new database tables, routes, or backend logic will be added.
- Users with multiple roles follow the existing priority: Admin, then Verifier, then Field Submitter.

## Verification
- Check expanded and collapsed navigation.
- Check admin, verifier, and field-submitter configurations in code and available signed-in preview state.
- Confirm desktop/mobile presentation, light/night themes, active-link highlighting, and build health.
