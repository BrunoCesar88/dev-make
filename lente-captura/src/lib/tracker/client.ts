import type { AnalyticsPeriod } from '@/lib/analytics-period';
import type { UtmQueryState } from '@/lib/analytics-query';
import type {
  TrackerAnalyticsBundle,
  TrackerAttribution,
  TrackerEvents,
  TrackerLeads,
  TrackerProducts,
  TrackerPurchases,
  TrackerRevenue,
  TrackerUtmBreakdown,
} from '@/lib/tracker/types';

function periodToParams(period: AnalyticsPeriod): Record<string, string | number> {
  if (period.mode === 'custom') {
    return { from: period.from, to: period.to };
  }
  return { days: period.days };
}

function trackerBaseUrl(): string {
  const base =
    process.env.TRACKER_BASE_URL ||
    process.env.NEXT_PUBLIC_TRACKER_URL ||
    'https://lente-tracking.pages.dev';
  return base.replace(/\/$/, '');
}

function trackerKey(): string | undefined {
  return process.env.TRACKER_DASH_KEY;
}

export function isTrackerConfigured(): boolean {
  return Boolean(trackerKey());
}

async function fetchTracker<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const key = trackerKey();
  if (!key) {
    throw new Error('TRACKER_DASH_KEY não configurada');
  }

  const url = new URL(path, trackerBaseUrl());
  url.searchParams.set('key', key);
  for (const [name, value] of Object.entries(params)) {
    if (value !== '' && value != null) {
      url.searchParams.set(name, String(value));
    }
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Tracker ${path} retornou ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function spanDaysFromPeriod(period: AnalyticsPeriod): number {
  if (period.mode === 'preset') return period.days;
  return Math.max(
    1,
    Math.round(
      (new Date(period.to).getTime() - new Date(period.from).getTime()) / 86400000
    ) + 1
  );
}

function emptyBundle(
  period: AnalyticsPeriod,
  tenant: string | null,
  tenantLabel: string | null,
  configured: boolean,
  error: string | null
): TrackerAnalyticsBundle {
  return {
    configured,
    error,
    period,
    days: spanDaysFromPeriod(period),
    tenant,
    tenantLabel,
    revenue: null,
    attribution: null,
    leads: null,
    utm: null,
    products: null,
    purchases: null,
    events: null,
  };
}

export async function loadTrackerAnalytics(
  period: AnalyticsPeriod,
  tenant?: string | null,
  tenantLabel?: string | null,
  utm?: UtmQueryState
): Promise<TrackerAnalyticsBundle> {
  const tenantParam = tenant && tenant !== 'all' ? tenant : null;
  const spanDays = spanDaysFromPeriod(period);

  if (!isTrackerConfigured()) {
    return emptyBundle(period, tenantParam, tenantLabel ?? null, false, null);
  }

  const baseParams = {
    ...periodToParams(period),
    ...(tenantParam ? { tenant: tenantParam } : {}),
  };

  const utmParams = {
    ...baseParams,
    dimension: utm?.dimension ?? 'utm_source',
    ...(utm?.filters ?? {}),
  };

  try {
    const [revenue, attribution, leads, utmData, products, purchases, events] =
      await Promise.all([
        fetchTracker<TrackerRevenue>('/api/revenue', baseParams),
        fetchTracker<TrackerAttribution>('/api/attribution', baseParams),
        fetchTracker<TrackerLeads>('/api/leads', { ...baseParams, limit: 50 }),
        fetchTracker<TrackerUtmBreakdown>('/api/utm-breakdown', utmParams),
        fetchTracker<TrackerProducts>('/api/products', baseParams),
        fetchTracker<TrackerPurchases>('/api/purchases', { ...baseParams, limit: 50 }),
        fetchTracker<TrackerEvents>('/api/events', { ...baseParams, limit: 1 }),
      ]);

    return {
      configured: true,
      error: null,
      period,
      days: spanDays,
      tenant: tenantParam,
      tenantLabel: tenantLabel ?? null,
      revenue,
      attribution,
      leads,
      utm: utmData,
      products,
      purchases,
      events,
    };
  } catch (err) {
    return emptyBundle(
      period,
      tenantParam,
      tenantLabel ?? null,
      true,
      err instanceof Error ? err.message : 'Erro ao carregar Tracker'
    );
  }
}
