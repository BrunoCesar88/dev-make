'use client';

import { fmtInt, fmtPct } from '@/lib/analytics-format';
import type { MetaFunnelStage } from '@/lib/tracker/types';

interface MetaFunnelProps {
  stages: MetaFunnelStage[];
}

export function MetaFunnel({ stages }: MetaFunnelProps) {
  if (!stages.length || stages.every((s) => s.value === 0)) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--brand-text-tertiary)]">
        Sem dados de funil no período
      </p>
    );
  }

  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => {
        const widthPct = Math.max(18, (stage.value / max) * 100);
        return (
          <div key={stage.key}>
            {index > 0 && stage.rate_from_previous != null && (
              <div className="mb-1.5 pl-1 text-[11px] font-medium text-[var(--brand-text-tertiary)]">
                {fmtPct(stage.rate_from_previous)} do estágio anterior
              </div>
            )}
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-11 items-center justify-between rounded-lg bg-[var(--brand-accent)]/15 px-3 transition-all"
                style={{ width: `${widthPct}%`, minWidth: '40%' }}
              >
                <span className="truncate text-[12px] font-medium text-[var(--brand-text)]">
                  {stage.label}
                </span>
                <span className="mono shrink-0 text-[14px] font-semibold text-[var(--brand-text)]">
                  {fmtInt(stage.value)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
