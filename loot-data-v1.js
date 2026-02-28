/**
 * Loot Chests Data v1 (Sheets-backed) - Phase 0/1
 * - feature flag
 * - schema ensure + seed
 * - bootstrap read endpoint
 */

var LOOT_V1 = {
  FLAG_PROPERTY: 'lootV1SheetsEnabled',
  SCHEMA_PROPERTY: 'lootV1SchemaVersion',
  SCHEMA_VERSION: '1',
  TAB: {
    TOKENS: 'LootTokens',
    META: 'LootMeta',
    LISTS: 'LootLists',
    BACKUPS: 'LootBackups'
  },
  HEADER: {
    TOKENS: [
      'token_id',
      'chest_id',
      'chest_name',
      'group_key',
      'group_name',
      'theme_key',
      'token_number',
      'token_label',
      'status',
      'item_name',
      'rarity',
      'type',
      'description',
      'item_link',
      'notes',
      'sort_key',
      'is_deleted',
      'is_template',
      'updated_at',
      'updated_by'
    ],
    META: ['meta_key', 'meta_value'],
    LISTS: ['list_name', 'list_key', 'list_label', 'sort_order', 'is_active'],
    BACKUPS: ['backup_id', 'created_at', 'created_by', 'label', 'chest_id', 'payload_json']
  }
};

function lootV1IsEnabled() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(LOOT_V1.FLAG_PROPERTY);
  if (raw === null || raw === '') {
    // Default ON when unset to avoid silent local-only fallback.
    return true;
  }
  return raw === 'true';
}

function lootV1SetEnabled(enabled) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(LOOT_V1.FLAG_PROPERTY, enabled ? 'true' : 'false');
  lootV1Log_('info', 'lootV1SetEnabled', { enabled: enabled ? true : false });
  return { ok: true, data: { enabled: enabled ? true : false } };
}

function lootV1EnableSheetsMode() {
  return lootV1Safe_('lootV1EnableSheetsMode', function () {
    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;
    return lootV1SetEnabled(true);
  });
}

function lootV1DisableSheetsMode() {
  return lootV1Safe_('lootV1DisableSheetsMode', function () {
    return lootV1SetEnabled(false);
  });
}

function lootV1EnsureSchema() {
  return lootV1Safe_('lootV1EnsureSchema', function () {
    return lootV1EnsureSchemaInternal_();
  });
}

function lootBootstrap() {
  return lootV1Safe_('lootBootstrap', function () {
    if (!lootV1IsEnabled()) {
      return {
        mode: 'local',
        enabled: false,
        message: 'Loot sheets mode disabled. Client should use local prototype state.'
      };
    }

    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tokensSheet = ss.getSheetByName(LOOT_V1.TAB.TOKENS);
    var metaSheet = ss.getSheetByName(LOOT_V1.TAB.META);
    var listsSheet = ss.getSheetByName(LOOT_V1.TAB.LISTS);

    var meta = lootV1ReadMeta_(metaSheet);
    var lists = lootV1ReadLists_(listsSheet);
    var tokenRows = lootV1ReadTokenRows_(tokensSheet);

    var chestsById = {};
    var savedChests = lootV1ParseJsonSafe_(meta.chests_json, []);
    if (Array.isArray(savedChests)) {
      for (var c = 0; c < savedChests.length; c++) {
        var savedChest = savedChests[c] || {};
        var savedChestId = String(savedChest.chest_id || '').trim();
        if (!savedChestId) continue;
        if (savedChest.is_template === true) continue;
        chestsById[savedChestId] = {
          chest_id: savedChestId,
          chest_name: String(savedChest.chest_name || ''),
          is_template: savedChest.is_template === true
        };
      }
    }

    for (var i = 0; i < tokenRows.length; i++) {
      var row = tokenRows[i];
      if (row.is_deleted === true) continue;
      if (row.is_template === true) continue;
      var chestId = String(row.chest_id || '');
      if (!chestId) continue;
      if (!chestsById[chestId]) {
        chestsById[chestId] = {
          chest_id: chestId,
          chest_name: String(row.chest_name || ''),
          is_template: row.is_template === true
        };
      }
    }

    var chests = Object.keys(chestsById).map(function (id) { return chestsById[id]; });
    chests.sort(function (a, b) {
      return String(a.chest_name || '').localeCompare(String(b.chest_name || ''));
    });

    return {
      mode: 'sheets',
      enabled: true,
      schema_version: String(meta.schema_version || LOOT_V1.SCHEMA_VERSION),
      data_version: String(meta.data_version || '0'),
      defaults: lootV1ParseJsonSafe_(meta.defaults_json, {}),
      lists: lists,
      chests: chests,
      tokens: tokenRows.filter(function (row) {
        return row.is_deleted !== true && row.is_template !== true;
      })
    };
  });
}

function lootSaveSnapshot(payload) {
  return lootV1Safe_('lootSaveSnapshot', function () {
    if (!lootV1IsEnabled()) {
      return { ok: false, error: 'Loot sheets mode disabled.' };
    }

    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;

    var normalized = lootV1NormalizeClientSnapshot_(payload || {});
    if (!normalized.ok) return normalized;

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var tokensSheet = ss.getSheetByName(LOOT_V1.TAB.TOKENS);
      var metaSheet = ss.getSheetByName(LOOT_V1.TAB.META);
      var writeResult = lootV1WriteNormalizedSnapshot_(tokensSheet, metaSheet, normalized);
      if (!writeResult.ok) return writeResult;

      return {
        mode: 'sheets',
        enabled: true,
        data_version: writeResult.data.data_version,
        saved_token_count: normalized.data.rows.length,
        template_token_count: writeResult.data.template_token_count
      };
    } finally {
      try {
        lock.releaseLock();
      } catch (ignore) {}
    }
  });
}

