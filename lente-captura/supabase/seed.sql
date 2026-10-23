-- Seed: gestores
INSERT INTO managers (name) VALUES
  ('Alison'),
  ('Klaus'),
  ('Soraya')
ON CONFLICT (name) DO NOTHING;

-- Seed médicos ativos (34) - gerado a partir da planilha de controle
-- Execute scripts/seed-doctors.ts após migration para popular com dados completos
