import type { AnalyticsPeriod } from '@/lib/analytics-period';

export function periodToBounds(period: AnalyticsPeriod): {
  from: Date;
  to: Date;
  days: number;
} {
  if (period.mode === 'custom') {
    const from = new Date(`${period.from}T00:00:00.000Z`);
    const to = new Date(`${period.to}T23:59:59.999Z`);
    const days = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / 86400000) + 1
    );
    return { from, to, days };
  }

  const to = new Date();
  const from = new Date(to.getTime() - period.days * 86400000);
  return { from, to, days: period.days };
}

export function periodToIso(period: AnalyticsPeriod): {
  since: string;
  until: string;
  days: number;
} {
  const { from, to, days } = periodToBounds(period);
  return { since: from.toISOString(), until: to.toISOString(), days };
}
