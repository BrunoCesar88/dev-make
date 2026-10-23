-- Chaves de plataforma por médico (espelham env vars do Tracker / Cloudflare)

ALTER TABLE doctor_tracking
  ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT,
  ADD COLUMN IF NOT EXISTS ga4_api_secret TEXT,
  ADD COLUMN IF NOT EXISTS encharge_api_key TEXT,
  ADD COLUMN IF NOT EXISTS meta_ads_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ga4_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encharge_enabled BOOLEAN NOT NULL DEFAULT false;
