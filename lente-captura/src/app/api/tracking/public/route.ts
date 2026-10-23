import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveDoctorIdByTenant } from '@/lib/tracking/resolve-doctor';
import { doctorLandingUrl, appBaseUrl } from '@/lib/tracker/tenant';

/** Público — só IDs de pixel/GA4 (não são segredos). Landing usa isso. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantSlug = (url.searchParams.get('tenant') || 'default').toLowerCase();

  const supabase = await createServiceClient();
  const doctorId = await resolveDoctorIdByTenant(supabase, tenantSlug);

  if (!doctorId) {
    return NextResponse.json({
      tenant_slug: tenantSlug,
      meta_pixel_id: null,
      ga4_measurement_id: null,
      landing_base_url: null,
    });
  }

  const { data: tracking } = await supabase
    .from('doctor_tracking')
    .select('meta_enabled, meta_pixel_id, ga4_enabled, ga4_measurement_id, tracker_project_url, landing_base_url')
    .eq('doctor_id', doctorId)
    .maybeSingle();

  const trackerBase = appBaseUrl();

  return NextResponse.json(
    {
      tenant_slug: tenantSlug,
      meta_pixel_id: tracking?.meta_enabled ? tracking.meta_pixel_id : null,
      ga4_measurement_id: tracking?.ga4_enabled ? tracking.ga4_measurement_id : null,
      landing_base_url:
        tracking?.landing_base_url || doctorLandingUrl(trackerBase, tenantSlug),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
