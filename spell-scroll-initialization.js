// spell-scroll-initialization.js

/**
 * Function to initialize the spell scroll data.
 * This function fetches the data from the named range 'SpellScroll_Export',
 * cleans the data by removing empty rows, and then stores the cleaned data
 * in the script properties for later use.
 */
function initializeSpellScrollData() {
  addToLog('initializeSpellScrollData called');

  try {
      var spellScrollRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('SpellScroll_Export');
      addToLog('Fetched SpellScroll_Export range: ' + spellScrollRange.getA1Notation());

      if (!spellScrollRange) {
          addToLog('Named range "SpellScroll_Export" is missing.');
          return 'Named range "SpellScroll_Export" is missing.';
      }

      var spellScrollData = spellScrollRange.getValues();
      addToLog('Fetched spell scroll data (length): ' + spellScrollData.length);

      var cleanedSpellScrollData = spellScrollData.filter(function(row) {
          return row.some(function(cell) {
              return cell !== '';
          });
      });
      addToLog('Cleaned spell scroll data (length): ' + cleanedSpellScrollData.length);

      var structuredData = {};
      var detailedData = [];

      cleanedSpellScrollData.forEach(function(row) {
          var level = row[5]; // level is in the 6th  column
          if (!structuredData[level]) {
              structuredData[level] = [];
          }
          var commonData = {
              diceRange: row[3], // dice range is in the 4th column
              name: row[4], // name is in the 5th column
              detailIndex: detailedData.length
          };
          structuredData[level].push(commonData);

          detailedData.push({
              level: level,
              source: row[6], // Assuming source is in the 7th column
              castingTime: row[7], // Assuming casting time is in the 8th column
              rangeOrArea: row[8], // Assuming range or area is in the 9th column
              components: row[9], // Assuming components are in the 10th column
              duration: row[10], // Assuming duration is in the 11th column
              concentration: row[11], // Assuming concentration is in the 12th column
              school: row[12], // Assuming school is in the 13th column
              attackOrSave: row[13], // Assuming attack or save is in the 14th column
              damageOrEffect: row[14], // Assuming damage or effect is in the 15th column
              description: row[15] // Assuming description is in the 16th column
          });
      });

      addToLog('Structured Data: ' + JSON.stringify(structuredData));
      PropertiesService.getScriptProperties().setProperty('structuredSpellScrollData', JSON.stringify(structuredData));
      PropertiesService.getScriptProperties().setProperty('detailedSpellScrollData', JSON.stringify(detailedData));
      addToLog('Stored structured spell scroll data in script properties');

      return logMessages.join("\n");
  } catch (error) {
      addToLog('Error during initialization: ' + error.message);
      return logMessages.join("\n");
  }
}

function getSpellScrollData(level) {
  var properties = PropertiesService.getScriptProperties();
  var structuredData = JSON.parse(properties.getProperty('structuredSpellScrollData') || '{}');
  if (!structuredData[level]) {
      return JSON.stringify([]); // Return an empty array if no data is found for the level
  }
  return JSON.stringify(structuredData[level]);
}

function getSpellScrollDetail(index) {
  var properties = PropertiesService.getScriptProperties();
  var detailedData = JSON.parse(properties.getProperty('detailedSpellScrollData') || '[]');
  if (!detailedData[index]) {
      return JSON.stringify({}); // Return an empty object if no data is found for the index
  }
  return JSON.stringify(detailedData[index]);
}