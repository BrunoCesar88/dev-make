import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createClient } from '@/lib/supabase/server';
import { enqueueSheetSync } from '@/lib/google-sheets/sync-queue';
import { slugifyKey } from '@/lib/utils';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('column_definitions')
      .select('*')
      .order('display_order');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json();
    const { label, column_type = 'text' } = body as {
      label: string;
      column_type?: string;
    };

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Rótulo é obrigatório' }, { status: 400 });
    }

    const supabase = await createClient();
    const key = slugifyKey(label);

    const { data: existing } = await supabase
      .from('column_definitions')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Já existe coluna com chave "${key}"` },
        { status: 409 }
      );
    }

    const { data: last } = await supabase
      .from('column_definitions')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const display_order = (last?.display_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('column_definitions')
      .insert({
        key,
        label: label.trim(),
        column_type,
        display_order,
        is_required: false,
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      profile,
      action: 'column_create',
      entityType: 'column',
      fieldKey: key,
      newValue: label,
    });

    await enqueueSheetSync(null, 'sync_headers', {});

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json();
    const { id, label, display_order } = body as {
      id: string;
      label?: string;
      display_order?: number;
    };

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('column_definitions')
      .select('*')
      .eq('id', id)
      .single();

    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label;
    if (display_order !== undefined) updates.display_order = display_order;

    const { data, error } = await supabase
      .from('column_definitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      profile,
      action: 'column_update',
      entityType: 'column',
      fieldKey: existing?.key,
      oldValue: existing?.label,
      newValue: label,
    });

    await enqueueSheetSync(null, 'sync_headers', {});

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
