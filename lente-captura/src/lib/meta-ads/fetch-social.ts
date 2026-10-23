interface MetaGraphError {
  error?: { message?: string };
}

interface PageAccount {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id: string };
}

interface InsightValue {
  value?: number;
  end_time?: string;
}

interface InsightMetric {
  name: string;
  values?: InsightValue[];
}

export interface SocialDailyRow {
  date: string;
  organic_reach: number;
  new_followers: number;
}

export interface SocialPeriodTotals {
  organic_reach: number;
  new_followers: number;
  ig_followers_total: number | null;
  daily: SocialDailyRow[];
  warnings: string[];
}

async function metaGet<T>(
  path: string,
  token: string
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://graph.facebook.com/v22.0/${path}${sep}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const json = (await res.json()) as T & MetaGraphError;
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `Meta API ${res.status}` };
  }
  return { ok: true, data: json };
}

function ymdFromEndTime(endTime?: string): string | null {
  if (!endTime) return null;
  return endTime.slice(0, 10);
}

function sumInsightValues(
  metrics: InsightMetric[] | undefined,
  name: string
): number {
  const metric = metrics?.find((m) => m.name === name);
  return (
    metric?.values?.reduce((sum, v) => sum + (Number(v.value) || 0), 0) || 0
  );
}

function dailyFromInsightMetric(
  metrics: InsightMetric[] | undefined,
  metricName: string,
  field: 'organic_reach' | 'new_followers'
): SocialDailyRow[] {
  const metric = metrics?.find((m) => m.name === metricName);
  const rows: SocialDailyRow[] = [];
  for (const v of metric?.values || []) {
    const date = ymdFromEndTime(v.end_time);
    if (!date) continue;
    rows.push({
      date,
      organic_reach: field === 'organic_reach' ? Number(v.value) || 0 : 0,
      new_followers: field === 'new_followers' ? Number(v.value) || 0 : 0,
    });
  }
  return rows;
}

function mergeDailyRows(
  target: Map<string, SocialDailyRow>,
  rows: SocialDailyRow[]
) {
  for (const row of rows) {
    const cur = target.get(row.date) || {
      date: row.date,
      organic_reach: 0,
      new_followers: 0,
    };
    cur.organic_reach += row.organic_reach;
    cur.new_followers += row.new_followers;
    target.set(row.date, cur);
  }
}

const PAGE_ORGANIC_METRICS = [
  'page_impressions_unique',
  'page_posts_impressions_organic_unique',
] as const;

const PAGE_FOLLOW_METRICS = ['page_daily_follows', 'page_follows'] as const;

export async function fetchMetaSocialMetrics(
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<SocialPeriodTotals> {
  const warnings: string[] = [];
  let organicReach = 0;
  let newFollowers = 0;
  let igFollowersTotal: number | null = null;
  const dailyMap = new Map<string, SocialDailyRow>();

  const pagesRes = await metaGet<{ data?: PageAccount[] }>(
    'me/accounts?fields=id,name,access_token,instagram_business_account',
    accessToken
  );

  if (!pagesRes.ok) {
    warnings.push(pagesRes.error || 'Sem acesso às páginas do Facebook');
    return {
      organic_reach: 0,
      new_followers: 0,
      ig_followers_total: null,
      daily: [],
      warnings,
    };
  }

  const pages = pagesRes.data?.data || [];
  if (!pages.length) {
    warnings.push('Nenhuma página Facebook ligada a este token');
    return {
      organic_reach: 0,
      new_followers: 0,
      ig_followers_total: null,
      daily: [],
      warnings,
    };
  }

  for (const page of pages) {
    const pageToken = page.access_token || accessToken;

    for (const metric of PAGE_ORGANIC_METRICS) {
      const pageOrganic = await metaGet<{ data?: InsightMetric[] }>(
        `${page.id}/insights?metric=${metric}&period=day&since=${dateFrom}&until=${dateTo}`,
        pageToken
      );
      if (pageOrganic.ok && pageOrganic.data?.data?.length) {
        organicReach += sumInsightValues(pageOrganic.data.data, metric);
        mergeDailyRows(
          dailyMap,
          dailyFromInsightMetric(pageOrganic.data.data, metric, 'organic_reach')
        );
        break;
      }
    }

    for (const metric of PAGE_FOLLOW_METRICS) {
      const pageFollows = await metaGet<{ data?: InsightMetric[] }>(
        `${page.id}/insights?metric=${metric}&period=day&since=${dateFrom}&until=${dateTo}`,
        pageToken
      );
      if (pageFollows.ok && pageFollows.data?.data?.length) {
        newFollowers += sumInsightValues(pageFollows.data.data, metric);
        mergeDailyRows(
          dailyMap,
          dailyFromInsightMetric(pageFollows.data.data, metric, 'new_followers')
        );
        break;
      }
    }

    const igId = page.instagram_business_account?.id;
    if (!igId) continue;

    const igProfile = await metaGet<{ followers_count?: number }>(
      `${igId}?fields=followers_count,username`,
      accessToken
    );
    if (igProfile.ok && igProfile.data?.followers_count != null) {
      igFollowersTotal = igProfile.data.followers_count;
    }

    const igReach = await metaGet<{ data?: InsightMetric[] }>(
      `${igId}/insights?metric=reach&period=day&since=${dateFrom}&until=${dateTo}`,
      accessToken
    );
    if (igReach.ok) {
      organicReach += sumInsightValues(igReach.data?.data, 'reach');
      mergeDailyRows(
        dailyMap,
        dailyFromInsightMetric(igReach.data?.data, 'reach', 'organic_reach')
      );
    }
  }

  if (organicReach === 0 && newFollowers === 0 && igFollowersTotal == null) {
    warnings.push(
      'Insights orgânicos/seguidores indisponíveis — use o total de seguidores após o próximo sync diário.'
    );
  }

  return {
    organic_reach: organicReach,
    new_followers: newFollowers,
    ig_followers_total: igFollowersTotal,
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    warnings,
  };
}
