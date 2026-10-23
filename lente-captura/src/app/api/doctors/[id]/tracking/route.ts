import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';
import { buildDoctorTrackingRow } from '@/lib/tracking/doctor-tracking-row';

function maskToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (token.length <= 8) return '••••••••';
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

function stripTrackingResponse(data: Record<string, unknown>) {
  return {
    ...data,
    meta_access_token: null,
    meta_ads_access_token: null,
    ga4_api_secret: null,
    encharge_api_key: null,
    google_ads_refresh_token: null,
    google_ads_developer_token: null,
    google_ads_client_secret: null,
    meta_access_token_masked: maskToken(data.meta_access_token as string | null),
    meta_ads_access_token_masked: maskToken(
      data.meta_ads_access_token as string | null
    ),
    ga4_api_secret_masked: maskToken(data.ga4_api_secret as string | null),
    encharge_api_key_masked: maskToken(data.encharge_api_key as string | null),
    google_ads_refresh_token_masked: maskToken(
      data.google_ads_refresh_token as string | null
    ),
    google_ads_developer_token_masked: maskToken(
      data.google_ads_developer_token as string | null
    ),
    google_ads_client_secret_masked: maskToken(
      data.google_ads_client_secret as string | null
    ),
    has_meta_token: Boolean(data.meta_access_token),
    has_meta_ads_token: Boolean(data.meta_ads_access_token),
    has_ga4_secret: Boolean(data.ga4_api_secret),
    has_encharge_key: Boolean(data.encharge_api_key),
    has_google_ads_refresh_token: Boolean(data.google_ads_refresh_token),
    has_google_ads_developer_token: Boolean(data.google_ads_developer_token),
    has_google_ads_client_secret: Boolean(data.google_ads_client_secret),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from('doctor_tracking')
      .select('*')
      .eq('doctor_id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('instance_name, tenant_slug')
        .eq('id', id)
        .maybeSingle();

      const tenantSlug = doctor
        ? doctor.tenant_slug || instanceNameToTenantSlug(doctor.instance_name)
        : '';

      if (tenantSlug) {
        const row = buildDoctorTrackingRow(id, tenantSlug);
        const { data: created, error: createError } = await supabase
          .from('doctor_tracking')
          .insert(row)
          .select()
          .single();

        if (!createError && created) {
          return NextResponse.json(stripTrackingResponse(created));
        }
      }

      return NextResponse.json({
        doctor_id: id,
        meta_pixel_id: null,
        meta_access_token: null,
        meta_access_token_masked: null,
        meta_ads_access_token: null,
        meta_ads_access_token_masked: null,
        meta_ads_account_id: null,
        meta_test_event_code: null,
        ga4_measurement_id: null,
        ga4_api_secret: null,
        ga4_api_secret_masked: null,
        encharge_api_key: null,
        encharge_api_key_masked: null,
        google_ads_customer_id: null,
        google_ads_conversion_action_id: null,
        google_ads_login_customer_id: null,
        google_ads_client_id: null,
        google_ads_refresh_token_masked: null,
        google_ads_developer_token_masked: null,
        google_ads_client_secret_masked: null,
        landing_base_url: null,
        tracker_project_url: null,
        conversion_on_status: 'agendado',
        meta_enabled: false,
        ga4_enabled: false,
        encharge_enabled: false,
        google_enabled: false,
      });
    }

    return NextResponse.json(stripTrackingResponse(data));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const {
      meta_pixel_id,
      meta_access_token,
      meta_ads_access_token,
      meta_ads_account_id,
      meta_test_event_code,
      ga4_measurement_id,
      ga4_api_secret,
      encharge_api_key,
      google_ads_customer_id,
      google_ads_conversion_action_id,
      google_ads_refresh_token,
      google_ads_developer_token,
      google_ads_login_customer_id,
      google_ads_client_id,
      google_ads_client_secret,
      landing_base_url,
      tracker_project_url,
      conversion_on_status,
      meta_enabled,
      ga4_enabled,
      encharge_enabled,
      google_enabled,
    } = body as {
      meta_pixel_id?: string | null;
      meta_access_token?: string | null;
      meta_ads_access_token?: string | null;
      meta_ads_account_id?: string | null;
      meta_test_event_code?: string | null;
      ga4_measurement_id?: string | null;
      ga4_api_secret?: string | null;
      encharge_api_key?: string | null;
      google_ads_customer_id?: string | null;
      google_ads_conversion_action_id?: string | null;
      google_ads_refresh_token?: string | null;
      google_ads_developer_token?: string | null;
      google_ads_login_customer_id?: string | null;
      google_ads_client_id?: string | null;
      google_ads_client_secret?: string | null;
      landing_base_url?: string | null;
      tracker_project_url?: string | null;
      conversion_on_status?: string;
      meta_enabled?: boolean;
      ga4_enabled?: boolean;
      encharge_enabled?: boolean;
      google_enabled?: boolean;
    };

    const supabase = await createServiceClient();

    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, name, instance_name, tenant_slug')
      .eq('id', id)
      .maybeSingle();

    if (!doctor) {
      return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from('doctor_tracking')
      .select('*')
      .eq('doctor_id', id)
      .maybeSingle();

    const tenantSlug =
      doctor.tenant_slug || instanceNameToTenantSlug(doctor.instance_name);

    const row = buildDoctorTrackingRow(
      id,
      tenantSlug,
      {
        meta_pixel_id,
        meta_access_token,
        meta_ads_access_token,
        meta_ads_account_id,
        meta_test_event_code,
        ga4_measurement_id,
        ga4_api_secret,
        encharge_api_key,
        google_ads_customer_id,
        google_ads_conversion_action_id,
        google_ads_refresh_token,
        google_ads_developer_token,
        google_ads_login_customer_id,
        google_ads_client_id,
        google_ads_client_secret,
        landing_base_url,
        tracker_project_url,
        conversion_on_status,
        meta_enabled,
        ga4_enabled,
        encharge_enabled,
        google_enabled,
      },
      existing
    );

    const { data, error } = await supabase
      .from('doctor_tracking')
      .upsert(row, { onConflict: 'doctor_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      profile,
      action: 'doctor_tracking_update',
      entityType: 'doctor',
      doctorId: id,
      metadata: {
        meta_enabled: row.meta_enabled,
        ga4_enabled: row.ga4_enabled,
        encharge_enabled: row.encharge_enabled,
        meta_pixel_id: row.meta_pixel_id,
        landing_base_url: row.landing_base_url,
      },
    });

    return NextResponse.json({
      ...stripTrackingResponse(data),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
