import type { AnalyticsPeriod } from '@/lib/analytics-period';
import { appendPeriodParams } from '@/lib/analytics-period';

export const UTM_DIMENSIONS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

export type UtmDimension = (typeof UTM_DIMENSIONS)[number];

export interface UtmQueryState {
  dimension: UtmDimension;
  filters: Partial<Record<UtmDimension, string>>;
}

export function parseUtmState(params: Record<string, string | undefined>): UtmQueryState {
  const dimension = UTM_DIMENSIONS.includes(params.utm_dim as UtmDimension)
    ? (params.utm_dim as UtmDimension)
    : 'utm_source';
  const filters: Partial<Record<UtmDimension, string>> = {};
  for (const dim of UTM_DIMENSIONS) {
    const value = params[dim]?.trim();
    if (value) filters[dim] = value;
  }
  return { dimension, filters };
}

export function appendAnalyticsParams(
  params: URLSearchParams,
  opts: {
    period: AnalyticsPeriod;
    doctorId?: string;
    utm?: UtmQueryState;
    run?: boolean;
  }
): void {
  appendPeriodParams(params, opts.period);
  if (opts.doctorId && opts.doctorId !== 'all') {
    params.set('doctor', opts.doctorId);
  }
  if (opts.run) {
    params.set('run', '1');
  }
  if (opts.utm) {
    if (opts.utm.dimension !== 'utm_source') {
      params.set('utm_dim', opts.utm.dimension);
    }
    for (const dim of UTM_DIMENSIONS) {
      const value = opts.utm.filters[dim];
      if (value) params.set(dim, value);
    }
  }
}

export function buildAnalyticsQuery(
  pathname: string,
  opts: {
    period: AnalyticsPeriod;
    doctorId?: string;
    utm?: UtmQueryState;
    run?: boolean;
  }
): string {
  const params = new URLSearchParams();
  appendAnalyticsParams(params, opts);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
