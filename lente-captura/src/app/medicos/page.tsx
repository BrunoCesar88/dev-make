import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/status-badge';
import { formatPhone } from '@/lib/utils';
import { ExternalLink, ChevronRight } from 'lucide-react';
import doctorsSeed from '../../../data/active-doctors.json';
import type { SeedDoctor } from '@/types/database';

export const dynamic = 'force-dynamic';

async function getDoctors() {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('doctors')
      .select(`*, manager:managers(*), instance:instances(*)`)
      .eq('status', 'active')
      .order('name');

    if (error || !data?.length) return null;
    return data;
  } catch {
    return null;
  }
}

export default async function MedicosPage() {
  const doctors = await getDoctors();
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
      <header className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f]">Médicos</h1>
        <p className="mt-1 text-[17px] text-[#86868b]">
          {list.length} médicos ativos com Uazapi
        </p>
      </header>

      {usingSeed && (
        <div className="mb-8 rounded-2xl border border-[#0071e3]/20 bg-[#f0f7ff] px-5 py-4 text-[14px] text-[#1d1d1f]">
          Exibindo dados da planilha de controle. Execute{' '}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-[13px]">npm run seed</code>{' '}
          após configurar o Supabase.
        </div>
      )}

      {Object.entries(byManager)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([manager, docs]) => (
          <section key={manager} className="mb-10">
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
              {manager} ({docs.length})
            </h2>
            <div className="apple-card overflow-hidden">
              <table className="w-full text-[14px]">
                <thead className="border-b border-black/[0.06] bg-[#fbfbfd]">
                  <tr>
                    <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Médico</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Instância</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Telefone</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Conexão</th>
                    <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Lead</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {docs.map((doc) => {
                    const instance = doc.instance as { connection_status?: string } | null;
                    const status = instance?.connection_status || 'disconnected';
                    const isSeed = doc.id.startsWith('seed-');
                    return (
                      <tr key={doc.id} className="transition-colors hover:bg-[#f5f5f7]/60">
                        <td className="px-5 py-3.5 font-medium text-[#1d1d1f]">{doc.name}</td>
                        <td className="px-5 py-3.5 font-mono text-[12px] text-[#86868b]">
                          {doc.instance_name}
                        </td>
                        <td className="px-5 py-3.5 text-[#1d1d1f]">
                          {formatPhone(doc.phone as string | null)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-3.5">
                          {doc.lead_enabled ? (
                            <span className="text-[#34c759] font-medium">Ativo</span>
                          ) : (
                            <span className="text-[#86868b]">Off</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-3">
                            {doc.spreadsheet_url && (
                              <a
                                href={doc.spreadsheet_url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#86868b] transition-colors hover:text-[#0071e3]"
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
