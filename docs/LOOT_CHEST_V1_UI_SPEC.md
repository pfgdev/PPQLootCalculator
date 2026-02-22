# Loot Chests UI Spec (Current Local Prototype)

Last updated: 2026-02-21

## Scope
- This spec covers the current `PPQ Loot Chests` runtime.
- State is local/in-memory only (prototype behavior).
- Spreadsheet persistence is intentionally not enabled yet.

## Status Model
Internal statuses:
- `IN_CHEST`
- `AWARDED`
- `UNUSED`

Display labels:
- `In Chest`
- `Awarded`
- `Unused`

Status order (render/grouping):
1. In Chest
2. Awarded
3. Unused

## Top Card
Card header:
- `Loot Chests`

Left controls:
- Chest selector
- Save
- Revert All
- Undo Last / Redo Last
- History state text

Right controls:
- Manage tab strip:
  - Manage Chests
  - Create Group
  - Manage Groups
  - Manage Tokens
- Context panel content for selected manage tab

## Manage Tabs

### Manage Chests
Fields/actions:
- `Enter Chest name...` + `Add Chest`
- `Select Chest to delete` + `Delete Chest` (confirm second click)

Rules:
- Add disabled until non-empty name.
- Duplicate chest names blocked.
- Deleting selected chest reselects first available chest.
- If no chest remains, app enters create-first state.

### Create Group
Fields/actions:
- `Group Name`
- `Theme`
- `Tokens` numeric with `-` / `+` hold-to-repeat
- `Add Group`

Rules:
- Required: name + theme + count in `1..999`.
- Group name conflict blocked (case-insensitive prefix key).
- Created tokens default to `UNUSED`.
- Adding a group ensures `UNUSED` filter is active.
- First created token becomes selected detail row.

### Manage Groups
Fields/actions:
- `Group` selector
- `Name`
- `Theme`
- `Update`
- `Delete` (confirm second click)

Rules:
- Update enabled only when valid and changed.
- Rename collisions blocked.
- Token rename collision checks enforced.
- Delete soft-deletes all tokens in group.

### Manage Tokens
Fields/actions:
- `Group Name` selector
- `Start`
- `End`
- `Add (N)`
- `Delete (N)`

Rules:
- Valid numeric range: `1..999`.
- Empty/invalid range disables apply buttons.
- Add count reflects missing tokens in range.
- Delete count reflects existing tokens in range.
- Add ensures `UNUSED` filter is active.

## Tokens Card
Card header:
- `Tokens`

Filter row:
- Status filter toggles with live counts.
- Search input (`Enter filter text...`).

Table area:
- Grouped by token prefix.
- Split into two columns by group block.
- Group titles and per-group table theme colors.
- Two columns per group table:
  - Token
  - Item

Row visuals:
- Item status marker glyphs inline.
- Awarded/unused rows dimmed.
- Selected row highlighted.

## Detail Card
Header:
- Selected token title (e.g. `Blue 6`)
- Edit/Cancel toggle button

Read mode:
- Item name + rarity/type tags.
- Status buttons (active state visible).
- Description read block.
- Item Link shown only when URL exists.
- Notes read block.

Edit mode:
- Item Name input
- Rarity select
- Type select
- Description textarea (auto-grow)
- Item Link input
- Notes textarea (auto-grow)
- Save Item / Revert Item buttons
- Status buttons are hidden while editing.

Text behavior:
- Description and notes preserve multiline newlines.
- No read-mode collapse to single line for multiline content.

## Click-Off Behavior
Detail panel stays open when interacting with:
- Token rows
- Any interactive control in top card
- Any interactive control in token filter row
- Detail panel itself

Detail panel closes when clicking non-interactive whitespace outside those zones.

## Save/Revert/Undo Semantics
Save/Revert:
- `Save` copies working state to persisted snapshot.
- `Revert All` restores working state from persisted snapshot.

Undo/redo support:
- Status changes are undoable/redoable.
- Item detail saves are undoable/redoable.

Not undoable:
- Chest add/delete
- Group add/update/delete
- Token range add/delete

## Empty States
- No chest: `Create a loot chest to begin.`
- Chest with no tokens: `No tokens created. Create a Token Group to get started.`
- No filter active: `No filter selected.`
- No visible results: `No tokens match this view.`

## Styling Baseline
- Card shell and section header styles use shared v2 tokens.
- This tab is the baseline for cross-tab visual standardization.
