/* MAP VALUES TO ROW IN SPREADSHEET
	Takes a lines of changes and integrated them into spreadsheet
   Assumes:
   line number from set verified dataset is in column X (i.e. the egoid)
   line number from the dataset to have its egoid set is in column X
   column A contains the line numbers in the new dataset
 */

function mapValuesToRow() {
	var actualRow, idToFind, valueToMove, i;
	var sheet = SpreadsheetApp.getActiveSheet();
	var lastRow = sheet.getLastRow();
	var numChanges = 8000;

	var colA = sheet.getRange("A2:A" + lastRow).getValues().flat();
	var colX = sheet.getRange("X2:X" + numChanges).getValues().flat();
	var colY = sheet.getRange("Y2:Y" + numChanges).getValues().flat();

	for (i = 0; i < colX.length; i++) {                                   // For each changw
		idToFind = colX[i];                                         // Get line to move to
		valueToMove = colY[i];                                      // Get value to set there
		if (idToFind === "") continue;                              // Skip empty rows
		var targetRowIndex = colA.indexOf(idToFind);                // Find where the ID from X exists in Column A
		if (targetRowIndex !== -1) {                                // If a good value
			actualRow = targetRowIndex + 2;                          // Skip header and add 1, cause of zero-base
			sheet.getRange("W" + actualRow).setValue(valueToMove);   // Set row
		}
	}
}