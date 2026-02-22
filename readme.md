# PPQ Loot Calculator (Google Apps Script)

Last updated: 2026-02-21

## Overview
PPQ Loot Calculator is a single Google Apps Script web app with three active tabs:

1. `PPQ Cash Loot`
2. `PPQ Spell Scrolls`
3. `PPQ Loot Chests`

The runtime is v2-only. Legacy tab shells and legacy include chains are no longer part of `Index.html`.

## Current Product State

### PPQ Cash Loot
- Enemy list with CR and killed steppers.
- Live row-derived values (`Base Gold`, `DC (L/M/H)`).
- Investigation check controls.
- Calculate + reset actions.
- Floof lane unlock/react behavior.
- Client-side preview compute with server fallback.

### PPQ Spell Scrolls
- Level icon picker (0-9).
- Two-column spell list with shared vertical scroll container.
- Live text filter.
- d100 roll interaction (`or ??`) with roll lock + reroll handling.
- Slide-out detail card on desktop.
- Detail card stacks on narrow screens.

### PPQ Loot Chests
- Local prototype runtime (dummy/local state, no spreadsheet writes yet).
- Chest selector + manage tool tabs:
  - `Manage Chests`
  - `Create Group`
  - `Manage Groups`
  - `Manage Tokens`
- Token list grouped by token prefix with per-group theme styling.
- Status filters (`IN_CHEST`, `AWARDED`, `UNUSED`) with counts.
- Detail panel with read/edit mode:
  - status toggle in read mode
  - edit fields for item details
  - multiline description and notes preservation
  - optional item link (hidden in read mode if empty)
- Local save/revert snapshot model.
- Undo/redo for status and item-edit actions only.

## Data Sources

### Spreadsheet-backed features
- Cash Loot and Spell Scrolls depend on script properties populated by initialization.

Named ranges used:
- `Investigation_DCs`
- `Gold_Tables`
- `InvestigationCheck_GoldValueMods`
- `GoldtoDice_Translation`
- `SpellScroll_Export`

Script properties used:
- `cleanedInvestigationData`
- `cleanedGoldData`
- `goldToDiceData`
- `highSuccessMod`
- `mediumSuccessMod`
- `lowSuccessMod`
- `failedCheckMod`
- `combinedSpellScrollData`
- `initializationComplete`

### Local-only feature
- Loot Chests currently runs on in-memory dummy state.
- It does not currently read/write spreadsheet chest data.

## Runtime Architecture

### Composition
- Root template: `Index.html`
- Include helper: `include(filename)` in `Code.js`
- Shared shell:
  - `header.html`
  - `global.css.html`
  - `v2-cards.css.html`
  - `buttons.css.html`
  - `tab-scripts.html`

### Tab shells and styles
- Cash Loot:
  - `goldcalculatorv2-shell.html`
  - `gold-v2.css.html`
  - `gold-v2-scripts.html`
- Spell Scrolls:
  - `spellscrollsv2-shell.html`
  - `spell-v2.css.html`
  - `spell-v2-scripts.html`
- Loot Chests:
  - `lootchests-shell.html`
  - `loot.css.html`
  - `loot-v2-scripts.html` (runtime bundle)

### Loot script authoring model
Loot logic is authored in split files:
- `loot-v2-scripts.state.html`
- `loot-v2-scripts.helpers.html`
- `loot-v2-scripts.render.html`
- `loot-v2-scripts.actions.html`
- `loot-v2-scripts.events-init.html`

Runtime includes the bundled file:
- `loot-v2-scripts.html`

When editing split files, you must rebuild/sync `loot-v2-scripts.html` before pushing.

## Styling Baseline
The current visual baseline is defined by Loot Chests and shared across tabs via tokens:
- shared shell width token
- shared card header sizing/padding token
- shared section header gradient family

Spell table styling was moved closer to Loot table behavior:
- compact row rhythm
- alternating row colors
- rounded header clipping
- left-aligned spell column header

## Dev Workflow

1. Make edits.
2. If loot split files changed, regenerate `loot-v2-scripts.html`.
3. Validate include expansion and script parse:
- `node scripts/validate-index.js`
4. Deploy:
- `clasp push`

## Local Tooling and Deployment
- `.claspignore` excludes local docs/scripts/tooling from deployment.
- `scripts/validate-index.js` validates unresolved template tags and JS parse safety after include expansion.

## Documentation Map
- `CODEX_CONTEXT.md` - detailed technical handoff.
- `docs/SMOKE_TEST.md` - regression checklist.
- `docs/LOOT_CHEST_V1_UI_SPEC.md` - current Loot Chests UI contract.
- `docs/LOOT_CHEST_HANDOFF.md` - next-phase implementation plan for real chest data.
