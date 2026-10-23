-- Credenciais de tracking por médico (Meta / Google) + log de conversões disparadas

CREATE TABLE doctor_tracking (
  doctor_id UUID PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  meta_pixel_id TEXT,
  meta_access_token TEXT,
  meta_ads_account_id TEXT,
  meta_test_event_code TEXT,
  google_ads_customer_id TEXT,
  google_ads_conversion_action_id TEXT,
  landing_base_url TEXT,
  tracker_project_url TEXT,
  conversion_on_status TEXT NOT NULL DEFAULT 'agendado',
  meta_enabled BOOLEAN NOT NULL DEFAULT false,
  google_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  event_name TEXT NOT NULL,
  event_id TEXT,
  trigger_status TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  skipped_reason TEXT,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversion_events_doctor ON conversion_events(doctor_id, created_at DESC);
CREATE INDEX idx_conversion_events_lead ON conversion_events(lead_id);

CREATE TRIGGER doctor_tracking_updated_at
  BEFORE UPDATE ON doctor_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE doctor_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctor_tracking_admin ON doctor_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.is_active = true
    )
  );

CREATE POLICY conversion_events_read ON conversion_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
      AND (p.role = 'admin' OR p.doctor_id = conversion_events.doctor_id)
    )
  );
