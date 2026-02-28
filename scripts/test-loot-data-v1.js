#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

class MockScriptProperties {
  constructor() {
    this.map = new Map();
  }
  getProperty(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setProperty(key, value) {
    this.map.set(String(key), String(value));
    return this;
  }
}

function isBlankCell(value) {
  return value === "" || value === null || value === undefined;
}

class MockRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const row = [];
      for (let c = 0; c < this.numCols; c += 1) {
        row.push(this.sheet.getCell(this.row + r, this.col + c));
      }
      out.push(row);
    }
    return out;
  }
  setValues(values) {
    if (!Array.isArray(values) || values.length !== this.numRows) {
      throw new Error("setValues row mismatch");
    }
    for (let r = 0; r < this.numRows; r += 1) {
      const rowValues = values[r];
      if (!Array.isArray(rowValues) || rowValues.length !== this.numCols) {
        throw new Error("setValues column mismatch");
      }
      for (let c = 0; c < this.numCols; c += 1) {
        this.sheet.setCell(this.row + r, this.col + c, rowValues[c]);
      }
    }
    return this;
  }
  setValue(value) {
    return this.setValues([[value]]);
  }
  clearContent() {
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numCols; c += 1) {
        this.sheet.setCell(this.row + r, this.col + c, "");
      }
    }
    return this;
  }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
    this.frozenRows = 0;
  }
  getLastRow() {
    for (let i = this.rows.length - 1; i >= 0; i -= 1) {
      const row = this.rows[i] || [];
      if (row.some((cell) => !isBlankCell(cell))) {
        return i + 1;
      }
    }
    return 0;
  }
  setFrozenRows(count) {
    this.frozenRows = Number(count) || 0;
  }
  getRange(row, col, numRows, numCols) {
    const safeRow = Number(row);
    const safeCol = Number(col);
    const safeNumRows = Number(numRows == null ? 1 : numRows);
    const safeNumCols = Number(numCols == null ? 1 : numCols);
    if (!Number.isFinite(safeRow) || !Number.isFinite(safeCol) || safeRow < 1 || safeCol < 1) {
      throw new Error("Invalid range coordinates");
    }
    if (!Number.isFinite(safeNumRows) || !Number.isFinite(safeNumCols) || safeNumRows < 1 || safeNumCols < 1) {
      throw new Error("Invalid range size");
    }
    return new MockRange(this, safeRow, safeCol, safeNumRows, safeNumCols);
  }
  getCell(row, col) {
    const r = row - 1;
    const c = col - 1;
    if (!this.rows[r]) return "";
    return this.rows[r][c] == null ? "" : this.rows[r][c];
  }
  setCell(row, col, value) {
    const r = row - 1;
    const c = col - 1;
    while (this.rows.length <= r) this.rows.push([]);
    const targetRow = this.rows[r];
    while (targetRow.length <= c) targetRow.push("");
    targetRow[c] = value;
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = new Map();
    this.id = "mock-spreadsheet-1";
  }
  getSheetByName(name) {
    return this.sheets.has(name) ? this.sheets.get(name) : null;
  }
  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
  getId() {
    return this.id;
  }
}

function createEnvironment() {
  const spreadsheet = new MockSpreadsheet();
  const properties = new MockScriptProperties();
  let uuidCounter = 1;

  global.PropertiesService = {
    getScriptProperties() {
      return properties;
    }
  };
  global.SpreadsheetApp = {
    getActiveSpreadsheet() {
      return spreadsheet;
    }
  };
  global.LockService = {
    getScriptLock() {
      return {
        waitLock() {},
        releaseLock() {}
      };
    }
  };
  global.Session = {
    getActiveUser() {
      return { getEmail() { return "tester@example.com"; } };
    },
    getEffectiveUser() {
      return { getEmail() { return "tester@example.com"; } };
    }
  };
  global.Utilities = {
    getUuid() {
      const id = "uuid-" + String(uuidCounter);
      uuidCounter += 1;
      return id;
    }
  };
  global.addToLog = function () {};

  return { spreadsheet, properties };
}

function loadLootDataFile() {
  const target = path.join(process.cwd(), "loot-data-v1.js");
  const code = fs.readFileSync(target, "utf8");
  vm.runInThisContext(code, { filename: "loot-data-v1.js" });
}

function assertOk(response, context) {
  assert(response && typeof response === "object", context + " returned no response");
  assert.strictEqual(response.ok, true, context + " failed: " + JSON.stringify(response));
  return response.data;
}

function assertNotOk(response, context) {
  assert(response && typeof response === "object", context + " returned no response");
  assert.strictEqual(response.ok, false, context + " expected failure: " + JSON.stringify(response));
  return response;
}

