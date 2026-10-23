import type { SupabaseClient } from '@supabase/supabase-js';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';

export async function resolveDoctorIdByTenant(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<string | null> {
  const slug = tenantSlug.trim().toLowerCase();
  if (!slug || slug === 'default') return null;

  const { data } = await supabase
    .from('doctors')
    .select('id, instance_name, tenant_slug')
    .eq('status', 'active');

  if (!data?.length) return null;

  for (const d of data) {
    const resolved =
      d.tenant_slug || instanceNameToTenantSlug(d.instance_name);
    if (resolved === slug) return d.id;
  }

  return null;
}
