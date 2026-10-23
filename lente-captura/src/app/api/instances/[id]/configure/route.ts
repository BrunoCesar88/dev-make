import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { UazapiClient, normalizeWebhookUrl } from '@/lib/uazapi/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin();

    const body = await request.json();
    const {
      uazapi_token,
      uazapi_base_url,
      configure_webhook,
      webhook_url,
      webhook_id,
      events,
      exclude_messages,
    } = body as {
      uazapi_token?: string;
      uazapi_base_url?: string;
      configure_webhook?: boolean;
      webhook_url?: string;
      webhook_id?: string;
      events?: string[];
      exclude_messages?: string[];
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
      const targetUrl =
        webhook_url ||
        `${appUrl}/api/webhook/uazapi?instance=${encodeURIComponent(doctor.instance_name)}`;

      try {
        const client = new UazapiClient(
          instance.uazapi_base_url,
          instance.uazapi_token
        );

        const savedWebhook = await client.upsertWebhook(
          {
            id: webhook_id,
            url: targetUrl,
            enabled: true,
            events: events?.length ? events : ['messages'],
            excludeMessages: exclude_messages?.length
              ? exclude_messages
              : ['wasSentByApi', 'isGroupYes'],
            addUrlEvents: false,
            addUrlTypesMessages: false,
          },
          {
            instanceName: doctor.instance_name,
            preferredId: webhook_id,
          }
        );

        const webhooks = await client.listWebhooks();
        const duplicates = webhooks.filter(
          (hook) =>
            hook.url.includes(
              `instance=${encodeURIComponent(doctor.instance_name)}`
            ) ||
            normalizeWebhookUrl(hook.url) === normalizeWebhookUrl(targetUrl)
        );

        if (duplicates.length > 1) {
          return NextResponse.json({
            ok: true,
            warning: `Webhook atualizado, mas ainda existem ${duplicates.length} entradas na Uazapi. Remova as duplicatas no painel (ícone da lixeira).`,
            webhooks,
            webhook: savedWebhook,
          });
        }

        const saved = webhooks.some(
          (hook) =>
            normalizeWebhookUrl(hook.url) === normalizeWebhookUrl(targetUrl) ||
            (savedWebhook.id && hook.id === savedWebhook.id)
        );

        if (!saved) {
          return NextResponse.json({
            ok: true,
            warning:
              'Token salvo, mas a Uazapi não confirmou o webhook na lista. Tente novamente ou crie pelo painel Uazapi.',
            webhooks,
          });
        }

        await supabase
          .from('instances')
          .update({ webhook_configured: true })
          .eq('id', instance.id);

        return NextResponse.json({ ok: true, instance, webhooks, webhook: savedWebhook });
      } catch (err) {
        return NextResponse.json({
          ok: true,
          warning: `Token salvo, mas webhook falhou: ${err instanceof Error ? err.message : 'erro'}`,
        });
      }
    }

    return NextResponse.json({ ok: true, instance });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
