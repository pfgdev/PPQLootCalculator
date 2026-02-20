# Codex Context Handoff

Purpose: fast onboarding for the next coding session with code-accurate state.
Last updated: 2026-02-20

## 1) Current Runtime Snapshot

### Active UI Exposure
Header currently exposes only:
1. `GoldCalculatorV2` (`Gold v2`)
2. `SpellScrollsV2` (`Spell Scrolls v2`)

### Deprecated Runtime
- Legacy `GoldCalculator`, `SpellScrolls`, and `BetaVersion` sections were removed from `Index.html`.
- Legacy tab assets/scripts were deleted from repo during cleanup.
- Recovery path is git history if any legacy fragment is needed again.

## 2) Composition and Boot Flow

### HTML Composition Root
- `Index.html`
  - Includes all CSS/script partials.
  - Defines each tab section.

### Page Boot
- `body onload="onPageLoad()"` in `Index.html`
- `onPageLoad()` in `main-scripts.html` calls server `initializeData()`.
- `tab-scripts.html` clicks first tab on `DOMContentLoaded` and emits `app:tab-changed` on tab switch.

## 3) Server-Side Function Map

### `Code.js`
- `doGet()`
  - initializes via cache gate + `LockService` and serves `Index` template.
- `include(filename)`
- Logging helpers (`addToLog`, `isLoggingEnabled`)
- Gold APIs:
  - `calculateGoldAndLog(inputs)`
  - `getGoldV2PreviewData()` (returns `{ byCr, modifiers, diceTable }`)
- Gold helpers:
  - `getInvestigationResultFromData`
  - `getGoldTarget`
  - `getModifier`
  - `convertGoldToDice`

### `initialization.js`
- `initializeData()` loads named ranges and script properties.
- Initialization path uses `LockService` to avoid concurrent first-load writes.
- Initializes:
  - investigation table
  - gold table
  - modifiers
  - gold-to-dice table
  - spell scroll export data
- `cacheProperties()` hydrates globals from Script Properties.

### Spell Scroll server files
- `spell-scroll-initialization.js`
  - `initializeSpellScrollData()` reads `SpellScroll_Export` and writes `combinedSpellScrollData`.
- `spell-scroll.js`
  - `fetchSpellScrollData(level)`
  - `getSpellScrollDetail(level, index)`
  - returns native objects/arrays (not JSON strings).

## 4) Gold v2 Behavior (Current)

Files:
- `goldcalculatorv2-shell.html`
- `gold-v2.css.html`
- `gold-v2-scripts.html`

Behavior:
- Step 1 table rows contain CR and Killed steppers plus derived preview columns (`Base Gold`, `DC (L/M/H)`).
- Remove-row button is in a left gutter attached to CR cell.
- Add row seeds CR from current bottom row CR.
- Step 2 controls check value and calculate/reset actions.
- Step 2 footer lane:
  - Starts with hint `Calculate to let Floof out`.
  - On first calculate, Floof lane unlocks and remains visible until reset.
  - Reset re-locks Floof lane and returns hint state.
- Calculation path:
  - Prefers client-side result using preview payload.
  - Falls back to server call if preview payload unavailable.

Important implementation details:
- Hold-to-repeat is implemented for CR/Killed/Check increment and decrement.
- Query time was intentionally removed from v2 UI.

## 5) Spell Scrolls v2 Behavior (Current)

Files:
- `spellscrollsv2-shell.html`
- `spell-v2.css.html`
- `spell-v2-scripts.html`

Behavior:
- Level buttons load rows from server by level.
- Client normalizes list into d100 buckets (`1-100`) and appends a non-clickable `Re-Roll` row if needed.
- Two side-by-side tables share a single scroll container.
- Row click opens detail panel and fetches server detail by `detailIndex`.
- Desktop: animated slide-out panel via CSS grid column transition.
- Narrow viewports: detail panel appears below list panel.
- Click-off collapse closes detail panel.
- d100 roll button:
  - animated roll ticks
  - interaction lock during roll
  - auto-reroll on `Re-Roll`
  - auto-scroll to final selected row