function lootGetLatestCheckpoint() {
  return lootV1Safe_('lootGetLatestCheckpoint', function () {
    if (!lootV1IsEnabled()) {
      return { ok: false, error: 'Loot sheets mode disabled.' };
    }

    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var backupsSheet = ss.getSheetByName(LOOT_V1.TAB.BACKUPS);
    var checkpoint = lootV1GetLatestCheckpointRecord_(backupsSheet);
    return {
      mode: 'sheets',
      enabled: true,
      checkpoint: checkpoint || null
    };
  });
}

function lootGetDataVersion() {
  return lootV1Safe_('lootGetDataVersion', function () {
    if (!lootV1IsEnabled()) {
      return { ok: false, error: 'Loot sheets mode disabled.' };
    }

    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var metaSheet = ss.getSheetByName(LOOT_V1.TAB.META);
    var meta = lootV1ReadMeta_(metaSheet);
    return {
      mode: 'sheets',
      enabled: true,
      data_version: String(meta.data_version || '0')
    };
  });
}

function lootSaveCheckpoint(payload) {
  return lootV1Safe_('lootSaveCheckpoint', function () {
    if (!lootV1IsEnabled()) {
      return { ok: false, error: 'Loot sheets mode disabled.' };
    }

    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;

    var checkpointNormalized = lootV1NormalizeCheckpointPayload_(payload || {});
    if (!checkpointNormalized.ok) return checkpointNormalized;

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var backupsSheet = ss.getSheetByName(LOOT_V1.TAB.BACKUPS);
      var now = new Date();
      var nowIso = now.toISOString();
      var backupId = Utilities.getUuid();
      var label = lootV1NormalizeCheckpointLabel_(checkpointNormalized.data.label);
      var chestId = String(checkpointNormalized.data.chest_id || '').trim();
      var payloadJson = JSON.stringify(checkpointNormalized.data.snapshot);
      var createdBy = '';
      try {
        createdBy = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
      } catch (ignore) {}

      backupsSheet.getRange(backupsSheet.getLastRow() + 1, 1, 1, LOOT_V1.HEADER.BACKUPS.length).setValues([[
        backupId,
        nowIso,
        createdBy,
        label,
        chestId,
        payloadJson
      ]]);

      return {
        mode: 'sheets',
        enabled: true,
        checkpoint: {
          backup_id: backupId,
          created_at: nowIso,
          created_by: createdBy,
          label: label,
          chest_id: chestId
        }
      };
    } finally {
      try {
        lock.releaseLock();
      } catch (ignore) {}
    }
  });
}

function lootRestoreCheckpoint(payload) {
  return lootV1Safe_('lootRestoreCheckpoint', function () {
    if (!lootV1IsEnabled()) {
      return { ok: false, error: 'Loot sheets mode disabled.' };
    }

    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var tokensSheet = ss.getSheetByName(LOOT_V1.TAB.TOKENS);
      var metaSheet = ss.getSheetByName(LOOT_V1.TAB.META);
      var backupsSheet = ss.getSheetByName(LOOT_V1.TAB.BACKUPS);
      var backupId = String((payload && payload.backup_id) || '').trim();
      var checkpointRecord = lootV1GetCheckpointRecordById_(backupsSheet, backupId) || lootV1GetLatestCheckpointRecord_(backupsSheet, true);
      if (!checkpointRecord) {
        return { ok: false, error: 'No backup found to restore.' };
      }

      var snapshot = lootV1ParseJsonSafe_(checkpointRecord.payload_json, null);
      if (!snapshot || typeof snapshot !== 'object') {
        return { ok: false, error: 'Backup payload is invalid.' };
      }

      var normalizedSnapshot = lootV1NormalizeClientSnapshot_(snapshot);
      if (!normalizedSnapshot.ok) return normalizedSnapshot;

      var writeResult = lootV1WriteNormalizedSnapshot_(tokensSheet, metaSheet, normalizedSnapshot);
      if (!writeResult.ok) return writeResult;

      return {
        mode: 'sheets',
        enabled: true,
        data_version: writeResult.data.data_version,
        checkpoint: lootV1StripCheckpointPayload_(checkpointRecord, false),
        snapshot: snapshot
      };
    } finally {
      try {
        lock.releaseLock();
      } catch (ignore) {}
    }
  });
}

