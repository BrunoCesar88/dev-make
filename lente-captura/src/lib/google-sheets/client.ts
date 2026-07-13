import { google } from 'googleapis';

export interface LeadRow {
  receivedAt: string;
  patientName: string;
  patientPhone: string;
  message: string;
  doctorName: string;
  source: string;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n'
  );

  if (!email || !key) {
    throw new Error(
      'Google Service Account não configurada. Defina GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function appendLeadToSheet(
  spreadsheetId: string,
  lead: LeadRow,
  sheetName = 'Página1'
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:F`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          lead.receivedAt,
          lead.patientName,
          lead.patientPhone,
          lead.message,
          lead.doctorName,
          lead.source,
        ],
      ],
    },
  });
}

export async function testSheetAccess(spreadsheetId: string): Promise<boolean> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.get({ spreadsheetId, fields: 'spreadsheetId' });
    return true;
  } catch {
    return false;
  }
}
