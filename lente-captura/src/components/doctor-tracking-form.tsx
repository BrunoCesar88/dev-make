'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import {
  DoctorPlatformKeysFields,
  defaultPlatformKeys,
  platformKeysToApiBody,
  type DoctorPlatformKeysValues,
} from '@/components/doctor-platform-keys-fields';
import { instanceNameToTenantSlug } from '@/lib/tracker/tenant';

interface TrackingConfig {
  meta_pixel_id: string | null;
  meta_access_token_masked: string | null;
  meta_ads_access_token_masked: string | null;
  google_ads_refresh_token_masked: string | null;
  google_ads_developer_token_masked: string | null;
  google_ads_client_secret_masked: string | null;
  ga4_api_secret_masked: string | null;
  encharge_api_key_masked: string | null;
  has_meta_token?: boolean;
  has_meta_ads_token?: boolean;
  has_google_ads_refresh_token?: boolean;
  has_google_ads_developer_token?: boolean;
  has_google_ads_client_secret?: boolean;
  has_ga4_secret?: boolean;
  has_encharge_key?: boolean;
  meta_ads_account_id: string | null;
  google_ads_customer_id: string | null;
  google_ads_login_customer_id: string | null;
  google_ads_client_id: string | null;
  google_ads_conversion_action_id: string | null;
  meta_test_event_code: string | null;
  ga4_measurement_id: string | null;
  landing_base_url: string | null;
  tracker_project_url: string | null;
  conversion_on_status: string;
  meta_enabled: boolean;
  google_enabled: boolean;
  ga4_enabled: boolean;
  encharge_enabled: boolean;
  tracker_sync?: { ok: boolean; error?: string; skipped?: boolean };
}

interface DoctorTrackingFormProps {
  doctorId: string;
  instanceName: string;
}

