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
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f]">Leads</h1>
        <p className="mt-1 text-[17px] text-[#86868b]">
          Todos os leads capturados via WhatsApp
        </p>
      </header>

      {leads.length === 0 ? (
        <div className="apple-card p-16 text-center">
          <p className="text-[17px] text-[#86868b]">
            Nenhum lead capturado ainda. Configure os webhooks e tokens Uazapi para cada médico.
          </p>
        </div>
      ) : (
        <div className="apple-card overflow-hidden">
          <table className="w-full text-[14px]">
            <thead className="border-b border-black/[0.06] bg-[#fbfbfd]">
              <tr>
                <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Data</th>
                <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Paciente</th>
                <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Telefone</th>
                <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Médico</th>
                <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Mensagem</th>
                <th className="px-5 py-3.5 text-left font-medium text-[#6e6e73]">Planilha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {leads.map((lead) => {
                const doctor = lead.doctor as { name: string } | null;
                return (
                  <tr key={lead.id} className="hover:bg-[#f5f5f7]/60">
                    <td className="whitespace-nowrap px-5 py-3.5 text-[#86868b]">
                      {formatDate(lead.received_at)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#1d1d1f]">
                      {lead.patient_name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[#1d1d1f]">
                      {formatPhone(lead.patient_phone)}
                    </td>
                    <td className="px-5 py-3.5 text-[#1d1d1f]">{doctor?.name}</td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-[#6e6e73]">
                      {lead.message || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {lead.synced_to_sheets ? (
                        <span className="text-[#34c759]">✓</span>
                      ) : (
                        <span className="text-[#ff9500]">✗</span>
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
