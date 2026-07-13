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
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Médicos</h1>
          <p className="text-slate-500">
            {list.length} médicos ativos com Uazapi
          </p>
        </div>
      </div>

      {usingSeed && (
        <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          Exibindo dados da planilha de controle. Execute{' '}
          <code className="rounded bg-indigo-100 px-1">npm run seed</code> após
          configurar o Supabase para persistir no banco.
        </div>
      )}

      {Object.entries(byManager)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([manager, docs]) => (
          <section key={manager} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {manager} ({docs.length})
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Médico</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Instância</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Telefone</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Conexão</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Lead</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docs.map((doc) => {
                    const instance = doc.instance as { connection_status?: string } | null;
                    const status = instance?.connection_status || 'disconnected';
                    const isSeed = doc.id.startsWith('seed-');
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{doc.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {doc.instance_name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatPhone(doc.phone as string | null)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-3">
                          {doc.lead_enabled ? (
                            <span className="text-emerald-600">Ativo</span>
                          ) : (
                            <span className="text-slate-400">Off</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {doc.spreadsheet_url && (
                              <a
                                href={doc.spreadsheet_url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-indigo-600"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {!isSeed && (
                              <Link
                                href={`/medicos/${doc.id}`}
                                className="flex items-center gap-1 text-indigo-600 hover:underline"
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