function lootApplyOperations(payload) {
  return lootV1Safe_('lootApplyOperations', function () {
    if (!lootV1IsEnabled()) {
      return { ok: false, error: 'Loot sheets mode disabled.' };
    }

    var ensureResult = lootV1EnsureSchemaInternal_();
    if (!ensureResult.ok) return ensureResult;

    var normalizedOps = lootV1NormalizeOperationsPayload_(payload || {});
    if (!normalizedOps.ok) return normalizedOps;

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var tokensSheet = ss.getSheetByName(LOOT_V1.TAB.TOKENS);
      var metaSheet = ss.getSheetByName(LOOT_V1.TAB.META);
      var meta = lootV1ReadMeta_(metaSheet);
      var currentDataVersion = String(meta.data_version || '0');
      var clientDataVersion = String(normalizedOps.data.data_version || '').trim();
      if (clientDataVersion && clientDataVersion !== currentDataVersion) {
        return {
          ok: false,
          error: 'Version conflict. Refresh to latest data before saving.',
          data: {
            code: 'VERSION_CONFLICT',
            server_data_version: currentDataVersion
          }
        };
      }
      var colCount = LOOT_V1.HEADER.TOKENS.length;
      var existingCount = Math.max(0, tokensSheet.getLastRow() - 1);
      var templateRows = [];
      var templateChestMap = {};
      var tokenMap = {};

      if (existingCount > 0) {
        var existingRows = tokensSheet.getRange(2, 1, existingCount, colCount).getValues();
        for (var i = 0; i < existingRows.length; i++) {
          var row = existingRows[i];
          var asObject = lootV1TokenRowToObject_(row);
          if (asObject.is_template === true && asObject.is_deleted !== true) {
            templateRows.push(row);
            var templateChestId = String(asObject.chest_id || '').trim();
            if (templateChestId) {
              templateChestMap[templateChestId] = {
                chest_id: templateChestId,
                chest_name: String(asObject.chest_name || '').trim() || templateChestId,
                is_template: true
              };
            }
            continue;
          }
          if (asObject.is_deleted === true) continue;
          if (!asObject.token_id) continue;
          tokenMap[asObject.token_id] = asObject;
        }
      }

      var operations = normalizedOps.data.operations;
      for (var opIndex = 0; opIndex < operations.length; opIndex++) {
        var op = operations[opIndex];
        var type = String(op.type || '');
        if (type === 'delete_chest') {
          var chestId = String(op.chest_id || '').trim();
          if (!chestId) continue;
          if (templateChestMap[chestId]) {
            return { ok: false, error: 'Template chest cannot be deleted: ' + chestId };
          }
          Object.keys(tokenMap).forEach(function (tokenId) {
            if (String(tokenMap[tokenId].chest_id || '') === chestId) {
              delete tokenMap[tokenId];
            }
          });
          continue;
        }
        if (type === 'delete_token') {
          var tokenIdToDelete = String(op.token_id || '').trim();
          if (!tokenIdToDelete) continue;
          delete tokenMap[tokenIdToDelete];
          continue;
        }
        if (type === 'upsert_token') {
          var normalizedToken = lootV1NormalizeOperationToken_(op.token || {}, normalizedOps.data.chestMap);
          if (!normalizedToken.ok) {
            return normalizedToken;
          }
          if (templateChestMap[String(normalizedToken.data.chest_id || '')]) {
            return {
              ok: false,
              error: 'Template chest is read-only: ' + String(normalizedToken.data.chest_id || ''),
              data: { code: 'TEMPLATE_CHEST_READ_ONLY' }
            };
          }
          tokenMap[normalizedToken.data.token_id] = normalizedToken.data;
        }
      }

      var finalChests = lootV1EnsureTemplateChestsInList_(normalizedOps.data.chests, templateChestMap);
      var finalChestMap = {};
      for (var chestIndex = 0; chestIndex < finalChests.length; chestIndex++) {
        finalChestMap[String(finalChests[chestIndex].chest_id || '')] = finalChests[chestIndex];
      }
      Object.keys(tokenMap).forEach(function (tokenId) {
        var token = tokenMap[tokenId];
        if (!finalChestMap[token.chest_id]) {
          delete tokenMap[tokenId];
        }
      });

      var outputRows = templateRows.slice();
      var normalizedRows = Object.keys(tokenMap).map(function (tokenId) {
        return tokenMap[tokenId];
      });
      normalizedRows.sort(function (a, b) {
        var chestDiff = String(a.chest_name || '').localeCompare(String(b.chest_name || ''));
        if (chestDiff !== 0) return chestDiff;
        var groupDiff = String(a.group_key || '').localeCompare(String(b.group_key || ''));
        if (groupDiff !== 0) return groupDiff;
        return String(a.sort_key || '').localeCompare(String(b.sort_key || ''));
      });
      for (var rowIndex = 0; rowIndex < normalizedRows.length; rowIndex++) {
        outputRows.push(lootV1TokenObjectToRow_(normalizedRows[rowIndex]));
      }

      if (existingCount > 0) {
        tokensSheet.getRange(2, 1, existingCount, colCount).clearContent();
      }
      if (outputRows.length) {
        tokensSheet.getRange(2, 1, outputRows.length, colCount).setValues(outputRows);
      }

      lootV1SetMetaValue_(metaSheet, 'chests_json', JSON.stringify(finalChests));
      var nextVersion = lootV1BumpDataVersion_(metaSheet);

      return {
        mode: 'sheets',
        enabled: true,
        data_version: nextVersion,
        operation_count: operations.length,
        saved_token_count: normalizedRows.length,
        template_token_count: templateRows.length
      };
    } finally {
      try {
        lock.releaseLock();
      } catch (ignore) {}
    }
  });
}

function lootV1EnsureSchemaInternal_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { ok: false, error: 'No active spreadsheet found.' };
    }

    var tokensSheet = lootV1EnsureSheet_(ss, LOOT_V1.TAB.TOKENS, LOOT_V1.HEADER.TOKENS);
    if (!tokensSheet.ok) return tokensSheet;

    var metaSheet = lootV1EnsureSheet_(ss, LOOT_V1.TAB.META, LOOT_V1.HEADER.META);
    if (!metaSheet.ok) return metaSheet;

    var listsSheet = lootV1EnsureSheet_(ss, LOOT_V1.TAB.LISTS, LOOT_V1.HEADER.LISTS);
    if (!listsSheet.ok) return listsSheet;

    var backupsSheet = lootV1EnsureSheet_(ss, LOOT_V1.TAB.BACKUPS, LOOT_V1.HEADER.BACKUPS);
    if (!backupsSheet.ok) return backupsSheet;

    lootV1SeedMeta_(metaSheet.sheet);
    lootV1SeedLists_(listsSheet.sheet);
    lootV1EnsureTemplateChestRows_(tokensSheet.sheet);

    PropertiesService.getScriptProperties().setProperty(LOOT_V1.SCHEMA_PROPERTY, LOOT_V1.SCHEMA_VERSION);
    lootV1Log_('info', 'lootV1EnsureSchemaInternal', {
      spreadsheetId: ss.getId(),
      schemaVersion: LOOT_V1.SCHEMA_VERSION
    });
    return { ok: true, data: { schema_version: LOOT_V1.SCHEMA_VERSION } };
  } catch (error) {
    lootV1Log_('error', 'lootV1EnsureSchemaInternal', {
      message: error.message,
      stack: error.stack
    });
    return { ok: false, error: 'Schema ensure failed: ' + error.message };
  }
}

function lootV1EnsureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  var lastRow = sheet.getLastRow();
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  var existingHeader = lastRow > 0 ? headerRange.getValues()[0] : [];
  var hasAnyHeaderValue = existingHeader.some(function (v) { return String(v || '').trim() !== ''; });

  if (!hasAnyHeaderValue) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
    return { ok: true, sheet: sheet, action: 'header_created' };
  }

  var mismatch = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(existingHeader[i] || '').trim() !== String(headers[i])) {
      mismatch = true;
      break;
    }
  }

  if (!mismatch) {
    sheet.setFrozenRows(1);
    return { ok: true, sheet: sheet, action: 'header_ok' };
  }

  if (lastRow <= 1) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
    return { ok: true, sheet: sheet, action: 'header_overwritten_empty' };
  }

  return {
    ok: false,
    error: 'Header mismatch on sheet "' + name + '" with data rows present. Manual migration required.'
  };
}

