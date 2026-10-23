-- Alcance orgânico e novos seguidores (Instagram / Página)

ALTER TABLE tracking_ad_spend
  ADD COLUMN IF NOT EXISTS organic_reach INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_followers INTEGER NOT NULL DEFAULT 0;
