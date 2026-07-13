import type { UazapiStatusResponse } from '@/types/database';

export class UazapiClient {
  constructor(
    private baseUrl: string,
    private token: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        token: this.token,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        (data as { message?: string }).message ||
          `Uazapi error: ${response.status}`
      );
    }

    return data as T;
  }

  async getStatus(): Promise<UazapiStatusResponse> {
    return this.request<UazapiStatusResponse>('/instance/status');
  }

  async connect(phone?: string): Promise<UazapiStatusResponse> {
    return this.request<UazapiStatusResponse>('/instance/connect', {
      method: 'POST',
      body: JSON.stringify(phone ? { phone } : {}),
    });
  }

  async disconnect(): Promise<void> {
    await this.request('/instance/disconnect', { method: 'POST' });
  }

  async setWebhook(webhookUrl: string): Promise<void> {
    await this.request('/webhook/set', {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        events: ['messages'],
        excludeMessages: ['wasSentByApi', 'isGroupYes'],
      }),
    });
  }
}

export function normalizeConnectionStatus(
  response: UazapiStatusResponse
): 'disconnected' | 'connecting' | 'connected' | 'hibernated' {
  const raw =
    response.instance?.state ||
    response.instance?.status ||
    response.state ||
    response.status ||
    'disconnected';

  const status = raw.toLowerCase();

  if (status.includes('connect') && !status.includes('dis')) {
    return status === 'connected' ? 'connected' : 'connecting';
  }
  if (status.includes('hibernat')) return 'hibernated';
  if (status.includes('connected')) return 'connected';
  return 'disconnected';
}

export function extractQrCode(response: UazapiStatusResponse): string | null {
  return response.qrcode || response.base64 || null;
}
