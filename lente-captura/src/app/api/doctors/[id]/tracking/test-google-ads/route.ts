import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import {
  describeMissingGoogleAdsCredentials,
  doctorGoogleAdsCredentialsFromRow,
} from '@/lib/google-ads/credentials';
import { fetchGoogleCampaignInsights } from '@/lib/google-ads/fetch-insights';

function defaultRange() {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return { dateFrom: ymd(from), dateTo: ymd(today) };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = await createServiceClient();

    const { data: tracking, error } = await supabase
      .from('doctor_tracking')
      .select(
        'google_ads_client_id, google_ads_client_secret, google_ads_refresh_token, google_ads_developer_token, google_ads_customer_id, google_ads_login_customer_id'
      )
      .eq('doctor_id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const creds = tracking ? doctorGoogleAdsCredentialsFromRow(tracking) : null;

    if (!creds) {
      return NextResponse.json({
        ok: false,
        error: tracking
          ? describeMissingGoogleAdsCredentials(tracking)
          : 'Tracking não configurado para este médico.',
      });
    }

    const { dateFrom, dateTo } = defaultRange();

    try {
      const rows = await fetchGoogleCampaignInsights(creds, dateFrom, dateTo);
      const spend =
        rows.reduce((sum, r) => sum + r.spend_cents, 0) / 100;
      const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
      const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);

      return NextResponse.json({
        ok: true,
        date_from: dateFrom,
        date_to: dateTo,
        rows: rows.length,
        spend,
        impressions,
        clicks,
        customer_id: creds.customerId,
        message:
          rows.length > 0
            ? `OK — investido R$ ${spend.toFixed(2)}, ${impressions} impressões, ${clicks} cliques em ${rows.length} linhas de campanha.`
            : 'Conexão OK, mas sem gasto nos últimos 7 dias.',
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        ok: false,
        error: raw,
        raw_error: raw,
      });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
