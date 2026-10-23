import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createAppUser } from '@/lib/users/create-user';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as UserRole | null;

    const supabase = await createClient();
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, role, doctor_id, is_active, created_at')
      .order('full_name');

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json();
    const {
      email,
      password,
      full_name: fullName,
      role = 'admin',
      doctor_id: doctorId,
    } = body as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: UserRole;
      doctor_id?: string;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['admin', 'secretary', 'doctor'].includes(role)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    }

    if (role === 'secretary' && !doctorId) {
      return NextResponse.json(
        { error: 'doctor_id é obrigatório para secretária' },
        { status: 400 }
      );
    }

    const service = await createServiceClient();
    const created = await createAppUser(service, {
      email,
      password,
      fullName,
      role,
      doctorId: doctorId ?? null,
      createdBy: profile.id,
    });

    await logAudit({
      profile,
      action: 'user_create',
      entityType: 'user',
      metadata: { user_id: created.id, role: created.role, email: created.email },
    });

    return NextResponse.json(created, { status: 201 });
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
