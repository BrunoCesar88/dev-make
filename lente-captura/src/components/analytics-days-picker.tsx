'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PRESET_DAYS,
  daysAgoYmd,
  periodLabel,
  todayYmd,
  type AnalyticsPeriod,
} from '@/lib/analytics-period';
import { buildAnalyticsQuery, type UtmQueryState } from '@/lib/analytics-query';

type PeriodOption =
  | { id: 'preset'; days: (typeof PRESET_DAYS)[number]; label: string }
  | { id: 'custom'; label: string };

const OPTIONS: PeriodOption[] = [
  ...PRESET_DAYS.map((days) => ({
    id: 'preset' as const,
    days,
    label: `${days} dias`,
  })),
  { id: 'custom', label: 'Personalizado' },
];

function activeOptionId(period: AnalyticsPeriod): string {
  if (period.mode === 'custom') return 'custom';
  return `preset-${period.days}`;
}

export function AnalyticsDaysPicker({
  period,
  doctorId,
  utm,
}: {
  period: AnalyticsPeriod;
  doctorId?: string;
  utm?: UtmQueryState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(
    period.mode === 'custom' ? period.from : daysAgoYmd(30)
  );
  const [customTo, setCustomTo] = useState(
    period.mode === 'custom' ? period.to : todayYmd()
  );
  const [customError, setCustomError] = useState<string | null>(null);

  const selectedLabel = periodLabel(period);

  useEffect(() => {
    if (period.mode === 'custom') {
      setCustomFrom(period.from);
      setCustomTo(period.to);
    }
  }, [period]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const applyPreset = (days: (typeof PRESET_DAYS)[number]) => {
    setOpen(false);
    setCustomError(null);
    router.push(
      buildAnalyticsQuery(pathname, { period: { mode: 'preset', days }, doctorId, utm })
    );
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) {
      setCustomError('Informe as duas datas.');
      return;
    }
    if (customTo < customFrom) {
      setCustomError('A data final deve ser igual ou posterior à inicial.');
      return;
    }
    setCustomError(null);
    setOpen(false);
    router.push(
      buildAnalyticsQuery(pathname, {
        period: { mode: 'custom', from: customFrom, to: customTo },
        doctorId,
        utm,
      })
    );
  };

  const currentId = activeOptionId(period);

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-[min(100%,280px)]">
      <label
        htmlFor={listId}
        className="mb-1 block text-[12px] text-[var(--brand-text-tertiary)]"
      >
        Período
      </label>
      <button
        id={listId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-left text-[13px] text-[var(--brand-text)] outline-none transition hover:bg-[var(--brand-hover)] focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--brand-text-tertiary)] transition',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-lg">
          <ul
            role="listbox"
            aria-label="Selecionar período"
            className="max-h-[min(220px,40vh)] overflow-y-auto overscroll-contain py-1"
          >
            {OPTIONS.map((option) => {
              const optionId =
                option.id === 'preset' ? `preset-${option.days}` : 'custom';
              const active = optionId === currentId;
              return (
                <li key={optionId} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      if (option.id === 'preset') {
                        applyPreset(option.days);
                      }
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition',
                      active
                        ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-text)]'
                        : 'text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)]'
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--brand-border)] bg-[var(--brand-muted-surface)] p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--brand-text-secondary)]">
              Intervalo personalizado
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-[var(--brand-text-tertiary)]">
                  De
                </span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || todayYmd()}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    setCustomError(null);
                  }}
                  className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-[13px] text-[var(--brand-text)] outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-[var(--brand-text-tertiary)]">
                  Até
                </span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayYmd()}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    setCustomError(null);
                  }}
                  className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-[13px] text-[var(--brand-text)] outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
                />
              </label>
            </div>
            {customError ? (
              <p className="mt-2 text-[12px] text-[#dc2626]">{customError}</p>
            ) : null}
            <button
              type="button"
              onClick={applyCustom}
              className="mt-3 w-full rounded-lg bg-[var(--brand-accent)] px-3 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
            >
              Aplicar intervalo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
