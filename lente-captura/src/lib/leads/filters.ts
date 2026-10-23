import type { SupabaseClient } from '@supabase/supabase-js';
import { getAccessibleDoctorIds, type Profile } from '@/lib/auth';

export interface LeadFilterParams {
  manager_id?: string;
  doctor_id?: string;
  status?: string;
  /** Canal de marketing (coluna Canais da planilha) */
  canais?: string;
  /** @deprecated use canais */
  origem?: string;
  date_from?: string;
  date_to?: string;
}

export function resolveCanaisFilter(filters: LeadFilterParams): string | undefined {
  return filters.canais || filters.origem;
}

export function hasActiveFilters(filters: LeadFilterParams): boolean {
  return Boolean(
    filters.manager_id ||
      filters.doctor_id ||
      filters.status ||
      resolveCanaisFilter(filters) ||
      filters.date_from ||
      filters.date_to
  );
}

export function buildFilterSearchParams(filters: LeadFilterParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'origem') continue;
    if (value) params.set(key, value);
  }
  const canais = resolveCanaisFilter(filters);
  if (canais) params.set('canais', canais);
  return params.toString();
}

export async function resolveDoctorIdsForManager(
  supabase: SupabaseClient,
  managerId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('doctors')
    .select('id')
    .eq('manager_id', managerId);

  return data?.map((d) => d.id) ?? [];
}

export function applyLeadFilters(
  query: {
    eq: (column: string, value: string) => unknown;
    in: (column: string, values: string[]) => unknown;
    gte: (column: string, value: string) => unknown;
    lte: (column: string, value: string) => unknown;
    or: (filters: string) => unknown;
  },
  profile: Profile | null,
  filters: LeadFilterParams,
  accessibleDoctorIds: string[] | 'all',
  doctorScope: string[] | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = query;

  if (filters.doctor_id) {
    q = q.eq('doctor_id', filters.doctor_id);
  }

  if (filters.status) {
    q = q.eq('status', filters.status);
  }

  const canais = resolveCanaisFilter(filters);
  if (canais) {
    q = q.or(`fields->>canais.eq.${canais},fields->>origem.eq.${canais}`);
  }

  if (filters.date_from) {
    q = q.gte('received_at', `${filters.date_from}T00:00:00.000-03:00`);
  }

  if (filters.date_to) {
    q = q.lte('received_at', `${filters.date_to}T23:59:59.999-03:00`);
  }

  let scope = doctorScope;

  if (accessibleDoctorIds !== 'all') {
    if (!accessibleDoctorIds.length) {
      q = q.eq('doctor_id', '00000000-0000-0000-0000-000000000000');
      return q;
    }

    if (scope) {
      scope = scope.filter((id) => accessibleDoctorIds.includes(id));
    } else {
      scope = accessibleDoctorIds;
    }
  }

  if (scope) {
    if (!scope.length) {
      q = q.eq('doctor_id', '00000000-0000-0000-0000-000000000000');
    } else {
      q = q.in('doctor_id', scope);
    }
  }

  return q;
}

/** Resolve escopo de gestor (única parte async dos filtros) */
export async function resolveFiltersDoctorScope(
  supabase: SupabaseClient,
  profile: Profile | null,
  filters: LeadFilterParams
): Promise<string[] | null> {
  if (filters.manager_id && profile?.role === 'admin') {
    return resolveDoctorIdsForManager(supabase, filters.manager_id);
  }
  return null;
}

/** Médicos ativos acessíveis ao perfil (para filtros e formulários) */
export async function getAccessibleDoctors(
  supabase: SupabaseClient,
  profile: Profile | null
): Promise<Array<{ id: string; name: string }>> {
  const accessible = profile ? await getAccessibleDoctorIds(profile) : 'all';

  let query = supabase
    .from('doctors')
    .select('id, name')
    .eq('status', 'active')
    .order('name');

  if (accessible !== 'all') {
    if (!accessible.length) return [];
    query = query.in('id', accessible);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Canais de marketing distintos (META, Manychat, INDICAÇÃO…) */
export async function getLeadCanais(supabase: SupabaseClient): Promise<string[]> {
  const values = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  const maxPages = 5;

  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await supabase
      .from('leads')
      .select('fields')
      .order('received_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      const fields = row.fields as Record<string, unknown> | null;
      const value = fields?.canais ?? fields?.origem;
      if (typeof value === 'string' && value.trim()) {
        values.add(value.trim());
      }
    }

    from += pageSize;
    if (data.length < pageSize) break;
  }

  return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** @deprecated use getLeadCanais */
export const getLeadOrigins = getLeadCanais;
