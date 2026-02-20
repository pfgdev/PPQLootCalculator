# Loot Chest Handoff

Purpose: implementation packet for the Loot Chest workstream.
Last updated: 2026-02-20
Owner: PPQ

## 1) Product Goal
Create a fast DM-facing Loot Chest interface that replaces spreadsheet editing during live play.

Core principle:
- Minimize clicks and context switching during game sessions.

## 1.1) Current Technical Baseline (Post-Cleanup)
- Runtime UI is v2-only:
  - Gold v2
  - Spell Scrolls v2
- Legacy tabs and beta files were removed from runtime and repo.
- Shared v2 card primitives now live in `v2-cards.css.html`.
- RPC data contract is native object transport (not JSON strings).
- Initialization now uses `LockService` for safer first-load behavior.

Implication for Loot Chest:
- Build as a new v2-style feature, following current runtime patterns only.
- Avoid reintroducing legacy include patterns or JSON-string payload patterns.

## 2) Current Source of Truth (Spreadsheet)
Current model is a large unified table (`PPQ Magic Item Table`) containing:
- Filters: rarity, type.
- Item data: name, rarity, type, attunement, details.
- Pricing: sane price, DMG price, recommended value, override.
- Loot mapping: token and status (`In Box`, `Awarded`).
- Metrics: total items, available items, remaining value, average.

Current pain:
- Too large and dense for in-session use.
- Editing state and awarding state are mixed in one wide surface.

## 3) Phase Scope

### Phase 1 (build now)
- Read and display chest data.
- Quick status toggles (`IN_BOX` <-> `AWARDED`).
- Add item and edit item details.
- Keep metrics visible and updated.

### Phase 2
- Random sub-roll support (gems/art object bundles, etc.).
- Draw history and auditing.

### Phase 3
- Economy balancing helpers and advanced curation tools.

## 4) Functional Requirements (Phase 1)

User must be able to:
1. Select a chest.
2. See all items in that chest.
3. Search/filter quickly.
4. Mark item awarded or return to box quickly.
5. Add a new item with token and value fields.
6. Edit existing item fields.

Out of scope (phase 1):
- Probability authoring UI.
- Multi-user conflict resolution beyond last-write-wins.
- Full simulation tooling.

## 5) Proposed Sheet Schema (Normalized)

### `LootChests`
- `chest_id` (string, stable, required)
- `chest_name` (string, required)
- `is_active` (boolean, required)
- `notes` (string, optional)

### `LootItems`
- `item_id` (string, stable, required)
- `chest_id` (string FK, required)
- `loot_token` (string, required)
- `status` (enum: `IN_BOX` | `AWARDED`, required)
- `item_name` (string, required)
- `rarity` (string, optional)
- `type` (string, optional)
- `attunement_required` (boolean, optional)
- `details` (string, optional)
- `price_sane` (number, optional)
- `price_dmg` (number, optional)
- `price_recommended` (number, optional)
- `price_override` (number, optional)
- `updated_at` (ISO string or sheet datetime)

### Optional phase-2 tables
- `LootSubRolls`
- `LootDrawLog`

## 6) Value and Metrics Rules

### Effective value
`effective_value = price_override (if set) else price_recommended`

### Required metrics
- Total items
- Available items (`IN_BOX`)
- Remaining value (sum of available effective value)
- Current average (remaining value / available items)

## 7) API Contract (Apps Script)

Return envelope for all endpoints:
- success: `{ ok: true, data: ... }`
- failure: `{ ok: false, error: "message" }`

Phase-1 endpoints:
1. `getLootChestBootstrap()`
- chest list + top-level summaries

2. `getLootChestItems(chestId)`
- all rows for selected chest

3. `createLootItem(payload)`
- insert row

4. `updateLootItem(itemId, patch)`
- patch mutable fields

5. `setLootItemStatus(itemId, status)`
- quick status toggle

6. `getLootChestMetrics(chestId)`
- recomputed metrics

Optional phase 1.5:
7. `deleteLootItem(itemId)`
- soft-delete preferred if deletion is enabled

## 8) UI Contract (Phase 1)

Single dedicated tab with three zones:
1. Top control bar
- chest selector
- search input
- status/type/rarity filters
- add item button

2. Item table
- token
- status
- name
- type
- rarity
- effective value
- quick actions

3. Editor panel (side panel or modal)
- full item edit form
- save/cancel

UX targets:
- Primary actions should feel immediate after initial data load.
- Status toggle should be one click.
- Tablet layout is first-class.

## 9) Migration Plan from Existing Sheet

1. Snapshot existing sheet data (backup tab or export).
2. Define `chest_id` strategy.
3. Generate stable `item_id` values.
4. Map current columns into normalized schema.
5. Preserve token and status exactly.
6. Validate totals and averages against source sheet.
7. Switch UI reads to normalized schema.

## 10) Acceptance Criteria

1. DM can manage chest contents without opening spreadsheet editor.
2. Awarded/in-box toggles are reliable and fast.
3. Item add/edit flows are stable.
4. Metrics remain correct after all mutations.
5. Existing Gold v2 and Spell Scrolls v2 behavior is unchanged.

## 11) Manual Test Checklist

1. Load chest with mixed item states.
2. Toggle status across 10+ items quickly.
3. Edit override values and verify metric deltas.
4. Add item, reload app, verify persistence.
5. Filter/search by type and rarity.
6. Verify tablet layout and scroll behavior.
7. Validate empty-state chest behavior.

## 12) Open Decisions for PPQ

Resolved decisions:

1. Token uniqueness
- Tokens are unique per chest.
- One token maps to exactly one item.

2. Delete policy
- Use soft delete in phase 1.
- Deleted rows are hidden from normal DM flow and retained for recovery/testing.

3. Chest model / selection
- Support selecting a chest.
- Default behavior can be either:
  - load a default chest (recommended: active/default chest), or
  - restore last selected chest.
- For phase 1 implementation, start with a deterministic default chest load; optional remember-last behavior can be added after core flow is stable.

4. Status toggle vs edit mode
- Main view supports fast `AWARDED` <-> `IN_BOX` toggles.
- Editing item fields should be a separate edit flow (open item -> edit -> submit), not mixed inline with every control.

5. Economy detail scope
- Keep heavy economy valuation out of phase 1.
- Focus on chest operations and state management over gold-progress analytics.

## 13) Suggested Build Order

1. Add server read endpoints and schema guards.
2. Implement tab shell and read-only table.
3. Implement status toggles + metrics refresh.
4. Implement add/edit mode flow (separate from toggle flow).
5. Implement soft delete flow.
6. Add filters and search.
7. Add migration script/helpers.

## 14) New Session Prompt

Use this prompt to start implementation:

"Read `CODEX_CONTEXT.md` and `docs/LOOT_CHEST_HANDOFF.md`. Implement Loot Chest Phase 1 only. Keep Gold v2 and Spell Scrolls v2 unchanged. Start with schema/migration plan, then API, then UI in small testable increments."
