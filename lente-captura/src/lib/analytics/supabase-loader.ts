import type { AnalyticsPeriod } from '@/lib/analytics-period';
import type { UtmQueryState } from '@/lib/analytics-query';
import { periodToIso } from '@/lib/analytics/period-bounds';
import {
  isGoogleOrigem,
  isMetaOrigem,
  leadOrigemFromFields,
} from '@/lib/leads/origin';
import { META_ACCOUNT_CAMPAIGN_ID } from '@/lib/meta-ads/sync';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  TrackerAnalyticsBundle,
  TrackerAttribution,
  TrackerEvents,
  TrackerLeads,
  TrackerProducts,
  TrackerPurchases,
  TrackerRevenue,
  TrackerUtmBreakdown,
} from '@/lib/tracker/types';

function emptyBundle(
  period: AnalyticsPeriod,
  doctorId: string | null,
  doctorLabel: string | null,
  error: string | null
): TrackerAnalyticsBundle {
  const days =
    period.mode === 'preset'
      ? period.days
      : Math.max(
          1,
          Math.round(
            (new Date(period.to).getTime() - new Date(period.from).getTime()) /
              86400000
          ) + 1
        );

  return {
    configured: true,
    error,
    period,
    days,
    tenant: doctorId,
    tenantLabel: doctorLabel,
    revenue: null,
    attribution: null,
    leads: null,
    utm: null,
    products: null,
    purchases: null,
    events: null,
  };
}

function applyDoctorFilter<T extends { eq: (col: string, val: string) => T }>(
  q: T,
  doctorId: string | null
): T {
  if (doctorId) return q.eq('doctor_id', doctorId);
  return q;
}

function emptyAttribution(days: number): TrackerAttribution {
  return {
    days,
    groups: {
      meta: { sales: 0, revenue: 0 },
      google: { sales: 0, revenue: 0 },
      organic: { sales: 0, revenue: 0 },
    },
    meta_spend: 0,
    meta_impressions: 0,
    meta_clicks: 0,
    meta_reach: 0,
    meta_organic_reach: 0,
    meta_new_followers: 0,
    meta_ig_followers_total: null,
    meta_messaging_conversations: 0,
    meta_cost_per_message: null,
    meta_leads: 0,
    meta_leads_sucesso: 0,
    meta_cpm: null,
    meta_ctr: null,
    meta_cpc: null,
    meta_frequency: null,
    meta_cpa: null,
    meta_cpl: null,
    meta_cpa_sucesso: null,
    meta_roas: null,
    meta_funnel: [],
    meta_time_series: [],
    meta_campaigns: [],
    google_spend: 0,
    google_impressions: 0,
    google_clicks: 0,
    google_ctr: null,
    google_cpc: null,
    google_leads: 0,
    google_cpl: null,
    google_cpa_sucesso: null,
    google_cpa: null,
    google_roas: null,
    meta_last_synced_at: null,
    google_last_synced_at: null,
  };
}

