/** Converte instance_name (Dra-Maria-Silva) → slug de URL (dra-maria-silva) */
export function instanceNameToTenantSlug(instanceName: string): string {
  return instanceName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export function doctorLandingPath(tenantSlug: string): string {
  return `/${tenantSlug}/inscricao`;
}

export function doctorLandingUrl(baseUrl?: string, tenantSlug?: string): string {
  const base = (baseUrl || appBaseUrl()).replace(/\/$/, '');
  return `${base}${doctorLandingPath(tenantSlug || '')}`;
}
