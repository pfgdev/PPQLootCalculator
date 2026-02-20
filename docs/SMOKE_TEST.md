# Smoke Test Checklist

Use this checklist before `clasp push` and before final handoff.

## 1) Tab and Load
1. App loads with `Gold v2` active.
2. `Spell Scrolls v2` tab switches cleanly.
3. `PPQ Loot Chests` tab switches cleanly.
4. No blank tab or missing section after switching.

## 2) Gold v2
1. Add row creates a new row seeded from bottom-row CR.
2. Remove button is hidden when only one row remains.
3. CR/Killed steppers update `Base Gold` and `DC (L/M/H)` immediately.
4. Check stepper increments/decrements correctly.
5. Calculate updates `Expected Gold` and `Dice Notation`.
6. First calculate reveals Floof lane.
7. Reset restores initial values and hides Floof lane.

## 3) Spell Scrolls v2
1. Selecting each level loads spells without JS errors.
2. Filter narrows list correctly.
3. Clicking spell row opens detail panel and loads detail data.
4. Clicking outside panel/list rows collapses detail panel.
5. d100 roll:
   - locks interactions during roll
   - lands on a valid spell (not `Re-Roll`)
   - scrolls row into view when needed
6. Switching tabs during roll cancels roll and resets dice display.

## 4) Loot Chests (prototype v1)
1. Play/Manage mode toggles correctly.
2. Status view filter (`In Chest` / `Awarded` / `Unused` / `All Statuses`) updates list correctly.
3. Token list renders as two side-by-side tables with `Token` + `Item` only.
4. Sidebar status select updates status and shows Undo toast.
5. Sidebar detail behavior:
   - row selection opens slide-in detail panel
   - click outside row/detail panel closes it
6. Detail edit flow:
   - default is read-only
   - `Edit` enables fields
   - `Save Item` and `Revert Item` behave as expected
7. Quick generate:
   - accepts ranges like `1-10,12`
   - skips existing active tokens
   - appears only in Manage mode table setup section
8. Save/Revert:
   - Save commits local snapshot and shows sync lane
   - Revert restores prior local snapshot

## 5) Responsive
1. Tablet: no major header wrap/hitching.
2. Mobile: spell list/detail and loot layout remain usable.
3. No unexpected horizontal scrollbars.

## 6) Console/Network
1. No uncaught errors in console during above flow.
2. No failed RPC calls in normal happy path.
