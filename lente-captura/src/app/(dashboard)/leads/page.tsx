import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getProfile, getAccessibleDoctorIds } from '@/lib/auth';
import { AddLeadForm } from '@/components/add-lead-form';
import { LeadsFilter } from '@/components/leads-filter';
import { LeadsTable } from '@/components/leads-table';
import {
  applyLeadFilters,
  resolveFiltersDoctorScope,
  getAccessibleDoctors,
  getLeadCanais,
  hasActiveFilters,
  type LeadFilterParams,
} from '@/lib/leads/filters';
import type { ColumnDefinition } from '@/types/database';
import { ensureSheetColumnDefinitions } from '@/lib/leads/sheet-columns';
import type { LeadRow } from '@/lib/leads/columns';

export const dynamic = 'force-dynamic';

async function getLeads(filters: LeadFilterParams) {
  const profile = await getProfile();
  const supabase = await createClient();
  const accessible = profile ? await getAccessibleDoctorIds(profile) : 'all';

  const doctorScope = await resolveFiltersDoctorScope(supabase, profile, filters);

  const baseQuery = supabase
    .from('leads')
    .select('*, doctor:doctors(name, instance_name, manager_id, manager:managers(id, name))');

  const filteredQuery = applyLeadFilters(
    baseQuery,
    profile,
    filters,
    accessible,
    doctorScope
  );

  const { data } = await filteredQuery
    .order('received_at', { ascending: false })
    .limit(hasActiveFilters(filters) ? 500 : 100);

  return (data ?? []) as LeadRow[];
}

async function getManagers() {
  const supabase = await createClient();
  const { data } = await supabase.from('managers').select('id, name').order('name');
  return data ?? [];
}

async function getDoctors(profile: Awaited<ReturnType<typeof getProfile>>) {
  const supabase = await createClient();
  return getAccessibleDoctors(supabase, profile);
}

async function getColumns() {
  const supabase = await createClient();
  await ensureSheetColumnDefinitions(supabase);
  const { data } = await supabase
    .from('column_definitions')
    .select('*')
    .order('display_order');
  return (data ?? []) as ColumnDefinition[];
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadFilterParams>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();

  const filters: LeadFilterParams = {
    manager_id: params.manager_id,
    doctor_id: params.doctor_id,
    status: params.status,
    canais: params.canais || params.origem,
    date_from: params.date_from,
    date_to: params.date_to,
  };

  const [leads, managers, doctors, columns, canaisList] = await Promise.all([
    getLeads(filters),
    getManagers(),
    getDoctors(profile),
    getColumns(),
    getLeadCanais(supabase),
  ]);

  const isAdmin = profile?.role === 'admin';
  const showDoctor = isAdmin || (doctors.length > 1);
  const defaultDoctorId =
    profile?.role === 'doctor' ? profile.doctor_id : doctors.length === 1 ? doctors[0]?.id : null;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-[var(--brand-text)] sm:text-[40px]">
            Leads
          </h1>
          <p className="mt-1 text-[15px] text-[var(--brand-text-tertiary)] sm:text-[17px]">
            {hasActiveFilters(filters)
              ? `${leads.length} lead(s) com os filtros aplicados`
              : isAdmin
                ? 'Todos os leads capturados via WhatsApp'
                : 'Leads dos seus médicos'}
          </p>
        </div>
        <AddLeadForm
          doctors={doctors}
          defaultDoctorId={defaultDoctorId}
          showDoctorPicker={showDoctor}
          extraCanais={canaisList}
        />
      </header>

      <Suspense fallback={null}>
        <LeadsFilter
          managers={managers}
          doctors={doctors}
          canais={canaisList}
          isAdmin={isAdmin}
          showDoctorFilter={showDoctor}
          basePath="/leads"
        />
      </Suspense>

      {leads.length === 0 ? (
        <div className="apple-card p-12 text-center sm:p-16">
          <p className="text-[16px] text-[var(--brand-text-tertiary)] sm:text-[17px]">
            Nenhum lead encontrado com os filtros atuais.
          </p>
        </div>
      ) : (
        <LeadsTable leads={leads} columns={columns} showDoctor={showDoctor} />
      )}
    </div>
  );
}
