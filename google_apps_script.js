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
  var callback = e.parameter.callback;
  var result;
  
  if (action === "load") {
    result = loadStateData();
  } else if (action === "save" && e.parameter.data) {
    result = saveStateFromGet(e.parameter.data);
  } else {
    result = { error: "Unknown action. Use ?action=load or ?action=save&data=..." };
  }
  
  var jsonStr = JSON.stringify(result);
  
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + jsonStr + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService
    .createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = e.parameter.action;
  var result;
  
  if (action === "save") {
    result = saveStateFromPost(e);
  } else {
    result = { error: "Unknown action" };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateStateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("State");
  if (!sheet) {
    sheet = ss.insertSheet("State");
    sheet.getRange("A1").setValue("stateJson");
    sheet.getRange("A2").setValue("lastUpdated");
  }
  return sheet;
}

function loadStateData() {
  var sheet = getOrCreateStateSheet();
  var stateJson = sheet.getRange("B1").getValue();
  var lastUpdated = sheet.getRange("B2").getValue();
  
  if (!stateJson) {
    return { status: "empty", data: null };
  }
  
  return { 
    status: "ok", 
    data: JSON.parse(stateJson),
    lastUpdated: lastUpdated
  };
}

function writeState(stateData) {
  var sheet = getOrCreateStateSheet();
  sheet.getRange("B1").setValue(stateData);
  sheet.getRange("B2").setValue(new Date().toISOString());
  
  try {
    var state = JSON.parse(stateData);
    logWorkouts(state);
  } catch(err) {}
  
  return { status: "saved", timestamp: new Date().toISOString() };
}

function saveStateFromPost(e) {
  var stateData = e.postData.contents;
  return writeState(stateData);
}

function saveStateFromGet(dataParam) {
  return writeState(decodeURIComponent(dataParam));
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
