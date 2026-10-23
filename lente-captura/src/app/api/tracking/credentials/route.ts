import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveDoctorIdByTenant } from '@/lib/tracking/resolve-doctor';
import { doctorLandingUrl } from '@/lib/tracker/tenant';

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

/** Tracker busca credenciais ao vivo — sem sync manual para Cloudflare. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const tenantSlug = (url.searchParams.get('tenant') || 'default').toLowerCase();

  const supabase = await createServiceClient();
  const doctorId = await resolveDoctorIdByTenant(supabase, tenantSlug);

  if (!doctorId) {
    return NextResponse.json({
      tenant_slug: tenantSlug,
      doctor_id: null,
      meta_pixel_id: null,
      ga4_measurement_id: null,
    });
  }

  const { data: doctor } = await supabase
    .from('doctors')
    .select('id, name, tenant_slug, instance_name')
    .eq('id', doctorId)
    .single();

  const { data: tracking } = await supabase
    .from('doctor_tracking')
    .select('*')
    .eq('doctor_id', doctorId)
    .maybeSingle();

  const trackerBase =
    tracking?.tracker_project_url ||
    process.env.NEXT_PUBLIC_TRACKER_URL ||
    'https://lente-tracking.pages.dev';

  const slug =
    doctor?.tenant_slug ||
    tenantSlug;

  return NextResponse.json({
    tenant_slug: slug,
    doctor_id: doctorId,
    doctor_name: doctor?.name || null,
    meta_pixel_id: tracking?.meta_enabled ? tracking.meta_pixel_id : null,
    meta_access_token: tracking?.meta_enabled ? tracking.meta_access_token : null,
    meta_test_event_code: tracking?.meta_test_event_code || null,
    meta_ads_access_token: tracking?.meta_ads_access_token || null,
    meta_ads_account_id: tracking?.meta_ads_account_id || null,
    ga4_measurement_id: tracking?.ga4_enabled ? tracking.ga4_measurement_id : null,
    ga4_api_secret: tracking?.ga4_enabled ? tracking.ga4_api_secret : null,
    encharge_api_key: tracking?.encharge_enabled ? tracking.encharge_api_key : null,
    landing_base_url:
      tracking?.landing_base_url || doctorLandingUrl(trackerBase, slug),
  });
}
