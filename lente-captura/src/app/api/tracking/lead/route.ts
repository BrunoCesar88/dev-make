import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { loadDoctorLandingConfig } from '@/lib/tracking/landing';
import { saveLeadAndFireMeta } from '@/lib/tracking/save-event';

export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const tenantSlug = (body.tenant_slug || '').trim().toLowerCase();
  const email = (body.email || '').trim();
  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  const eventId = (body.event_id || '').trim() || crypto.randomUUID();
  const eventSourceUrl =
    (body.event_source_url || '').trim() || request.headers.get('referer') || '';

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug obrigatório' }, { status: 400 });
  }
  if (!email || !name || !phone) {
    return NextResponse.json(
      { error: 'nome, email e telefone são obrigatórios' },
      { status: 400 }
    );
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

  try {
    const result = await saveLeadAndFireMeta(supabase, {
      tenantSlug,
      doctorId: config.doctorId,
      eventId,
      eventSourceUrl,
      name,
      email,
      phone,
      utmSource: body.utm_source,
      utmMedium: body.utm_medium,
      utmCampaign: body.utm_campaign,
      utmContent: body.utm_content,
      utmTerm: body.utm_term,
      fbc: body.fbc,
      gclid: body.gclid,
      referrer: body.referrer,
      clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      clientUserAgent: request.headers.get('user-agent') || undefined,
      metaPixelId:
        tracking?.meta_enabled && tracking.meta_pixel_id
          ? tracking.meta_pixel_id
          : null,
      metaAccessToken:
        tracking?.meta_enabled && tracking.meta_access_token
          ? tracking.meta_access_token
          : null,
      metaTestEventCode: tracking?.meta_test_event_code,
    });

    return NextResponse.json({
      ok: true,
      event_id: eventId,
      doctor_id: config.doctorId,
      meta_sent: result.metaResponseOk,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao salvar lead' },
      { status: 500 }
    );
  }
}
