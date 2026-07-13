import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  UazapiClient,
  normalizeConnectionStatus,
  extractQrCode,
} from '@/lib/uazapi/client';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: instance, error } = await supabase
    .from('instances')
    .select('*, doctor:doctors(*)')
    .eq('doctor_id', id)
    .single();

  if (error || !instance) {
    return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
  }

  if (!instance.uazapi_token) {
    return NextResponse.json({
      status: 'disconnected',
      message: 'Token Uazapi não configurado',
      configured: false,
    });
  }

  try {
    const client = new UazapiClient(instance.uazapi_base_url, instance.uazapi_token);
    const response = await client.getStatus();
    const status = normalizeConnectionStatus(response);
    const qrcode = extractQrCode(response);

    await supabase
      .from('instances')
      .update({
        connection_status: status,
        last_status_check: new Date().toISOString(),
      })
      .eq('id', instance.id);

    if (instance.connection_status !== status) {
      await supabase.from('connection_logs').insert({
        doctor_id: id,
        previous_status: instance.connection_status,
        new_status: status,
      });
    }

    return NextResponse.json({
      status,
      qrcode,
      pairingCode: response.pairingCode,
      configured: true,
      lastCheck: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      status: 'disconnected',
      error: err instanceof Error ? err.message : 'Erro ao consultar Uazapi',
      configured: true,
    });
  }
}
