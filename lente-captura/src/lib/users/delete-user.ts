import type { SupabaseClient } from '@supabase/supabase-js';

export async function deleteAppUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from('secretary_assignments').delete().eq('secretary_id', userId);

  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileError) throw new Error(profileError.message);

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);
}
