-- PATCH: rode SOMENTE este bloco se deu erro na linha 229
-- (corrige função + cria políticas que faltaram)

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

-- Políticas (ignore erro "already exists" se aparecer)
DO $$ BEGIN
  CREATE POLICY "Anyone authenticated reads columns"
    ON column_definitions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin manages columns"
    ON column_definitions FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users read own profile"
    ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin manages profiles"
    ON profiles FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Read leads by access"
    ON leads FOR SELECT TO authenticated
    USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Update leads by access"
    ON leads FOR UPDATE TO authenticated
    USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()))
    WITH CHECK (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Insert leads service or admin"
    ON leads FOR INSERT TO authenticated
    WITH CHECK (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Read audit by access"
    ON audit_logs FOR SELECT TO authenticated
    USING (is_admin() OR doctor_id IN (SELECT accessible_doctor_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
