# Codex Context Handoff

Purpose: fast onboarding for a new Codex session.  
Scope: current Google Apps Script web app state, architecture, file map, behavior, and immediate next work.

## 1) Project Snapshot
- Personal GAS web app for DnD DM tooling.
- Legacy functionality is preserved while v2 tabs are built in parallel.
- Primary active work is UX and modularity in:
  - `Gold v2`
  - `Spell Scrolls v2`

Current tab order (intentional):
1. Gold v2
2. Spell Scrolls v2
3. Gold Calculator
4. Spell Scrolls
5. Beta Version

## 2) Runtime Architecture

### Server side (Apps Script)
- `Code.js`
  - `doGet()` initializes cached data (if needed) and serves `Index`.
  - Global logging and helper utilities.
  - Gold calculation pipeline (`calculateGoldAndLog`, `convertGoldToDice`, etc.).
- `initialization.js.js`
  - Loads named ranges into Script Properties for gold/investigation systems.
  - Initializes spell scroll data by calling `initializeSpellScrollData()`.
- `spell-scroll-initialization.js`
  - Builds/stores `combinedSpellScrollData` from named range `SpellScroll_Export`.
- `spell-scroll.js`
  - RPC endpoints used by both legacy and v2 Spell Scrolls:
    - `fetchSpellScrollData(level)`
    - `getSpellScrollDetail(level, index)`

### Client side (HTML/CSS/JS includes)
- `Index.html` is the composition root.
- Includes shared/legacy/v2 assets and scripts.
- Tabs are controlled by `header.html` + `tab-scripts.html`.

## 3) Key Files by Feature

### Shell and tab wiring
- `Index.html` - section containers, include order.
- `header.html` - tab buttons/order.
- `tab-scripts.html` - tab show/hide logic and emits `app:tab-changed`.

### Gold v2
- `goldcalculatorv2-shell.html`
- `gold-v2.css.html`
- `gold-v2-scripts.html`

### Spell Scrolls v2
- `spellscrollsv2-shell.html`
- `spell-v2.css.html`
- `spell-v2-scripts.html`

### Legacy (kept for reference/behavior parity)
- `table.html`, `investigation.html`, `gold-results.html`, related legacy scripts/css.
- `scroll-level-section.html`, `scroll-list-current.html`, `spell-stat-block.html`, `spell-scroll-scripts.html`.

## 4) Spell Scrolls v2: Current Behavior

### Data and list rendering
- Level buttons load spells via `fetchSpellScrollData(level)`.
- v2 normalizes ranges client-side to true d100 buckets (`1-100`), regardless of source range text.
- Adds a final `Re-Roll` row if bucket math leaves unused range.
- `Re-Roll` row is non-clickable.

### Detail panel
- Slide-out panel opens on row click.
- Detail fetch uses mapped `detailIndex` back to server source row.
- Click-off collapse works (excluding row clicks and filter area).

### Loading UX
- Floof loaders for list and detail fetch states.
- Detail title updates quickly during interactions.

### Random d100 interaction
- Step 2 header has `or` + interactive dice circle.
- On click:
  - Forces detail panel open.
  - Locks relevant interactions (row/filter/level controls).
  - Runs fast-to-slow roll sequence (~2.45s).
  - Cycles d100 value and spell-name preview in detail title.
  - Auto-rerolls internally if final result is `Re-Roll`.
  - Scrolls table viewport to final selected row if out of view.
  - Loads selected spell detail as normal.
- On tab switch away from Spell Scrolls v2:
  - Roll cancels.
  - Dice display resets to `??`.

## 5) Data Contracts and Named Ranges

### Script Properties keys used
- `cleanedInvestigationData`
- `cleanedGoldData`
- `goldToDiceData`
- `highSuccessMod`
- `mediumSuccessMod`
- `lowSuccessMod`
- `failedCheckMod`
- `combinedSpellScrollData`
- `initializationComplete` (and cache key of same meaning)

### Named ranges expected
- `Investigation_DCs`
- `Gold_Tables`
- `InvestigationCheck_GoldValueMods`
- `GoldtoDice_Translation`
- `SpellScroll_Export`

## 6) Known Caveats / Technical Debt
- `readme.md` is broad/historical; use this file for current coding context.
- `initialization.js.js` filename is odd (double `.js`) but currently used.
- In `spell-v2-scripts.html`, `listStatus` references an element removed from v2 shell; this is safe because `setStatus` guards null, but cleanup is pending.
- No automated tests; verification is manual in GAS web app.

## 7) Deploy and Verify Workflow
- Deploy changes with:
  - `clasp push`
- Then validate in browser against deployed web app.
- Recommended manual checks after Spell Scrolls v2 edits:
  1. Tab order and default tab behavior.
  2. Level load + list render.
  3. Row click detail open/close interactions.
  4. d100 roll lock/cancel/finalization.
  5. Re-Roll handling and out-of-view auto-scroll.
  6. Mobile/tablet breakpoints for headers/panel/table visibility.

## 8) Next Likely Work
- Continue header alignment polish (Step 2 with dice control) without changing Step 1/3 heights.
- Optional row pulse/highlight effects tied to roll ticks.
- Continue modular cleanup and removal of stale/no-op hooks once v2 is stable.

