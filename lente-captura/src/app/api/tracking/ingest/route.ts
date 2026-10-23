import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveDoctorIdByTenant } from '@/lib/tracking/resolve-doctor';

function ingestSecret(): string | undefined {
  return process.env.TRACKING_INGEST_SECRET || process.env.TRACKER_SYNC_SECRET;
}

function authorized(request: Request): boolean {
  const secret = ingestSecret();
  if (!secret) return false;
  const header =
    request.headers.get('x-tracking-secret') ||
    request.headers.get('x-sync-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return header === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = String(body.type || 'event');
  const tenantSlug = String(body.tenant_slug || 'default').toLowerCase();
  const supabase = await createServiceClient();
  const doctorId = await resolveDoctorIdByTenant(supabase, tenantSlug);

  if (type === 'session') {
    const sessionId = String(body.session_id || '');
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const attr = (body.attribution || {}) as Record<string, string | null>;
    const row = {
      session_id: sessionId,
      doctor_id: doctorId,
      tenant_slug: tenantSlug,
      external_id: str(body.external_id),
      fbclid: str(attr.fbclid ?? body.fbclid),
      gclid: str(attr.gclid ?? body.gclid),
      msclkid: str(attr.msclkid ?? body.msclkid),
      fbc: str(attr.fbc ?? body.fbc),
      fbp: str(attr.fbp ?? body.fbp),
      utm_source: str(attr.utm_source),
      utm_medium: str(attr.utm_medium),
      utm_campaign: str(attr.utm_campaign),
      utm_content: str(attr.utm_content),
      utm_term: str(attr.utm_term),
      referrer: str(attr.referrer ?? body.referrer),
      landing_url: str(attr.landing_url ?? body.landing_url),
      ip_address: str(body.ip_address),
      user_agent: str(body.user_agent),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('tracking_sessions').upsert(row, {
      onConflict: 'session_id',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, type: 'session', doctor_id: doctorId });
  }

  if (type === 'purchase') {
    const transactionId = String(body.transaction_id || '');
    if (!transactionId) {
      return NextResponse.json({ error: 'transaction_id required' }, { status: 400 });
    }

    const attr = (body.attribution || {}) as Record<string, string | null>;
    const row = {
      transaction_id: transactionId,
      doctor_id: doctorId,
      tenant_slug: tenantSlug,
      session_id: str(body.session_id),
      raw_email: str(body.raw_email),
      product_id: str(body.product_id),
      product_name: str(body.product_name),
      value: Number(body.value || 0),
      currency: str(body.currency) || 'BRL',
      fbc: str(attr.fbc ?? body.fbc),
      gclid: str(attr.gclid ?? body.gclid),
      gbraid: str(body.gbraid),
      wbraid: str(body.wbraid),
      utm_source: str(attr.utm_source),
      utm_medium: str(attr.utm_medium),
      utm_campaign: str(attr.utm_campaign),
      meta_response_ok: bool(body.meta_response_ok),
      ga4_response_ok: bool(body.ga4_response_ok),
      google_ads_response_ok: bool(body.google_ads_response_ok),
      google_ads_response_body: str(body.google_ads_response_body),
      purchased_at: ts(body.purchased_at ?? body.timestamp),
    };

    const { error } = await supabase.from('tracking_purchases').upsert(row, {
      onConflict: 'transaction_id',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, type: 'purchase', doctor_id: doctorId });
  }

  if (type === 'ad_spend') {
    const rows = Array.isArray(body.rows) ? body.rows : [body];
    const inserts = rows.map((r: Record<string, unknown>) => ({
      doctor_id: doctorId,
      tenant_slug: tenantSlug,
      platform: str(r.platform) || 'meta',
      spend_date: String(r.spend_date || r.date).slice(0, 10),
      campaign_id: str(r.campaign_id) || '',
      campaign_name: str(r.campaign_name),
      spend_cents: Number(r.spend_cents || 0),
      currency: str(r.currency) || 'BRL',
      impressions: Number(r.impressions || 0),
      clicks: Number(r.clicks || 0),
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('tracking_ad_spend').upsert(inserts, {
      onConflict: 'platform,tenant_slug,spend_date,campaign_id',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, type: 'ad_spend', count: inserts.length });
  }

  // default: event (Lead, PageView, etc.)
  const eventId = String(body.event_id || '');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  const attr = (body.attribution || {}) as Record<string, string | null>;
  const tracking = (body.tracking || {}) as Record<string, unknown>;

  const row = {
    event_id: eventId,
    doctor_id: doctorId,
    tenant_slug: tenantSlug,
    session_id: str(body.session_id),
    event_name: str(body.event_name) || 'Lead',
    event_source_url: str(body.event_source_url),
    raw_email: str(body.raw_email),
    browser: str(tracking.browser),
    os: str(tracking.os),
    is_mobile: Boolean(tracking.is_mobile),
    is_bot: Boolean(tracking.is_bot),
    bot_reason: str(tracking.bot_reason),
    pixel_was_blocked: Boolean(tracking.pixel_was_blocked),
    meta_response_ok: bool(tracking.meta_response_ok),
    meta_status_code: num(tracking.meta_status_code),
    ga4_response_ok: bool(tracking.ga4_response_ok),
    utm_source: str(attr.utm_source),
    utm_medium: str(attr.utm_medium),
    utm_campaign: str(attr.utm_campaign),
    utm_content: str(attr.utm_content),
    utm_term: str(attr.utm_term),
    fbc: str(attr.fbc ?? body.fbc),
    gclid: str(attr.gclid ?? body.gclid),
    referrer: str(attr.referrer),
    event_time: ts(body.timestamp ?? body.event_time),
  };

  const { error } = await supabase.from('tracking_events').upsert(row, {
    onConflict: 'event_id',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, type: 'event', doctor_id: doctorId });
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function bool(v: unknown): boolean | null {
  if (v == null) return null;
  return Boolean(v);
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ts(v: unknown): string {
  if (typeof v === 'number') {
    return new Date(v > 1e12 ? v : v * 1000).toISOString();
  }
  if (typeof v === 'string' && v) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}
