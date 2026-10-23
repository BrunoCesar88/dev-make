import type { DoctorGoogleAdsCredentials } from '@/lib/google-ads/credentials';

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getGoogleAdsAccessToken(
  creds: Pick<
    DoctorGoogleAdsCredentials,
    'clientId' | 'clientSecret' | 'refreshToken'
  >
): Promise<string> {
  const cacheKey = creds.refreshToken.slice(-12);
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > now + 30) {
    return cached.token;
  }

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(
      `Google Ads token refresh ${resp.status}: ${errBody.slice(0, 300)}`
    );
  }

  const data = (await resp.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error('Google Ads token refresh: access_token ausente');
  }

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) - 60,
  });

  return data.access_token;
}
