import type { SupabaseClient } from '@supabase/supabase-js';
import { LEAD_STATUS_LABELS } from '@/lib/leads/schema';

const OBSOLETE_KEYS = ['mensagem', 'origem', 'observacoes'] as const;

const SHEET_COLUMNS = [
  { key: 'data', label: 'Data', column_type: 'date', display_order: 1, is_required: true, is_system: true },
  { key: 'nome', label: 'Nome', column_type: 'text', display_order: 2, is_required: false, is_system: true },
  { key: 'telefone', label: 'Telefone', column_type: 'phone', display_order: 3, is_required: true, is_system: true },
  { key: 'convenio', label: 'Convênio', column_type: 'text', display_order: 4, is_required: false, is_system: true },
  { key: 'canais', label: 'Canais', column_type: 'text', display_order: 5, is_required: false, is_system: true },
  {
    key: 'status',
    label: 'Status',
    column_type: 'status',
    display_order: 6,
    is_required: true,
    is_system: true,
    status_options: [...LEAD_STATUS_LABELS],
  },
  { key: 'agendamento', label: 'Agendamento', column_type: 'text', display_order: 7, is_required: false, is_system: true },
  { key: 'compareceu', label: 'Compareceu?', column_type: 'text', display_order: 8, is_required: false, is_system: true },
  { key: 'procedimento', label: 'Qual procedimento?', column_type: 'text', display_order: 9, is_required: false, is_system: true },
  { key: 'valor_procedimento', label: 'Valor Procedimento', column_type: 'number', display_order: 10, is_required: false, is_system: true },
  { key: 'observacao', label: 'Observação', column_type: 'notes', display_order: 11, is_required: false, is_system: true },
  { key: 'anuncio', label: 'Anúncio', column_type: 'text', display_order: 12, is_required: false, is_system: true },
] as const;

function needsSheetColumnSync(currentKeys: Set<string>): boolean {
  if (OBSOLETE_KEYS.some((key) => currentKeys.has(key))) return true;
  return SHEET_COLUMNS.some((col) => !currentKeys.has(col.key));
}

/** Garante column_definitions alinhado à planilha (12 colunas, sem mensagem). */
export async function ensureSheetColumnDefinitions(
  supabase: SupabaseClient
): Promise<{ updated: boolean }> {
  const { data: current, error } = await supabase
    .from('column_definitions')
    .select('key');

  if (error) throw new Error(error.message);

  const currentKeys = new Set((current ?? []).map((row) => row.key));
  if (!needsSheetColumnSync(currentKeys)) {
    return { updated: false };
  }

  if (OBSOLETE_KEYS.some((key) => currentKeys.has(key))) {
    const { error: deleteError } = await supabase
      .from('column_definitions')
      .delete()
      .in('key', [...OBSOLETE_KEYS]);

    if (deleteError) throw new Error(deleteError.message);
  }

  const { error: upsertError } = await supabase.from('column_definitions').upsert(
    SHEET_COLUMNS.map((col) => ({
      key: col.key,
      label: col.label,
      column_type: col.column_type,
      display_order: col.display_order,
      is_required: col.is_required,
      is_system: col.is_system,
      status_options: 'status_options' in col ? col.status_options : null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'key' }
  );

  if (upsertError) throw new Error(upsertError.message);

  return { updated: true };
}