export async function loadSupabaseAnalytics(
  period: AnalyticsPeriod,
  doctorId?: string | null,
  doctorLabel?: string | null,
  utm?: UtmQueryState
): Promise<TrackerAnalyticsBundle> {
  const { since, until, days } = periodToIso(period);
  const supabase = await createServiceClient();

  try {
    let purchasesQ = supabase
      .from('tracking_purchases')
      .select('*')
      .gte('purchased_at', since)
      .lte('purchased_at', until)
      .order('purchased_at', { ascending: false })
      .limit(50);

    purchasesQ = applyDoctorFilter(purchasesQ, doctorId ?? null);

    let crmLeadsQ = supabase
      .from('leads')
      .select(
        'id, patient_name, patient_phone, status, fields, received_at, created_at'
      )
      .gte('received_at', since)
      .lte('received_at', until)
      .order('received_at', { ascending: false })
      .limit(100);

    crmLeadsQ = applyDoctorFilter(crmLeadsQ, doctorId ?? null);

    let spendQ = supabase
      .from('tracking_ad_spend')
      .select('*')
      .gte('spend_date', since.slice(0, 10))
      .lte('spend_date', until.slice(0, 10));

    spendQ = applyDoctorFilter(spendQ, doctorId ?? null);

    let allPurchasesQ = supabase
      .from('tracking_purchases')
      .select('value, currency, fbc, gclid, gbraid, wbraid, purchased_at, product_id, product_name')
      .gte('purchased_at', since)
      .lte('purchased_at', until);

    allPurchasesQ = applyDoctorFilter(allPurchasesQ, doctorId ?? null);

    let trackingSnapQ = supabase
      .from('doctor_tracking')
      .select('ig_followers_count');

    if (doctorId) {
      trackingSnapQ = trackingSnapQ.eq('doctor_id', doctorId);
    }

    const [
      { data: purchaseRows, error: purchasesErr },
      { data: crmLeadRows, error: crmLeadsErr },
      { data: spendRows, error: spendErr },
      { data: allPurchases, error: allPurchasesErr },
      { data: trackingSnap, error: trackingSnapErr },
    ] = await Promise.all([
      purchasesQ,
      crmLeadsQ,
      spendQ,
      allPurchasesQ,
      doctorId ? trackingSnapQ.maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);

    const err =
      purchasesErr?.message ||
      crmLeadsErr?.message ||
      spendErr?.message ||
      allPurchasesErr?.message ||
      trackingSnapErr?.message;

    const tablesMissing =
      err?.includes('does not exist') ||
      err?.includes('schema cache');

    if (tablesMissing) {
      return {
        configured: true,
        error:
          'Tabelas de analytics ainda não criadas. Rode supabase/migrations/009_tracking_analytics.sql no Supabase.',
        period,
        days,
        tenant: doctorId ?? null,
        tenantLabel: doctorLabel ?? null,
        revenue: {
          gross: 0,
          sales: 0,
          aov: 0,
          currency: 'BRL',
          days,
          time_series: [],
        },
        attribution: emptyAttribution(days),
        leads: { leads: [], summary: [] },
        utm: { dimension: utm?.dimension ?? 'utm_source', rows: [] },
        products: { days, products: [], time_series: [] },
        purchases: { rows: [] },
        events: { recovery: {} },
      };
    }

    if (err) {
      return emptyBundle(period, doctorId ?? null, doctorLabel ?? null, err);
    }

    const purchases = purchaseRows || [];
    const crmLeads = crmLeadRows || [];
    const spend = spendRows || [];
    const purchasesAll = allPurchases || [];

    const gross = purchasesAll.reduce((s, p) => s + Number(p.value || 0), 0);
    const sales = purchasesAll.length;
    const currency = purchases[0]?.currency || 'BRL';

    const revenue: TrackerRevenue = {
      gross,
      sales,
      aov: sales > 0 ? gross / sales : 0,
      currency,
      days,
      time_series: buildPurchaseTimeSeries(purchasesAll, since, until),
    };

    const originGroups = { meta: 0, google: 0, organic: 0 };
    const successGroups = { meta: 0, google: 0, organic: 0 };
    const originSummary = new Map<string, number>();
    const metaLeadsByDate = new Map<string, number>();

    for (const lead of crmLeads) {
      const origem = leadOrigemFromFields(
        lead.fields as Record<string, unknown> | null
      );
      const label = origem || '(sem origem)';
      originSummary.set(label, (originSummary.get(label) || 0) + 1);

      const isSuccess = lead.status === 'sucesso';
      const leadDate = (lead.received_at || lead.created_at || '').slice(0, 10);

      if (isMetaOrigem(origem)) {
        originGroups.meta += 1;
        if (isSuccess) successGroups.meta += 1;
        if (leadDate) {
          metaLeadsByDate.set(
            leadDate,
            (metaLeadsByDate.get(leadDate) || 0) + 1
          );
        }
      } else if (isGoogleOrigem(origem)) {
        originGroups.google += 1;
        if (isSuccess) successGroups.google += 1;
      } else {
        originGroups.organic += 1;
        if (isSuccess) successGroups.organic += 1;
      }
    }

    const metaRows = spend.filter((r) => r.platform === 'meta');
    const accountRows = metaRows.filter(
      (r) => r.campaign_id === META_ACCOUNT_CAMPAIGN_ID
    );
    const campaignRows = metaRows.filter(
      (r) => r.campaign_id !== META_ACCOUNT_CAMPAIGN_ID
    );
    const metaSpendRows = accountRows.length ? accountRows : metaRows;

    const metaSpend =
      metaSpendRows.reduce((s, r) => s + Number(r.spend_cents || 0), 0) / 100;
    const metaImpressions = metaSpendRows.reduce(
      (s, r) => s + Number(r.impressions || 0),
      0
    );
    const metaClicks = metaSpendRows.reduce(
      (s, r) => s + Number(r.clicks || 0),
      0
    );
    const metaReach = metaSpendRows.reduce(
      (s, r) => s + Number((r as { reach?: number }).reach || 0),
      0
    );
    const metaMessaging = metaSpendRows.reduce(
      (s, r) =>
        s +
        Number(
          (r as { messaging_conversations_started?: number })
            .messaging_conversations_started || 0
        ),
      0
    );
    const metaCostPerMessage =
      metaMessaging > 0 ? metaSpend / metaMessaging : null;
    const metaCpm =
      metaImpressions > 0 ? (metaSpend / metaImpressions) * 1000 : null;
    const metaCtr =
      metaImpressions > 0 ? metaClicks / metaImpressions : null;
    const metaCpc = metaClicks > 0 ? metaSpend / metaClicks : null;
    const metaFrequency =
      metaReach > 0 ? metaImpressions / metaReach : null;
    const metaCpl =
      originGroups.meta > 0 ? metaSpend / originGroups.meta : null;
    const metaCpaSucesso =
      successGroups.meta > 0 ? metaSpend / successGroups.meta : null;
    const metaOrganicReach = metaSpendRows.reduce(
      (s, r) => s + Number((r as { organic_reach?: number }).organic_reach || 0),
      0
    );
    let metaNewFollowers = metaSpendRows.reduce(
      (s, r) => s + Number((r as { new_followers?: number }).new_followers || 0),
      0
    );
    const igTotalsFromRows = metaSpendRows
      .map((r) => Number((r as { ig_followers_total?: number }).ig_followers_total) || 0)
      .filter((n) => n > 0);
    const snapCount =
      trackingSnap && !Array.isArray(trackingSnap)
        ? (trackingSnap as { ig_followers_count?: number | null }).ig_followers_count
        : null;
    const metaIgFollowersTotal =
      igTotalsFromRows.length > 0
        ? Math.max(...igTotalsFromRows)
        : snapCount ?? null;
    if (metaNewFollowers === 0 && igTotalsFromRows.length >= 2) {
      metaNewFollowers = Math.max(
        0,
        Math.max(...igTotalsFromRows) - Math.min(...igTotalsFromRows)
      );
    }

    const metaFunnel = buildMetaFunnel({
      impressions: metaImpressions,
      clicks: metaClicks,
      messaging: metaMessaging,
      leads: originGroups.meta,
      sucesso: successGroups.meta,
    });

    const metaTimeSeries = buildMetaTimeSeries(
      metaSpendRows,
      metaLeadsByDate
    );

    const metaCampaigns = buildMetaCampaigns(campaignRows);

    const googleSpendRows = spend.filter((r) => r.platform === 'google');
    const googleSpend =
      googleSpendRows.reduce((s, r) => s + Number(r.spend_cents || 0), 0) / 100;
    const googleImpressions = googleSpendRows.reduce(
      (s, r) => s + Number(r.impressions || 0),
      0
    );
    const googleClicks = googleSpendRows.reduce(
      (s, r) => s + Number(r.clicks || 0),
      0
    );
    const googleCtr =
      googleImpressions > 0 ? googleClicks / googleImpressions : null;
    const googleCpc = googleClicks > 0 ? googleSpend / googleClicks : null;
    const googleCpl =
      originGroups.google > 0 ? googleSpend / originGroups.google : null;
    const googleCpaSucesso =
      successGroups.google > 0 ? googleSpend / successGroups.google : null;

    const purchaseGroups = {
      meta: { sales: 0, revenue: 0 },
      google: { sales: 0, revenue: 0 },
      organic: { sales: 0, revenue: 0 },
    };
    for (const p of purchasesAll) {
      const val = Number(p.value || 0);
      if (p.fbc) {
        purchaseGroups.meta.sales += 1;
        purchaseGroups.meta.revenue += val;
      } else if (p.gclid || p.gbraid || p.wbraid) {
        purchaseGroups.google.sales += 1;
        purchaseGroups.google.revenue += val;
      } else {
        purchaseGroups.organic.sales += 1;
        purchaseGroups.organic.revenue += val;
      }
    }

    const attribution: TrackerAttribution = {
      days,
      groups: {
        meta: { sales: originGroups.meta, revenue: purchaseGroups.meta.revenue },
        google: {
          sales: originGroups.google,
          revenue: purchaseGroups.google.revenue,
        },
        organic: {
          sales: originGroups.organic,
          revenue: purchaseGroups.organic.revenue,
        },
      },
      meta_spend: metaSpend,
      meta_impressions: metaImpressions,
      meta_clicks: metaClicks,
      meta_reach: metaReach,
      meta_organic_reach: metaOrganicReach,
      meta_new_followers: metaNewFollowers,
      meta_ig_followers_total: metaIgFollowersTotal,
      meta_messaging_conversations: metaMessaging,
      meta_cost_per_message: metaCostPerMessage,
      meta_leads: originGroups.meta,
      meta_leads_sucesso: successGroups.meta,
      meta_cpm: metaCpm,
      meta_ctr: metaCtr,
      meta_cpc: metaCpc,
      meta_frequency: metaFrequency,
      meta_cpa:
        purchaseGroups.meta.sales > 0
          ? metaSpend / purchaseGroups.meta.sales
          : null,
      meta_cpl: metaCpl,
      meta_cpa_sucesso: metaCpaSucesso,
      meta_roas:
        metaSpend > 0 ? purchaseGroups.meta.revenue / metaSpend : null,
      meta_funnel: metaFunnel,
      meta_time_series: metaTimeSeries,
      meta_campaigns: metaCampaigns,
      google_spend: googleSpend,
      google_impressions: googleImpressions,
      google_clicks: googleClicks,
      google_ctr: googleCtr,
      google_cpc: googleCpc,
      google_leads: originGroups.google,
      google_cpl: googleCpl,
      google_cpa_sucesso: googleCpaSucesso,
      google_cpa:
        purchaseGroups.google.sales > 0
          ? googleSpend / purchaseGroups.google.sales
          : null,
      google_roas:
        googleSpend > 0 ? purchaseGroups.google.revenue / googleSpend : null,
      meta_last_synced_at: latestSync(spend, 'meta'),
      google_last_synced_at: latestSync(spend, 'google'),
    };

    const leadsBundle: TrackerLeads = {
      leads: crmLeads.map((l) => {
        const origem = leadOrigemFromFields(
          l.fields as Record<string, unknown> | null
        );
        const ts = l.received_at || l.created_at;
        return {
          event_id: l.id,
          timestamp: Math.floor(new Date(ts).getTime() / 1000),
          raw_email: null,
          patient_name: l.patient_name,
          patient_phone: l.patient_phone,
          origem: origem || null,
          status: l.status,
          utm_source: origem || null,
          utm_campaign: null,
          utm_medium: null,
          meta_response_ok: 0,
          ga4_response_ok: 0,
        };
      }),
      summary: [...originSummary.entries()].map(([utm_source, count]) => ({
        utm_source,
        count,
      })),
    };

    const dimension = utm?.dimension ?? 'utm_source';
    const utmBreakdown = buildUtmBreakdown(purchasesAll, dimension, utm?.filters);

    const products: TrackerProducts = {
      days,
      products: buildProductBreakdown(purchasesAll),
      time_series: [],
    };

    const purchasesBundle: TrackerPurchases = {
      rows: purchases.map((p) => ({
        created_at: Math.floor(new Date(p.purchased_at).getTime() / 1000),
        raw_email: p.raw_email,
        product_name: p.product_name,
        product_id: p.product_id,
        value: Number(p.value || 0),
        currency: p.currency || 'BRL',
        meta_response_ok: p.meta_response_ok ? 1 : 0,
        ga4_response_ok: p.ga4_response_ok ? 1 : 0,
        google_ads_response_ok: p.google_ads_response_ok ? 1 : 0,
        google_ads_response_body: p.google_ads_response_body,
      })),
    };

    const events: TrackerEvents = { recovery: {} };

    return {
      configured: true,
      error: null,
      period,
      days,
      tenant: doctorId ?? null,
      tenantLabel: doctorLabel ?? null,
      revenue,
      attribution,
      leads: leadsBundle,
      utm: utmBreakdown,
      products,
      purchases: purchasesBundle,
      events,
    };
  } catch (err) {
    return emptyBundle(
      period,
      doctorId ?? null,
      doctorLabel ?? null,
      err instanceof Error ? err.message : 'Erro ao carregar analytics'
    );
  }
}

function buildMetaFunnel(opts: {
  impressions: number;
  clicks: number;
  messaging: number;
  leads: number;
  sucesso: number;
}) {
  const stages = [
    { key: 'impressions', label: 'Impressões', value: opts.impressions },
    { key: 'clicks', label: 'Cliques', value: opts.clicks },
    { key: 'messaging', label: 'Conversas', value: opts.messaging },
    { key: 'leads', label: 'Leads WhatsApp', value: opts.leads },
    { key: 'sucesso', label: 'SUCESSO', value: opts.sucesso },
  ];

  return stages.map((stage, index) => {
    const prev = index > 0 ? stages[index - 1]!.value : null;
    return {
      ...stage,
      rate_from_previous:
        prev != null && prev > 0 ? stage.value / prev : null,
    };
  });
}

function buildMetaTimeSeries(
  spendRows: Array<{
    spend_date: string;
    spend_cents?: number;
    messaging_conversations_started?: number;
  }>,
  leadsByDate: Map<string, number>
) {
  const map = new Map<
    string,
    { spend: number; leads: number; messaging: number }
  >();

  for (const row of spendRows) {
    const date = row.spend_date;
    const cur = map.get(date) || { spend: 0, leads: 0, messaging: 0 };
    cur.spend += Number(row.spend_cents || 0) / 100;
    cur.messaging += Number(row.messaging_conversations_started || 0);
    map.set(date, cur);
  }

  for (const [date, leads] of leadsByDate) {
    const cur = map.get(date) || { spend: 0, leads: 0, messaging: 0 };
    cur.leads += leads;
    map.set(date, cur);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      spend: v.spend,
      leads: v.leads,
      messaging: v.messaging,
    }));
}

