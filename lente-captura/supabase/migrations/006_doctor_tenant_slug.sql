-- Slug usado no Tracker (/dra-maria/inscricao) para filtrar analytics por médico

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS tenant_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_tenant_slug
  ON doctors(tenant_slug)
  WHERE tenant_slug IS NOT NULL;
