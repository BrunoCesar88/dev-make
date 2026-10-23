import type { ReactNode } from 'react';

interface DashAreaProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashArea({
  icon,
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
}: DashAreaProps) {
  return (
    <section className={`dash-area fade-in ${className}`}>
      <div className="dash-area-head">
        <div className="dash-area-title">
          {icon ? <div className="dash-area-icon">{icon}</div> : null}
          <div>
            <h2>{title}</h2>
            {subtitle ? <div className="dash-area-sub">{subtitle}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge}
          {action}
        </div>
      </div>
      <div className="dash-area-body">{children}</div>
    </section>
  );
}

export function DashBadge({
  children,
  variant = 'db',
}: {
  children: ReactNode;
  variant?: 'db' | 'cross' | 'neutral';
}) {
  return <span className={`dash-badge dash-badge-${variant}`}>{children}</span>;
}

export function DashKpi({
  label,
  value,
  sub,
  accent,
  compact = false,
  className = '',
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`dash-card min-w-0 ${compact ? 'p-4' : 'p-5'} ${className}`}
    >
      <div className="dash-kpi-label">{label}</div>
      <div
        className={`dash-kpi-value mt-1 ${compact ? 'dash-kpi-value-compact' : ''} ${accent ? `dash-accent-${accent}` : ''}`}
      >
        {value}
      </div>
      {sub ? <div className="dash-kpi-sub">{sub}</div> : null}
    </div>
  );
}
