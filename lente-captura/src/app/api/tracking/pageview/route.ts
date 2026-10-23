import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { loadDoctorLandingConfig } from '@/lib/tracking/landing';
import { savePageView } from '@/lib/tracking/save-event';
import { sendMetaCapiEvent } from '@/lib/tracking/meta-capi';

export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const tenantSlug = (body.tenant_slug || '').trim().toLowerCase();
  const eventId = (body.event_id || '').trim() || crypto.randomUUID();
  const eventSourceUrl =
    (body.event_source_url || '').trim() || request.headers.get('referer') || '';

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug obrigatório' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const config = await loadDoctorLandingConfig(supabase, tenantSlug);
  if (!config) {
    return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
  }

  const { data: tracking } = await supabase
    .from('doctor_tracking')
    .select('meta_pixel_id, meta_access_token, meta_test_event_code, meta_enabled')
    .eq('doctor_id', config.doctorId)
    .maybeSingle();

  if (tracking?.meta_enabled && tracking.meta_pixel_id && tracking.meta_access_token) {
    await sendMetaCapiEvent(
      {
        pixelId: tracking.meta_pixel_id,
        accessToken: tracking.meta_access_token,
        testEventCode: tracking.meta_test_event_code,
      },
      {
        eventName: 'PageView',
        eventId,
        eventSourceUrl,
      }
    );
  }

  try {
    await savePageView(supabase, {
      tenantSlug,
      doctorId: config.doctorId,
      eventId,
      eventSourceUrl,
      utmSource: body.utm_source,
      utmMedium: body.utm_medium,
      utmCampaign: body.utm_campaign,
      fbc: body.fbc,
      gclid: body.gclid,
      referrer: body.referrer,
    });

    return NextResponse.json({ ok: true, event_id: eventId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro' },
      { status: 500 }
    );
  }
}
