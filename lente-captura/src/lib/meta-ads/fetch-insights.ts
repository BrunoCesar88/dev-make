export interface MetaActionStat {
  action_type: string;
  value: string;
}

export interface MetaAccountInsightRow {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  account_currency?: string;
  actions?: MetaActionStat[];
  cost_per_action_type?: MetaActionStat[];
}

export interface MetaCampaignInsightRow extends MetaAccountInsightRow {
  campaign_id: string;
  campaign_name: string;
}

export const META_MESSAGING_STARTED_ACTION =
  'onsite_conversion.messaging_conversation_started_7d';

export function parseMessagingConversationsStarted(
  actions: MetaActionStat[] | undefined
): number {
  if (!Array.isArray(actions)) return 0;
  const row = actions.find((a) => a.action_type === META_MESSAGING_STARTED_ACTION);
  return parseInt(row?.value || '0', 10) || 0;
}

export function parseCostPerMessagingStarted(
  costs: MetaActionStat[] | undefined
): number | null {
  if (!Array.isArray(costs)) return null;
  const row = costs.find((a) => a.action_type === META_MESSAGING_STARTED_ACTION);
  const val = parseFloat(row?.value || '0');
  return val > 0 ? val : null;
}

const INSIGHT_FIELDS = [
  'spend',
  'impressions',
  'clicks',
  'reach',
  'account_currency',
  'date_start',
  'actions',
  'cost_per_action_type',
].join(',');

async function fetchInsightsByLevel(
  accountId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string,
  level: 'account' | 'campaign'
): Promise<MetaAccountInsightRow[]> {
  const cleanId = accountId.replace(/^act_/, '');
  const fields =
    level === 'campaign'
      ? `${INSIGHT_FIELDS},campaign_id,campaign_name`
      : INSIGHT_FIELDS;

  const url =
    `https://graph.facebook.com/v22.0/act_${cleanId}/insights` +
    `?fields=${fields}` +
    `&time_range=${encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))}` +
    `&level=${level}` +
    `&time_increment=1` +
    `&limit=500` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  return fetchAllPages(url);
}

export async function fetchMetaAccountInsights(
  accountId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<MetaAccountInsightRow[]> {
  return fetchInsightsByLevel(accountId, accessToken, dateFrom, dateTo, 'account');
}

export async function fetchMetaCampaignInsights(
  accountId: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<MetaCampaignInsightRow[]> {
  const rows = await fetchInsightsByLevel(
    accountId,
    accessToken,
    dateFrom,
    dateTo,
    'campaign'
  );

  return rows
    .map((r) => {
      const campaignId = String(
        (r as MetaCampaignInsightRow).campaign_id || ''
      ).trim();
      const campaignName =
        (r as MetaCampaignInsightRow).campaign_name?.trim() || 'Campanha';
      return {
        ...r,
        campaign_id: campaignId,
        campaign_name: campaignName,
      };
    })
    .filter((r) => r.campaign_id);
}

async function fetchAllPages(url: string): Promise<MetaAccountInsightRow[]> {
  const all: MetaAccountInsightRow[] = [];
  let next: string | null = url;
  let safety = 20;

  while (next && safety-- > 0) {
    const resp = await fetch(next);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Meta API ${resp.status}: ${text.slice(0, 300)}`);
    }

    const data = (await resp.json()) as {
      data?: MetaAccountInsightRow[];
      paging?: { next?: string };
    };

    if (Array.isArray(data.data)) all.push(...data.data);
    next = data.paging?.next || null;
  }

  return all;
}
