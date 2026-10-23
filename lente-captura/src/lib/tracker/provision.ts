import { appBaseUrl, doctorLandingUrl } from '@/lib/tracker/tenant';

/** @deprecated Cloudflare Tracker não é mais usado — landing e analytics ficam no Captura/Supabase. */
export async function provisionTenantOnTracker(): Promise<{
  ok: boolean;
  skipped?: boolean;
}> {
  return { ok: true, skipped: true };
}

export function autoLandingUrl(tenantSlug: string): string {
  return doctorLandingUrl(appBaseUrl(), tenantSlug);
}
