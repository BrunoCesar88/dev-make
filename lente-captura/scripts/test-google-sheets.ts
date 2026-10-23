#!/usr/bin/env npx tsx
/**
 * Testa acesso ao Google Sheets (OAuth ou Service Account)
 * Usage: npm run test:google-sheets [spreadsheet_id]
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { readSheetValues, resolveSheetName } from '../src/lib/google-sheets/client';

const spreadsheetId =
  process.argv[2] ?? '1LrivCjaW3U1L71hy2IeytFa_z4ShyWgH-OPrfb5kUQQ'; // Dra Ana Furst

async function main() {
  const mode = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    ? 'OAuth2 (conta Google — igual n8n)'
    : 'Service Account';

  console.log(`🔐 Modo: ${mode}`);
  console.log(`📄 Planilha: ${spreadsheetId}\n`);

  const sheetName = await resolveSheetName(spreadsheetId);
  console.log(`📑 Aba: ${sheetName}`);

  const rows = await readSheetValues(spreadsheetId);
  console.log(`✅ Acesso OK — ${rows.length} linhas (incluindo cabeçalho)`);
  if (rows[0]) {
    console.log(`   Cabeçalhos: ${rows[0].slice(0, 6).join(' | ')}`);
  }
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
