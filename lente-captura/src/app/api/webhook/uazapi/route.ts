import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { classifyLeadOrigin } from '@/lib/leads/classify-origin';
import { ingestLead } from '@/lib/leads/ingest';
import { parseWebhookPayload } from '@/lib/uazapi/webhook-parser';
import type { UazapiWebhookPayload } from '@/types/database';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payload = (await request.json()) as UazapiWebhookPayload | Record<string, unknown>;
    const parsed = parseWebhookPayload(payload);

    if (!parsed) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'unparseable_payload' });
    }

    const instanceName =
      searchParams.get('instance') ||
      parsed.instanceName;

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Parâmetro instance ou body.instanceName é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select(
        'id, instance_name, lead_enabled, bio_phrase, site_phrase, manychat_phrase, social_selling_phrase'
      )
      .eq('instance_name', instanceName)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: `Médico não encontrado: ${instanceName}` },
        { status: 404 }
      );
    }

    const classification = classifyLeadOrigin({
      messageText: parsed.message,
      messageContent: parsed.messageContent,
      fromMe: parsed.fromMe,
      phrases: {
        bio_phrase: doctor.bio_phrase,
        site_phrase: doctor.site_phrase,
        manychat_phrase: doctor.manychat_phrase,
        social_selling_phrase: doctor.social_selling_phrase,
      },
    });

    if (!classification.accepted) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: classification.reason,
      });
    }

    const result = await ingestLead(supabase, {
      instanceName: doctor.instance_name,
      patientName: parsed.patientName,
      patientPhone: parsed.patientPhone,
      message: parsed.message,
      messageId: parsed.messageId,
      chatId: parsed.chatId,
      source: 'whatsapp',
      canais: classification.origem,
      origem: classification.origem,
      anuncio: classification.anuncio,
      rawPayload: parsed.rawPayload,
    });

    if ('error' in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 500 }
      );
    }

    return NextResponse.json(result);
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
