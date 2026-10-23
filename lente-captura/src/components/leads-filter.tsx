'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, Filter, Search, X } from 'lucide-react';
import { doctorMatchesSearch } from '@/lib/doctor-search';
import { getStatusOptions } from '@/lib/leads/columns';
import type { LeadFilterParams } from '@/lib/leads/filters';
import { cn } from '@/lib/utils';

interface DoctorOption {
  id: string;
  name: string;
}

interface LeadsFilterProps {
  managers: { id: string; name: string }[];
  doctors: DoctorOption[];
  canais: string[];
  isAdmin: boolean;
  showDoctorFilter?: boolean;
  basePath?: string;
}

const inputClass =
  'w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-[14px] text-[var(--brand-text)] outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]';

export function LeadsFilter({
  managers,
  doctors,
  canais,
  isAdmin,
  showDoctorFilter = true,
  basePath = '/leads',
}: LeadsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorRef = useRef<HTMLDivElement>(null);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');

  const filters: LeadFilterParams = {
    manager_id: searchParams.get('manager_id') || undefined,
    doctor_id: searchParams.get('doctor_id') || undefined,
    status: searchParams.get('status') || undefined,
    canais:
      searchParams.get('canais') ||
      searchParams.get('origem') ||
      undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
  };

  const statusOptions = useMemo(() => getStatusOptions(), []);

  const hasFilters = Object.values(filters).some(Boolean);
  const selectedDoctor = doctors.find((d) => d.id === filters.doctor_id);
  const filteredDoctors = useMemo(
    () => doctors.filter((d) => doctorMatchesSearch(d.name, doctorSearch)),
    [doctors, doctorSearch]
  );

  useEffect(() => {
    if (!doctorOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!doctorRef.current?.contains(e.target as Node)) {
        setDoctorOpen(false);
        setDoctorSearch('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [doctorOpen]);

  const update = (key: keyof LeadFilterParams, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const clearAll = () => router.push(basePath);

  return (
    <div className="apple-card mb-6 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--brand-text)]">
          <Filter className="h-4 w-4 text-[var(--brand-text-tertiary)]" />
          Filtros
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--brand-text-tertiary)] transition hover:text-[var(--brand-text)]"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {showDoctorFilter && doctors.length > 0 && (
          <div ref={doctorRef} className="relative flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--brand-text-tertiary)]">
              Médico
            </span>
            <button
              type="button"
              onClick={() => setDoctorOpen((v) => !v)}
              className={cn(inputClass, 'flex items-center justify-between text-left')}
            >
              <span
                className={cn(
                  'truncate',
                  !selectedDoctor && 'text-[var(--brand-text-tertiary)]'
                )}
              >
                {selectedDoctor?.name || 'Todos'}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-[var(--brand-text-tertiary)] transition',
                  doctorOpen && 'rotate-180'
                )}
              />
            </button>
            {doctorOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-lg">
                <div className="border-b border-[var(--brand-border)] p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-text-tertiary)]" />
                    <input
                      type="search"
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      placeholder="Buscar médico…"
                      className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-muted-surface)] py-2 pl-8 pr-3 text-[13px] text-[var(--brand-text)] outline-none"
                    />
                  </div>
                </div>
                <ul className="max-h-52 overflow-y-auto py-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        update('doctor_id', '');
                        setDoctorOpen(false);
                        setDoctorSearch('');
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-[var(--brand-hover)]"
                    >
                      <span>Todos</span>
                      {!filters.doctor_id ? (
                        <Check className="h-4 w-4 text-[var(--brand-accent)]" />
                      ) : null}
                    </button>
                  </li>
                  {filteredDoctors.map((doctor) => (
                    <li key={doctor.id}>
                      <button
                        type="button"
                        onClick={() => {
                          update('doctor_id', doctor.id);
                          setDoctorOpen(false);
                          setDoctorSearch('');
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-[var(--brand-hover)]"
                      >
                        <span className="truncate">{doctor.name}</span>
                        {filters.doctor_id === doctor.id ? (
                          <Check className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--brand-text-tertiary)]">
              Gestor
            </span>
            <select
              value={filters.manager_id || ''}
              onChange={(e) => update('manager_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Todos</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--brand-text-tertiary)]">
            Canais
          </span>
          <select
            value={filters.canais || ''}
            onChange={(e) => update('canais', e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {canais.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--brand-text-tertiary)]">
            Status
          </span>
          <select
            value={filters.status || ''}
            onChange={(e) => update('status', e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--brand-text-tertiary)]">
            Data de
          </span>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => update('date_from', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--brand-text-tertiary)]">
            Data até
          </span>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => update('date_to', e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}
