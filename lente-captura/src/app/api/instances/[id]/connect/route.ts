import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  UazapiClient,
  normalizeConnectionStatus,
  extractQrCode,
} from '@/lib/uazapi/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const phone = (body as { phone?: string }).phone;

  const supabase = await createServiceClient();

  const { data: instance, error } = await supabase
    .from('instances')
    .select('*')
    .eq('doctor_id', id)
    .single();

  if (error || !instance?.uazapi_token) {
    return NextResponse.json(
      { error: 'Instância ou token não configurado' },
      { status: 400 }
    );
  }

  try {
    const client = new UazapiClient(instance.uazapi_base_url, instance.uazapi_token);
    const response = await client.connect(phone);
    const status = normalizeConnectionStatus(response);
    const qrcode = extractQrCode(response);

    await supabase
      .from('instances')
      .update({
        connection_status: status === 'disconnected' ? 'connecting' : status,
        last_status_check: new Date().toISOString(),
      })
      .eq('id', instance.id);

    return NextResponse.json({
      status: status === 'disconnected' ? 'connecting' : status,
      qrcode,
      pairingCode: response.pairingCode,
      message: response.message,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao conectar' },
      { status: 500 }
    );
  }
}
