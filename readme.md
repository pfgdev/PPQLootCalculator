# PPQ Gold Calculator

## Description
This is a personal project. In order to teach myself JavaScript and HTML through Google App Script, I am turning my Dungeons and Dragons Gold and Loot Calculator spreadsheet into an web app with a more friendly interface. For now, no one uses this web app for me. This is a silly project, but simply a means through which I intend to learn skills I can translate elsewhere.


## Functionality
This tool tells a DnD DM how much gold to award the party based on what monsters they defeated. It is my personal enhancement to the official DnD systems for tabulating gold rewards, as it interpolates values more fairly and also takes the party's best investigation check in-mind in those calculations.

It relies on tables set up in my spreadsheet version, and those tables are passed in to the Google App Script as named ranges. Thus, I could edit the spreadsheet and tune my formula.

The formula operates like this:
- Set the CR for an enemy (e.g. CR 5)
- Set the number of enemies killed (e.g. 3)
- Add additional enemies of different CRs, as-needed (e.g. 2 enemies of CR 7)
- Set the Investigation Check of the party (e.g. 12)
- Hit the calculate button and the following occurs:

- Look up the gold value for an enemy of CR 5
- Multiply it by the number killed
- Look up the required skill checks to get a "Failure", "Low Success", "Medium Success", or "High Success" investigation check
- Look up the appropriate success modifier based on the type of check (e.g. 0.5 for low success)
- Multiply the gold to award by the success modifier

- Do the above for all listed Enemy CRs, then sum them together
- Finally, take the summed gold, and round down to the closest value in the Gold to Dice Transition table
- This table converts the gold to a random amount to be rolled at the table (e.g. 2d6 Gold(x10) is worth 70 gold on average)
- This is the DM lets the players roll to determine their rewards


### JavaScript
Note: These files are .gs files, even if they appear to be .js

- Code
    - This is the main code file

- initialization.js
    - This file houses functions related to initialization.
    - Many values are saved in the cache because they otherwise seem to reset back before use.


### HTML
Note: The css files end in .html because that's what Google App Script requires. They use <style></style> to house their information.
Note2: Some minor files and/or depreciated files are not included in this breakdown.

- base.css.html
    - This file contains global styles and CSS variables that are used across the entire application.
    - It sets up basic resets, body styles, and CSS custom properties (variables).

- calculation-scripts.html
    - holds the functions tied to calculating results

- components.css.html
    - Base styles and general component styles.

- custom-input.css.html
    - Styles for custom number inputs.

- debug-log.css.html
    - Styles for the debug log textarea.

- debuglog.html
    - Creates a user-facing debug window that runs through addToLog().

- footer.html
    - Houses the calculate button, reset button, and loading text/spinner

- header.html
    - sets up tabs across the top of the screen to let me eventually add different functionality to the sheet. other tabs contain in-progress content currently

- index.html
    - the main .html file that includes everything else in its head and body.
    - the goal is to keep this file clean and house specific functionality in other files

- investigation.html
    - creates the investigation check value and the increment/decrement buttons

- layout.css.html
    - This file contains styles related to the overall layout of the application.
    - It ensures consistent layout structures like containers, tab sections, and overall page padding.

- main-scripts.html
    - houses scripts that haven't been broken out into a different file. includes onPageLoad()

- results.html
    - sets up the result displays from hitting the calculate button

- spinner.css.html
    - Spinner styles for loading indicators.

- tab-scripts.html
    - controls clicking on tabs to populate new information

- table-scripts
    - controls adding and removing rows from the Enemy CR / Enemies Killed table
    - this is a fairly significant file and the code here was hard to get right

- table.html
    - sets up the table for Enemy CR and Enemies Killed, and adds a button to add rows
    - there are remove row buttons in the first column that extend outside its boundaries (by design)

- tables.css.html
    - This file contains styles for the table and its elements.

