import type { SupabaseClient } from '@supabase/supabase-js';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';
import {
  fetchMetaAccountInsights,
  fetchMetaCampaignInsights,
  parseMessagingConversationsStarted,
  type MetaAccountInsightRow,
  type MetaCampaignInsightRow,
} from '@/lib/meta-ads/fetch-insights';
import { fetchMetaSocialMetrics } from '@/lib/meta-ads/fetch-social';
import {
  describeMetaAdAccountAccess,
  fetchMetaAdAccounts,
} from '@/lib/meta-ads/verify-account';

export const META_ACCOUNT_CAMPAIGN_ID = '__account__';

export interface MetaAdsSyncResult {
  doctors_synced: number;
  rows_upserted: number;
  errors: Array<{ doctor_id: string; error: string }>;
  social_warnings: string[];
}

type SpendUpsert = {
  doctor_id: string;
  tenant_slug: string;
  platform: 'meta';
  spend_date: string;
  campaign_id: string;
  campaign_name: string;
  spend_cents: number;
  currency: string;
  impressions: number;
  clicks: number;
  reach: number;
  messaging_conversations_started: number;
  organic_reach: number;
  new_followers: number;
  ig_followers_total: number;
  synced_at: string;
};

function insightToUpsert(
  r: MetaAccountInsightRow | MetaCampaignInsightRow,
  opts: {
    doctorId: string;
    tenantSlug: string;
    campaignId: string;
    campaignName: string;
    organicReach: number;
    newFollowers: number;
    syncedAt: string;
  }
): SpendUpsert {
  return {
    doctor_id: opts.doctorId,
    tenant_slug: opts.tenantSlug,
    platform: 'meta',
    spend_date: r.date_start,
    campaign_id: opts.campaignId,
    campaign_name: opts.campaignName,
    spend_cents: Math.round(parseFloat(r.spend || '0') * 100),
    currency: r.account_currency || 'BRL',
    impressions: parseInt(r.impressions || '0', 10) || 0,
    clicks: parseInt(r.clicks || '0', 10) || 0,
    reach: parseInt(r.reach || '0', 10) || 0,
    messaging_conversations_started: parseMessagingConversationsStarted(
      r.actions
    ),
    organic_reach: opts.organicReach,
    new_followers: opts.newFollowers,
    ig_followers_total: 0,
    synced_at: opts.syncedAt,
  };
}

