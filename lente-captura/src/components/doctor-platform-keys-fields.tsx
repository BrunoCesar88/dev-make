'use client';

import { doctorLandingUrl } from '@/lib/tracker/tenant';

export interface DoctorPlatformKeysValues {
  metaEnabled: boolean;
  metaPixelId: string;
  metaAccessToken: string;
  metaAdsAccessToken: string;
  metaAdsAccountId: string;
  metaTestCode: string;
  googleEnabled: boolean;
  googleAdsCustomerId: string;
  googleAdsRefreshToken: string;
  googleAdsDeveloperToken: string;
  googleAdsLoginCustomerId: string;
  googleAdsClientId: string;
  googleAdsClientSecret: string;
  googleAdsConversionActionId: string;
  ga4Enabled: boolean;
  ga4MeasurementId: string;
  ga4ApiSecret: string;
  enchargeEnabled: boolean;
  enchargeApiKey: string;
  conversionStatus: string;
}

export const defaultPlatformKeys: DoctorPlatformKeysValues = {
  metaEnabled: false,
  metaPixelId: '',
  metaAccessToken: '',
  metaAdsAccessToken: '',
  metaAdsAccountId: '',
  metaTestCode: '',
  googleEnabled: false,
  googleAdsCustomerId: '',
  googleAdsRefreshToken: '',
  googleAdsDeveloperToken: '',
  googleAdsLoginCustomerId: '',
  googleAdsClientId: '',
  googleAdsClientSecret: '',
  googleAdsConversionActionId: '',
  ga4Enabled: false,
  ga4MeasurementId: '',
  ga4ApiSecret: '',
  enchargeEnabled: false,
  enchargeApiKey: '',
  conversionStatus: 'agendado',
};

interface MaskedTokens {
  metaAccessToken?: string | null;
  metaAdsAccessToken?: string | null;
  googleAdsRefreshToken?: string | null;
  googleAdsDeveloperToken?: string | null;
  googleAdsClientSecret?: string | null;
  ga4ApiSecret?: string | null;
  enchargeApiKey?: string | null;
}

interface SavedTokenFlags {
  metaAccessToken?: boolean;
  metaAdsAccessToken?: boolean;
  googleAdsRefreshToken?: boolean;
  googleAdsDeveloperToken?: boolean;
  googleAdsClientSecret?: boolean;
  ga4ApiSecret?: boolean;
  enchargeApiKey?: boolean;
}

interface DoctorPlatformKeysFieldsProps {
  values: DoctorPlatformKeysValues;
  onChange: (patch: Partial<DoctorPlatformKeysValues>) => void;
  masked?: MaskedTokens;
  saved?: SavedTokenFlags;
  tenantSlug?: string;
}

const hints: Record<string, string> = {
  metaPixelId: 'Events Manager → seu Pixel → ID numérico no topo',
  metaAccessToken: 'Events Manager → Pixel → Settings → Generate access token',
  metaAdsAccessToken: 'Meta Marketing API (system user) — para sync de gasto',
  metaAdsAccountId: 'ID da conta de anúncios, só dígitos (sem act_)',
  metaTestCode: 'Events Manager → Test events (opcional)',
  googleAdsCustomerId: 'Google Ads → Configurações da conta → ID do cliente (só dígitos)',
  googleAdsRefreshToken: 'OAuth refresh token com escopo adwords — para sync de gasto',
  googleAdsDeveloperToken: 'Google Ads API Center → developer token',
  googleAdsLoginCustomerId: 'Opcional — ID da conta gerenciadora (MCC), se acessar via agência',
  googleAdsClientId: 'Google Cloud → APIs & Services → OAuth client ID',
  googleAdsClientSecret: 'OAuth client secret do mesmo app',
  googleAdsConversionActionId: 'Conversões offline — ID da ação de conversão (opcional)',
  ga4MeasurementId: 'GA4 Admin → Data Streams → seu stream (G-XXXXXXXX)',
  ga4ApiSecret: 'GA4 Admin → Data Streams → Measurement Protocol API secrets → Create',
  enchargeApiKey: 'Encharge → Apps → HTTP API',
};

