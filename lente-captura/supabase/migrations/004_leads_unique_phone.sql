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
