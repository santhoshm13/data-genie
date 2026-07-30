import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const SpreadsheetExportEngine = {
  /**
   * Executes the AI-generated transformation function against the full dataset(s).
   * @param {Object} datasets The map of loaded datasets
   * @param {string} activeDatasetName The name of the active/default dataset
   * @param {string} jsCodeString The JS function string e.g. "(data) => { return data.filter(...) }"
   * @returns {Array<Object>} The transformed dataset
   */
  executeTransformation: (datasets, activeDatasetName, jsCodeString) => {
    try {
      // Evaluate the function string
      // eslint-disable-next-line no-eval
      const transformFn = eval(jsCodeString);
      
      if (typeof transformFn !== 'function') {
        throw new Error("AI did not provide a valid transformation function.");
      }
      
      let payload;
      
      // Helper to strip internal properties
      const stripInternal = (dataArray) => {
         return dataArray.map(row => {
            const newRow = { ...row };
            delete newRow._sheetRowNumber;
            return newRow;
         });
      };

      // If the function signature uses 'datasets', it wants the multi-file object map
      if (jsCodeString.match(/\(\s*datasets\s*\)/) || jsCodeString.startsWith('datasets =>')) {
        const clonedDatasets = JSON.parse(JSON.stringify(datasets)); // Deep clone the whole map
        
        // Strip internal properties from all datasets
        Object.keys(clonedDatasets).forEach(k => {
           if (clonedDatasets[k].fullData) {
              clonedDatasets[k].fullData = stripInternal(clonedDatasets[k].fullData);
           }
        });

        payload = new Proxy(clonedDatasets, {
          get: function(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop !== 'string') return undefined;
            
            const keys = Object.keys(target);
            
            // 1. Case-insensitive substring match
            const lowerProp = prop.toLowerCase();
            let match = keys.find(k => k.toLowerCase().includes(lowerProp) || lowerProp.includes(k.toLowerCase()));
            if (match) return target[match];
            
            // 2. Base name match (strip ID suffix)
            match = keys.find(k => k.replace(/\s*\([a-zA-Z0-9-_]+\)$/, '').toLowerCase() === lowerProp);
            if (match) return target[match];
            
            // 3. ID match
            match = keys.find(k => k.includes(`(${prop})`) || (target[k].spreadsheetId && target[k].spreadsheetId.includes(prop)));
            if (match) return target[match];
            
            return undefined;
          }
        });
      } else {
        // Legacy single-file mode: it expects an array of rows
        const activeDataset = activeDatasetName ? datasets[activeDatasetName] : Object.values(datasets)[0];
        if (!activeDataset || !activeDataset.fullData) {
          throw new Error("No active dataset found for transformation.");
        }
        payload = stripInternal(JSON.parse(JSON.stringify(activeDataset.fullData))); // Deep clone just the array and strip
      }
      
      const result = transformFn(payload);
      
      if (!Array.isArray(result)) {
        throw new Error("Transformation function did not return a valid array of rows.");
      }
      
      return result;
    } catch (err) {
      console.error("Transformation Execution Error:", err);
      throw new Error("Failed to execute data transformation: " + err.message);
    }
  },

  /**
   * Generates a CSV Blob from the dataset.
   * @param {Array<Object>} data Transformed data
   * @returns {Blob} The CSV Blob
   */
  generateCsvBlob: (data) => {
    if (!data || data.length === 0) {
      return new Blob([""], { type: 'text/csv;charset=utf-8;' });
    }
    const csvString = Papa.unparse(data);
    return new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  },

  /**
   * Generates an Excel XLSX Blob from the dataset.
   * @param {Array<Object>} data Transformed data
   * @param {string} sheetName Name of the worksheet
   * @returns {Blob} The Excel Blob
   */
  generateExcelBlob: (data, sheetName = "Sheet1") => {
    if (!data || data.length === 0) {
       data = [{}];
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  },

  /**
   * Creates a new Google Spreadsheet and populates it with the transformed data.
   * @param {Array<Object>} data Transformed data
   * @param {string} filename Name for the new spreadsheet
   * @param {string} token Google OAuth Token
   * @param {string|null} sourceSpreadsheetId Original spreadsheet ID to copy format from
   * @param {string|null} sourceSheetName Original sheet tab name
   * @param {number} headerIndex 0-indexed row number where the headers reside in the original sheet
   * @returns {string} The URL of the newly created spreadsheet
   */
  saveToGoogleDrive: async (data, filename, token, sourceSpreadsheetId = null, sourceSheetName = null, headerIndex = 0) => {
    if (!data || data.length === 0) {
      throw new Error("Cannot save an empty dataset to Google Drive.");
    }
    
    // 0. Resolve source sheet ID if provided
    let sourceSheetId = null;
    let resolvedSourceSheetName = sourceSheetName;
    if (sourceSpreadsheetId && sourceSheetName) {
      try {
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sourceSpreadsheetId}?fields=sheets(properties(title,sheetId))`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (metaRes.ok) {
          const meta = await metaRes.json();
          let sheet = meta.sheets.find(s => s.properties.title === sourceSheetName);
          if (!sheet && meta.sheets.length > 0) {
             sheet = meta.sheets[0]; // fallback
          }
          if (sheet) {
             sourceSheetId = sheet.properties.sheetId;
             resolvedSourceSheetName = sheet.properties.title;
          }
        }
      } catch (e) {
        console.warn("Could not fetch source sheet metadata", e);
      }
    }
    
    // 1. Create a new Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: filename
        }
      })
    });
    
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create spreadsheet: ${errText}`);
    }
    
    const spreadsheetInfo = await createRes.json();
    const newSpreadsheetId = spreadsheetInfo.spreadsheetId;
    let targetSheetName = 'Sheet1';
    
    // 2. If source sheet was found, copy it to preserve formatting
    let newCopiedSheetId = null;
    if (sourceSheetId !== null) {
      const defaultSheetId = spreadsheetInfo.sheets[0].properties.sheetId;
      const copyRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sourceSpreadsheetId}/sheets/${sourceSheetId}:copyTo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ destinationSpreadsheetId: newSpreadsheetId })
      });
      
      if (!copyRes.ok) {
         const errText = await copyRes.text();
         throw new Error(`Failed to copy sheet formatting from original: ${errText}`);
      }
      
      const copyInfo = await copyRes.json();
      newCopiedSheetId = copyInfo.sheetId;
      
      // Delete default sheet and rename copied sheet to original name
      const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            { deleteSheet: { sheetId: defaultSheetId } },
            { updateSheetProperties: {
                properties: { sheetId: newCopiedSheetId, title: resolvedSourceSheetName },
                fields: "title"
            }},
            { clearBasicFilter: { sheetId: newCopiedSheetId } },
            { updateDimensionProperties: {
                range: { sheetId: newCopiedSheetId, dimension: "ROWS" },
                properties: { hiddenByUser: false },
                fields: "hiddenByUser"
            }},
            { updateDimensionProperties: {
                range: { sheetId: newCopiedSheetId, dimension: "COLUMNS" },
                properties: { hiddenByUser: false },
                fields: "hiddenByUser"
            }}
          ]
        })
      });
      
      if (!batchRes.ok) {
         const errText = await batchRes.text();
         throw new Error(`Failed to rename copied sheet: ${errText}`);
      }
      
      targetSheetName = resolvedSourceSheetName;
      
      // Clear values but keep formatting (must wrap name in quotes, and clear from header row down)
      const clearRange = `'${targetSheetName}'!A${headerIndex + 1}:ZZ`;
      const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!clearRes.ok) {
         const errText = await clearRes.text();
         throw new Error(`Failed to clear copied sheet values: ${errText}`);
      }
    }
    
    // 3. Format data into a 2D array for values.update
    const headers = Object.keys(data[0]);
    const values = [headers];
    data.forEach(row => {
      values.push(headers.map(h => row[h]));
    });
    
    // 4. Update the new spreadsheet with the data
    let startRow = 1;
    if (sourceSheetId !== null) {
       startRow = headerIndex + 1;
    }
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}/values/${encodeURIComponent("'" + targetSheetName + "'")}!A${startRow}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values
      })
    });
    
    if (!updateRes.ok) {
       const errText = await updateRes.text();
       throw new Error(`Failed to populate spreadsheet: ${errText}`);
    }
    
    // 5. Extend formatting if source sheet was found
    if (sourceSheetId !== null && newCopiedSheetId !== null && data.length > 1) {
      const dataStartRow = headerIndex + 1; // 0-indexed row for the first data row
      const dataEndRow = dataStartRow + data.length;
      
      try {
        const formatRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                copyPaste: {
                  source: {
                    sheetId: newCopiedSheetId,
                    startRowIndex: dataStartRow,
                    endRowIndex: dataStartRow + 1
                  },
                  destination: {
                    sheetId: newCopiedSheetId,
                    startRowIndex: dataStartRow + 1,
                    endRowIndex: dataEndRow
                  },
                  pasteType: "PASTE_FORMAT"
                }
              },
              {
                copyPaste: {
                  source: {
                    sheetId: newCopiedSheetId,
                    startRowIndex: dataStartRow,
                    endRowIndex: dataStartRow + 1
                  },
                  destination: {
                    sheetId: newCopiedSheetId,
                    startRowIndex: dataStartRow + 1,
                    endRowIndex: dataEndRow
                  },
                  pasteType: "PASTE_DATA_VALIDATION"
                }
              },
              {
                copyPaste: {
                  source: {
                    sheetId: newCopiedSheetId,
                    startRowIndex: dataStartRow,
                    endRowIndex: dataStartRow + 1
                  },
                  destination: {
                    sheetId: newCopiedSheetId,
                    startRowIndex: dataStartRow + 1,
                    endRowIndex: dataEndRow
                  },
                  pasteType: "PASTE_CONDITIONAL_FORMATTING"
                }
              },
              {
                updateCells: {
                  range: {
                    sheetId: newCopiedSheetId,
                    startRowIndex: dataEndRow
                  },
                  fields: "userEnteredFormat,dataValidation"
                }
              },
              {
                updateCells: {
                  range: {
                    sheetId: newCopiedSheetId,
                    startColumnIndex: headers.length
                  },
                  fields: "userEnteredFormat,dataValidation"
                }
              }
            ]
          })
        });
        if (!formatRes.ok) {
           const errText = await formatRes.text();
           console.warn("Failed to extend formatting API response:", errText);
        }
      } catch (e) {
        console.warn("Network error extending formatting", e);
      }
    }
    
    return `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;
  },

  /**
   * Updates an existing Google Spreadsheet in-place with transformed data.
   */
  updateInPlace: async (data, token, spreadsheetId, sheetName, headerIndex = 0) => {
    try {
      if (!data || data.length === 0) throw new Error("No data to update.");

      // 1. Clear existing values from header row downwards to ensure a clean slate
      // We must wrap the sheet name in single quotes for the range.
      const clearRange = `'${sheetName}'!A${headerIndex + 1}:ZZ`;
      const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!clearRes.ok) {
         const err = await clearRes.json().catch(() => ({}));
         if (err.error && err.error.status === 'PERMISSION_DENIED') {
            throw new Error("PERMISSION_DENIED");
         }
         throw new Error("Failed to clear sheet values for in-place update.");
      }
      
      // 2. Format data into a 2D array
      const headers = Object.keys(data[0]);
      const values = [headers];
      data.forEach(row => {
        values.push(headers.map(h => row[h]));
      });
      
      // 3. Write new values
      const startRow = headerIndex + 1;
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'" + sheetName + "'")}!A${startRow}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      });
      
      if (!updateRes.ok) {
         const err = await updateRes.json().catch(() => ({}));
         if (err.error && err.error.status === 'PERMISSION_DENIED') {
            throw new Error("PERMISSION_DENIED");
         }
         throw new Error(`Failed to update spreadsheet in-place.`);
      }
      
      // 4. Clear formatting and data validation for unused rows and columns
      try {
         const getSheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
           headers: { Authorization: `Bearer ${token}` }
         });
         const sheetData = await getSheetRes.json();
         const sheetInfo = sheetData.sheets.find(s => s.properties.title === sheetName);
         if (sheetInfo) {
             const sheetId = sheetInfo.properties.sheetId;
             const dataEndRow = startRow + data.length;
             await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   requests: [
                      { updateCells: { range: { sheetId, startRowIndex: dataEndRow }, fields: "userEnteredFormat,dataValidation" } },
                      { updateCells: { range: { sheetId, startColumnIndex: headers.length }, fields: "userEnteredFormat,dataValidation" } }
                   ]
                })
             });
         }
      } catch (e) {
         console.warn("Failed to clear unused formatting in place:", e);
      }
      
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    } catch (error) {
      console.error("Error updating Google Drive in-place:", error);
      throw error;
    }
  }
};
