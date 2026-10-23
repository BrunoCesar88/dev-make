import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { processSyncQueue } from '@/lib/google-sheets/sync-queue';

export async function POST() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const result = await processSyncQueue(supabase, 50);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
