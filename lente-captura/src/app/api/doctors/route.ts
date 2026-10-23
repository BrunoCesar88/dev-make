import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { UazapiAdminClient } from '@/lib/uazapi/admin-client';
import { suggestInstanceName } from '@/lib/utils';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';
import { buildDoctorTrackingRow } from '@/lib/tracking/doctor-tracking-row';

function extractSpreadsheetId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from('doctors')
      .select(`*, manager:managers(*), instance:instances(*)`)
      .eq('status', 'active')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json();

    const {
      name,
      instance_name,
      phone,
      manager_id,
      spreadsheet_url,
      lead_enabled = true,
      create_uazapi_instance = true,
      tracking,
    } = body as {
      name: string;
      instance_name?: string;
      phone?: string;
      manager_id?: string;
      spreadsheet_url?: string;
      lead_enabled?: boolean;
      create_uazapi_instance?: boolean;
      tracking?: {
        meta_enabled?: boolean;
        ga4_enabled?: boolean;
        encharge_enabled?: boolean;
        google_enabled?: boolean;
        meta_pixel_id?: string;
        meta_access_token?: string;
        meta_ads_access_token?: string;
        meta_ads_account_id?: string;
        meta_test_event_code?: string;
        ga4_measurement_id?: string;
        ga4_api_secret?: string;
        encharge_api_key?: string;
        google_ads_customer_id?: string;
        google_ads_conversion_action_id?: string;
        landing_base_url?: string;
        tracker_project_url?: string;
        conversion_on_status?: string;
      };
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const resolvedInstanceName =
      instance_name?.trim() || suggestInstanceName(name.trim());

    const supabase = await createServiceClient();
    const baseUrl = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com';

    const { data: existing } = await supabase
      .from('doctors')
      .select('id')
      .eq('instance_name', resolvedInstanceName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Já existe médico com instância "${resolvedInstanceName}"` },
        { status: 409 }
      );
    }

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .insert({
        name: name.trim(),
        instance_name: resolvedInstanceName,
        tenant_slug: instanceNameToTenantSlug(resolvedInstanceName),
        phone: phone?.trim() || null,
        manager_id: manager_id || null,
        spreadsheet_url: spreadsheet_url?.trim() || null,
        spreadsheet_id: extractSpreadsheetId(spreadsheet_url),
        lead_enabled,
        status: 'active',
        api_provider: 'uazapi',
      })
      .select()
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: doctorError?.message || 'Erro ao criar médico' },
        { status: 500 }
      );
    }

    let uazapiToken: string | null = null;
    let uazapiWarning: string | null = null;

    if (create_uazapi_instance && process.env.UAZAPI_ADMIN_TOKEN) {
      try {
        const admin = new UazapiAdminClient(
          baseUrl,
          process.env.UAZAPI_ADMIN_TOKEN
        );
        const created = await admin.createInstance(
          resolvedInstanceName,
          name.trim()
        );
        uazapiToken = created.token;
      } catch (err) {
        uazapiWarning =
          err instanceof Error
            ? err.message
            : 'Falha ao criar instância na Uazapi';
      }
    } else if (create_uazapi_instance) {
      uazapiWarning =
        'UAZAPI_ADMIN_TOKEN não configurado — crie a instância manualmente e cole o token depois.';
    }

    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .insert({
        doctor_id: doctor.id,
        uazapi_token: uazapiToken,
        uazapi_base_url: baseUrl,
        connection_status: 'disconnected',
        webhook_configured: false,
      })
      .select()
      .single();

    if (instanceError) {
      return NextResponse.json({ error: instanceError.message }, { status: 500 });
    }

    await logAudit({
      profile,
      action: 'user_create',
      entityType: 'doctor',
      doctorId: doctor.id,
      newValue: doctor.name,
      metadata: { instance_name: resolvedInstanceName },
    });

    const tenantSlug = instanceNameToTenantSlug(resolvedInstanceName);

    const trackingRow = buildDoctorTrackingRow(
      doctor.id,
      tenantSlug,
      tracking
        ? {
            ...tracking,
            google_enabled: false,
            google_ads_customer_id: null,
            google_ads_conversion_action_id: null,
          }
        : {}
    );

    await supabase.from('doctor_tracking').insert(trackingRow);

    return NextResponse.json({
      ok: true,
      doctor,
      instance,
      warning: uazapiWarning,
      redirect: `/medicos/${doctor.id}`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
