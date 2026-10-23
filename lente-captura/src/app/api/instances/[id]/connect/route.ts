import { NextResponse } from 'next/server';
import { AuthError, requireDoctorAccess } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import {
  UazapiClient,
  normalizeConnectionStatus,
  extractQrCode,
  extractPairingCode,
  extractRawStatus,
  type ConnectMode,
} from '@/lib/uazapi/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireDoctorAccess(id);

    const body = await request.json().catch(() => ({}));
    const { phone, mode } = body as { phone?: string; mode?: ConnectMode };

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

    const client = new UazapiClient(instance.uazapi_base_url, instance.uazapi_token);
    const response = await client.connect({ phone, mode });
    const normalized = normalizeConnectionStatus(response);
    const qrcode = extractQrCode(response);
    const pairingCode = extractPairingCode(response);

    const uiStatus =
      qrcode || pairingCode
        ? 'connecting'
        : normalized === 'disconnected'
          ? 'connecting'
          : normalized;

    await supabase
      .from('instances')
      .update({
        connection_status: uiStatus,
        last_status_check: new Date().toISOString(),
      })
      .eq('id', instance.id);

    return NextResponse.json({
      status: uiStatus,
      rawStatus: extractRawStatus(response),
      qrcode,
      pairingCode,
      message: response.message,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao conectar' },
      { status: 500 }
    );
  }
}
