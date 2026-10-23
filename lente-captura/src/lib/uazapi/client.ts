import type { UazapiStatusResponse } from '@/types/database';
import {
  mergeEventCatalog,
  mergeExcludeCatalog,
  UAZAPI_EXCLUDE_OPTIONS,
  UAZAPI_WEBHOOK_EVENTS,
} from '@/lib/uazapi/webhook-events';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'hibernated';

export type ConnectMode = 'qr' | 'pairing';

export interface WebhookConfig {
  id?: string;
  url: string;
  enabled?: boolean;
  events?: string[];
  excludeMessages?: string[];
  addUrlEvents?: boolean;
  addUrlTypesMessages?: boolean;
}

export interface UpsertWebhookOptions {
  instanceName?: string;
  preferredId?: string;
}

export interface ConnectOptions {
  phone?: string;
  mode?: ConnectMode;
}

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
          (data as { error?: string }).error ||
          `Uazapi error: ${response.status}`
      );
    }

    return data as T;
  }

  async getStatus(): Promise<UazapiStatusResponse> {
    return this.request<UazapiStatusResponse>('/instance/status');
  }

  async connect(options: ConnectOptions = {}): Promise<UazapiStatusResponse> {
    const phone = options.phone?.replace(/\D/g, '');
    const mode = options.mode ?? (phone ? 'pairing' : 'qr');

    const bodies: Record<string, unknown>[] = [];

    if (mode === 'pairing' && phone) {
      bodies.push(
        { phone },
        { phoneNumber: phone },
        { number: phone },
        { phone, pairing: true },
        { phone, method: 'code' }
      );
    } else {
      bodies.push({}, { generate: 'qrcode' }, { qrcode: true });
    }

    let lastError = '';

    for (const body of bodies) {
      try {
        const data = await this.request<UazapiStatusResponse>(
          '/instance/connect',
          { method: 'POST', body: JSON.stringify(body) }
        );
        if (extractQrCode(data) || extractPairingCode(data) || data.message) {
          return data;
        }
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    throw new Error(lastError || 'Falha ao iniciar conexão na Uazapi');
  }

  async disconnect(): Promise<void> {
    await this.request('/instance/disconnect', { method: 'POST' });
  }

  async updateInstanceName(name: string): Promise<void> {
    await this.request('/instance/updateInstanceName', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  private buildWebhookPayload(config: WebhookConfig): Record<string, unknown> {
    return {
      url: config.url,
      enabled: config.enabled ?? true,
      events: config.events ?? ['messages'],
      excludeMessages: config.excludeMessages ?? [
        'wasSentByApi',
        'isGroupYes',
      ],
      addUrlEvents: config.addUrlEvents ?? false,
      addUrlTypesMessages: config.addUrlTypesMessages ?? false,
    };
  }

  private async postWebhookAction(body: Record<string, unknown>): Promise<void> {
    try {
      await this.request('/webhook', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (primaryErr) {
      const action = body.action as string | undefined;
      if (action === 'add' || action === 'update' || !action) {
        const { action: _action, id: _id, ...payload } = body;
        try {
          await this.request('/webhook/set', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          return;
        } catch {
          // continue
        }
      }
      throw primaryErr;
    }
  }

  async setWebhook(config: WebhookConfig): Promise<void> {
    await this.upsertWebhook(config);
  }

  async upsertWebhook(
    config: WebhookConfig,
    options: UpsertWebhookOptions = {}
  ): Promise<WebhookConfig> {
    const payload = this.buildWebhookPayload(config);
    const existing = await this.listWebhooks();
    const managed = findManagedWebhooks(existing, config, options);
    const preferredId = config.id || options.preferredId;
    const primary =
      (preferredId
        ? managed.find((hook) => hook.id === preferredId)
        : undefined) ||
      managed.find(
        (hook) => normalizeWebhookUrl(hook.url) === normalizeWebhookUrl(config.url)
      ) ||
      managed[0];

    if (primary?.id) {
      await this.postWebhookAction({
        action: 'update',
        id: primary.id,
        ...payload,
      });

      for (const duplicate of managed) {
        if (duplicate.id && duplicate.id !== primary.id) {
          await this.removeWebhook({ id: duplicate.id, url: duplicate.url });
        }
      }

      return { ...config, id: primary.id };
    }

    if (primary?.url) {
      await this.removeWebhook({ url: primary.url, id: primary.id });
      for (const duplicate of managed) {
        if (duplicate.url !== primary.url) {
          await this.removeWebhook({ id: duplicate.id, url: duplicate.url });
        }
      }
    }

    await this.postWebhookAction({ action: 'add', ...payload });

    const refreshed = await this.listWebhooks();
    const created =
      refreshed.find(
        (hook) => normalizeWebhookUrl(hook.url) === normalizeWebhookUrl(config.url)
      ) || refreshed[0];

    return { ...config, id: created?.id };
  }

  async removeWebhook(ref: { url?: string; id?: string }): Promise<void> {
    const attempts: Record<string, unknown>[] = [];
    if (ref.id) attempts.push({ action: 'delete', id: ref.id });
    if (ref.url) attempts.push({ action: 'delete', url: ref.url });

    for (const body of attempts) {
      try {
        await this.postWebhookAction(body);
        return;
      } catch {
        // try next shape
      }
    }
  }

  async listWebhooks(): Promise<WebhookConfig[]> {
    const paths = ['/webhook', '/webhook/get', '/webhook/list', '/instance/webhook'];

    for (const path of paths) {
      try {
        const data = await this.request<Record<string, unknown>>(path);
        const webhooks = parseWebhookList(data);
        if (webhooks.length) return webhooks;
      } catch {
        // try next path
      }
    }

    return [];
  }

  async getWebhook(): Promise<WebhookConfig | null> {
    const webhooks = await this.listWebhooks();
    return webhooks[0] ?? null;
  }

  async getWebhookCatalog(): Promise<{
    events: ReturnType<typeof mergeEventCatalog>;
    excludeOptions: ReturnType<typeof mergeExcludeCatalog>;
  }> {
    const eventPaths = [
      '/webhook/events',
      '/webhook/list',
      '/instance/webhook/events',
    ];
    const excludePaths = [
      '/webhook/exclude',
      '/webhook/excludeMessages',
      '/webhook/filters',
    ];

    let apiEvents: string[] | undefined;
    let apiExcludes: string[] | undefined;

    for (const path of eventPaths) {
      try {
        const data = await this.request<Record<string, unknown>>(path);
        apiEvents = extractStringArray(data, [
          'events',
          'availableEvents',
          'data',
          'list',
        ]);
        if (apiEvents?.length) break;
      } catch {
        // continue
      }
    }

    for (const path of excludePaths) {
      try {
        const data = await this.request<Record<string, unknown>>(path);
        apiExcludes = extractStringArray(data, [
          'excludeMessages',
          'exclude',
          'filters',
          'data',
          'list',
        ]);
        if (apiExcludes?.length) break;
      } catch {
        // continue
      }
    }

    return {
      events: apiEvents?.length
        ? mergeEventCatalog(apiEvents)
        : UAZAPI_WEBHOOK_EVENTS,
      excludeOptions: apiExcludes?.length
        ? mergeExcludeCatalog(apiExcludes)
        : UAZAPI_EXCLUDE_OPTIONS,
    };
  }
}

function parseWebhookEntry(value: unknown): WebhookConfig | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const url =
    (record.url as string) ||
    (record.webhookURL as string) ||
    (record.webhookUrl as string) ||
    (typeof record.webhook === 'string' ? record.webhook : undefined) ||
    ((record.webhook as Record<string, unknown>)?.url as string);

  if (!url) return null;

  const id =
    (record.id as string) ||
    (record._id as string) ||
    (record.webhookId as string) ||
    (record.webhook_id as string);

  return {
    id,
    url,
    enabled: record.enabled as boolean | undefined,
    events: (record.events as string[]) || undefined,
    excludeMessages: (record.excludeMessages as string[]) || undefined,
    addUrlEvents: record.addUrlEvents as boolean | undefined,
    addUrlTypesMessages: record.addUrlTypesMessages as boolean | undefined,
  };
}

function parseWebhookList(data: Record<string, unknown>): WebhookConfig[] {
  const candidates = [
    data.webhooks,
    data.items,
    data.list,
    data.data,
    Array.isArray(data) ? data : null,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const parsed = candidate
      .map(parseWebhookEntry)
      .filter((entry): entry is WebhookConfig => Boolean(entry));
    if (parsed.length) return parsed;
  }

  const single = parseWebhookEntry(data);
  return single ? [single] : [];
}

export function normalizeWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = '';
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
    return parsed.toString();
  } catch {
    return url.trim().replace(/\/$/, '');
  }
}

function isManagedWebhook(
  hook: WebhookConfig,
  config: WebhookConfig,
  options: UpsertWebhookOptions
): boolean {
  if (config.id && hook.id === config.id) return true;
  if (options.preferredId && hook.id === options.preferredId) return true;
  if (normalizeWebhookUrl(hook.url) === normalizeWebhookUrl(config.url)) {
    return true;
  }
  if (options.instanceName) {
    const encoded = encodeURIComponent(options.instanceName);
    if (hook.url.includes(`instance=${encoded}`)) return true;
  }
  return false;
}

function findManagedWebhooks(
  existing: WebhookConfig[],
  config: WebhookConfig,
  options: UpsertWebhookOptions
): WebhookConfig[] {
  return existing.filter((hook) => isManagedWebhook(hook, config, options));
}

function extractStringArray(
  data: Record<string, unknown>,
  keys: string[]
): string[] | undefined {
  for (const key of keys) {
    const val = data[key];
    if (Array.isArray(val) && val.every((v) => typeof v === 'string')) {
      return val as string[];
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = Object.keys(val as object);
      if (nested.length) return nested;
    }
  }
  return undefined;
}

function digString(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  for (const val of Object.values(record)) {
    if (val && typeof val === 'object') {
      const found = digString(val, keys);
      if (found) return found;
    }
  }
  return null;
}

export function extractRawStatus(response: UazapiStatusResponse): string {
  const raw =
    response.instance?.state ||
    response.instance?.status ||
    response.state ||
    response.status ||
    'disconnected';
  return String(raw).toLowerCase().trim();
}

export function normalizeConnectionStatus(
  response: UazapiStatusResponse
): ConnectionStatus {
  const status = extractRawStatus(response);

  if (
    status.includes('disconnected') ||
    status === 'close' ||
    status === 'closed' ||
    status === 'logout'
  ) {
    return 'disconnected';
  }

  if (status.includes('hibernat')) return 'hibernated';
  if (status === 'connected' || status === 'open') return 'connected';

  if (
    status.includes('connecting') ||
    status === 'pairing' ||
    status === 'qrcode' ||
    status === 'qr'
  ) {
    return 'connecting';
  }

  if (extractQrCode(response) || extractPairingCode(response)) {
    return 'connecting';
  }

  if (status.includes('connected')) return 'connected';

  return 'disconnected';
}

export function extractQrCode(response: UazapiStatusResponse): string | null {
  return digString(response, [
    'qrcode',
    'qrCode',
    'QRCode',
    'base64',
    'qr',
    'QR',
    'image',
  ]);
}

export function extractPairingCode(
  response: UazapiStatusResponse
): string | null {
  return digString(response, [
    'pairingCode',
    'pairing_code',
    'paircode',
    'code',
    'linkCode',
    'link_code',
  ]);
}

export function isWhatsAppLinked(response: UazapiStatusResponse): boolean {
  return normalizeConnectionStatus(response) === 'connected';
}
