# Loot Chest v1 UI Spec (Prototype)

Last updated: 2026-02-20

## Scope
- Prototype only: local in-browser state.
- No spreadsheet reads/writes in this phase.
- Goal: lock tablet UX for fast token lookup and status updates.

## Title and Statuses
- Page title: `PPQ Loot Chests`
- Internal statuses:
  - `IN_CHEST`
  - `AWARDED`
  - `UNUSED`
- Display labels:
  - `In Chest`
  - `Awarded`
  - `Unused`

## Modes
- `Play` mode
  - Optimized for live session flow.
  - Defaults to `In Chest` view.
- `Manage` mode
  - Authoring/editing/generation mode.
  - Defaults to `All Statuses`.

## Main Layout
1. Top control card
- Mode toggle (`Play`, `Manage`)
- Chest selector
- Search (token or item name)
- View filter (`In Chest`, `Awarded`, `Unused`, `All Statuses`)
- `Save` and `Revert`
- Metrics: count of `In Chest`, `Awarded`, `Unused`
- Toast with optional `Undo`
- Floof sync lane for save/revert wait state

2. Table setup card (Manage mode only)
- Quick Generate Tokens:
  - Color theme
  - Optional category label override
  - Range input (`1-10,12,15-18`)
  - Existing active tokens are skipped
- Add single token
- Delete selected token

3. Token list card
- Two-column list layout (Spell Scrolls style):
  - left table + right table
  - each table shows `Token` and `Item` only
  - no internal list scroll area
- In `All Statuses` view, rows are grouped by status in fixed order:
  - In Chest
  - Awarded
  - Unused

4. Detail card (Sidebar only)
- Selected token detail view:
  - Token
  - Status
  - Item name
  - Rarity
  - Type
  - Attunement required
  - Description
  - Notes
- Editing flow:
  - default state is read-only
  - status can be changed from sidebar without entering edit mode
  - explicit `Edit` toggle enables fields
  - `Save Item` and `Revert Item` appear only while editing
- Sidebar behavior:
  - hidden until a row is selected
  - slides in on desktop when active
  - closes when clicking outside row/detail area (spell-scroll style click-off)

## Token Rules (Prototype)
- Token uniqueness is enforced within a chest among non-deleted rows.
- Range generation creates only missing active tokens.
- Soft-deleted rows are hidden from normal active views.

## Local Save Model (Prototype)
- `Save`: commits working state to local snapshot (simulated async delay).
- `Revert`: restores working state from local snapshot.
- Floof sync lane appears only during save delay.

## Visual Constraints
- Stable workspace grid and fixed panel allocations to reduce layout shifts.
- `In Chest` rows render at full emphasis.
- `Awarded` and `Unused` rows are visually dimmed.
