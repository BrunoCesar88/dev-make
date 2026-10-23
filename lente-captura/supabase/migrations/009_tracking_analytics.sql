-- Analytics unificado no Supabase (fonte única para o painel /analytics)
-- Tracker/Cloudflare envia eventos via POST /api/tracking/ingest

CREATE TABLE tracking_sessions (
  session_id TEXT PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  tenant_slug TEXT NOT NULL DEFAULT 'default',
  external_id TEXT,
  fbclid TEXT,
  gclid TEXT,
  msclkid TEXT,
  fbc TEXT,
  fbp TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  landing_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_sessions_doctor ON tracking_sessions(doctor_id, created_at DESC);
CREATE INDEX idx_tracking_sessions_tenant ON tracking_sessions(tenant_slug, created_at DESC);

CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  tenant_slug TEXT NOT NULL DEFAULT 'default',
  session_id TEXT REFERENCES tracking_sessions(session_id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_source_url TEXT,
  raw_email TEXT,
  browser TEXT,
  os TEXT,
  is_mobile BOOLEAN NOT NULL DEFAULT false,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_reason TEXT,
  pixel_was_blocked BOOLEAN NOT NULL DEFAULT false,
  meta_response_ok BOOLEAN,
  meta_status_code INTEGER,
  ga4_response_ok BOOLEAN,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbc TEXT,
  gclid TEXT,
  referrer TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_events_doctor_time ON tracking_events(doctor_id, event_time DESC);
CREATE INDEX idx_tracking_events_tenant_time ON tracking_events(tenant_slug, event_time DESC);
CREATE INDEX idx_tracking_events_name ON tracking_events(event_name, event_time DESC);

CREATE TABLE tracking_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id TEXT NOT NULL UNIQUE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  tenant_slug TEXT NOT NULL DEFAULT 'default',
  session_id TEXT,
  raw_email TEXT,
  product_id TEXT,
  product_name TEXT,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  fbc TEXT,
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  meta_response_ok BOOLEAN,
  ga4_response_ok BOOLEAN,
  google_ads_response_ok BOOLEAN,
  google_ads_response_body TEXT,
  purchased_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_purchases_doctor ON tracking_purchases(doctor_id, purchased_at DESC);

CREATE TABLE tracking_ad_spend (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  tenant_slug TEXT NOT NULL DEFAULT 'default',
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  spend_date DATE NOT NULL,
  campaign_id TEXT NOT NULL DEFAULT '',
  campaign_name TEXT,
  spend_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, tenant_slug, spend_date, campaign_id)
);

CREATE INDEX idx_tracking_ad_spend_doctor ON tracking_ad_spend(doctor_id, spend_date DESC);

ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY tracking_sessions_read ON tracking_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
      AND (p.role = 'admin' OR p.doctor_id = tracking_sessions.doctor_id)
    )
  );

CREATE POLICY tracking_events_read ON tracking_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
      AND (p.role = 'admin' OR p.doctor_id = tracking_events.doctor_id)
    )
  );

CREATE POLICY tracking_purchases_read ON tracking_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
      AND (p.role = 'admin' OR p.doctor_id = tracking_purchases.doctor_id)
    )
  );

CREATE POLICY tracking_ad_spend_read ON tracking_ad_spend
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
      AND (p.role = 'admin' OR p.doctor_id = tracking_ad_spend.doctor_id)
    )
  );
