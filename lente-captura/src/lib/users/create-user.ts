import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/auth';

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  doctorId?: string | null;
  createdBy?: string | null;
}

export interface CreateUserResult {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

export async function createAppUser(
  supabase: SupabaseClient,
  input: CreateUserInput
): Promise<CreateUserResult> {
  const email = input.email.trim().toLowerCase();
  const passwordError = validatePassword(input.password);
  if (passwordError) throw new Error(passwordError);
  if (!email) throw new Error('E-mail é obrigatório');
  if (!input.fullName.trim()) throw new Error('Nome é obrigatório');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      throw new Error('Já existe um usuário com este e-mail');
    }
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Falha ao criar usuário no Auth');
  }

  const userId = authData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: input.fullName.trim(),
      role: input.role,
      doctor_id: input.role === 'doctor' ? input.doctorId ?? null : null,
      is_active: true,
      created_by: input.createdBy ?? null,
    })
    .select('id, email, full_name, role')
    .single();

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  if (input.role === 'secretary' && input.doctorId) {
    const { error: assignError } = await supabase.from('secretary_assignments').insert({
      secretary_id: userId,
      doctor_id: input.doctorId,
    });

    if (assignError) {
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(assignError.message);
    }
  }

  return profile;
}
