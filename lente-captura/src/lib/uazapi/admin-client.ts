/**
 * Uazapi Admin client — list and sync existing instances
 */

export interface UazapiInstanceRecord {
  name?: string;
  instanceName?: string;
  token?: string;
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
    const response = await fetch(`${this.baseUrl}/instance/all`, {
      headers: {
        'Content-Type': 'application/json',
        admintoken: this.adminToken,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        (data as { message?: string }).message ||
          `Uazapi admin error: ${response.status}`
      );
    }

    if (Array.isArray(data)) return data as UazapiInstanceRecord[];
    if (Array.isArray((data as { instances?: unknown }).instances)) {
      return (data as { instances: UazapiInstanceRecord[] }).instances;
    }
    if (Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: UazapiInstanceRecord[] }).data;
    }

    return [];
  }

  getInstanceName(record: UazapiInstanceRecord): string | null {
    return record.name || record.instanceName || null;
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