export async function syncMetaAdsForPeriod(
  supabase: SupabaseClient,
  opts: {
    dateFrom: string;
    dateTo: string;
    doctorId?: string | null;
  }
): Promise<MetaAdsSyncResult> {
  let query = supabase
    .from('doctor_tracking')
    .select(
      'doctor_id, meta_ads_access_token, meta_ads_account_id, ig_followers_count, doctors(tenant_slug, instance_name)'
    )
    .not('meta_ads_access_token', 'is', null)
    .not('meta_ads_account_id', 'is', null);

  if (opts.doctorId) {
    query = query.eq('doctor_id', opts.doctorId);
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const result: MetaAdsSyncResult = {
    doctors_synced: 0,
    rows_upserted: 0,
    errors: [],
    social_warnings: [],
  };

  for (const raw of rows || []) {
    const row = raw as {
      doctor_id: string;
      meta_ads_access_token: string;
      meta_ads_account_id: string;
      ig_followers_count: number | null;
      doctors:
        | { tenant_slug: string | null; instance_name: string }
        | { tenant_slug: string | null; instance_name: string }[]
        | null;
    };
    const token = row.meta_ads_access_token?.trim();
    const accountId = row.meta_ads_account_id?.trim();
    if (!token || !accountId) continue;

    const doctorRecord = Array.isArray(row.doctors)
      ? row.doctors[0]
      : row.doctors;
    const tenantSlug = doctorRecord
      ? doctorRecord.tenant_slug ||
        instanceNameToTenantSlug(doctorRecord.instance_name)
      : 'default';

    try {
      const [insights, campaignInsights, social] = await Promise.all([
        fetchMetaAccountInsights(accountId, token, opts.dateFrom, opts.dateTo),
        fetchMetaCampaignInsights(accountId, token, opts.dateFrom, opts.dateTo).catch(
          () => [] as MetaCampaignInsightRow[]
        ),
        fetchMetaSocialMetrics(token, opts.dateFrom, opts.dateTo),
      ]);

      if (social.warnings.length) {
        result.social_warnings.push(
          ...social.warnings.map((w) => `${tenantSlug}: ${w}`)
        );
      }

      const socialByDate = new Map(
        social.daily.map((d) => [d.date, d] as const)
      );

      if (
        !insights.length &&
        !campaignInsights.length &&
        !social.daily.length &&
        social.ig_followers_total == null
      ) {
        result.doctors_synced += 1;
        continue;
      }

      let followerDelta = social.new_followers;
      if (social.ig_followers_total != null && row.ig_followers_count) {
        followerDelta = Math.max(
          0,
          social.ig_followers_total - row.ig_followers_count
        );
      }

      const now = new Date().toISOString();
      let upserts: SpendUpsert[] = insights.map((r) => {
        const socialDay = socialByDate.get(r.date_start);
        return insightToUpsert(r, {
          doctorId: row.doctor_id,
          tenantSlug,
          campaignId: META_ACCOUNT_CAMPAIGN_ID,
          campaignName: 'Conta (total)',
          organicReach: socialDay?.organic_reach || 0,
          newFollowers: socialDay?.new_followers || 0,
          syncedAt: now,
        });
      });

      for (const r of campaignInsights) {
        upserts.push(
          insightToUpsert(r, {
            doctorId: row.doctor_id,
            tenantSlug,
            campaignId: r.campaign_id,
            campaignName: r.campaign_name,
            organicReach: 0,
            newFollowers: 0,
            syncedAt: now,
          })
        );
      }

      if (!upserts.length && social.ig_followers_total != null) {
        upserts = [
          {
            doctor_id: row.doctor_id,
            tenant_slug: tenantSlug,
            platform: 'meta',
            spend_date: opts.dateTo,
            campaign_id: META_ACCOUNT_CAMPAIGN_ID,
            campaign_name: 'Conta (total)',
            spend_cents: 0,
            currency: 'BRL',
            impressions: 0,
            clicks: 0,
            reach: 0,
            messaging_conversations_started: 0,
            organic_reach: social.organic_reach,
            new_followers: followerDelta,
            ig_followers_total: social.ig_followers_total,
            synced_at: now,
          },
        ];
      }

      if (!insights.length && !campaignInsights.length) {
        const { accounts, error: accountsError } = await fetchMetaAdAccounts(token);
        const accessHint = accountsError
          ? accountsError
          : describeMetaAdAccountAccess(accountId, accounts);
        if (accessHint) {
          result.social_warnings.push(`${tenantSlug}: ${accessHint}`);
        } else if (!social.ig_followers_total) {
          result.social_warnings.push(
            `${tenantSlug}: Conta de anúncios sem gasto no período — confira se as campanhas estão ativas.`
          );
        }
      }

      const accountRows = upserts.filter(
        (u) => u.campaign_id === META_ACCOUNT_CAMPAIGN_ID
      );
      if (accountRows.length) {
        const last = accountRows[accountRows.length - 1]!;
        if (followerDelta > 0 && !last.new_followers) {
          last.new_followers = followerDelta;
        }
        if (social.ig_followers_total != null) {
          last.ig_followers_total = social.ig_followers_total;
        }
      }

      if (upserts.length) {
        const { error: upsertError } = await supabase
          .from('tracking_ad_spend')
          .upsert(upserts, {
            onConflict: 'platform,tenant_slug,spend_date,campaign_id',
          });

        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }

      if (social.ig_followers_total != null) {
        await supabase
          .from('doctor_tracking')
          .update({
            ig_followers_count: social.ig_followers_total,
            ig_followers_synced_at: now,
          })
          .eq('doctor_id', row.doctor_id);
      }

      result.doctors_synced += 1;
      result.rows_upserted += upserts.length;
    } catch (err) {
      result.errors.push({
        doctor_id: row.doctor_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
