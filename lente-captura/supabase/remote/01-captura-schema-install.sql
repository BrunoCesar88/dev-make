-- Schema isolado Lente Captura (não altera tabelas legadas em public)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS captura;
SET search_path TO captura, public, extensions;

CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_name TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  sheet_gid TEXT DEFAULT '0',
  bio_link TEXT,
  lead_enabled BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  api_provider TEXT NOT NULL DEFAULT 'uazapi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  uazapi_token TEXT,
  uazapi_base_url TEXT NOT NULL DEFAULT 'https://free.uazapi.com',
  connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'hibernated')),
  last_status_check TIMESTAMPTZ,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doctor_id)
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_name TEXT,
  patient_phone TEXT NOT NULL,
  message TEXT,
  message_id TEXT,
  chat_id TEXT,
  source TEXT DEFAULT 'whatsapp',
  synced_to_sheets BOOLEAN NOT NULL DEFAULT false,
  sheets_sync_error TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE connection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctors_manager ON doctors(manager_id);
CREATE INDEX idx_doctors_status ON doctors(status);
CREATE INDEX idx_instances_doctor ON instances(doctor_id);
CREATE INDEX idx_instances_status ON instances(connection_status);
CREATE INDEX idx_leads_doctor ON leads(doctor_id);
CREATE INDEX idx_leads_received ON leads(received_at DESC);
CREATE INDEX idx_leads_phone ON leads(patient_phone);
CREATE INDEX idx_connection_logs_doctor ON connection_logs(doctor_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER instances_updated_at
  BEFORE UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read managers" ON managers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read doctors" ON doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read instances" ON instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read connection_logs" ON connection_logs FOR SELECT TO authenticated USING (true);


CREATE TABLE column_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  column_type TEXT NOT NULL DEFAULT 'text'
    CHECK (column_type IN ('text', 'phone', 'date', 'status', 'number', 'email', 'notes')),
  display_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  status_options JSONB,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'secretary')),
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE secretary_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secretary_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (secretary_id, doctor_id)
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS fields JSONB NOT NULL DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_fields ON leads USING GIN (fields);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  action TEXT NOT NULL
    CHECK (action IN (
      'lead_create', 'lead_update', 'lead_status_change', 'lead_delete',
      'column_create', 'column_update', 'column_delete', 'column_reorder',
      'sheets_sync', 'user_create', 'user_update'
    )),
  entity_type TEXT NOT NULL,
  field_key TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_lead ON audit_logs(lead_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE sheets_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL
    CHECK (sync_type IN ('append_row', 'update_row', 'update_cell', 'sync_headers')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

INSERT INTO column_definitions (key, label, column_type, display_order, is_required, is_system, status_options) VALUES
  ('data', 'Data', 'date', 1, true, true, NULL),
  ('nome', 'Nome', 'text', 2, false, true, NULL),
  ('telefone', 'Telefone', 'phone', 3, true, true, NULL),
  ('convenio', 'Convênio', 'text', 4, false, true, NULL),
  ('canais', 'Canais', 'text', 5, false, true, NULL),
  ('status', 'Status', 'status', 6, true, true, '["AGUARDANDO RESPOSTA","EM ATENDIMENTO","SUCESSO","DESCARTADO","DESMARCOU"]'::jsonb),
  ('agendamento', 'Agendamento', 'text', 7, false, true, NULL),
  ('compareceu', 'Compareceu?', 'text', 8, false, true, NULL),
  ('procedimento', 'Qual procedimento?', 'text', 9, false, true, NULL),
  ('valor_procedimento', 'Valor Procedimento', 'number', 10, false, true, NULL),
  ('observacao', 'Observação', 'notes', 11, false, true, NULL),
  ('anuncio', 'Anúncio', 'text', 12, false, true, NULL)
ON CONFLICT (key) DO NOTHING;

CREATE TRIGGER column_definitions_updated_at
  BEFORE UPDATE ON column_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE column_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretary_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheets_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION accessible_doctor_ids()
RETURNS SETOF UUID AS $$
  SELECT profiles.doctor_id FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'doctor' AND profiles.doctor_id IS NOT NULL AND profiles.is_active = true
  UNION
  SELECT sa.doctor_id FROM secretary_assignments sa
  JOIN profiles p ON p.id = sa.secretary_id
  WHERE p.id = auth.uid() AND p.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Anyone authenticated reads columns"
  ON column_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages columns"
  ON column_definitions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());
CREATE POLICY "Admin manages profiles"
  ON profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Read leads by access"
  ON leads FOR SELECT TO authenticated
  USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));
