'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/lib/analytics-period';
import { buildAnalyticsQuery, type UtmQueryState } from '@/lib/analytics-query';

export interface AnalyticsDoctorOption {
  id: string;
  name: string;
  tenant_slug: string;
}

const ALL_OPTION = { id: 'all', name: 'Todos os médicos' };

export function AnalyticsDoctorPicker({
  doctors,
  selectedId,
  period,
  utm,
}: {
  doctors: AnalyticsDoctorOption[];
  selectedId: string;
  period: AnalyticsPeriod;
  utm?: UtmQueryState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const options = [ALL_OPTION, ...doctors.map((d) => ({ id: d.id, name: d.name }))];
  const selected = options.find((o) => o.id === selectedId) ?? ALL_OPTION;

  const buildUrl = (doctorId: string) =>
    buildAnalyticsQuery(pathname, { period, doctorId, utm });

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

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-[min(100%,280px)]">
      <label
        htmlFor={listId}
        className="mb-1 block text-[12px] text-[var(--brand-text-tertiary)]"
      >
        Médico
      </label>
      <button
        id={listId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-left text-[13px] text-[var(--brand-text)] outline-none transition hover:bg-[var(--brand-hover)] focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
      >
        <span className="truncate">{selected.name}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-[var(--brand-text-tertiary)] transition', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Selecionar médico"
          className="absolute left-0 right-0 z-50 mt-1 max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] py-1 shadow-lg"
        >
          {options.map((option) => {
            const active = option.id === selectedId;
            return (
              <li key={option.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(buildUrl(option.id));
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition',
                    active
                      ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-text)]'
                      : 'text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)]'
                  )}
                >
                  <span className="truncate">{option.name}</span>
                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