- utilities.css.html
    - This file contains utility classes and styles for specific functional groupings.
    - It includes styles for form groups, results sections, and text alignment.





## Using ChatGPT for Assistance

### Project Overview
This project is a Gold Calculator tool built using HTML, CSS, and JavaScript. It includes features such as adding enemies, calculating expected gold, and displaying results in a user-friendly interface.

### Key Files and Their Purpose
- `index.html`: Main HTML file containing the structure of the application.
- `styles.css`: Contains the main styling rules for the application.
- `scripts.js`: Contains the JavaScript logic for the application.
- `custom-input.css.html`: Styles for custom input elements.
- `layout.css.html`: Styles related to the overall layout.
- `utilities.css.html`: Utility classes and styles for specific functional groupings.

### Common Tasks
1. **Adjusting Styles**:
   - To modify styles for specific elements, refer to the corresponding CSS files.
   - Example: To change the button styles, update `styles.css`.

2. **Enhancing Layout**:
   - To adjust the layout, use `layout.css.html` and `utilities.css.html`.
   - Example: To center a container, ensure it has `margin: 0 auto;`.

3. **Debugging UI Issues**:
   - When facing UI issues, inspect the elements using browser developer tools.
   - Example: To fix alignment issues, check the applied styles in developer tools.

### Specific Instructions for ChatGPT
To assist effectively with this project, please consider the following:
- **Review the Key Files**: Before making suggestions, review the key CSS and HTML files provided.
- **Maintain Accessibility**: Ensure that any changes proposed maintain or improve accessibility.
- **Provide Detailed Examples**: When suggesting code, provide detailed examples and explanations.

### Example Interaction
```markdown
**Question**: How can I make the "Investigation Check" label stand out more?

**Current Code**:
```html
<!-- investigation.html -->
<div class="form-group">
  <label for="investigationCheck">Investigation Check: <span title="Investigation Check tooltip">(?)</span></label>
  <div class="custom-number-input">
    <button class="button decrement-button" onclick="changeInvestigationCheck(-1)">&#9664;</button>
    <div id="investigationCheckDisplay" class="value-display">12</div>
    <button class="button increment-button" onclick="changeInvestigationCheck(1)">&#9654;</button>
  </div>
</div>
```

**Desired Outcome**:
I want the label to be larger and bold.

**ChatGPT's Suggested CSS**:

```css
.form-group label {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  display: block;
  text-align: center;
}
```





### Installation
1. No installation, it's just a web app!


## Usage
This tool tells a DnD DM how much gold to award the party based on what monsters they defeated. It is my personal enhancement to the official DnD systems for tabulating gold rewards, as it interpolates values more fairly and also takes the party's best investigation check in-mind in those calculations.

It relies on tables set up in my spreadsheet version, and those tables are passed in to the Google App Script as named ranges. Thus, I could edit the spreadsheet and tune my formula.


### User Steps
- Set the CR for an enemy (e.g. CR 5)
- Set the number of enemies killed (e.g. 3)
- Add additional enemies of different CRs, as-needed (e.g. 2 enemies of CR 7)
- Set the Investigation Check of the party (e.g. 12)
- Hit the calculate button and use the results to award gold to the party through a dice roll

### What the Code Does
- Look up the gold value for an enemy of CR 5
- Multiply it by the number killed
- Look up the required skill checks to get a "Failure", "Low Success", "Medium Success", or "High Success" investigation check
- Look up the appropriate success modifier based on the type of check (e.g. 0.5 for low success)
- Multiply the gold to award by the success modifier

- Do the above for all listed Enemy CRs, then sum them together
- Finally, take the summed gold, and round down to the closest value in the Gold to Dice Transition table
- This table converts the gold to a random amount to be rolled at the table (e.g. 2d6 Gold(x10) is worth 70 gold on average)
- This is the DM lets the players roll to determine their rewards


## Contact
pmfeller@gmail.com
