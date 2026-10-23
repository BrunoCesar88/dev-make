import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { ensureSheetColumnDefinitions } from '@/lib/leads/sheet-columns';
import { ColumnsEditor } from '@/components/columns-editor';

export const dynamic = 'force-dynamic';

export default async function ColunasPage() {
  const profile = await getProfile();
  if (profile?.role !== 'admin') redirect('/');

  const supabase = await createClient();
  await ensureSheetColumnDefinitions(supabase);
  const { data: columns } = await supabase
    .from('column_definitions')
    .select('*')
    .order('display_order');

  return (
    <div className="px-8 py-10 lg:px-12">
      <header className="mb-10">
        <h1 className="text-[40px] font-semibold tracking-tight text-[var(--brand-text)]">
          Colunas
        </h1>
        <p className="mt-1 text-[17px] text-[var(--brand-text-tertiary)]">
          Definição global de colunas — alterações replicam para todas as planilhas
        </p>
      </header>

      <ColumnsEditor initialColumns={columns ?? []} />
    </div>
  );
}