function buildMetaCampaigns(
  rows: Array<{
    campaign_id: string;
    campaign_name: string | null;
    spend_cents?: number;
    impressions?: number;
    clicks?: number;
    messaging_conversations_started?: number;
  }>
) {
  const map = new Map<
    string,
    {
      campaign_name: string;
      spend: number;
      impressions: number;
      clicks: number;
      messaging: number;
    }
  >();

  for (const row of rows) {
    const id = row.campaign_id;
    const cur = map.get(id) || {
      campaign_name: row.campaign_name || id,
      spend: 0,
      impressions: 0,
      clicks: 0,
      messaging: 0,
    };
    cur.campaign_name = row.campaign_name || cur.campaign_name;
    cur.spend += Number(row.spend_cents || 0) / 100;
    cur.impressions += Number(row.impressions || 0);
    cur.clicks += Number(row.clicks || 0);
    cur.messaging += Number(row.messaging_conversations_started || 0);
    map.set(id, cur);
  }

  return [...map.entries()]
    .map(([campaign_id, v]) => ({
      campaign_id,
      campaign_name: v.campaign_name,
      spend: v.spend,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions > 0 ? v.clicks / v.impressions : null,
      messaging: v.messaging,
      cpl: v.messaging > 0 ? v.spend / v.messaging : null,
    }))
    .sort((a, b) => b.spend - a.spend);
}

