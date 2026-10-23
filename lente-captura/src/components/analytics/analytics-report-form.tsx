'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doctorMatchesSearch } from '@/lib/doctor-search';
import {
  PRESET_DAYS,
  daysAgoYmd,
  periodLabel,
  todayYmd,
  type AnalyticsPeriod,
} from '@/lib/analytics-period';
import { buildAnalyticsQuery } from '@/lib/analytics-query';

export interface AnalyticsDoctorOption {
  id: string;
  name: string;
}

interface AnalyticsReportFormProps {
  isAdmin: boolean;
  doctors: AnalyticsDoctorOption[];
  defaultDoctorId: string | null;
  initialPeriod: AnalyticsPeriod;
  activeDoctorId: string | null;
  isRunning: boolean;
}

function activePeriodId(period: AnalyticsPeriod): string {
  if (period.mode === 'custom') return 'custom';
  return `preset-${period.days}`;
}

export function AnalyticsReportForm({
  isAdmin,
  doctors,
  defaultDoctorId,
  initialPeriod,
  activeDoctorId,
  isRunning,
}: AnalyticsReportFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const doctorListId = useId();
  const doctorSearchId = useId();
  const periodListId = useId();
  const doctorRef = useRef<HTMLDivElement>(null);
  const doctorSearchRef = useRef<HTMLInputElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  const [doctorId, setDoctorId] = useState(
    activeDoctorId || defaultDoctorId || ''
  );
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [customFrom, setCustomFrom] = useState(
    initialPeriod.mode === 'custom' ? initialPeriod.from : daysAgoYmd(30)
  );
  const [customTo, setCustomTo] = useState(
    initialPeriod.mode === 'custom' ? initialPeriod.to : todayYmd()
  );
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDoctorId(activeDoctorId || defaultDoctorId || '');
    setPeriod(initialPeriod);
    if (initialPeriod.mode === 'custom') {
      setCustomFrom(initialPeriod.from);
      setCustomTo(initialPeriod.to);
    }
  }, [activeDoctorId, defaultDoctorId, initialPeriod]);

  useEffect(() => {
    if (!doctorOpen && !periodOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!doctorRef.current?.contains(e.target as Node)) {
        setDoctorOpen(false);
        setDoctorSearch('');
      }
      if (!periodRef.current?.contains(e.target as Node)) setPeriodOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [doctorOpen, periodOpen]);

  useEffect(() => {
    if (!doctorOpen) return;
    const timer = window.setTimeout(() => doctorSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [doctorOpen]);

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const filteredDoctors = useMemo(
    () => doctors.filter((doctor) => doctorMatchesSearch(doctor.name, doctorSearch)),
    [doctors, doctorSearch]
  );

  const handleGenerate = () => {
    if (isAdmin && !doctorId) {
      setError('Selecione um médico para analisar.');
      return;
    }

    let resolvedPeriod = period;
    if (period.mode === 'custom') {
      if (!customFrom || !customTo) {
        setError('Informe as duas datas do período.');
        return;
      }
      if (customTo < customFrom) {
        setError('A data final deve ser igual ou posterior à inicial.');
        return;
      }
      resolvedPeriod = { mode: 'custom', from: customFrom, to: customTo };
      setPeriod(resolvedPeriod);
    }

    setError(null);
    router.push(
      buildAnalyticsQuery(pathname, {
        period: resolvedPeriod,
        doctorId: doctorId || defaultDoctorId || undefined,
        run: true,
      })
    );
  };

  return (
    <div className="apple-card-lg w-full p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
        {isAdmin && (
          <div ref={doctorRef} className="relative min-w-0 flex-1">
            <label
              htmlFor={doctorListId}
              className="mb-1 block text-[12px] text-[var(--brand-text-tertiary)]"
            >
              Médico
            </label>
            <button
              id={doctorListId}
              type="button"
              onClick={() => setDoctorOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-left text-[13px] text-[var(--brand-text)] outline-none transition hover:bg-[var(--brand-hover)] focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
            >
              <span className={cn('truncate', !selectedDoctor && 'text-[var(--brand-text-tertiary)]')}>
                {selectedDoctor?.name || 'Selecione um médico'}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-[var(--brand-text-tertiary)] transition',
                  doctorOpen && 'rotate-180'
                )}
              />
            </button>
            {doctorOpen && (
              <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-lg">
                <div className="border-b border-[var(--brand-border)] p-2">
                  <label htmlFor={doctorSearchId} className="sr-only">
                    Pesquisar médico
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-text-tertiary)]" />
                    <input
                      ref={doctorSearchRef}
                      id={doctorSearchId}
                      type="search"
                      value={doctorSearch}
                      placeholder="Buscar médico…"
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setDoctorOpen(false);
                          setDoctorSearch('');
                        }
                      }}
                      className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-muted-surface)] py-2 pl-8 pr-3 text-[13px] text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-text-tertiary)] focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
                    />
                  </div>
                </div>
                <ul className="max-h-[min(240px,45vh)] overflow-y-auto py-1">
                  {filteredDoctors.length === 0 ? (
                    <li className="px-3 py-4 text-center text-[13px] text-[var(--brand-text-tertiary)]">
                      Nenhum médico encontrado para &ldquo;{doctorSearch}&rdquo;
                    </li>
                  ) : (
                    filteredDoctors.map((doctor) => {
                      const active = doctor.id === doctorId;
                      return (
                        <li key={doctor.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setDoctorId(doctor.id);
                              setDoctorOpen(false);
                              setDoctorSearch('');
                              setError(null);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition',
                              active
                                ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-text)]'
                                : 'text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)]'
                            )}
                          >
                            <span className="truncate">{doctor.name}</span>
                            {active ? (
                              <Check className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div ref={periodRef} className="relative min-w-0 flex-1">
          <label
            htmlFor={periodListId}
            className="mb-1 block text-[12px] text-[var(--brand-text-tertiary)]"
          >
            Período
          </label>
          <button
            id={periodListId}
            type="button"
            onClick={() => setPeriodOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-left text-[13px] text-[var(--brand-text)] outline-none transition hover:bg-[var(--brand-hover)] focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
          >
            <span className="truncate">{periodLabel(period)}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-[var(--brand-text-tertiary)] transition',
                periodOpen && 'rotate-180'
              )}
            />
          </button>
          {periodOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-lg">
              <ul className="max-h-[min(220px,40vh)] overflow-y-auto py-1">
                {PRESET_DAYS.map((days) => {
                  const optionId = `preset-${days}`;
                  const active = activePeriodId(period) === optionId;
                  return (
                    <li key={days}>
                      <button
                        type="button"
                        onClick={() => {
                          setPeriod({ mode: 'preset', days });
                          setPeriodOpen(false);
                          setError(null);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition',
                          active
                            ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-text)]'
                            : 'text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)]'
                        )}
                      >
                        <span>Últimos {days} dias</span>
                        {active ? (
                          <Check className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod({ mode: 'custom', from: customFrom, to: customTo });
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition',
                      period.mode === 'custom'
                        ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-text)]'
                        : 'text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)]'
                    )}
                  >
                    <span>Personalizado</span>
                    {period.mode === 'custom' ? (
                      <Check className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                    ) : null}
                  </button>
                </li>
              </ul>
              <div className="border-t border-[var(--brand-border)] bg-[var(--brand-muted-surface)] p-3">
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
                        setPeriod({
                          mode: 'custom',
                          from: e.target.value,
                          to: customTo,
                        });
                        setError(null);
                      }}
                      className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-[13px]"
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
                        setPeriod({
                          mode: 'custom',
                          from: customFrom,
                          to: e.target.value,
                        });
                        setError(null);
                      }}
                      className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-[13px]"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-accent)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90 lg:w-auto lg:shrink-0"
        >
          <BarChart3 className="h-4 w-4" />
          {isRunning ? 'Atualizar métricas' : 'Gerar métricas'}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] text-[#dc2626]">{error}</p>
      ) : null}

      {!isAdmin && selectedDoctor ? (
        <p className="mt-3 text-[12px] text-[var(--brand-text-tertiary)]">
          Analisando: <strong>{selectedDoctor.name}</strong>
        </p>
      ) : null}
    </div>
  );
}