function lootV1SeedMeta_(metaSheet) {
  var keyToValue = lootV1ReadMeta_(metaSheet);
  var defaults = {
    schema_version: LOOT_V1.SCHEMA_VERSION,
    data_version: '0',
    chests_json: '[]',
    defaults_json: JSON.stringify({
      default_status_filter: ['IN_CHEST', 'AWARDED'],
      default_edit_first: false
    })
  };

  var rowsToAppend = [];
  Object.keys(defaults).forEach(function (key) {
    if (String(keyToValue[key] || '') === '') {
      rowsToAppend.push([key, String(defaults[key])]);
    }
  });

  if (rowsToAppend.length) {
    metaSheet.getRange(metaSheet.getLastRow() + 1, 1, rowsToAppend.length, 2).setValues(rowsToAppend);
  }
}

function lootV1NormalizeOperationsPayload_(payload) {
  var chests = Array.isArray(payload.chests) ? payload.chests : [];
  var chestMap = {};
  var outChests = [];
  for (var i = 0; i < chests.length; i++) {
    var rawChest = chests[i] || {};
    var chestIdResult = lootV1NormalizeId_(rawChest.chest_id, 'chest_id');
    if (!chestIdResult.ok) {
      return { ok: false, error: 'Invalid chest at index ' + i + ': ' + chestIdResult.error };
    }
    var chestId = chestIdResult.data;
    if (!chestId || chestMap[chestId]) continue;
    if (rawChest.is_template === true) continue;
    var chestName = String(rawChest.chest_name || '').trim();
    var chestRecord = {
      chest_id: chestId,
      chest_name: chestName || chestId,
      is_template: false
    };
    chestMap[chestId] = chestRecord;
    outChests.push(chestRecord);
  }

  var operations = Array.isArray(payload.operations) ? payload.operations : [];
  var outOperations = [];
  for (var opIndex = 0; opIndex < operations.length; opIndex++) {
    var op = operations[opIndex] || {};
    var type = String(op.type || '').trim();
    if (type === 'delete_chest') {
      var chestIdDeleteResult = lootV1NormalizeId_(op.chest_id, 'chest_id');
      if (!chestIdDeleteResult.ok) {
        return { ok: false, error: 'Invalid delete_chest at index ' + opIndex + ': ' + chestIdDeleteResult.error };
      }
      var chestIdToDelete = chestIdDeleteResult.data;
      outOperations.push({ type: 'delete_chest', chest_id: chestIdToDelete });
      continue;
    }
    if (type === 'delete_token') {
      var tokenIdDeleteResult = lootV1NormalizeId_(op.token_id, 'token_id');
      if (!tokenIdDeleteResult.ok) {
        return { ok: false, error: 'Invalid delete_token at index ' + opIndex + ': ' + tokenIdDeleteResult.error };
      }
      var tokenId = tokenIdDeleteResult.data;
      outOperations.push({ type: 'delete_token', token_id: tokenId });
      continue;
    }
    if (type === 'upsert_token') {
      outOperations.push({ type: 'upsert_token', token: op.token || {} });
    }
  }

  outChests.sort(function (a, b) {
    return String(a.chest_name || '').localeCompare(String(b.chest_name || ''));
  });

  return {
    ok: true,
    data: {
      data_version: String(payload.data_version || '').trim(),
      chests: outChests,
      chestMap: chestMap,
      operations: outOperations
    }
  };
}

function lootV1NormalizeOperationToken_(token, chestMap) {
  var tokenIdResult = lootV1NormalizeId_(token.token_id || token.item_id, 'token_id');
  if (!tokenIdResult.ok) {
    return { ok: false, error: 'upsert_token ' + tokenIdResult.error };
  }
  var tokenId = tokenIdResult.data;

  var chestIdResult = lootV1NormalizeId_(token.chest_id, 'chest_id');
  if (!chestIdResult.ok) {
    return { ok: false, error: 'upsert_token ' + chestIdResult.error };
  }
  var chestId = chestIdResult.data;

  var chest = chestMap && chestMap[chestId] ? chestMap[chestId] : null;
  if (!chest) {
    return { ok: false, error: 'upsert_token chest_id not found in chest list: ' + chestId };
  }
  var chestName = chest ? String(chest.chest_name || chestId) : String(token.chest_name || chestId);
  var tokenLabel = String(token.token_label || token.token || '').trim();
  if (!tokenLabel) {
    return { ok: false, error: 'upsert_token missing token_label.' };
  }

  var tokenParts = lootV1ParseTokenParts_(tokenLabel);
  if (!Number.isFinite(tokenParts.number) || tokenParts.number < 1 || tokenParts.number > 999) {
    return { ok: false, error: 'upsert_token token_label must end with number 1-999: ' + tokenLabel };
  }
  var groupName = String(token.group_name || token.category_label || '').trim() || tokenParts.prefix || 'Group';
  var groupKey = lootV1NormalizeKey_(groupName);
  var themeKey = lootV1NormalizeThemeKey_(token.theme_key || token.color_theme || '');
  var hasTokenNumber = !(token.token_number == null || String(token.token_number).trim() === '');
  var tokenNumber = Number(token.token_number);
  if (hasTokenNumber) {
    if (!Number.isFinite(tokenNumber) || Math.floor(tokenNumber) !== tokenNumber || tokenNumber < 1 || tokenNumber > 999) {
      return { ok: false, error: 'upsert_token token_number must be an integer between 1 and 999.' };
    }
    if (Number(tokenParts.number) !== tokenNumber) {
      return { ok: false, error: 'upsert_token token_number does not match token_label.' };
    }
  } else {
    tokenNumber = Number(tokenParts.number);
  }

  var statusResult = lootV1NormalizeStatusStrict_(token.status);
  if (!statusResult.ok) {
    return { ok: false, error: 'upsert_token ' + statusResult.error };
  }
  var status = statusResult.data;
  var rarity = String(token.rarity || '').trim();
  var type = String(token.type || '').trim();
  var itemName = String(token.item_name || '').trim();
  var description = String(token.description || '');
  var itemLinkResult = lootV1NormalizeExternalUrl_(token.item_link || token.item_url || '');
  if (!itemLinkResult.ok) {
    return { ok: false, error: 'upsert_token ' + itemLinkResult.error };
  }
  var itemLink = itemLinkResult.data;
  var notes = String(token.notes || '');
  var sortKey = groupKey + '|' + ('000000' + String(tokenNumber)).slice(-6) + '|' + tokenLabel.toLowerCase();
  var nowIso = new Date().toISOString();
  var updatedBy = '';
  try {
    updatedBy = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
  } catch (ignore) {}

  return {
    ok: true,
    data: {
      token_id: tokenId,
      chest_id: chestId,
      chest_name: chestName,
      group_key: groupKey,
      group_name: groupName,
      theme_key: themeKey,
      token_number: tokenNumber,
      token_label: tokenLabel,
      status: status,
      item_name: itemName,
      rarity: rarity,
      type: type,
      description: description,
      item_link: itemLink,
      notes: notes,
      sort_key: sortKey,
      is_deleted: false,
      is_template: false,
      updated_at: nowIso,
      updated_by: updatedBy
    }
  };
}

