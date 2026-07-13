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
  manager_id: string | null;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  sheet_gid: string | null;
  bio_link: string | null;
  lead_enabled: boolean;
  status: DoctorStatus;
  api_provider: string;
  created_at: string;
  updated_at: string;
  manager?: Manager;
  instance?: Instance;
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
  synced_to_sheets: boolean;
  sheets_sync_error: string | null;
  raw_payload: Record<string, unknown> | null;
  received_at: string;
  created_at: string;
  doctor?: Doctor;
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