- Switching away from Spell Scrolls v2 tab cancels active roll and resets displayed roll value.

## 6) Data Contracts

### Named ranges
- `Investigation_DCs`
- `Gold_Tables`
- `InvestigationCheck_GoldValueMods`
- `GoldtoDice_Translation`
- `SpellScroll_Export`

### Script properties used
- `cleanedInvestigationData`
- `cleanedGoldData`
- `goldToDiceData`
- `highSuccessMod`
- `mediumSuccessMod`
- `lowSuccessMod`
- `failedCheckMod`
- `combinedSpellScrollData`
- `initializationComplete`

### Transport Contract
- Server-to-client RPC payloads are native objects/arrays.
- Do not introduce JSON-string RPC payloads for new work unless there is a strong reason.

## 7) Icon System (Explicitly Retained)

File:
- `icon-styles.css.html`

Capabilities retained:
- 5 predefined sizes:
  - `.icon-extrasmall`
  - `.icon-small`
  - `.icon-medium`
  - `.icon-large`
  - `.icon-extralarge`
- Border controls:
  - `.icon-border` + size-derived border widths
  - explicit override classes (`.icon-border-small`, etc.)
- Indicator overlays:
  - `.icon-indicator .icon-number`
  - positions (`.top-left`, `.top-right`, `.bottom-left`, `.bottom-right`)
  - shapes (`.rounded`, `.square`, `.circle`)
- Color systems:
  - generic `color-pair-*`
  - rarity `rarity-color-*`

## 8) Known Issues and Technical Debt

1. Server payloads are now native objects; keep new endpoints consistent with this pattern.
2. Initialization and cache logic is stable but still spread across `doGet()` and `initializeData()` paths.

## 9) Manual Smoke Test Checklist

After any nontrivial change:
1. Load app and confirm first visible tab is Gold v2.
2. Gold v2:
- Add/remove rows.
- Verify remove button hidden when single row remains.
- Verify derived row values update when CR/Killed changes.
- Calculate then Reset and verify Floof lane lock/unlock behavior.
3. Spell Scrolls v2:
- Load several levels.
- Filter list.
- Open detail, click-off collapse.
- Trigger d100 roll, verify lock and final selection.
- Switch tabs during roll and ensure cancellation/reset.
4. Tablet/mobile:
- Check header heights and no layout hitching.
- Check panel behavior and scroll interactions.

## 10) Next Workstream

Primary planned pivot is Loot Chest implementation.
Authoritative planning file:
- `docs/LOOT_CHEST_HANDOFF.md`
- `docs/SMOKE_TEST.md`

## 11) Start Prompt for New Session

"Read `CODEX_CONTEXT.md` and `docs/LOOT_CHEST_HANDOFF.md`. Start Phase 1 Loot Chest implementation only. Keep Gold v2 and Spell Scrolls v2 behavior unchanged. Propose migration steps first, then implement API + UI in small testable increments."

## 12) Dev Diagnostics

Useful quick checks while editing:

1. Verify all includes in `Index.html` resolve:
`$includes = Select-String -Path Index.html -Pattern \"include\\('([^']+)'\\)\" -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique; $missing = @(); foreach ($f in $includes) { if (-not (Test-Path $f)) { $missing += $f } }; if ($missing.Count -eq 0) { 'All Index includes resolve.' } else { 'Missing includes:'; $missing }`

2. Check for stale references to removed/legacy files:
`rg -n \"betaversionheader|price-is-right|table-scripts|spell-scroll-scripts|goldcalculatorheader|spellscrollsheader\" -g \"*.html\" -g \"*.js\" -g \"*.md\"`

3. Check for old JSON string transport patterns:
`rg -n \"JSON\\.parse\\(rawData\\)|return JSON\\.stringify\\(\" -g \"*.html\" -g \"*.js\"`

4. List changed files before push:
`git status --short`
