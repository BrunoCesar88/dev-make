import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeadOriginLabel } from '@/lib/leads/classify-origin';
import { DEFAULT_LEAD_STATUS } from '@/lib/leads/schema';
import { statusValueToLabel } from '@/lib/leads/columns';
import { normalizePhone } from '@/lib/leads/phone';
import { formatNowBrazilian } from '@/lib/date';
import {
  appendLeadToSheet,
  type LeadRowData,
} from '@/lib/google-sheets/client';
import { isGoogleSheetsSyncOnIngestEnabled } from '@/lib/google-sheets/config';
import { getColumnDefinitions } from '@/lib/google-sheets/sync-queue';

export interface IngestLeadInput {
  instanceName: string;
  patientName?: string | null;
  patientPhone: string;
  message?: string | null;
  messageId?: string | null;
  chatId?: string | null;
  source?: string;
  origem?: string | null;
  canais?: string | null;
  anuncio?: string | null;
  rawPayload?: Record<string, unknown>;
}

export async function ingestLead(
  supabase: SupabaseClient,
  input: IngestLeadInput
) {
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('id, name, spreadsheet_id, lead_enabled')
    .eq('instance_name', input.instanceName)
    .single();

  if (doctorError || !doctor) {
    return { error: `Médico não encontrado: ${input.instanceName}`, status: 404 };
  }

  if (!doctor.lead_enabled) {
    return { ok: true, skipped: true, reason: 'lead_disabled' };
  }

  const phone = normalizePhone(input.patientPhone);
  if (!phone) {
    return { error: 'Telefone inválido', status: 400 };
  }

  if (input.messageId) {
    const { data: byMessage } = await supabase
      .from('leads')
      .select('id')
      .eq('doctor_id', doctor.id)
      .eq('message_id', input.messageId)
      .maybeSingle();

    if (byMessage) {
      return { ok: true, lead_id: byMessage.id, duplicate: true, reason: 'message_id' };
    }
  }

  const { data: existingLeads } = await supabase
    .from('leads')
    .select('id, patient_phone')
    .eq('doctor_id', doctor.id);

  const existing = existingLeads?.find(
    (l) => normalizePhone(l.patient_phone) === phone
  );

  if (existing) {
    return { ok: true, lead_id: existing.id, duplicate: true, reason: 'phone' };
  }

  const marketingCanais =
    input.canais ||
    input.origem ||
    (input.rawPayload?.canais as string | undefined) ||
    (input.rawPayload?.origem as string | undefined) ||
    null;

  const fields: Record<string, string> = {};
  if (marketingCanais) fields.canais = marketingCanais;
  if (input.anuncio) fields.anuncio = input.anuncio;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      doctor_id: doctor.id,
      patient_name: input.patientName,
      patient_phone: phone,
      message: input.message,
      message_id: input.messageId,
      chat_id: input.chatId,
      source: input.source || 'whatsapp',
      status: DEFAULT_LEAD_STATUS,
      fields,
      raw_payload: input.rawPayload ?? null,
    })
    .select()
    .single();

  if (leadError) {
    if (leadError.code === '23505') {
      return { ok: true, duplicate: true, reason: 'unique_violation' };
    }
    return { error: leadError.message, status: 500 };
  }

  if (doctor.spreadsheet_id && isGoogleSheetsSyncOnIngestEnabled()) {
    try {
      const columns = await getColumnDefinitions(supabase);
      const row: LeadRowData = {
        receivedAt: formatNowBrazilian(),
        patientName: input.patientName || '',
        patientPhone: phone,
        status: statusValueToLabel(DEFAULT_LEAD_STATUS),
        fields: {
          ...(marketingCanais ? { canais: marketingCanais } : {}),
          ...(input.anuncio ? { anuncio: input.anuncio } : {}),
        },
      };

      await appendLeadToSheet(doctor.spreadsheet_id, row, columns);

      await supabase
        .from('leads')
        .update({ synced_to_sheets: true })
        .eq('id', lead.id);
    } catch (sheetError) {
      const msg =
        sheetError instanceof Error ? sheetError.message : 'Erro desconhecido';
      await supabase
        .from('leads')
        .update({ sheets_sync_error: msg })
        .eq('id', lead.id);
    }
  }

  return {
    ok: true,
    lead_id: lead.id,
    origem: marketingCanais as LeadOriginLabel | null,
  };
}
