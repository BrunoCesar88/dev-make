import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { deleteAppUser } from '@/lib/users/delete-user';
import { validatePassword } from '@/lib/users/create-user';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const {
      full_name: fullName,
      is_active: isActive,
      password,
    } = body as {
      full_name?: string;
      is_active?: boolean;
      password?: string;
    };

    if (id === profile.id && isActive === false) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName.trim();
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select('id, email, full_name, role, is_active, created_at')
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await logAudit({
        profile,
        action: 'user_update',
        entityType: 'user',
        fieldKey: Object.keys(updates).join(','),
        oldValue: JSON.stringify({ full_name: existing.full_name, is_active: existing.is_active }),
        newValue: JSON.stringify(updates),
        metadata: { user_id: id },
      });

      if (password) {
        const passwordError = validatePassword(password);
        if (passwordError) {
          return NextResponse.json({ error: passwordError }, { status: 400 });
        }
        const service = await createServiceClient();
        const { error: authError } = await service.auth.admin.updateUserById(id, {
          password,
        });
        if (authError) {
          return NextResponse.json({ error: authError.message }, { status: 500 });
        }
      }

      return NextResponse.json(updated);
    }

    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
      const service = await createServiceClient();
      const { error: authError } = await service.auth.admin.updateUserById(id, {
        password,
      });
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
      await logAudit({
        profile,
        action: 'user_update',
        entityType: 'user',
        metadata: { user_id: id, password_reset: true },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAdmin();
    const { id } = await params;

    if (id === profile.id) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const service = await createServiceClient();
    await deleteAppUser(service, id);

    await logAudit({
      profile,
      action: 'user_update',
      entityType: 'user',
      metadata: {
        user_id: id,
        deleted: true,
        email: existing.email,
        role: existing.role,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
