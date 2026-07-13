import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { appendLeadToSheet } from '@/lib/google-sheets/client';
import {
  parseWebhookPayload,
  shouldCaptureLead,
} from '@/lib/uazapi/webhook-parser';
import type { UazapiWebhookPayload } from '@/types/database';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Parâmetro instance é obrigatório' },
        { status: 400 }
      );
    }

    const payload = (await request.json()) as UazapiWebhookPayload;
    const parsed = parseWebhookPayload(payload);

    if (!parsed || parsed.fromMe) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!shouldCaptureLead(parsed.message)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const supabase = await createServiceClient();

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, name, spreadsheet_id, lead_enabled')
      .eq('instance_name', instanceName)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: `Médico não encontrado: ${instanceName}` },
        { status: 404 }
      );
    }

    if (!doctor.lead_enabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'lead_disabled' });
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        doctor_id: doctor.id,
        patient_name: parsed.patientName,
        patient_phone: parsed.patientPhone,
        message: parsed.message,
        message_id: parsed.messageId,
        chat_id: parsed.chatId,
        source: 'whatsapp',
        raw_payload: payload as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Erro ao salvar lead:', leadError);
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    // Sync Google Sheets
    if (doctor.spreadsheet_id) {
      try {
        await appendLeadToSheet(doctor.spreadsheet_id, {
          receivedAt: new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          }),
          patientName: parsed.patientName || '',
          patientPhone: parsed.patientPhone,
          message: parsed.message || '',
          doctorName: doctor.name,
          source: 'WhatsApp',
        });

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

    return NextResponse.json({ ok: true, lead_id: lead.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'lente-webhook' });
}
