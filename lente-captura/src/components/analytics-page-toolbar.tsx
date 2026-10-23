'use client';

import { AnalyticsDaysPicker } from '@/components/analytics-days-picker';
import { AnalyticsDoctorPicker } from '@/components/analytics-doctor-picker';
import type { AnalyticsPeriod } from '@/lib/analytics-period';
import type { UtmQueryState } from '@/lib/analytics-query';

interface AnalyticsPageToolbarProps {
  isAdmin: boolean;
  doctors: Array<{ id: string; name: string; tenant_slug: string }>;
  selectedDoctorId: string;
  period: AnalyticsPeriod;
  utm: UtmQueryState;
}

export function AnalyticsPageToolbar({
  isAdmin,
  doctors,
  selectedDoctorId,
  period,
  utm,
}: AnalyticsPageToolbarProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:gap-4">
      {isAdmin && (
        <AnalyticsDoctorPicker
          doctors={doctors}
          selectedId={selectedDoctorId}
          period={period}
          utm={utm}
        />
      )}
      <AnalyticsDaysPicker
        period={period}
        doctorId={selectedDoctorId}
        utm={utm}
      />
    </div>
  );
}