function lootV1TokenObjectToRow_(token) {
  return [
    String(token.token_id || ''),
    String(token.chest_id || ''),
    String(token.chest_name || ''),
    String(token.group_key || ''),
    String(token.group_name || ''),
    String(token.theme_key || ''),
    Number(token.token_number) || 0,
    String(token.token_label || ''),
    String(token.status || 'IN_CHEST'),
    String(token.item_name || ''),
    String(token.rarity || ''),
    String(token.type || ''),
    String(token.description || ''),
    String(token.item_link || ''),
    String(token.notes || ''),
    String(token.sort_key || ''),
    String(token.is_deleted === true ? 'TRUE' : 'FALSE'),
    String(token.is_template === true ? 'TRUE' : 'FALSE'),
    String(token.updated_at || ''),
    String(token.updated_by || '')
  ];
}

function lootV1NormalizeClientSnapshot_(payload) {
  var chests = Array.isArray(payload.chests) ? payload.chests : [];
  var itemsByChest = payload.itemsByChest && typeof payload.itemsByChest === 'object'
    ? payload.itemsByChest
    : {};

  var chestMap = {};
  var outChests = [];
  for (var i = 0; i < chests.length; i++) {
    var chest = chests[i] || {};
    var chestIdResult = lootV1NormalizeId_(chest.chest_id, 'chest_id');
    if (!chestIdResult.ok) {
      return { ok: false, error: 'Invalid chest at index ' + i + ': ' + chestIdResult.error };
    }
    var chestId = chestIdResult.data;
    if (chest.is_template === true) continue;
    if (chestMap[chestId]) continue;
    var chestName = String(chest.chest_name || '').trim();
    var record = {
      chest_id: chestId,
      chest_name: chestName || chestId,
      is_template: chest.is_template === true
    };
    chestMap[chestId] = record;
    outChests.push(record);
  }

  var nowIso = new Date().toISOString();
  var updatedBy = '';
  try {
    updatedBy = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
  } catch (ignore) {}

  var rows = [];
  var invalidSnapshotError = '';
  Object.keys(itemsByChest).forEach(function (chestId) {
    if (invalidSnapshotError) return;
    var chestIdResult = lootV1NormalizeId_(chestId, 'chest_id');
    if (!chestIdResult.ok) {
      invalidSnapshotError = chestIdResult.error;
      return;
    }
    var safeChestId = chestIdResult.data;
    var rawItems = Array.isArray(itemsByChest[chestId]) ? itemsByChest[chestId] : [];
    if (!chestMap[safeChestId]) {
      chestMap[safeChestId] = { chest_id: safeChestId, chest_name: safeChestId, is_template: false };
      outChests.push(chestMap[safeChestId]);
    }
    var chestName = String(chestMap[safeChestId].chest_name || safeChestId);

    for (var j = 0; j < rawItems.length; j++) {
      if (invalidSnapshotError) break;
      var item = rawItems[j] || {};
      if (item.deleted === true) continue;

      var tokenLabel = String(item.token || '').trim();
      if (!tokenLabel) {
        invalidSnapshotError = 'Item missing token label at chest ' + safeChestId + ' index ' + j + '.';
        break;
      }

      var tokenParts = lootV1ParseTokenParts_(tokenLabel);
      if (!Number.isFinite(tokenParts.number) || tokenParts.number < 1 || tokenParts.number > 999) {
        invalidSnapshotError = 'Token label must end with number 1-999: ' + tokenLabel + '.';
        break;
      }
      var groupName = String(item.category_label || '').trim() || tokenParts.prefix || 'Group';
      var groupKey = lootV1NormalizeKey_(groupName);
      var themeKey = lootV1NormalizeThemeKey_(item.color_theme || '');
      var tokenIdResult = lootV1NormalizeId_(item.item_id, 'item_id');
      if (!tokenIdResult.ok) {
        invalidSnapshotError = 'Invalid token id for "' + tokenLabel + '": ' + tokenIdResult.error;
        break;
      }
      var tokenId = tokenIdResult.data;
      var statusResult = lootV1NormalizeStatusStrict_(item.status);
      if (!statusResult.ok) {
        invalidSnapshotError = 'Invalid status for "' + tokenLabel + '": ' + statusResult.error;
        break;
      }
      var status = statusResult.data;
      var rarity = String(item.rarity || '').trim();
      var type = String(item.type || '').trim();
      var tokenNumber = Number(tokenParts.number);
      var itemLinkResult = lootV1NormalizeExternalUrl_(item.item_url || item.item_link || '');
      if (!itemLinkResult.ok) {
        invalidSnapshotError = 'Invalid item link for "' + tokenLabel + '": ' + itemLinkResult.error;
        break;
      }
      var sortKey = groupKey + '|' + ('000000' + String(tokenNumber)).slice(-6) + '|' + tokenLabel.toLowerCase();

      rows.push([
        tokenId,
        safeChestId,
        chestName,
        groupKey,
        groupName,
        themeKey,
        tokenNumber,
        tokenLabel,
        status,
        String(item.item_name || '').trim(),
        rarity,
        type,
        String(item.description || ''),
        itemLinkResult.data,
        String(item.notes || ''),
        sortKey,
        'FALSE',
        'FALSE',
        nowIso,
        updatedBy
      ]);
    }
  });

  if (invalidSnapshotError) {
    return { ok: false, error: invalidSnapshotError };
  }

  rows.sort(function (a, b) {
    var chestDiff = String(a[2] || '').localeCompare(String(b[2] || ''));
    if (chestDiff !== 0) return chestDiff;
    var groupDiff = String(a[3] || '').localeCompare(String(b[3] || ''));
    if (groupDiff !== 0) return groupDiff;
    return String(a[15] || '').localeCompare(String(b[15] || ''));
  });

  return { ok: true, data: { chests: outChests, rows: rows } };
}

