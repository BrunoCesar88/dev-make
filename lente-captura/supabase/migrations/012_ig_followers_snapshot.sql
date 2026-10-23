-- Snapshot de seguidores Instagram para calcular novos no período

ALTER TABLE doctor_tracking
  ADD COLUMN IF NOT EXISTS ig_followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS ig_followers_synced_at TIMESTAMPTZ;

ALTER TABLE tracking_ad_spend
  ADD COLUMN IF NOT EXISTS ig_followers_total INTEGER NOT NULL DEFAULT 0;
