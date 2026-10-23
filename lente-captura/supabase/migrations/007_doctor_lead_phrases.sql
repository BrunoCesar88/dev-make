-- Frases de classificação de origem (espelho da tabela Lente-Medicos / automação n8n)

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio_phrase TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS site_phrase TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS manychat_phrase TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS social_selling_phrase TEXT;

-- Evita reprocessar a mesma mensagem WhatsApp
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_doctor_message_id
  ON leads (doctor_id, message_id)
  WHERE message_id IS NOT NULL AND message_id <> '';
