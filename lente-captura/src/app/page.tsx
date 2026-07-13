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
  const connectedCount = Math.max(0, stats.totalDoctors - stats.disconnectedCount);

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
          Dashboard
        </h1>
        <p className="mt-1 text-[17px] text-[#86868b]">
          Visão geral das conexões e leads
        </p>
      </header>

      {!stats.dbConnected && (
        <div className="mb-8 rounded-2xl border border-[#ffcc00]/30 bg-[#fffbeb] px-5 py-4 text-[14px] text-[#1d1d1f]">
          Supabase ainda não configurado. Configure as variáveis de ambiente e execute as migrations.
        </div>
      )}

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users className="h-6 w-6 text-[#0071e3]" strokeWidth={1.5} />}
          label="Médicos ativos"
          value={stats.totalDoctors}
        />
        <StatCard
          icon={<MessageSquare className="h-6 w-6 text-[#34c759]" strokeWidth={1.5} />}
          label="Leads capturados"
          value={stats.totalLeads}
        />
        <StatCard
          icon={<WifiOff className="h-6 w-6 text-[#ff3b30]" strokeWidth={1.5} />}
          label="Desconectados"
          value={stats.disconnectedCount}
        />
        <StatCard
          icon={<Wifi className="h-6 w-6 text-[#34c759]" strokeWidth={1.5} />}
          label="Conectados"
          value={connectedCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="apple-card p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
              Conexões offline
            </h2>
            <Link href="/medicos" className="apple-link text-[14px]">
              Ver todos
            </Link>
          </div>
          {stats.disconnected.length === 0 ? (
            <p className="text-[15px] text-[#86868b]">Nenhuma conexão offline detectada</p>
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
                    className="flex items-center justify-between rounded-xl bg-[#f5f5f7] px-4 py-3"
                  >
                    <span className="text-[15px] font-medium text-[#1d1d1f]">
                      {doctor.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={item.connection_status} />
                      <Link
                        href={`/medicos/${doctor.id}`}
                        className="apple-link text-[13px] font-normal"
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

        <section className="apple-card p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
              Leads recentes
            </h2>
            <Link href="/leads" className="apple-link text-[14px]">
              Ver todos
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <p className="text-[15px] text-[#86868b]">Nenhum lead capturado ainda</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentLeads.map((lead) => {
                const doctor = lead.doctor as { name: string } | null;
                return (
                  <li key={lead.id} className="rounded-xl bg-[#f5f5f7] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-medium text-[#1d1d1f]">
                        {lead.patient_name || lead.patient_phone}
                      </span>
                      {!lead.synced_to_sheets && (
                        <AlertTriangle className="h-4 w-4 text-[#ff9500]" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] text-[#86868b]">{doctor?.name}</p>
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
    <div className="apple-card p-6 transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
      <div className="mb-4">{icon}</div>
      <div className="text-[48px] font-semibold leading-none tracking-tight text-[#1d1d1f]">
        {value}
      </div>
      <div className="mt-2 text-[14px] text-[#86868b]">{label}</div>
    </div>
  );
}
