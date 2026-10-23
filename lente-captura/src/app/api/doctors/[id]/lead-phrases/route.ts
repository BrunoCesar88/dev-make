import { NextResponse } from 'next/server';
import { AuthError, requireAdmin, requireDoctorAccess } from '@/lib/auth';
import {
  expandPhraseFields,
  normalizePhraseInput,
} from '@/lib/leads/phrase-variations';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireDoctorAccess(id);
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from('doctors')
      .select(
        'bio_phrase, site_phrase, manychat_phrase, social_selling_phrase'
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
    }

    return NextResponse.json(expandPhraseFields(data));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceClient();

    const updates = {
      bio_phrase: normalizePhraseInput(body.bio_phrases ?? body.bio_phrase),
      site_phrase: normalizePhraseInput(body.site_phrases ?? body.site_phrase),
      manychat_phrase: normalizePhraseInput(
        body.manychat_phrases ?? body.manychat_phrase
      ),
      social_selling_phrase: normalizePhraseInput(
        body.social_selling_phrases ?? body.social_selling_phrase
      ),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', id)
      .select(
        'bio_phrase, site_phrase, manychat_phrase, social_selling_phrase'
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(expandPhraseFields(data));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
