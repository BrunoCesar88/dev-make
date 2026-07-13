import { cn, statusLabel } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const appleStatusStyles: Record<string, string> = {
  connected: 'bg-[#e8f5e9] text-[#1b7d3a]',
  connecting: 'bg-[#fff8e1] text-[#b8860b]',
  disconnected: 'bg-[#fce8e8] text-[#d70015]',
  hibernated: 'bg-[#f5f5f7] text-[#86868b]',
  active: 'bg-[#e8f5e9] text-[#1b7d3a]',
  inactive: 'bg-[#fce8e8] text-[#d70015]',
  pending: 'bg-[#fff8e1] text-[#b8860b]',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium tracking-wide',
        appleStatusStyles[status] ?? 'bg-[#f5f5f7] text-[#6e6e73]',
        className
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
