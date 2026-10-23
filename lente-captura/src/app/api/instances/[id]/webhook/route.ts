import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { UazapiClient } from '@/lib/uazapi/client';
import {
  UAZAPI_EXCLUDE_OPTIONS,
  UAZAPI_WEBHOOK_EVENTS,
} from '@/lib/uazapi/webhook-events';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin();

    const supabase = await createServiceClient();
    const { data: instance } = await supabase
      .from('instances')
      .select('uazapi_token, uazapi_base_url')
      .eq('doctor_id', id)
      .single();

    if (!instance?.uazapi_token) {
      return NextResponse.json({
        webhook: null,
        events: UAZAPI_WEBHOOK_EVENTS,
        excludeOptions: UAZAPI_EXCLUDE_OPTIONS,
      });
    }

    const client = new UazapiClient(
      instance.uazapi_base_url,
      instance.uazapi_token
    );

    const [webhooks, catalog] = await Promise.all([
      client.listWebhooks(),
      client.getWebhookCatalog(),
    ]);

    const webhook = webhooks[0] ?? null;

    return NextResponse.json({
      webhook,
      webhooks,
      events: catalog.events,
      excludeOptions: catalog.excludeOptions,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({
      webhook: null,
      events: UAZAPI_WEBHOOK_EVENTS,
      excludeOptions: UAZAPI_EXCLUDE_OPTIONS,
    });
  }
}
