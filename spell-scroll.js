// spell-scroll.js

/**
 * Function to fetch and display spell scroll data.
 * This function retrieves the combined spell scroll data from the script properties
 * and returns it as a JSON string.
 */
function fetchSpellScrollData(level) {
    var properties = PropertiesService.getScriptProperties();
    var combinedData = JSON.parse(properties.getProperty('combinedSpellScrollData') || '{}');
    if (!combinedData[level]) {
        return JSON.stringify([]); // Return an empty array if no data is found for the level
    }
    return JSON.stringify(combinedData[level]);
}

// Function to fetch detailed spell scroll data based on level and index
function getSpellScrollDetail(level, index) {
    var properties = PropertiesService.getScriptProperties();
    var combinedData = JSON.parse(properties.getProperty('combinedSpellScrollData') || '{}');

    if (!combinedData[level] || !combinedData[level][index]) {
        return JSON.stringify({}); // Return an empty object if no data is found for the level or index
    }

    return JSON.stringify(combinedData[level][index]);
}

