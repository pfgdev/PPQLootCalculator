// spell-scroll-initialization.js

/**
 * Function to initialize the spell scroll data.
 * This function fetches the data from the named range 'SpellScroll_Export',
 * cleans the data by removing empty rows, and then stores the cleaned data
 * in the script properties for later use.
 */
function initializeSpellScrollData() {
    // Log the start of the initialization process
    addToLog('initializeSpellScrollData called');
    
    // Check if the spellScrollData variable is not already initialized
    if (!spellScrollData) {
      // Fetch the range 'SpellScroll_Export' from the active spreadsheet
      var spellScrollRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('SpellScroll_Export');
      addToLog('Fetched SpellScroll_Export range: ' + spellScrollRange);
      
      // Check if the named range 'SpellScroll_Export' exists
      if (!spellScrollRange) {
        addToLog('Named range "SpellScroll_Export" is missing.');
        return 'Named range "SpellScroll_Export" is missing.';
      }
      
      // Get the values from the named range
      spellScrollData = spellScrollRange.getValues();
      addToLog('Fetched spell scroll data: ' + JSON.stringify(spellScrollData));
      
      // Clean the data by removing empty rows
      cleanedSpellScrollData = spellScrollData.filter(row => row.some(cell => cell !== ''));
      addToLog('Cleaned spell scroll data: ' + JSON.stringify(cleanedSpellScrollData));
      
      // Store the cleaned data in the script properties
      PropertiesService.getScriptProperties().setProperty('cleanedSpellScrollData', JSON.stringify(cleanedSpellScrollData));
      return "Spell Scroll Data initialized.";
    }
    
    // If spellScrollData is already initialized, return a message indicating this
    return "Spell Scroll Data already initialized.";
  }
  
  /**
   * Function to get the spell scroll data.
   * This function retrieves the cleaned spell scroll data from the script properties
   * and returns it as a JSON object.
   */
  function getSpellScrollData() {
    // Retrieve the cleaned spell scroll data from the script properties
    var properties = PropertiesService.getScriptProperties();
    return JSON.parse(properties.getProperty('cleanedSpellScrollData') || '[]');
  }
  