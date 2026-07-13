import { createServiceClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/status-badge';
import { Wifi, WifiOff, Users, MessageSquare, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const supabase = await createServiceClient();

    const [doctorsRes, leadsRes, disconnectedRes] = await Promise.all([
      supabase.from('doctors').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('leads').select('id', { count: 'exact' }),
      supabase
        .from('instances')
        .select('id', { count: 'exact' })
        .neq('connection_status', 'connected'),
    ]);

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('*, doctor:doctors(name)')
      .order('received_at', { ascending: false })
      .limit(5);

    const { data: disconnected } = await supabase
      .from('instances')
      .select('connection_status, doctor:doctors(id, name, instance_name)')
      .neq('connection_status', 'connected');

    return {
      totalDoctors: doctorsRes.count ?? 34,
      totalLeads: leadsRes.count ?? 0,
      disconnectedCount: disconnectedRes.count ?? 0,
      recentLeads: recentLeads ?? [],
      disconnected: disconnected ?? [],
      dbConnected: true,
    };
  } catch {
    return {
      totalDoctors: 34,
      totalLeads: 0,
      disconnectedCount: 0,
      recentLeads: [],
      disconnected: [],
      dbConnected: false,
    };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Visão geral das conexões e leads</p>
      </div>

      {!stats.dbConnected && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Supabase ainda não configurado. Configure as variáveis de ambiente e execute as migrations.
          Veja o README para instruções.
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-indigo-600" />}
          label="Médicos ativos"
          value={stats.totalDoctors}
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-emerald-600" />}
          label="Leads capturados"
          value={stats.totalLeads}
        />
        <StatCard
          icon={<WifiOff className="h-5 w-5 text-red-600" />}
          label="Desconectados"
          value={stats.disconnectedCount}
        />
        <StatCard
          icon={<Wifi className="h-5 w-5 text-emerald-600" />}
          label="Conectados"
          value={Math.max(0, stats.totalDoctors - stats.disconnectedCount)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Conexões offline</h2>
            <Link href="/medicos" className="text-sm text-indigo-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {stats.disconnected.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma conexão offline detectada</p>
          ) : (
            <ul className="space-y-2">
              {stats.disconnected.slice(0, 8).map((item) => {
                const raw = item.doctor;
                const doctor = (Array.isArray(raw) ? raw[0] : raw) as
                  | { id: string; name: string }
                  | null
                  | undefined;
                if (!doctor) return null;
                return (
                  <li
                    key={doctor.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{doctor.name}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.connection_status} />
                      <Link
                        href={`/medicos/${doctor.id}`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Reconectar
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Leads recentes</h2>
            <Link href="/leads" className="text-sm text-indigo-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum lead capturado ainda</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentLeads.map((lead) => {
                const doctor = lead.doctor as { name: string } | null;
                return (
                  <li key={lead.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {lead.patient_name || lead.patient_phone}
                      </span>
                      {!lead.synced_to_sheets && (
                        <span title="Não sincronizado com planilha">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{doctor?.name}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-2">{icon}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
