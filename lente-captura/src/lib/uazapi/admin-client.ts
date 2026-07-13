/**
 * Uazapi Admin client — list and sync existing instances
 */

export interface UazapiInstanceRecord {
  name?: string;
  instanceName?: string;
  instance_name?: string;
  token?: string;
  apikey?: string;
  instanceToken?: string;
  status?: string;
  state?: string;
  connectionStatus?: string;
}

export class UazapiAdminClient {
  constructor(
    private baseUrl: string,
    private adminToken: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async listAllInstances(): Promise<UazapiInstanceRecord[]> {
    const paths = ['/instance/all', '/instances/all', '/admin/instances'];

    let lastError = '';

    for (const path of paths) {
      try {
        const records = await this.fetchInstances(path);
        if (records.length > 0) return records;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    throw new Error(
      lastError || 'Nenhuma instância retornada. Verifique UAZAPI_BASE_URL e UAZAPI_ADMIN_TOKEN.'
    );
  }

  private async fetchInstances(path: string): Promise<UazapiInstanceRecord[]> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        admintoken: this.adminToken,
        Authorization: `Bearer ${this.adminToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        (data as { message?: string }).message ||
          `${path} → HTTP ${response.status}`
      );
    }

    if (Array.isArray(data)) return data as UazapiInstanceRecord[];

    const obj = data as Record<string, unknown>;
    for (const key of ['instances', 'data', 'result', 'response']) {
      if (Array.isArray(obj[key])) {
        return obj[key] as UazapiInstanceRecord[];
      }
    }

    return [];
  }

  getInstanceName(record: UazapiInstanceRecord): string | null {
    return (
      record.name ||
      record.instanceName ||
      record.instance_name ||
      null
    );
  }

  getInstanceToken(record: UazapiInstanceRecord): string | null {
    return (
      record.token ||
      record.apikey ||
      record.instanceToken ||
      null
    );
  }

  normalizeStatus(record: UazapiInstanceRecord): string {
    const raw = (
      record.status ||
      record.state ||
      record.connectionStatus ||
      'disconnected'
    ).toLowerCase();

    if (raw.includes('connected') && !raw.includes('dis')) return 'connected';
    if (raw.includes('connecting')) return 'connecting';
    if (raw.includes('hibernat')) return 'hibernated';
    return 'disconnected';
  }
}
