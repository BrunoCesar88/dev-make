-- Métricas de conta Meta (alcance pago, conversas por mensagem)

ALTER TABLE tracking_ad_spend
  ADD COLUMN IF NOT EXISTS reach INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messaging_conversations_started INTEGER NOT NULL DEFAULT 0;