function lootV1ParseTokenParts_(token) {
  var normalized = String(token || '').trim().replace(/\s+/g, ' ');
  var match = normalized.match(/^(.*?)(\d+)$/);
  if (!match) {
    return { prefix: normalized, number: Number.POSITIVE_INFINITY };
  }
  return {
    prefix: String(match[1] || '').trim(),
    number: Number(match[2])
  };
}

function lootV1NormalizeKey_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function lootV1NormalizeThemeKey_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '');
}

function lootV1NormalizeStatusStrict_(status) {
  var safe = String(status || '').trim().toUpperCase();
  if (safe === 'IN_CHEST') return { ok: true, data: 'IN_CHEST' };
  if (safe === 'AWARDED') return { ok: true, data: 'AWARDED' };
  if (safe === 'UNUSED' || safe === 'INACTIVE') return { ok: true, data: 'UNUSED' };
  return { ok: false, error: 'status must be IN_CHEST, AWARDED, or UNUSED.' };
}

function lootV1NormalizeId_(value, fieldName) {
  var safe = String(value == null ? '' : value).trim();
  var label = String(fieldName || 'id');
  if (!safe) return { ok: false, error: label + ' is required.' };
  if (safe.length > 128) return { ok: false, error: label + ' exceeds 128 characters.' };
  if (!/^[A-Za-z0-9._:-]+$/.test(safe)) {
    return { ok: false, error: label + ' contains unsupported characters.' };
  }
  return { ok: true, data: safe };
}

function lootV1NormalizeExternalUrl_(value) {
  var safe = String(value == null ? '' : value).trim();
  if (!safe) return { ok: true, data: '' };
  if (/\s/.test(safe)) return { ok: false, error: 'item_link cannot contain spaces.' };

  var candidate = safe;
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(candidate)) {
    candidate = 'https://' + candidate;
  }

  if (!/^https?:\/\/[^\/\s?#]+(?:[\/?#].*)?$/i.test(candidate)) {
    return { ok: false, error: 'item_link must be a valid http(s) URL.' };
  }

  return { ok: true, data: candidate };
}

function lootV1WriteNormalizedSnapshot_(tokensSheet, metaSheet, normalizedSnapshot) {
  if (!normalizedSnapshot || !normalizedSnapshot.ok || !normalizedSnapshot.data) {
    return { ok: false, error: 'Invalid normalized snapshot.' };
  }

  var colCount = LOOT_V1.HEADER.TOKENS.length;
  var existingCount = Math.max(0, tokensSheet.getLastRow() - 1);
  var templateRows = [];
  var templateChestMap = {};
  if (existingCount > 0) {
    var existingRows = tokensSheet.getRange(2, 1, existingCount, colCount).getValues();
    for (var i = 0; i < existingRows.length; i++) {
      var row = existingRows[i];
      var rowObject = lootV1TokenRowToObject_(row);
      if (rowObject.is_template === true && rowObject.is_deleted !== true) {
        templateRows.push(row);
        var templateChestId = String(rowObject.chest_id || '').trim();
        if (templateChestId) {
          templateChestMap[templateChestId] = {
            chest_id: templateChestId,
            chest_name: String(rowObject.chest_name || '').trim() || templateChestId,
            is_template: true
          };
        }
      }
    }
    tokensSheet.getRange(2, 1, existingCount, colCount).clearContent();
  }

  var mutableRows = (normalizedSnapshot.data.rows || []).filter(function (row) {
    var chestId = String((row && row[1]) || '').trim();
    return !templateChestMap[chestId];
  });

  var outputRows = templateRows.concat(mutableRows);
  if (outputRows.length) {
    tokensSheet.getRange(2, 1, outputRows.length, colCount).setValues(outputRows);
  }

  var finalChests = lootV1EnsureTemplateChestsInList_(normalizedSnapshot.data.chests || [], templateChestMap);
  lootV1SetMetaValue_(metaSheet, 'chests_json', JSON.stringify(finalChests));
  var nextVersion = lootV1BumpDataVersion_(metaSheet);

  return {
    ok: true,
    data: {
      data_version: nextVersion,
      template_token_count: templateRows.length
    }
  };
}

function lootV1NormalizeCheckpointLabel_(value) {
  var safe = String(value == null ? '' : value).trim();
  if (!safe) return 'Manual Backup';
  return safe.substring(0, 80);
}

