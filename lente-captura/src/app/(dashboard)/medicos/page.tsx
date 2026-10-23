import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { requireRoles } from '@/lib/auth-guards';
import { StatusBadge } from '@/components/status-badge';
import { formatPhone } from '@/lib/utils';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { AddDoctorForm } from '@/components/add-doctor-form';
import doctorsSeed from '../../../../data/active-doctors.json';

import type { SeedDoctor } from '@/types/database';

export const dynamic = 'force-dynamic';

async function getManagers() {
  const supabase = await createClient();
  const { data } = await supabase.from('managers').select('id, name').order('name');
  return data ?? [];
}

async function getDoctors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('doctors')
    .select(`*, manager:managers(*), instance:instances(*)`)
    .eq('status', 'active')
    .order('name');

  if (error || !data?.length) return null;
  return data;
}

export default async function MedicosPage() {
  const profile = await getProfile();

  if (profile?.role === 'doctor' && profile.doctor_id) {
    redirect(`/medicos/${profile.doctor_id}`);
  }

  if (profile?.role !== 'admin') {
    redirect('/leads');
  }

  const doctors = await getDoctors();
  const managers = await getManagers();
  const seedDoctors = doctorsSeed as SeedDoctor[];
  const usingSeed = !doctors;

  const list = doctors ?? seedDoctors.map((d, i) => ({
    id: `seed-${i}`,
    name: d.name,
    instance_name: d.instance_name,
    phone: d.phone,
    manager: d.manager ? { name: d.manager } : null,
    instance: { connection_status: 'disconnected' as const },
    lead_enabled: d.lead_enabled,
    spreadsheet_url: d.spreadsheet_url,
  }));

  const byManager = list.reduce<Record<string, typeof list>>((acc, doc) => {
    const mgr = (doc.manager as { name?: string } | null)?.name || 'Sem gestor';
    if (!acc[mgr]) acc[mgr] = [];
    acc[mgr].push(doc);
    return acc;
  }, {});

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-semibold tracking-tight text-[var(--brand-text)]">Médicos</h1>
          <p className="mt-1 text-[17px] text-[var(--brand-text-tertiary)]">
            {list.length} médicos ativos com Uazapi
          </p>
        </div>
        <AddDoctorForm managers={managers} />
      </header>

      {usingSeed && (
        <div className="mb-8 rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary-soft)] px-5 py-4 text-[14px] text-[var(--brand-text)]">
          Exibindo dados da planilha de controle. Execute{' '}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-[13px]">npm run seed</code>{' '}
          após configurar o Supabase.
        </div>
      )}

      {Object.entries(byManager)
        .sort(([a], [b]) => {
          const noManager = 'Sem gestor';
          if (a === noManager && b !== noManager) return 1;
          if (b === noManager && a !== noManager) return -1;
          return a.localeCompare(b);
        })
        .map(([manager, docs]) => (
          <section key={manager} className="mb-10">
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[var(--brand-text-tertiary)]">
              {manager} ({docs.length})
            </h2>
            <div className="apple-card overflow-hidden">
              <table className="w-full text-[14px]">
                <thead className="table-head">
                  <tr>
                    <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Médico</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Instância</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Telefone</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Conexão</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[var(--brand-text-tertiary)]">Lead</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {docs.map((doc) => {
                    const instance = doc.instance as { connection_status?: string } | null;
                    const status = instance?.connection_status || 'disconnected';
                    const isSeed = doc.id.startsWith('seed-');
                    return (
                      <tr key={doc.id} className="transition-colors hover:bg-[var(--brand-bg)]/60">
                        <td className="px-5 py-3.5 font-medium text-[var(--brand-text)]">{doc.name}</td>
                        <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--brand-text-tertiary)]">
                          {doc.instance_name}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--brand-text)]">
                          {formatPhone(doc.phone as string | null)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-3.5">
                          {doc.lead_enabled ? (
                            <span className="font-medium text-[#34c759]">Ativo</span>
                          ) : (
                            <span className="text-[var(--brand-text-tertiary)]">Off</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-3">
                            {doc.spreadsheet_url && (
                              <a
                                href={doc.spreadsheet_url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--brand-text-tertiary)] transition-colors hover:text-[var(--brand-primary)]"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {!isSeed && (
                              <Link
                                href={`/medicos/${doc.id}`}
                                className="apple-link flex items-center gap-0.5 text-[14px]"
                              >
                                Gerenciar
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}
