'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { suggestInstanceName } from '@/lib/utils';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';
import {
  DoctorPlatformKeysFields,
  defaultPlatformKeys,
  platformKeysToApiBody,
  type DoctorPlatformKeysValues,
} from '@/components/doctor-platform-keys-fields';

interface Manager {
  id: string;
  name: string;
}

interface AddDoctorFormProps {
  managers: Manager[];
}

export function AddDoctorForm({
  managers,
}: AddDoctorFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [phone, setPhone] = useState('');
  const [managerId, setManagerId] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [createUazapi, setCreateUazapi] = useState(true);
  const [platformKeys, setPlatformKeys] = useState<DoctorPlatformKeysValues>({
    ...defaultPlatformKeys,
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const reset = () => {
    setName('');
    setInstanceName('');
    setPhone('');
    setManagerId('');
    setSpreadsheetUrl('');
    setCreateUazapi(true);
    setPlatformKeys({ ...defaultPlatformKeys });
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    const suggested = suggestInstanceName(value);
    if (!instanceName || instanceName === suggestInstanceName(name)) {
      setInstanceName(suggested);
    }
  };

  const patchPlatformKeys = (patch: Partial<DoctorPlatformKeysValues>) => {
    setPlatformKeys((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          instance_name: instanceName,
          phone: phone || undefined,
          manager_id: managerId || undefined,
          spreadsheet_url: spreadsheetUrl || undefined,
          create_uazapi_instance: createUazapi,
          tracking: platformKeysToApiBody(platformKeys, {
            includeEmptyTokens: true,
          }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar médico');
        return;
      }

      close();
      router.push(data.redirect || `/medicos/${data.doctor.id}`);
      router.refresh();
    } catch {
      setError('Erro de conexão ao criar médico');
    } finally {
      setLoading(false);
    }
  };

  const tenantSlug = instanceName
    ? instanceNameToTenantSlug(instanceName)
    : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)]"
      >
        <Plus className="h-4 w-4" />
        Novo médico
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center sm:p-6"
          onClick={close}
          role="presentation"
        >
          <div
            className="relative my-auto w-full max-w-3xl overflow-hidden apple-card-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-doctor-title"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-6 py-5 lg:px-8">
              <div>
                <h2
                  id="add-doctor-title"
                  className="text-[21px] font-semibold text-[var(--brand-text)]"
                >
                  Novo médico
                </h2>
                <p className="mt-1 text-[14px] text-[var(--brand-text-tertiary)]">
                  WhatsApp + chaves Meta/GA4/Encharge — o Analytics puxa do Tracker
                  automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-[var(--brand-text-tertiary)] transition hover:bg-[var(--brand-bg)]"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 py-6 lg:px-8"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome completo *">
                  <input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="Dr. André Araújo"
                    className={inputClass}
                  />
                </Field>

                <Field label="Nome da instância *">
                  <input
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    required
                    placeholder="Dr-Andre-Araujo"
                    className={`${inputClass} font-mono text-[13px]`}
                  />
                </Field>

                <Field label="Telefone">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="5511999999999"
                    className={inputClass}
                  />
                </Field>

                <Field label="Gestor">
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sem gestor</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="URL da planilha" className="md:col-span-2">
                  <input
                    value={spreadsheetUrl}
                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className={inputClass}
                  />
                </Field>

                <label className="flex items-center gap-3 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={createUazapi}
                    onChange={(e) => setCreateUazapi(e.target.checked)}
                    className="h-4 w-4 rounded border-black/[0.2]"
                  />
                  <span className="text-[14px] text-[var(--brand-text)]">
                    Criar instância na Uazapi automaticamente (requer UAZAPI_ADMIN_TOKEN)
                  </span>
                </label>
              </div>

              <div className="mt-8 rounded-[var(--brand-radius)] border border-black/[0.06] bg-[var(--brand-bg)]/40 p-5">
                <DoctorPlatformKeysFields
                  values={platformKeys}
                  onChange={patchPlatformKeys}
                  tenantSlug={tenantSlug}
                />
              </div>

              {error && (
                <p className="mt-4 text-[14px] text-[#ff3b30]">{error}</p>
              )}

              <div className="mt-6 flex flex-wrap gap-3 border-t border-black/[0.06] pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar médico e provisionar tracking'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-black/[0.08] px-5 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-bg)]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = 'input-field';
