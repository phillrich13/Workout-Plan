// =============================================================
// Google Apps Script — Workout Plan Backend
// =============================================================
// SETUP INSTRUCTIONS:
// 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1ofvUHiTohMHF8hlf3KV4eu8t1ei0NAstAPpiP9QbQ9E/edit
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code in Code.gs
// 4. Paste this entire file into Code.gs
// 5. Click "Deploy" > "New deployment"
// 6. Select type: "Web app"
// 7. Set "Execute as": Me
// 8. Set "Who has access": Anyone
// 9. Click "Deploy" and authorize when prompted
// 10. Copy the Web App URL — it looks like:
//     https://script.google.com/macros/s/AKfycbx.../exec
// 11. Paste that URL into your dashboard's APPS_SCRIPT_URL constant
// =============================================================

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "load") {
    return loadState();
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ error: "Unknown action" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = e.parameter.action;
  
  if (action === "save") {
    return saveState(e);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ error: "Unknown action" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function loadState() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("State");
  
  if (!sheet) {
    // First time — create the State sheet with default structure
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("State");
    sheet.getRange("A1").setValue("stateJson");
    sheet.getRange("A2").setValue("lastUpdated");
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "empty", data: null }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var stateJson = sheet.getRange("B1").getValue();
  var lastUpdated = sheet.getRange("B2").getValue();
  
  if (!stateJson) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "empty", data: null }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: "ok", 
      data: JSON.parse(stateJson),
      lastUpdated: lastUpdated
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveState(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("State");
  
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("State");
    sheet.getRange("A1").setValue("stateJson");
    sheet.getRange("A2").setValue("lastUpdated");
  }
  
  var stateData = e.postData.contents;
  
  sheet.getRange("B1").setValue(stateData);
  sheet.getRange("B2").setValue(new Date().toISOString());
  
  // Also log each workout to the WorkoutLog sheet for easy viewing
  try {
    var state = JSON.parse(stateData);
    logWorkouts(state);
  } catch(err) {
    // Non-critical — state is still saved
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ status: "saved", timestamp: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function logWorkouts(state) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("WorkoutLog");
  
  if (!logSheet) {
    logSheet = ss.insertSheet("WorkoutLog");
    logSheet.getRange("A1:H1").setValues([["Week", "Day", "Date", "Difficulty", "Exercise", "Set", "Weight (lbs)", "Reps"]]);
    logSheet.getRange("A1:H1").setFontWeight("bold");
    logSheet.setFrozenRows(1);
  }
  
  // Clear old data (keep header)
  var lastRow = logSheet.getLastRow();
  if (lastRow > 1) {
    logSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }
  
  var rows = [];
  var diffLabels = ["", "Too Easy", "Moderate", "Just Right", "Hard", "Too Hard"];
  var dayNames = { "A": "Lower Body + Core", "B": "Upper Body Push + Pull", "C": "Lower Power + Upper Acc" };
  
  for (var w = 1; w <= 16; w++) {
    ["A", "B", "C"].forEach(function(d) {
      var key = "W" + w + "-" + d;
      var log = state.logs[key];
      if (log && log.difficulty > 0) {
        var sets = log.sets || {};
        var exerciseNames = Object.keys(sets);
        
        if (exerciseNames.length === 0) {
          rows.push([w, dayNames[d], log.date || "", diffLabels[log.difficulty] || "", "", "", "", ""]);
        } else {
          exerciseNames.forEach(function(exName) {
            var exSets = sets[exName] || [];
            exSets.forEach(function(s, idx) {
              if (s && (s.weight || s.reps)) {
                rows.push([w, dayNames[d], log.date || "", diffLabels[log.difficulty] || "", exName, idx + 1, s.weight || "", s.reps || ""]);
              }
            });
          });
        }
      }
    });
  }
  
  if (rows.length > 0) {
    logSheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
}
