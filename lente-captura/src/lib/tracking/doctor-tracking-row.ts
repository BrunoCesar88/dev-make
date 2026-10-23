import { autoLandingUrl } from '@/lib/tracker/provision';

export interface DoctorTrackingInput {
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
}

type ExistingTracking = DoctorTrackingInput & { doctor_id?: string };

function resolveSecret(
  incoming: string | null | undefined,
  current: string | null | undefined
) {
  return incoming === undefined ? current ?? null : incoming?.trim() || null;
}

function inferEnabledFlags(
  row: {
    meta_pixel_id: string | null;
    meta_access_token: string | null;
    ga4_measurement_id: string | null;
    ga4_api_secret: string | null;
    encharge_api_key: string | null;
    google_ads_customer_id: string | null;
    google_ads_refresh_token: string | null;
    google_ads_developer_token: string | null;
  },
  input: DoctorTrackingInput,
  existing?: ExistingTracking | null
) {
  const metaEnabled =
    input.meta_enabled !== undefined
      ? Boolean(input.meta_enabled)
      : Boolean(existing?.meta_enabled) ||
        Boolean(row.meta_pixel_id && row.meta_access_token);

  const ga4Enabled =
    input.ga4_enabled !== undefined
      ? Boolean(input.ga4_enabled)
      : Boolean(existing?.ga4_enabled) ||
        Boolean(row.ga4_measurement_id && row.ga4_api_secret);

  const enchargeEnabled =
    input.encharge_enabled !== undefined
      ? Boolean(input.encharge_enabled)
      : Boolean(existing?.encharge_enabled) || Boolean(row.encharge_api_key);

  const googleEnabled =
    input.google_enabled !== undefined
      ? Boolean(input.google_enabled)
      : Boolean(existing?.google_enabled) ||
        Boolean(
          row.google_ads_customer_id &&
            row.google_ads_refresh_token &&
            row.google_ads_developer_token
        );

  return { metaEnabled, ga4Enabled, enchargeEnabled, googleEnabled };
}

export function buildDoctorTrackingRow(
  doctorId: string,
  tenantSlug: string,
  input: DoctorTrackingInput = {},
  existing?: ExistingTracking | null
) {
  const row = {
    doctor_id: doctorId,
    meta_pixel_id: input.meta_pixel_id?.trim() || null,
    meta_access_token: resolveSecret(
      input.meta_access_token,
      existing?.meta_access_token
    ),
    meta_ads_access_token: resolveSecret(
      input.meta_ads_access_token,
      existing?.meta_ads_access_token
    ),
    meta_ads_account_id:
      input.meta_ads_account_id?.trim().replace(/^act_/, '') || null,
    meta_test_event_code: input.meta_test_event_code?.trim() || null,
    ga4_measurement_id: input.ga4_measurement_id?.trim() || null,
    ga4_api_secret: resolveSecret(input.ga4_api_secret, existing?.ga4_api_secret),
    encharge_api_key: resolveSecret(
      input.encharge_api_key,
      existing?.encharge_api_key
    ),
    google_ads_customer_id: input.google_ads_customer_id?.trim().replace(/-/g, '') || null,
    google_ads_conversion_action_id:
      input.google_ads_conversion_action_id?.trim() || null,
    google_ads_refresh_token: resolveSecret(
      input.google_ads_refresh_token,
      existing?.google_ads_refresh_token
    ),
    google_ads_developer_token: resolveSecret(
      input.google_ads_developer_token,
      existing?.google_ads_developer_token
    ),
    google_ads_login_customer_id:
      input.google_ads_login_customer_id?.trim().replace(/-/g, '') || null,
    google_ads_client_id: input.google_ads_client_id?.trim() || null,
    google_ads_client_secret: resolveSecret(
      input.google_ads_client_secret,
      existing?.google_ads_client_secret
    ),
    landing_base_url:
      input.landing_base_url?.trim() || autoLandingUrl(tenantSlug),
    tracker_project_url: null,
    conversion_on_status: input.conversion_on_status?.trim() || 'agendado',
  };

  const flags = inferEnabledFlags(row, input, existing);

  return {
    ...row,
    meta_enabled: flags.metaEnabled,
    ga4_enabled: flags.ga4Enabled,
    encharge_enabled: flags.enchargeEnabled,
    google_enabled: flags.googleEnabled,
  };
}
