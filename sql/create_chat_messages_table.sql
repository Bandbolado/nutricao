-- Tabela para armazenar histórico de mensagens entre paciente e nutricionista
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'nutritionist')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'photo', 'document', 'system')),
  message_text TEXT,
  file_id TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para performance
  CONSTRAINT fk_patient FOREIGN KEY (telegram_id) REFERENCES patients(telegram_id) ON DELETE CASCADE
);

-- Índices para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_chat_messages_telegram_id ON chat_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_patient_date ON chat_messages(telegram_id, created_at DESC);

-- Comentários
COMMENT ON TABLE chat_messages IS 'Histórico completo de mensagens trocadas entre paciente e nutricionista';
COMMENT ON COLUMN chat_messages.sender_type IS 'Quem enviou: patient ou nutritionist';
COMMENT ON COLUMN chat_messages.message_type IS 'Tipo da mensagem: text, photo, document ou system';
COMMENT ON COLUMN chat_messages.message_text IS 'Conteúdo de texto da mensagem ou caption';
COMMENT ON COLUMN chat_messages.file_id IS 'ID do arquivo do Telegram (para fotos/documentos)';