CREATE POLICY "Update leads by access"
  ON leads FOR UPDATE TO authenticated
  USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()))
  WITH CHECK (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));
CREATE POLICY "Insert leads service or admin"
  ON leads FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));

CREATE POLICY "Read audit by access"
  ON audit_logs FOR SELECT TO authenticated
  USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));



-- from migrations/003_secretary_policies.sql
-- Fase 2 patch: políticas RLS faltantes para secretárias
-- Idempotente: pode rodar mais de uma vez sem erro

DROP POLICY IF EXISTS "Secretary reads own assignments" ON secretary_assignments;
CREATE POLICY "Secretary reads own assignments"
  ON secretary_assignments FOR SELECT TO authenticated
  USING (
    secretary_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "Admin manages assignments" ON secretary_assignments;
CREATE POLICY "Admin manages assignments"
  ON secretary_assignments FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Read instances by access" ON instances;
CREATE POLICY "Read instances by access"
  ON instances FOR SELECT TO authenticated
  USING (
    is_admin()
    OR doctor_id IN (SELECT accessible_doctor_ids())
  );

DROP POLICY IF EXISTS "Authenticated read doctors" ON doctors;
DROP POLICY IF EXISTS "Read doctors by access" ON doctors;
CREATE POLICY "Read doctors by access"
  ON doctors FOR SELECT TO authenticated
  USING (
    is_admin()
    OR id IN (SELECT accessible_doctor_ids())
  );

DROP POLICY IF EXISTS "Authenticated read connection_logs" ON connection_logs;
DROP POLICY IF EXISTS "Read connection_logs by access" ON connection_logs;
CREATE POLICY "Read connection_logs by access"
  ON connection_logs FOR SELECT TO authenticated
  USING (
    is_admin()
    OR doctor_id IN (SELECT accessible_doctor_ids())
  );

-- from migrations/004_leads_unique_phone.sql
-- Impede leads duplicados por médico + telefone (normalizado)

CREATE OR REPLACE FUNCTION normalize_lead_phone(phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN digits = '' THEN ''
    WHEN length(digits) BETWEEN 10 AND 11 AND digits NOT LIKE '55%' THEN '55' || digits
    ELSE digits
  END
  FROM (SELECT regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') AS digits) s;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_doctor_phone_unique
  ON leads (doctor_id, normalize_lead_phone(patient_phone))
  WHERE normalize_lead_phone(patient_phone) <> '';

-- from migrations/005_doctor_tracking.sql
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

-- from migrations/006_doctor_tenant_slug.sql
-- Slug usado no Tracker (/dra-maria/inscricao) para filtrar analytics por médico

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS tenant_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_tenant_slug
  ON doctors(tenant_slug)
  WHERE tenant_slug IS NOT NULL;

-- from migrations/007_doctor_lead_phrases.sql
-- Frases de classificação de origem (espelho da tabela Lente-Medicos / automação n8n)

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio_phrase TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS site_phrase TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS manychat_phrase TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS social_selling_phrase TEXT;

-- Evita reprocessar a mesma mensagem WhatsApp
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_doctor_message_id
  ON leads (doctor_id, message_id)
  WHERE message_id IS NOT NULL AND message_id <> '';

-- from migrations/008_doctor_tracking_platform_keys.sql
-- Chaves de plataforma por médico (espelham env vars do Tracker / Cloudflare)

ALTER TABLE doctor_tracking
  ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT,
  ADD COLUMN IF NOT EXISTS ga4_api_secret TEXT,
  ADD COLUMN IF NOT EXISTS encharge_api_key TEXT,
  ADD COLUMN IF NOT EXISTS meta_ads_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ga4_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encharge_enabled BOOLEAN NOT NULL DEFAULT false;

-- from migrations/009_tracking_analytics.sql
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

-- from migrations/010_meta_account_metrics.sql
-- Métricas de conta Meta (alcance pago, conversas por mensagem)

ALTER TABLE tracking_ad_spend
  ADD COLUMN IF NOT EXISTS reach INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messaging_conversations_started INTEGER NOT NULL DEFAULT 0;

-- from migrations/011_meta_organic_social.sql
-- Alcance orgânico e novos seguidores (Instagram / Página)

ALTER TABLE tracking_ad_spend
  ADD COLUMN IF NOT EXISTS organic_reach INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_followers INTEGER NOT NULL DEFAULT 0;

-- from migrations/012_ig_followers_snapshot.sql
-- Snapshot de seguidores Instagram para calcular novos no período

ALTER TABLE doctor_tracking
  ADD COLUMN IF NOT EXISTS ig_followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS ig_followers_synced_at TIMESTAMPTZ;

ALTER TABLE tracking_ad_spend
  ADD COLUMN IF NOT EXISTS ig_followers_total INTEGER NOT NULL DEFAULT 0;

-- from migrations/013_lead_columns_sheet_schema.sql
-- Alinha column_definitions e dados dos leads com a planilha dos médicos:
-- Data, Nome, Telefone, Convênio, Canais, Status, Agendamento, Compareceu?,
-- Qual procedimento?, Valor Procedimento, Observação, Anúncio

DELETE FROM column_definitions
WHERE key IN ('mensagem', 'origem', 'observacoes');

INSERT INTO column_definitions (key, label, column_type, display_order, is_required, is_system, status_options)
VALUES
  ('data', 'Data', 'date', 1, true, true, NULL),
  ('nome', 'Nome', 'text', 2, false, true, NULL),
  ('telefone', 'Telefone', 'phone', 3, true, true, NULL),
  ('convenio', 'Convênio', 'text', 4, false, true, NULL),
  ('canais', 'Canais', 'text', 5, false, true, NULL),
  (
    'status',
    'Status',
    'status',
    6,
    true,
    true,
    '["AGUARDANDO RESPOSTA","EM ATENDIMENTO","SUCESSO","DESCARTADO","DESMARCOU"]'::jsonb
  ),
  ('agendamento', 'Agendamento', 'text', 7, false, true, NULL),
  ('compareceu', 'Compareceu?', 'text', 8, false, true, NULL),
  ('procedimento', 'Qual procedimento?', 'text', 9, false, true, NULL),
  ('valor_procedimento', 'Valor Procedimento', 'number', 10, false, true, NULL),
  ('observacao', 'Observação', 'notes', 11, false, true, NULL),
  ('anuncio', 'Anúncio', 'text', 12, false, true, NULL)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  column_type = EXCLUDED.column_type,
  display_order = EXCLUDED.display_order,
  is_required = EXCLUDED.is_required,
  is_system = EXCLUDED.is_system,
  status_options = EXCLUDED.status_options,
  updated_at = NOW();

-- Migra valores legados em leads.fields
UPDATE leads
SET fields = (
  fields
  - 'origem'
  - 'observacoes'
  - 'mensagem'
) || jsonb_strip_nulls(
  jsonb_build_object(
    'canais', COALESCE(
      NULLIF(fields->>'canais', ''),
      NULLIF(fields->>'Canais', ''),
      NULLIF(fields->>'origem', ''),
      NULLIF(fields->>'Origem', '')
    ),
    'observacao', COALESCE(
      NULLIF(fields->>'observacao', ''),
      NULLIF(fields->>'observacoes', '')
    ),
    'convenio', NULLIF(fields->>'convenio', ''),
    'agendamento', NULLIF(fields->>'agendamento', ''),
    'compareceu', NULLIF(fields->>'compareceu', ''),
    'procedimento', NULLIF(fields->>'procedimento', ''),
    'valor_procedimento', NULLIF(fields->>'valor_procedimento', ''),
    'anuncio', COALESCE(
      NULLIF(fields->>'anuncio', ''),
      NULLIF(fields->>'anúncio', '')
    )
  )
);

-- Status legado → status da planilha
UPDATE leads
SET status = CASE status
  WHEN 'novo' THEN 'aguardando_resposta'
  WHEN 'em_contato' THEN 'em_atendimento'
  WHEN 'agendado' THEN 'sucesso'
  WHEN 'compareceu' THEN 'sucesso'
  WHEN 'nao_compareceu' THEN 'desmarcou'
  WHEN 'perdido' THEN 'descartado'
  ELSE status
END
WHERE status IN (
  'novo', 'em_contato', 'agendado', 'compareceu', 'nao_compareceu', 'perdido'
);

UPDATE doctor_tracking
SET conversion_on_status = 'sucesso'
WHERE conversion_on_status = 'agendado';

-- from migrations/014_doctor_google_ads_credentials.sql
-- Credenciais Google Ads por médico (sync de métricas + conversões offline)

ALTER TABLE doctor_tracking
  ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_developer_token TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_login_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_client_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_client_secret TEXT;


-- API + RLS helpers
GRANT USAGE ON SCHEMA captura TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA captura TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA captura TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA captura GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA captura GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA captura TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA captura TO authenticated, service_role;

