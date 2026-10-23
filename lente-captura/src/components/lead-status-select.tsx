'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { labelToStatusValue } from '@/lib/leads/columns';
import { LEAD_STATUS_LABELS } from '@/lib/leads/schema';

const DEFAULT_COLORS: Record<string, string> = {
  aguardando_resposta: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
  em_atendimento: 'bg-[#ff9500]/10 text-[#ff9500]',
  sucesso: 'bg-[#34c759]/10 text-[#34c759]',
  descartado: 'bg-[#ff3b30]/10 text-[#ff3b30]',
  desmarcou: 'bg-[#86868b]/10 text-[var(--brand-text-tertiary)]',
  // legado
  novo: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
  em_contato: 'bg-[#ff9500]/10 text-[#ff9500]',
  agendado: 'bg-[#5856d6]/10 text-[#5856d6]',
  compareceu: 'bg-[#34c759]/10 text-[#34c759]',
  nao_compareceu: 'bg-[#ff3b30]/10 text-[#ff3b30]',
  perdido: 'bg-[#86868b]/10 text-[var(--brand-text-tertiary)]',
};

function buildOptions(statusOptions?: string[] | null) {
  const labels = statusOptions ?? [...LEAD_STATUS_LABELS];

  return labels.map((label) => ({
    value: labelToStatusValue(label),
    label,
    color:
      DEFAULT_COLORS[labelToStatusValue(label)] ??
      'bg-[var(--brand-bg)] text-[var(--brand-text-tertiary)]',
  }));
}

export function statusLabel(
  value: string | null,
  statusOptions?: string[] | null
) {
  return (
    buildOptions(statusOptions).find((s) => s.value === value)?.label ??
    value ??
    'AGUARDANDO RESPOSTA'
  );
}

export function statusColor(
  value: string | null,
  statusOptions?: string[] | null
) {
  return (
    buildOptions(statusOptions).find((s) => s.value === value)?.color ??
    'bg-[var(--brand-bg)] text-[var(--brand-text-tertiary)]'
  );
}

interface LeadStatusSelectProps {
  leadId: string;
  value: string | null;
  statusOptions?: string[] | null;
  onChange?: (newStatus: string) => void;
  compact?: boolean;
}

export function LeadStatusSelect({
  leadId,
  value,
  statusOptions,
  onChange,
  compact = false,
}: LeadStatusSelectProps) {
  const options = buildOptions(statusOptions);
  const [status, setStatus] = useState(
    value || options[0]?.value || 'aguardando_resposta'
  );
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onChange?.(newStatus);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className={cn(
        'rounded-lg font-medium outline-none transition',
        compact ? 'max-w-full px-2 py-1 text-[12px]' : 'px-2.5 py-1 text-[13px]',
        statusColor(status, statusOptions),
        loading && 'opacity-50'
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
