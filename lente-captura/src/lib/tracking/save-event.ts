import type { SupabaseClient } from '@supabase/supabase-js';
import { sendMetaCapiEvent } from '@/lib/tracking/meta-capi';

export interface SaveLeadInput {
  tenantSlug: string;
  doctorId: string;
  eventId: string;
  eventSourceUrl: string;
  name: string;
  email: string;
  phone: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  fbc?: string | null;
  gclid?: string | null;
  referrer?: string | null;
  clientIp?: string;
  clientUserAgent?: string;
  metaPixelId?: string | null;
  metaAccessToken?: string | null;
  metaTestEventCode?: string | null;
}

export async function saveLeadAndFireMeta(
  supabase: SupabaseClient,
  input: SaveLeadInput
) {
  let metaResponseOk: boolean | null = null;
  let metaStatusCode: number | null = null;

  if (input.metaPixelId && input.metaAccessToken) {
    const sent = await sendMetaCapiEvent(
      {
        pixelId: input.metaPixelId,
        accessToken: input.metaAccessToken,
        testEventCode: input.metaTestEventCode,
      },
      {
        eventName: 'Lead',
        eventId: input.eventId,
        eventSourceUrl: input.eventSourceUrl,
        email: input.email,
        phone: input.phone,
        name: input.name,
      }
    );

    if (sent.response) {
      metaStatusCode = sent.response.status;
      metaResponseOk = sent.response.ok;
    }
  }

  const { error } = await supabase.from('tracking_events').upsert(
    {
      event_id: input.eventId,
      doctor_id: input.doctorId,
      tenant_slug: input.tenantSlug,
      event_name: 'Lead',
      event_source_url: input.eventSourceUrl,
      raw_email: input.email,
      is_bot: false,
      meta_response_ok: metaResponseOk,
      meta_status_code: metaStatusCode,
      utm_source: input.utmSource || null,
      utm_medium: input.utmMedium || null,
      utm_campaign: input.utmCampaign || null,
      utm_content: input.utmContent || null,
      utm_term: input.utmTerm || null,
      fbc: input.fbc || null,
      gclid: input.gclid || null,
      referrer: input.referrer || null,
      event_time: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  );

  if (error) throw new Error(error.message);

  return { metaResponseOk, metaStatusCode };
}

export async function savePageView(
  supabase: SupabaseClient,
  input: {
    tenantSlug: string;
    doctorId: string;
    eventId: string;
    eventSourceUrl: string;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    fbc?: string | null;
    gclid?: string | null;
    referrer?: string | null;
  }
) {
  const { error } = await supabase.from('tracking_events').upsert(
    {
      event_id: input.eventId,
      doctor_id: input.doctorId,
      tenant_slug: input.tenantSlug,
      event_name: 'PageView',
      event_source_url: input.eventSourceUrl,
      is_bot: false,
      utm_source: input.utmSource || null,
      utm_medium: input.utmMedium || null,
      utm_campaign: input.utmCampaign || null,
      fbc: input.fbc || null,
      gclid: input.gclid || null,
      referrer: input.referrer || null,
      event_time: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  );

  if (error) throw new Error(error.message);
}
