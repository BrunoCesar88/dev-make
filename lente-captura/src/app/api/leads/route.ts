import { NextResponse } from 'next/server';
import {
  AuthError,
  canAccessDoctor,
  getAccessibleDoctorIds,
  requireProfile,
} from '@/lib/auth';
import { applyLeadFilters, resolveFiltersDoctorScope, type LeadFilterParams } from '@/lib/leads/filters';
import { DEFAULT_LEAD_STATUS } from '@/lib/leads/schema';
import { normalizePhone } from '@/lib/leads/phone';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await requireProfile();
    const body = await request.json();
    const {
      doctor_id: doctorId,
      patient_name: patientName,
      patient_phone: patientPhone,
      convenio,
      canais,
      observacao,
      anuncio,
      status = DEFAULT_LEAD_STATUS,
    } = body as {
      doctor_id?: string;
      patient_name?: string | null;
      patient_phone?: string;
      convenio?: string | null;
      canais?: string | null;
      observacao?: string | null;
      anuncio?: string | null;
      status?: string;
    };

    if (!doctorId) {
      return NextResponse.json({ error: 'Médico obrigatório' }, { status: 400 });
    }

    const allowed = await canAccessDoctor(profile, doctorId);
    if (!allowed) {
      return NextResponse.json({ error: 'Sem permissão para este médico' }, { status: 403 });
    }

    const phone = normalizePhone(patientPhone || '');
    if (!phone) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('leads')
      .select('id, patient_phone')
      .eq('doctor_id', doctorId);

    const duplicate = existing?.find(
      (lead) => normalizePhone(lead.patient_phone) === phone
    );
    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe um lead com este telefone para este médico' },
        { status: 409 }
      );
    }

    const fields: Record<string, string> = {};
    if (canais?.trim()) fields.canais = canais.trim();
    if (convenio?.trim()) fields.convenio = convenio.trim();
    if (observacao?.trim()) fields.observacao = observacao.trim();
    if (anuncio?.trim()) fields.anuncio = anuncio.trim();

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        doctor_id: doctorId,
        patient_name: patientName?.trim() || null,
        patient_phone: phone,
        source: 'manual',
        status,
        fields,
        received_at: new Date().toISOString(),
      })
      .select('*, doctor:doctors(id, name)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function GET(request: Request) {
  try {
    const profile = await requireProfile();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const filters: LeadFilterParams = {
      doctor_id: searchParams.get('doctor_id') || undefined,
      manager_id: searchParams.get('manager_id') || undefined,
      status: searchParams.get('status') || undefined,
      canais:
        searchParams.get('canais') ||
        searchParams.get('origem') ||
        undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    };

    const supabase = await createClient();
    const accessible = await getAccessibleDoctorIds(profile);

    const doctorScope = await resolveFiltersDoctorScope(supabase, profile, filters);

    let query = supabase
      .from('leads')
      .select('*, doctor:doctors(id, name, instance_name, manager_id, manager:managers(id, name))');

    query = applyLeadFilters(query, profile, filters, accessible, doctorScope);

    query = query.order('received_at', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
