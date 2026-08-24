/**
 * Google Apps Script for the research survey.
 *
 * 1. Open the target Google Sheet → Extensions → Apps Script.
 *    Paste this whole file into Code.gs (function name must be doPost).
 * 2. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone   ← not “Anyone with a Google account”
 * 3. If Google shows “hasn’t verified this app”: Advanced → Go to … (unsafe) → Allow.
 * 4. Copy the Web app URL ending in /exec into Vercel:
 *    GOOGLE_SHEETS_WEBHOOK_URL
 *    then Redeploy. After Code.gs edits: Deploy → Manage deployments → Edit → New version.
 * 5. Optional Script properties:
 *    SECRET = same as GOOGLE_SHEETS_WEBHOOK_SECRET
 *    SHEET_ID = spreadsheet id from the sheet URL, if this script is not bound to the sheet
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
    if (sheet.getLastRow() === 0 && Array.isArray(data.headers)) {
      sheet.appendRow(data.headers);
    }
    sheet.appendRow(data.values || []);

    return json({ ok: true, row: sheet.getLastRow() });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}
