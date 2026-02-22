# Loot Chests Handoff (Phase: Real Data Integration)

Purpose: define next implementation phase to move Loot Chests from local prototype to spreadsheet-backed application.
Last updated: 2026-02-21
Owner: PPQ

## 1) Current Baseline

What exists today:
- Full local prototype UI and interaction model is implemented.
- Manage workflows are stable for chest/group/token operations in local state.
- Detail panel edit/read UX is stable.
- Save/Revert and Undo/Redo semantics are implemented for local model.

What does not exist yet:
- Spreadsheet-backed Loot Chests persistence.
- Dedicated GAS endpoints for chest/group/token CRUD.
- Migration path from local model to sheet-backed model.

## 2) Primary Goal for Next Phase
Make `PPQ Loot Chests` a real application backed by spreadsheet tabs while preserving current UX and interaction speed.

Non-goal:
- Do not redesign the core UI while integrating data.

## 3) Recommended Data Model (Sheet Tabs)

### `LootChests`
Columns:
- `chest_id` (stable key)
- `chest_name`
- `is_active` (optional)
- `updated_at`

### `LootItems`
Columns:
- `item_id` (stable key)
- `chest_id` (FK)
- `token`
- `status` (`IN_CHEST`, `AWARDED`, `UNUSED`)
- `item_name`
- `rarity`
- `type`
- `description`
- `item_url`
- `notes`
- `color_theme`
- `category_label`
- `deleted` (soft delete flag)
- `updated_at`

## 4) API Surface (Apps Script)

Suggested server endpoints:
1. `getLootBootstrap()`
- returns chest list + selected/default chest + initial items

2. `getLootChestItems(chestId)`
- returns all active/non-deleted items for chest

3. `createLootChest(payload)`
4. `deleteLootChest(chestId)`
5. `createLootGroup(payload)`
6. `updateLootGroup(payload)`
7. `deleteLootGroup(payload)`
8. `applyLootTokenRange(payload)`
9. `updateLootItem(payload)`
10. `setLootItemStatus(payload)`

Response envelope convention:
- success: `{ ok: true, data: ... }`
- failure: `{ ok: false, error: "..." }`

## 5) Migration Strategy

1. Add server endpoints behind feature flag or branch.
2. Keep current client UI, replace local state source with API bootstrap.
3. Keep working vs persisted model in client for perceived speed.
4. On Save/Revert:
- Save commits batched changes to server.
- Revert rehydrates from last server snapshot.
5. Preserve current undo scope for status + item edits only.

## 6) Performance and UX Requirements

1. No heavy sheet reads on every click.
2. Maintain instant local interactions during play.
3. Use save batching to avoid frequent round trips.
4. Keep current click-off and detail behavior unchanged.

## 7) Safety Rules to Keep

1. Chest delete requires confirm second action.
2. Group delete requires confirm second action.
3. Name conflicts blocked for chest/group.
4. Token collisions blocked during group update/range add.
5. Soft delete for tokens/groups to reduce irreversible data loss risk.

## 8) Testing Requirements

Before shipping sheet-backed mode:
1. Full regression from `docs/SMOKE_TEST.md` must pass.
2. New tests:
- network failure handling
- stale selection handling after delete
- save conflict behavior (single-user assumption fallback)
- id stability after repeated save/reload cycles

## 9) Suggested Build Order

1. Create data tabs + schema constants in server code.
2. Add bootstrap read endpoint.
3. Add chest CRUD endpoints.
4. Add group/token operations.
5. Add item/status save endpoints.
6. Switch client state provider from dummy data to bootstrap payload.
7. Wire Save/Revert to server snapshot endpoints.
8. Run full smoke + tablet pass.

## 10) Start Prompt for Next Session

"Read `CODEX_CONTEXT.md`, `docs/SMOKE_TEST.md`, and `docs/LOOT_CHEST_V1_UI_SPEC.md`. Implement Loot Chests spreadsheet persistence behind the current UI with no UX regressions. Start with bootstrap read, then chest CRUD, then group/token, then item/status save paths."
