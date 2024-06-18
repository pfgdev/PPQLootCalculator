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

        var combinedData = {};

        cleanedSpellScrollData.forEach(function(row) {
            var level = row[5]; // level is in the 6th column
            if (!combinedData[level]) {
                combinedData[level] = [];
            }

            var combinedEntry = {
                diceRange: row[3], // dice range is in the 4th column
                name: row[4], // name is in the 5th column
                level: level,
                source: row[6], // Assuming source is in the 7th column
                castingTime: row[7], // Assuming casting time is in the 8th column
                rangeOrArea: row[8], // Assuming range or area is in the 9th column
                verbal: row[9],
                somatic: row[10],
                material: row[11],
                materialText: row[12],
                duration: row[13], // Assuming duration is in the 11th column
                concentration: row[14], // Assuming concentration is in the 12th column
                school: row[15], // Assuming school is in the 13th column
                attackOrSave: row[16], // Assuming attack or save is in the 14th column
                damageOrEffect: row[17], // Assuming damage or effect is in the 15th column
                description: row[18] // Assuming description is in the 16th column
            };

            combinedData[level].push(combinedEntry);
        });

        addToLog('Combined Data: ' + JSON.stringify(combinedData));
        PropertiesService.getScriptProperties().setProperty('combinedSpellScrollData', JSON.stringify(combinedData));
        addToLog('Stored combined spell scroll data in script properties');

        return logMessages.join("\n");
    } catch (error) {
        addToLog('Error during initialization: ' + error.message);
        return logMessages.join("\n");
    }
}