export function DoctorPlatformKeysFields({
  values,
  onChange,
  masked = {},
  saved = {},
  tenantSlug,
}: DoctorPlatformKeysFieldsProps) {
  const landingPreview = tenantSlug ? doctorLandingUrl(undefined, tenantSlug) : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--brand-text)]">
          Meta — Pixel &amp; CAPI
        </h3>
        <p className="mt-1 text-[13px] text-[var(--brand-text-tertiary)]">
          PageView, Lead na landing e Schedule no agendamento.
        </p>
        <label className="mt-3 flex items-center gap-3">
          <input
            type="checkbox"
            checked={values.metaEnabled}
            onChange={(e) => onChange({ metaEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-black/[0.2]"
          />
          <span className="text-[14px] text-[var(--brand-text)]">Meta ativo</span>
        </label>
      </div>

      {values.metaEnabled && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="META_PIXEL_ID" hint={hints.metaPixelId}>
            <input
              value={values.metaPixelId}
              onChange={(e) => onChange({ metaPixelId: e.target.value })}
              placeholder="1234567890"
              className={inputClass}
            />
          </Field>
          <SecretField
            label="META_ACCESS_TOKEN"
            hint={hints.metaAccessToken}
            value={values.metaAccessToken}
            onChange={(v) => onChange({ metaAccessToken: v })}
            masked={masked.metaAccessToken}
            saved={saved.metaAccessToken}
          />
          <Field label="META_ADS_ACCOUNT_ID" hint={hints.metaAdsAccountId}>
            <input
              value={values.metaAdsAccountId}
              onChange={(e) => onChange({ metaAdsAccountId: e.target.value })}
              placeholder="1234567890"
              className={inputClass}
            />
          </Field>
          <SecretField
            label="META_ADS_ACCESS_TOKEN"
            hint={hints.metaAdsAccessToken}
            value={values.metaAdsAccessToken}
            onChange={(v) => onChange({ metaAdsAccessToken: v })}
            masked={masked.metaAdsAccessToken}
            saved={saved.metaAdsAccessToken}
          />
          <Field label="META_TEST_EVENT_CODE" hint={hints.metaTestCode}>
            <input
              value={values.metaTestCode}
              onChange={(e) => onChange({ metaTestCode: e.target.value })}
              placeholder="TEST12345"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <div>
        <h3 className="text-[15px] font-semibold text-[var(--brand-text)]">
          Google Ads — sync de métricas
        </h3>
        <p className="mt-1 text-[13px] text-[var(--brand-text-tertiary)]">
          Mesmo fluxo da Meta: credenciais deste médico puxam gasto, impressões e cliques no Analytics.
        </p>
        <label className="mt-3 flex items-center gap-3">
          <input
            type="checkbox"
            checked={values.googleEnabled}
            onChange={(e) => onChange({ googleEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-black/[0.2]"
          />
          <span className="text-[14px] text-[var(--brand-text)]">Google Ads ativo</span>
        </label>
      </div>

      {values.googleEnabled && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="GOOGLE_ADS_CUSTOMER_ID" hint={hints.googleAdsCustomerId}>
            <input
              value={values.googleAdsCustomerId}
              onChange={(e) => onChange({ googleAdsCustomerId: e.target.value })}
              placeholder="1234567890"
              className={inputClass}
            />
          </Field>
          <SecretField
            label="GOOGLE_ADS_REFRESH_TOKEN"
            hint={hints.googleAdsRefreshToken}
            value={values.googleAdsRefreshToken}
            onChange={(v) => onChange({ googleAdsRefreshToken: v })}
            masked={masked.googleAdsRefreshToken}
            saved={saved.googleAdsRefreshToken}
          />
          <SecretField
            label="GOOGLE_ADS_DEVELOPER_TOKEN"
            hint={hints.googleAdsDeveloperToken}
            value={values.googleAdsDeveloperToken}
            onChange={(v) => onChange({ googleAdsDeveloperToken: v })}
            masked={masked.googleAdsDeveloperToken}
            saved={saved.googleAdsDeveloperToken}
          />
          <Field
            label="GOOGLE_ADS_LOGIN_CUSTOMER_ID"
            hint={hints.googleAdsLoginCustomerId}
          >
            <input
              value={values.googleAdsLoginCustomerId}
              onChange={(e) =>
                onChange({ googleAdsLoginCustomerId: e.target.value })
              }
              placeholder="Opcional — MCC"
              className={inputClass}
            />
          </Field>
          <Field label="GOOGLE_OAUTH_CLIENT_ID" hint={hints.googleAdsClientId}>
            <input
              value={values.googleAdsClientId}
              onChange={(e) => onChange({ googleAdsClientId: e.target.value })}
              placeholder="xxx.apps.googleusercontent.com"
              className={inputClass}
            />
          </Field>
          <SecretField
            label="GOOGLE_OAUTH_CLIENT_SECRET"
            hint={hints.googleAdsClientSecret}
            value={values.googleAdsClientSecret}
            onChange={(v) => onChange({ googleAdsClientSecret: v })}
            masked={masked.googleAdsClientSecret}
            saved={saved.googleAdsClientSecret}
          />
          <Field
            label="GOOGLE_ADS_CONVERSION_ACTION_ID"
            hint={hints.googleAdsConversionActionId}
          >
            <input
              value={values.googleAdsConversionActionId}
              onChange={(e) =>
                onChange({ googleAdsConversionActionId: e.target.value })
              }
              placeholder="Para conversão offline no SUCESSO"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <div>
        <h3 className="text-[15px] font-semibold text-[var(--brand-text)]">GA4</h3>
        <label className="mt-3 flex items-center gap-3">
          <input
            type="checkbox"
            checked={values.ga4Enabled}
            onChange={(e) => onChange({ ga4Enabled: e.target.checked })}
            className="h-4 w-4 rounded border-black/[0.2]"
          />
          <span className="text-[14px] text-[var(--brand-text)]">GA4 ativo</span>
        </label>
      </div>

      {values.ga4Enabled && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="GA4_MEASUREMENT_ID" hint={hints.ga4MeasurementId}>
            <input
              value={values.ga4MeasurementId}
              onChange={(e) => onChange({ ga4MeasurementId: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              className={inputClass}
            />
          </Field>
          <SecretField
            label="GA4_API_SECRET"
            hint={hints.ga4ApiSecret}
            value={values.ga4ApiSecret}
            onChange={(v) => onChange({ ga4ApiSecret: v })}
            masked={masked.ga4ApiSecret}
            saved={saved.ga4ApiSecret}
          />
        </div>
      )}

      <div>
        <h3 className="text-[15px] font-semibold text-[var(--brand-text)]">Encharge</h3>
        <label className="mt-3 flex items-center gap-3">
          <input
            type="checkbox"
            checked={values.enchargeEnabled}
            onChange={(e) => onChange({ enchargeEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-black/[0.2]"
          />
          <span className="text-[14px] text-[var(--brand-text)]">
            Enviar leads da landing para Encharge
          </span>
        </label>
      </div>

      {values.enchargeEnabled && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SecretField
            label="ENCHARGE_API_KEY"
            hint={hints.enchargeApiKey}
            value={values.enchargeApiKey}
            onChange={(v) => onChange({ enchargeApiKey: v })}
            masked={masked.enchargeApiKey}
            saved={saved.enchargeApiKey}
          />
        </div>
      )}

      {landingPreview && (
        <p className="rounded-xl border border-black/[0.06] bg-[var(--brand-bg)]/60 px-4 py-3 text-[13px] text-[var(--brand-text-secondary)]">
          Landing automática (use nos anúncios):{' '}
          <code className="mono text-[12px]">{landingPreview}</code>
        </p>
      )}

      <Field label="Status que dispara conversão (WhatsApp)">
        <input
          value={values.conversionStatus}
          onChange={(e) => onChange({ conversionStatus: e.target.value })}
          placeholder="agendado"
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function SecretField({
  label,
  hint,
  value,
  onChange,
  masked,
  saved,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  masked?: string | null;
  saved?: boolean;
}) {
  const isSaved = saved || Boolean(masked);

  return (
    <Field label={label} hint={hint}>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSaved ? 'Cole aqui só para trocar o token' : 'Cole o token completo'}
        className={inputClass}
        autoComplete="off"
      />
      {isSaved ? (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-[#34c759]">
          <span aria-hidden>✓</span>
          <span>
            Token salvo no banco
            {masked ? (
              <>
                {' '}
                (<span className="mono">{masked}</span>)
              </>
            ) : null}
            . Campo vazio é normal — não apaga ao salvar.
          </span>
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-[var(--brand-text-tertiary)]">
          Nenhum token salvo ainda. Cole o valor completo antes de salvar.
        </p>
      )}
    </Field>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[var(--brand-text-tertiary)]">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[12px] leading-snug text-[var(--brand-text-tertiary)]">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClass = 'input-field';

export function platformKeysToApiBody(
  values: DoctorPlatformKeysValues,
  options?: { includeEmptyTokens?: boolean }
) {
  const body: Record<string, unknown> = {
    meta_enabled: values.metaEnabled,
    ga4_enabled: values.ga4Enabled,
    encharge_enabled: values.enchargeEnabled,
    google_enabled: values.googleEnabled,
    meta_pixel_id: values.metaPixelId.trim() || null,
    meta_ads_account_id: values.metaAdsAccountId.trim() || null,
    meta_test_event_code: values.metaTestCode.trim() || null,
    ga4_measurement_id: values.ga4MeasurementId.trim() || null,
    google_ads_customer_id: values.googleAdsCustomerId.trim() || null,
    google_ads_login_customer_id: values.googleAdsLoginCustomerId.trim() || null,
    google_ads_client_id: values.googleAdsClientId.trim() || null,
    google_ads_conversion_action_id:
      values.googleAdsConversionActionId.trim() || null,
    tracker_project_url: null,
    conversion_on_status: values.conversionStatus.trim() || 'agendado',
  };

  if (values.metaAccessToken.trim() || options?.includeEmptyTokens) {
    body.meta_access_token = values.metaAccessToken.trim() || null;
  }
  if (values.metaAdsAccessToken.trim() || options?.includeEmptyTokens) {
    body.meta_ads_access_token = values.metaAdsAccessToken.trim() || null;
  }
  if (values.googleAdsRefreshToken.trim() || options?.includeEmptyTokens) {
    body.google_ads_refresh_token = values.googleAdsRefreshToken.trim() || null;
  }
  if (values.googleAdsDeveloperToken.trim() || options?.includeEmptyTokens) {
    body.google_ads_developer_token = values.googleAdsDeveloperToken.trim() || null;
  }
  if (values.googleAdsClientSecret.trim() || options?.includeEmptyTokens) {
    body.google_ads_client_secret = values.googleAdsClientSecret.trim() || null;
  }
  if (values.ga4ApiSecret.trim() || options?.includeEmptyTokens) {
    body.ga4_api_secret = values.ga4ApiSecret.trim() || null;
  }
  if (values.enchargeApiKey.trim() || options?.includeEmptyTokens) {
    body.encharge_api_key = values.enchargeApiKey.trim() || null;
  }

  return body;
}
