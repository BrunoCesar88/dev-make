import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createClient } from '@/lib/supabase/server';
import { enqueueSheetSync } from '@/lib/google-sheets/sync-queue';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAdmin();
    const { id } = await params;
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('column_definitions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Coluna não encontrada' }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Colunas do sistema não podem ser removidas' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('column_definitions')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      profile,
      action: 'column_delete',
      entityType: 'column',
      fieldKey: existing.key,
      oldValue: existing.label,
    });

    await enqueueSheetSync(null, 'sync_headers', {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
