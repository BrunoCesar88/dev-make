'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { doctorMatchesSearch } from '@/lib/doctor-search';
import { getStatusOptions } from '@/lib/leads/columns';
import { DEFAULT_CANAIS_OPTIONS, DEFAULT_LEAD_STATUS } from '@/lib/leads/schema';
import { cn } from '@/lib/utils';

interface DoctorOption {
  id: string;
  name: string;
}

interface AddLeadFormProps {
  doctors: DoctorOption[];
  defaultDoctorId?: string | null;
  showDoctorPicker?: boolean;
  extraCanais?: string[];
}

export function AddLeadForm({
  doctors,
  defaultDoctorId,
  showDoctorPicker = true,
  extraCanais = [],
}: AddLeadFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState(defaultDoctorId || '');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorOpen, setDoctorOpen] = useState(false);
  const doctorRef = useRef<HTMLDivElement>(null);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [convenio, setConvenio] = useState('');
  const [canais, setCanais] = useState('META');
  const [observacao, setObservacao] = useState('');
  const [anuncio, setAnuncio] = useState('');
  const [status, setStatus] = useState(DEFAULT_LEAD_STATUS);

  const canaisOptions = useMemo(() => {
    const set = new Set([...DEFAULT_CANAIS_OPTIONS, ...extraCanais.filter(Boolean)]);
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [extraCanais]);

  const statusOptions = useMemo(() => getStatusOptions(), []);

  const filteredDoctors = useMemo(
    () => doctors.filter((d) => doctorMatchesSearch(d.name, doctorSearch)),
    [doctors, doctorSearch]
  );

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!doctorOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!doctorRef.current?.contains(e.target as Node)) setDoctorOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [doctorOpen]);

  const reset = () => {
    setDoctorId(defaultDoctorId || '');
    setDoctorSearch('');
    setPatientName('');
    setPatientPhone('');
    setConvenio('');
    setCanais('META');
    setObservacao('');
    setAnuncio('');
    setStatus(DEFAULT_LEAD_STATUS);
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const resolvedDoctorId = showDoctorPicker ? doctorId : defaultDoctorId;
    if (!resolvedDoctorId) {
      setError('Selecione o médico.');
      return;
    }
    if (!patientPhone.trim()) {
      setError('Informe o telefone.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: resolvedDoctorId,
          patient_name: patientName.trim() || null,
          patient_phone: patientPhone.trim(),
          convenio: convenio.trim() || null,
          canais: canais.trim() || null,
          observacao: observacao.trim() || null,
          anuncio: anuncio.trim() || null,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar lead');
        return;
      }

      close();
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-[14px] text-[var(--brand-text)] outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90 sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Adicionar lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/50"
            onClick={close}
          />
          <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-t-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-5 py-4">
              <h2 className="text-[18px] font-semibold text-[var(--brand-text)]">
                Novo lead
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-[var(--brand-text-tertiary)] hover:bg-[var(--brand-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[min(80vh,720px)] overflow-y-auto p-5">
              <div className="space-y-4">
                {showDoctorPicker && (
                  <div ref={doctorRef} className="relative">
                    <label className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Médico *
                    </label>
                    <button
                      type="button"
                      onClick={() => setDoctorOpen((v) => !v)}
                      className={cn(fieldClass, 'flex items-center justify-between text-left')}
                    >
                      <span className={cn('truncate', !selectedDoctor && 'text-[var(--brand-text-tertiary)]')}>
                        {selectedDoctor?.name || 'Selecione o médico'}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                    </button>
                    {doctorOpen && (
                      <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-lg">
                        <div className="border-b border-[var(--brand-border)] p-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-text-tertiary)]" />
                            <input
                              type="search"
                              value={doctorSearch}
                              onChange={(e) => setDoctorSearch(e.target.value)}
                              placeholder="Buscar médico…"
                              className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-muted-surface)] py-2 pl-8 pr-3 text-[13px] outline-none"
                            />
                          </div>
                        </div>
                        <ul className="max-h-48 overflow-y-auto py-1">
                          {filteredDoctors.map((doctor) => (
                            <li key={doctor.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDoctorId(doctor.id);
                                  setDoctorOpen(false);
                                  setDoctorSearch('');
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-[var(--brand-hover)]"
                              >
                                <span>{doctor.name}</span>
                                {doctor.id === doctorId ? (
                                  <Check className="h-4 w-4 text-[var(--brand-accent)]" />
                                ) : null}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Nome
                    </span>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className={fieldClass}
                      placeholder="Nome do paciente"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Telefone *
                    </span>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className={fieldClass}
                      placeholder="5511999990000"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Convênio
                    </span>
                    <input
                      type="text"
                      value={convenio}
                      onChange={(e) => setConvenio(e.target.value)}
                      className={fieldClass}
                      placeholder="Particular, Unimed…"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Canais
                    </span>
                    <select
                      value={canais}
                      onChange={(e) => setCanais(e.target.value)}
                      className={fieldClass}
                    >
                      {canaisOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Status
                    </span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className={fieldClass}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Observação
                    </span>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={2}
                      className={fieldClass}
                      placeholder="Anotações internas"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-[12px] font-medium text-[var(--brand-text-tertiary)]">
                      Anúncio
                    </span>
                    <input
                      type="text"
                      value={anuncio}
                      onChange={(e) => setAnuncio(e.target.value)}
                      className={fieldClass}
                      placeholder="Link ou nome do anúncio"
                    />
                  </label>
                </div>
              </div>

              {error ? (
                <p className="mt-4 text-[13px] text-[#dc2626]">{error}</p>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-[var(--brand-border)] px-4 py-2.5 text-[14px] text-[var(--brand-text-secondary)] hover:bg-[var(--brand-hover)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-[14px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Salvando…' : 'Salvar lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
