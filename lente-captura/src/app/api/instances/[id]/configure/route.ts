import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { UazapiClient } from '@/lib/uazapi/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { uazapi_token, uazapi_base_url, configure_webhook } = body as {
    uazapi_token?: string;
    uazapi_base_url?: string;
    configure_webhook?: boolean;
  };

  const supabase = await createServiceClient();

  const updates: Record<string, unknown> = {};
  if (uazapi_token) updates.uazapi_token = uazapi_token;
  if (uazapi_base_url) updates.uazapi_base_url = uazapi_base_url;

  const { data: doctor } = await supabase
    .from('doctors')
    .select('instance_name')
    .eq('id', id)
    .single();

  if (!doctor) {
    return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
  }

  const { data: instance, error } = await supabase
    .from('instances')
    .update(updates)
    .eq('doctor_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (configure_webhook && instance.uazapi_token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/webhook/uazapi?instance=${encodeURIComponent(doctor.instance_name)}`;

    try {
      const client = new UazapiClient(
        instance.uazapi_base_url,
        instance.uazapi_token
      );
      await client.setWebhook(webhookUrl);

      await supabase
        .from('instances')
        .update({ webhook_configured: true })
        .eq('id', instance.id);
    } catch (err) {
      return NextResponse.json({
        ok: true,
        warning: `Token salvo, mas webhook falhou: ${err instanceof Error ? err.message : 'erro'}`,
      });
    }
  }

  return NextResponse.json({ ok: true, instance });
}