export function DoctorTrackingForm({
  doctorId,
  instanceName,
}: DoctorTrackingFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingMeta, setTestingMeta] = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masked, setMasked] = useState({
    metaAccessToken: null as string | null,
    metaAdsAccessToken: null as string | null,
    googleAdsRefreshToken: null as string | null,
    googleAdsDeveloperToken: null as string | null,
    googleAdsClientSecret: null as string | null,
    ga4ApiSecret: null as string | null,
    enchargeApiKey: null as string | null,
  });
  const [saved, setSaved] = useState({
    metaAccessToken: false,
    metaAdsAccessToken: false,
    googleAdsRefreshToken: false,
    googleAdsDeveloperToken: false,
    googleAdsClientSecret: false,
    ga4ApiSecret: false,
    enchargeApiKey: false,
  });
  const [platformKeys, setPlatformKeys] = useState<DoctorPlatformKeysValues>({
    ...defaultPlatformKeys,
  });

  useEffect(() => {
    fetch(`/api/doctors/${doctorId}/tracking`)
      .then((r) => r.json())
      .then((data: TrackingConfig) => {
        if ('error' in data) {
          setError(String((data as { error: string }).error));
          return;
        }
        setPlatformKeys({
          metaEnabled: data.meta_enabled,
          googleEnabled: data.google_enabled,
          ga4Enabled: data.ga4_enabled,
          enchargeEnabled: data.encharge_enabled,
          metaPixelId: data.meta_pixel_id || '',
          metaAccessToken: '',
          metaAdsAccessToken: '',
          metaAdsAccountId: data.meta_ads_account_id || '',
          metaTestCode: data.meta_test_event_code || '',
          googleAdsCustomerId: data.google_ads_customer_id || '',
          googleAdsRefreshToken: '',
          googleAdsDeveloperToken: '',
          googleAdsLoginCustomerId: data.google_ads_login_customer_id || '',
          googleAdsClientId: data.google_ads_client_id || '',
          googleAdsClientSecret: '',
          googleAdsConversionActionId: data.google_ads_conversion_action_id || '',
          ga4MeasurementId: data.ga4_measurement_id || '',
          ga4ApiSecret: '',
          enchargeApiKey: '',
          conversionStatus: data.conversion_on_status || 'agendado',
        });
        setMasked({
          metaAccessToken: data.meta_access_token_masked,
          metaAdsAccessToken: data.meta_ads_access_token_masked,
          googleAdsRefreshToken: data.google_ads_refresh_token_masked,
          googleAdsDeveloperToken: data.google_ads_developer_token_masked,
          googleAdsClientSecret: data.google_ads_client_secret_masked,
          ga4ApiSecret: data.ga4_api_secret_masked,
          enchargeApiKey: data.encharge_api_key_masked,
        });
        setSaved({
          metaAccessToken: Boolean(data.has_meta_token),
          metaAdsAccessToken: Boolean(data.has_meta_ads_token),
          googleAdsRefreshToken: Boolean(data.has_google_ads_refresh_token),
          googleAdsDeveloperToken: Boolean(data.has_google_ads_developer_token),
          googleAdsClientSecret: Boolean(data.has_google_ads_client_secret),
          ga4ApiSecret: Boolean(data.has_ga4_secret),
          enchargeApiKey: Boolean(data.has_encharge_key),
        });
      })
      .catch(() => setError('Erro ao carregar tracking'))
      .finally(() => setLoading(false));
  }, [doctorId]);

  const handleTestMetaAds = async () => {
    setTestingMeta(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/tracking/test-meta-ads`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || data.raw_error || 'Falha ao testar Meta Ads');
        return;
      }

      setMessage(data.message || 'Conexão com Meta Ads OK.');
    } catch {
      setError('Erro de conexão ao testar Meta Ads');
    } finally {
      setTestingMeta(false);
    }
  };

  const handleTestGoogleAds = async () => {
    setTestingGoogle(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/tracking/test-google-ads`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || data.raw_error || 'Falha ao testar Google Ads');
        return;
      }

      setMessage(data.message || 'Conexão com Google Ads OK.');
    } catch {
      setError('Erro de conexão ao testar Google Ads');
    } finally {
      setTestingGoogle(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/doctors/${doctorId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformKeysToApiBody(platformKeys)),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }

      setMasked({
        metaAccessToken: data.meta_access_token_masked,
        metaAdsAccessToken: data.meta_ads_access_token_masked,
        googleAdsRefreshToken: data.google_ads_refresh_token_masked,
        googleAdsDeveloperToken: data.google_ads_developer_token_masked,
        googleAdsClientSecret: data.google_ads_client_secret_masked,
        ga4ApiSecret: data.ga4_api_secret_masked,
        enchargeApiKey: data.encharge_api_key_masked,
      });
      setSaved({
        metaAccessToken: Boolean(data.has_meta_token),
        metaAdsAccessToken: Boolean(data.has_meta_ads_token),
        googleAdsRefreshToken: Boolean(data.has_google_ads_refresh_token),
        googleAdsDeveloperToken: Boolean(data.has_google_ads_developer_token),
        googleAdsClientSecret: Boolean(data.has_google_ads_client_secret),
        ga4ApiSecret: Boolean(data.has_ga4_secret),
        enchargeApiKey: Boolean(data.has_encharge_key),
      });
      setPlatformKeys((prev) => ({
        ...prev,
        metaAccessToken: '',
        metaAdsAccessToken: '',
        googleAdsRefreshToken: '',
        googleAdsDeveloperToken: '',
        googleAdsClientSecret: '',
        ga4ApiSecret: '',
        enchargeApiKey: '',
      }));

      setMessage(
        'Tracking salvo. Tokens secretos ficam ocultos por segurança — se aparecer “Token salvo no banco”, está tudo certo.'
      );
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="apple-card p-6 lg:p-8">
        <p className="text-[15px] text-[var(--brand-text-tertiary)]">Carregando tracking…</p>
      </section>
    );
  }

  return (
    <section className="apple-card p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-[21px] font-semibold text-[var(--brand-text)]">
          Tracking &amp; conversões
        </h2>
        <p className="mt-1 text-[14px] text-[var(--brand-text-tertiary)]">
          Salve aqui — landing, Meta CAPI e Analytics usam estes dados na hora.
          Sem Cloudflare.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <DoctorPlatformKeysFields
          values={platformKeys}
          onChange={(patch) => setPlatformKeys((prev) => ({ ...prev, ...patch }))}
          masked={masked}
          saved={saved}
          tenantSlug={instanceNameToTenantSlug(instanceName)}
        />

        {error && <p className="text-[14px] text-[#ff3b30]">{error}</p>}
        {message && <p className="text-[14px] text-[#34c759]">{message}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando…' : 'Salvar tracking'}
          </button>
          <button
            type="button"
            onClick={handleTestMetaAds}
            disabled={testingMeta || testingGoogle || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-border)] px-5 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-surface)] disabled:opacity-50"
          >
            {testingMeta ? 'Testando Meta…' : 'Testar Meta Ads'}
          </button>
          <button
            type="button"
            onClick={handleTestGoogleAds}
            disabled={testingGoogle || testingMeta || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-border)] px-5 py-2.5 text-[14px] font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-surface)] disabled:opacity-50"
          >
            {testingGoogle ? 'Testando Google…' : 'Testar Google Ads'}
          </button>
        </div>
      </form>
    </section>
  );
}
