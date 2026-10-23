import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { syncMetaAdsForPeriod } from '@/lib/meta-ads/sync';

export const maxDuration = 120;

function isYmd(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Cron: puxa gasto/impressões/cliques da Meta para todos os médicos configurados */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const defaults = (() => {
    const today = new Date();
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 7);
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) =>
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    return { dateFrom: ymd(from), dateTo: ymd(today) };
  })();

  const dateFrom = isYmd(searchParams.get('date_from'))
    ? searchParams.get('date_from')!
    : defaults.dateFrom;
  const dateTo = isYmd(searchParams.get('date_to'))
    ? searchParams.get('date_to')!
    : defaults.dateTo;

  try {
    const supabase = await createServiceClient();
    const result = await syncMetaAdsForPeriod(supabase, {
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ ok: true, date_from: dateFrom, date_to: dateTo, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao sincronizar Meta Ads' },
      { status: 500 }
    );
  }
}
