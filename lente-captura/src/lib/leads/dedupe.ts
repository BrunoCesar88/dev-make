import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePhone } from '@/lib/leads/phone';

interface LeadRow {
  id: string;
  doctor_id: string;
  patient_phone: string;
  patient_name: string | null;
  message: string | null;
  fields: Record<string, unknown> | null;
  created_at: string;
}

function keeperScore(lead: LeadRow): number {
  let score = 0;
  if (lead.fields?.sheets_row_number) score += 10;
  if (lead.message?.trim()) score += 5;
  if (lead.patient_name?.trim()) score += 2;
  return score;
}

function pickKeeper(group: LeadRow[]): LeadRow {
  return [...group].sort((a, b) => {
    const scoreDiff = keeperScore(b) - keeperScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    // Em empate, mantém o registro mais recente (ex.: reimportação com datas corrigidas)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0];
}

export interface DedupeResult {
  removed: number;
  normalized: number;
}

/** Remove duplicatas por médico + telefone normalizado */
export async function dedupeLeads(
  supabase: SupabaseClient,
  options: { doctorId?: string } = {}
): Promise<DedupeResult> {
  const leads: LeadRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('leads')
      .select(
        'id, doctor_id, patient_phone, patient_name, message, fields, created_at'
      )
      .range(from, from + 999);

    if (options.doctorId) {
      query = query.eq('doctor_id', options.doctorId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    leads.push(...(data as LeadRow[]));
    from += 1000;
    if (data.length < 1000) break;
  }

  const groups = new Map<string, LeadRow[]>();

  for (const lead of leads) {
    const phone = normalizePhone(lead.patient_phone);
    if (!phone) continue;
    const key = `${lead.doctor_id}|${phone}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lead);
  }

  const toDelete: string[] = [];
  const toNormalize: { id: string; phone: string }[] = [];

  for (const [, group] of groups) {
    const keeper = pickKeeper(group);
    const normalized = normalizePhone(keeper.patient_phone);
    if (normalized && normalized !== keeper.patient_phone) {
      toNormalize.push({ id: keeper.id, phone: normalized });
    }

    for (const lead of group) {
      if (lead.id !== keeper.id) toDelete.push(lead.id);
    }
  }

  const BATCH = 200;

  for (let i = 0; i < toDelete.length; i += BATCH) {
    const chunk = toDelete.slice(i, i + BATCH);
    const { error } = await supabase.from('leads').delete().in('id', chunk);
    if (error) throw new Error(error.message);
  }

  for (let i = 0; i < toNormalize.length; i += BATCH) {
    const chunk = toNormalize.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(({ id, phone }) =>
        supabase.from('leads').update({ patient_phone: phone }).eq('id', id)
      )
    );
  }

  return { removed: toDelete.length, normalized: toNormalize.length };
}

export async function countDuplicateLeads(
  supabase: SupabaseClient
): Promise<number> {
  const leads: { doctor_id: string; patient_phone: string }[] = [];
  let from = 0;

  while (true) {
    const { data } = await supabase
      .from('leads')
      .select('doctor_id, patient_phone')
      .range(from, from + 999);

    if (!data?.length) break;
    leads.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }

  const seen = new Set<string>();
  let extras = 0;

  for (const lead of leads) {
    const phone = normalizePhone(lead.patient_phone);
    if (!phone) continue;
    const key = `${lead.doctor_id}|${phone}`;
    if (seen.has(key)) extras++;
    else seen.add(key);
  }

  return extras;
}
