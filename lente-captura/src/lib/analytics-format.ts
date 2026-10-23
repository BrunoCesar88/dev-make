export function money(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function fmtInt(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

export function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtPct(value: number | null | undefined) {
  if (value == null) return '—';
  return `${(value * 100).toFixed(2)}%`;
}

export function roas(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value.toFixed(2)}x`;
}

export function leadCountFromSummary(
  summary: Array<{ count: number }> | undefined,
  fallback: number
) {
  if (!summary?.length) return fallback;
  return summary.reduce((sum, row) => sum + (row.count || 0), 0);
}
