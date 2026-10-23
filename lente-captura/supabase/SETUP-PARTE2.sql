-- PARTE 2 — Rode SOMENTE se já tiver as tabelas: doctors, managers, leads, instances
-- (Se não tiver NENHUMA tabela, use SETUP-COMPLETO.sql)

CREATE TABLE IF NOT EXISTS column_definitions (
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

CREATE TABLE IF NOT EXISTS profiles (
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

CREATE TABLE IF NOT EXISTS secretary_assignments (
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

CREATE TABLE IF NOT EXISTS audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_lead ON audit_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS sheets_sync_queue (
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

DROP TRIGGER IF EXISTS column_definitions_updated_at ON column_definitions;
CREATE TRIGGER column_definitions_updated_at
  BEFORE UPDATE ON column_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
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
  WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
    AND profiles.doctor_id IS NOT NULL
    AND profiles.is_active = true
  UNION
  SELECT sa.doctor_id FROM secretary_assignments sa
  JOIN profiles p ON p.id = sa.secretary_id
  WHERE p.id = auth.uid() AND p.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DO $$ BEGIN CREATE POLICY "Anyone authenticated reads columns" ON column_definitions FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admin manages columns" ON column_definitions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users read own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admin manages profiles" ON profiles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Read leads by access" ON leads FOR SELECT TO authenticated USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Update leads by access" ON leads FOR UPDATE TO authenticated USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids())) WITH CHECK (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Insert leads service or admin" ON leads FOR INSERT TO authenticated WITH CHECK (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Read audit by access" ON audit_logs FOR SELECT TO authenticated USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
