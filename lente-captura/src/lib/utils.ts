import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export { formatDate, formatDateOnly, formatDateShort, formatNowBrazilian } from '@/lib/date';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return phone;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    connected: 'Conectado',
    connecting: 'Conectando',
    disconnected: 'Desconectado',
    hibernated: 'Hibernado',
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente',
  };
  return labels[status] ?? status;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    connected: 'bg-emerald-100 text-emerald-800',
    connecting: 'bg-amber-100 text-amber-800',
    disconnected: 'bg-red-100 text-red-800',
    hibernated: 'bg-slate-100 text-slate-800',
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
  };
  return colors[status] ?? 'bg-slate-100 text-slate-800';
}

/** Gera instance_name no padrão Dra-Nome-Sobrenome */
export function suggestInstanceName(fullName: string): string {
  const cleaned = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const prefixMatch = cleaned.match(/^(Dra?a?|Dr)\.?\s*/i);
  const prefix = prefixMatch
    ? prefixMatch[0].toLowerCase().startsWith('dr')
      ? prefixMatch[0].toLowerCase().startsWith('dra')
        ? 'Dra'
        : 'Dr'
      : 'Dra'
    : '';

  const rest = cleaned.replace(/^(Dra?a?|Dr)\.?\s*/i, '');
  const parts = rest.split(/\s+/).filter(Boolean);

  const slug = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('-');

  return prefix ? `${prefix}-${slug}` : slug;
}

export function slugifyKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
