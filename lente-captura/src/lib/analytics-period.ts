export type AnalyticsPeriod =
  | { mode: 'preset'; days: 7 | 30 | 90 }
  | { mode: 'custom'; from: string; to: string };

const PRESET_DAYS = [7, 30, 90] as const;

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatPtDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysAgoYmd(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseAnalyticsPeriod(params: {
  days?: string;
  from?: string;
  to?: string;
}): AnalyticsPeriod {
  const from = params.from?.trim();
  const to = params.to?.trim();
  if (from && to && isYmd(from) && isYmd(to) && to >= from) {
    return { mode: 'custom', from, to };
  }

  const daysRaw = parseInt(params.days || '30', 10);
  const days = PRESET_DAYS.includes(daysRaw as (typeof PRESET_DAYS)[number])
    ? (daysRaw as 7 | 30 | 90)
    : 30;
  return { mode: 'preset', days };
}

export function periodLabel(period: AnalyticsPeriod): string {
  if (period.mode === 'custom') {
    return `${formatPtDate(period.from)} – ${formatPtDate(period.to)}`;
  }
  return `Últimos ${period.days} dias`;
}

export function appendPeriodParams(
  params: URLSearchParams,
  period: AnalyticsPeriod
): void {
  if (period.mode === 'custom') {
    params.set('from', period.from);
    params.set('to', period.to);
  } else {
    params.set('days', String(period.days));
  }
}

export { PRESET_DAYS };
