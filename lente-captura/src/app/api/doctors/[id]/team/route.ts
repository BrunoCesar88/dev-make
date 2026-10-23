import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createAppUser } from '@/lib/users/create-user';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function fetchDoctorTeam(doctorId: string) {
  const supabase = await createClient();
  const { data: assignments, error } = await supabase
    .from('secretary_assignments')
    .select('id, secretary_id, created_at')
    .eq('doctor_id', doctorId);

  if (error) throw new Error(error.message);
  if (!assignments?.length) return [];

  const ids = assignments.map((a) => a.secretary_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_active, created_at')
    .in('id', ids)
    .eq('role', 'secretary');

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return assignments
    .map((row) => {
      const secretary = byId.get(row.secretary_id);
      if (!secretary) return null;
      return {
        assignment_id: row.id,
        id: secretary.id,
        email: secretary.email,
        full_name: secretary.full_name,
        is_active: secretary.is_active,
        created_at: secretary.created_at,
        assigned_at: row.created_at,
      };
    })
    .filter(Boolean);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: doctorId } = await params;
    const team = await fetchDoctorTeam(doctorId);
    return NextResponse.json(team);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAdmin();
    const { id: doctorId } = await params;
    const body = await request.json();
    const {
      email,
      password,
      full_name: fullName,
    } = body as {
      email?: string;
      password?: string;
      full_name?: string;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const service = await createServiceClient();
    const created = await createAppUser(service, {
      email,
      password,
      fullName,
      role: 'secretary',
      doctorId,
      createdBy: profile.id,
    });

    await logAudit({
      profile,
      action: 'user_create',
      entityType: 'user',
      doctorId,
      metadata: { user_id: created.id, role: 'secretary', email: created.email },
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
