// spell-scroll.js

/**
 * Function to fetch and display spell scroll data.
 * This function retrieves the combined spell scroll data from the script properties
 * and returns it as an array.
 */
function fetchSpellScrollData(level) {
    var properties = PropertiesService.getScriptProperties();
    var combinedData = JSON.parse(properties.getProperty('combinedSpellScrollData') || '{}');
    if (!combinedData[level]) {
        return []; // Return an empty array if no data is found for the level
    }
    return combinedData[level];
}

// Function to fetch detailed spell scroll data based on level and index
function getSpellScrollDetail(level, index) {
    var properties = PropertiesService.getScriptProperties();
    var combinedData = JSON.parse(properties.getProperty('combinedSpellScrollData') || '{}');

    if (!combinedData[level] || !combinedData[level][index]) {
        return {}; // Return an empty object if no data is found for the level or index
    }

    return combinedData[level][index];
}

