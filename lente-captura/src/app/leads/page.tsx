import { createServiceClient } from '@/lib/supabase/server';
import { formatDate, formatPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getLeads() {
  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from('leads')
      .select('*, doctor:doctors(name, instance_name)')
      .order('received_at', { ascending: false })
      .limit(100);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <p className="text-slate-500">Todos os leads capturados via WhatsApp</p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">
            Nenhum lead capturado ainda. Configure os webhooks e tokens Uazapi para cada médico.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Paciente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Médico</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Mensagem</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Planilha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const doctor = lead.doctor as { name: string } | null;
                return (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(lead.received_at)}
                    </td>
                    <td className="px-4 py-3 font-medium">{lead.patient_name || '—'}</td>
                    <td className="px-4 py-3">{formatPhone(lead.patient_phone)}</td>
                    <td className="px-4 py-3">{doctor?.name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {lead.message || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lead.synced_to_sheets ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-amber-600" title={lead.sheets_sync_error || ''}>
                          ✗
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
