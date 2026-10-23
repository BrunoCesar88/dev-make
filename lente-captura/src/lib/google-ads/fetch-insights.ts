import type { DoctorGoogleAdsCredentials } from '@/lib/google-ads/credentials';
import { getGoogleAdsAccessToken } from '@/lib/google-ads/auth';

export interface GoogleCampaignInsightRow {
  date: string;
  campaign_id: string;
  campaign_name: string;
  spend_cents: number;
  currency: string;
  impressions: number;
  clicks: number;
}

interface GaqlResult {
  campaign?: { id?: string; name?: string };
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
  };
  segments?: { date?: string };
  customer?: { currencyCode?: string };
}

export async function fetchGoogleCampaignInsights(
  creds: DoctorGoogleAdsCredentials,
  dateFrom: string,
  dateTo: string
): Promise<GoogleCampaignInsightRow[]> {
  const accessToken = await getGoogleAdsAccessToken(creds);
  const customerId = creds.customerId.replace(/-/g, '');
  const loginCustomerId = (
    creds.loginCustomerId?.trim() || creds.customerId
  ).replace(/-/g, '');

  const query =
    'SELECT campaign.id, campaign.name, metrics.cost_micros, metrics.impressions, ' +
    'metrics.clicks, customer.currency_code, segments.date ' +
    `FROM campaign WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'`;

  const url = `https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:search`;
  const all: GaqlResult[] = [];
  let pageToken: string | undefined;
  let safety = 50;

  while (safety-- > 0) {
    const reqBody = pageToken ? { query, pageToken } : { query };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': creds.developerToken,
        'login-customer-id': loginCustomerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Google Ads API ${resp.status}: ${text.slice(0, 300)}`);
    }

    const data = (await resp.json()) as {
      results?: GaqlResult[];
      nextPageToken?: string;
    };

    if (Array.isArray(data.results)) all.push(...data.results);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return all
    .map((r) => {
      const costMicros = parseInt(r.metrics?.costMicros || '0', 10) || 0;
      return {
        date: r.segments?.date || '',
        campaign_id: String(r.campaign?.id || ''),
        campaign_name: r.campaign?.name || '',
        spend_cents: Math.round(costMicros / 10000),
        currency: r.customer?.currencyCode || 'BRL',
        impressions: parseInt(r.metrics?.impressions || '0', 10) || 0,
        clicks: parseInt(r.metrics?.clicks || '0', 10) || 0,
      };
    })
    .filter((r) => r.date && r.campaign_id);
}
