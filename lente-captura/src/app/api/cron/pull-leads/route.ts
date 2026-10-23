import { NextResponse } from 'next/server';
import { pullLeadsForAllDoctors } from '@/lib/google-sheets/pull-from-sheet';
import { createServiceClient } from '@/lib/supabase/server';

export const maxDuration = 300;

/** Cron Vercel: sincroniza planilhas → Supabase a cada 15 min */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const result = await pullLeadsForAllDoctors(supabase, { mode: 'incremental' });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao puxar planilhas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
