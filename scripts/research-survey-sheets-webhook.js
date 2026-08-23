/**
 * Google Apps Script for the research survey.
 *
 * 1. Create a Google Sheet.
 * 2. Extensions → Apps Script, paste this file.
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Put the web app URL into GOOGLE_SHEETS_WEBHOOK_URL.
 * 5. Optional: File → Project properties → Script properties
 *    SECRET = the same value as GOOGLE_SHEETS_WEBHOOK_SECRET
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
  if (secret && data.secret !== secret) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "forbidden" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0 && Array.isArray(data.headers)) {
    sheet.appendRow(data.headers);
  }
  sheet.appendRow(data.values || []);

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true }),
  ).setMimeType(ContentService.MimeType.JSON);
}
