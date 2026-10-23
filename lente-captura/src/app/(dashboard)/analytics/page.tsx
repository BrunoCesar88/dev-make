import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { requireRoles } from '@/lib/auth-guards';
import { AnalyticsContent } from '@/components/analytics/analytics-content';
import { AnalyticsEmptyState } from '@/components/analytics/analytics-empty-state';
import { AnalyticsAdsSync } from '@/components/analytics/analytics-ads-sync';
import { AnalyticsReportForm } from '@/components/analytics/analytics-report-form';
import { AnalyticsSkeleton } from '@/components/analytics/analytics-skeleton';
import { parseAnalyticsPeriod } from '@/lib/analytics-period';
import { periodToIso } from '@/lib/analytics/period-bounds';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  requireRoles(profile, ['admin', 'doctor']);

  const params = await searchParams;
  const period = parseAnalyticsPeriod(params);
  const shouldRun = params.run === '1';

  const { createClient } = await import('@/lib/supabase/server');
  const { instanceNameToTenantSlug } = await import('@/lib/tracker/tenant');
  const supabase = await createClient();

  let doctors: Array<{ id: string; name: string; tenant_slug: string }> = [];
  let filterDoctorId: string | null = null;
  let doctorLabel: string | null = null;
  let defaultDoctorId: string | null = null;

  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('doctors')
      .select('id, name, instance_name, tenant_slug')
      .eq('status', 'active')
      .order('name');
    doctors =
      data?.map((d) => ({
        id: d.id,
        name: d.name,
        tenant_slug:
          d.tenant_slug || instanceNameToTenantSlug(d.instance_name),
      })) ?? [];

    const picked = params.doctor
      ? doctors.find((d) => d.id === params.doctor)
      : null;
    if (picked) {
      filterDoctorId = picked.id;
      doctorLabel = picked.name;
    }
  } else if (profile.role === 'doctor' && profile.doctor_id) {
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, name, instance_name, tenant_slug')
      .eq('id', profile.doctor_id)
      .single();
    if (doctor) {
      filterDoctorId = doctor.id;
      doctorLabel = doctor.name;
      defaultDoctorId = doctor.id;
    }
  } else {
    redirect('/');
  }

  const canLoad = shouldRun && Boolean(filterDoctorId);
  const { since, until } = periodToIso(period);

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="fade-in mb-8">
        <h1 className="text-[40px] font-semibold tracking-tight text-[var(--brand-text)]">
          Analytics
        </h1>
        <p className="mt-1 text-[17px] text-[var(--brand-text-tertiary)]">
          Leads do WhatsApp cruzados com métricas da Meta e Google Ads
        </p>
      </header>

      <div className="space-y-8">
        <AnalyticsReportForm
          isAdmin={profile.role === 'admin'}
          doctors={doctors}
          defaultDoctorId={defaultDoctorId}
          initialPeriod={period}
          activeDoctorId={filterDoctorId}
          isRunning={canLoad}
        />

        {!canLoad ? (
          <AnalyticsEmptyState />
        ) : (
          <>
            <p className="text-[13px] text-[var(--brand-text-secondary)]">
              Relatório: <strong>{doctorLabel}</strong>
            </p>

            <AnalyticsAdsSync
              dateFrom={since.slice(0, 10)}
              dateTo={until.slice(0, 10)}
              doctorId={filterDoctorId}
            />

            <Suspense fallback={<AnalyticsSkeleton />}>
              <AnalyticsContent
                period={period}
                filterDoctorId={filterDoctorId}
                doctorLabel={doctorLabel}
              />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}
