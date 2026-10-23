import type { SupabaseClient } from '@supabase/supabase-js';
import { readSheetValues, resolveSheetName, type ColumnDefinition } from '@/lib/google-sheets/client';
import { getColumnDefinitions } from '@/lib/google-sheets/sync-queue';
import { labelToStatusValue } from '@/lib/leads/columns';
import { normalizePhone } from '@/lib/leads/phone';
import { dedupeLeads } from '@/lib/leads/dedupe';
import {
  getStartOfYesterdayBRT,
  parseBrazilianDateString,
} from '@/lib/date';

export interface SheetLeadRow {
  rowNumber: number;
  receivedAt: string | null;
  patientName: string | null;
  patientPhone: string;
  message: string | null;
  status: string;
  source: string;
  fields: Record<string, string>;
}

export interface PullFromSheetResult {
  imported: number;
  updated: number;
  skipped: number;
  totalRows: number;
  processedRows: number;
  lastImportedRow: number;
  fromRow: number;
  duplicatesRemoved: number;
  mode: 'incremental' | 'full';
}

export type PullFromSheetMode = 'incremental' | 'full';

export interface PullFromSheetOptions {
  mode?: PullFromSheetMode;
}

function getMaxImportedSheetRow(
  leads: { fields: Record<string, unknown> | null }[]
): number {
  let max = 0;
  for (const lead of leads) {
    const rowNum = Number(lead.fields?.sheets_row_number);
    if (rowNum > max) max = rowNum;
  }
  return max;
}

/** Ontem 00:00 no fuso de São Paulo — margem para não perder leads recentes */
function getStartOfYesterday(): Date {
  return getStartOfYesterdayBRT();
}

function filterRowsForImport(
  sheetLeads: SheetLeadRow[],
  mode: PullFromSheetMode,
  lastImportedRow: number
): SheetLeadRow[] {
  if (mode === 'full' || lastImportedRow === 0) {
    return sheetLeads;
  }

  const dayBeforeStart = getStartOfYesterday();

  return sheetLeads.filter((row) => {
    if (row.rowNumber > lastImportedRow) return true;
    if (!row.receivedAt) return true;
    return new Date(row.receivedAt) >= dayBeforeStart;
  });
}

function inferCanais(canais: string, anuncio: string): string {
  const canal = canais.trim();
  const ad = anuncio.trim().toLowerCase();

  if (
    ad &&
    (ad.includes('instagram.com') ||
      ad.includes('fb.me') ||
      ad.includes('facebook.com'))
  ) {
    return 'META';
  }

  return canal;
}

function extractYearFromSheetName(sheetName: string): number | undefined {
  const match = sheetName.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function parseSheetDate(value: string, defaultYear?: number): string | null {
  return parseBrazilianDateString(value, { defaultYear });
}

function headerIndexMap(
  headers: string[],
  columns: ColumnDefinition[]
): Map<string, number> {
  const byLabel = new Map(
    columns.map((col) => [col.label.trim().toLowerCase(), col.key])
  );

  /** Cabeçalhos comuns nas planilhas dos médicos */
  const canaisAliases = new Map([
    ['canais', 'canais'],
    ['canal', 'canais'],
    ['fonte', 'canais'],
    ['origem do lead', 'canais'],
    ['origem', 'canais'],
  ]);

  const dateAliases = new Map([
    ['data/hora', 'data'],
    ['data e hora', 'data'],
    ['data do lead', 'data'],
    ['date', 'data'],
    ['timestamp', 'data'],
  ]);

  const extraAliases = new Map([
    ['anúncio', 'anuncio'],
    ['anuncio', 'anuncio'],
    ['convênio', 'convenio'],
    ['convenio', 'convenio'],
    ['compareceu?', 'compareceu'],
    ['qual procedimento?', 'procedimento'],
    ['valor procedimento', 'valor_procedimento'],
    ['observação', 'observacao'],
    ['observacao', 'observacao'],
  ]);

  const map = new Map<string, number>();

  headers.forEach((header, index) => {
    const normalized = String(header).trim().toLowerCase();
    const key =
      byLabel.get(normalized) ??
      canaisAliases.get(normalized) ??
      dateAliases.get(normalized) ??
      extraAliases.get(normalized) ??
      null;
    if (key) map.set(key, index);
  });

  return map;
}

export function parseSheetRows(
  rows: string[][],
  columns: ColumnDefinition[],
  options: { defaultYear?: number } = {}
): SheetLeadRow[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map((cell) => String(cell ?? ''));
  const indexByKey = headerIndexMap(headers, columns);
  const get = (row: string[], key: string) => {
    const index = indexByKey.get(key);
    if (index === undefined) return '';
    return String(row[index] ?? '').trim();
  };

  const parsed: SheetLeadRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.length) continue;

    const phone = normalizePhone(get(row, 'telefone'));
    if (!phone || phone.length < 10) continue;

    const statusLabel = get(row, 'status') || 'AGUARDANDO RESPOSTA';
    const canais = inferCanais(get(row, 'canais'), get(row, 'anuncio'));
    const extraFields: Record<string, string> = {};

    for (const col of columns) {
      if (
        ['data', 'nome', 'telefone', 'status', 'canais'].includes(col.key)
      ) {
        continue;
      }
      const value = get(row, col.key);
      if (value) extraFields[col.key] = value;
    }

    const anuncio = get(row, 'anuncio');
    if (anuncio) extraFields.anuncio = anuncio;
    if (canais) extraFields.canais = canais;

    parsed.push({
      rowNumber: i + 1,
      receivedAt: parseSheetDate(get(row, 'data'), options.defaultYear),
      patientName: get(row, 'nome') || null,
      patientPhone: phone,
      message: null,
      status: labelToStatusValue(statusLabel),
      source: 'planilha',
      fields: extraFields,
    });
  }

  return parsed;
}

