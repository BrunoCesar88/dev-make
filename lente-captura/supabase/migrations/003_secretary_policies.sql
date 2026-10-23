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
