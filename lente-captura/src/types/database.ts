export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'hibernated';
export type DoctorStatus = 'active' | 'inactive' | 'pending';

export interface Manager {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
}

export interface Doctor {
  id: string;
  instance_name: string;
  name: string;
  phone: string | null;
  tenant_slug: string | null;
  manager_id: string | null;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  sheet_gid: string | null;
  bio_link: string | null;
  bio_phrase: string | null;
  site_phrase: string | null;
  manychat_phrase: string | null;
  social_selling_phrase: string | null;
  lead_enabled: boolean;
  status: DoctorStatus;
  api_provider: string;
  created_at: string;
  updated_at: string;
  manager?: Manager;
  instance?: Instance;
  tracking?: DoctorTracking;
}

export interface DoctorTracking {
  doctor_id: string;
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  meta_ads_access_token: string | null;
  meta_ads_account_id: string | null;
  meta_test_event_code: string | null;
  ga4_measurement_id: string | null;
  ga4_api_secret: string | null;
  encharge_api_key: string | null;
  google_ads_customer_id: string | null;
  google_ads_conversion_action_id: string | null;
  google_ads_refresh_token: string | null;
  google_ads_developer_token: string | null;
  google_ads_login_customer_id: string | null;
  google_ads_client_id: string | null;
  google_ads_client_secret: string | null;
  landing_base_url: string | null;
  tracker_project_url: string | null;
  conversion_on_status: string;
  meta_enabled: boolean;
  ga4_enabled: boolean;
  encharge_enabled: boolean;
  google_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversionEvent {
  id: string;
  doctor_id: string;
  lead_id: string | null;
  platform: 'meta' | 'google';
  event_name: string;
  event_id: string | null;
  trigger_status: string | null;
  success: boolean;
  skipped_reason: string | null;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
}

export interface Instance {
  id: string;
  doctor_id: string;
  uazapi_token: string | null;
  uazapi_base_url: string;
  connection_status: ConnectionStatus;
  last_status_check: string | null;
  webhook_configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  doctor_id: string;
  patient_name: string | null;
  patient_phone: string;
  message: string | null;
  message_id: string | null;
  chat_id: string | null;
  source: string;
  status: string | null;
  fields: Record<string, unknown> | null;
  synced_to_sheets: boolean;
  sheets_sync_error: string | null;
  raw_payload: Record<string, unknown> | null;
  received_at: string;
  created_at: string;
  updated_at: string | null;
  doctor?: Doctor;
}

export interface ColumnDefinition {
  id: string;
  key: string;
  label: string;
  column_type: string;
  display_order: number;
  is_required: boolean;
  is_system: boolean;
  status_options: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'doctor' | 'secretary';
  doctor_id: string | null;
  is_active: boolean;
}

export interface AuditLog {
  id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  field_key: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface UazapiStatusResponse {
  instance?: {
    state?: string;
    status?: string;
  };
  status?: string;
  state?: string;
  qrcode?: string;
  base64?: string;
  pairingCode?: string;
  message?: string;
}

export interface UazapiWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      id?: string;
      fromMe?: boolean;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
    };
    messageTimestamp?: number;
  };
  message?: {
    chatid?: string;
    sender?: string;
    senderName?: string;
    text?: string;
    messageid?: string;
    fromMe?: boolean;
  };
}

export interface SeedDoctor {
  instance_name: string;
  name: string;
  phone: string | null;
  spreadsheet_url: string | null;
  spreadsheet_id: string | null;
  sheet_gid: string;
  manager: string | null;
  status: string;
  api: string;
  lead_enabled: boolean;
  bio_link: string | null;
}
