-- ============================================================
-- LENTE - SETUP COMPLETO SUPABASE
-- Cole TUDO no SQL Editor e clique RUN (uma vez só)
-- ============================================================

-- ========== MIGRATION 001 ==========

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- ========== MIGRATION 002 ==========

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
  ('mensagem', 'Mensagem', 'notes', 4, false, true, NULL),
  ('status', 'Status', 'status', 5, true, true, '["Novo","Em contato","Agendado","Compareceu","Não compareceu","Perdido"]'::jsonb),
  ('origem', 'Origem', 'text', 6, false, true, NULL),
  ('observacoes', 'Observações', 'notes', 7, false, false, NULL)
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
  SELECT doctor_id FROM profiles
  WHERE id = auth.uid() AND role = 'doctor' AND doctor_id IS NOT NULL AND is_active = true
  UNION
  SELECT doctor_id FROM secretary_assignments sa
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

-- FIM DO SETUP
