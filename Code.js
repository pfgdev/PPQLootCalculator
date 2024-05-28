// Code.gs
// Define global variables
var investigationData, goldData, cleanedInvestigationData, cleanedGoldData;
var highSuccessMod, mediumSuccessMod, lowSuccessMod, failedCheckMod;
var LOGGING_ENABLED = false; // Toggle to enable/disable logging
var MAX_LOG_SIZE = 100; // Set a maximum log size
var logMessages = []; // Store log messages
var initializationCompleteFlag = 'initializationComplete';

// constant strings
const CHECK_RESULT_HIGH = 'High Success';
const CHECK_RESULT_MEDIUM = 'Medium Success';
const CHECK_RESULT_LOW = 'Low Success';
const CHECK_RESULT_FAIL = 'Failed Check';

const CR_COLUMN_INDEX = 0; // Manually Replace with the actual index from spreadsheet (optimization)
const LOW_DC_COLUMN_INDEX = 1; // Manually Replace with the actual index from spreadsheet (optimization)
const MEDIUM_DC_COLUMN_INDEX = 2; // Manually Replace with the actual index from spreadsheet (optimization)
const HIGH_DC_COLUMN_INDEX = 3; // Manually Replace with the actual index from spreadsheet (optimization)

const GOLD_TARGET_COLUMN_INDEX = 3; // Manually Replace with the actual index from spreadsheet (optimization)

const MAX_CHALLENGE_RATING = 20 + 10; // Manually Replace with the actual index from spreadsheet (optimization) (added 10 to deal with blank spaces, but this is a future optimization of putting the entire table together)


function doGet() {
  addToLog('doGet called at ' + new Date().toISOString());

  var cache = CacheService.getScriptCache();
  var initializationComplete = cache.get('initializationComplete');
  addToLog('Cache initializationComplete: ' + initializationComplete);

  if (!initializationComplete) {
    addToLog('Initialization starting at ' + new Date().toISOString());
    var initLog = initializeData();
    cache.put('initializationComplete', 'true', 3600); // Cache for 1 hour
    addToLog(initLog);
    addToLog('Initialization completed and cached at ' + new Date().toISOString());
  } else {
    addToLog('Initialization already completed at ' + new Date().toISOString());
  }

  // Determine logging status
  var loggingEnabled = LOGGING_ENABLED;

  // Get HTML template and pass the logging status
  var template = HtmlService.createTemplateFromFile('Index');
  template.loggingEnabled = loggingEnabled;

  return template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}




function isLoggingEnabled() {
  return LOGGING_ENABLED;
}

function addToLog(message) {
  if (LOGGING_ENABLED) {
    logMessages.push(message);
    if (logMessages.length > MAX_LOG_SIZE) {
      logMessages.shift(); // Remove the oldest message to maintain the max size
    }
  }
}


function readProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return {
    cleanedInvestigationData: JSON.parse(scriptProperties.getProperty('cleanedInvestigationData') || '[]'),
    cleanedGoldData: JSON.parse(scriptProperties.getProperty('cleanedGoldData') || '[]'),
    highSuccessMod: scriptProperties.getProperty('highSuccessMod'),
    mediumSuccessMod: scriptProperties.getProperty('mediumSuccessMod'),
    lowSuccessMod: scriptProperties.getProperty('lowSuccessMod'),
    failedCheckMod: scriptProperties.getProperty('failedCheckMod')
  };
}

// Calculate Gold and Log  //
// Runs when you hit the Calculate Button //
function calculateGoldAndLog(inputs) {
  addToLog('Starting calculateGoldAndLog');

  if (!highSuccessMod || !mediumSuccessMod || !lowSuccessMod || !failedCheckMod || !goldToDiceData) {
    cacheProperties();
  }

  if (!cleanedInvestigationData.length || !cleanedGoldData.length) {
    addToLog('Data not initialized.');
    return { expectedGold: "Error", diceNotation: "Error", logMessages: logMessages.join("\n") };
  }

  let totalGold = 0;

  try {
    inputs.forEach(input => {
      const { cr, killed, check } = input;
      addToLog('Processing input - CR: ' + cr + ', Killed: ' + killed + ', Check: ' + check);

      const investigationResult = getInvestigationResultFromData(cr, check);
      addToLog('Investigation Result: ' + investigationResult);

      const goldTarget = getGoldTarget(cr);
      addToLog('Gold Target: ' + goldTarget);

      const modifier = getModifier(investigationResult);
      addToLog('Modifier: ' + modifier);

      if (!goldTarget || !modifier) {
        addToLog("Error: goldTarget or modifier is undefined. Gold Target: " + goldTarget + ", Modifier: " + modifier);
        throw new Error('Undefined goldTarget or modifier');
      }

      const goldPerEnemy = goldTarget * modifier;
      if (isNaN(goldPerEnemy)) {
        addToLog("Error: goldPerEnemy is NaN.");
        throw new Error('goldPerEnemy is NaN');
      }

      const expectedGold = goldPerEnemy * killed;
      totalGold += expectedGold;
    });

    totalGold = parseFloat(totalGold.toFixed(3)); // Truncate to a maximum of 3 decimal places
    addToLog('Total Gold: ' + totalGold);

    // Retrieve Gold to Dice Translation Data
    const goldToDiceData = JSON.parse(PropertiesService.getScriptProperties().getProperty('goldToDiceData') || '[]');

    // Convert totalGold to dice notation
    const diceNotation = convertGoldToDice(totalGold, goldToDiceData);
    addToLog('Dice Notation: ' + diceNotation);

    return { 
      expectedGold: totalGold, // Return only the value
      diceNotation: diceNotation, // Return only the value
      logMessages: logMessages.join("\n") 
    };
  } catch (error) {
    addToLog('Error occurred: ' + error.message);
    return { expectedGold: "Error", diceNotation: "Error", logMessages: logMessages.join("\n") };
  }
}






