import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { pullLeadsForAllDoctors } from '@/lib/google-sheets/pull-from-sheet';
import { createServiceClient } from '@/lib/supabase/server';

export const maxDuration = 300;

export async function POST() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const result = await pullLeadsForAllDoctors(supabase);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    const message = err instanceof Error ? err.message : 'Erro ao puxar planilhas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