function lootV1NormalizeCheckpointPayload_(payload) {
  var input = payload && payload.snapshot ? payload.snapshot : payload;
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Backup payload is required.' };
  }

  var snapshot = {
    chests: Array.isArray(input.chests) ? input.chests : [],
    itemsByChest: input.itemsByChest && typeof input.itemsByChest === 'object' ? input.itemsByChest : {}
  };

  var normalizedSnapshot = lootV1NormalizeClientSnapshot_(snapshot);
  if (!normalizedSnapshot.ok) return normalizedSnapshot;

  var selectedChestId = String((payload && payload.chest_id) || '').trim();
  return {
    ok: true,
    data: {
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      chest_id: selectedChestId,
      label: payload && payload.label ? payload.label : ''
    }
  };
}

function lootV1GetLatestCheckpointRecord_(backupsSheet, includePayload) {
  if (!backupsSheet) return null;
  var rowCount = backupsSheet.getLastRow();
  if (rowCount <= 1) return null;
  var values = backupsSheet.getRange(2, 1, rowCount - 1, LOOT_V1.HEADER.BACKUPS.length).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var record = lootV1BackupRowToObject_(values[i]);
    if (record && record.backup_id && record.payload_json) {
      return lootV1StripCheckpointPayload_(record, includePayload === true);
    }
  }
  return null;
}

function lootV1GetCheckpointRecordById_(backupsSheet, backupId) {
  var safeId = String(backupId || '').trim();
  if (!backupsSheet || !safeId) return null;
  var rowCount = backupsSheet.getLastRow();
  if (rowCount <= 1) return null;
  var values = backupsSheet.getRange(2, 1, rowCount - 1, LOOT_V1.HEADER.BACKUPS.length).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var record = lootV1BackupRowToObject_(values[i]);
    if (!record) continue;
    if (String(record.backup_id || '') === safeId) {
      return record;
    }
  }
  return null;
}

function lootV1BackupRowToObject_(row) {
  if (!row) return null;
  return {
    backup_id: String(row[0] || ''),
    created_at: String(row[1] || ''),
    created_by: String(row[2] || ''),
    label: String(row[3] || ''),
    chest_id: String(row[4] || ''),
    payload_json: String(row[5] || '')
  };
}

function lootV1StripCheckpointPayload_(record, includePayload) {
  if (!record) return null;
  var out = {
    backup_id: String(record.backup_id || ''),
    created_at: String(record.created_at || ''),
    created_by: String(record.created_by || ''),
    label: String(record.label || ''),
    chest_id: String(record.chest_id || '')
  };
  if (includePayload === true) {
    out.payload_json = String(record.payload_json || '');
  }
  return out;
}

function lootV1EnsureTemplateChestsInList_(chests, templateChestMap) {
  var out = [];
  var indexByChestId = {};
  var input = Array.isArray(chests) ? chests : [];
  for (var i = 0; i < input.length; i++) {
    var chest = input[i] || {};
    var chestId = String(chest.chest_id || '').trim();
    if (!chestId || Object.prototype.hasOwnProperty.call(indexByChestId, chestId)) continue;
    var chestName = String(chest.chest_name || '').trim() || chestId;
    out.push({
      chest_id: chestId,
      chest_name: chestName,
      is_template: chest.is_template === true
    });
    indexByChestId[chestId] = out.length - 1;
  }

  var templateMap = templateChestMap || {};
  Object.keys(templateMap).forEach(function (templateChestId) {
    var templateEntry = templateMap[templateChestId] || {};
    if (!Object.prototype.hasOwnProperty.call(indexByChestId, templateChestId)) {
      out.push({
        chest_id: templateChestId,
        chest_name: String(templateEntry.chest_name || '').trim() || templateChestId,
        is_template: true
      });
      indexByChestId[templateChestId] = out.length - 1;
      return;
    }
    var existingIndex = indexByChestId[templateChestId];
    out[existingIndex].is_template = true;
    if (!String(out[existingIndex].chest_name || '').trim()) {
      out[existingIndex].chest_name = String(templateEntry.chest_name || '').trim() || templateChestId;
    }
  });

  out.sort(function (a, b) {
    return String(a.chest_name || '').localeCompare(String(b.chest_name || ''), undefined, { sensitivity: 'base' });
  });
  return out;
}

function lootV1SetMetaValue_(metaSheet, key, value) {
  var rowCount = metaSheet.getLastRow();
  var safeValue = String(value == null ? '' : value);
  if (rowCount <= 1) {
    metaSheet.getRange(2, 1, 1, 2).setValues([[String(key), safeValue]]);
    return;
  }

  var rows = metaSheet.getRange(2, 1, rowCount - 1, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    var rowKey = String(rows[i][0] || '').trim();
    if (rowKey === String(key)) {
      metaSheet.getRange(i + 2, 2).setValue(safeValue);
      return;
    }
  }
  metaSheet.getRange(rowCount + 1, 1, 1, 2).setValues([[String(key), safeValue]]);
}

function lootV1BumpDataVersion_(metaSheet) {
  var meta = lootV1ReadMeta_(metaSheet);
  var current = Number(meta.data_version || 0);
  if (!Number.isFinite(current) || current < 0) current = 0;
  var next = String(current + 1);
  lootV1SetMetaValue_(metaSheet, 'data_version', next);
  return next;
}

function lootV1SeedLists_(listsSheet) {
  var rows = listsSheet.getLastRow() > 1
    ? listsSheet.getRange(2, 1, listsSheet.getLastRow() - 1, LOOT_V1.HEADER.LISTS.length).getValues()
    : [];
  if (rows.length) return;

  var seed = [];
  var rarities = ['--', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];
  var types = ['--', 'Ammunition', 'Armor', 'Consumables', 'Gems & Treasure', 'Rings', 'Rods & Wands', 'Shields', 'Spell Scrolls', 'Weapons', 'Wondrous Items', 'Other', 'n/a'];
  var themes = ['Blue', 'Lt. Blue', 'Orange', 'Yellow', 'Red', 'Pink', 'Green', 'Lt. Green', 'Purple', 'Lt. Purple', 'White', 'Black', 'Gray'];
  var statuses = [
    { key: 'IN_CHEST', label: 'In Chest' },
    { key: 'AWARDED', label: 'Awarded' },
    { key: 'UNUSED', label: 'Unused' }
  ];

  for (var i = 0; i < rarities.length; i++) seed.push(['rarity', rarities[i], rarities[i], i + 1, 'TRUE']);
  for (var j = 0; j < types.length; j++) seed.push(['type', types[j], types[j], j + 1, 'TRUE']);
  for (var k = 0; k < themes.length; k++) seed.push(['theme', themes[k], themes[k], k + 1, 'TRUE']);
  for (var s = 0; s < statuses.length; s++) seed.push(['status', statuses[s].key, statuses[s].label, s + 1, 'TRUE']);

  listsSheet.getRange(2, 1, seed.length, LOOT_V1.HEADER.LISTS.length).setValues(seed);
}

