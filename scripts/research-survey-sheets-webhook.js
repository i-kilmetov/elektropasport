/**
 * Google Apps Script for the research survey.
 *
 * 1. Create a Google Sheet.
 * 2. Extensions → Apps Script, paste this whole file into Code.gs
 *    (the function must be named doPost — do not wrap it in myFunction).
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Google may show “Google hasn’t verified this app”. That is expected
 *    for a personal Gmail Apps Script. Open Advanced → Go to … (unsafe) → Allow.
 *    You are authorizing your own script to write to your own Sheet.
 * 5. Copy the Web app URL (…/exec) into Vercel env GOOGLE_SHEETS_WEBHOOK_URL
 *    and Redeploy. After any Code.gs edit: Deploy → Manage deployments → Edit
 *    → New version.
 * 6. Optional: Project Settings → Script properties
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
