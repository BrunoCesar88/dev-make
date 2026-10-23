function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--brand-muted-surface)] ${className}`}
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="dash-card min-w-0 p-4">
      <Bone className="h-3 w-20" />
      <Bone className="mt-2 h-7 w-24" />
      <Bone className="mt-2 h-3 w-28" />
    </div>
  );
}

function AreaSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <section className="dash-area">
      <div className="dash-area-head">
        <div className="dash-area-title">
          <Bone className="h-9 w-9 shrink-0 rounded-[10px]" />
          <div className="min-w-0 flex-1">
            <Bone className="h-5 w-40" />
            <Bone className="mt-2 h-4 w-64 max-w-full" />
          </div>
        </div>
        <Bone className="h-6 w-24 shrink-0 rounded-full" />
      </div>
      <div className="dash-area-body">{children}</div>
    </section>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <AreaSkeleton>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      </AreaSkeleton>

      <AreaSkeleton>
        <Bone className="h-48 w-full" />
      </AreaSkeleton>

      <AreaSkeleton>
        <Bone className="h-64 w-full" />
      </AreaSkeleton>

      <AreaSkeleton>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      </AreaSkeleton>
    </div>
  );
}
