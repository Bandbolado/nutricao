-- ========================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- ========================================

-- 1. Adiciona coluna plan_status (se não existir)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'inactive';

-- 2. Atualiza registros existentes
UPDATE patients
SET plan_status = 'inactive'
WHERE plan_status IS NULL;

-- 3. Ativa o plano do Pedro para testes
UPDATE patients 
SET plan_status = 'active' 
WHERE telegram_id = 5992111843;

-- 4. Cria tabela de histórico de mensagens do chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'nutritionist')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'photo', 'document', 'system')),
  message_text TEXT,
  file_id TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_patient FOREIGN KEY (telegram_id) REFERENCES patients(telegram_id) ON DELETE CASCADE
);

-- 5. Índices para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_chat_messages_telegram_id ON chat_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_patient_date ON chat_messages(telegram_id, created_at DESC);

-- 6. Verifica se funcionou
SELECT 
  name,
  telegram_id,
  plan_status,
  plan_start_date,
  plan_end_date,
  gender
FROM patients 
WHERE telegram_id = 5992111843;