function latestSync(
  rows: Array<{ platform: string; synced_at: string }>,
  platform: string
): number | null {
  const filtered = rows.filter((r) => r.platform === platform);
  if (!filtered.length) return null;
  const max = filtered.reduce((a, b) =>
    new Date(a.synced_at) > new Date(b.synced_at) ? a : b
  );
  return Math.floor(new Date(max.synced_at).getTime() / 1000);
}

function buildPurchaseTimeSeries(
  rows: Array<{ purchased_at: string; value: number | string }>,
  since: string,
  until: string
) {
  const map = new Map<string, { revenue: number; sales: number }>();
  for (const p of rows) {
    const date = p.purchased_at.slice(0, 10);
    const cur = map.get(date) || { revenue: 0, sales: 0 };
    cur.revenue += Number(p.value || 0);
    cur.sales += 1;
    map.set(date, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: v.revenue, sales: v.sales }));
}

function buildUtmBreakdown(
  purchases: Array<Record<string, unknown>>,
  dimension: string,
  filters?: Record<string, string>
): TrackerUtmBreakdown {
  const dimKey = dimension as keyof (typeof purchases)[0];
  const filtered = purchases.filter((p) => {
    if (!filters) return true;
    return Object.entries(filters).every(([k, v]) => {
      if (!v) return true;
      return String(p[k] || '') === v;
    });
  });

  const map = new Map<string, { sales: number; revenue: number }>();
  for (const p of filtered) {
    const val = String(p[dimKey] || '(none)');
    const cur = map.get(val) || { sales: 0, revenue: 0 };
    cur.sales += 1;
    cur.revenue += Number(p.value || 0);
    map.set(val, cur);
  }

  return {
    dimension,
    rows: [...map.entries()].map(([value, v]) => ({
      value,
      sales: v.sales,
      revenue: v.revenue,
      aov: v.sales > 0 ? v.revenue / v.sales : 0,
    })),
  };
}

function buildProductBreakdown(
  purchases: Array<{
    product_id: string | null;
    product_name: string | null;
    value: number | string;
  }>
) {
  const map = new Map<
    string,
    { product_name: string; revenue: number; sales: number }
  >();
  for (const p of purchases) {
    const id = p.product_id || p.product_name || 'unknown';
    const cur = map.get(id) || {
      product_name: p.product_name || id,
      revenue: 0,
      sales: 0,
    };
    cur.sales += 1;
    cur.revenue += Number(p.value || 0);
    map.set(id, cur);
  }
  return [...map.entries()].map(([product_id, v]) => ({
    product_id,
    product_name: v.product_name,
    revenue: v.revenue,
    sales: v.sales,
    aov: v.sales > 0 ? v.revenue / v.sales : 0,
  }));
}
