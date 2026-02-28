# Loot Chests Data v1 TODO

Last updated: 2026-02-28

Status legend:
- `[ ]` not started
- `[~]` in progress
- `[x]` complete
- `[!]` blocked/risk

## Phase 0: Baseline + Safety
- [x] Create feature flag for sheet-backed mode toggle.
- [x] Add schema version constant and migration guard in server code.
- [x] Add structured error logging for loot endpoints.
- [ ] Confirm current local-only smoke baseline still passes.

## Phase 1: Sheet Schema Bootstrap
- [x] Create/verify tabs: `LootTokens`, `LootMeta`, `LootLists`, `LootBackups`.
- [x] Create header rows exactly as defined in `LOOT_CHEST_DATA_V1_PLAN.md`.
- [x] Seed `LootMeta` required keys (`schema_version`, `data_version`, `defaults_json`).
- [x] Seed default `LootLists` rows (rarity/type/theme/status).
- [x] Seed protected template chest rows (`is_template = TRUE`).

## Phase 2: Read Pipeline
- [x] Implement `lootBootstrap()` endpoint.
- [x] Map sheet rows -> current client view model (no UI redesign).
- [x] Wire chest selector to real chest ids.
- [x] Keep demo fallback only if bootstrap fails hard.
- [~] Validate first-load chest selection behavior.

## Phase 3: Write Queue Infrastructure (Client)
- [x] Add pending buffers:
  - [x] token patches map
  - [x] structural ops queue
- [x] Add single-flight in-flight batch controller.
- [x] Implement coalescing rules.
- [x] Implement flush triggers (debounce + manual flush + max-wait guard).
- [x] Implement save state machine (`Saved`, `Pending`, `Saving`, `Error`).
- [x] Implement retry backoff rules.

## Phase 4: CRUD Endpoints
- [x] Implement chest CRUD endpoints (via `lootApplyOperations`).
- [x] Implement group CRUD endpoints (via `lootApplyOperations`).
- [x] Implement token range add/delete endpoint (via `lootApplyOperations`).
- [x] Implement token detail update endpoint (via `lootApplyOperations`).
- [x] Implement token status update endpoint (via `lootApplyOperations`).
- [x] Ensure non-undoable operations are excluded from undo log.

## Phase 5: Snapshot and Revert Behavior
- [x] On successful flush, refresh `persistedSnapshot`.
- [x] Keep `Revert` restoring from persisted snapshot.
- [ ] Validate no UX regression with edit locks and modal behavior.
- [ ] Ensure edit flow never silently drops changes.

## Phase 6: Backup Checkpoints
- [x] Implement `lootSaveCheckpoint(payload)`.
- [x] Implement `lootRestoreCheckpoint(backupId)`.
- [x] Wire Backup modal to real checkpoint persistence.
- [x] Ensure restore path is blocking + safe confirmation.

## Phase 7: Caching + Versioning
- [x] Add `data_version` bump on successful write batches.
- [x] Add bootstrap/version checks on load + tab switch.
- [x] Add background version poll (`60-120s`).
- [x] Add stale-data banner + manual refresh action.

## Phase 8: Validation + Hardening
- [x] Add validation for IDs, status enum, numeric range bounds, URL format tolerance.
- [x] Add server-side guardrails for template chest immutability/deletion.
- [x] Add race-safe handling for chest/group delete when selected item exists.
- [~] Validate conflict fallback (version conflict guard + refresh path implemented).

## Phase 9: Regression Test Pass
- [x] Run `node scripts/validate-index.js`.
- [ ] Run full visual/interaction `docs/SMOKE_TEST.md`.
- [ ] Add data-flow test cases:
  - [ ] queued save under rapid edits
  - [ ] retry after forced failure
  - [ ] backup save + restore
  - [ ] template clone + protection
  - [ ] local preference persistence
- [ ] Tablet-specific pass (focus/autofocus guards, modal behavior, scroll stability).
- [x] Auto-scroll token list to newly created token group so first-time group creation is visible immediately.
- [~] Detail panel hardening while save queue is active:
  - [x] Prevent first-open edit textarea oversize on unassigned items (deferred autosize after layout).
  - [x] Keep detail panel open when text-selection drag starts inside details and mouse-up lands outside.
  - [x] Token-cell status click updates open detail panel context when detail panel is already open.
  - [ ] Re-verify no regressions with rapid status changes + in-flight auto-save.

## Phase 10: Optional Post-v1
- [ ] CSV export from `LootTokens`.
- [ ] CSV import dry-run report (adds/updates/skips/errors).
- [ ] Upsert strategy by `token_id`, fallback by `chest+group+number`.
