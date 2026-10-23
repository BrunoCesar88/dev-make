import { AnalyticsSkeleton } from '@/components/analytics/analytics-skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-8">
        <div className="h-10 w-48 animate-pulse rounded-md bg-[var(--brand-muted-surface)]" />
        <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded-md bg-[var(--brand-muted-surface)]" />
      </header>
      <div className="mb-8 h-28 animate-pulse rounded-xl bg-[var(--brand-muted-surface)]" />
      <AnalyticsSkeleton />
    </div>
  );
}
