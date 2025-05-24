import { google } from 'googleapis';

/**
 * Appends upload info to a Google Sheet
 */
async function logToGoogleSheet(auth, spreadsheetId, batchName, data) {
  const sheets = google.sheets({ version: 'v4', auth });

  // Add folder name and timestamp as new columns
  const now = new Date().toISOString();
  const values = data.map(({ file, link, driveFolder }) => [batchName, file, link, driveFolder, now]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });

  console.log(`📝 Logged ${values.length} rows to Google Sheet`);
}

export { logToGoogleSheet };
