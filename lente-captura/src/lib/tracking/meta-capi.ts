const GRAPH_VERSION = 'v25.0';

export async function sha256(value: string): Promise<string> {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const encoded = new TextEncoder().encode(normalized);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function normalizeName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

export function normalizePhone(ph: string, countryCode = '55'): string {
  if (!ph) return '';
  const cc = String(countryCode);
  const digits = ph.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  if (
    digits.startsWith(cc) &&
    digits.length >= cc.length + 8 &&
    digits.length <= cc.length + 11
  ) {
    return digits;
  }
  if (digits.length >= 8 && digits.length <= 11) {
    return cc + digits;
  }
  return digits;
}

export interface MetaCapiConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string | null;
}

export interface MetaCapiLeadInput {
  eventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  countryCode?: string;
}

export async function sendMetaCapiEvent(
  config: MetaCapiConfig,
  input: MetaCapiLeadInput
) {
  if (!config.pixelId || !config.accessToken) {
    return {
      skipped: 'missing meta credentials',
      payload: null as string | null,
      response: null as Response | null,
    };
  }

  const nameParts = (input.name || '').trim().split(/\s+/).filter(Boolean);
  const fn = nameParts[0] || '';
  const ln = nameParts.slice(1).join(' ') || '';

  const hashedEm = input.email ? await sha256(input.email) : '';
  const hashedFn = fn ? await sha256(normalizeName(fn)) : '';
  const hashedLn = ln ? await sha256(normalizeName(ln)) : '';
  const hashedPh = input.phone
    ? await sha256(normalizePhone(input.phone, input.countryCode || '55'))
    : '';

  const userData: Record<string, unknown> = {
    client_ip_address: '',
    client_user_agent: '',
  };
  if (hashedEm) userData.em = [hashedEm];
  if (hashedFn) userData.fn = [hashedFn];
  if (hashedLn) userData.ln = [hashedLn];
  if (hashedPh) userData.ph = [hashedPh];

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl || '',
        action_source: 'website',
        user_data: userData,
      },
    ],
  };

  if (config.testEventCode) {
    payload.test_event_code = config.testEventCode;
  }

  const payloadJson = JSON.stringify(payload);
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${config.pixelId}/events?access_token=${config.accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadJson,
    }
  );

  return { payload: payloadJson, response, skipped: null as string | null };
}
