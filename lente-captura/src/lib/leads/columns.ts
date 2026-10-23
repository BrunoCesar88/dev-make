import type { ColumnDefinition } from '@/types/database';
import { DEFAULT_LEAD_STATUS, LEAD_STATUS_LABELS } from '@/lib/leads/schema';
import { formatDate, formatPhone } from '@/lib/utils';

export interface LeadRow {
  id: string;
  patient_name: string | null;
  patient_phone: string;
  message: string | null;
  source: string | null;
  status: string | null;
  received_at: string;
  synced_to_sheets: boolean;
  fields: Record<string, unknown> | null;
  doctor?: { name: string } | null;
}

export function labelToStatusValue(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function statusValueToLabel(
  value: string | null,
  statusOptions?: string[] | null
): string {
  if (!value) return 'AGUARDANDO RESPOSTA';
  const labels = statusOptions ?? [...LEAD_STATUS_LABELS];
  const match = labels.find((label) => labelToStatusValue(label) === value);
  if (match) return match;
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getStatusOptions(
  statusColumn?: ColumnDefinition | null
): { value: string; label: string }[] {
  const labels = (statusColumn?.status_options as string[] | null) ?? [
    ...LEAD_STATUS_LABELS,
  ];

  return labels.map((label) => ({
    label,
    value: labelToStatusValue(label),
  }));
}

function fieldString(fields: Record<string, unknown> | null, key: string): string {
  const value = fields?.[key];
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function getLeadCellValue(lead: LeadRow, key: string): string {
  switch (key) {
    case 'data':
      return formatDate(lead.received_at);
    case 'nome':
      return lead.patient_name || '—';
    case 'telefone':
      return formatPhone(lead.patient_phone);
    case 'status':
      return statusValueToLabel(lead.status);
    case 'canais':
      return (
        fieldString(lead.fields, 'canais') !== '—'
          ? fieldString(lead.fields, 'canais')
          : fieldString(lead.fields, 'origem')
      );
    case 'observacao':
      return (
        fieldString(lead.fields, 'observacao') !== '—'
          ? fieldString(lead.fields, 'observacao')
          : fieldString(lead.fields, 'observacoes')
      );
    default:
      return fieldString(lead.fields, key);
  }
}

export { DEFAULT_LEAD_STATUS };
