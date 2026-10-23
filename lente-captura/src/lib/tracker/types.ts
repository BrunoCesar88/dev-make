import type { AnalyticsPeriod } from '@/lib/analytics-period';

export interface TrackerRevenue {
  gross: number;
  sales: number;
  aov: number;
  currency: string;
  days: number;
  time_series: Array<{ date: string; revenue: number; sales: number }>;
}

export interface MetaFunnelStage {
  key: string;
  label: string;
  value: number;
  rate_from_previous: number | null;
}

export interface MetaCampaignRow {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  messaging: number;
  cpl: number | null;
}

export interface MetaTimeSeriesPoint {
  date: string;
  spend: number;
  leads: number;
  messaging: number;
}

export interface TrackerAttribution {
  days: number;
  groups: {
    meta: { sales: number; revenue: number };
    google: { sales: number; revenue: number };
    organic: { sales: number; revenue: number };
  };
  meta_spend: number;
  meta_impressions: number;
  meta_clicks: number;
  meta_reach: number;
  meta_organic_reach: number;
  meta_new_followers: number;
  meta_ig_followers_total: number | null;
  meta_messaging_conversations: number;
  meta_cost_per_message: number | null;
  meta_leads: number;
  meta_leads_sucesso: number;
  meta_cpm: number | null;
  meta_ctr: number | null;
  meta_cpc: number | null;
  meta_frequency: number | null;
  meta_cpa: number | null;
  meta_cpl: number | null;
  meta_cpa_sucesso: number | null;
  meta_roas: number | null;
  meta_funnel: MetaFunnelStage[];
  meta_time_series: MetaTimeSeriesPoint[];
  meta_campaigns: MetaCampaignRow[];
  google_spend: number;
  google_impressions: number;
  google_clicks: number;
  google_ctr: number | null;
  google_cpc: number | null;
  google_leads: number;
  google_cpl: number | null;
  google_cpa_sucesso: number | null;
  google_cpa: number | null;
  google_roas: number | null;
  meta_last_synced_at: number | null;
  google_last_synced_at: number | null;
}

export interface TrackerLeadRow {
  event_id: string;
  timestamp: number;
  raw_email: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  origem: string | null;
  status: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  meta_response_ok: number;
  ga4_response_ok: number;
}

export interface TrackerLeads {
  leads: TrackerLeadRow[];
  summary: Array<{ utm_source: string; count: number }>;
}

export interface TrackerUtmRow {
  value: string;
  sales: number;
  revenue: number;
  aov: number;
}

export interface TrackerUtmBreakdown {
  dimension: string;
  rows: TrackerUtmRow[];
}

export interface TrackerProduct {
  product_id: string;
  product_name: string;
  revenue: number;
  sales: number;
  aov: number;
  currency?: string;
}

export interface TrackerProducts {
  days: number;
  products: TrackerProduct[];
  time_series: Array<{
    date: string;
    product_id: string;
    product_name: string;
    sales: number;
    revenue: number;
  }>;
}

export interface TrackerPurchaseRow {
  created_at: number;
  raw_email: string | null;
  product_name: string | null;
  product_id: string | null;
  value: number;
  currency: string;
  meta_response_ok: number;
  ga4_response_ok: number;
  google_ads_response_ok: number;
  google_ads_response_body: string | null;
}

export interface TrackerPurchases {
  rows: TrackerPurchaseRow[];
}

export interface TrackerRecovery {
  total_events?: number;
  real_events?: number;
  adblock_recovered?: number;
  itp_recovered?: number;
  fbp_from_pixel?: number;
  fbp_from_middleware?: number;
  fbp_from_session?: number;
  fbp_none?: number;
}

export interface TrackerEvents {
  recovery: TrackerRecovery;
}

export interface TrackerAnalyticsBundle {
  configured: boolean;
  error: string | null;
  period: AnalyticsPeriod;
  days: number;
  tenant: string | null;
  tenantLabel: string | null;
  revenue: TrackerRevenue | null;
  attribution: TrackerAttribution | null;
  leads: TrackerLeads | null;
  utm: TrackerUtmBreakdown | null;
  products: TrackerProducts | null;
  purchases: TrackerPurchases | null;
  events: TrackerEvents | null;
}
