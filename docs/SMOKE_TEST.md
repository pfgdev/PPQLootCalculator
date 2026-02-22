# Smoke Test Checklist

Use this checklist before `clasp push` and before handoff.
Last updated: 2026-02-21

## 1) Core App Load
1. App loads without console errors.
2. First active tab is `PPQ Cash Loot`.
3. Tab switching works for:
- `PPQ Cash Loot`
- `PPQ Spell Scrolls`
- `PPQ Loot Chests`
4. No blank tab section after switching.

## 2) PPQ Cash Loot
1. Add enemy row works.
2. Remove row works and remove button hides when only one row remains.
3. CR and killed steppers update live row-derived values.
4. Check stepper works.
5. Calculate updates expected gold and dice notation.
6. First calculate unlocks floof lane.
7. Reset returns initial values and re-locks floof lane.

## 3) PPQ Spell Scrolls
1. Selecting level loads spell list.
2. Filter input narrows list.
3. Clicking a spell row opens detail panel.
4. Clicking outside list rows/detail closes detail panel.
5. d100 roll button behavior:
- locks interactions during roll
- never ends on `Re-Roll`
- scrolls final selected row into view if needed
6. Switching away during roll cancels rolling state.

## 4) PPQ Loot Chests - Top Controls
1. Chest dropdown changes selected chest.
2. `Create New Chest...` path opens chest-management flow.
3. Save button enabled only when working state is dirty.
4. Revert All restores persisted snapshot.
5. Undo button state and label update correctly (`Undo Last` / `Redo Last`).
6. History text reflects last undoable action only.

## 5) PPQ Loot Chests - Manage Tabs
1. Tabs render and switch correctly:
- Manage Chests
- Create Group
- Manage Groups
- Manage Tokens
2. No chest state:
- only valid actions are enabled
- chest guidance placeholders render correctly
3. Chest create/delete flow:
- add requires name
- delete requires selection then confirm
4. Group create flow:
- requires name + theme + valid count
- count steppers work and respect 1-999
- new group creates `UNUSED` tokens and selects one
5. Group manage flow:
- select group
- update name/theme with conflict prevention
- delete requires confirm
6. Token range flow:
- requires group + valid range
- add/delete counts update in button labels
- add and delete disabled when no effect

## 6) PPQ Loot Chests - Token List
1. Filters (`IN_CHEST`, `AWARDED`, `UNUSED`) toggle independently.
2. Counts in filter labels update when statuses change.
3. Search filter updates list without collapsing detail unexpectedly.
4. Empty states render correctly:
- no chest
- no tokens created
- no filter selected
- no match in current view
5. Grouped tables render with per-group themed headers and alternating row shades.

## 7) PPQ Loot Chests - Detail Panel
1. Row click opens detail panel.
2. Click-off behavior:
- clicking rows does not close
- clicking inside detail does not close
- clicking interactive controls in top/filter areas does not close
- clicking non-interactive whitespace closes
3. Read mode:
- item title/tags/status display correctly
- optional item link hidden when empty
4. Edit mode:
- edit fields enable
- status buttons hidden/locked from edit flow
- description and notes preserve multiline formatting
- description and notes auto-expand without scrollbar hitching
5. Save Item:
- applies edits and returns to read mode
- creates undoable item-edit history
6. Revert Item:
- exits edit mode without saving draft

## 8) Responsive and Visual Consistency
1. Shared section headers look consistent across all tabs.
2. Tab content width aligns across all three tabs.
3. Spell table row rhythm is visually aligned with Loot token table.
4. No unwanted horizontal scrolling on tablet landscape.

## 9) Validation and Deploy
1. Run:
- `node scripts/validate-index.js`
2. Push:
- `clasp push`
3. Re-open web app and quick-check each tab.
