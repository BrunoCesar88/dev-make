import { redirect } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile, requireDoctorAccess } from '@/lib/auth';
import { WhatsAppUazapiPanel } from '@/components/whatsapp-uazapi-panel';
import { DoctorLeadPhrasesForm } from '@/components/doctor-lead-phrases-form';
import { DoctorTrackingForm } from '@/components/doctor-tracking-form';
import { DoctorAdminActions } from '@/components/doctor-admin-actions';
import { DoctorTeamManager } from '@/components/doctor-team-manager';
import { LeadStatusSelect } from '@/components/lead-status-select';
import { formatPhone, formatDate } from '@/lib/utils';
import { PullFromSheetButton } from '@/components/pull-from-sheet-button';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getDoctorTeam(doctorId: string) {
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from('secretary_assignments')
    .select('secretary_id, created_at')
    .eq('doctor_id', doctorId);

  if (!assignments?.length) return [];

  const ids = assignments.map((a) => a.secretary_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_active, created_at')
    .in('id', ids)
    .eq('role', 'secretary');

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    is_active: p.is_active,
    created_at: p.created_at,
  }));
}

async function getManagers() {
  const supabase = await createClient();
  const { data } = await supabase.from('managers').select('id, name').order('name');
  return data ?? [];
}

async function getDoctor(id: string) {
  const supabase = await createClient();

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

  const { data: rowMeta } = await supabase
    .from('leads')
    .select('fields')
    .eq('doctor_id', id);

  let lastImportedRow = 0;
  for (const lead of rowMeta ?? []) {
    const rowNum = Number((lead.fields as Record<string, unknown>)?.sheets_row_number);
    if (rowNum > lastImportedRow) lastImportedRow = rowNum;
  }

  const { data: logs } = await supabase
    .from('connection_logs')
    .select('*')
    .eq('doctor_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  return { doctor, leads: leads ?? [], logs: logs ?? [], lastImportedRow };
}

export default async function MedicoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const isAdmin = profile?.role === 'admin';

  try {
    await requireDoctorAccess(id);
  } catch {
    notFound();
  }

  const [data, managers, team] = await Promise.all([
    getDoctor(id),
    getManagers(),
    isAdmin ? getDoctorTeam(id) : Promise.resolve([]),
  ]);
  if (!data) notFound();

  const { doctor, leads, logs, lastImportedRow } = data;
  const instance = doctor.instance as {
    connection_status: string;
    uazapi_token: string | null;
    uazapi_base_url: string;
    webhook_configured: boolean;
  } | null;
  const manager = doctor.manager as { name: string } | null;

  return (
    <div className="px-8 py-10 lg:px-12">
      <Link
        href={isAdmin ? '/medicos' : '/leads'}
        className="mb-6 inline-flex items-center gap-2 text-[14px] text-[var(--brand-text-tertiary)] transition hover:text-[var(--brand-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {isAdmin ? 'Voltar para médicos' : 'Voltar para leads'}
      </Link>

      <div className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight text-[var(--brand-text)]">
          {doctor.name}
        </h1>
        <p className="font-mono text-[13px] text-[var(--brand-text-tertiary)]">{doctor.instance_name}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-[14px] text-[var(--brand-text-tertiary)]">
          <span>Gestor: {manager?.name || '—'}</span>
          <span>Telefone: {formatPhone(doctor.phone)}</span>
          {doctor.spreadsheet_url && (
            <a
              href={doctor.spreadsheet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-link inline-flex items-center gap-1"
            >
              Planilha <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <WhatsAppUazapiPanel
        doctorId={id}
        doctorName={doctor.name}
        instanceName={doctor.instance_name}
        initialStatus={instance?.connection_status}
        defaultPhone={doctor.phone}
        appUrl={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
        initialToken={instance?.uazapi_token}
        initialBaseUrl={instance?.uazapi_base_url}
        webhookConfigured={instance?.webhook_configured}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <div className="mt-8 space-y-6">
          <DoctorAdminActions
            doctorId={id}
            doctorName={doctor.name}
            instanceName={doctor.instance_name}
            currentManagerId={doctor.manager_id}
            managers={managers}
          />
          <DoctorLeadPhrasesForm doctorId={id} />
          <DoctorTrackingForm
            doctorId={id}
            instanceName={doctor.instance_name}
          />
          <DoctorTeamManager
            doctorId={id}
            doctorName={doctor.name}
            initialTeam={team}
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="apple-card p-6 lg:p-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-[21px] font-semibold text-[var(--brand-text)]">Leads recentes</h2>
            <PullFromSheetButton
              doctorId={id}
              hasSpreadsheet={Boolean(doctor.spreadsheet_id)}
              lastImportedRow={lastImportedRow}
            />
          </div>
          {leads.length === 0 ? (
            <p className="text-[15px] text-[var(--brand-text-tertiary)]">Nenhum lead ainda</p>
          ) : (
            <ul className="space-y-3">
              {leads.map((lead) => (
                <li key={lead.id} className="rounded-xl bg-[var(--brand-bg)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[15px] font-medium text-[var(--brand-text)]">
                      {lead.patient_name || lead.patient_phone}
                    </span>
                    <LeadStatusSelect leadId={lead.id} value={lead.status} />
                  </div>
                  {lead.message && (
                    <p className="mt-1 line-clamp-2 text-[13px] text-[var(--brand-text-tertiary)]">
                      {lead.message}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--brand-text-tertiary)]">
                    <span>{formatDate(lead.received_at)}</span>
                    {lead.synced_to_sheets ? (
                      <span className="text-[#34c759]">✓ Espelhado da planilha</span>
                    ) : (
                      <span className="text-[var(--brand-text-tertiary)]">Só no painel</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="apple-card p-6 lg:p-8">
          <h2 className="mb-4 text-[21px] font-semibold text-[var(--brand-text)]">
            Histórico de conexão
          </h2>
          {logs.length === 0 ? (
            <p className="text-[15px] text-[var(--brand-text-tertiary)]">Sem alterações registradas</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between text-[14px]">
                  <span className="text-[var(--brand-text-tertiary)]">
                    {log.previous_status} → {log.new_status}
                  </span>
                  <span className="text-[12px] text-[var(--brand-text-tertiary)]">
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
