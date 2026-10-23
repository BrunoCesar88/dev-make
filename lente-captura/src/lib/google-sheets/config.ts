/**
 * Append na planilha ao receber webhook/ingest.
 * false = n8n preenche linha nova; Lente só grava no Supabase.
 * Colunas, status e fila manual continuam ativos.
 */
export function isGoogleSheetsSyncOnIngestEnabled(): boolean {
  return process.env.GOOGLE_SHEETS_SYNC_ON_INGEST === 'true';
}
