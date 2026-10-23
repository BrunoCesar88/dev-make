import { readFileSync } from 'fs';
import { resolve } from 'path';
import { google } from 'googleapis';

export interface ColumnDefinition {
  key: string;
  label: string;
  column_type: string;
  display_order: number;
}

export interface LeadRowData {
  receivedAt: string;
  patientName: string;
  patientPhone: string;
  status: string;
  fields?: Record<string, string>;
}

function loadServiceAccount(): { email: string; key: string } {
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonPath) {
    const fullPath = resolve(process.cwd(), jsonPath);
    let raw: { client_email?: string; private_key?: string };
    try {
      raw = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new Error(
          `Arquivo não encontrado: ${jsonPath}. Baixe o JSON no Google Cloud e salve em lente-captura/${jsonPath}`
        );
      }
      throw err;
    }

    if (!raw.client_email || !raw.private_key) {
      throw new Error(
        'JSON da Service Account inválido. O arquivo precisa de client_email e private_key.'
      );
    }

    return { email: raw.client_email, key: raw.private_key };
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n'
  );

  if (!email || !key) {
    throw new Error(
      'Google não configurado. Defina GOOGLE_SERVICE_ACCOUNT_JSON (caminho do JSON) ou GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
  }

  if (!key.includes('BEGIN PRIVATE KEY')) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY inválida. Baixe o JSON da Service Account no Google Cloud e use GOOGLE_SERVICE_ACCOUNT_JSON=secrets/google-service-account.json'
    );
  }

  return { email, key };
}

function getOAuth2Auth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function getAuth() {
  const oauth2 = getOAuth2Auth();
  if (oauth2) return oauth2;

  const { email, key } = loadServiceAccount();

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsApi() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export function leadToRowValues(
  lead: LeadRowData,
  columns: ColumnDefinition[]
): string[] {
  const fieldMap: Record<string, string> = {
    data: lead.receivedAt,
    nome: lead.patientName,
    telefone: lead.patientPhone,
    status: lead.status,
    ...(lead.fields ?? {}),
  };

  return columns
    .sort((a, b) => a.display_order - b.display_order)
    .map((col) => fieldMap[col.key] ?? '');
}

export async function syncSheetHeaders(
  spreadsheetId: string,
  columns: ColumnDefinition[],
  sheetName = 'Página1'
): Promise<void> {
  const sheets = getSheetsApi();
  const headers = columns
    .sort((a, b) => a.display_order - b.display_order)
    .map((col) => col.label);

  const lastCol = String.fromCharCode(64 + Math.max(headers.length, 1));

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: sheetRange(sheetName, `A1:${lastCol}1`),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] },
  });
}

export async function appendLeadToSheet(
  spreadsheetId: string,
  lead: LeadRowData,
  columns: ColumnDefinition[],
  sheetName = 'Página1'
): Promise<void> {
  const sheets = getSheetsApi();
  const values = leadToRowValues(lead, columns);
  const lastCol = String.fromCharCode(64 + Math.max(values.length, 1));

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange(sheetName, `A:${lastCol}`),
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

export async function updateLeadStatusInSheet(
  spreadsheetId: string,
  rowNumber: number,
  status: string,
  columns: ColumnDefinition[],
  sheetName = 'Página1'
): Promise<void> {
  const sheets = getSheetsApi();
  const statusCol = columns.find((c) => c.key === 'status');
  if (!statusCol) return;

  const colIndex = columns
    .sort((a, b) => a.display_order - b.display_order)
    .findIndex((c) => c.key === 'status');
  if (colIndex < 0) return;

  const colLetter = String.fromCharCode(65 + colIndex);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: sheetRange(sheetName, `${colLetter}${rowNumber}`),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status]] },
  });
}

function sheetRange(sheetName: string, range: string): string {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

export async function resolveSheetName(
  spreadsheetId: string,
  preferred = 'Página1'
): Promise<string> {
  const sheets = getSheetsApi();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const titles =
    meta.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? [];

  const candidates = [preferred, 'Página1', 'Sheet1', 'Planilha1', 'Leads'];
  for (const name of candidates) {
    if (titles.includes(name)) return name;
  }

  return titles[0] ?? preferred;
}

export async function readSheetValues(
  spreadsheetId: string,
  sheetName?: string
): Promise<string[][]> {
  const sheets = getSheetsApi();
  const resolvedName = sheetName ?? (await resolveSheetName(spreadsheetId));
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(resolvedName, 'A:Z'),
    valueRenderOption: 'FORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  return (response.data.values as string[][]) ?? [];
}

export async function testSheetAccess(spreadsheetId: string): Promise<boolean> {
  try {
    const sheets = getSheetsApi();
    await sheets.spreadsheets.get({ spreadsheetId, fields: 'spreadsheetId' });
    return true;
  } catch {
    return false;
  }
}
