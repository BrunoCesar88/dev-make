import { createClient, createServiceClient } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'doctor' | 'secretary';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  doctor_id: string | null;
  is_active: boolean;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getProfile(): Promise<Profile | null> {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, doctor_id, is_active')
    .eq('id', user.id)
    .single();

  return data;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile?.is_active) {
    throw new AuthError(401, 'Não autenticado');
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') {
    throw new AuthError(403, 'Acesso restrito a administradores');
  }
  return profile;
}

export async function getAccessibleDoctorIds(
  profile: Profile
): Promise<string[] | 'all'> {
  if (profile.role === 'admin') return 'all';

  if (profile.role === 'doctor' && profile.doctor_id) {
    return [profile.doctor_id];
  }

  if (profile.role === 'secretary') {
    const supabase = await createClient();
    const { data } = await supabase
      .from('secretary_assignments')
      .select('doctor_id')
      .eq('secretary_id', profile.id);
    return data?.map((row) => row.doctor_id) ?? [];
  }

  return [];
}

export async function canAccessDoctor(
  profile: Profile,
  doctorId: string
): Promise<boolean> {
  const ids = await getAccessibleDoctorIds(profile);
  return ids === 'all' || ids.includes(doctorId);
}

export async function requireDoctorAccess(doctorId: string): Promise<Profile> {
  const profile = await requireProfile();
  const allowed = await canAccessDoctor(profile, doctorId);
  if (!allowed) {
    throw new AuthError(403, 'Sem permissão para este médico');
  }
  return profile;
}

/** Service role lookup for webhooks and background jobs */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, doctor_id, is_active')
    .eq('id', id)
    .single();
  return data;
}
