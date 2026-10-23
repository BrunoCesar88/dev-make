import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ingestLead } from '@/lib/leads/ingest';

/**
 * Endpoint para migração gradual com n8n.
 * n8n envia POST com JSON normalizado:
 * {
 *   "instance": "Dra-Bruna-Lenz",
 *   "patient_name": "...",
 *   "patient_phone": "5511999999999",
 *   "message": "...",
 *   "source": "WhatsApp"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const instanceName =
      body.instance || body.instance_name || body.instanceName;

    if (!instanceName || !body.patient_phone) {
      return NextResponse.json(
        { error: 'instance e patient_phone são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const result = await ingestLead(supabase, {
      instanceName,
      patientName: body.patient_name ?? body.patientName,
      patientPhone: body.patient_phone ?? body.patientPhone,
      message: body.message,
      messageId: body.message_id ?? body.messageId,
      chatId: body.chat_id ?? body.chatId,
      source: body.source || 'n8n',
      origem: body.origem ?? body.canais ?? body.canal,
      rawPayload: body,
    });

    if ('error' in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'lente-ingest' });
}
