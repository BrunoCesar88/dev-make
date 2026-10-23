import type { SupabaseClient } from '@supabase/supabase-js';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';
import {
  doctorGoogleAdsCredentialsFromRow,
} from '@/lib/google-ads/credentials';
import { fetchGoogleCampaignInsights } from '@/lib/google-ads/fetch-insights';

export interface GoogleAdsSyncResult {
  doctors_synced: number;
  doctors_skipped: number;
  rows_upserted: number;
  errors: Array<{ doctor_id: string; error: string }>;
}

const GOOGLE_ADS_TRACKING_SELECT =
  'doctor_id, google_ads_client_id, google_ads_client_secret, google_ads_refresh_token, google_ads_developer_token, google_ads_customer_id, google_ads_login_customer_id, doctors(tenant_slug, instance_name)';

export async function syncGoogleAdsForPeriod(
  supabase: SupabaseClient,
  opts: {
    dateFrom: string;
    dateTo: string;
    doctorId?: string | null;
  }
): Promise<GoogleAdsSyncResult> {
  let query = supabase
    .from('doctor_tracking')
    .select(GOOGLE_ADS_TRACKING_SELECT)
    .not('google_ads_customer_id', 'is', null)
    .not('google_ads_refresh_token', 'is', null)
    .not('google_ads_developer_token', 'is', null);

  if (opts.doctorId) {
    query = query.eq('doctor_id', opts.doctorId);
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const result: GoogleAdsSyncResult = {
    doctors_synced: 0,
    doctors_skipped: 0,
    rows_upserted: 0,
    errors: [],
  };

  for (const raw of rows || []) {
    const row = raw as {
      doctor_id: string;
      google_ads_client_id: string | null;
      google_ads_client_secret: string | null;
      google_ads_refresh_token: string | null;
      google_ads_developer_token: string | null;
      google_ads_customer_id: string | null;
      google_ads_login_customer_id: string | null;
      doctors:
        | { tenant_slug: string | null; instance_name: string }
        | { tenant_slug: string | null; instance_name: string }[]
        | null;
    };

    const creds = doctorGoogleAdsCredentialsFromRow(row);
    if (!creds) {
      result.doctors_skipped += 1;
      continue;
    }

    const doctorRecord = Array.isArray(row.doctors)
      ? row.doctors[0]
      : row.doctors;
    const tenantSlug = doctorRecord
      ? doctorRecord.tenant_slug ||
        instanceNameToTenantSlug(doctorRecord.instance_name)
      : 'default';

    try {
      const insights = await fetchGoogleCampaignInsights(
        creds,
        opts.dateFrom,
        opts.dateTo
      );

      if (!insights.length) {
        result.doctors_synced += 1;
        continue;
      }

      const now = new Date().toISOString();
      const upserts = insights.map((r) => ({
        doctor_id: row.doctor_id,
        tenant_slug: tenantSlug,
        platform: 'google' as const,
        spend_date: r.date,
        campaign_id: r.campaign_id,
        campaign_name: r.campaign_name,
        spend_cents: r.spend_cents,
        currency: r.currency,
        impressions: r.impressions,
        clicks: r.clicks,
        synced_at: now,
      }));

      const { error: upsertError } = await supabase
        .from('tracking_ad_spend')
        .upsert(upserts, {
          onConflict: 'platform,tenant_slug,spend_date,campaign_id',
        });

      if (upsertError) {
        throw new Error(upsertError.message);
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
