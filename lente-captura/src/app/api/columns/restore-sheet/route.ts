import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { ensureSheetColumnDefinitions } from '@/lib/leads/sheet-columns';
import { createClient } from '@/lib/supabase/server';
import { enqueueSheetSync } from '@/lib/google-sheets/sync-queue';

export async function POST() {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { updated } = await ensureSheetColumnDefinitions(supabase);

    if (updated) {
      await enqueueSheetSync(null, 'sync_headers', {});
    }

    const { data, error } = await supabase
      .from('column_definitions')
      .select('*')
      .order('display_order');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updated, columns: data });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
