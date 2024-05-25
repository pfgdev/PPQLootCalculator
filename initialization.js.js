//initialization.js.gs
function initializeData() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var isInitialized = scriptProperties.getProperty(initializationCompleteFlag);

  if (isInitialized) {
    addToLog('Skipping initialization as it is already completed at ' + new Date().toISOString());
    return 'Skipping initialization as it is already completed.';
  }

  addToLog('initializeData called at the start ' + new Date().toISOString());

  var investigationLog = initializeInvestigationData();
  var goldLog = initializeGoldData();
  var modsLog = initializeMods();
  var goldToDiceLog = initializeGoldToDiceTranslation();

  addToLog(investigationLog);
  addToLog(goldLog);
  addToLog(modsLog);
  addToLog(goldToDiceLog);

  scriptProperties.setProperty(initializationCompleteFlag, 'true'); // Mark as initialized
  addToLog('Script Properties set initializationComplete to true');

  addToLog('initializeData complete at ' + new Date().toISOString());
  return logMessages.filter(msg => msg !== 'initializeData complete').join("\n")
}

function initializeInvestigationData() {
  addToLog('initializeInvestigationData called');
  if (!investigationData) {
    var investigationRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Investigation_DCs');
    addToLog('Fetched Investigation_DCs range: ' + investigationRange);
    if (!investigationRange) {
      addToLog('Named range "Investigation_DCs" is missing.');
      return 'Named range "Investigation_DCs" is missing.';
    }
    investigationData = investigationRange.getValues();
    addToLog('Fetched investigation data: ' + JSON.stringify(investigationData));
    cleanedInvestigationData = investigationData.filter(row => row.some(cell => cell !== ''));
    addToLog('Cleaned investigation data: ' + JSON.stringify(cleanedInvestigationData));
    PropertiesService.getScriptProperties().setProperty('cleanedInvestigationData', JSON.stringify(cleanedInvestigationData));
    addToLog("Investigation Data initialized.");

    isInvestigationDataInitialized = true;
    return "Investigation Data initialized.";
  }
  return "Investigation Data already initialized.";
}

function initializeGoldData() {
  addToLog('initializeGoldData called');
  if (!goldData) {
    var goldTableRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('Gold_Tables');
    addToLog('Fetched Gold_Tables range: ' + goldTableRange);
    if (!goldTableRange) {
      addToLog('Named range "Gold_Tables" is missing.');
      return 'Named range "Gold_Tables" is missing.';
    }
    goldData = goldTableRange.getValues();
    addToLog('Fetched gold data: ' + JSON.stringify(goldData));
    cleanedGoldData = goldData.filter(row => row.some(cell => cell !== ''));
    addToLog('Cleaned gold data: ' + JSON.stringify(cleanedGoldData));
    PropertiesService.getScriptProperties().setProperty('cleanedGoldData', JSON.stringify(cleanedGoldData));
    return "Gold Data initialized.";
  }
  return "Gold Data already initialized.";
}

function initializeMods() {
  addToLog('initializeMods called');
  if (!highSuccessMod || !mediumSuccessMod || !lowSuccessMod || !failedCheckMod) {
    var modsRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('InvestigationCheck_GoldValueMods');
    addToLog('Fetched InvestigationCheck_GoldValueMods range: ' + modsRange);
    if (!modsRange) {
      addToLog('Named range "InvestigationCheck_GoldValueMods" is missing.');
      return 'Named range "InvestigationCheck_GoldValueMods" is missing.';
    }
    var modsData = modsRange.getValues();
    addToLog('Fetched mods data: ' + JSON.stringify(modsData));
    var scriptProperties = PropertiesService.getScriptProperties();
    modsData.slice(1).forEach(row => {
      switch (row[0]) {
        case CHECK_RESULT_HIGH:
          highSuccessMod = row[1];
          scriptProperties.setProperty('highSuccessMod', highSuccessMod);
          addToLog('High Success Modifier: ' + highSuccessMod);
          break;
        case CHECK_RESULT_MEDIUM:
          mediumSuccessMod = row[1];
          scriptProperties.setProperty('mediumSuccessMod', mediumSuccessMod);
          addToLog('Medium Success Modifier: ' + mediumSuccessMod);
          break;
        case CHECK_RESULT_LOW:
          lowSuccessMod = row[1];
          scriptProperties.setProperty('lowSuccessMod', lowSuccessMod);
          addToLog('Low Success Modifier: ' + lowSuccessMod);
          break;
        case CHECK_RESULT_FAIL:
          failedCheckMod = row[1];
          scriptProperties.setProperty('failedCheckMod', failedCheckMod);
          addToLog('Failed Check Modifier: ' + failedCheckMod);
          break;
      }
    });
    return "Modifiers initialized.";
  }
  return "Modifiers already initialized.";
}

function initializeGoldToDiceTranslation() {
  addToLog('initializeGoldToDiceTranslation called');
  var goldToDiceRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('GoldtoDice_Translation');
  if (!goldToDiceRange) {
    addToLog('Named range "GoldtoDice_Translation" is missing.');
    return 'Named range "GoldtoDice_Translation" is missing.';
  }
  var goldToDiceData = goldToDiceRange.getValues();
  PropertiesService.getScriptProperties().setProperty('goldToDiceData', JSON.stringify(goldToDiceData));
  addToLog("Gold to Dice Translation Data initialized.");
  return "Gold to Dice Translation Data initialized.";
}

function cacheProperties() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var properties = scriptProperties.getProperties();

  highSuccessMod = properties.highSuccessMod;
  mediumSuccessMod = properties.mediumSuccessMod;
  lowSuccessMod = properties.lowSuccessMod;
  failedCheckMod = properties.failedCheckMod;
  cleanedInvestigationData = JSON.parse(properties.cleanedInvestigationData || '[]');
  cleanedGoldData = JSON.parse(properties.cleanedGoldData || '[]');
  goldToDiceData = JSON.parse(properties.goldToDiceData || '[]');
}