async function fetchExistingLeads(
  supabase: SupabaseClient,
  doctorId: string
): Promise<{ id: string; patient_phone: string; fields: Record<string, unknown> | null }[]> {
  const leads: { id: string; patient_phone: string; fields: Record<string, unknown> | null }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, patient_phone, fields')
      .eq('doctor_id', doctorId)
      .range(from, from + 999);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    leads.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }

  return leads;
}

export async function pullLeadsFromSheet(
  supabase: SupabaseClient,
  doctorId: string,
  spreadsheetId: string,
  options: PullFromSheetOptions = {}
): Promise<PullFromSheetResult> {
  const mode = options.mode ?? 'incremental';

  const [columns, sheetName] = await Promise.all([
    getColumnDefinitions(supabase),
    resolveSheetName(spreadsheetId),
  ]);
  const rows = await readSheetValues(spreadsheetId, sheetName);
  const defaultYear = extractYearFromSheetName(sheetName);

  const sheetLeads = parseSheetRows(rows, columns, { defaultYear });
  const existingLeads = await fetchExistingLeads(supabase, doctorId);

  const lastImportedRow = getMaxImportedSheetRow(existingLeads);
  const rowsToProcess = filterRowsForImport(sheetLeads, mode, lastImportedRow);
  const fromRow =
    mode === 'full' || lastImportedRow === 0
      ? 2
      : rowsToProcess.length > 0
        ? Math.min(...rowsToProcess.map((r) => r.rowNumber))
        : lastImportedRow + 1;

  const byRowNumber = new Map<number, string>();
  const byPhone = new Map<string, string>();

  for (const lead of existingLeads) {
    const rowNum = Number((lead.fields as Record<string, unknown>)?.sheets_row_number);
    if (rowNum) byRowNumber.set(rowNum, lead.id);
    const phone = normalizePhone(lead.patient_phone);
    if (phone) byPhone.set(phone, lead.id);
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  const toInsert: Array<Record<string, unknown> & { doctor_id: string }> = [];
  const toUpdate: { id: string; payload: Record<string, unknown> }[] = [];

  for (const row of rowsToProcess) {
    const phone = normalizePhone(row.patientPhone);
    if (!phone) {
      skipped++;
      continue;
    }

    const leadId =
      byRowNumber.get(row.rowNumber) ?? byPhone.get(phone);

    const payload: Record<string, unknown> = {
      patient_name: row.patientName,
      patient_phone: phone,
      message: row.message,
      status: row.status,
      source: row.source,
      synced_to_sheets: true,
      sheets_sync_error: null,
      fields: {
        ...row.fields,
        sheets_row_number: row.rowNumber,
      },
    };

    if (row.receivedAt) {
      payload.received_at = row.receivedAt;
    }

    if (leadId) {
      toUpdate.push({ id: leadId, payload });
    } else if (byPhone.has(phone)) {
      toUpdate.push({ id: byPhone.get(phone)!, payload });
    } else {
      toInsert.push({ ...payload, doctor_id: doctorId });
      byPhone.set(phone, `pending-${row.rowNumber}`);
    }
  }

  // Remove entradas pendentes do mapa antes dos inserts reais
  for (const [phone, id] of [...byPhone.entries()]) {
    if (id.startsWith('pending-')) byPhone.delete(phone);
  }

  const INSERT_BATCH = 100;
  for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
    const chunk = toInsert.slice(i, i + INSERT_BATCH);

    for (const row of chunk) {
      const phone = row.patient_phone as string;
      if (byPhone.has(phone)) {
        const existingId = byPhone.get(phone)!;
        const { error: updateError } = await supabase
          .from('leads')
          .update(row)
          .eq('id', existingId);
        if (updateError) skipped++;
        else updated++;
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('leads')
        .insert(row)
        .select('id, patient_phone, fields')
        .single();

      if (insertError) {
        const existingId = byPhone.get(phone);
        if (existingId) {
          const { error: updateError } = await supabase
            .from('leads')
            .update(row)
            .eq('id', existingId);
          if (updateError) skipped++;
          else updated++;
        } else {
          skipped++;
        }
        continue;
      }

      if (!inserted) {
        skipped++;
        continue;
      }

      imported++;
      const rowNum = Number(
        (inserted.fields as Record<string, unknown>)?.sheets_row_number
      );
      if (rowNum) byRowNumber.set(rowNum, inserted.id);
      byPhone.set(inserted.patient_phone, inserted.id);
    }
  }

  const UPDATE_PARALLEL = 25;
  for (let i = 0; i < toUpdate.length; i += UPDATE_PARALLEL) {
    const chunk = toUpdate.slice(i, i + UPDATE_PARALLEL);
    const results = await Promise.all(
      chunk.map(({ id, payload }) =>
        supabase.from('leads').update(payload).eq('id', id)
      )
    );
    for (const { error } of results) {
      if (error) skipped++;
      else updated++;
    }
  }

  const { removed: duplicatesRemoved } = await dedupeLeads(supabase, {
    doctorId,
  });

  return {
    imported,
    updated,
    skipped,
    totalRows: sheetLeads.length,
    processedRows: rowsToProcess.length,
    lastImportedRow,
    fromRow: Number.isFinite(fromRow) ? fromRow : 2,
    duplicatesRemoved,
    mode,
  };
}

export interface BulkPullResult {
  doctors: number;
  imported: number;
  updated: number;
  skipped: number;
  totalRows: number;
  errors: { doctor: string; error: string }[];
}

export async function pullLeadsForAllDoctors(
  supabase: SupabaseClient,
  options: { activeOnly?: boolean; mode?: PullFromSheetMode } = {}
): Promise<BulkPullResult> {
  const activeOnly = options.activeOnly ?? true;
  const mode = options.mode ?? 'incremental';

  let query = supabase
    .from('doctors')
    .select('id, name, spreadsheet_id, lead_enabled, status')
    .not('spreadsheet_id', 'is', null);

  if (activeOnly) {
    query = query.eq('status', 'active').eq('lead_enabled', true);
  }

  const { data: doctors, error } = await query.order('name');

  if (error) throw new Error(error.message);

  const result: BulkPullResult = {
    doctors: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    totalRows: 0,
    errors: [],
  };

  for (const doctor of doctors ?? []) {
    if (!doctor.spreadsheet_id) continue;

    try {
      const pull = await pullLeadsFromSheet(
        supabase,
        doctor.id,
        doctor.spreadsheet_id,
        { mode }
      );
      result.doctors++;
      result.imported += pull.imported;
      result.updated += pull.updated;
      result.skipped += pull.skipped;
      result.totalRows += pull.totalRows;
      console.log(
        `  ✓ ${doctor.name}: ${pull.totalRows} linhas · ${pull.imported} novos · ${pull.updated} atualizados`
      );
    } catch (err) {
      result.errors.push({
        doctor: doctor.name,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  }

  return result;
}
