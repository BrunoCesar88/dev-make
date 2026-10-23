-- Credenciais Google Ads por médico (sync de métricas + conversões offline)

ALTER TABLE doctor_tracking
  ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_developer_token TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_login_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_client_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_client_secret TEXT;
