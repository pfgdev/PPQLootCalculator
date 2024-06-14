// spell-scroll.js

/**
 * Function to fetch spell scroll data.
 * This function retrieves the cleaned spell scroll data from the script properties
 * and returns it as a JSON string.
 */
function fetchSpellScrollData() {
    var spellScrollData = getSpellScrollData();
    return JSON.stringify(spellScrollData);
}
