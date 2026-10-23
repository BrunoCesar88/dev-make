import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { manager_id } = body as { manager_id?: string | null };

    const supabase = await createServiceClient();

    const { data: doctor, error: fetchError } = await supabase
      .from('doctors')
      .select('id, name, manager_id, manager:managers(id, name)')
      .eq('id', id)
      .single();

    if (fetchError || !doctor) {
      return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
    }

    const resolvedManagerId =
      manager_id === null || manager_id === '' ? null : manager_id;

    if (resolvedManagerId) {
      const { data: manager, error: managerError } = await supabase
        .from('managers')
        .select('id, name')
        .eq('id', resolvedManagerId)
        .maybeSingle();

      if (managerError || !manager) {
        return NextResponse.json({ error: 'Gestor não encontrado' }, { status: 400 });
      }
    }

    if (doctor.manager_id === resolvedManagerId) {
      return NextResponse.json({
        ok: true,
        manager_id: resolvedManagerId,
      });
    }

    const oldManagerName =
      (doctor.manager as { name?: string } | null)?.name ?? null;

    const { data: updated, error: updateError } = await supabase
      .from('doctors')
      .update({
        manager_id: resolvedManagerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, manager_id, manager:managers(id, name)')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || 'Erro ao atualizar gestor' },
        { status: 500 }
      );
    }

    const newManagerName =
      (updated.manager as { name?: string } | null)?.name ?? null;

    await logAudit({
      profile,
      action: 'user_update',
      entityType: 'doctor',
      doctorId: id,
      fieldKey: 'manager_id',
      oldValue: oldManagerName,
      newValue: newManagerName,
    });

    return NextResponse.json({
      ok: true,
      manager_id: updated.manager_id,
      manager: updated.manager,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { confirm_instance_name } = body as { confirm_instance_name?: string };

    const supabase = await createServiceClient();

    const { data: doctor, error: fetchError } = await supabase
      .from('doctors')
      .select('id, name, instance_name')
      .eq('id', id)
      .single();

    if (fetchError || !doctor) {
      return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
    }

    if (confirm_instance_name?.trim() !== doctor.instance_name) {
      return NextResponse.json(
        {
          error: `Digite "${doctor.instance_name}" para confirmar a exclusão`,
        },
        { status: 400 }
      );
    }

    await logAudit({
      profile,
      action: 'user_update',
      entityType: 'doctor',
      doctorId: id,
      fieldKey: 'deleted',
      oldValue: doctor.name,
      newValue: null,
      metadata: { instance_name: doctor.instance_name },
    });

    const { error: deleteError } = await supabase.from('doctors').delete().eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
