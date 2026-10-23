import { isGoogleOrigem, isMetaOrigem, leadOrigemFromFields } from '@/lib/leads/origin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DoctorTracking, Lead } from '@/types/database';
import { sendMetaCapiEvent } from '@/lib/tracking/meta-capi';

async function logConversion(
  supabase: SupabaseClient,
  row: {
    doctor_id: string;
    lead_id: string;
    platform: 'meta' | 'google';
    event_name: string;
    event_id: string;
    trigger_status: string;
    success: boolean;
    skipped_reason?: string;
    response_status?: number;
    response_body?: string;
  }
) {
  await supabase.from('conversion_events').insert(row);
}

export async function fireConversionOnStatusChange(
  supabase: SupabaseClient,
  lead: Lead,
  newStatus: string,
  tracking: DoctorTracking | null
) {
  if (!tracking) {
    return { fired: false, reason: 'no_tracking_config' };
  }

  const trigger = tracking.conversion_on_status || 'sucesso';
  const triggerStatuses =
    trigger === 'agendado' || trigger === 'sucesso'
      ? ['agendado', 'sucesso']
      : [trigger];
  if (!triggerStatuses.includes(newStatus)) {
    return { fired: false, reason: 'status_not_trigger' };
  }

  const origem = leadOrigemFromFields(lead.fields as Record<string, unknown> | null);
  const eventId = crypto.randomUUID();
  const eventSourceUrl =
    tracking.landing_base_url ||
    tracking.tracker_project_url ||
    process.env.NEXT_PUBLIC_APP_URL ||
    '';

  const results: Array<{ platform: string; ok: boolean; detail: string }> = [];

  if (tracking.meta_enabled && tracking.meta_pixel_id && tracking.meta_access_token) {
    if (origem && !isMetaOrigem(origem)) {
      await logConversion(supabase, {
        doctor_id: lead.doctor_id,
        lead_id: lead.id,
        platform: 'meta',
        event_name: 'Schedule',
        event_id: eventId,
        trigger_status: newStatus,
        success: false,
        skipped_reason: `origem_not_meta:${origem}`,
      });
      results.push({ platform: 'meta', ok: false, detail: 'skipped_wrong_origin' });
    } else {
      const sent = await sendMetaCapiEvent(
        {
          pixelId: tracking.meta_pixel_id,
          accessToken: tracking.meta_access_token,
          testEventCode: tracking.meta_test_event_code,
        },
        {
          eventName: 'Schedule',
          eventId,
          eventSourceUrl,
          email: null,
          phone: lead.patient_phone,
          name: lead.patient_name,
        }
      );

      if (sent.skipped) {
        await logConversion(supabase, {
          doctor_id: lead.doctor_id,
          lead_id: lead.id,
          platform: 'meta',
          event_name: 'Schedule',
          event_id: eventId,
          trigger_status: newStatus,
          success: false,
          skipped_reason: sent.skipped,
        });
        results.push({ platform: 'meta', ok: false, detail: sent.skipped });
      } else {
        const body = await sent.response!.text();
        const ok = sent.response!.ok;
        await logConversion(supabase, {
          doctor_id: lead.doctor_id,
          lead_id: lead.id,
          platform: 'meta',
          event_name: 'Schedule',
          event_id: eventId,
          trigger_status: newStatus,
          success: ok,
          response_status: sent.response!.status,
          response_body: body.slice(0, 4096),
        });
        results.push({ platform: 'meta', ok, detail: ok ? 'sent' : body });
      }
    }
  }

  if (tracking.google_enabled) {
    await logConversion(supabase, {
      doctor_id: lead.doctor_id,
      lead_id: lead.id,
      platform: 'google',
      event_name: 'Schedule',
      event_id: eventId,
      trigger_status: newStatus,
      success: false,
      skipped_reason: isGoogleOrigem(origem)
        ? 'google_offline_upload_not_implemented_yet'
        : `origem_not_google:${origem || 'empty'}`,
    });
    results.push({
      platform: 'google',
      ok: false,
      detail: 'google_pending_implementation',
    });
  }

  return { fired: results.some((r) => r.ok), results };
}