function getInvestigationResultFromData(cr, check) {
  addToLog('getInvestigationResultFromData called with CR: ' + cr + ', Check: ' + check);
  for (let i = 1; i < MAX_CHALLENGE_RATING; i++) {
    addToLog('Checking cleanedInvestigationData[' + i + '][' + CR_COLUMN_INDEX + ']: ' + cleanedInvestigationData[i][CR_COLUMN_INDEX]);
    if (cleanedInvestigationData[i][CR_COLUMN_INDEX] == cr) {
      const lowDC = cleanedInvestigationData[i][LOW_DC_COLUMN_INDEX];
      const mediumDC = cleanedInvestigationData[i][MEDIUM_DC_COLUMN_INDEX];
      const highDC = cleanedInvestigationData[i][HIGH_DC_COLUMN_INDEX];
      addToLog('DC values: Low=' + lowDC + ', Medium=' + mediumDC + ', High=' + highDC);

      if (check >= highDC) {
        addToLog(CHECK_RESULT_HIGH);
        return CHECK_RESULT_HIGH;
      } else if (check >= mediumDC) {
        addToLog(CHECK_RESULT_MEDIUM);
        return CHECK_RESULT_MEDIUM;
      } else if (check >= lowDC) {
        addToLog(CHECK_RESULT_LOW);
        return CHECK_RESULT_LOW;
      } else {
        addToLog(CHECK_RESULT_FAIL);
        return CHECK_RESULT_FAIL;
      }
    }
  }
  addToLog('No match found for CR: ' + cr);
  return CHECK_RESULT_FAIL;
}



function getGoldTarget(cr) {
  addToLog('getGoldTarget called with CR: ' + cr);
  for (let i = 1; i < MAX_CHALLENGE_RATING; i++) {
    addToLog('Checking cleanedGoldData[' + i + '][' + CR_COLUMN_INDEX + ']: ' + cleanedGoldData[i][CR_COLUMN_INDEX]);
    if (cleanedGoldData[i][CR_COLUMN_INDEX] == cr) {
      const goldTarget = cleanedGoldData[i][GOLD_TARGET_COLUMN_INDEX];
      addToLog('Match found. Gold Target: ' + goldTarget);
      return goldTarget;
    }
  }
  addToLog('No match found for CR: ' + cr);
  return 0;
}



function getModifier(investigationResult) {
  addToLog('getModifier called with result: ' + investigationResult);
  switch (investigationResult) {
    case CHECK_RESULT_HIGH:
      addToLog('High Success Modifier Returned: ' + highSuccessMod);
      return highSuccessMod;
    case CHECK_RESULT_MEDIUM:
      addToLog('Medium Success Modifier Returned: ' + mediumSuccessMod);
      return mediumSuccessMod;
    case CHECK_RESULT_LOW:
      addToLog('Low Success Modifier Returned: ' + lowSuccessMod);
      return lowSuccessMod;
    case CHECK_RESULT_FAIL:
      addToLog('Failed Check Modifier Returned: ' + failedCheckMod);
      return failedCheckMod;
    default:
      addToLog('Default Modifier Returned: 1.00');
      return 1.00; // Default modifier
  }
}

function convertGoldToDice(gold, goldToDiceData) {
  addToLog('convertGoldToDice called with gold: ' + gold);
  for (var i = goldToDiceData.length - 1; i >= 0; i--) {
    var diceAverage = parseFloat(goldToDiceData[i][1]); // Assuming column 1 contains the average gold value
    var diceNotation = goldToDiceData[i][0]; // Assuming column 0 contains the dice notation

    if (gold >= diceAverage) {
      addToLog('Match found: ' + diceNotation);
      return diceNotation;
    }
  }
  addToLog('No matching dice notation found for gold: ' + gold);
  return "No matching dice notation"; // Default case if no match found
}
