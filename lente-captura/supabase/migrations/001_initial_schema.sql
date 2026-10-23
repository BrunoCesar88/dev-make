-- Lente Captura de Leads - Schema inicial
-- Gestores, médicos, instâncias Uazapi, leads e logs de conexão

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Gestores (Alison, Klaus, Soraya)
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Médicos / clínicas
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

-- Instâncias Uazapi (credenciais por médico)
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

-- Leads capturados
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

-- Logs de conexão (histórico de quedas/reconexões)
CREATE TABLE connection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_doctors_manager ON doctors(manager_id);
CREATE INDEX idx_doctors_status ON doctors(status);
CREATE INDEX idx_instances_doctor ON instances(doctor_id);
CREATE INDEX idx_instances_status ON instances(connection_status);
CREATE INDEX idx_leads_doctor ON leads(doctor_id);
CREATE INDEX idx_leads_received ON leads(received_at DESC);
CREATE INDEX idx_leads_phone ON leads(patient_phone);
CREATE INDEX idx_connection_logs_doctor ON connection_logs(doctor_id);

-- Trigger updated_at
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

-- RLS (Row Level Security) - habilitado, políticas abertas para service role
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados (admin vê tudo por enquanto)
CREATE POLICY "Authenticated read managers" ON managers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read doctors" ON doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read instances" ON instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read connection_logs" ON connection_logs FOR SELECT TO authenticated USING (true);

-- Service role tem acesso total via bypass RLS
