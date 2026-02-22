# Codex Context Handoff

Purpose: accurate technical snapshot for the next implementation session.
Last updated: 2026-02-21

## 1) Runtime Snapshot

### Active tabs (header labels)
1. `PPQ Cash Loot`
2. `PPQ Spell Scrolls`
3. `PPQ Loot Chests`

### Runtime status
- App is v2-only in `Index.html`.
- No legacy tab sections are included in active runtime.

## 2) Composition and Boot

### Entry and include model
- `Index.html` composes all tab shells/styles/scripts via `<?!= include('...') ?>`.
- `Code.js` provides `include(filename)` via:
  - `HtmlService.createTemplateFromFile(filename).evaluate().getContent()`

### Boot flow
- `body onload="onPageLoad()"` calls server `initializeData()` from `main-scripts.html`.
- Tab activation handled in `tab-scripts.html`.
- Tab switch emits `app:tab-changed` event.

## 3) Server Files

### `Code.js`
- `doGet()` with cached initialization gate + lock.
- `include(filename)` helper.
- Gold APIs:
  - `getGoldV2PreviewData()`
  - `calculateGoldAndLog(inputs)`

### `initialization.js`
- Reads named ranges and stores processed payloads to Script Properties.
- Uses lock to prevent concurrent first-run writes.

### Spell server
- `spell-scroll-initialization.js`
- `spell-scroll.js`
  - `fetchSpellScrollData(level)`
  - `getSpellScrollDetail(level, index)`

## 4) Tab Details

### PPQ Cash Loot
Files:
- `goldcalculatorv2-shell.html`
- `gold-v2.css.html`
- `gold-v2-scripts.html`

Behavior:
- Enemy rows with CR/killed steppers and removable rows.
- Add row seeds CR from last row.
- Live derived row data using preview payload.
- Check stepper.
- Calculate/reset with Floof lane behavior.
- Client-side compute when preview payload exists; server fallback otherwise.

### PPQ Spell Scrolls
Files:
- `spellscrollsv2-shell.html`
- `spell-v2.css.html`
- `spell-v2-scripts.html`

Behavior:
- Level picker and two-column list.
- Live filter.
- d100 roll control with interaction lock and reroll handling.
- Desktop slide-out detail card.
- Click-off detail close logic.
- Shared list scroll container.

### PPQ Loot Chests (local prototype)
Files:
- `lootchests-shell.html`
- `loot.css.html`
- `loot-v2-scripts.html` (runtime bundle)

Authored split files:
- `loot-v2-scripts.state.html`
- `loot-v2-scripts.helpers.html`
- `loot-v2-scripts.render.html`
- `loot-v2-scripts.actions.html`
- `loot-v2-scripts.events-init.html`

Behavior:
- Local in-memory chest/item model (no sheet persistence yet).
- Manage tabs:
  - `Manage Chests`
  - `Create Group`
  - `Manage Groups`
  - `Manage Tokens`
- Token list grouped by prefix with color themes.
- Status filters with counts.
- Detail panel with read/edit modes.
- Multiline description and notes support.
- Optional item link hidden in read mode when empty.
- Save/revert snapshot model.
- Undo/redo supports:
  - status toggle
  - item detail save
- Non-undoable actions do not populate undo log:
  - chest create/delete
  - group create/update/delete
  - token range add/delete

## 5) Styling Standardization State

Baseline now anchored on Loot Chests style tokens:
- Shared shell width token.
- Shared section header sizing/padding/gradient tokens.
- Consistent card header appearance across tabs.

Recent cross-tab alignment:
- Spell and Gold shell widths moved to shared max width token.
- Spell list table moved toward Loot table rhythm:
  - compact row sizing
  - alternating rows
  - rounded header clipping
  - left-aligned second column header

## 6) Data Contracts

### Spreadsheet-backed contracts
Named ranges:
- `Investigation_DCs`
- `Gold_Tables`
- `InvestigationCheck_GoldValueMods`
- `GoldtoDice_Translation`
- `SpellScroll_Export`

Script properties:
- `cleanedInvestigationData`
- `cleanedGoldData`
- `goldToDiceData`
- `highSuccessMod`
- `mediumSuccessMod`
- `lowSuccessMod`
- `failedCheckMod`
- `combinedSpellScrollData`
- `initializationComplete`

### Loot Chests data contract (current)
- Local only, dummy-generated chest/items.
- Working state and persisted snapshot both in client memory.

## 7) Tooling and Validation

### Deployment
- `clasp push`

### Pre-push validation
- `node scripts/validate-index.js`
  - expands includes
  - checks unresolved template tags
  - parses extracted script blocks for syntax errors

### Deploy exclusions
`.claspignore` excludes:
- `scripts/**`
- `docs/**`
- `readme.md`
- `CODEX_CONTEXT.md`
- `AGENTS.md`

## 8) Known Constraints

1. Loot bundle synchronization
- Runtime executes `loot-v2-scripts.html`.
- If split files are edited, bundle must be regenerated before push.

2. Loot persistence
- Not yet integrated with spreadsheet tabs.
- Current save/revert is local snapshot behavior only.

3. Include parsing sensitivity
- GAS HTML parsing can fail on escaped operators/entities in script output.
- Keep script bundle plain JS-safe text and validate before push.

## 9) Smoke Focus Areas

1. Tab switching and event continuity.
2. Cash Loot compute path and floof states.
3. Spell roll lock/cancel behavior and detail transitions.
4. Loot manage tab workflows and per-action enable/disable logic.
5. Loot detail panel close behavior (precise click zones).
6. Undo/redo semantics for supported actions only.

## 10) Recommended Next Workstreams

1. Implement real Loot Chest sheet IO with dedicated data tabs.
2. Keep current UI contract and swap local state layer for API-backed state.
3. Continue extracting shared style primitives once behavior stabilizes.
