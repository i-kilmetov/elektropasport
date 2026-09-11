/**
 * Google Apps Script for the research survey.
 *
 * 1. Open the target Google Sheet → Extensions → Apps Script.
 *    Paste this whole file into Code.gs (function name must be doPost).
 * 2. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone   ← not “Anyone with a Google account”
 * 3. If Google shows “hasn’t verified this app”: Advanced → Go to … (unsafe) → Allow.
 * 4. Copy the Web app URL ending in /exec into the host env:
 *    GOOGLE_SHEETS_WEBHOOK_URL
 *    After Code.gs edits: Deploy → Manage deployments → Edit → New version.
 * 5. Optional Script properties:
 *    SECRET = same as GOOGLE_SHEETS_WEBHOOK_SECRET
 *    SHEET_ID = spreadsheet id from the sheet URL, if this script is not bound to the sheet
 *
 * Actions:
 *   { action: "append", headers, values }  — default, write a survey row
 *   { action: "update_phone", responseId, phone } — fill phone on that row
 *
 * Browser GET on the /exec URL should return {"ok":true,"hint":"POST only"}.
 */
function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function targetSheet() {
  const bound = SpreadsheetApp.getActiveSpreadsheet();
  if (bound) return bound.getSheets()[0];
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id).getSheets()[0];
  throw new Error("no_spreadsheet");
}

function headerValues(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  if (sheet.getLastRow() === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (cell) {
    return String(cell || "");
  });
}

function ensureHeaderRow(sheet, headers) {
  if (!headers || !headers.length) return;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  const existing = headerValues(sheet);
  for (var i = 0; i < headers.length; i++) {
    if (existing[i]) continue;
    sheet.getRange(1, i + 1).setValue(headers[i]);
  }
}

function ensureNamedColumn(sheet, name) {
  const existing = headerValues(sheet);
  var index = existing.indexOf(name);
  if (index >= 0) return index + 1;
  const col = Math.max(existing.length, sheet.getLastColumn()) + 1;
  sheet.getRange(1, col).setValue(name);
  return col;
}

function updatePhone(sheet, data) {
  const responseId = data && data.responseId ? String(data.responseId) : "";
  const phone = data && data.phone ? String(data.phone) : "";
  if (!responseId) throw new Error("missing_response_id");
  if (!phone) throw new Error("missing_phone");

  const idCol = ensureNamedColumn(sheet, "response_id");
  const phoneCol = ensureNamedColumn(sheet, "phone");
  const last = sheet.getLastRow();
  if (last < 2) throw new Error("not_found");

  const ids = sheet.getRange(2, idCol, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || "") === responseId) {
      sheet.getRange(i + 2, phoneCol).setValue(phone);
      return;
    }
  }
  throw new Error("not_found");
}

function doGet() {
  return json({ ok: true, hint: "POST only" });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw) {
      return json({ ok: false, error: "empty_body" });
    }

    const data = JSON.parse(raw);
    const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (secret && data.secret !== secret) {
      return json({ ok: false, error: "forbidden" });
    }

    const sheet = targetSheet();
    if (data.action === "update_phone") {
      updatePhone(sheet, data);
      return json({ ok: true });
    }

    ensureHeaderRow(sheet, data.headers);
    sheet.appendRow(data.values || []);

    return json({ ok: true, row: sheet.getLastRow() });
  } catch (error) {
    const message =
      error && error.message ? String(error.message) : String(error);
    return json({ ok: false, error: message });
  }
}
