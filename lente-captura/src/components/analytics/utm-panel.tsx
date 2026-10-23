'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { money, fmtInt } from '@/lib/analytics-format';
import {
  UTM_DIMENSIONS,
  type UtmDimension,
  type UtmQueryState,
  buildAnalyticsQuery,
} from '@/lib/analytics-query';
import type { AnalyticsPeriod } from '@/lib/analytics-period';
import type { TrackerUtmRow } from '@/lib/tracker/types';

const TAB_LABELS: Record<UtmDimension, string> = {
  utm_source: 'origem',
  utm_medium: 'mídia',
  utm_campaign: 'campanha',
  utm_content: 'conteúdo',
  utm_term: 'termo',
};

export function AnalyticsUtmPanel({
  period,
  doctorId,
  utm,
  rows,
}: {
  period: AnalyticsPeriod;
  doctorId?: string;
  utm: UtmQueryState;
  rows: TrackerUtmRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (nextUtm: UtmQueryState) => {
    router.push(buildAnalyticsQuery(pathname, { period, doctorId, utm: nextUtm }));
  };

  const addFilter = (value: string) => {
    if (!value || value === '(not set)') return;
    navigate({
      dimension: utm.dimension,
      filters: { ...utm.filters, [utm.dimension]: value },
    });
  };

  const removeFilter = (dim: UtmDimension) => {
    const filters = { ...utm.filters };
    delete filters[dim];
    navigate({ dimension: utm.dimension, filters });
  };

  const filterEntries = Object.entries(utm.filters) as Array<[UtmDimension, string]>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--brand-border)]">
        {UTM_DIMENSIONS.map((dim) => (
          <button
            key={dim}
            type="button"
            onClick={() => navigate({ ...utm, dimension: dim })}
            className={cn(
              'border-b-2 px-3 py-2 text-[13px] transition',
              utm.dimension === dim
                ? 'border-[var(--brand-accent)] font-medium text-[var(--brand-text)]'
                : 'border-transparent text-[var(--brand-text-secondary)] hover:text-[var(--brand-text)]'
            )}
          >
            {TAB_LABELS[dim]}
          </button>
        ))}
      </div>

      {filterEntries.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {filterEntries.map(([dim, value]) => (
            <button
              key={dim}
              type="button"
              onClick={() => removeFilter(dim)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-text)] px-3 py-1 text-[12px] text-white"
            >
              <span className="text-white/70">{dim}:</span> {value} ×
            </button>
          ))}
        </div>
      )}

      {!rows.length ? (
        <p className="text-[13px] text-[var(--brand-text-tertiary)]">
          Nenhuma compra com UTM no período
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--brand-border)] text-left text-[11px] uppercase tracking-wider text-[var(--brand-text-secondary)]">
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-3 text-right">Vendas</th>
                <th className="py-2 pr-3 text-right">Receita</th>
                <th className="py-2 text-right">Ticket médio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.value}
                  className="cursor-pointer border-b border-[var(--brand-border)] last:border-0 hover:bg-[var(--brand-hover)]"
                  onClick={() => addFilter(row.value)}
                >
                  <td className="py-2 pr-3">{row.value}</td>
                  <td className="mono py-2 pr-3 text-right">{fmtInt(row.sales)}</td>
                  <td className="mono py-2 pr-3 text-right dash-accent-amber">
                    {money(row.revenue)}
                  </td>
                  <td className="mono py-2 text-right text-[var(--brand-text-secondary)]">
                    {money(row.aov)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
