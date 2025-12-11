-- Tabela para armazenar questionários alimentares dos pacientes
CREATE TABLE IF NOT EXISTS food_records (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'recordatorio_24h',
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (telegram_id) REFERENCES patients(telegram_id) ON DELETE CASCADE
);

-- Índice para buscar questionários por paciente
CREATE INDEX IF NOT EXISTS idx_food_records_telegram_id ON food_records(telegram_id);

-- Índice para buscar questionários por data
CREATE INDEX IF NOT EXISTS idx_food_records_created_at ON food_records(created_at DESC);

-- Comentários
COMMENT ON TABLE food_records IS 'Armazena recordatórios alimentares de 24h dos pacientes';
COMMENT ON COLUMN food_records.telegram_id IS 'ID do Telegram do paciente';
COMMENT ON COLUMN food_records.record_type IS 'Tipo do registro: recordatorio_24h';
COMMENT ON COLUMN food_records.data IS 'Dados do questionário em formato JSON';
COMMENT ON COLUMN food_records.created_at IS 'Data e hora do preenchimento';
