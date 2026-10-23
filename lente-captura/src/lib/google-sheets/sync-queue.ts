import type { SupabaseClient } from '@supabase/supabase-js';
import {
  appendLeadToSheet,
  syncSheetHeaders,
  updateLeadStatusInSheet,
  type ColumnDefinition,
  type LeadRowData,
} from '@/lib/google-sheets/client';
import { statusValueToLabel } from '@/lib/leads/columns';

export async function getColumnDefinitions(
  supabase: SupabaseClient
): Promise<ColumnDefinition[]> {
  const { data } = await supabase
    .from('column_definitions')
    .select('key, label, column_type, display_order')
    .order('display_order');
  return data ?? [];
}

export async function enqueueSheetSync(
  doctorId: string | null,
  syncType: 'append_row' | 'update_row' | 'update_cell' | 'sync_headers',
  payload: Record<string, unknown>
) {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = await createServiceClient();
  await supabase.from('sheets_sync_queue').insert({
    doctor_id: doctorId,
    sync_type: syncType,
    payload,
    status: 'pending',
  });
}

export async function processSyncQueue(
  supabase: SupabaseClient,
  limit = 20
): Promise<{ processed: number; failed: number }> {
  const { data: jobs } = await supabase
    .from('sheets_sync_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at')
    .limit(limit);

  if (!jobs?.length) return { processed: 0, failed: 0 };

  const columns = await getColumnDefinitions(supabase);
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    await supabase
      .from('sheets_sync_queue')
      .update({ status: 'processing' })
      .eq('id', job.id);

    try {
      const payload = job.payload as Record<string, unknown>;

      if (job.sync_type === 'sync_headers') {
        const doctorIds =
          job.doctor_id === null
            ? (
                await supabase
                  .from('doctors')
                  .select('id, spreadsheet_id')
                  .not('spreadsheet_id', 'is', null)
              ).data ?? []
            : (
                await supabase
                  .from('doctors')
                  .select('id, spreadsheet_id')
                  .eq('id', job.doctor_id)
                  .not('spreadsheet_id', 'is', null)
              ).data ?? [];

        for (const doc of doctorIds) {
          if (doc.spreadsheet_id) {
            await syncSheetHeaders(doc.spreadsheet_id, columns);
          }
        }
      } else if (job.sync_type === 'append_row' && job.doctor_id) {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('spreadsheet_id')
          .eq('id', job.doctor_id)
          .single();

        if (doctor?.spreadsheet_id) {
          await appendLeadToSheet(
            doctor.spreadsheet_id,
            payload.lead as LeadRowData,
            columns
          );
        }
      } else if (job.sync_type === 'update_cell' && job.doctor_id) {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('spreadsheet_id')
          .eq('id', job.doctor_id)
          .single();

        if (doctor?.spreadsheet_id && payload.rowNumber && payload.status) {
          await updateLeadStatusInSheet(
            doctor.spreadsheet_id,
            payload.rowNumber as number,
            payload.status as string,
            columns
          );
        }
      }

      await supabase
        .from('sheets_sync_queue')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .eq('id', job.id);
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      await supabase
        .from('sheets_sync_queue')
        .update({
          status: 'failed',
          error: msg,
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      failed++;
    }
  }

  return { processed, failed };
}
