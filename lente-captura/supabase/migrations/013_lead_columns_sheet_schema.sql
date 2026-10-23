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
