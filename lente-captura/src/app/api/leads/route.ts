import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctor_id');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const supabase = await createServiceClient();

  let query = supabase
    .from('leads')
    .select('*, doctor:doctors(id, name, instance_name)')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (doctorId) {
    query = query.eq('doctor_id', doctorId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
