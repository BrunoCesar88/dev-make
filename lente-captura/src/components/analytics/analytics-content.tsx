import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { loadSupabaseAnalytics } from '@/lib/analytics/supabase-loader';
import type { AnalyticsPeriod } from '@/lib/analytics-period';

interface AnalyticsContentProps {
  period: AnalyticsPeriod;
  filterDoctorId: string | null;
  doctorLabel: string | null;
}

export async function AnalyticsContent({
  period,
  filterDoctorId,
  doctorLabel,
}: AnalyticsContentProps) {
  const data = await loadSupabaseAnalytics(
    period,
    filterDoctorId,
    doctorLabel
  );

  return (
    <AnalyticsDashboard
      data={data}
      period={period}
      doctorLabel={doctorLabel}
    />
  );
}
