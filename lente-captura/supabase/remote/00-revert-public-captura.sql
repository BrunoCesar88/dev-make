-- Remove apenas o que o SETUP-COMPLETO criou em public (não mexe em Lente-Medicos*).
-- Restaura o nome original da tabela de leads do n8n/planilha.

DROP TABLE IF EXISTS public.sheets_sync_queue CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.secretary_assignments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.column_definitions CASCADE;
DROP TABLE IF EXISTS public.connection_logs CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.instances CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.managers CASCADE;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.accessible_doctor_ids() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_lead_phone(text) CASCADE;

DO $$
BEGIN
  IF to_regclass('public.n8n_mirror_leads') IS NOT NULL
     AND to_regclass('public.leads') IS NULL THEN
    ALTER TABLE public.n8n_mirror_leads RENAME TO leads;
  END IF;
END $$;
