import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatMetaApiError } from '@/lib/meta-ads/errors';
import {
  fetchMetaAccountInsights,
  parseMessagingConversationsStarted,
} from '@/lib/meta-ads/fetch-insights';
import { fetchMetaSocialMetrics } from '@/lib/meta-ads/fetch-social';
import {
  describeMetaAdAccountAccess,
  fetchMetaAdAccounts,
} from '@/lib/meta-ads/verify-account';

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
      .select('meta_ads_access_token, meta_ads_account_id')
      .eq('doctor_id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const token = tracking?.meta_ads_access_token?.trim();
    const accountId = tracking?.meta_ads_account_id?.trim();

    if (!token || !accountId) {
      return NextResponse.json({
        ok: false,
        error:
          'Configure META_ADS_ACCESS_TOKEN e META_ADS_ACCOUNT_ID antes de testar.',
      });
    }

    const { dateFrom, dateTo } = defaultRange();

    try {
      const [rows, social] = await Promise.all([
        fetchMetaAccountInsights(accountId, token, dateFrom, dateTo),
        fetchMetaSocialMetrics(token, dateFrom, dateTo),
      ]);

      const spend = rows.reduce((sum, r) => sum + parseFloat(r.spend || '0'), 0);
      const reach = rows.reduce(
        (sum, r) => sum + (parseInt(r.reach || '0', 10) || 0),
        0
      );
      const messaging = rows.reduce(
        (sum, r) => sum + parseMessagingConversationsStarted(r.actions),
        0
      );

      const { accounts, error: accountsError } = await fetchMetaAdAccounts(token);
      const accountHint =
        accountsError ||
        describeMetaAdAccountAccess(accountId, accounts) ||
        (rows.length === 0
          ? 'Conta acessível, mas sem gasto nos últimos 7 dias.'
          : null);

      return NextResponse.json({
        ok: true,
        date_from: dateFrom,
        date_to: dateTo,
        rows: rows.length,
        spend,
        reach,
        organic_reach: social.organic_reach,
        new_followers: social.new_followers,
        ig_followers_total: social.ig_followers_total,
        messaging_conversations: messaging,
        cost_per_message: messaging > 0 ? spend / messaging : null,
        social_warnings: social.warnings,
        account_hint: accountHint,
        available_accounts: accounts.slice(0, 8).map((a) => ({
          id: a.account_id || a.id.replace(/^act_/, ''),
          name: a.name,
        })),
        message:
          rows.length > 0 || social.organic_reach > 0 || social.ig_followers_total
            ? `OK — investido R$ ${spend.toFixed(2)}, alcance pago ${reach}, orgânico ${social.organic_reach}, seguidores IG ${social.ig_followers_total ?? '—'}, ${messaging} conversas.`
            : accountHint ||
              social.warnings[0] ||
              'Conexão OK, mas sem dados nos últimos 7 dias.',
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        ok: false,
        error: formatMetaApiError(raw),
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
