# PPQ Loot Calculator (Google Apps Script)

This repo is a personal DM tool for DnD sessions. It currently ships only the v2 experience in runtime.

## Current App State

### Visible Tabs (Header)
1. Gold v2
2. Spell Scrolls v2

### Deprecated Tabs
- Legacy Gold Calculator, Spell Scrolls, and Beta runtime code has been removed from `Index.html`.
- Old files were deleted from the repo during cleanup and can be recovered from git history if needed.

## Feature Summary

### Gold v2
- Enemy row editor with:
  - CR stepper
  - Number killed stepper
  - Remove-row gutter button (hidden when only one row exists)
- Add Enemy seeds new row CR from current bottom row CR.
- Investigation check stepper.
- Derived row preview fields:
  - Base gold (CR gold target x killed)
  - DC pill (low / medium / high)
- Calculation behavior:
  - Uses client-side calculation when preview data is loaded.
  - Falls back to server `calculateGoldAndLog(inputs)` if preview data is unavailable.
- Results:
  - Expected Gold
  - Dice Notation
- Floof lane:
  - Hidden until first Calculate.
  - Reset hides Floof and restores hint text.

### Spell Scrolls v2
- Step 1 level icon grid (0-9).
- Step 2 two-column spell tables with shared vertical scroll container.
- Live filter on current level.
- Slide-out detail panel on desktop; stacked behavior on narrow viewports.
- d100 interaction in Step 2 header (`or` + dice circle):
  - Animated roll sequence.
  - Locks interactions during roll.
  - Auto-rerolls internally if result lands on `Re-Roll` row.
  - Scrolls list to final selected spell if needed.
- Floof loaders:
  - list fetch loader
  - detail fetch overlay loader
- Click-off behavior collapses detail panel (except rows, filter controls, and roll button).

## Spreadsheet Dependencies

Named ranges required:
- `Investigation_DCs`
- `Gold_Tables`
- `InvestigationCheck_GoldValueMods`
- `GoldtoDice_Translation`
- `SpellScroll_Export`

Script Properties keys populated during initialization:
- `cleanedInvestigationData`
- `cleanedGoldData`
- `highSuccessMod`
- `mediumSuccessMod`
- `lowSuccessMod`
- `failedCheckMod`
- `goldToDiceData`
- `combinedSpellScrollData`
- `initializationComplete`

## File Map (Primary)

### Server
- `Code.js`
- `initialization.js.js`
- `spell-scroll-initialization.js`
- `spell-scroll.js`

### v2 UI
- Gold v2:
  - `goldcalculatorv2header.html`
  - `goldcalculatorv2-shell.html`
  - `gold-v2.css.html`
  - `gold-v2-scripts.html`
- Spell Scrolls v2:
  - `spellscrollsv2header.html`
  - `spellscrollsv2-shell.html`
  - `spell-v2.css.html`
  - `spell-v2-scripts.html`

### Shared composition and tab wiring
- `Index.html`
- `header.html`
- `tab-scripts.html`
- `global.css.html`

### Retained Icon System
- `icon-styles.css.html` is intentionally retained and included globally.
- It still supports:
  - five predefined icon sizes (`extrasmall`, `small`, `medium`, `large`, `extralarge`)
  - configurable border widths via size + override classes
  - indicator overlays with positional classes (`top-left`, `top-right`, `bottom-left`, `bottom-right`)
  - shape controls for indicator badges (`rounded`, `square`, `circle`)
  - rarity/color pair class system

## Deploy and Test
- Push GAS files: `clasp push`
- Open deployed web app and smoke test:
  1. Gold v2: add/remove rows, check stepper, calculate, reset, Floof toggle.
  2. Spell Scrolls v2: level load, row click detail, click-off collapse, d100 roll.
  3. Tablet/mobile: header wrapping, detail panel behavior, list scroll behavior.

## Documentation Map
- Current technical handoff: `CODEX_CONTEXT.md`
- Loot chest planning and implementation handoff: `docs/LOOT_CHEST_HANDOFF.md`

## Notes
- This README is intentionally concise and practical.
- For implementation-level details, use `CODEX_CONTEXT.md`.
