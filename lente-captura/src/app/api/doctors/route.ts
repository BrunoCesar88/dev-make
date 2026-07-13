import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      manager:managers(*),
      instance:instances(*)
    `)
    .eq('status', 'active')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
