import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { AdminUsersManager } from '@/components/admin-users-manager';

export const dynamic = 'force-dynamic';

export default async function AdminUsuariosPage() {
  const profile = await getProfile();
  if (profile?.role !== 'admin') redirect('/');

  const supabase = await createClient();
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .eq('role', 'admin')
    .order('full_name');

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight text-[var(--brand-text)] sm:text-[40px]">
          Usuários Lente
        </h1>
        <p className="mt-1 text-[15px] text-[var(--brand-text-tertiary)] sm:text-[17px]">
          Administradores com acesso total ao Captura
        </p>
      </header>

      <AdminUsersManager
        initialUsers={users ?? []}
        currentUserId={profile.id}
      />
    </div>
  );
}