function groupTokensByChest(tokens) {
  const out = {};
  (tokens || []).forEach((token) => {
    const chestId = String(token.chest_id || "");
    if (!chestId) return;
    if (!out[chestId]) out[chestId] = [];
    out[chestId].push({
      item_id: token.token_id,
      chest_id: token.chest_id,
      token: token.token_label,
      status: token.status,
      item_name: token.item_name,
      rarity: token.rarity,
      type: token.type,
      description: token.description,
      item_url: token.item_link,
      notes: token.notes,
      color_theme: token.theme_key,
      category_label: token.group_name,
      deleted: false
    });
  });
  return out;
}

function asVersion(value, context) {
  const n = Number(value);
  assert(Number.isFinite(n), context + " should be numeric");
  return n;
}

function assertVersionBumped(resultData, previousVersion, context) {
  const nextVersion = asVersion(resultData.data_version, context + " data_version");
  assert.strictEqual(
    nextVersion,
    previousVersion + 1,
    context + " should bump version by exactly 1"
  );
  return nextVersion;
}

function run() {
  createEnvironment();
  loadLootDataFile();

  const disableData = assertOk(lootV1DisableSheetsMode(), "lootV1DisableSheetsMode");
  assert.strictEqual(disableData.enabled, false, "Feature flag should be disabled");

  const disabledBootstrap = assertOk(lootBootstrap(), "lootBootstrap (disabled)");
  assert.strictEqual(disabledBootstrap.mode, "local", "Disabled mode should return local");
  assertNotOk(lootGetDataVersion(), "lootGetDataVersion (disabled)");
  assertNotOk(lootSaveSnapshot({}), "lootSaveSnapshot (disabled)");

  const enableData = assertOk(lootV1EnableSheetsMode(), "lootV1EnableSheetsMode");
  assert.strictEqual(enableData.enabled, true, "Feature flag should be enabled");

  const bootstrap1 = assertOk(lootBootstrap(), "lootBootstrap (enabled)");
  assert.strictEqual(bootstrap1.mode, "sheets", "Enabled mode should return sheets");
  assert.strictEqual(bootstrap1.data_version, "0", "Initial data version should be 0");
  assert(bootstrap1.lists && bootstrap1.lists.theme && bootstrap1.lists.theme.length > 0, "Theme list should be seeded");
  assert.strictEqual((bootstrap1.tokens || []).length, 0, "Template tokens should not leak into bootstrap tokens");
  assert.strictEqual((bootstrap1.chests || []).length, 0, "Template chest should not leak into bootstrap chests");
  assert.strictEqual((assertOk(lootGetLatestCheckpoint(), "lootGetLatestCheckpoint initial").checkpoint), null, "No checkpoint should exist initially");
  assert((lootV1ReadTokenRows_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LootTokens")) || []).some((row) => row.is_template === true), "Template rows should exist internally");

  let currentVersion = asVersion(assertOk(lootGetDataVersion(), "lootGetDataVersion initial").data_version, "initial data_version");

  const snapshotPayload = {
    chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
    itemsByChest: {
      main_campaign: [
        {
          item_id: "main_campaign_item_1",
          token: "Blue 1",
          status: "IN_CHEST",
          item_name: "Potion of Healing",
          rarity: "Common",
          type: "Consumables",
          description: "Heals hp.",
          item_url: "dndbeyond.com/items/1",
          notes: "Session 1",
          color_theme: "blue",
          category_label: "Blue"
        },
        {
          item_id: "main_campaign_item_2",
          token: "Blue 2",
          status: "UNUSED",
          item_name: "",
          rarity: "--",
          type: "--",
          description: "",
          item_url: "",
          notes: "",
          color_theme: "blue",
          category_label: "Blue"
        }
      ]
    }
  };
  const saveSnapshotData = assertOk(lootSaveSnapshot(snapshotPayload), "lootSaveSnapshot");
  currentVersion = assertVersionBumped(saveSnapshotData, currentVersion, "lootSaveSnapshot");
  assert.strictEqual(
    asVersion(assertOk(lootGetDataVersion(), "lootGetDataVersion after snapshot").data_version, "post-snapshot version"),
    currentVersion,
    "Version endpoint should match after snapshot save"
  );

  const bootstrap2 = assertOk(lootBootstrap(), "lootBootstrap after snapshot");
  assert.strictEqual(bootstrap2.tokens.length, 2, "Should load saved non-template tokens");
  assert.strictEqual(bootstrap2.chests.length, 1, "Should expose one mutable chest");

  const conflictResponse = assertNotOk(
    lootApplyOperations({
      data_version: "0",
      chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
      operations: []
    }),
    "lootApplyOperations version conflict"
  );
  assert.strictEqual(conflictResponse.data.code, "VERSION_CONFLICT", "Should return VERSION_CONFLICT");

  const updateOpsData = assertOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
      operations: [
        {
          type: "upsert_token",
          token: {
            token_id: "main_campaign_item_1",
            chest_id: "main_campaign",
            token_label: "Blue 1",
            token_number: 1,
            group_name: "Blue",
            theme_key: "blue",
            status: "INACTIVE",
            item_name: "Potion of Healing",
            rarity: "Common",
            type: "Consumables",
            description: "Heals hp.",
            item_link: "dndbeyond.com/items/1",
            notes: "Session 1 updated"
          }
        }
      ]
    }),
    "lootApplyOperations upsert"
  );
  currentVersion = assertVersionBumped(updateOpsData, currentVersion, "lootApplyOperations upsert");

  const bootstrap3 = assertOk(lootBootstrap(), "lootBootstrap after upsert");
  const blue1 = bootstrap3.tokens.find((row) => row.token_id === "main_campaign_item_1");
  assert(blue1, "Blue 1 should exist after upsert");
  assert.strictEqual(blue1.status, "UNUSED", "INACTIVE alias should normalize to UNUSED");
  assert.strictEqual(blue1.item_link, "https://dndbeyond.com/items/1", "URL should normalize with https:// prefix");

  const invalidUrlResponse = assertNotOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
      operations: [
        {
          type: "upsert_token",
          token: {
            token_id: "main_campaign_item_1",
            chest_id: "main_campaign",
            token_label: "Blue 1",
            token_number: 1,
            group_name: "Blue",
            theme_key: "blue",
            status: "AWARDED",
            item_name: "Potion of Healing",
            rarity: "Common",
            type: "Consumables",
            description: "Heals hp.",
            item_link: "bad url with space",
            notes: "Session 1 updated"
          }
        }
      ]
    }),
    "lootApplyOperations invalid URL"
  );
  assert(
    /item_link/.test(String(invalidUrlResponse.error || "")),
    "Invalid URL error should mention item_link"
  );

  const tokenMismatchResponse = assertNotOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
      operations: [
        {
          type: "upsert_token",
          token: {
            token_id: "main_campaign_item_2",
            chest_id: "main_campaign",
            token_label: "Blue 2",
            token_number: 3,
            group_name: "Blue",
            theme_key: "blue",
            status: "UNUSED",
            item_name: "",
            rarity: "--",
            type: "--",
            description: "",
            item_link: "",
            notes: ""
          }
        }
      ]
    }),
    "lootApplyOperations token number mismatch"
  );
  assert(/token_number does not match token_label/.test(String(tokenMismatchResponse.error || "")), "Token mismatch should be rejected");

  const invalidChestIdResponse = assertNotOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [{ chest_id: "bad id", chest_name: "Bad Id Chest" }],
      operations: []
    }),
    "lootApplyOperations invalid chest id"
  );
  assert(/unsupported characters/.test(String(invalidChestIdResponse.error || "")), "Invalid chest id should be rejected");

  const createSecondChestData = assertOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [
        { chest_id: "main_campaign", chest_name: "Main Campaign Chest" },
        { chest_id: "side_quest", chest_name: "Side Quest Chest" }
      ],
      operations: [
        {
          type: "upsert_token",
          token: {
            token_id: "side_quest_item_1",
            chest_id: "side_quest",
            token_label: "Orange 1",
            token_number: 1,
            group_name: "Orange",
            theme_key: "orange",
            status: "IN_CHEST",
            item_name: "Cloak of Elvenkind",
            rarity: "Uncommon",
            type: "Wondrous Items",
            description: "A side-quest reward.",
            item_link: "https://dndbeyond.com/items/side",
            notes: "Created in operation batch."
          }
        }
      ]
    }),
    "lootApplyOperations create second chest + token"
  );
  currentVersion = assertVersionBumped(createSecondChestData, currentVersion, "lootApplyOperations create chest");

  const bootstrapWithSecondChest = assertOk(lootBootstrap(), "lootBootstrap with second chest");
  assert.strictEqual(bootstrapWithSecondChest.chests.length, 2, "Two mutable chests should exist");
  assert(bootstrapWithSecondChest.tokens.some((row) => row.token_id === "side_quest_item_1"), "Side chest token should exist");

  const deleteTokenData = assertOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [
        { chest_id: "main_campaign", chest_name: "Main Campaign Chest" },
        { chest_id: "side_quest", chest_name: "Side Quest Chest" }
      ],
      operations: [{ type: "delete_token", token_id: "side_quest_item_1" }]
    }),
    "lootApplyOperations delete token"
  );
  currentVersion = assertVersionBumped(deleteTokenData, currentVersion, "lootApplyOperations delete token");

  const bootstrapAfterDeleteToken = assertOk(lootBootstrap(), "lootBootstrap after delete token");
  assert(!bootstrapAfterDeleteToken.tokens.some((row) => row.token_id === "side_quest_item_1"), "Deleted token should be removed");

  const deleteChestData = assertOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
      operations: [{ type: "delete_chest", chest_id: "side_quest" }]
    }),
    "lootApplyOperations delete chest"
  );
  currentVersion = assertVersionBumped(deleteChestData, currentVersion, "lootApplyOperations delete chest");

  const bootstrapAfterDeleteChest = assertOk(lootBootstrap(), "lootBootstrap after delete chest");
  assert.strictEqual(bootstrapAfterDeleteChest.chests.length, 1, "Deleted chest should be removed from chest list");

  const templateDeleteResponse = assertNotOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
      operations: [{ type: "delete_chest", chest_id: "template-main" }]
    }),
    "lootApplyOperations template delete guard"
  );
  assert(
    /Template chest cannot be deleted/.test(String(templateDeleteResponse.error || "")),
    "Template delete should be rejected"
  );

  const checkpointSnapshot = {
    chests: bootstrap3.chests,
    itemsByChest: groupTokensByChest(bootstrap3.tokens)
  };
  const saveCheckpointData = assertOk(
    lootSaveCheckpoint({
      chest_id: "main_campaign",
      label: "Checkpoint A",
      snapshot: checkpointSnapshot
    }),
    "lootSaveCheckpoint"
  );
  assert(saveCheckpointData.checkpoint && saveCheckpointData.checkpoint.backup_id, "Checkpoint should return backup id");
  const explicitLatestCheckpoint = assertOk(lootGetLatestCheckpoint(), "lootGetLatestCheckpoint after save");
  assert.strictEqual(explicitLatestCheckpoint.checkpoint.backup_id, saveCheckpointData.checkpoint.backup_id, "Latest checkpoint should match saved checkpoint");

  const mutateAfterCheckpoint = assertOk(
    lootApplyOperations({
      data_version: String(currentVersion),
      chests: [{ chest_id: "main_campaign", chest_name: "Main Campaign Chest" }],
      operations: [
        {
          type: "upsert_token",
          token: {
            token_id: "main_campaign_item_1",
            chest_id: "main_campaign",
            token_label: "Blue 1",
            token_number: 1,
            group_name: "Blue",
            theme_key: "blue",
            status: "IN_CHEST",
            item_name: "Potion of Healing",
            rarity: "Common",
            type: "Consumables",
            description: "Heals hp.",
            item_link: "https://dndbeyond.com/items/1",
            notes: "Mutated after checkpoint"
          }
        }
      ]
    }),
    "lootApplyOperations mutate after checkpoint"
  );
  currentVersion = assertVersionBumped(mutateAfterCheckpoint, currentVersion, "lootApplyOperations mutate after checkpoint");

  const latestCheckpoint = assertOk(lootGetLatestCheckpoint(), "lootGetLatestCheckpoint");
  assert(latestCheckpoint.checkpoint && latestCheckpoint.checkpoint.backup_id, "Latest checkpoint should be available");

  const restoreData = assertOk(
    lootRestoreCheckpoint({ backup_id: "does-not-exist" }),
    "lootRestoreCheckpoint fallback to latest"
  );
  currentVersion = assertVersionBumped(restoreData, currentVersion, "lootRestoreCheckpoint");
  assert(restoreData.snapshot && restoreData.snapshot.itemsByChest, "Restore should return snapshot");
  assert.strictEqual(
    restoreData.checkpoint.backup_id,
    saveCheckpointData.checkpoint.backup_id,
    "Restore should fall back to latest checkpoint when backup id is missing"
  );

  const bootstrap4 = assertOk(lootBootstrap(), "lootBootstrap after restore");
  const restoredBlue1 = bootstrap4.tokens.find((row) => row.token_id === "main_campaign_item_1");
  assert(restoredBlue1, "Blue 1 should exist after restore");
  assert.strictEqual(restoredBlue1.status, "UNUSED", "Restore should revert Blue 1 status to checkpoint");
  assert.strictEqual(restoredBlue1.notes, "Session 1 updated", "Restore should revert notes");
  assert.strictEqual(
    asVersion(assertOk(lootGetDataVersion(), "lootGetDataVersion final").data_version, "final version"),
    currentVersion,
    "Final data version should match endpoint"
  );

  console.log("PASS: loot-data-v1.js automated endpoint tests completed.");
}

try {
  run();
} catch (error) {
  console.error("FAIL:", error && error.stack ? error.stack : String(error));
  process.exit(1);
}
