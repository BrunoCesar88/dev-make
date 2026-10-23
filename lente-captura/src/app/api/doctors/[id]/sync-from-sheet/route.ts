import { NextResponse } from 'next/server';
import { AuthError, requireDoctorAccess } from '@/lib/auth';
import {
  pullLeadsFromSheet,
  type PullFromSheetMode,
} from '@/lib/google-sheets/pull-from-sheet';
import { createServiceClient } from '@/lib/supabase/server';

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireDoctorAccess(id);

    let mode: PullFromSheetMode = 'incremental';
    try {
      const body = await request.json();
      if (body?.mode === 'full' || body?.mode === 'incremental') {
        mode = body.mode;
      }
    } catch {
      // body vazio = incremental
    }

    const supabase = await createServiceClient();
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('id, name, spreadsheet_id')
      .eq('id', id)
      .single();

    if (error || !doctor) {
      return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
    }

    if (!doctor.spreadsheet_id) {
      return NextResponse.json(
        { error: 'Este médico não tem planilha vinculada' },
        { status: 400 }
      );
    }

    const result = await pullLeadsFromSheet(
      supabase,
      doctor.id,
      doctor.spreadsheet_id,
      { mode }
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    const message = err instanceof Error ? err.message : 'Erro ao ler planilha';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
