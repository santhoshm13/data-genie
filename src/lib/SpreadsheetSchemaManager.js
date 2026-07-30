export class SpreadsheetSchemaManager {
  static async getNumericSheetId(spreadsheetId, sheetName, token) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch spreadsheet metadata");
    const data = await res.json();
    const sheet = data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error(`Sheet '${sheetName}' not found.`);
    return sheet.properties.sheetId;
  }

  static indexToColumnLetter(index) {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  static async execute(actionObj, dataset, token) {
    const { action, sheetName, data, match } = actionObj;
    const spreadsheetId = dataset.spreadsheetId;
    
    // Safety check
    if (!dataset || !dataset.isGoogleSheet) {
      throw new Error("No active Google Sheet dataset to modify.");
    }

    // Determine the actual headers for this dataset.
    // They are available as the keys of the first row in dataset.sample, 
    // excluding our internal '_sheetRowNumber'.
    if (!dataset.sample || dataset.sample.length === 0) {
      throw new Error("Dataset is empty. Cannot determine headers.");
    }
    const headers = Object.keys(dataset.sample[0]).filter(k => k !== '_sheetRowNumber');

    switch(action.toLowerCase()) {
      case 'insert': {
        // Map data to an ordered array based on headers
        const rowValues = headers.map(header => data[header] !== undefined ? data[header] : '');
        
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            range: sheetName,
            majorDimension: "ROWS",
            values: [rowValues]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        return "Row inserted successfully.";
      }

      case 'update': {
        // Find the matching row
        let matchedRow = null;
        for (const row of dataset.sample) {
          let isMatch = true;
          for (const key in match) {
            if (String(row[key]).toLowerCase() !== String(match[key]).toLowerCase()) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            matchedRow = row;
            break;
          }
        }

        if (!matchedRow) {
          throw new Error(`Could not find a row matching criteria: ${JSON.stringify(match)}`);
        }

        const rowIndex = matchedRow._sheetRowNumber;
        const batchData = [];

        // Build individual cell updates using A1 notation
        for (const key in data) {
          const colIndex = headers.indexOf(key);
          if (colIndex === -1) continue; // Skip unknown columns
          
          const colLetter = this.indexToColumnLetter(colIndex);
          batchData.push({
            range: `${sheetName}!${colLetter}${rowIndex}`,
            values: [[data[key]]]
          });
        }

        if (batchData.length === 0) return "No valid columns provided to update.";

        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: batchData
          })
        });
        if (!res.ok) throw new Error(await res.text());
        return `Row updated successfully (Row ${rowIndex}).`;
      }

      case 'delete': {
        // Find the matching row
        let matchedRow = null;
        for (const row of dataset.sample) {
          let isMatch = true;
          for (const key in match) {
            if (String(row[key]).toLowerCase() !== String(match[key]).toLowerCase()) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            matchedRow = row;
            break;
          }
        }

        if (!matchedRow) {
          throw new Error(`Could not find a row matching criteria: ${JSON.stringify(match)}`);
        }

        const numericSheetId = await this.getNumericSheetId(spreadsheetId, sheetName, token);
        const rowIndex = matchedRow._sheetRowNumber;

        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: numericSheetId,
                    dimension: "ROWS",
                    startIndex: rowIndex - 1, // 0-indexed and inclusive
                    endIndex: rowIndex // exclusive
                  }
                }
              }
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        return `Row deleted successfully (Row ${rowIndex}).`;
      }

      case 'search': {
        const results = [];
        for (const row of dataset.sample) {
          let isMatch = true;
          for (const key in match) {
            if (String(row[key]).toLowerCase() !== String(match[key]).toLowerCase()) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            const cleanRow = { ...row };
            delete cleanRow._sheetRowNumber;
            results.push(cleanRow);
          }
        }
        return `Found ${results.length} matching rows: \n${JSON.stringify(results, null, 2)}`;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  static async copySpreadsheet(sourceSpreadsheetId, token) {
    // 1. Fetch metadata of the original sheet
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sourceSpreadsheetId}?fields=properties.title,sheets(properties(sheetId,title))`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) throw new Error("Failed to read source spreadsheet metadata");
    const metaData = await metaRes.json();
    const sourceTitle = metaData.properties.title || "Untitled Spreadsheet";
    const sourceSheets = metaData.sheets || [];

    // 2. Create a new blank spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: `Copy of ${sourceTitle}` }
      })
    });
    if (!createRes.ok) throw new Error("Failed to create new spreadsheet");
    const newSpreadsheet = await createRes.json();
    const newSpreadsheetId = newSpreadsheet.spreadsheetId;
    
    const defaultSheetId = newSpreadsheet.sheets[0].properties.sheetId;

    // 3. Loop over original sheets and use copyTo sequentially to maintain order and avoid rate limits
    const copiedSheets = [];
    for (const sheet of sourceSheets) {
       const copyRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sourceSpreadsheetId}/sheets/${sheet.properties.sheetId}:copyTo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ destinationSpreadsheetId: newSpreadsheetId })
       });
       if (!copyRes.ok) throw new Error(`Failed to copy tab ${sheet.properties.title}`);
       const copyData = await copyRes.json();
       copiedSheets.push({
          originalTitle: sheet.properties.title,
          newSheetId: copyData.sheetId
       });
    }

    // 4. BatchUpdate: Rename copied sheets and delete default Sheet1
    // CRITICAL: Delete default Sheet1 FIRST to avoid naming collisions if original had 'Sheet1'
    const requests = [];
    requests.push({
       deleteSheet: {
          sheetId: defaultSheetId
       }
    });

    copiedSheets.forEach(copied => {
       requests.push({
          updateSheetProperties: {
             properties: {
                sheetId: copied.newSheetId,
                title: copied.originalTitle
             },
             fields: 'title'
          }
       });
    });

    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
    
    if (!batchRes.ok) throw new Error("Failed to rename copied tabs");

    return newSpreadsheetId;
  }

  static async createFilteredCopy(originalDataset, transformCode, token) {
    if (!originalDataset || !originalDataset.isGoogleSheet) {
        throw new Error("Dataset is not a Google Sheet. Cannot perform a deep copy.");
    }

    // 1. Evaluate the AI transform code to find which rows to keep
    // eslint-disable-next-line no-eval
    const transformFn = eval(transformCode);
    const clonedData = JSON.parse(JSON.stringify(originalDataset.fullData));
    const resultData = transformFn(clonedData);
    if (!Array.isArray(resultData)) throw new Error("Transformation did not return an array.");

    const rowsToKeep = new Set(resultData.map(r => r._sheetRowNumber));
    const originalRows = originalDataset.fullData;
    const rowsToDelete = originalRows.filter(r => !rowsToKeep.has(r._sheetRowNumber)).map(r => r._sheetRowNumber);

    // 2. Create the exact copy
    const newSpreadsheetId = await this.copySpreadsheet(originalDataset.spreadsheetId, token);

    // 3. Find the sheetId of the active tab in the new spreadsheet
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}?fields=sheets(properties(sheetId,title))`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) throw new Error("Failed to read new spreadsheet metadata");
    const metaData = await metaRes.json();
    const targetSheet = metaData.sheets.find(s => s.properties.title === originalDataset.sheetName) || metaData.sheets[0];
    const targetSheetId = targetSheet.properties.sheetId;

    // 4. Delete the unwanted rows in reverse order
    rowsToDelete.sort((a, b) => b - a); // descending order
    const requests = [];
    
    let currentBlock = null;
    for (let i = 0; i < rowsToDelete.length; i++) {
       const rowNum = rowsToDelete[i];
       if (currentBlock && currentBlock.startIndex === rowNum) {
           currentBlock.startIndex = rowNum - 1;
       } else {
           if (currentBlock) requests.push({ deleteDimension: { range: currentBlock } });
           currentBlock = {
               sheetId: targetSheetId,
               dimension: "ROWS",
               startIndex: rowNum - 1, // 0-indexed, inclusive
               endIndex: rowNum // exclusive
           };
       }
    }
    if (currentBlock) requests.push({ deleteDimension: { range: currentBlock } });

    // 5. Send batch delete
    if (requests.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < requests.length; i += chunkSize) {
            const chunk = requests.slice(i, i + chunkSize);
            const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests: chunk })
            });
            if (!batchRes.ok) throw new Error("Failed to delete filtered rows from the new copy.");
        }
    }

    return `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;
  }
}
