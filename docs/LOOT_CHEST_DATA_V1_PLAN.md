# Loot Chests Data v1 Plan (Sheets-Backed)

Last updated: 2026-02-27  
Owner: PPQ

## 1) Goal
Move `PPQ Loot Chests` from local prototype state to real spreadsheet-backed persistence with no UX regressions.

## 2) Scope / Non-Goals
In scope:
- Spreadsheet schema and bootstrap.
- Read/write pipeline for chest/group/token/item operations.
- Local-first queued save behavior.
- Backup checkpoint storage + restore.
- Local UI preference persistence.

Out of scope (later):
- CSV import/export tooling.
- Multi-user conflict merge UX.
- Full backend migration (Firestore/SQL).

## 3) Core Decisions
1. Google Sheets is source of truth for v1.
2. Data model is flat token rows first (debuggable, CSV-friendly, low risk).
3. Client is local-first with queued batched writes.
4. Save status is stateful (`Saved`, `Pending`, `Saving`, `Error`).
5. Undo only tracks undoable local actions; non-undoable ops never appear in undo log.

## 4) Sheet Tabs and Schema

## `LootTokens` (primary)
One row per token.

Required columns:
- `token_id` (immutable UUID)
- `chest_id`
- `chest_name`
- `group_key`
- `group_name`
- `theme_key`
- `token_number`
- `token_label`
- `status` (`IN_CHEST | AWARDED | UNUSED`)
- `item_name`
- `rarity`
- `type`
- `description`
- `item_link`
- `notes`
- `sort_key`
- `is_deleted` (`TRUE/FALSE`)
- `is_template` (`TRUE/FALSE`)
- `updated_at` (ISO timestamp)
- `updated_by` (optional user hint)

## `LootMeta`
Key/value config.

Columns:
- `meta_key`
- `meta_value`

Required keys:
- `schema_version`
- `data_version`
- `defaults_json`

## `LootLists`
Admin-editable list values.

Columns:
- `list_name` (e.g. `rarity`, `type`, `theme`, `status`)
- `list_key`
- `list_label`
- `sort_order`
- `is_active`

## `LootBackups`
Checkpoint snapshots.

Columns:
- `backup_id` (UUID)
- `created_at`
- `created_by`
- `label`
- `chest_id` (optional scope)
- `payload_json` (snapshot payload)

## 5) Local Preferences (browser-only)
Persist in `localStorage`:
- active status filters
- edit-first mode toggle
- last selected chest id
- last selected token id
- UI panel open/closed states

Do not store these in sheets.

## 6) Client State Model
Keep three state layers:
1. `persistedSnapshot` (last server-confirmed baseline)
2. `workingState` (current interactive UI state)
3. `checkpointSnapshot` (manual backup snapshot pointer/metadata)

Save/Revert rules:
- `Save` flushes queue and updates `persistedSnapshot`.
- `Revert` replaces `workingState` from `persistedSnapshot`.
- `Backup` stores/restores `checkpointSnapshot` separately.

## 7) Write Queue Rules (Exact)
Single-flight queue only.

Buffers:
- `pendingTokenPatches: Map<token_id, patch>`
- `pendingStructuralOps: Array<op>`
- `inFlightBatch: batch | null`

Flush triggers:
- Debounced auto-flush: `800ms` after last change.
- Max wait cap: force flush at `3000ms`.
- Manual save action: flush immediately.

Batch order:
1. chest ops
2. group ops
3. token range ops
4. token field/status patches

Coalescing:
- Token edits merge by `token_id` (last field value wins).
- Create+delete same entity before flush cancels out.
- Delete token drops pending token patch.

Failure handling:
- Restore failed batch to pending.
- UI state => `Error`.
- Retry backoff: `1s, 2s, 4s, 8s, 15s, 30s` (cap 30s).

## 8) Read / Cache Strategy
Client:
- Load chest data once into memory.
- Maintain local cache copy for fast interactions.

Server:
- Cache reference lists / light reads for `5-15 minutes`.

Invalidation:
- Every successful write bumps `data_version` in `LootMeta`.
- Client compares version on load/tab-switch and every `60-120s` while active.

## 9) API Surface (Apps Script)
Required endpoints (response envelope `{ ok, data?, error? }`):
- `lootBootstrap()`
- `lootGetChest(chestId)`
- `lootCreateChest(payload)`
- `lootDeleteChest(chestId)`
- `lootCreateGroup(payload)`
- `lootUpdateGroup(payload)`
- `lootDeleteGroup(payload)`
- `lootApplyTokenRange(payload)`
- `lootUpdateItem(payload)`
- `lootSetStatus(payload)`
- `lootSaveCheckpoint(payload)`
- `lootRestoreCheckpoint(backupId)`

## 10) Template/Demo Data Rules
- Keep at least one protected template chest (`is_template = TRUE`).
- Template cannot be deleted.
- Support clone flow: `Create chest from template`.
- Optional `Reset demo` can recreate sample rows.

## 11) Performance Targets
- Chest bootstrap: target < 2s warm.
- Single flush: target < 1.2s.
- UI interaction latency: immediate (local-first), no blocking on save.

## 12) Rollout Sequence
1. Schema bootstrap + migration guards.
2. Read bootstrap pipeline.
3. Write queue + save status pipeline.
4. Chest/group/token operations.
5. Item/status writes.
6. Backup checkpoint integration.
7. Regression + tablet pass.
8. Optional CSV tooling.

## 13) Definition of Done (v1)
- Full Loot Chests flow works with real sheets.
- No UX regressions from local prototype.
- Save queue stable with retry behavior.
- Backup save/restore functional.
- `docs/SMOKE_TEST.md` pass plus new data-persistence cases.
