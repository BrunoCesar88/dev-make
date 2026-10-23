export interface DoctorGoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string | null;
}

export function doctorGoogleAdsCredentialsFromRow(row: {
  google_ads_client_id?: string | null;
  google_ads_client_secret?: string | null;
  google_ads_refresh_token?: string | null;
  google_ads_developer_token?: string | null;
  google_ads_customer_id?: string | null;
  google_ads_login_customer_id?: string | null;
}): DoctorGoogleAdsCredentials | null {
  const clientId = row.google_ads_client_id?.trim();
  const clientSecret = row.google_ads_client_secret?.trim();
  const refreshToken = row.google_ads_refresh_token?.trim();
  const developerToken = row.google_ads_developer_token?.trim();
  const customerId = row.google_ads_customer_id?.trim();

  if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
    return null;
  }

  const loginCustomerId = row.google_ads_login_customer_id?.trim() || null;

  return {
    clientId,
    clientSecret,
    refreshToken,
    developerToken,
    customerId,
    loginCustomerId,
  };
}

export function describeMissingGoogleAdsCredentials(row: {
  google_ads_client_id?: string | null;
  google_ads_client_secret?: string | null;
  google_ads_refresh_token?: string | null;
  google_ads_developer_token?: string | null;
  google_ads_customer_id?: string | null;
}): string {
  const missing: string[] = [];
  if (!row.google_ads_customer_id?.trim()) missing.push('GOOGLE_ADS_CUSTOMER_ID');
  if (!row.google_ads_refresh_token?.trim()) missing.push('GOOGLE_ADS_REFRESH_TOKEN');
  if (!row.google_ads_developer_token?.trim()) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (!row.google_ads_client_id?.trim()) missing.push('GOOGLE_OAUTH_CLIENT_ID');
  if (!row.google_ads_client_secret?.trim()) missing.push('GOOGLE_OAUTH_CLIENT_SECRET');
  return missing.length
    ? `Configure ${missing.join(', ')} no tracking do médico.`
    : 'Credenciais Google Ads incompletas.';
}
