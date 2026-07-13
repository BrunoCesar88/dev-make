import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { ConnectionPanel } from '@/components/connection-panel';
import { InstanceConfigForm } from '@/components/instance-config-form';
import { StatusBadge } from '@/components/status-badge';
import { formatPhone, formatDate } from '@/lib/utils';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getDoctor(id: string) {
  const supabase = await createServiceClient();

  const { data: doctor, error } = await supabase
    .from('doctors')
    .select(`*, manager:managers(*), instance:instances(*)`)
    .eq('id', id)
    .single();

  if (error || !doctor) return null;

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('doctor_id', id)
    .order('received_at', { ascending: false })
    .limit(10);

  const { data: logs } = await supabase
    .from('connection_logs')
    .select('*')
    .eq('doctor_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  return { doctor, leads: leads ?? [], logs: logs ?? [] };
}

export default async function MedicoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDoctor(id);

  if (!data) notFound();

  const { doctor, leads, logs } = data;
  const instance = doctor.instance as {
    connection_status: string;
    uazapi_token: string | null;
    uazapi_base_url: string;
    webhook_configured: boolean;
  } | null;
  const manager = doctor.manager as { name: string } | null;

  return (
    <div className="p-8">
      <Link
        href="/medicos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para médicos
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{doctor.name}</h1>
          <p className="font-mono text-sm text-slate-500">{doctor.instance_name}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
            <span>Gestor: {manager?.name || '—'}</span>
            <span>Telefone: {formatPhone(doctor.phone)}</span>
            {doctor.spreadsheet_url && (
              <a
                href={doctor.spreadsheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
              >
                Planilha <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <StatusBadge status={instance?.connection_status || 'disconnected'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConnectionPanel
          doctorId={id}
          doctorName={doctor.name}
          initialStatus={instance?.connection_status}
        />
        <InstanceConfigForm
          doctorId={id}
          initialToken={instance?.uazapi_token}
          initialBaseUrl={instance?.uazapi_base_url}
          webhookConfigured={instance?.webhook_configured}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Leads recentes</h2>
          {leads.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum lead ainda</p>
          ) : (
            <ul className="space-y-3">
              {leads.map((lead) => (
                <li key={lead.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {lead.patient_name || lead.patient_phone}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(lead.received_at)}
                    </span>
                  </div>
                  {lead.message && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{lead.message}</p>
                  )}
                  <div className="mt-1 text-xs">
                    {lead.synced_to_sheets ? (
                      <span className="text-emerald-600">✓ Planilha</span>
                    ) : (
                      <span className="text-amber-600">Pendente planilha</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Histórico de conexão</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">Sem alterações registradas</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {log.previous_status} → {log.new_status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(log.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
