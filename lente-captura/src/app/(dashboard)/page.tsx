import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getProfile, getAccessibleDoctorIds } from '@/lib/auth';
import { requireRoles } from '@/lib/auth-guards';
import { StatusBadge } from '@/components/status-badge';
import { LeadsFilter } from '@/components/leads-filter';
import { leadOrigemFromFields } from '@/lib/leads/origin';
import {
  applyLeadFilters,
  resolveFiltersDoctorScope,
  buildFilterSearchParams,
  getAccessibleDoctors,
  getLeadCanais,
  hasActiveFilters,
  type LeadFilterParams,
} from '@/lib/leads/filters';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatDateShort } from '@/lib/date';
import { PullAllLeadsButton } from '@/components/pull-all-leads-button';
import { DashArea, DashBadge, DashKpi } from '@/components/dash-area';

export const dynamic = 'force-dynamic';

async function getStats(filters: LeadFilterParams) {
  try {
    const profile = await getProfile();
    const supabase = await createClient();
    const accessible = profile ? await getAccessibleDoctorIds(profile) : 'all';
    const filtered = hasActiveFilters(filters);

    let doctorsQuery = supabase
      .from('doctors')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    if (accessible !== 'all') {
      doctorsQuery = doctorsQuery.in(
        'id',
        accessible.length ? accessible : ['00000000-0000-0000-0000-000000000000']
      );
    }

    const doctorScope = await resolveFiltersDoctorScope(supabase, profile, filters);

    let leadsQuery = supabase.from('leads').select('id', { count: 'exact', head: true });
    leadsQuery = applyLeadFilters(
      leadsQuery,
      profile,
      filters,
      accessible,
      doctorScope
    );

    let instancesQuery = supabase
      .from('instances')
      .select('id', { count: 'exact' })
      .neq('connection_status', 'connected');

    if (accessible !== 'all' && accessible.length) {
      const { data: doctorInstances } = await supabase
        .from('instances')
        .select('id, doctor_id')
        .in('doctor_id', accessible);
      const instanceIds = doctorInstances?.map((i) => i.id) ?? [];
      instancesQuery = supabase
        .from('instances')
        .select('id', { count: 'exact' })
        .neq('connection_status', 'connected')
        .in(
          'id',
          instanceIds.length ? instanceIds : ['00000000-0000-0000-0000-000000000000']
        );
    }

    let recentQuery = supabase
      .from('leads')
      .select('*, doctor:doctors(name)');
    recentQuery = applyLeadFilters(
      recentQuery,
      profile,
      filters,
      accessible,
      doctorScope
    );

    let disconnectedQuery = supabase
      .from('instances')
      .select('connection_status, doctor:doctors(id, name, instance_name)')
      .neq('connection_status', 'connected');

    if (accessible !== 'all' && accessible.length) {
      disconnectedQuery = disconnectedQuery.in('doctor_id', accessible);
    }

    const [
      doctorsRes,
      leadsRes,
      disconnectedRes,
      recentRes,
      disconnectedListRes,
    ] = await Promise.all([
      doctorsQuery,
      leadsQuery,
      instancesQuery,
      recentQuery.order('received_at', { ascending: false }).limit(10),
      disconnectedQuery.limit(20),
    ]);

    if (doctorsRes.error) throw doctorsRes.error;
    if (leadsRes.error) throw leadsRes.error;
    if (disconnectedRes.error) throw disconnectedRes.error;
    if (recentRes.error) throw recentRes.error;
    if (disconnectedListRes.error) throw disconnectedListRes.error;

    return {
      totalDoctors: doctorsRes.count ?? 0,
      totalLeads: leadsRes.count ?? 0,
      disconnectedCount: disconnectedRes.count ?? 0,
      recentLeads: recentRes.data ?? [],
      disconnected: disconnectedListRes.data ?? [],
      dbConnected: true,
      isAdmin: profile?.role === 'admin',
      filtered,
      loadError: null as string | null,
    };
  } catch (err) {
    console.error('[dashboard] getStats failed:', err);
    return {
      totalDoctors: 0,
      totalLeads: 0,
      disconnectedCount: 0,
      recentLeads: [],
      disconnected: [],
      dbConnected: false,
      isAdmin: false,
      filtered: false,
      loadError:
        err instanceof Error ? err.message : 'Erro ao carregar o dashboard',
    };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<LeadFilterParams>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  requireRoles(profile, ['admin', 'doctor']);
  const supabase = await createClient();

  const filters: LeadFilterParams = {
    manager_id: params.manager_id,
    doctor_id: params.doctor_id,
    status: params.status,
    canais: params.canais || params.origem,
    date_from: params.date_from,
    date_to: params.date_to,
  };

  const [stats, managers, doctors, canaisList] = await Promise.all([
    getStats(filters),
    profile?.role === 'admin'
      ? supabase.from('managers').select('id, name').order('name').then((r) => r.data ?? [])
      : Promise.resolve([]),
    getAccessibleDoctors(supabase, profile).catch(() => []),
    getLeadCanais(supabase).catch((err) => {
      console.error('[dashboard] getLeadCanais failed:', err);
      return [] as string[];
    }),
  ]);

  const connectedCount = Math.max(0, stats.totalDoctors - stats.disconnectedCount);
  const leadsLink = hasActiveFilters(filters)
    ? `/leads?${buildFilterSearchParams(filters)}`
    : '/leads';

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="fade-in mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-semibold tracking-tight text-[var(--brand-text)]">
            Dashboard
          </h1>
          <p className="mt-1 text-[17px] text-[var(--brand-text-tertiary)]">
            {stats.filtered
              ? 'Visão filtrada de conexões e leads'
              : 'Visão geral das conexões e leads'}
          </p>
        </div>
      </header>

      <div className="space-y-8">

      {!stats.dbConnected && (
        <div className="rounded-xl border border-[var(--brand-warning-border)] bg-[var(--brand-warning-bg)] px-4 py-3 text-[13px] text-[var(--brand-text)]">
          {stats.loadError ? (
            <>
              Erro ao carregar dados: {stats.loadError}. Tente atualizar a página ou
              limpar os filtros.
            </>
          ) : (
            <>
              Supabase ainda não configurado. Configure as variáveis de ambiente e
              execute as migrations.
            </>
          )}
        </div>
      )}

      <Suspense fallback={null}>
        <LeadsFilter
          managers={managers}
          doctors={doctors}
          canais={canaisList}
          isAdmin={stats.isAdmin}
          showDoctorFilter={stats.isAdmin || doctors.length > 1}
          basePath="/"
        />
      </Suspense>

      <DashArea
        icon="📊"
        title="Visão geral"
        subtitle="Os números principais da operação"
        badge={<DashBadge variant="db">Fonte: Supabase</DashBadge>}
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.isAdmin && (
            <DashKpi label="Médicos ativos" value={stats.totalDoctors} accent="blue" />
          )}
          <DashKpi
            label={stats.filtered ? 'Leads (filtro)' : 'Leads capturados'}
            value={stats.totalLeads}
            accent="green"
          />
          <DashKpi
            label="Desconectados"
            value={stats.disconnectedCount}
            accent="red"
            sub="WhatsApp offline"
          />
          <DashKpi
            label="Conectados"
            value={connectedCount}
            accent="green"
            sub="WhatsApp online"
          />
        </div>
      </DashArea>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashArea
          icon="📡"
          title="Conexões offline"
          subtitle="Médicos que precisam reconectar o WhatsApp"
          action={
            stats.isAdmin ? (
              <Link href="/medicos" className="apple-link text-[13px]">
                Ver todos
              </Link>
            ) : undefined
          }
        >
          {stats.disconnected.length === 0 ? (
            <p className="text-[13px] text-[var(--brand-text-tertiary)]">
              Nenhuma conexão offline detectada
            </p>
          ) : (
            <ul className="space-y-1">
              {stats.disconnected.slice(0, 8).map((item) => {
                const raw = item.doctor;
                const doctor = (Array.isArray(raw) ? raw[0] : raw) as
                  | { id: string; name: string }
                  | null
                  | undefined;
                if (!doctor) return null;
                return (
                  <li key={doctor.id} className="dash-row">
                    <span className="text-[14px] font-medium text-[var(--brand-text)]">
                      {doctor.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={item.connection_status} />
                      <Link
                        href={`/medicos/${doctor.id}`}
                        className="apple-link text-[12px] font-normal"
                      >
                        Reconectar
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DashArea>

        <DashArea
          icon="💬"
          title={stats.filtered ? 'Leads filtrados' : 'Leads recentes'}
          subtitle="Últimas entradas no painel"
          badge={
            stats.filtered ? (
              <DashBadge variant="cross">Filtros ativos</DashBadge>
            ) : (
              <DashBadge variant="neutral">Tempo real</DashBadge>
            )
          }
          action={
            <div className="flex flex-wrap items-center gap-3">
              {stats.isAdmin && !stats.filtered && (
                <PullAllLeadsButton label="Sincronizar planilhas" />
              )}
              <Link href={leadsLink} className="apple-link shrink-0 text-[13px]">
                Ver todos
              </Link>
            </div>
          }
        >
          {stats.recentLeads.length === 0 ? (
            <p className="text-[13px] text-[var(--brand-text-tertiary)]">
              Nenhum lead com os filtros atuais
            </p>
          ) : (
            <ul className="space-y-1">
              {stats.recentLeads.map((lead) => {
                const doctor = lead.doctor as { name: string } | null;
                return (
                  <li key={lead.id} className="dash-row flex-col items-start !py-3">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-[14px] font-medium text-[var(--brand-text)]">
                        {lead.patient_name || lead.patient_phone}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="mono text-[11px] text-[var(--brand-text-tertiary)]">
                          {formatDateShort(lead.received_at)}
                        </span>
                        {!lead.synced_to_sheets && (
                          <AlertTriangle className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                        )}
                      </div>
                    </div>
                    <p className="text-[12px] text-[var(--brand-text-tertiary)]">
                      {doctor?.name}
                      {leadOrigemFromFields(lead.fields as Record<string, unknown> | null)
                        ? ` · ${leadOrigemFromFields(lead.fields as Record<string, unknown> | null)}`
                        : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </DashArea>
      </div>
      </div>
    </div>
  );
}