function lootV1EnsureTemplateChestRows_(tokensSheet) {
  var rows = lootV1ReadTokenRows_(tokensSheet);
  var hasTemplate = rows.some(function (row) { return row.is_template === true; });
  if (hasTemplate) return;

  var nowIso = new Date().toISOString();
  var chestId = 'template-main';
  var chestName = 'Main Campaign Chest (Template)';
  var groupKey = 'blue';
  var groupName = 'Blue';
  var sample = [
    ['template-token-1', chestId, chestName, groupKey, groupName, 'Blue', 1, 'Blue 1', 'IN_CHEST', 'Potion of Healing', 'Common', 'Consumables', 'Regain 2d4 + 2 hit points.', '', '', 'blue|0001', 'FALSE', 'TRUE', nowIso, 'system'],
    ['template-token-2', chestId, chestName, groupKey, groupName, 'Blue', 2, 'Blue 2', 'UNUSED', '', '--', '--', '', '', '', 'blue|0002', 'FALSE', 'TRUE', nowIso, 'system'],
    ['template-token-3', chestId, chestName, groupKey, groupName, 'Blue', 3, 'Blue 3', 'AWARDED', 'Oil of Slipperiness', 'Uncommon', 'Consumables', 'Coats a creature and grants freedom of movement.', '', '', 'blue|0003', 'FALSE', 'TRUE', nowIso, 'system']
  ];

  tokensSheet.getRange(tokensSheet.getLastRow() + 1, 1, sample.length, LOOT_V1.HEADER.TOKENS.length).setValues(sample);
}

function lootV1ReadMeta_(metaSheet) {
  var rowCount = metaSheet.getLastRow();
  if (rowCount <= 1) return {};
  var rows = metaSheet.getRange(2, 1, rowCount - 1, 2).getValues();
  var obj = {};
  for (var i = 0; i < rows.length; i++) {
    var key = String(rows[i][0] || '').trim();
    if (!key) continue;
    obj[key] = String(rows[i][1] || '');
  }
  return obj;
}

function lootV1ReadLists_(listsSheet) {
  var rowCount = listsSheet.getLastRow();
  if (rowCount <= 1) return {};
  var rows = listsSheet.getRange(2, 1, rowCount - 1, LOOT_V1.HEADER.LISTS.length).getValues();
  var grouped = {};
  for (var i = 0; i < rows.length; i++) {
    var listName = String(rows[i][0] || '').trim();
    if (!listName) continue;
    if (!grouped[listName]) grouped[listName] = [];
    grouped[listName].push({
      key: String(rows[i][1] || ''),
      label: String(rows[i][2] || ''),
      sort_order: Number(rows[i][3]) || 0,
      is_active: String(rows[i][4] || '').toUpperCase() !== 'FALSE'
    });
  }

  Object.keys(grouped).forEach(function (name) {
    grouped[name].sort(function (a, b) { return a.sort_order - b.sort_order; });
  });
  return grouped;
}

function lootV1ReadTokenRows_(tokensSheet) {
  var rowCount = tokensSheet.getLastRow();
  if (rowCount <= 1) return [];
  var colCount = LOOT_V1.HEADER.TOKENS.length;
  var values = tokensSheet.getRange(2, 1, rowCount - 1, colCount).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    rows.push(lootV1TokenRowToObject_(values[i]));
  }
  return rows;
}

function lootV1TokenRowToObject_(row) {
  return {
    token_id: String(row[0] || ''),
    chest_id: String(row[1] || ''),
    chest_name: String(row[2] || ''),
    group_key: String(row[3] || ''),
    group_name: String(row[4] || ''),
    theme_key: String(row[5] || ''),
    token_number: Number(row[6]) || 0,
    token_label: String(row[7] || ''),
    status: String(row[8] || 'UNUSED'),
    item_name: String(row[9] || ''),
    rarity: String(row[10] || '--'),
    type: String(row[11] || '--'),
    description: String(row[12] || ''),
    item_link: String(row[13] || ''),
    notes: String(row[14] || ''),
    sort_key: String(row[15] || ''),
    is_deleted: String(row[16] || '').toUpperCase() === 'TRUE',
    is_template: String(row[17] || '').toUpperCase() === 'TRUE',
    updated_at: String(row[18] || ''),
    updated_by: String(row[19] || '')
  };
}

function lootV1ParseJsonSafe_(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function lootV1Safe_(eventName, fn) {
  try {
    var result = fn();
    if (result && typeof result.ok === 'boolean') {
      return result;
    }
    return { ok: true, data: result };
  } catch (error) {
    lootV1Log_('error', eventName, {
      message: error.message,
      stack: error.stack
    });
    return { ok: false, error: eventName + ': ' + error.message };
  }
}

function lootV1Log_(level, eventName, details) {
  var payload = {
    t: new Date().toISOString(),
    level: String(level || 'info'),
    event: String(eventName || ''),
    details: details || {}
  };

  // Structured logs for Cloud logs / Apps Script execution logs.
  console.log(JSON.stringify(payload));

  // Keep compatibility with existing optional in-memory log stream.
  if (typeof addToLog === 'function') {
    try {
      addToLog('[loot-v1][' + payload.level + '] ' + payload.event + ' ' + JSON.stringify(payload.details));
    } catch (ignore) {}
  }
}
