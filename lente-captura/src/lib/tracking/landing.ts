import type { SupabaseClient } from '@supabase/supabase-js';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';

export interface DoctorLandingConfig {
  doctorId: string;
  doctorName: string;
  tenantSlug: string;
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
}

export async function loadDoctorLandingConfig(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<DoctorLandingConfig | null> {
  const slug = tenantSlug.trim().toLowerCase();
  if (!slug || slug === 'default') return null;

  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, name, instance_name, tenant_slug, status')
    .eq('status', 'active');

  const doctor = doctors?.find(
    (d) =>
      (d.tenant_slug || instanceNameToTenantSlug(d.instance_name)) === slug
  );

  if (!doctor) return null;

  const { data: tracking } = await supabase
    .from('doctor_tracking')
    .select('meta_enabled, meta_pixel_id, ga4_enabled, ga4_measurement_id')
    .eq('doctor_id', doctor.id)
    .maybeSingle();

  return {
    doctorId: doctor.id,
    doctorName: doctor.name,
    tenantSlug: slug,
    metaPixelId:
      tracking?.meta_enabled && tracking.meta_pixel_id
        ? tracking.meta_pixel_id
        : null,
    ga4MeasurementId:
      tracking?.ga4_enabled && tracking.ga4_measurement_id
        ? tracking.ga4_measurement_id
        : null,
  };
}
