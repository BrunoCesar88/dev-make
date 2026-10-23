import { NextResponse } from 'next/server';
import { AuthError, requireProfile, canAccessDoctor } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { enqueueSheetSync } from '@/lib/google-sheets/sync-queue';
import { fireConversionOnStatusChange } from '@/lib/tracking/fire-conversion';
import type { DoctorTracking, Lead } from '@/types/database';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await requireProfile();
    const body = await request.json();
    const { status, fields } = body as {
      status?: string;
      fields?: Record<string, string>;
    };

    const supabase = await createClient();

    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const allowed = await canAccessDoctor(profile, lead.doctor_id);
    if (!allowed) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (fields !== undefined) {
      updates.fields = { ...(lead.fields as Record<string, string>), ...fields };
    }

    const { data: updated, error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (status !== undefined && status !== lead.status) {
      await logAudit({
        profile,
        action: 'lead_status_change',
        entityType: 'lead',
        doctorId: lead.doctor_id,
        leadId: id,
        fieldKey: 'status',
        oldValue: lead.status,
        newValue: status,
      });

      await enqueueSheetSync(lead.doctor_id, 'update_cell', {
        leadId: id,
        status,
      });

      const service = await createServiceClient();
      const { data: tracking } = await service
        .from('doctor_tracking')
        .select('*')
        .eq('doctor_id', lead.doctor_id)
        .maybeSingle();

      await fireConversionOnStatusChange(
        service,
        updated as Lead,
        status,
        (tracking as DoctorTracking | null) ?? null
      );
    }

    if (fields !== undefined) {
      await logAudit({
        profile,
        action: 'lead_update',
        entityType: 'lead',
        doctorId: lead.doctor_id,
        leadId: id,
        metadata: { fields },
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
