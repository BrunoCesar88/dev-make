const trackerBase = () =>
  (
    process.env.TRACKER_BASE_URL ||
    process.env.NEXT_PUBLIC_TRACKER_URL ||
    'https://lente-tracking.pages.dev'
  ).replace(/\/$/, '');

export interface TrackerTenantHealth {
  tenant: string;
  landingUrl: string;
  landingOk: boolean;
  pixelConfigured: boolean;
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
  trackerDeployed: boolean;
  message: string;
}

export async function checkTrackerTenantHealth(
  tenantSlug: string
): Promise<TrackerTenantHealth> {
  const base = trackerBase();
  const landingUrl = `${base}/${tenantSlug}/inscricao`;

  let landingOk = false;
  let pixelConfigured = false;
  let metaPixelId: string | null = null;
  let ga4MeasurementId: string | null = null;
  let trackerDeployed = false;

  try {
    const [landingRes, publicRes] = await Promise.all([
      fetch(landingUrl, { cache: 'no-store' }),
      fetch(`${base}/api/tenant-public?tenant=${encodeURIComponent(tenantSlug)}`, {
        cache: 'no-store',
      }),
    ]);

    landingOk = landingRes.ok;
    trackerDeployed = publicRes.ok;

    if (publicRes.ok) {
      const cfg = (await publicRes.json()) as {
        meta_pixel_id?: string | null;
        ga4_measurement_id?: string | null;
      };
      metaPixelId = cfg.meta_pixel_id || null;
      ga4MeasurementId = cfg.ga4_measurement_id || null;
      pixelConfigured = Boolean(metaPixelId);
    }
  } catch {
    // network / offline
  }

  let message: string;
  if (!trackerDeployed) {
    message =
      'Tracker ainda não tem o deploy novo (landing /api/tenant-public). Faça push do Tracker + migrations D1.';
  } else if (!landingOk) {
    message = 'Landing retornou erro — confira _redirects no Tracker.';
  } else if (!pixelConfigured) {
    message =
      'Landing no ar, mas Pixel não provisionado. Salve o tracking de novo em Médicos → Tracking.';
  } else {
    message = 'Landing e Pixel OK — use esta URL nos anúncios.';
  }

  return {
    tenant: tenantSlug,
    landingUrl,
    landingOk,
    pixelConfigured,
    metaPixelId,
    ga4MeasurementId,
    trackerDeployed,
    message,
  };
}
